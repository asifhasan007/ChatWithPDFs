import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { Category } from '../../core/models/category.model';
import { ChatMessage, ChatSource } from '../../core/models/chat.model';
import { ChatService } from '../../core/services/chat';
 
@Component({
  selector: 'app-pdf-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pdf-chat.html',
  styleUrls: ['./pdf-chat.scss']
})
export class PdfChat implements OnInit, OnDestroy {
  categories$!: Observable<Category[]>;
  selectedCategoryId: string = '';
  isSessionStarting = false;
  isSessionActive$!: Observable<boolean>;
  isAiThinking: boolean = false;
 
  messages: ChatMessage[] = [];
  userMessage: string = '';
 
  private chatSub?: Subscription;
 
  constructor(private chatService: ChatService) {}
 
  ngOnInit(): void {
    this.categories$ = this.chatService.categories$;
    this.isSessionActive$ = this.chatService.isPdfSessionActive$;
  }
 
  /**
   * Called when the user selects a new folder from the dropdown.
   * This clears old messages and starts a new session on the backend.
   */
  onCategoryChange(): void {
    if (!this.selectedCategoryId) return;
   
    this.isSessionStarting = true;
    this.messages = [];
 
    this.chatService.startNewPdfChat(this.selectedCategoryId).subscribe({
      next: () => {
        this.isSessionStarting = false;
        // Provide a welcome message to the user
        this.messages.push({
          sender: 'ai',
          text: `Session started for folder: ${this.selectedCategoryId}. You can now ask questions about its content.`,
          timestamp: new Date()
        });
      },
      error: (err) => {
        this.isSessionStarting = false;
        alert('Could not start chat session. Please check the console and try again.');
        console.error(err);
      }
    });
  }
 
  /**
   * Sends the user's message to the currently active session.
   * It no longer needs the categoryId.
   */
  sendMessage(): void {
    if (!this.userMessage.trim()) return;
 
    const userMsg: ChatMessage = { sender: 'user', text: this.userMessage, timestamp: new Date() };
    this.messages.push(userMsg);
    this.isAiThinking = true;
 
    // Call the service with only the message
    this.chatSub = this.chatService.getPdfChatResponse(this.userMessage).subscribe({
      next: (aiMsg) => {
        this.messages.push(aiMsg);
        this.isAiThinking = false;
      },
      error: (err) => {
        console.error("Error getting AI response:", err);
         this.isAiThinking = false;
        this.messages.push({
          sender: 'ai',
          text: 'Sorry, I encountered an error trying to get a response. Please try again.',
          timestamp: new Date()
        });
      }
    });
 
    this.userMessage = ''; // Reset the input field
  }
 
  /**
   * A placeholder for viewing the source of an AI's answer.
   */
  viewSource(source: ChatSource): void {
    alert(`Source: "${source.pdfName}" on page ${source.pageNumber}.`);
  }
 
  /**
   * A public method that can be called from parent components to reset the chat.
   */
  public clearSession(): void {
    this.messages = [];
    this.selectedCategoryId = '';
    this.chatService.clearPdfSession();
  }
 
  /**
   * Unsubscribe from any active subscriptions when the component is destroyed.
   */
  ngOnDestroy(): void {
    if (this.chatSub) {
      this.chatSub.unsubscribe();
    }
  }
}