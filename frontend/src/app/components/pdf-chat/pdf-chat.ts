import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { Category } from '../../core/models/category.model';
import { ChatMessage, ChatSource } from '../../core/models/chat.model';
import { ChatService } from '../../core/services/chat';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-pdf-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pdf-chat.html',
  styleUrls: ['./pdf-chat.scss']
})
export class PdfChat implements OnInit, OnDestroy {
  loadChatForCategory(categoryId: string) {
    throw new Error('Method not implemented.');
  }
  categories$!: Observable<Category[]>;
  selectedCategoryId: string = ''; // Bound to the dropdown's ngModel
  isLoading = false; // Consolidated loading state
  isSessionActive$!: Observable<boolean>;
  
  messages: ChatMessage[] = [];
  userInput: string = ''; // Changed from userMessage for consistency

  private chatSub?: Subscription;

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    this.categories$ = this.chatService.categories$;
    this.isSessionActive$ = this.chatService.isPdfSessionActive$;
  }


    onCategoryChange(): void {
    if (!this.selectedCategoryId) return;
    
    this.isLoading = true;
    this.messages = []; 


    this.chatSub = this.chatService.getChatHistory(this.selectedCategoryId).subscribe({
      next: (sessions) => {
        if (sessions && sessions.length > 0) {
          // If history exists, populate the messages array
          this.messages = sessions[0].messages;
        } else {
          // If no history, provide a welcome message
          this.messages.push({
            sender: 'ai',
            text: `This is a new chat for ${this.selectedCategoryId}. Ask me anything about its content!`,
            timestamp: new Date()
          });
        }
        

        this.chatService.startNewPdfChat(this.selectedCategoryId).subscribe();
        
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        alert('Could not load chat history. Please try again.');
        console.error(err);
      }
    });
  }

  sendMessage(): void {
    if (!this.userInput.trim() || !this.selectedCategoryId) return;

    const userMsg: ChatMessage = { sender: 'user', text: this.userInput, timestamp: new Date() };
    this.messages.push(userMsg);
    this.isLoading = true;

    // Call the service with only the message
    this.chatSub = this.chatService.getPdfChatResponse(this.userInput).subscribe({
      next: (aiMsg) => {
        this.messages.push(aiMsg);
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Error getting AI response:", err);
        this.isLoading = false;
        this.messages.push({
          sender: 'ai',
          text: 'Sorry, I encountered an error trying to get a response. Please try again.',
          timestamp: new Date()
        });
      }
    });

    this.userInput = ''; 
  }

 viewSource(source: ChatSource | undefined): void {
    if (source) {
      Swal.fire({
        title: 'Source Document',
        icon: 'info',
        html: `
          <div style="text-align: left; padding: 0 1rem;">
            <p>The information was found in the following document:</p>
            <hr>
            <p><strong>File:</strong> ${source.pdfName}</p>
          </div>
        `,
        confirmButtonText: 'Got it!',
        confirmButtonColor: '#4CAF50' 
      });
    } else {
      Swal.fire({
        title: 'No Source Available',
        text: 'Source information could not be retrieved for this message.',
        icon: 'warning',
        confirmButtonText: 'Close'
      });
    }
  }


  public clearSession(): void {
    this.messages = [];
    this.selectedCategoryId = '';
    this.chatService.clearPdfSession();
  }


  ngOnDestroy(): void {
    if (this.chatSub) {
      this.chatSub.unsubscribe();
    }
  }
}
