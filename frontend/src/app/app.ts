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
    if (this.pdfChatComponent) {
      // Switch to PDF chat if not already active
      this.isAiChatActive = false;
      // Call the method on the child component to load its history
      this.pdfChatComponent.loadChatForCategory(categoryId);
    }
  }

  switchToAiChat(isActive: boolean): void {
    if (isActive) {
     
      this.pdfChatComponent.clearSession();
    }
    
    this.isAiChatActive = isActive;
  }
}