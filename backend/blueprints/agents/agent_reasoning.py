import azure.durable_functions as df
import os
from openai import AzureOpenAI

bp = df.Blueprint()

@bp.activity_trigger(input_name="statisticalTrends")
def agent_scientific_reasoning(statisticalTrends: str) -> str:
    client = AzureOpenAI(
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"), 
        api_key=os.getenv("AZURE_OPENAI_KEY"), 
        api_version="2024-02-15-preview"
    )
    
    system_prompt = """[SYSTEM PROMPT - AGENTE DE RAZONAMIENTO]
                        Eres un Asistente de Cuaderno de Laboratorio de nivel experto. Tu rol es actuar como un compañero de debate para investigadores científicos. 

                        REGLAS ESTRICTAS:
                        1. NUNCA tomes decisiones finales ni afirmes que una hipótesis es un hecho comprobado. Usa lenguaje probabilístico.
                        2. Tu objetivo es estimular el pensamiento crítico del investigador.
                        3. Debes explicar tu razonamiento paso a paso antes de dar una conclusión preliminar.
                        4. Si un protocolo involucra patógenos, toxinas o manipulación genética no estándar, detén el análisis y emite advertencia.

                        FORMATO DE SALIDA REQUERIDO:
                        - **Observaciones de los Datos:** (Qué muestran los datos crudos).
                        - **Razonamiento:** (Por qué estas métricas son relevantes).
                        - **Sugerencias de Variación (Máximo 3):** (Parámetros a ajustar).
                        - **Pregunta Abierta:** (Termina siempre con una pregunta dirigida al investigador)."""

    response = client.chat.completions.create(
        model=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Genera los escenarios basados en este reporte del analista:\n{statisticalTrends}"}
        ]
    )
    return response.choices[0].message.content