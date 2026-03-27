import json
import azure.functions as func

bp = func.Blueprint()

@bp.route(route="health", methods=["GET"])
def health_endpoint(req: func.HttpRequest) -> func.HttpResponse:
    payload = {
        "status": "ok",
         "message": "Service is running",
    }
    return func.HttpResponse(
        json.dumps(payload),
        status_code=200,
        mimetype="application/json"
    )
