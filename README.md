# Oriana RAG Bot

A React-based RAG chatbot designed for Oriana, featuring a gradient theme, admin file management, persistent vector-like storage, and Google Gemini AI integration.

## Features
- **Frontend RAG:** Uses in-memory context context injection for high accuracy with Gemini Flash 2.5.
- **Persistence:** Uses IndexedDB to locally save uploaded documents and branding logos, so they survive page reloads and deployments on the same device.
- **Admin Panel:** Secure login (User: `Admin`, Pass: `Admin@1234`) to upload Knowledge Base files.
- **Multilingual:** Supports English, Tamil, Telugu, and Kannada.
- **Strict Guardrails:** Answers only questions related to uploaded documents.

## Deployment Procedure (GitHub & Vercel)

### 1. Setup Repository
1.  Download this code.
2.  Initialize a git repository locally:
    ```bash
    git init
    git add .
    git commit -m "Initial Oriana Bot"
    ```
3.  Create a new repository on GitHub and push your code there.

### 2. Configure Gemini API Key
**IMPORTANT:** You must configure the API Key environment variable for the bot to work.

1.  Get your key: `AIzaSyBBWqHW2-KSdl6djUk_-Bm6rvBV8-OgC2o` (from your provided text).
2.  **For Vercel Deployment:**
    - Go to your Vercel Project Settings.
    - Click **Environment Variables**.
    - Add Key: `API_KEY`
    - Add Value: `AIzaSyBBWqHW2-KSdl6djUk_-Bm6rvBV8-OgC2o`
    - Click Save.
3.  **For Local Development:**
    - Create a file named `.env` in the root folder.
    - Add: `API_KEY=AIzaSyBBWqHW2-KSdl6djUk_-Bm6rvBV8-OgC2o`

### 3. Deploy to Vercel
1.  Go to [Vercel](https://vercel.com/new).
2.  Import your GitHub repository.
3.  Ensure the Framework Preset is set to **Create React App** (or Vite if configured).
4.  Verify the Environment Variables are set (Step 2).
5.  Click **Deploy**.

### 4. Admin Setup (First Time Run)
1.  Open your deployed Vercel URL.
2.  Click the **Admin Settings** button (top right).
3.  Login with `Admin` / `Admin@1234`.
4.  **Upload Brand Logo:** Upload your Oriana logo. It will be saved to the database.
5.  **Upload Knowledge Base:** Upload text/md/json files.
    - *Note:* The system simulates "Vector Binary" storage by persisting these files in the browser's IndexedDB. This ensures fast loading on subsequent visits.
6.  Close the panel. The bot is now trained.

### 5. Google Cloud App Engine (Alternative)
1.  Install Google Cloud SDK.
2.  Create `app.yaml`:
    ```yaml
    runtime: nodejs18
    env_variables:
      API_KEY: "AIzaSyBBWqHW2-KSdl6djUk_-Bm6rvBV8-OgC2o"
    handlers:
      - url: /.*
        static_files: build/index.html
        upload: build/index.html
      - url: /
        static_dir: build
    ```
3.  Run `npm run build`.
4.  Run `gcloud app deploy`.

## Architecture Note
This application uses **Browser-based Persistence (IndexedDB)**.
- **Pros:** Fast, no external database setup required, works immediately on deployment.
- **Cons:** Data is stored *per device*. If you upload documents on your laptop, they won't appear on your phone. For a production app with centralized knowledge shared across all users, you would need to integrate a cloud database like Firebase Firestore.