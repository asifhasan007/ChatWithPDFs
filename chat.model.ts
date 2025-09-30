// Defines the structure for a PDF source
export interface ChatSource {
  pdfId: string;
  pdfName: string;
  pageNumber: number;
  sourceText?: string; // The actual text content that was matched
}

// Defines the structure for a single chat message
export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  source?: ChatSource; // Make the source optional, as user messages won't have it
}


export interface ChatSession {
  id: string;
  startTime: Date;
  messages: ChatMessage[];
}