import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { Category } from '../../core/models/category.model';
import { ChatService } from '../../core/services/chat';
import { FormsModule } from '@angular/forms';
import { Modal } from '../shared/modal/modal';
import { ChatHistory } from '../chat-history/chat-history';

@Component({
  selector: 'app-file-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal, ChatHistory],
  templateUrl: './file-manager.html',
  styleUrls: ['./file-manager.scss']
})
export class FileManager implements OnInit {
  categories$!: Observable<Category[]>;
  newCategoryName: string = '';

  isHistoryModalVisible = false;
  selectedCategoryIdForHistory: string | null = null;

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    this.categories$ = this.chatService.categories$;
  }

   // --- NEW METHOD for File Upload ---
  onFileSelected(event: Event, categoryId: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.chatService.uploadPdf(categoryId, file);
    }
  }

  // --- NEW METHODS for Modal ---
  openHistoryModal(categoryId: string): void {
    console.log('Opening history modal for category:', categoryId);
    this.selectedCategoryIdForHistory = categoryId;
    this.isHistoryModalVisible = true;
  }

  closeHistoryModal(): void {
    this.isHistoryModalVisible = false;
    this.selectedCategoryIdForHistory = null;
  }

  createFolder(): void {
    if (this.newCategoryName.trim()) {
      this.chatService.addCategory(this.newCategoryName.trim());
      this.newCategoryName = ''; // Reset input field
    }
  }

  uploadPdf(categoryId: string): void {
    // This would open a file dialog and call a service method to handle the upload
    console.log(`Upload PDF to category: ${categoryId}`);
    alert('Upload functionality is not yet implemented.');
  }

  deletePdf(categoryId: string, pdfId: string): void {
    console.log(`Delete PDF: ${pdfId} from category: ${categoryId}`);
    alert('Delete functionality is not yet implemented.');
  }

  viewPreviousChats(categoryId: string): void {
    console.log(`Viewing previous chats for category: ${categoryId}`);
    alert('Previous chats functionality is not yet implemented.');
  }

  deleteFolder(categoryId: string): void {
    const confirmation = confirm('Are you sure you want to delete this folder and all of its contents? This action cannot be undone.');
    
    if (confirmation) {
      this.chatService.deleteCategory(categoryId);
    }
  }
}
