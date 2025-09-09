import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { ChatMessage, ChatSession } from '../../core/models/chat.model';
import { ChatService } from '../../core/services/chat';

@Component({
  selector: 'app-chat-history',
  imports: [CommonModule],
  templateUrl: './chat-history.html',
  styleUrl: './chat-history.scss'
})
export class ChatHistory {

  @Input() categoryId!: string;
  sessions$!: Observable<ChatSession[]>;
  selectedSession: ChatSession | null = null;

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    console.log('ChatHistoryComponent initialized with categoryId:', this.categoryId);
   if (this.categoryId) {
      this.sessions$ = this.chatService.getChatHistory(this.categoryId);
    }
  }

    viewSessionDetails(session: ChatSession): void {
    this.selectedSession = session;
  }

  // Called to return from the detail view to the list view
  backToList(): void {
    this.selectedSession = null;
  }

  deleteSession(sessionId: string): void {
    if (confirm('Are you sure you want to delete this chat session?')) {
      this.chatService.deleteChatSession(this.categoryId, sessionId);
      // If the deleted session was the one being viewed, go back to the list
      if (this.selectedSession?.id === sessionId) {
        this.backToList();
      }
  }
}
}