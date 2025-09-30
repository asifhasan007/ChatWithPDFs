import { Component, OnDestroy, AfterViewChecked, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatMessage } from '../../core/models/chat.model';
import { ChatService } from '../../core/services/chat';


@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chat.html',
  styleUrls: ['./ai-chat.scss']
})
export class AiChat implements OnDestroy, AfterViewChecked {

  @ViewChild('chatMessagesContainer') private chatMessagesContainer!: ElementRef;
  @ViewChild('chatInput') private chatInput!: ElementRef;

  messages: ChatMessage[] = [];
  userMessage: string = '';
  isLoading: boolean = false;
  showScrollToBottom: boolean = false;
  private chatSub!: Subscription;

  constructor(private chatService: ChatService) {
    this.messages.push({
      sender: 'ai',
      text: 'I am your general AI assistant. How can I help you today?',
      timestamp: new Date()
    });
    // Focus input after component initializes
    setTimeout(() => this.focusInput(), 100);
  }

  ngAfterViewChecked(): void {
    // Only auto-scroll if the user hasn't manually scrolled up.
    if (!this.showScrollToBottom) {
      this.scrollToBottom();
    }
  }

  sendMessage(): void {
    if (!this.userMessage.trim()) return;

    this.messages.push({ sender: 'user', text: this.userMessage, timestamp: new Date() });
    this.isLoading = true;

    // By setting this to false, we ensure the view will auto-scroll when the AI replies.
    this.showScrollToBottom = false;

    // Store the message to send, then clear the input for a faster UI response
    const messageToSend = this.userMessage;
    this.userMessage = '';

    // Keep focus on the input field immediately after clearing
    this.focusInput();

    this.chatSub = this.chatService.getAiSolutionResponse(messageToSend).subscribe({
      next: (response) => {
        this.messages.push({ sender: 'ai', text: response, timestamp: new Date() });
        this.isLoading = false;
        // Maintain focus after AI response
        this.focusInput();
      },
      error: (err) => {
        console.error('Failed to get AI response:', err);
        this.messages.push({ sender: 'ai', text: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() });
        this.isLoading = false;
        // Maintain focus after error
        this.focusInput();
      }
    });
  }

  scrollToBottom(): void {
    try {
      this.chatMessagesContainer.nativeElement.scrollTop = this.chatMessagesContainer.nativeElement.scrollHeight;
      // **MODIFICATION**: Explicitly hide the button when we scroll to the bottom.
      this.showScrollToBottom = false;
    } catch(err) {
      // Handle cases where the element might not be available yet
    }
  }

  onChatScroll(event: Event): void {
    const element = event.target as HTMLElement;
    // Show the button if the user has scrolled up from the bottom.
    // The +1 provides a small tolerance.
    const atBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 1; 
    this.showScrollToBottom = !atBottom;
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
    const inputWrapper = target.closest('.chat-input-container');
    
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

  ngOnDestroy(): void {
    if (this.chatSub) {
      this.chatSub.unsubscribe();
    }
  }
}
