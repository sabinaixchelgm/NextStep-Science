import os
import io
import time
from azure.core.credentials import AzureKeyCredential
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from azure.cognitiveservices.vision.computervision.models import OperationStatusCodes
from msrest.authentication import CognitiveServicesCredentials
from services.blob_service import download_blob

def _extract_pdf(blob_name: str) -> str:
    doc_content: bytes = download_blob(blob_name)
    endpoint: str = os.getenv("AZURE_DOCUMENT_ENDPOINT", "")
    key: str = os.getenv("AZURE_DOCUMENT_KEY", "")
    client = DocumentAnalysisClient(endpoint, AzureKeyCredential(key))
    
    poller = client.begin_analyze_document("prebuilt-read", doc_content)
    result = poller.result()
    return " ".join([line.content for page in result.pages for line in page.lines])

def _extract_image(blob_name: str) -> str:
    doc_content: bytes = download_blob(blob_name)
    endpoint: str = os.getenv("AZURE_VISION_ENDPOINT", "")
    key: str = os.getenv("AZURE_VISION_KEY", "")
    client = ComputerVisionClient(endpoint, CognitiveServicesCredentials(key))
    
    stream = io.BytesIO(doc_content)
    read_response = client.read_in_stream(stream, raw=True)
    
    read_operation_location: str = read_response.headers["Operation-Location"]
    operation_id: str = read_operation_location.split("/")[-1]
    
    while True:
        read_result = client.get_read_result(operation_id)
        if read_result.status not in [OperationStatusCodes.not_started, OperationStatusCodes.running]:
            break
        time.sleep(1)
        
    extracted_text = []
    if read_result.status == OperationStatusCodes.succeeded:
        for text_result in read_result.analyze_result.read_results:
            for line in text_result.lines:
                extracted_text.append(line.text)
                
    return "\n".join(extracted_text)

def _extract_csv(blob_name: str) -> str:
    csv_bytes: bytes = download_blob(blob_name)
    return csv_bytes.decode('utf-8')

def extract_data(blob_name: str, input_type: str) -> str:
    if input_type == "pdf":
        return _extract_pdf(blob_name)
    elif input_type == "image":
        return _extract_image(blob_name)
    elif input_type == "csv":
        return _extract_csv(blob_name)
    raise ValueError(f"Unsupported input_type: {input_type}")