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
  if (type === 'img') this.isDraggingIMG = true;

}

onDragLeave(type: string) {
  if (type === 'pdf') this.isDraggingPDF = false;
  if (type === 'img') this.isDraggingIMG = false;
}

onDrop(event: DragEvent, type: 'pdf' | 'img') {
    event.preventDefault(); // <--- Detiene la apertura del PDF
    event.stopPropagation();
    
    this.onDragLeave(type); // Quitamos el color azul del borde

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
        const file = files[0];
        // En lugar de subirlo, lo guardamos en "espera"
        if (type === 'pdf') {
            this.tempPDFFile = file; // Tienes que declarar esta variable arriba
            this.selectedPDFName = file.name;
            this.agentThought = `He cargado "${file.name}" localmente. ¿Confirmas la subida a Azure o prefieres revertir?`;
        } else {
            this.tempIMGFile = file; // Tienes que declarar esta variable arriba
            this.selectedIMGName = file.name;
            this.agentThought = `Imagen "${file.name}" lista. ¿Deseas subirla?`;
        }
        
        this.showConfirmButtons = true; // Mostramos los botones en el HTML
    }
}

// NUEVO: Función para el botón de "Revertir"
revertUpload(type: 'pdf' | 'img') {
    if (type === 'pdf') {
        this.tempPDFFile = null;
        this.selectedPDFName = null;
    } else {
        this.tempIMGFile = null;
        this.selectedIMGName = null;
    }
    this.showConfirmButtons = false;
    this.agentThought = "Archivo descartado. El sistema sigue esperando un documento válido.";
}

// NUEVO: Función para el botón de "Confirmar"
confirmUpload(type: 'pdf' | 'img') {
    const fileToUpload = type === 'pdf' ? this.tempPDFFile : this.tempIMGFile;
    
    if (fileToUpload) {
        this.showConfirmButtons = false; // Ocultamos los botones mientras sube
        this.processUpload(fileToUpload, type); // Aquí sí llamamos a Azure
    }
}



private processUpload(file: File, type: 'pdf' | 'img') {
  // 1. Activamos el spinner correspondiente
  if (type === 'pdf') this.isUploadingPDF = true;
  if (type === 'img') this.isUploadingIMG = true;

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
      if (type === 'img') {
        this.isUploadingIMG = false;
        this.selectedIMGName = file.name;
        this.IMGAzureUrl = response.file_url;
      }
      this.agentThought = `Archivo ${file.name} sincronizado con éxito.`;
    },
    error: (err) => {
      //console.error(`Error al subir ${type}:`, err);
      this.isUploadingPDF = false;
      this.isUploadingIMG = false;
      //alert(`Error al subir el archivo ${type}. Revisa la consola.`);
      this.agentThought = "Error en el servidor. Reintenta en un momento.";
    }
  });

}



}


