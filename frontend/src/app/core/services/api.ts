import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ChatMessage } from '../models/chat.model'; // Updated import

// --- New Response Interfaces from Backend Docs ---
interface BackendCategoriesResponse {
  categories: string[];
}

interface BackendChatResponse {
  answer: string;
  sources: { source: string; page: number }[]; // Corrected sources type
}

interface BackendUploadResponse {
  message: string;
}

interface BackendAiSolutionResponse {
 answer: string;
}

 interface BackendStartSessionResponse {
  message: string;
  session_id: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://127.0.0.1:5000';

  constructor(private http: HttpClient) { }

  // --- Categories API Method ---
  getCategories(): Observable<string[]> {
    return this.http.get<BackendCategoriesResponse>(`${this.baseUrl}/categories`).pipe(
      map(response => response.categories)
    );
  }

  createCategory(name: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/categories`, { name });
  }

  deleteCategory(categoryId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/categories/${categoryId}`);
  }

  // --- Upload API Method ---
  uploadPdf(category: string, file: File): Observable<BackendUploadResponse> {
    const formData = new FormData();
    formData.append('files', file);
    formData.append('category', category);

    return this.http.post<BackendUploadResponse>(`${this.baseUrl}/upload`, formData);
  }

  deletePdf(category: string, filename: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/categories/${category}/documents/${filename}`);
  }

  // --- Ai Chat Method ---
  getAiSolution(message: string): Observable<BackendAiSolutionResponse> {
    const payload = { message };
    return this.http.post<BackendAiSolutionResponse>(`${this.baseUrl}/ai-solution`, payload);
  }

  // --- Chat API Method ---
  startChatSession(category: string): Observable<BackendStartSessionResponse> {
    return this.http.post<BackendStartSessionResponse>(`${this.baseUrl}/chat/start`, { category });
  }

  sendChatMessage(sessionId: string, question: string): Observable<BackendChatResponse> {
    const payload = { session_id: sessionId, question: question };
    return this.http.post<BackendChatResponse>(`${this.baseUrl}/chat`, payload);
  }

  // --- Chat History Method ---
  
  // FIX 1: Returns a flat array of ChatMessage objects, as sent by the backend.
 getChatHistory(categoryId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/chat/history/${categoryId}`);
  }
  
  // FIX 2: Deletes history by categoryId, matching the backend route.
  deleteChatHistory(categoryId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/chat/history/${categoryId}`);
  }
  
  // REMOVED: saveChatSession method was removed as it is not supported by the backend.
}
