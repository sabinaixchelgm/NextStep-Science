import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UploadResponse{
file_url: string;
input_type: string;
blob_name: string;
}

@Injectable({
  providedIn: 'root',
})

export class Data {

  //URL base
  private readonly API_URL = environment.api_URL;

  constructor(private http: HttpClient){}

  // //Simular envío de archivos
  // uploadFile(file: File, type: string): Observable<any>{
  //   console.log(`Subiendo archivo de tipo: ${type}`, file.name);

  //   //Simulamos respuestas del servidor tras 2 segundos
  //   return of({
  //     status: 'success',
  //     message: 'Archivo procesado correctamente',
  //     extrated_data: { temp_limit: '40°C', sensor_id: 'RS-99' }
  //   }).pipe(delay(2000));

  //   // Respuesta REAL: return this.http.post(`${this.API_URL}/analyze`, { file, type });
  // }

  //** Salud del sistema
  checkHealth(): Observable<any> {
    return this.http.get(`${this.API_URL}/${environment.health}`);
  }

  //** Subida de archivos
  uploadFile(file: File, type: string): Observable<UploadResponse> {
    console.log(`Iniciando subida REAL a Azure. Tipo: ${type}`, file.name);

    // FormData creado
    const formData = new FormData();

    // Agregamos el archivo y el tipo
    formData.append('file', file); 
    formData.append('type', type);

    // Hacemos la peticion POST a la URL 
    return this.http.post<UploadResponse>(`${this.API_URL}/${environment.upload}`, formData);
  }

  // ** Chat con la IA
  sendMessage(message: string): Observable<any> {
    console.log('Enviando mensaje al agente', message);

    //MOCK: Respuesta automatica de la IA
    return of({
      response: `Como Scientist Agent, he analizado tu duda: "${message}". Recomiendo revisar la válvula de presión.`,
      timestamp: new Date()
    }).pipe(delay(1500));

    // --- RESPUESTA REAL (Descomentar al conectar el Backend) ---
    /*
    return this.http.post(`${this.API_URL}/$analyze_endpoint`, { 
      prompt: message,
      session_id: 'hackathon-001' // Opcional, según pida tu backend
    });
    */
  }




  
}
