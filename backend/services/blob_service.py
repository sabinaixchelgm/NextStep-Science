import os
from azure.storage.blob import BlobServiceClient

STORAGE_CONN_STR: str = os.getenv("AZURE_STORAGE_CONNECTION_STRING", "")
CONTAINER_NAME: str = os.getenv("RAW_DOCUMENTS_CONTAINER", "raw-documents")

def _get_blob_client(blob_name: str):
    service_client = BlobServiceClient.from_connection_string(STORAGE_CONN_STR)
    return service_client.get_blob_client(container=CONTAINER_NAME, blob=blob_name)

def upload_to_blob(blob_name: str, data: bytes) -> str:
    blob_client = _get_blob_client(blob_name)
    blob_client.upload_blob(data, overwrite=True)
    return blob_client.url

def download_blob(blob_name: str) -> bytes:
    blob_client = _get_blob_client(blob_name)
    return blob_client.download_blob().readall()