import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { Category } from '../../core/models/category.model';
import { FormsModule } from '@angular/forms';
 
// FIX 1: Corrected all import paths and component names
import { ChatService } from '../../core/services/chat';
import { Modal} from '../shared/modal/modal';
import { ChatHistory } from '../chat-history/chat-history';
 
@Component({
  selector: 'app-file-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal, ChatHistory],
  // FIX 2: Updated file paths to standard Angular convention
  templateUrl: './file-manager.html',
  styleUrls: ['./file-manager.scss']
})
// FIX 3: Renamed class to follow Angular style guide
export class FileManager implements OnInit {
  categories$!: Observable<Category[]>;
  newCategoryName: string = '';
 
  isHistoryModalVisible = false;
  selectedCategoryIdForHistory: string | null = null;
 
  constructor(private chatService: ChatService) {}
 
  ngOnInit(): void {
    this.categories$ = this.chatService.categories$;
  }
 
 
  onFileSelected(event: Event, categoryId: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.chatService.uploadPdf(categoryId, file);
    }
  }
 
 
  openHistoryModal(categoryId: string): void {
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
 
 
   deletePdf(event: MouseEvent, categoryId: string, pdfId: string): void  {
    event.stopPropagation();
    this.chatService.deletePdf(categoryId, pdfId);
  }
 
 
  deleteFolder(categoryId: string): void {
    if (confirm('Are you sure you want to delete this folder and all of its contents? This action cannot be undone.')) {
      this.chatService.deleteCategory(categoryId);
    }
  }
}
 