import { Component, ElementRef, ViewChild } from '@angular/core';
import { Data } from '../../services/data';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule],
  standalone: true,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})

export class Dashboard {

  ngOnInit() {
  // Evita que el navegador abra archivos si se sueltan fuera de la zona
  window.addEventListener('dragover', (e) => e.preventDefault(), false);
  window.addEventListener('drop', (e) => e.preventDefault(), false);
}

  // Elemento para autoscroll
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  //Variables globales
  userInput: string = '';
  chatHistory: any[] = [
    { role: 'assistant', text: 'Hola, soy tu asistente. ¿En qué puedo ayudarte?' }
  ];
  isTyping: boolean = false;
  agentThought: string = 'Bienvenido, colega. Sube un manual o un diagrama para comenzar el análisis.';

  // Estados para el archivo PDF
  isDraggingPDF = false;
  selectedPDFName: string | null = null;
  isUploadingPDF = false;
  PDFAzureUrl: string = '';  //Almacena la url de Azure
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
  
  //Estadp para el boton de envio
   showConfirmButtons = false;


  constructor(private dataService: Data){}

  //Funcion para scroll hacia el fondo
  scrollToBottom(): void {
    try {
      setTimeout(() => {
        if (this.myScrollContainer) {
          this.myScrollContainer.nativeElement.scrollTo({
            top: this.myScrollContainer.nativeElement.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100); //100 ms para esperar el render
    } catch (err) {}
  }  

  //Funcion para envio de mensajes
  onSendMessage(){
    if (!this.userInput.trim()) return;

    // 1. Agregar mensaje del usuario a la lista
    this.chatHistory.push({ role: 'user', text: this.userInput });
    const tempMessage = this.userInput;
    this.userInput = ''; //Limpiar Input
    this.scrollToBottom(); // Bajar aqui
    this.isTyping = true;

    // 2. Llamamos al servicio
    this.dataService.sendMessage(tempMessage).subscribe({
      next: (res) => {
        this.chatHistory.push({ role: 'assistant', text: res.response });
        this.isTyping = false;
      },
      error: (err) => {
        console.error('Error en la comunicación', err);
        this.isTyping = false;
        this.scrollToBottom(); //Bajar aqui
      }
    });
  }

onDragOver(event: DragEvent, type: string){
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
    event.preventDefault(); // <--- Detiene la apertura del PDF
    event.stopPropagation();
    this.onDragLeave(type);
    
    this.onDragLeave(type); // Quitamos el color azul del borde

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
        const file = files[0];
        const fileName = file.name.toLowerCase();
        const fileType = file.type; // Ejemplo: 'application/pdf' o 'image/png'
        // En lugar de subirlo, lo guardamos en "espera"

        // Logica de valicacion
        let isValid = false;

        if (type === 'pdf' && (fileType === 'application/pdf' || fileName.endsWith('.pdf'))) {
          isValid = true;
        } else if (type === 'img' && (fileType.startsWith('image/') || fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg'))) {
          isValid = true;
        } else if (type === 'csv' && (fileType === 'text/csv' || fileName.endsWith('.csv'))) {
          isValid = true;
        }

        // Resultado de la validacion
        if (isValid) {
          if (type === 'pdf') {  this.tempPDFFile = file; this.selectedPDFName = file.name;  }
          else if (type === 'img') {  this.tempIMGFile = file; this.selectedIMGName = file.name;  }
          else if (type === 'csv') {  this.tempCSVFile = file; this.selectedCSVName = file.name;  }
          
          this.showConfirmButtons = true;
          this.agentThought = `Archivo ${file.name} detectado correctamente. ¿Confirmas la subida o prefieres revertir?`
        } else {
          this.agentThought = `¡Cuidado, colega! Estás intentando subir un archivo que no es ${type.toUpperCase()} en esta zona.`;
          console.warn(`Intento de subida inválido: Se esperaba ${type} pero se recibió ${file.name}`);
          setTimeout(() => {
            if (this.agentThought.includes("Cuidado")) {
              this.agentThought = "Esperando un archivo válido para continuar...";
            }
          }, 4000);
        }
      }
}

// NUEVO: Función para el botón de "Revertir"
revertUpload(type: 'pdf' | 'img' | 'csv') {
    if (type === 'pdf') {
        this.tempPDFFile = null;
        this.selectedPDFName = null;
    } else if (type === 'img'){
        this.tempIMGFile = null;
        this.selectedIMGName = null;
    } else if (type === 'csv'){
      this.tempCSVFile = null;
      this.selectedCSVName = null;
    }
    this.showConfirmButtons = false;
    this.agentThought = "Archivo descartado. El sistema sigue esperando un documento válido.";
}

// NUEVO: Función para el botón de "Confirmar"
confirmUpload(type: 'pdf' | 'img' | 'csv') {
    //Identificamos qué archivo temporal usar según el tipo
    let fileToUpload: File | null = null;
    
    if (type === 'pdf') fileToUpload = this.tempPDFFile;
    else if (type === 'img') fileToUpload = this.tempIMGFile;
    else if (type === 'csv') fileToUpload = this.tempCSVFile;
    
    // Si existe el archivo, procedemos con la subida real
    if (fileToUpload) {
      this.showConfirmButtons = false; //Oculta los botones de Confirmar/Revertir

      // Llamamos al metodo que conecta con el servicio
      this.processUpload(fileToUpload, type);
    } else {
      console.error(`No se encontró un archivo temporal para el tipo: ${type}`);
      this.agentThought = "Error interno: El archivo desapareció de la memoria. Intenta subirlo de nuevo.";
  }
    
}



private processUpload(file: File, type: 'pdf' | 'img' | 'csv' ) {
  // 1. Activamos el spinner correspondiente
  if (type === 'pdf') this.isUploadingPDF = true;
  else if (type === 'img') this.isUploadingIMG = true;
  else if (type === 'csv') this.isUploadingCSV = true;

  // 2. Llamamos al servicio pasando el tipo
  this.dataService.uploadFile(file, type).subscribe({
    next: (response) => {
      console.log(`Subida de ${type} exitosa:`, response);
      
      // 3. Desactivamos el spinner
      if (type === 'pdf') {
        this.isUploadingPDF = false;
        this.selectedPDFName = file.name;
        this.PDFAzureUrl = response.file_url;
      }
      else if (type === 'img') {
        this.isUploadingIMG = false;
        this.selectedIMGName = file.name;
        this.IMGAzureUrl = response.file_url;
      } else if (type === 'csv') {
        this.isUploadingCSV = false;
        this.selectedCSVName = file.name;
        this.CSVAzureUrl = response.file_url;
      }
      this.agentThought = `Archivo ${file.name} sincronizado con éxito.`;
    },
    error: (err) => {
      console.error(`Error al subir ${type}:`, err);
      this.isUploadingPDF = false;
      this.isUploadingIMG = false;
      this.isUploadingCSV = false;
      //alert(`Error al subir el archivo ${type}. Revisa la consola.`);
      // Se limpian archivos temporales para que el usuario pueda reintentar
      this.revertUpload(type);
      this.agentThought = `Ocurrió un error al subir el ${type}. Por favor, verifica tu conexión.`;
    }
  });

}



}


