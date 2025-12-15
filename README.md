# Oriana RAG Bot (Local Edition)

A React-based RAG chatbot designed for Oriana. This version uses a custom **Local Search Algorithm** to retrieve and assemble answers from uploaded documents without requiring an external AI API (No API Key needed).

## Features
- **Frontend RAG Algorithm:** Custom keyword density scoring and sentence extraction logic running purely in JavaScript.
- **Privacy First:** Data never leaves the browser (unless Firebase sync is enabled).
- **Persistence:** Uses IndexedDB to locally save uploaded documents and branding logos.
- **Admin Panel:** Secure login (User: `Admin`, Pass: `Admin@1234`) to upload Knowledge Base files.

## Deployment Procedure

### 1. Setup Repository
1.  Download this code.
2.  Initialize a git repository locally.
3.  Push to GitHub.

### 2. Deploy to Vercel
1.  Go to [Vercel](https://vercel.com/new).
2.  Import your GitHub repository.
3.  Ensure the Framework Preset is set to **Create React App**.
4.  **No Environment Variables Needed.**
5.  Click **Deploy**.

### 3. Admin Setup (First Time Run)
1.  Open your deployed Vercel URL.
2.  Click the **Admin Settings** button (top right).
3.  Login with `Admin` / `Admin@1234`.
4.  **Upload Brand Logo:** Upload your Oriana logo.
5.  **Upload Knowledge Base:** Upload text/md/json/pdf files containing product info.
    *   *Tip:* Since the algorithm extracts sentences, ensure your documents have clear punctuation.
6.  Close the panel.

## Architecture Note
This application uses **Browser-based Persistence (IndexedDB)**.
- **Logic:** It breaks documents into sentences and scores them based on how many keywords from the user's query appear in them. It then returns the top 5 sentences as bullet points.
- **Language:** It works in any language provided the user searches in the same language as the document (e.g., if you upload a Tamil document, you can search in Tamil).