import { UploadedDocument } from '../types';

// Declare global PDF.js library type
declare const pdfjsLib: any;

const readPdfContent = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    // Load the PDF document
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    // Iterate through each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Join items with space. 
      // Note: We avoid adding [Page X] headers into the raw stream to prevent breaking sentences that cross pages.
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      
      // Join pages with a space to treat the whole doc as a continuous stream
      fullText += `${pageText} `; 
    }

    return fullText;
  } catch (error) {
    console.error("PDF Parsing Error:", error);
    throw new Error("Failed to extract text from PDF.");
  }
};

export const readFileContent = (file: File): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    
    // PDF Handling
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      if (typeof pdfjsLib === 'undefined') {
        reject(new Error("PDF support not loaded. Please refresh the page."));
        return;
      }
      try {
        const text = await readPdfContent(file);
        resolve(text);
        return;
      } catch (e) {
        reject(e);
        return;
      }
    }

    // Text/JSON/Markdown Handling
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

// --- CHUNKING LOGIC ---
const CHUNK_SIZE = 1500; // Characters per chunk (approx 300-400 tokens)
const OVERLAP = 200; // Context overlap to prevent cutting sentences in half

const createChunks = (text: string): string[] => {
  const chunks: string[] = [];
  
  // 1. Clean up text (remove excessive newlines)
  const cleanText = text.replace(/\n\n+/g, '\n').replace(/\s+/g, ' ');

  if (cleanText.length <= CHUNK_SIZE) {
    return [cleanText];
  }

  // 2. Sliding Window Chunking
  let start = 0;
  while (start < cleanText.length) {
    let end = start + CHUNK_SIZE;
    
    // Attempt to break at a period or space to avoid cutting words
    if (end < cleanText.length) {
      const lastPeriod = cleanText.lastIndexOf('.', end);
      const lastSpace = cleanText.lastIndexOf(' ', end);
      
      if (lastPeriod > start + CHUNK_SIZE * 0.5) {
        end = lastPeriod + 1;
      } else if (lastSpace > start + CHUNK_SIZE * 0.5) {
        end = lastSpace;
      }
    }

    const chunk = cleanText.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start = end - OVERLAP; // Move window forward, but back up a bit for overlap
  }

  return chunks;
};

export const processDocument = async (file: File): Promise<UploadedDocument> => {
  try {
    const textContent = await readFileContent(file);
    
    // Perform Chunking
    const chunks = createChunks(textContent);

    return {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.type,
      content: textContent, // Keep full text for reference
      chunks: chunks, // Optimized chunks for RAG
      uploadDate: new Date(),
    };
  } catch (error) {
    console.error("Error processing file", error);
    throw error;
  }
};