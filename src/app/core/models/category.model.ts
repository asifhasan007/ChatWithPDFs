// Defines the structure for a category/folder
export interface Category {
  id: string;
  name: string;
  pdfs: PDF[];
  isUploading?: boolean;
}

// Defines the structure for a PDF file
export interface PDF {
  id: string;
  name: string;
  uploadDate: Date;
}
