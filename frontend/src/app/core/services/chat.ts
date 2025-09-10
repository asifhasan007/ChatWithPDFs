import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { ApiService } from './api';
import { Category, PDF } from '../models/category.model';
import { ChatMessage, ChatSession } from '../models/chat.model';
 
@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  public categories$ = this.categoriesSubject.asObservable();
  private readonly STORAGE_KEY = 'chat_app_state';
 
  constructor(private apiService: ApiService) {
    this.loadStateFromStorage();
  }
 
  private loadStateFromStorage(): void {
    const savedState = localStorage.getItem(this.STORAGE_KEY);
    if (savedState) {
      const parsedState: Category[] = JSON.parse(savedState);
      this.categoriesSubject.next(parsedState);
    } else {
      this.loadInitialDataFromServer();
    }
  }
 
  private saveStateToStorage(): void {
    const currentState = this.categoriesSubject.getValue();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(currentState));
  }
 
  private loadInitialDataFromServer(): void {
    this.apiService.getCategories().subscribe({
      next: (categoryNames: string[]) => {
        const categories: Category[] = categoryNames.map(name => ({
          id: name, name: name, pdfs: []
        }));
        this.categoriesSubject.next(categories);
        this.saveStateToStorage();
      },
      error: (err: any) => console.error('Failed to load categories', err)
    });
  }
 
  addCategory(name: string): void {
    this.apiService.createCategory(name).pipe(
      tap(() => {
        const newCategory: Category = { id: name, name: name, pdfs: [] };
        const currentCategories = this.categoriesSubject.getValue();
        this.categoriesSubject.next([...currentCategories, newCategory]);
        this.saveStateToStorage();
      }),
   
      catchError((err: any) => {
        console.error('Failed to create category:', err);
        alert('Error: Could not create folder on the server.');
        return throwError(() => err); // Re-throw the error to be handled by the subscriber if needed
      })
    ).subscribe();
  }
 
  deleteCategory(categoryId: string): void {
    this.apiService.deleteCategory(categoryId).pipe(
      tap(() => {
        const current = this.categoriesSubject.getValue();
        this.categoriesSubject.next(current.filter(c => c.id !== categoryId));
        this.saveStateToStorage();
      }),
      
      catchError((err: any) => {
        console.error('Failed to delete category:', err);
        alert('Error: Could not delete folder on the server.');
        return throwError(() => err); // Re-throw the error
      })
    ).subscribe();
  }
 
  uploadPdf(categoryId: string, file: File): void {
    const categories = this.categoriesSubject.getValue();
    const categoryIndex = categories.findIndex(c => c.id === categoryId);
    if (categoryIndex === -1) return;
 
    categories[categoryIndex].isUploading = true;
    this.categoriesSubject.next([...categories]);
 
    this.apiService.uploadPdf(categoryId, file).subscribe({
      next: (response) => {
        const newPdf: PDF = { id: file.name, name: file.name, uploadDate: new Date() };
        categories[categoryIndex].pdfs.push(newPdf);
        categories[categoryIndex].isUploading = false;
        this.categoriesSubject.next([...categories]);
        this.saveStateToStorage();
      },
      error: (err: any) => {
        console.error('Upload failed:', err);
        categories[categoryIndex].isUploading = false;
        this.categoriesSubject.next([...categories]);
        alert('Upload failed. Please try again.');
      }
    });
  }
  // --- These methods call the API but do not modify the local state directly, so they are simpler ---
 
  getPdfChatResponse(message: string, categoryId: string): Observable<ChatMessage> {
    return this.apiService.sendChatMessage(message, categoryId).pipe(
      map(response => ({
        sender: 'ai',
        text: response.answer,
        timestamp: new Date(),
        source: { pdfName: response.sources.join(', '), pdfId: '', pageNumber: 0 }
      } as ChatMessage))
    );
  }
 
  getAiSolutionResponse(message: string): Observable<string> {
    return this.apiService.getAiSolution(message).pipe(
      map(response => response.answer)
    );
  }
  getChatHistory(categoryId: string): Observable<ChatSession[]> {
    return this.apiService.getChatHistory(categoryId);
  }
 
  saveChatSession(categoryId: string, messages: ChatMessage[]): void {
    this.apiService.saveChatSession(categoryId, messages).subscribe({
      next: () => console.log('Chat session saved successfully.'),
      error: (err: any) => console.error('Failed to save chat session', err)
    });
  }
 
  deleteChatSession(sessionId: string): Observable<void> {
    return this.apiService.deleteChatSession(sessionId);
  }
}