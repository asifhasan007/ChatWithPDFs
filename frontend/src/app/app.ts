import { Component, ViewChild  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Header} from './components/header/header';
import { PdfChat } from './components/pdf-chat/pdf-chat';
import { AiChat } from './components/ai-chat/ai-chat';
import { FileManager } from './components/file-manager/file-manager';

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

  constructor() {} // Inject ChatService
  
  onCategorySelected(categoryId: string): void {
    // Switch to PDF chat mode
    this.isAiChatActive = false;
    
    // Wait for the PDF chat component to be rendered, then load the category
    setTimeout(() => {
      if (this.pdfChatComponent) {
        this.pdfChatComponent.loadChatForCategory(categoryId);
      }
    }, 100);
  }

  switchToAiChat(shouldActivateAiChat: boolean): void {
    // If switching to AI chat and currently in PDF chat, clear PDF session
    if (shouldActivateAiChat && !this.isAiChatActive) {
      this.pdfChatComponent.clearSession();
    }
    
    this.isAiChatActive = shouldActivateAiChat;
  }
}