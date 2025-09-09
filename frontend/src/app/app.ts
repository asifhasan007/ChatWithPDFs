import { Component, ViewChild  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Header} from './components/header/header';
import { PdfChat } from './components/pdf-chat/pdf-chat';
import { AiChat } from './components/ai-chat/ai-chat';
import { FileManager } from './components/file-manager/file-manager';
import { ChatService } from './core/services/chat'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, Header, PdfChat, AiChat, FileManager],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  @ViewChild(PdfChat) pdfChatComponent!: PdfChat;

  title = 'SmartPDF-Chat';
  isAiChatActive = false;

  constructor(private chatService: ChatService) {} // Inject ChatService

  switchToAiChat(isActive: boolean): void {
    if (isActive) {
      // --- THIS IS THE NEW LOGIC ---
      // Before switching to the AI chat, save the current session
      const messagesToSave = this.pdfChatComponent.messages;
      const categoryIdToSave = this.pdfChatComponent.selectedCategoryId;
      
      this.chatService.saveChatSession(categoryIdToSave, messagesToSave);

      // Optional: Clear the messages in the PDF chat component for the next session
      this.pdfChatComponent.clearSession();
    }
    
    this.isAiChatActive = isActive;
  }
}
