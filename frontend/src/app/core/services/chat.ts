import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Category, PDF } from '../models/category.model';
import { ChatMessage, ChatSession, ChatSource } from '../models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private categoriesSubject: BehaviorSubject<Category[]>;
  private chatHistorySubject: BehaviorSubject<Record<string, ChatSession[]>>;

  public categories$: Observable<Category[]>;

  constructor() {
    // A "reviver" function to correctly parse date strings from JSON
    const dateReviver = (key: string, value: any) => {
      const isDateString = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value);
      if (isDateString) {
        return new Date(value);
      }
      return value;
    };

    // Load initial data from localStorage or use defaults
    const storedCategories = localStorage.getItem('smartpdf_categories');
    const storedHistory = localStorage.getItem('smartpdf_chathistory');

    // Default data if nothing is in storage
    const defaultCategories: Category[] = [
      {
        id: 'cat1',
        name: 'Project Alpha',
        pdfs: [{ id: 'pdf1', name: 'requirements.pdf', uploadDate: new Date() }]
      }
    ];

    const defaultHistory: Record<string, ChatSession[]> = {
      'cat1': [
        { 
          id: 'sess1', 
          startTime: new Date(Date.now() - 86400000), // 1 day ago
          messages: [
            { sender: 'ai', text: 'Welcome to the chat for Project Alpha!', timestamp: new Date() }
          ]
        }
      ]
    };
    
    // Use the reviver function when parsing stored data
    const initialCategories = storedCategories ? JSON.parse(storedCategories, dateReviver) : defaultCategories;
    const initialHistory = storedHistory ? JSON.parse(storedHistory, dateReviver) : defaultHistory;

    this.categoriesSubject = new BehaviorSubject<Category[]>(initialCategories);
    this.chatHistorySubject = new BehaviorSubject<Record<string, ChatSession[]>>(initialHistory);
    
    this.categories$ = this.categoriesSubject.asObservable();
  }

  // --- Private Helper Methods for Persistence ---

  private saveCategories(categories: Category[]): void {
    this.categoriesSubject.next(categories);
    localStorage.setItem('smartpdf_categories', JSON.stringify(categories));
  }

  private saveHistory(history: Record<string, ChatSession[]>): void {
    this.chatHistorySubject.next(history);
    localStorage.setItem('smartpdf_chathistory', JSON.stringify(history));
  }

  // --- Public Methods ---

  addCategory(name: string): void {
    const currentCategories = this.categoriesSubject.getValue();
    const newCategory: Category = {
      id: `cat${Date.now()}`,
      name: name,
      pdfs: []
    };
    this.saveCategories([...currentCategories, newCategory]);
  }

    deleteCategory(id: string): void {
    // Remove the category from the categories list
    let categories = this.categoriesSubject.getValue();
    categories = categories.filter(cat => cat.id !== id);
    this.saveCategories(categories);
    
    // Also, delete all chat history associated with this category
    const allHistory = this.chatHistorySubject.getValue();
    if (allHistory[id]) {
      delete allHistory[id];
      this.saveHistory(allHistory);
    }
  }

  uploadPdf(categoryId: string, file: File): void {
    const categories = this.categoriesSubject.getValue();
    const categoryIndex = categories.findIndex(c => c.id === categoryId);

    if (categoryIndex > -1) {
      categories[categoryIndex].isUploading = true;
      this.categoriesSubject.next([...categories]);

      setTimeout(() => {
        const newPdf: PDF = {
          id: `pdf${Date.now()}`,
          name: file.name,
          uploadDate: new Date()
        };
        categories[categoryIndex].pdfs.push(newPdf);
        categories[categoryIndex].isUploading = false;
        this.saveCategories(categories);
      }, 1500);
    }
  }

  getPdfChatResponse(message: string, categoryId: string): Observable<ChatMessage> {
    const category = this.categoriesSubject.getValue().find(c => c.id === categoryId);
    let response: ChatMessage;

    if (category && category.pdfs.length > 0) {
      const sourcePdf = category.pdfs[0];
      response = {
        sender: 'ai',
        text: `Based on "${sourcePdf.name}", here is a mock answer regarding "${message}".`,
        timestamp: new Date(),
        source: {
          pdfId: sourcePdf.id,
          pdfName: sourcePdf.name,
          pageNumber: Math.floor(Math.random() * 20) + 1
        }
      };
    } else {
      response = {
        sender: 'ai',
        text: 'Please select a category that contains PDFs to get a sourced answer.',
        timestamp: new Date()
      };
    }
    return of(response);
  }
  
  getAiSolutionResponse(message: string): Observable<string> {
    const responses = [
      `Here is a general AI solution for your query: "${message}".`,
      `Regarding "${message}", an effective approach would be...`
    ];
    return of(responses[Math.floor(Math.random() * responses.length)]);
  }

  // --- NEW METHOD TO SAVE A CHAT SESSION ---
  saveChatSession(categoryId: string, messages: ChatMessage[]): void {
    if (!categoryId || messages.length === 0) {
      return; // Don't save empty or un-categorized sessions
    }

    const allHistory = this.chatHistorySubject.getValue();
    
    // Initialize history for the category if it's the first time
    if (!allHistory[categoryId]) {
      allHistory[categoryId] = [];
    }

    // Create the new session
    const newSession: ChatSession = {
      id: `sess${Date.now()}`,
      startTime: messages[0].timestamp, // Use the first message's timestamp as the start time
      messages: messages
    };

    // Add the new session to the beginning of the array
    allHistory[categoryId].unshift(newSession);

    this.saveHistory(allHistory);
  }

  // --- Chat History Methods ---

  getChatHistory(categoryId: string): Observable<ChatSession[]> {
    return this.chatHistorySubject.asObservable().pipe(
      map(history => history[categoryId] || [])
    );
  }

  deleteChatSession(categoryId: string, sessionId: string): void {
    const allHistory = this.chatHistorySubject.getValue();
    if (allHistory[categoryId]) {
      allHistory[categoryId] = allHistory[categoryId].filter(session => session.id !== sessionId);
      this.saveHistory(allHistory);
    }
  }
}
