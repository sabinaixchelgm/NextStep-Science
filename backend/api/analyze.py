import json
import azure.functions as func
from services.extraction_service import extract_data
from services.ai_service import generate_insight

bp = func.Blueprint()

@bp.route(route="analyze", methods=["POST"])
def analyze_endpoint(req: func.HttpRequest) -> func.HttpResponse:
    try:
        body: dict = req.get_json()
    except ValueError:
        return func.HttpResponse(json.dumps({"error": "Invalid JSON"}), status_code=400, mimetype="application/json")

    input_type: str = body.get("input_type", "")
    
    try:
        if input_type == "text":
            extracted_text = body.get("text", "")
        else:
            blob_name = body.get("blob_name")
            if not blob_name:
                return func.HttpResponse(json.dumps({"error": "Missing blob_name"}), status_code=400, mimetype="application/json")
            extracted_text = extract_data(blob_name, input_type)

        raw_response: str = generate_insight(extracted_text)
        response_data: dict = json.loads(raw_response)

        if response_data.get("response_mode") == "restricted":
            response_data.pop("next_steps", None)
            response_data["security_message"] = "Contenido restringido por políticas de seguridad."

        return func.HttpResponse(
            json.dumps(response_data),
            status_code=200,
            mimetype="application/json"
        )
    except Exception as e:
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500, mimetype="application/json")