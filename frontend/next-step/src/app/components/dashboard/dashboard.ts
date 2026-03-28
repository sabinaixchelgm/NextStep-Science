import { Component, ElementRef, ViewChild, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AnalysisResponse, Data, UploadResponse, NextStep } from '../../services/data';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule],
  standalone: true,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  constructor(private dataService: Data, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    // Evita que el navegador abra archivos si se sueltan fuera de la zona
    window.addEventListener('dragover', (e) => e.preventDefault(), false);
    window.addEventListener('drop', (e) => e.preventDefault(), false);
  }

  // Elemento para autoscroll
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  //Variables globales
  userInput: string = '';
  chatHistory: { role: 'user' | 'assistant'; text: string }[] = [
    { role: 'assistant', text: 'Hola, soy tu asistente. ¿En qué puedo ayudarte?' },
  ];
  isTyping: boolean = false;
  agentThought: string =
    'Bienvenido, colega. Sube un manual o un diagrama para comenzar el análisis.';

  // Estados del Sistema
  public analysisFailed: boolean = false;
  public systemStatus: 'safe' | 'warning' | 'error' | 'analyzing' = 'safe';

  // UNIFICADO: Usamos solo esta para los resultados del análisis
  public analysisResultData?: AnalysisResponse;

  // En la zona de variables globales
  public lastBlobUploaded?: {
    blob_name: string;
    input_type: 'pdf' | 'csv' | 'image';
    file_url: string;
  };

  // Estados para el archivo PDF
  isDraggingPDF = false;
  selectedPDFName: string | null = null;
  isUploadingPDF = false;
  PDFAzureUrl: string = '';
  tempPDFFile: File | null = null;

  // Estados para la Imagen
  isDraggingIMG = false;
  isUploadingIMG = false;
  selectedIMGName: string | null = null;
  IMGAzureUrl: string = '';
  tempIMGFile: File | null = null;

  // Estados para el Dataset (CSV)
  isDraggingCSV = false;
  isUploadingCSV = false;
  selectedCSVName: string | null = null;
  CSVAzureUrl: string = '';
  tempCSVFile: File | null = null;

  showConfirmButtons = false;

  public isPDFConfirmed = false;
  public isIMGConfirmed = false;
  public isCSVConfirmed = false;

  //Funcion para scroll hacia el fondo
  scrollToBottom(): void {
    try {
      setTimeout(() => {
        if (this.myScrollContainer) {
          this.myScrollContainer.nativeElement.scrollTo({
            top: this.myScrollContainer.nativeElement.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, 100); //100 ms para esperar el render
    } catch (err) {}
  }

  //Funcion para envio de mensajes
onSendMessage() {
  if (!this.userInput.trim() || this.isTyping) return;

  const tempMessage = this.userInput;
  this.chatHistory.push({ role: 'user', text: tempMessage });
  this.userInput = '';
  this.isTyping = true;
  this.scrollToBottom();

  const finalPrompt = `Analiza lo siguiente basándote en los archivos cargados: ${tempMessage}`;

  this.dataService.analyze({
    type: 'text',
    text: finalPrompt,
    session_id: (this.dataService as any).currentSessionId 
  }).subscribe({
    next: (res: any) => {
  console.log('Respuesta recibida:', res);
  this.isTyping = false;

  let fullResponse = '';
  // Detectamos si la respuesta es una negativa de seguridad dentro del JSON
  const isRefusal = res.observations_and_analysis?.includes("I'm sorry") || 
                    res.observations_and_analysis?.includes("cannot assist");

  if (isRefusal) {
    fullResponse = `
      <div style="background: #fff3e0; border-left: 6px solid #ff9800; padding: 15px; border-radius: 4px; color: #856404;">
        <b style="font-size: 1.1em;">🛑 PROTOCOLO DE SEGURIDAD ACTIVADO</b><br>
        <b>Resumen del Intento:</b> ${res.experiment_summary}<br><br>
        <b>Decisión del Laboratorio:</b> ${res.observations_and_analysis}
      </div>
    `;
  } else if (res.observations_and_analysis || res.safety_assessment) {
    // CASO FELIZ (Análisis normal)
    fullResponse = `
      <div class="report-container">
        <b style="color: #2c3e50;">🔬 Análisis Técnico:</b><br>
        ${res.observations_and_analysis}<br><br>
        <b style="color: #d32f2f;">⚠️ Evaluación de Seguridad:</b><br>
        ${res.safety_assessment || 'Consulte protocolos estándar.'}
      </div>
    `;
  } else {
    fullResponse = res.experiment_summary || 'Procesamiento finalizado.';
  }

  // Forzamos el renderizado
  setTimeout(() => {
    this.chatHistory.push({ role: 'assistant', text: fullResponse });
    this.scrollToBottom();
    this.cdr.detectChanges(); 
  }, 100);
},
    error: (err: any) => {
      console.error('Error detectado en la llamada:', err);
      this.isTyping = false;

      // Extraemos el cuerpo del error (puede venir como objeto o string)
      let errorBody = err.error;
      if (typeof errorBody === 'string') {
        try { errorBody = JSON.parse(errorBody); } catch (e) { console.error("Error body no es JSON"); }
      }

      // Mapeamos el error 400 de seguridad que viste en Network
      const isSecurity = err.status === 400 && (errorBody?.response_mode === 'restricted' || errorBody?.security_message);
      
      const alertBg = isSecurity ? '#fff3e0' : '#f8d7da';
      const alertBorder = isSecurity ? '#ff9800' : '#dc3545';
      const alertColor = isSecurity ? '#e65100' : '#721c24';
      const title = isSecurity ? '🛑 PROTOCOLO DE SEGURIDAD' : '⚠️ ERROR DE LABORATORIO';
      const message = isSecurity 
        ? (errorBody.security_message || 'Contenido restringido por riesgo químico.') 
        : `Error de conexión (${err.status}). El laboratorio no responde.`;

      // LA CLAVE: El setTimeout y detectChanges para forzar la UI
      setTimeout(() => {
        this.chatHistory.push({
          role: 'assistant',
          text: `
            <div style="background: ${alertBg}; border-left: 6px solid ${alertBorder}; padding: 15px; border-radius: 4px; color: ${alertColor};">
              <b style="font-size: 1.1em;">${title}</b><br>
              ${message}
            </div>
          `
        });
        this.scrollToBottom();
        this.cdr.detectChanges(); // Esto obliga a Angular a pintar el cuadro naranja
      }, 100);
    }
  });
}

  onDragOver(event: DragEvent, type: string) {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'pdf') this.isDraggingPDF = true;
    else if (type === 'img') this.isDraggingIMG = true;
    else if (type === 'csv') this.isDraggingCSV = true;
  }

  onDragLeave(type: string) {
    if (type === 'pdf') this.isDraggingPDF = false;
    else if (type === 'img') this.isDraggingIMG = false;
    else if (type === 'csv') this.isDraggingCSV = false;
  }

  onDrop(event: DragEvent, type: 'pdf' | 'img' | 'csv') {
    event.preventDefault();
    event.stopPropagation();
    this.onDragLeave(type); // Quitamos el color azul del borde

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      const fileName = file.name.toLowerCase();
      const fileType = file.type;

      let isValid = false;

      // Validaciones (Tu lógica está perfecta aquí)
      if (type === 'pdf' && (fileType === 'application/pdf' || fileName.endsWith('.pdf'))) {
        isValid = true;
      } else if (
        type === 'img' &&
        (fileType.startsWith('image/') ||
          fileName.endsWith('.png') ||
          fileName.endsWith('.jpg') ||
          fileName.endsWith('.jpeg'))
      ) {
        isValid = true;
      } else if (type === 'csv' && (fileType === 'text/csv' || fileName.endsWith('.csv'))) {
        isValid = true;
      }

      if (isValid) {
        // PASO CLAVE: Antes de asignar el nuevo, "limpiamos" el estado anterior de esa zona
        if (type === 'pdf') {
          this.tempPDFFile = file;
          this.selectedPDFName = file.name;
          this.isPDFConfirmed = false; // Reiniciamos por si había uno previo confirmado
        } else if (type === 'img') {
          this.tempIMGFile = file;
          this.selectedIMGName = file.name;
          this.isIMGConfirmed = false;
        } else if (type === 'csv') {
          this.tempCSVFile = file;
          this.selectedCSVName = file.name;
          this.isCSVConfirmed = false;
        }

        // Ya no necesitamos depender obligatoriamente de showConfirmButtons para el HTML,
        // pero lo dejamos en true por si tienes alguna otra lógica global.
        this.showConfirmButtons = true;
        this.agentThought = `Archivo ${file.name} detectado correctamente. ¿Confirmas la subida o prefieres revertir?`;
      } else {
        this.agentThought = `¡Cuidado, colega! Estás intentando subir un archivo que no es ${type.toUpperCase()} en esta zona.`;
        // ... resto de tu lógica de error ...
      }
    }
  }

  // NUEVO: Función para el botón de "Revertir"
  revertUpload(type: 'pdf' | 'img' | 'csv') {
    if (type === 'pdf') {
      this.tempPDFFile = null;
      this.selectedPDFName = null;
    } else if (type === 'img') {
      this.tempIMGFile = null;
      this.selectedIMGName = null;
    } else if (type === 'csv') {
      this.tempCSVFile = null;
      this.selectedCSVName = null;
    }
    this.showConfirmButtons = false;
    this.agentThought = 'Archivo descartado. El sistema sigue esperando un documento válido.';
  }

  // NUEVO: Función para el botón de "Confirmar"
  confirmUpload(type: 'pdf' | 'img' | 'csv') {
    let fileToUpload: File | null = null;

    // 1. Identificamos el archivo y "limpiamos" su estado temporal
    if (type === 'pdf') {
      fileToUpload = this.tempPDFFile;
      this.tempPDFFile = null; // Lo sacamos de "pendiente"
      this.isPDFConfirmed = true; // Nueva variable para tu HTML
    } else if (type === 'img') {
      fileToUpload = this.tempIMGFile;
      this.tempIMGFile = null;
      this.isIMGConfirmed = true;
    } else if (type === 'csv') {
      fileToUpload = this.tempCSVFile;
      this.tempCSVFile = null;
      this.isCSVConfirmed = true;
    }

    if (fileToUpload) {
      // 2. Ejecutamos la subida
      this.processUpload(fileToUpload, type);

      // Opcional: Si usas una sola variable para botones, la apagamos
      this.showConfirmButtons = false;
    } else {
      console.error(`Error: No hay archivo para ${type}`);
      this.agentThought =
        'Ups, parece que el archivo se perdió. ¿Podrías intentar subirlo de nuevo?';
    }
  }

  onFileSelected(event: any, type: 'pdf' | 'image' | 'csv') {
    const file: File = event.target.files[0];
    if (!file) return;

    this.isTyping = true; // Mostramos que el agente está "pensando"

    // PASO 1: Subir al Blob Storage de Azure
    this.dataService.uploadFile(file).subscribe({
      next: (uploadRes) => {
        console.log('Archivo en Azure:', uploadRes.blob_name);

        // PASO 2: Mandar el blob_name para el análisis científico (Caso A)
        this.dataService
          .analyze({
            type: type,
            blob_name: uploadRes.blob_name,
          })
          .subscribe({
            next: (analysisRes) => {
              // Aquí guardas el reporte completo para el Dashboard
              this.analysisResultData = analysisRes;

              // Opcional: Avisar en el chat que el archivo se procesó
              this.chatHistory.push({
                role: 'assistant',
                text: `He analizado el archivo ${file.name}. ¿Qué deseas saber sobre él?`,
              });

              this.isTyping = false;
              this.scrollToBottom();
            },
          });
      },
      error: (err) => {
        console.error('Error al subir archivo', err);
        this.isTyping = false;
      },
    });
  }

private processUpload(file: File, type: 'pdf' | 'img' | 'csv') {
    const backendType: 'pdf' | 'csv' | 'image' = type === 'img' ? 'image' : type;

    // 1. UI: Activamos spinners
    if (type === 'pdf') this.isUploadingPDF = true;
    else if (type === 'img') this.isUploadingIMG = true;
    else if (type === 'csv') this.isUploadingCSV = true;

    this.systemStatus = 'analyzing';
    this.analysisFailed = false;
    this.agentThought = `Subiendo ${file.name} al laboratorio virtual...`;

    // 2. Subida del archivo (POST /api/upload)
    this.dataService.uploadFile(file).subscribe({
      next: (uploadRes: UploadResponse) => {
  // 3. ANÁLISIS (POST /api/analyze)
  const activeSession = this.dataService.currentSessionId;

  this.dataService.analyze({
      type: backendType,
      blob_name: uploadRes.blob_name,
      session_id: activeSession || undefined 
    })
    .subscribe({
      next: (analysisRes: any) => { // Usamos any para manejar la limpieza si es necesario
        console.log('Análisis recibido:', analysisRes);

        // --- LÓGICA DE LIMPIEZA DE EMERGENCIA ---
        let data = analysisRes;
        if (typeof analysisRes === 'string') {
          try {
            // Limpiamos el JSON malformado que vimos antes (}" o "})
            const cleanJson = analysisRes.replace(/}"/g, '}').replace(/"}/g, '}');
            data = JSON.parse(cleanJson);
          } catch (e) {
            console.error("No se pudo parsear el análisis, usando crudo", e);
          }
        }
        // ----------------------------------------

        this.analysisResultData = data;
        this.systemStatus = 'safe';

        // Finalizamos el estado de la UI
        this.finalizeUpload(type, file.name, uploadRes.file_url);
        
        // Mensaje inteligente basado en el contenido real del JSON limpio
        if (data.observations_and_analysis || data.experiment_summary) {
          this.agentThought = activeSession 
            ? `¡Logrado! ${file.name} ha sido integrado al análisis científico actual.` 
            : `Análisis de ${file.name} completado con éxito. El laboratorio está listo.`;
        } else {
          this.agentThought = `Archivo procesado, pero el análisis contiene advertencias de seguridad.`;
        }
      },
      error: (err: any) => {
  console.error('Error capturado:', err);
  this.isTyping = false;

  let displayTitle = '⚠️ ERROR DE SISTEMA';
  let displayText = 'El laboratorio no pudo procesar la solicitud.';
  let isSecurity = false;

  // 1. Intentamos extraer el cuerpo del error (err.error)
  let errorBody = err.error;

  // Si el error viene como String (pasa a veces en Azure), lo parseamos
  if (typeof errorBody === 'string') {
    try {
      errorBody = JSON.parse(errorBody);
    } catch (e) {
      console.error("No se pudo parsear el cuerpo del error");
    }
  }

  // 2. Mapeamos según lo que vimos en tu captura de Network
  if (err.status === 400 && errorBody) {
    if (errorBody.response_mode === 'restricted') {
      isSecurity = true;
      displayTitle = '🛑 BLOQUEO DE SEGURIDAD';
      displayText = errorBody.security_message || 'Contenido restringido por políticas de riesgo químico.';
      
      // Mantenemos la sesión viva si el backend nos devolvió un ID
      if (errorBody.session_id) {
        console.log('Sesión mantenida tras bloqueo:', errorBody.session_id);
      }
    }
  } else if (err.status === 502 || err.status === 504) {
    displayText = 'El servidor tardó demasiado en responder (Timeout). Intenta con una pregunta más simple.';
  }

  // 3. Renderizamos en la UI con un estilo llamativo
  const alertBg = isSecurity ? '#fff3e0' : '#f8d7da';
  const alertBorder = isSecurity ? '#ff9800' : '#dc3545';
  const alertColor = isSecurity ? '#e65100' : '#721c24';

  this.chatHistory.push({
    role: 'assistant',
    text: `
      <div style="background: ${alertBg}; border-left: 6px solid ${alertBorder}; padding: 15px; border-radius: 4px; color: ${alertColor}; margin: 10px 0;">
        <b style="font-size: 1.1em;">${displayTitle}</b><br>
        ${displayText}
      </div>
    `
  });

  this.scrollToBottom();
}
    });
},
    });
  }

  // Método auxiliar para limpiar el código y no repetir lógica de apagado
  private finalizeUpload(type: string, fileName: string, url: string) {
    this.isUploadingPDF = false;
    this.isUploadingIMG = false;
    this.isUploadingCSV = false;

    if (type === 'pdf') {
      this.selectedPDFName = fileName;
      this.PDFAzureUrl = url;
    } else if (type === 'img') {
      this.selectedIMGName = fileName;
      this.IMGAzureUrl = url;
    } else if (type === 'csv') {
      this.selectedCSVName = fileName;
      this.CSVAzureUrl = url;
    }
  }

  private handleUploadError(type: string, reason: string) {
    this.isUploadingPDF = false;
    this.isUploadingIMG = false;
    this.isUploadingCSV = false;
    this.revertUpload(type as any);
    this.agentThought = `Error: falló debido a ${reason}. Reintenta, por favor.`;
  }

  public onRetryAnalysis() {
    if (!this.lastBlobUploaded) return;

    this.analysisFailed = false;
    this.systemStatus = 'analyzing';
    this.agentThought = 'Reintentando análisis con el archivo existente en Azure...';

    // CAMBIO CLAVE: Usamos .analyze() con el objeto de parámetros
    this.dataService
      .analyze({
        type: this.lastBlobUploaded.input_type,
        blob_name: this.lastBlobUploaded.blob_name,
      })
      .subscribe({
        next: (analysisRes: AnalysisResponse) => {
          // Tipamos la respuesta
          this.analysisResultData = analysisRes; // Usamos la variable unificada
          this.systemStatus = 'safe';
          this.agentThought = 'Análisis completado exitosamente tras el reintento.';

          this.isUploadingPDF = this.isUploadingIMG = this.isUploadingCSV = false;
        },
        error: (err: any) => {
          // Tipamos el error
          console.error('Reintento fallido:', err);
          this.analysisFailed = true;
          this.systemStatus = 'error';
          this.agentThought = 'El análisis falló de nuevo. Revisa la conexión con el servidor.';
        },
      });
  }
}
