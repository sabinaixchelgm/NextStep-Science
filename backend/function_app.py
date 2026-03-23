import azure.functions as func
import logging
import os
import json
from azure.storage.blob import BlobServiceClient

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

@app.route(route="health", methods=["GET"])
def health_check(req: func.HttpRequest) -> func.HttpResponse:
    """
    Endpoint de diagnóstico.
    Verifica que el servicio backend esté en línea y respondiendo.
    """
    logging.info('Ejecutando health_check.')
    return func.HttpResponse(
        "El servidor está vivo y funcionando correctamente.",
        status_code=200
    )

@app.route(route="upload", methods=["POST"])
def upload_file(req: func.HttpRequest) -> func.HttpResponse:
    """
    Endpoint de carga de archivos.
    Recibe un archivo binario y lo almacena en Azure Blob Storage.
    """
    logging.info('Ejecutando upload_file.')

    try:
        file_bytes = req.get_body()
        file_name = req.headers.get("file-name")

        if not file_bytes or not file_name:
            return func.HttpResponse(
                "Error: Falta el archivo o el encabezado 'file-name'.", 
                status_code=400
            )

        # Conexión a Azure Storage
        connection_string = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
        blob_service_client = BlobServiceClient.from_connection_string(connection_string)
        
        # Subida al contenedor 'uploads'
        blob_client = blob_service_client.get_blob_client(container="uploads", blob=file_name)
        blob_client.upload_blob(file_bytes, overwrite=True)

        return func.HttpResponse(
            f"Archivo '{file_name}' subido correctamente.",
            status_code=201
        )

    except Exception as e:
        logging.error(f"Error en upload_file: {e}")
        return func.HttpResponse("Error interno del servidor.", status_code=500)

@app.route(route="analyze", methods=["POST"])
def analyze_data(req: func.HttpRequest) -> func.HttpResponse:
    """
    Endpoint de análisis.
    Simula el procesamiento del LLM devolviendo una estructura JSON predefinida
    desde un archivo externo.
    """
    logging.info('Ejecutando analyze_data.')

    try:
        # Generamos la ruta absoluta y segura al archivo JSON
        dir_path = os.path.dirname(os.path.realpath(__file__))
        file_path = os.path.join(dir_path, "mock_data.json")
        
        with open(file_path, "r", encoding="utf-8") as file:
            mock_response = json.load(file)

        return func.HttpResponse(
            body=json.dumps(mock_response),
            mimetype="application/json",
            status_code=200
        )

    except Exception as e:
        logging.error(f"Error en analyze_data: {e}")
        return func.HttpResponse("Error interno del servidor.", status_code=500)