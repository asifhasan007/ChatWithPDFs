import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule

@Component({
  selector: 'app-header',
  standalone: true, // Add standalone property
  imports: [CommonModule], // Add CommonModule for *ngIf
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {
  @Input() isPdfChatActive: boolean = false;
  @Output() chatModeChange = new EventEmitter<boolean>();

  onToggleChatMode(): void {
    // Emit the desired isAiChatActive state
    // If currently in PDF chat (isPdfChatActive = true), switch to AI chat (emit true)
    // If currently in AI chat (isPdfChatActive = false), switch to PDF chat (emit false)
    const shouldActivateAiChat = this.isPdfChatActive;
    this.chatModeChange.emit(shouldActivateAiChat);
  }
}
