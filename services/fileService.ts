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
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += `[Page ${i}]\n${pageText}\n\n`;
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

export const processDocument = async (file: File): Promise<UploadedDocument> => {
  try {
    const textContent = await readFileContent(file);
    
    // Simulate vector processing delay for UI feedback
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.type,
      content: textContent, // This is now the "Memory" for the RAG bot
      uploadDate: new Date(),
    };
  } catch (error) {
    console.error("Error processing file", error);
    throw error;
  }
};