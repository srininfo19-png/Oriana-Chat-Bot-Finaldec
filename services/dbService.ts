import { UploadedDocument } from '../types';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig';

// --- CLOUD DATABASE (Firebase) ---
let db: any = null;

if (isFirebaseConfigured()) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("Cloud Database Configuration Detected");
  } catch (e) {
    console.error("Firebase Init Error:", e);
  }
}

// --- LOCAL DATABASE (IndexedDB) ---
const DB_NAME = 'OrianaRAG_DB';
const DB_VERSION = 1;
const STORE_SETTINGS = 'settings';
const STORE_DOCS = 'documents';

export const initDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_DOCS)) {
        db.createObjectStore(STORE_DOCS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve();
    request.onerror = (event) => reject(event);
  });
};

const getLocalDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event);
  });
};

// --- HYBRID DATA METHODS ---

export const getUsingCloud = () => !!db;

export const saveLogoToDB = async (logoUrl: string): Promise<void> => {
  // Check size limit (approx 1MB for Firestore)
  // 1MB = ~1,000,000 characters of base64
  const SIZE_LIMIT = 950000; 

  if (logoUrl.length > SIZE_LIMIT) {
      console.warn(`Logo is too large for Cloud Sync (${logoUrl.length} chars). Limit is ${SIZE_LIMIT}. Saving locally only.`);
      // Proceed to local save
  } else if (db) {
    // 1. Try Cloud
    try {
      await setDoc(doc(db, "oriana_settings", "branding"), {
        logoUrl: logoUrl,
        updatedAt: new Date().toISOString()
      });
      console.log("Logo saved to Cloud successfully.");
    } catch (e: any) {
      console.error("Cloud Save Failed (Logo):", e.message);
      if (e.code === 'permission-denied') {
        alert("Database Permission Denied. Check Firestore Rules in Firebase Console.");
      }
    }
  }

  // 2. Always Save Local (for offline speed)
  const localDb = await getLocalDB();
  const tx = localDb.transaction(STORE_SETTINGS, 'readwrite');
  const store = tx.objectStore(STORE_SETTINGS);
  store.put({ id: 'brand_logo', value: logoUrl });
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
  });
};

export const getLogoFromDB = async (): Promise<string | null> => {
  // 1. Try Cloud first
  if (db) {
    try {
      const docRef = doc(db, "oriana_settings", "branding");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        console.log("Logo loaded from Cloud");
        return docSnap.data().logoUrl;
      } else {
        console.log("No logo found in Cloud, checking local...");
      }
    } catch (e) {
      console.warn("Cloud Fetch Failed (Logo), falling back to local", e);
    }
  }

  // 2. Fallback Local
  const localDb = await getLocalDB();
  const tx = localDb.transaction(STORE_SETTINGS, 'readonly');
  const store = tx.objectStore(STORE_SETTINGS);
  const request = store.get('brand_logo');
  return new Promise((resolve) => {
    request.onsuccess = () => resolve(request.result?.value || null);
  });
};

export const saveDocumentsToDB = async (docs: UploadedDocument[]): Promise<void> => {
  // 1. Try Cloud
  if (db) {
    try {
      const batch = writeBatch(db);
      let batchCount = 0;
      
      docs.forEach(d => {
        // Firestore 1MB limit check per doc
        if (d.content.length > 900000) {
            console.warn(`Document ${d.name} is too large for Cloud Sync. Skipping cloud save.`);
            return;
        }

        const docRef = doc(db, "oriana_documents", d.id);
        const safeDoc = {
          ...d,
          uploadDate: d.uploadDate instanceof Date ? d.uploadDate.toISOString() : d.uploadDate
        };
        batch.set(docRef, safeDoc);
        batchCount++;
      });

      if (batchCount > 0) {
        await batch.commit();
        console.log("Documents synced to Cloud");
      }
    } catch (e: any) {
      console.error("Cloud Save Failed (Docs):", e.message);
    }
  }

  // 2. Always Save Local
  const localDb = await getLocalDB();
  const tx = localDb.transaction(STORE_DOCS, 'readwrite');
  const store = tx.objectStore(STORE_DOCS);
  
  // Clear local and replace to match state
  await new Promise<void>((resolve) => {
    store.clear().onsuccess = () => resolve();
  });

  docs.forEach(doc => {
    store.put(doc);
  });

  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
  });
};

export const getDocumentsFromDB = async (): Promise<UploadedDocument[]> => {
  // 1. Try Cloud
  if (db) {
    try {
      const querySnapshot = await getDocs(collection(db, "oriana_documents"));
      const docs: UploadedDocument[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        docs.push({
          id: data.id,
          name: data.name,
          type: data.type,
          content: data.content,
          uploadDate: new Date(data.uploadDate)
        });
      });
      console.log(`Loaded ${docs.length} documents from Cloud`);
      // Update local cache if cloud was successful
      if (docs.length > 0) {
          saveLocalCache(docs); 
      }
      return docs;
    } catch (e) {
      console.warn("Cloud Fetch Failed (Docs), falling back to local", e);
    }
  }

  // 2. Fallback Local
  const localDb = await getLocalDB();
  const tx = localDb.transaction(STORE_DOCS, 'readonly');
  const store = tx.objectStore(STORE_DOCS);
  const request = store.getAll();
  return new Promise((resolve) => {
    request.onsuccess = () => resolve(request.result || []);
  });
};

export const deleteDocumentFromDB = async (id: string): Promise<void> => {
    if (db) {
        try {
            await deleteDoc(doc(db, "oriana_documents", id));
            console.log("Document deleted from Cloud");
        } catch(e) { console.error(e) }
    }
    // Also delete from local
    const localDb = await getLocalDB();
    const tx = localDb.transaction(STORE_DOCS, 'readwrite');
    tx.objectStore(STORE_DOCS).delete(id);
};

// Helper to keep local in sync with cloud reads
const saveLocalCache = async (docs: UploadedDocument[]) => {
    const localDb = await getLocalDB();
    const tx = localDb.transaction(STORE_DOCS, 'readwrite');
    const store = tx.objectStore(STORE_DOCS);
    store.clear();
    docs.forEach(doc => store.put(doc));
}