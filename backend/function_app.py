import azure.functions as func
import azure.durable_functions as df

# 1. Blueprints Core (Puerta de entrada y Orquestador)
from blueprints.orchestrators import bp as orchestrator_bp
from blueprints.starters import bp as starters_bp

# 2. Blueprints del Sistema Multi-Agente
from blueprints.agents.extraction import bp as extraction_bp
from blueprints.agents.agent_analyst import bp as analyst_bp
from blueprints.agents.agent_reasoning import bp as reasoning_bp
from blueprints.agents.agent_supervisor import bp as supervisor_bp

# Inicializamos la aplicación de Durable Functions
app = df.DFApp(http_auth_level=func.AuthLevel.FUNCTION)

# Registramos el flujo principal
app.register_functions(orchestrator_bp)
app.register_functions(starters_bp)

# Registramos al equipo de agentes (Los "Obreros")
app.register_functions(extraction_bp)
app.register_functions(analyst_bp)
app.register_functions(reasoning_bp)
app.register_functions(supervisor_bp)