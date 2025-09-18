import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { Category } from '../../core/models/category.model';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../core/services/chat';
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
  // FIX 3: Re-add the EventEmitter to communicate with the parent component
  @Output() categorySelected = new EventEmitter<string>();

  categories$!: Observable<Category[]>;
  newCategoryName: string = '';
  isHistoryModalVisible = false;
  selectedCategoryIdForHistory: string | null = null;
  
  // FIX 4: Add property to track the active category for styling
  activeCategoryId: string | null = null;

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    this.categories$ = this.chatService.categories$;
  }

  // FIX 5: This method makes a category active for chatting
  selectCategory(categoryId: string): void {
    this.activeCategoryId = categoryId;
    this.categorySelected.emit(categoryId); // Notify the parent app
  }

  onFileSelected(event: Event, categoryId: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.chatService.uploadPdf(categoryId, file);
    }
  }

  // FIX 6: Add event parameter and call stopPropagation()
  openHistoryModal(event: MouseEvent, categoryId: string): void {
    event.stopPropagation();
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
      this.newCategoryName = '';
    }
  }

  // FIX 6: Add event parameter and call stopPropagation()
  deletePdf(event: MouseEvent, categoryId: string, pdfId: string): void  {
    event.stopPropagation();
    this.chatService.deletePdf(categoryId, pdfId);
  }

  // FIX 6: Add event parameter and call stopPropagation()
  deleteFolder(event: MouseEvent, categoryId: string): void {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this folder?')) {
      this.chatService.deleteCategory(categoryId);
      if (this.activeCategoryId === categoryId) {
        this.activeCategoryId = null;
      }
    }
  }
}
