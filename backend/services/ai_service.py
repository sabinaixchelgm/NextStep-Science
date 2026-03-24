import os
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient

def generate_insight(extracted_text: str) -> str:
    endpoint: str = os.getenv("AZURE_AI_PROJECT_ENDPOINT", "")
    agent_name: str = os.getenv("AZURE_AI_AGENT_NAME", "AI-Hackathon-2026-Equipo6")
    agent_version: str = os.getenv("AZURE_AI_AGENT_VERSION", "6")

    project_client = AIProjectClient(
        endpoint=endpoint,
        credential=DefaultAzureCredential()
    )

    with project_client:
        openai_client = project_client.get_openai_client()
        
        response = openai_client.responses.create(
            input=[{"role": "user", "content": f"Analiza el siguiente contenido:\n{extracted_text}"}],
            extra_body={
                "agent_reference": {
                    "name": agent_name, 
                    "version": agent_version, 
                    "type": "agent_reference"
                }
            }
        )
        
        return response.output_text