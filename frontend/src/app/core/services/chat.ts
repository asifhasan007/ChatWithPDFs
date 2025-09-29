import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { ApiService } from './api';

import { Category, PDF } from '../models/category.model';
import { ChatMessage, ChatSession } from '../models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  saveChatSession(categoryIdToSave: string, messagesToSave: ChatMessage[]) {
    throw new Error('Method not implemented.');
  }
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  public categories$ = this.categoriesSubject.asObservable();

  private currentPdfSessionId = new BehaviorSubject<string | null>(null);
  public isPdfSessionActive$ = this.currentPdfSessionId.asObservable().pipe(map(id => !!id));

  // --- A key for storing our state in local storage ---
  private readonly STORAGE_KEY = 'chat_app_state';

  // --- INJECT the ApiService in the constructor ---
  constructor(private apiService: ApiService) {
    this.loadStateFromStorage();
  }

  // --- Loads state from local storage if available ---
  private loadStateFromStorage(): void {
    const savedState = localStorage.getItem(this.STORAGE_KEY);
    if (savedState) {
      const parsedState: Category[] = JSON.parse(savedState);
      this.categoriesSubject.next(parsedState);
    } else {
      this.loadInitialDataFromServer();
    }
  }

  // --- Saves the current state to local storage ---

  private saveStateToStorage(): void {
    const currentState = this.categoriesSubject.getValue();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(currentState));
  }

  // --- Fetches the initial data from the server ---

  private loadInitialDataFromServer(): void {
    this.apiService.getCategories().subscribe({
      next: (categoryNames: string[]) => {
        const categories: Category[] = categoryNames.map(name => ({
          id: name,
          name: name,
          pdfs: [],
          isUploading: false
        }));
        this.categoriesSubject.next(categories);
        this.saveStateToStorage();
      },
      error: (err: any) => {
        console.error('Failed to load categories', err);
        this.categoriesSubject.next([]);
      }
    });
  }

  // --- Category and PDF management methods ---

  addCategory(name: string): void {
    this.apiService.createCategory(name).pipe(
      tap(() => {
        const newCategory: Category = { id: name, name: name, pdfs: [], isUploading: false };
        const currentCategories = this.categoriesSubject.getValue();
        this.categoriesSubject.next([...currentCategories, newCategory]);
        this.saveStateToStorage();
      }),
      catchError((err: any) => { return throwError(() => err); })
    ).subscribe();
  }

  deleteCategory(categoryId: string): void {
    this.apiService.deleteCategory(categoryId).pipe(
      tap(() => {
        const current = this.categoriesSubject.getValue();
        this.categoriesSubject.next(current.filter(c => c.id !== categoryId));
        this.saveStateToStorage();
      }),
      catchError((err: any) => { return throwError(() => err); })
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
  deletePdf(categoryId: string, pdfId: string): void {
    if (!confirm(`Are you sure you want to delete the file "${pdfId}"? This cannot be undone.`)) {
      return;
    }

    this.apiService.deletePdf(categoryId, pdfId).subscribe({
      next: () => {
        console.log(`Successfully deleted PDF: ${pdfId}`);
        const categories = this.categoriesSubject.getValue();
        const categoryIndex = categories.findIndex(c => c.id === categoryId);

        if (categoryIndex !== -1) {
          categories[categoryIndex].pdfs = categories[categoryIndex].pdfs.filter(pdf => pdf.id !== pdfId);
          this.categoriesSubject.next([...categories]);
          this.saveStateToStorage();
        }
      },
      error: (err) => {
        console.error(`Failed to delete PDF: ${pdfId}`, err);
        alert('Failed to delete the PDF. Please check the console for details.');
      }
    });
  }
  // --- Chat-related methods ---

  public startNewPdfChat(categoryId: string): Observable<void> {
    return this.apiService.startChatSession(categoryId).pipe(
      map((response: any) => { // Added 'any' type for now to avoid compile errors
        console.log(`New PDF chat session started with ID: ${response.session_id}`);
        this.currentPdfSessionId.next(response.session_id);
      })
    );
  }

  getPdfChatResponse(message: string): Observable<ChatMessage> {
    const sessionId = this.currentPdfSessionId.getValue();
    if (!sessionId) {
      return throwError(() => new Error('No active PDF chat session.'));
    }

    return this.apiService.sendChatMessage(sessionId, message).pipe(
      map(response => {
        // Transform backend source format to frontend ChatSource format

        if (response.sources && response.sources.length > 0) {
          // Get the first source object from the array
          const firstSource = response.sources[0];

          // Create the text string using only the first source
          const sourcesText = `${firstSource.source} (p. ${firstSource.page})`;

          return {
            sender: 'ai',
            text: response.answer,
            timestamp: new Date(),
            source: {
              pdfName: sourcesText, // This now contains only the first source info
              pdfId: '', // pdfId may need to be derived differently if required
              pageNumber: firstSource.page // You can also store the page number directly
            }
          } as ChatMessage;
        } else {
          // Handle the case where there are no sources
          return {
            sender: 'ai',
            text: response.answer,
            timestamp: new Date()
            // No 'source' property if none are available
          } as ChatMessage;
        }
      })
    );
  }

  public clearPdfSession(): void {
    this.currentPdfSessionId.next(null);
  }

  // --- AI Solution methods ---

  getAiSolutionResponse(message: string): Observable<string> {
    return this.apiService.getAiSolution(message).pipe(
      map((response: any) => response.answer)
    );
  }

  // --- Chat history methods ---

  getChatHistory(categoryId: string): Observable<ChatSession[]> {
    return this.apiService.getChatHistory(categoryId).pipe(
      map(rawMessages => {
        if (!rawMessages || rawMessages.length === 0) {
          return [];
        }

        // FIX: Manually map each message object to the ChatMessage interface
        const formattedMessages: ChatMessage[] = rawMessages.map(msg => ({
          sender: msg.sender,
          text: msg.message, // Map 'message' from backend to 'text' for frontend
          timestamp: new Date(msg.timestamp)
        }));

        const session: ChatSession = {
          id: categoryId,
          startTime: formattedMessages[0].timestamp,
          messages: formattedMessages
        };
        return [session];
      }),
      catchError(err => {
        console.error(`Failed to get chat history for ${categoryId}`, err);
        return of([]);
      })
    );
  }

  // FIX 4: Call the corrected delete method in the API service.
  deleteChatHistory(categoryId: string): Observable<void> {
    return this.apiService.deleteChatHistory(categoryId);
  }
}