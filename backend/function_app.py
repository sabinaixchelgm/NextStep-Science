import azure.functions as func
import azure.durable_functions as df
import os
import logging
import uuid
import re
from azure.storage.blob import BlobServiceClient

# 1. Importar los Blueprints
from blueprints.orchestrators import bp as orchestrator_bp
from blueprints.activities import bp as activities_bp

# 2. Inicializar la aplicación principal
app = df.DFApp(http_auth_level=func.AuthLevel.FUNCTION)

# 3. Registrar los Blueprints en la aplicación
app.register_functions(orchestrator_bp)
app.register_functions(activities_bp)

# =========================================================
# HTTP STARTER (User-facing API)
# =========================================================
@app.route(route="analyze", methods=["POST"])
@app.durable_client_input(client_name="client")
async def analyze_document_async_starter(req: func.HttpRequest, client: df.DurableOrchestrationClient) -> func.HttpResponse:
    logging.info("A new document analysis request has been received.")

    # A. Validate and Upload the Document
    files = req.files
    if not files or 'file' not in files:
        return func.HttpResponse(
            "Falta el archivo. Envía la solicitud con 'Content-Type: multipart/form-data' y el archivo en el parámetro 'file'.",
            status_code=400
            )

    uploaded_file = files['file']
    file_bytes = uploaded_file.read()
    if not file_bytes:
        return func.HttpResponse("El archivo está vacío.", status_code=400)

    unique_id = str(uuid.uuid4())
    original_filename = uploaded_file.filename
    safe_filename = re.sub(r'[^a-zA-Z0-9_\.-]', '_', original_filename)
    blob_name = f"{unique_id}-{safe_filename}"
 
    storage_connection = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
 
    if not storage_connection:
        return func.HttpResponse("Falta la variable de entorno AZURE_STORAGE_CONNECTION_STRING.", status_code=500)

    container_name = "raw-documents"
    blob_service_client = BlobServiceClient.from_connection_string(storage_connection)
    
    try:
        container_client = blob_service_client.create_container(container_name)
    except: 
        container_client = blob_service_client.get_container_client(container_name)

    container_client.upload_blob(name=blob_name, data=file_bytes)
    logging.info(f"The document {original_filename} has been securely stored as {blob_name}.")

    # B. Start the Orchestration
    document_context = {
        "unique_id": unique_id,
        "original_filename": original_filename,
        "stored_blob_name": blob_name
    }

    instance_id = await client.start_new("analyze_orchestrator", None, document_context)
    logging.info(f"Orchestration started with ID '{instance_id}'.")

    # C. Return the Check Status Response
    return client.create_check_status_response(req, instance_id)