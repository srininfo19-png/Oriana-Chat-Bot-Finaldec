import { GoogleGenAI } from "@google/genai";
import { UploadedDocument } from "../types";

// Helper to safely get the API key from various environment configurations
const getApiKey = () => {
  // 1. Check standard process.env (Build tools / Node)
  try {
    if (typeof process !== 'undefined' && process.env?.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // Ignore access errors
  }
  
  // 2. Check window.process (Browser Shim for Vercel/Static)
  try {
    // @ts-ignore
    if (typeof window !== 'undefined' && window.process?.env?.API_KEY) {
      // @ts-ignore
      return window.process.env.API_KEY;
    }
  } catch (e) {
    // Ignore access errors
  }

  return '';
};

const API_KEY = getApiKey();

const ai = new GoogleGenAI({ apiKey: API_KEY });

const SYSTEM_INSTRUCTION = `
You are the Oriana Bot, an intelligent assistant for the Oriana jewelry brand.
Your primary role is to answer customer queries based ONLY on the provided Knowledge Base context.

STRICT GUIDELINES:
1.  **Scope:** Answer ONLY questions related to the provided context/documents.
2.  **Out of Scope:** If a user asks a question not found in the documents (e.g., "Who is the president?", "Write code", "Math problems"), strictly reply: "Sorry, I am not trained on this topic." or "Sorry, I can only answer questions about Oriana documents."
3.  **Format:** Always use bullet points. Keep answers VERY SHORT and concise.
4.  **Language:** Detect the user's language and reply in the same language (English, Tamil, Telugu, or Kannada).
5.  **Tone:** Professional, polite, and welcoming.
`;

export const generateRAGResponse = async (
  query: string, 
  documents: UploadedDocument[]
): Promise<string> => {
  
  if (!API_KEY) {
    return "Error: API Key is missing. Please ensure the application is deployed correctly with the API Key configured.";
  }

  // 1. Context Aggregation (Simulating Vector Retrieval for accuracy in this demo)
  // Since Gemini 1.5/2.5 Flash has a massive context window (1M tokens), 
  // passing full document text is often MORE accurate than chunking/vector search for small-medium datasets.
  const context = documents.map(doc => `--- DOCUMENT: ${doc.name} ---\n${doc.content}\n`).join("\n");

  if (!context) {
    return "I currently have no documents loaded. Please ask the Admin to upload the Knowledge Base.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: `CONTEXT START\n${context}\nCONTEXT END` },
            { text: `USER QUESTION: ${query}` }
          ]
        }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.3, // Low temperature for factual accuracy
      }
    });

    return response.text || "I apologize, I couldn't generate a response.";

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I am facing technical difficulties connecting to the AI service.";
  }
};