import os
import uuid
import json
import azure.functions as func
from services.validation import is_content_valid, ALLOWED_EXTENSIONS
from services.blob_service import upload_to_blob
import logging

bp = func.Blueprint()

@bp.route(route="upload", methods=["POST"])
def upload_endpoint(req: func.HttpRequest) -> func.HttpResponse:
    # --- DEBUG BLOQUE ---
    logging.info(f"Content-Type entrante: {req.headers.get('Content-Type')}")
    logging.info(f"Body size: {len(req.get_body())} bytes")
    logging.info(f"Files detectados: {req.files.keys()}")
    # -------------------
    files = req.files
    if not files or not files.getlist('file'):
        return func.HttpResponse(json.dumps({"error": "Missing file"}), status_code=400, mimetype="application/json")

    uploaded_file = files.getlist('file')[0]
    original_filename: str = uploaded_file.filename
    _, ext = os.path.splitext(original_filename)
    ext = ext.lower()

    if ext not in ALLOWED_EXTENSIONS:
        return func.HttpResponse(json.dumps({"error": "Invalid extension"}), status_code=400, mimetype="application/json")

    file_bytes: bytes = uploaded_file.read()
    if not is_content_valid(file_bytes, ext):
        return func.HttpResponse(json.dumps({"error": "Invalid content"}), status_code=400, mimetype="application/json")

    input_type: str = "image" if ext in ['.png', '.jpg', '.jpeg'] else "csv" if ext == '.csv' else "pdf"
    blob_name: str = f"{uuid.uuid4()}-{original_filename}"

    file_url: str = upload_to_blob(blob_name, file_bytes)

    return func.HttpResponse(
        json.dumps({
            "file_url": file_url,
            "input_type": input_type,
            "blob_name": blob_name
        }),
        status_code=200,
        mimetype="application/json"
    )