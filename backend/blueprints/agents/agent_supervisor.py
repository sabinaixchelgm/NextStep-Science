import azure.durable_functions as df
import os
import json
from openai import AzureOpenAI

bp = df.Blueprint()

@bp.activity_trigger(input_name="reasoningProposal")
def agent_safety_supervisor(reasoningProposal: str) -> dict:
    client = AzureOpenAI(
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"), 
        api_key=os.getenv("AZURE_OPENAI_KEY"), 
        api_version="2024-02-15-preview"
    )
    
    system_prompt = """Eres el Agente Supervisor de Bioseguridad y Cumplimiento Ético.
                        Revisa la propuesta generada por el Agente Científico.
                        Si la propuesta viola políticas de bioseguridad, usa patógenos prohibidos, toxinas, o cruza la línea dando "asesoramiento definitivo" en lugar de sugerencias, DEBES BLOQUEARLA.
                        
                        Responde ÚNICAMENTE con un JSON válido en este formato:
                        {
                        "status": "APPROVED" | "HARD_BLOCK",
                        "explanation": "Breve explicación de por qué fue aprobado o bloqueado según normas de compliance."
                        }"""

    response = client.chat.completions.create(
        model=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
        response_format={ "type": "json_object" }, # Fuerza salida en JSON para fácil parseo
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Evalúa esta propuesta:\n{reasoningProposal}"}
        ]
    )
    
    evaluation = json.loads(response.choices[0].message.content)
    return evaluation