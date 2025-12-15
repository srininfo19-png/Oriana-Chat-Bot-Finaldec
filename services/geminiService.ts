import { UploadedDocument, Message } from "../types";

// --- CUSTOM LOCAL CHAT ALGORITHM (No API Required) ---

// Helper: Tokenize text into words, removing punctuation
const tokenize = (text: string): string[] => {
  return text.toLowerCase()
    .replace(/[^\w\s]|_/g, "")
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(w => w.length > 2); // Filter out tiny words
};

// Helper: Split text into sentences for granular extraction
const splitIntoSentences = (text: string): string[] => {
  // Split by periods, question marks, or exclamation marks
  return text.match(/[^.!?]+[.!?]+/g) || [text];
};

// Helper: Calculate relevance score of a sentence against a query
const calculateScore = (sentence: string, queryTokens: string[]): number => {
  const sentenceTokens = tokenize(sentence);
  let score = 0;
  
  // 1. Direct Keyword Matches
  queryTokens.forEach(qToken => {
    if (sentenceTokens.includes(qToken)) {
      score += 10; 
    }
  });

  // 2. Phrase density (simplified)
  if (score > 0) {
    // penalize very long sentences slightly to prefer concise answers
    score -= (sentenceTokens.length * 0.05);
  }

  return score;
};

export const generateRAGResponse = async (
  query: string, 
  documents: UploadedDocument[],
  history: Message[] = [] 
): Promise<string> => {
  
  // 1. HANDLE GREETINGS & BASICS (Hardcoded Personality)
  const lowerQ = query.toLowerCase();
  if (lowerQ.match(/^(hi|hello|hey|greetings|vanakkam|namaste|namaskara)/)) {
    return `* Hello! I am the Oriana Assistant.
* I can help you with details about our jewelry, gold purity, and collections.
* Please ask your question based on the documents you have uploaded.`;
  }

  if (documents.length === 0) {
    return "* Please upload knowledge base documents in the Admin panel to start.";
  }

  // 2. PREPARE QUERY
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return "* Please ask a specific question about the products.";
  }

  // 3. SEARCH & EXTRACT (The "Algorithm")
  let allCandidateSentences: { text: string; score: number }[] = [];

  documents.forEach(doc => {
    // We search the full content, split into sentences
    const sentences = splitIntoSentences(doc.content);
    
    sentences.forEach(sentence => {
      const score = calculateScore(sentence, queryTokens);
      if (score > 0) {
        // Clean up sentence (remove newlines, extra spaces)
        const cleanText = sentence.replace(/\s+/g, ' ').trim();
        allCandidateSentences.push({ text: cleanText, score });
      }
    });
  });

  // 4. SORT & SELECT TOP RESULTS
  // Sort by score descending
  allCandidateSentences.sort((a, b) => b.score - a.score);

  // Take top 5 unique sentences
  const uniqueSentences = new Set<string>();
  const finalSentences: string[] = [];
  
  for (const item of allCandidateSentences) {
    if (finalSentences.length >= 5) break;
    if (!uniqueSentences.has(item.text)) {
      uniqueSentences.add(item.text);
      finalSentences.push(item.text);
    }
  }

  // 5. FORMAT OUTPUT
  if (finalSentences.length === 0) {
    // Fallback if no keywords matched
    return "* Sorry, I could not find specific information about that in my documents.\n* Please try using different keywords related to the uploaded files.";
  }

  // Combine into bullet points
  const response = finalSentences.map(s => `* ${s}`).join("\n\n");
  
  return response;
};