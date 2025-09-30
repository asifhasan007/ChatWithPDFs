import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ChatSource } from '../../../core/models/chat.model';
import { ApiService } from '../../../core/services/api';

@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-viewer.html',
  styleUrls: ['./pdf-viewer.scss']
})
export class PdfViewerComponent implements OnInit {
  @Input() source: ChatSource | null = null;
  @Input() category: string = '';
  @Input() highlightText: string = '';
  @Output() close = new EventEmitter<void>();
  
  @ViewChild('pdfIframe', { static: false }) pdfIframe!: ElementRef<HTMLIFrameElement>;
  
  pdfUrl: SafeResourceUrl | null = null;
  isLoading: boolean = false;
  
  constructor(
    private apiService: ApiService,
    private sanitizer: DomSanitizer
  ) {}
  
  ngOnInit(): void {
    if (this.source && this.category) {
      this.loadPdf();
    }
  }
  
  loadPdf(): void {
    if (!this.source || !this.category) return;
    
    this.isLoading = true;
    
    try {
      // Get PDF URL from API service
      const rawPdfUrl = this.apiService.getPdfUrl(this.category, this.source.pdfName);
      
      // Add page parameter to jump to specific page
      const pdfUrlWithPage = `${rawPdfUrl}#page=${this.source.pageNumber}`;
      
      // Sanitize URL for iframe
      this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrlWithPage);
      
      this.isLoading = false;
    } catch (error) {
      console.error('Error loading PDF:', error);
      this.isLoading = false;
    }
  }
  
  onIframeLoad(): void {
    this.isLoading = false;
    
    // Try to scroll to highlighted text if available
    if (this.highlightText && this.pdfIframe?.nativeElement) {
      setTimeout(() => {
        this.searchInPdf();
      }, 1000);
    }
  }
  
  searchInPdf(): void {
    // This is a basic implementation - browser's built-in PDF viewer search
    // In a real application, you might want to use PDF.js for more control
    if (this.pdfIframe?.nativeElement?.contentWindow && this.highlightText) {
      try {
        // Try to trigger search in the PDF viewer
        const iframe = this.pdfIframe.nativeElement;
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        
        if (iframeDoc) {
          // This is limited but works with some PDF viewers
          const event = new KeyboardEvent('keydown', {
            key: 'f',
            ctrlKey: true
          });
          iframeDoc.dispatchEvent(event);
        }
      } catch (error) {
        console.log('Cannot access iframe content for search:', error);
      }
    }
  }
  
  onClose(): void {
    this.close.emit();
  }
}