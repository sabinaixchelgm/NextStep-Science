import json
import uuid
import azure.functions as func
from services.extraction_service import extract_data
from services.ai_service import generate_insight
from services.memory_service import load_session, save_session
from services.content_safety import check_text

bp = func.Blueprint()

@bp.route(route="analyze", methods=["POST"])
def analyze_endpoint(req: func.HttpRequest) -> func.HttpResponse:
    try:
        body: dict = req.get_json()
    except ValueError:
        return func.HttpResponse(json.dumps({"error": "Invalid JSON"}), status_code=400, mimetype="application/json")

    input_type: str = body.get("input_type", "")
    # Si no viene session_id, es un chat nuevo.
    session_id: str = body.get("session_id", str(uuid.uuid4()))
    session_state: dict = load_session(session_id)
    
    try:
        if input_type == "text":
            # Caso: El usuario está chateando (enviando "text")
            user_message = body.get("text", "")
            if not user_message:
                return func.HttpResponse(json.dumps({"error": "Missing text"}), status_code=400, mimetype="application/json")
        else:
            # Caso: Subida de archivo (PDF/Imagen)
            blob_name = body.get("blob_name")
            if not blob_name:
                return func.HttpResponse(json.dumps({"error": "Missing blob_name"}), status_code=400, mimetype="application/json")
            
            # Procesar OCR
            extracted_text = extract_data(blob_name, input_type)
            # Guardar el nuevo texto en el contexto de la sesión
            session_state["context"].append(extracted_text)
            
            # Prompt interno automático para la primera respuesta del archivo
            user_message = "Analyze the attached document and extract the key points."

        # Construcción del prompt con todo el contexto acumulado (RAG-lite)
        all_docs_context = "\n---\n".join(session_state["context"])
        full_prompt = f"{user_message}\n\n[Accumulated document context]:\n{all_docs_context}"

        # Content Safety check on input
        if check_text(full_prompt):
            return func.HttpResponse(
                json.dumps({
                    "response_mode": "restricted",
                    "security_message": "Content blocked by safety policies.",
                    "session_id": session_id
                }),
                status_code=400,
                mimetype="application/json"
            )

        # Llamada al LLM con historial
        raw_response: str = generate_insight(full_prompt, history=session_state["history"])
        
        # Content Safety check on output
        if check_text(raw_response):
            return func.HttpResponse(
                json.dumps({
                    "response_mode": "restricted",
                    "security_message": "Response blocked by safety policies.",
                    "session_id": session_id
                }),
                status_code=200,
                mimetype="application/json"
            )
        
        try:
            response_data: dict = json.loads(raw_response)
        except json.JSONDecodeError:
            response_data = {"analysis": raw_response}

        # Persistencia: Guardar el turno en el historial
        session_state["history"].append({"role": "user", "content": user_message})
        session_state["history"].append({"role": "assistant", "content": raw_response})
        save_session(session_id, session_state)

        # Post-procesamiento de seguridad original
        if response_data.get("response_mode") == "restricted":
            response_data.pop("next_steps", None)
            response_data["security_message"] = "Content restricted by safety policies."

        response_data["session_id"] = session_id

        return func.HttpResponse(
            json.dumps(response_data),
            status_code=200,
            mimetype="application/json"
        )
    except Exception as e:
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500, mimetype="application/json")
