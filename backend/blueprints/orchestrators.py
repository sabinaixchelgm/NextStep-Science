import azure.durable_functions as df
import logging

bp = df.Blueprint()

@bp.orchestration_trigger(context_name="context")
def analyze_orchestrator(context: df.DurableOrchestrationContext):
    document_context = context.get_input()
    blob_name = document_context.get("stored_blob_name")
    file_category = document_context.get("file_category", "document")

    context.set_custom_status("Inicio del Sistema Multi-Agente.")

    try:
        # FASE 1: Extracción de Datos
        context.set_custom_status("Fase 1: Extrayendo datos en entorno seguro.")
        if file_category == "csv":
            raw_data = yield context.call_activity("extract_csv_data", blob_name)
        elif file_category == "document":
            raw_data = yield context.call_activity("extract_pdf_data", blob_name)
        else:
            raw_data = yield context.call_activity("extract_image_data", blob_name)

        # FASE 2: Agente Analista de Datos
        context.set_custom_status("Fase 2: Agente Analista procesando tendencias estadísticas.")
        statistical_trends = yield context.call_activity("agent_data_analyst", raw_data)

        # FASE 3: Agente de Razonamiento Científico
        context.set_custom_status("Fase 3: Agente Científico generando hipótesis y escenarios.")
        reasoning_proposal = yield context.call_activity("agent_scientific_reasoning", statistical_trends)

        # FASE 4: Agente Supervisor (Safety & Compliance)
        context.set_custom_status("Fase 4: Agente Supervisor evaluando bioseguridad y cumplimiento.")
        supervisor_evaluation = yield context.call_activity("agent_safety_supervisor", reasoning_proposal)

        # Evaluación del Hard Block
        if supervisor_evaluation.get("status") == "HARD_BLOCK":
            context.set_custom_status("HARD BLOCK: Protocolo inseguro detectado.")
            return {
                "status": "Blocked",
                "compliance_explanation": supervisor_evaluation.get("explanation"),
                "original_filename": document_context.get("original_filename")
            }

        # Salida Exitosa
        context.set_custom_status("Flujo completado. Sugerencias aprobadas por Supervisor.")
        return {
            "status": "Success",
            "original_filename": document_context.get("original_filename"),
            "scientific_proposal": reasoning_proposal
        }

    except Exception as e:
        error_message = str(e)
        logging.error(f"Fallo en Orquestador Multi-Agente: {error_message}")
        return {"status": "Error", "error_detail": error_message}