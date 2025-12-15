import { GoogleGenAI } from "@google/genai";
import { UploadedDocument, Message } from "../types";

// --- CONFIGURATION ---
// limit for Full Context mode (approx 30k words). 
// If docs are smaller than this, we send EVERYTHING to Gemini for 100% accuracy.
const FULL_CONTEXT_THRESHOLD = 150000; 

// --- TF-IDF VECTOR SEARCH ENGINE (Fallback/Optimization) ---
// Kept for very large documents to avoid token limits, though Gemini Flash has a huge window.

type Vector = Record<string, number>;
const STOP_WORDS = new Set(["a", "the", "and", "of", "in", "to", "is", "for", "with"]);

const tokenize = (text: string): string[] => {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
};

const splitIntoSearchableChunks = (text: string): string[] => {
  return text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
};

const computeTF = (tokens: string[]): Vector => {
  const tf: Vector = {};
  tokens.forEach(t => tf[t] = (tf[t] || 0) + 1);
  return tf;
};

const computeIDF = (corpus: string[][]): Vector => {
  const idf: Vector = {};
  const N = corpus.length;
  const allTokens = new Set<string>();
  corpus.forEach(d => d.forEach(t => allTokens.add(t)));
  allTokens.forEach(t => {
    const docsWithTerm = corpus.filter(doc => doc.includes(t)).length;
    idf[t] = Math.log10(N / (1 + docsWithTerm));
  });
  return idf;
};

const cosineSimilarity = (vecA: Vector, vecB: Vector): number => {
  const keys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  let dot = 0, magA = 0, magB = 0;
  keys.forEach(k => {
    dot += (vecA[k] || 0) * (vecB[k] || 0);
  });
  Object.values(vecA).forEach(v => magA += v*v);
  Object.values(vecB).forEach(v => magB += v*v);
  return (magA && magB) ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
};

const getRelevantContext = (query: string, docs: UploadedDocument[]): string => {
  // 1. Check total size
  const totalLength = docs.reduce((acc, d) => acc + d.content.length, 0);

  // STRATEGY A: FULL CONTEXT (100% Accuracy)
  // If documents are small enough, send EVERYTHING. This prevents missing info.
  if (totalLength < FULL_CONTEXT_THRESHOLD) {
    return docs.map(d => `--- SOURCE: ${d.name} ---\n${d.content}`).join("\n\n");
  }

  // STRATEGY B: VECTOR SEARCH (Efficiency)
  // If documents are huge, find top chunks.
  const allChunks: string[] = [];
  docs.forEach(doc => {
    // Split efficiently
    const chunks = splitIntoSearchableChunks(doc.content);
    allChunks.push(...chunks);
  });

  const corpusTokens = allChunks.map(tokenize);
  const idf = computeIDF(corpusTokens);
  const queryVec = computeTF(tokenize(query));
  
  // Weight query vector by IDF
  Object.keys(queryVec).forEach(k => queryVec[k] = queryVec[k] * (idf[k] || 0));

  const results = allChunks.map((chunk, i) => {
    const docTokens = corpusTokens[i];
    const docTF = computeTF(docTokens);
    const docVec: Vector = {};
    Object.keys(docTF).forEach(k => docVec[k] = docTF[k] * (idf[k] || 0));
    return { text: chunk, score: cosineSimilarity(queryVec, docVec) };
  });

  // Return top 10 chunks for broad context
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(r => r.text)
    .join("\n\n");
};

export const generateRAGResponse = async (
  query: string, 
  documents: UploadedDocument[],
  history: Message[] = [] 
): Promise<string> => {
  
  if (documents.length === 0) {
    return "Please upload the Oriana Knowledge Base documents in the Admin Panel to begin.";
  }

  // 1. Retrieve Context
  const context = getRelevantContext(query, documents);

  // 2. Generate Answer with Gemini
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: `
            You are the Oriana Intelligent Assistant. 
            Oriana is a premium jewellery brand ("Daughter of Light") focusing on brides and their best friends.
            
            YOUR TASK:
            Answer the user's question using ONLY the provided CONTEXT below.
            
            GUIDELINES:
            1. **Accuracy**: Use strictly the facts in the context. Do not invent details.
            2. **Multilingual Support**: You MUST answer in the language the user explicitly requests or acts in.
               - **Tamil**: If the user asks in Tamil or requests "in Tamil", answer entirely in Tamil.
               - **Telugu**: If the user asks in Telugu or requests "in Telugu", answer entirely in Telugu.
               - **English**: Default language.
            3. **Relevance**: If the user asks for a specific format (e.g., "short points"), you MUST comply.
            4. **Tone**: Elegant, helpful, and polite.
            5. **Missing Info**: If the answer is not in the context, say (in the target language): "I cannot find that specific detail in the current documents."
            
            CONTEXT DOCUMENTS:
            ${context}
            
            USER QUESTION: 
            ${query}
          `}]
        }
      ]
    });

    return response.text;

  } catch (error) {
    console.error("Gemini API Error:", error);
    // Graceful fallback if API fails (e.g. network issue)
    return "I am currently unable to process this request via the AI engine. Please check your internet connection or API Key configuration.";
  }
};