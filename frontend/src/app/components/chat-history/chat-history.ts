import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { ChatMessage, ChatSession } from '../../core/models/chat.model';
// FIX 1: Corrected the import path to the full file name
import { ChatService } from '../../core/services/chat';
 
@Component({
  selector: 'app-chat-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-history.html',
  styleUrls: ['./chat-history.scss']
})
// FIX 2: Added a space between the class name and 'implements'
export class ChatHistory implements OnInit {
 
  @Input() categoryId!: string;
  sessions$!: Observable<ChatSession[]>;
  selectedSession: ChatSession | null = null;
 
  constructor(private chatService: ChatService) {}
 
  ngOnInit(): void {
    // This will be uncommented once the backend endpoint is ready
    // if (this.categoryId) {
    //   this.sessions$ = this.chatService.getChatHistory(this.categoryId);
    // }
    console.log('ChatHistoryComponent initialized. "getChatHistory" is pending backend endpoint.');
  }
 
  viewSessionDetails(session: ChatSession): void {
    this.selectedSession = session;
  }
 
  backToList(): void {
    this.selectedSession = null;
  }
 
  deleteSession(sessionId: string): void {
    // This will be uncommented once the backend endpoint is ready
    // if (confirm('Are you sure you want to delete this chat session?')) {
    //   this.chatService.deleteChatSession(sessionId).subscribe({
    //     next: () => {
    //       console.log('Session deleted successfully. Refreshing list...');
    //       this.sessions$ = this.chatService.getChatHistory(this.categoryId);
         
    //       if (this.selectedSession?.id === sessionId) {
  }
}
 
 