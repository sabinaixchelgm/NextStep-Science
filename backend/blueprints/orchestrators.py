import azure.durable_functions as df
import logging

# Creamos el Blueprint para los orquestadores
bp = df.Blueprint()

@bp.orchestration_trigger(context_name="context")
def analyze_orchestrator(context: df.DurableOrchestrationContext):
    # Context data from the starter
    document_context = context.get_input()
    blob_name = document_context.get("stored_blob_name")

    # Initial status
    context.set_custom_status("Inicio del flujo de análisis secuencial.")

    try:
        # Step 1: Content Extraction
        context.set_custom_status("Extrayendo texto de la base de datos de Blob Storage.")
        raw_text = yield context.call_activity("extract_text_from_storage", blob_name)
        
        if not raw_text.strip():
            raise Exception("El documento procesado no contiene texto legible.")

        # Step 2: Input Validation
        context.set_custom_status("Validando seguridad del texto de entrada.")
        yield context.call_activity("validate_input_safety", raw_text)

        # Step 3: AI Reasoning
        context.set_custom_status("Generando análisis de IA con OpenAI.")
        ai_reasoning_result = yield context.call_activity("generate_ai_reasoning", raw_text)

        # Step 4: Output Validation
        context.set_custom_status("Validando seguridad del análisis de IA generado.")
        yield context.call_activity("validate_output_safety", ai_reasoning_result)
        
        # Successful completion
        context.set_custom_status("Análisis secuencial completado con éxito.")
        container_name = "raw-documents"
        
        return {
            "status": "Success",
            "original_filename": document_context.get("original_filename"),
            "stored_blob_path": f"{container_name}/{blob_name}",
            "raw_extracted_text_preview": raw_text[:500],
            "ai_reasoning_summary": ai_reasoning_result
        }

    except Exception as e:
        error_message = str(e)
        context.set_custom_status(f"Fallo secuencial: {error_message}")
        logging.error(f"Sequential Failure in Orchestration '{context.instance_id}': {error_message}")
        
        return {
            "status": "Error",
            "error_detail": error_message
        }