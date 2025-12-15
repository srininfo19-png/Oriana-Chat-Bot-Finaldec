import { GoogleGenAI } from "@google/genai";
import { UploadedDocument, Message } from "../types";

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
You are the Oriana Assistant, a premium virtual concierge for the Oriana jewelry brand.

STRICT BRAND GUIDELINES:
1.  **Scope:** Answer based ONLY on the [NEW CONTEXT] or [CONVERSATION HISTORY].
2.  **No Hallucinations:** If the answer is not found in the documents, politelty reply: "I apologize, but I do not have that information in my current records. Could you please check our official catalog or contact support?"
3.  **Tone:** Sophisticated, polite, and helpful (e.g., "Certainly," "I would be delighted to assist," "Please allow me to explain").
4.  **Format:** Use concise bullet points for lists. Keep responses brief and elegant.
5.  **Language:** Detect the user's language and reply in the same language.
`;

// --- SIMULATED VECTOR SEARCH (KEYWORD SCORING) ---
interface ScoredChunk {
  text: string;
  score: number;
  source: string;
}

const findBestChunks = (query: string, documents: UploadedDocument[]): string => {
  // 1. Tokenize query (remove stop words, lowercase)
  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'how', 'what', 'give', 'me', 'in', 'to']);
  const queryTerms = query.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1 && !stopWords.has(w));

  if (queryTerms.length === 0) return ""; // Query is too generic or short for keyword search

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
        // Frequency boost
        const count = chunkLower.split(term).length - 1;
        score += count * 0.5;
      });

      if (score > 0) {
        allChunks.push({ text: chunk, score, source: doc.name });
      }
    });
  });

  // 3. Sort by score and take top K (Top 5-8 chunks)
  const topChunks = allChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, 8); 

  if (topChunks.length === 0) return "";

  return topChunks.map(c => `[Source: ${c.source}]\n${c.text}`).join("\n\n---\n\n");
};

export const generateRAGResponse = async (
  query: string, 
  documents: UploadedDocument[],
  history: Message[] = [] 
): Promise<string> => {
  
  if (!API_KEY) {
    return "Error: API Key is missing. Please check your configuration.";
  }

  // 1. Retrieve ONLY relevant chunks (The "Chunking" Facility)
  const relevantContext = findBestChunks(query, documents);

  // 2. Check conditions
  const hasContext = relevantContext.length > 0;
  // Use last 10 messages for context window
  const hasHistory = history.length > 0;

  // STRICT GUARDRAIL: If no new context AND no history, we can't answer.
  if (!hasContext && !hasHistory && documents.length > 0) {
    return "I apologize, but I do not have information regarding that specific topic in my knowledge base. Please ask about the uploaded documents.";
  }
  
  if (documents.length === 0 && !hasHistory) {
      return "I currently have no documents loaded. Please ask the Admin to upload the Knowledge Base.";
  }

  try {
    // 3. Construct Prompt with Conversation History
    
    // IMPORTANT: Gemini API generateContent `contents` must start with a 'user' turn if history is provided.
    // We must filter out any leading 'model' messages (like the initial greeting).
    let previousTurns = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));

    // Remove leading 'model' messages
    while (previousTurns.length > 0 && previousTurns[0].role === 'model') {
        previousTurns.shift();
    }

    // Slice to keep context window manageable (last 10 turns max)
    if (previousTurns.length > 10) {
        previousTurns = previousTurns.slice(previousTurns.length - 10);
        // Ensure we didn't slice in a way that makes it start with 'model' again
        while (previousTurns.length > 0 && previousTurns[0].role === 'model') {
            previousTurns.shift();
        }
    }

    let finalPrompt = "";

    if (hasContext) {
        // Inject new knowledge
        finalPrompt = `[NEW CONTEXT START]\n${relevantContext}\n[NEW CONTEXT END]\n\nUSER QUESTION: ${query}`;
    } else {
        // Follow-up mode
        finalPrompt = `[NO NEW DOCUMENTS FOUND - ANSWER BASED ON CONVERSATION HISTORY]\nUSER QUESTION: ${query}`;
    }

    const contents = [
        ...previousTurns,
        {
          role: 'user',
          parts: [{ text: finalPrompt }]
        }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.3, 
      }
    });

    return response.text || "I apologize, I couldn't generate a response.";

  } catch (error: any) {
    console.error("Gemini API Error Full Details:", error);
    // Provide more specific error message if possible
    if (error.message?.includes('400')) {
        return "I apologize, but I am unable to process this request (400 Invalid Request).";
    }
    if (error.message?.includes('403') || error.message?.includes('API key')) {
        return "Configuration Error: The API Key provided is invalid or expired.";
    }
    return "I apologize, I am facing technical difficulties at the moment.";
  }
};