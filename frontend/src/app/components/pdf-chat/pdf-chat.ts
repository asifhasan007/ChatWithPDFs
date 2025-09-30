import { Component, OnInit, OnDestroy, AfterViewChecked, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { Category } from '../../core/models/category.model';
import { ChatMessage, ChatSource } from '../../core/models/chat.model';
import { ChatService } from '../../core/services/chat';
import { PdfViewerComponent } from '../shared/pdf-viewer/pdf-viewer';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-pdf-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, PdfViewerComponent],
  templateUrl: './pdf-chat.html',
  styleUrls: ['./pdf-chat.scss']
})
export class PdfChat implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('chatMessagesContainer') private chatMessagesContainer!: ElementRef;
  @ViewChild('chatInput') private chatInput!: ElementRef; // ADD THIS LINE

  categories$!: Observable<Category[]>;
  selectedCategoryId: string = '';
  isLoading = false;
  isSessionActive$!: Observable<boolean>;
  messages: ChatMessage[] = [];
  userInput: string = '';
  showScrollToBottom: boolean = false;
  showPdfViewer: boolean = false;
  selectedSource: ChatSource | null = null;
  private chatSub?: Subscription;

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    this.categories$ = this.chatService.categories$;
    this.isSessionActive$ = this.chatService.isPdfSessionActive$;
  }
  
  loadChatForCategory(_categoryId: string): void {
    this.onCategoryChange();
  }

  ngAfterViewChecked(): void {
    if (!this.showScrollToBottom) {
      this.scrollToBottom();
    }
  }

  onCategoryChange(): void {
    if (!this.selectedCategoryId) return;

    this.isLoading = true;
    this.messages = [];

    this.chatSub = this.chatService.getChatHistory(this.selectedCategoryId).subscribe({
      next: (sessions) => {
        if (sessions && sessions.length > 0) {
          this.messages = sessions[0].messages;
        } else {
          this.messages.push({
            sender: 'ai',
            text: `This is a new chat for ${this.selectedCategoryId}. Ask me anything about its content!`,
            timestamp: new Date()
          });
        }
        this.chatService.startNewPdfChat(this.selectedCategoryId).subscribe();
        this.isLoading = false;
        this.scrollToBottom();
        // Focus the input field when category is selected
        this.focusInput();
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
    
    // Store the message to send, then clear the input for a faster UI response
    const messageToSend = this.userInput;
    this.userInput = '';

    // Keep focus on the input field immediately after clearing
    this.focusInput();

    this.chatSub = this.chatService.getPdfChatResponse(messageToSend).subscribe({
      next: (aiMsg) => {
        this.messages.push(aiMsg);
        this.isLoading = false;
        // Maintain focus after AI response
        this.focusInput();
      },
      error: (err) => {
        console.error("Error getting AI response:", err);
        this.isLoading = false;
        this.messages.push({
          sender: 'ai',
          text: 'Sorry, I encountered an error trying to get a response. Please try again.',
          timestamp: new Date()
        });
        // Maintain focus after error
        this.focusInput();
      }
    });
  }

  private focusInput(): void {
    // Use a timeout to make sure the focus happens after the current event loop
    setTimeout(() => {
      if (this.chatInput && this.chatInput.nativeElement) {
        this.chatInput.nativeElement.focus();
      }
    }, 50); // Slightly longer delay to ensure DOM updates are complete
  }

  onContainerClick(event: Event): void {
    // Check if the click is outside the input area
    const target = event.target as HTMLElement;
    const inputWrapper = target.closest('.chat-input-wrapper');
    
    if (!inputWrapper && this.chatInput && this.chatInput.nativeElement) {
      // Click is outside input area, remove focus
      this.chatInput.nativeElement.blur();
    }
  }

  onInputAreaClick(event: Event): void {
    // Prevent event bubbling to container
    event.stopPropagation();
    // Focus the input when clicking anywhere in the input area
    this.focusInput();
  }

  onInputClick(event: Event): void {
    // Prevent event bubbling
    event.stopPropagation();
  }

  scrollToBottom(): void {
    try {
      this.chatMessagesContainer.nativeElement.scrollTop = this.chatMessagesContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  onChatScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const atBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 1;
    this.showScrollToBottom = !atBottom;
  }
  
  viewSource(source: ChatSource | undefined): void {
    if (source) {
      this.selectedSource = source;
      this.showPdfViewer = true;
    } else {
      Swal.fire({
        title: 'No Source Available',
        text: 'Source information could not be retrieved for this message.',
        icon: 'warning',
        confirmButtonText: 'Close'
      });
    }
  }
  
  closePdfViewer(): void {
    this.showPdfViewer = false;
    this.selectedSource = null;
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
