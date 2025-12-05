import { UploadedDocument } from '../types';

export const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
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

    // For a real production RAG, we would send PDF/PPT to a backend for OCR/Extraction.
    // For this client-side demo, we read text directly. 
    // Note: PDF parsing in browser requires heavy libraries like pdf.js which are tricky in this format.
    // We assume the admin uploads text-based content or converts it for this specific demo environment.
    reader.readAsText(file);
  });
};

export const processDocument = async (file: File): Promise<UploadedDocument> => {
  try {
    const textContent = await readFileContent(file);
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.type,
      content: textContent,
      uploadDate: new Date(),
    };
  } catch (error) {
    console.error("Error processing file", error);
    throw error;
  }
};