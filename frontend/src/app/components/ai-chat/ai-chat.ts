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

  @ViewChild('chatMessages') private chatMessagesContainer!: ElementRef;

  messages: ChatMessage[] = [];
  userMessage: string = '';
  isLoading: boolean = false; // To track the loading state of the AI's reply
  showScrollToBottom: boolean = false; // To control the visibility of the scroll button
  private chatSub!: Subscription;

  constructor(private chatService: ChatService) {
    // Add an initial greeting message from the AI
    this.messages.push({
      sender: 'ai',
      text: 'I am your general AI assistant. How can I help you today?',
      timestamp: new Date()
    });
  }

  ngAfterViewChecked(): void {
    // Automatically scroll down after the view is updated with new messages
    if (!this.showScrollToBottom) {
      this.scrollToBottom();
    }
  }

  sendMessage(): void {
    if (!this.userMessage.trim()) return;

    // Add user's message and set loading state
    this.messages.push({ sender: 'user', text: this.userMessage, timestamp: new Date() });
    this.isLoading = true;

    // Call the service to get the AI's response
    this.chatSub = this.chatService.getAiSolutionResponse(this.userMessage).subscribe({
      next: (response) => {
        this.messages.push({ sender: 'ai', text: response, timestamp: new Date() });
        this.isLoading = false; // Turn off loading indicator on success
      },
      error: (err) => {
        console.error('Failed to get AI response:', err);
        this.messages.push({ sender: 'ai', text: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() });
        this.isLoading = false; // Turn off loading indicator on error
      }
    });

    // Clear the input field
    this.userMessage = '';
  }

  scrollToBottom(): void {
    try {
      this.chatMessagesContainer.nativeElement.scrollTop = this.chatMessagesContainer.nativeElement.scrollHeight;
    } catch(err) {
      // Handle cases where the element might not be available yet
    }
  }

  onChatScroll(event: Event): void {
    const element = event.target as HTMLElement;
    // Show the button if the user has scrolled up from the bottom
    const atBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 1; // Added a small tolerance
    this.showScrollToBottom = !atBottom;
  }

  ngOnDestroy(): void {
    // Unsubscribe to prevent memory leaks
    if (this.chatSub) {
      this.chatSub.unsubscribe();
    }
  }
}
