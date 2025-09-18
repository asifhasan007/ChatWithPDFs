import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { ChatSession } from '../../core/models/chat.model';
import { ChatService } from '../../core/services/chat';

@Component({
  selector: 'app-chat-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-history.html',
  styleUrls: ['./chat-history.scss']
})
export class ChatHistory implements OnInit {
  @Input() categoryId!: string;
  sessions$!: Observable<ChatSession[]>;
  selectedSession: ChatSession | null = null;

  constructor(private chatService: ChatService) {}
 
   ngOnInit(): void {
    // FIX 5: Uncommented the logic to fetch history on initialization.
    if (this.categoryId) {
      this.sessions$ = this.chatService.getChatHistory(this.categoryId);
    }
  }

  viewSessionDetails(session: ChatSession): void {
    this.selectedSession = session;
  }

  backToList(): void {
    this.selectedSession = null;
  }
 
   deleteHistory(categoryId: string): void {
    if (confirm('Are you sure you want to delete the entire chat history for this category? This cannot be undone.')) {
      this.chatService.deleteChatHistory(categoryId).subscribe({
        next: () => {
          console.log('History deleted successfully. Refreshing list...');
          // Refresh the list after deletion
          this.sessions$ = this.chatService.getChatHistory(this.categoryId);
          this.selectedSession = null; // Go back to the list view
        },
        error: (err) => {
          console.error('Failed to delete chat history.', err);
          alert('Failed to delete history. Please try again.');
        }
      });
    }
  }
}
 
 