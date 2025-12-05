import { GoogleGenAI } from "@google/genai";
import { UploadedDocument } from "../types";

const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env?.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) { /* ignore */ }
  
  try {
    // @ts-ignore
    if (typeof window !== 'undefined' && window.process?.env?.API_KEY) {
      // @ts-ignore
      return window.process.env.API_KEY;
    }
  } catch (e) { /* ignore */ }

  return '';
};

const API_KEY = getApiKey();
const ai = new GoogleGenAI({ apiKey: API_KEY });

const SYSTEM_INSTRUCTION = `
You are the Oriana Bot, an intelligent assistant for the Oriana jewelry brand.
Your primary role is to answer customer queries based ONLY on the provided Context.

STRICT GUIDELINES:
1.  **Scope:** Answer ONLY questions related to the provided context snippets.
2.  **Out of Scope:** If the answer is not in the context, reply: "Sorry, I am not trained on this topic."
3.  **Format:** Always use bullet points. Keep answers VERY SHORT and concise.
4.  **Language:** Detect the user's language and reply in the same language.
5.  **Tone:** Professional and polite.
`;

// --- SIMULATED VECTOR SEARCH (KEYWORD SCORING) ---
// Since we don't have a Vector DB server, we use weighted keyword matching.
// This finds the chunks most relevant to the user's question.

interface ScoredChunk {
  text: string;
  score: number;
  source: string;
}

const findBestChunks = (query: string, documents: UploadedDocument[]): string => {
  // 1. Tokenize query (remove stop words, lowercase)
  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'how', 'what']);
  const queryTerms = query.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  const allChunks: ScoredChunk[] = [];

  // 2. Score every chunk in every document
  documents.forEach(doc => {
    // Fallback: if existing doc doesn't have chunks yet, treat content as one chunk
    const chunksToProcess = (doc.chunks && doc.chunks.length > 0) ? doc.chunks : [doc.content];

    chunksToProcess.forEach(chunk => {
      const chunkLower = chunk.toLowerCase();
      let score = 0;

      queryTerms.forEach(term => {
        // Exact match points
        if (chunkLower.includes(term)) score += 1;
        // Frequency boost (rudimentary TF)
        const count = chunkLower.split(term).length - 1;
        score += count * 0.5;
      });

      if (score > 0) {
        allChunks.push({ text: chunk, score, source: doc.name });
      }
    });
  });

  // 3. Sort by score and take top K (Top 5-8 chunks)
  // This drastically reduces token usage from 300 pages -> ~2 pages
  const topChunks = allChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, 8); // Max 8 chunks (~3000 tokens)

  if (topChunks.length === 0) return "";

  return topChunks.map(c => `[Source: ${c.source}]\n${c.text}`).join("\n\n---\n\n");
};

export const generateRAGResponse = async (
  query: string, 
  documents: UploadedDocument[]
): Promise<string> => {
  
  if (!API_KEY) {
    return "Error: API Key is missing.";
  }

  if (documents.length === 0) {
    return "I currently have no documents loaded. Please ask the Admin to upload the Knowledge Base.";
  }

  // 1. Retrieve ONLY relevant chunks (The "Chunking" Facility)
  const relevantContext = findBestChunks(query, documents);

  if (!relevantContext) {
    // If no keywords match, the query is likely irrelevant to the docs
    return "Sorry, I couldn't find any information about that in my documents.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: `CONTEXT START\n${relevantContext}\nCONTEXT END` },
            { text: `USER QUESTION: ${query}` }
          ]
        }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.3,
      }
    });

    return response.text || "I apologize, I couldn't generate a response.";

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I am facing technical difficulties.";
  }
};