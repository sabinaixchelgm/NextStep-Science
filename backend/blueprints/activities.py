import azure.durable_functions as df
import os
import logging
from azure.core.credentials import AzureKeyCredential
from azure.storage.blob import BlobServiceClient
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.ai.contentsafety import ContentSafetyClient
from azure.ai.contentsafety.models import AnalyzeTextOptions
from openai import AzureOpenAI

# Creamos el Blueprint para las actividades
bp = df.Blueprint()

@bp.activity_trigger(input_name="blobName")
def extract_text_from_storage(blobName: str) -> str:
    logging.info(f"Activity: Extracting text from blob store for {blobName}")
    
    endpoint = os.getenv("AZURE_DOCUMENT_ENDPOINT")
    key = os.getenv("AZURE_DOCUMENT_KEY")
    document_client = DocumentAnalysisClient(endpoint, AzureKeyCredential(key))

    storage_connection = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    container_name = "raw-documents"
    blob_service_client = BlobServiceClient.from_connection_string(storage_connection)
    blob_client = blob_service_client.get_blob_client(container=container_name, blob=blobName)
    
    document_stream = blob_client.download_blob().readall()
    
    poller = document_client.begin_analyze_document("prebuilt-read", document_stream)
    result = poller.result()
    extracted_text = " ".join([line.content for page in result.pages for line in page.lines])

    return extracted_text

@bp.activity_trigger(input_name="textToAnalyze")
def validate_content_safety(textToAnalyze: str):
    logging.info("Activity: Content Safety Validation.")
    
    endpoint = os.getenv("AZURE_SAFETY_ENDPOINT")
    key = os.getenv("AZURE_SAFETY_KEY")
    safety_client = ContentSafetyClient(endpoint, AzureKeyCredential(key))

    request = AnalyzeTextOptions(text=textToAnalyze)
    safety_response = safety_client.analyze_text(request)

    for category in safety_response.categories_analysis:
        if category.severity > 0:
            logging.warning('Activity Safety check failed.')
            raise Exception("El contenido analizado infringe las políticas de seguridad del proyecto.")
    
    return "Safe"

@bp.activity_trigger(input_name="extractedText")
def validate_input_safety(extractedText: str):
    return validate_content_safety(extractedText)

@bp.activity_trigger(input_name="generatedReasoning")
def validate_output_safety(generatedReasoning: str):
    return validate_content_safety(generatedReasoning)

@bp.activity_trigger(input_name="rawText")
def generate_ai_reasoning(rawText: str) -> str:
    logging.info("Activity: Generating AI Reasoning.")
    
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    key = os.getenv("AZURE_OPENAI_KEY")
    deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
    
    client = AzureOpenAI(
        azure_endpoint=endpoint, 
        api_key=key,  
        api_version="2024-02-15-preview"
    )

    system_content = "Eres un asistente experto en análisis de datos. Proporciona un resumen técnico claro y estructurado basado únicamente en el texto proporcionado."
    user_content = f"Resume este texto extraído de un documento técnico: {rawText}"

    response = client.chat.completions.create(
        model=deployment_name,
        messages=[
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_content}
        ]
    )

    return response.choices[0].message.content