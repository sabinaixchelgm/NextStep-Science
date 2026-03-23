import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Data {

  //Backend URL dentro de las comillas simples
  private readonly API_URL = '';

  constructor(private http: HttpClient){}

  //Simular envío de archivos
  uploadFile(file: File, type: string): Observable<any>{
    console.log(`Subiendo archivo de tipo: ${type}`, file.name);

    //Simulamos respuestas del servidor tras 2 segundos
    return of({
      status: 'success',
      message: 'Archivo procesado correctamente',
      extrated_data: { temp_limit: '40°C', sensor_id: 'RS-99' }
    }).pipe(delay(2000));

    // Respuesta REAL: return this.http.post(`${this.API_URL}/analyze`, { file, type });
  }

  // 2. Simular Chat con la IA
  sendMessage(message: string): Observable<any> {
    console.log('Enviando mensaje', message);

    //MOCK: Respuesta automatica de la IA
    return of({
      response: `Como Scientist Agent, he analizado tu duda: "${message}". Recomiendo revisar la válvula de presión.`,
      timestamp: new Date()
    }).pipe(delay(1500));

    // Respuesta REAL: return this.http.post(`${this.API_URL}/chat`, { message });
  }




  
}
