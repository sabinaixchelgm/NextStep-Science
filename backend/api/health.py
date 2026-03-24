import azure.functions as func

bp = func.Blueprint()

@bp.route(route="health", methods=["GET"])
def health_endpoint(req: func.HttpRequest) -> func.HttpResponse:
    return func.HttpResponse("Todo chido y funcionando", status_code=200)