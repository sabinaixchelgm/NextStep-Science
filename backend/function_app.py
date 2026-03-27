import azure.functions as func
from api.health import bp as health_bp
from api.upload import bp as upload_bp
from api.analyze import bp as analyze_bp

app = func.FunctionApp(http_auth_level=func.AuthLevel.FUNCTION)

app.register_functions(health_bp)
app.register_functions(upload_bp)
app.register_functions(analyze_bp)