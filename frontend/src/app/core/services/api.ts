import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Category, PDF } from '../models/category.model';
import { ChatMessage, ChatSession } from '../models/chat.model';
 
// --- New Response Interfaces from Backend Docs ---
// These define the exact shape of the data your backend will send.
 
interface BackendCategoriesResponse {
  categories: string[];
}
 
interface BackendChatResponse {
  answer: string;
  sources: string[];
}
 
interface BackendUploadResponse {
  message: string;
}
 
interface BackendAiSolutionResponse {
 answer: string; }
 
 interface BackendStartSessionResponse {
  message: string;
  session_id: string;
}
 
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // We will now use the direct backend URL since the functions use fetch
  // and do not go through the Angular proxy.
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
    formData.append('files', file); // Backend expects 'file'
    formData.append('category', category); // Backend expects 'category'
 
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
 
  getChatHistory(categoryId: string): Observable<ChatSession[]> {
    return this.http.get<ChatSession[]>(`${this.baseUrl}/chat/history/${categoryId}`);
  }
 
  saveChatSession(categoryId: string, messages: ChatMessage[]): Observable<ChatSession> {
    const payload = { categoryId, messages };
    return this.http.post<ChatSession>(`${this.baseUrl}/chat/history`, payload);
  }
 
  deleteChatSession(sessionId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/chat/history/${sessionId}`);
  }
 
 
}
 
 