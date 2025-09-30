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

  onSwitchToAiChat(): void {
    // Emit 'true' to signal that we should switch to AI chat
    this.chatModeChange.emit(true);
  }
}
