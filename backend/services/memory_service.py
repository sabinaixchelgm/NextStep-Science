import os
import json
from typing import Dict, Any, List
from azure.storage.blob import BlobServiceClient
from azure.core.exceptions import ResourceNotFoundError

STORAGE_CONN_STR: str = os.getenv("AZURE_STORAGE_CONNECTION_STRING", "")
SESSIONS_CONTAINER: str = "chat-sessions"
MAX_HISTORY: int = 10  # Sliding window: Últimos 10 mensajes

def _get_container_client() -> Any:
    service_client = BlobServiceClient.from_connection_string(STORAGE_CONN_STR)
    container_client = service_client.get_container_client(SESSIONS_CONTAINER)
    if not container_client.exists():
        container_client.create_container()
    return container_client

def load_session(session_id: str) -> Dict[str, Any]:
    """Carga el estado del chat o inicializa uno nuevo."""
    try:
        blob_client = _get_container_client().get_blob_client(f"{session_id}.json")
        data = blob_client.download_blob().readall()
        return json.loads(data)
    except ResourceNotFoundError:
        return {"context": [], "history": []}

def save_session(session_id: str, state: Dict[str, Any]) -> None:
    """Aplica Sliding Window al historial y persiste el estado."""
    if len(state["history"]) > MAX_HISTORY:
        state["history"] = state["history"][-MAX_HISTORY:]
        
    blob_client = _get_container_client().get_blob_client(f"{session_id}.json")
    blob_client.upload_blob(json.dumps(state), overwrite=True)