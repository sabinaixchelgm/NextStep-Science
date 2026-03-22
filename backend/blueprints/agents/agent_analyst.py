import azure.durable_functions as df
import os
import json
import io
import sys
import pandas as pd
from openai import AzureOpenAI

bp = df.Blueprint()

def run_python_script(script: str, csv_data: str) -> str:
    """
    Simula un Sandbox (Code Interpreter). 
    Ejecuta el script de Python generado por la IA usando pandas.
    """
    # Preparamos el entorno inyectando el CSV como un DataFrame de Pandas
    df_data = pd.read_csv(io.StringIO(csv_data))
    
    # Capturamos lo que la IA decida imprimir (print)
    old_stdout = sys.stdout
    redirected_output = sys.stdout = io.StringIO()
    
    # Entorno controlado para la ejecución
    global_env = {"pd": pd, "df": df_data}
    local_env = {}
    
    try:
        # Ejecutamos el código generado por el LLM
        exec(script, global_env, local_env)
        output = redirected_output.getvalue()
        if not output:
            output = "El script se ejecutó correctamente pero no imprimió nada. Usa print() para ver los resultados."
    except Exception as e:
        output = f"Error al ejecutar el código: {str(e)}"
    finally:
        sys.stdout = old_stdout
        
    return output

@bp.activity_trigger(input_name="rawData")
def agent_data_analyst(rawData: str) -> str:
    client = AzureOpenAI(
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"), 
        api_key=os.getenv("AZURE_OPENAI_KEY"), 
        api_version="2024-02-15-preview"
    )
    deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
    
    system_prompt = """Eres el Agente Analista de Datos del laboratorio. 
    Tu trabajo es actuar como un científico de datos experto.
    NO intentes adivinar las matemáticas. TIENES UNA HERRAMIENTA llamada `run_python_script`.
    Escribe código en Python (usando pandas) para calcular medias, varianzas y correlaciones.
    El DataFrame ya está cargado en la variable `df`.
    Usa `print()` para devolver los resultados estadísticos.
    Una vez que tengas los resultados reales, redacta un reporte técnico puramente matemático."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Ejecuta un análisis estadístico sobre estos datos:\n{rawData[:500]}..."} # Solo enviamos una muestra para no saturar el prompt
    ]

    # 1. Definimos la herramienta (Function Calling)
    tools = [
        {
            "type": "function",
            "function": {
                "name": "run_python_script",
                "description": "Ejecuta código Python para analizar un DataFrame de pandas llamado `df`. Devuelve la salida impresa por consola.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "script": {
                            "type": "string",
                            "description": "El código Python a ejecutar. Ejemplo: print(df.describe())"
                        }
                    },
                    "required": ["script"]
                }
            }
        }
    ]

    # 2. Primera llamada a la IA (Pide permiso para usar la herramienta)
    response = client.chat.completions.create(
        model=deployment_name,
        messages=messages,
        tools=tools,
        tool_choice="auto"
    )
    
    response_message = response.choices[0].message
    tool_calls = response_message.tool_calls

    # 3. Si la IA decidió escribir código, lo ejecutamos
    if tool_calls:
        messages.append(response_message) # Guardamos el historial
        
        for tool_call in tool_calls:
            if tool_call.function.name == "run_python_script":
                # Extraemos el código generado por GPT-4o
                function_args = json.loads(tool_call.function.arguments)
                python_code = function_args.get("script")
                
                # Ejecutamos el código en nuestro Sandbox local
                execution_result = run_python_script(python_code, rawData)
                
                # Le devolvemos el resultado matemático exacto a la IA
                messages.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": "run_python_script",
                    "content": execution_result
                })
                
        # 4. Segunda llamada a la IA (Redacta el reporte final con los números reales)
        final_response = client.chat.completions.create(
            model=deployment_name,
            messages=messages
        )
        return final_response.choices[0].message.content

    # Si por alguna razón no usó la herramienta, devuelve su respuesta inicial
    return response_message.content