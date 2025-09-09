import { Component, OnDestroy } from '@angular/core';
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
export class AiChat implements OnDestroy {
  messages: ChatMessage[] = [];
  userMessage: string = '';
  private chatSub!: Subscription;

  constructor(private chatService: ChatService) {
    // Add an initial greeting message from the AI
    this.messages.push({
      sender: 'ai',
      text: 'I am your general AI assistant. How can I help you today?',
      timestamp: new Date()
    });
  }

  sendMessage(): void {
    if (!this.userMessage.trim()) return;

    // Add user's message to the chat interface
    this.messages.push({ sender: 'user', text: this.userMessage, timestamp: new Date() });

    // Call the service to get the AI's response
    this.chatSub = this.chatService.getAiSolutionResponse(this.userMessage).subscribe(response => {
      this.messages.push({ sender: 'ai', text: response, timestamp: new Date() });
    });

    // Clear the input field
    this.userMessage = '';
  }

  ngOnDestroy(): void {
    // Unsubscribe to prevent memory leaks
    if (this.chatSub) {
      this.chatSub.unsubscribe();
    }
  }
}
