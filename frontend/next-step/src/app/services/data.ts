import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';

// Interfaz de la Respuesta de Subida
export interface UploadResponse{
file_url: string;
input_type: 'csv' | 'pdf' | 'image';
blob_name: string;
}

// Interfaz para el analisis 
export interface AnalysisResponse{
  experiment_summary: string;
  protocol_or_setup: string;
  observations_and_analysis: string;
  next_steps: NextStep[];
  limitations_and_uncertainties: string[];
  safety_assessment: string;
  response_mode: 'normal' | 'restricted';
}

// Proximos pasos
export interface NextStep{
  suggestion: string;
  reasoning: string;
}

// Interfaz para enviar datos al analisis
export interface AnalysisInput{
  input_type: 'text' | 'csv' | 'pdf' | 'image';
  text?: string;  //Opcional si es solo texto
  blob_name?: string;  //Opcional si es archivo
}

// Interfaz para el Health Check
export interface HealthStatus {
  status: string;
  message: string;
}

@Injectable({
  providedIn: 'root',
})

export class Data {

  //URL base
  private readonly API_URL = environment.api_URL;

  constructor(private http: HttpClient){}


  //** Salud del sistema
  checkHealth(): Observable<any> {
    return this.http.get(`${this.API_URL}/${environment.health}`);
  }

  //** Subida de archivos
  uploadFile(file: File): Observable<UploadResponse> {

    // FormData creado
    const formData = new FormData();
    // Agregamos el archivo
    formData.append('file', file); 
    // Hacemos la peticion POST a la URL 
    return this.http.post<UploadResponse>(
      `${this.API_URL}/${environment.upload}`, 
      formData
    );
  }

  //** Analisis Cientifico
  analyzeFile(type: 'csv' | 'pdf' | 'image', blobName: string): Observable<AnalysisResponse>{
    const body: AnalysisInput = {
      input_type: type,
      blob_name: blobName
    };

    return this.http.post<AnalysisResponse>(`${this.API_URL}/${environment.analyze}`, body);
  }
  
  //** Chat / Consulta de Texto
  analyzeText(text: string): Observable<AnalysisResponse>{
    const body: AnalysisInput = {
      input_type: 'text',
      text: text
    };

    return this.http.post<AnalysisResponse>(
      `${this.API_URL}/${environment.analyze}`, body
    );
  }
  
}
