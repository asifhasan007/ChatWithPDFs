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
  messages: ChatMessage[] = [];
  userMessage: string = '';
  selectedCategoryId: string = '';
  private chatSub!: Subscription;

    clearSession(): void {
    this.messages = [];
  }

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    this.categories$ = this.chatService.categories$;
  }

  sendMessage(): void {
    if (!this.userMessage.trim() || !this.selectedCategoryId) return;

    // Add user message to chat
    this.messages.push({ sender: 'user', text: this.userMessage, timestamp: new Date() });

    // Get AI response
    this.chatSub = this.chatService.getPdfChatResponse(this.userMessage, this.selectedCategoryId)
      .subscribe(response => {
         this.messages.push(response) 
      });

    this.userMessage = ''; // Reset input
  }

    viewSource(source: ChatSource): void {
    // In a real application, this would trigger opening a PDF viewer.
    alert(`Source: "${source.pdfName}" on page ${source.pageNumber}.`);
    console.log('Navigating to source:', source);
  }
  
  ngOnDestroy(): void {
    if (this.chatSub) {
      this.chatSub.unsubscribe();
    }
  }
}
