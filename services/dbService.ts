import { UploadedDocument } from '../types';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig';

// --- CLOUD DATABASE (Firebase) ---
let db: any = null;

if (isFirebaseConfigured()) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("Cloud Database Initialized");
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
  // 1. Try Cloud
  if (db) {
    try {
      await setDoc(doc(db, "oriana_settings", "branding"), {
        logoUrl: logoUrl,
        updatedAt: new Date().toISOString()
      });
      return;
    } catch (e) {
      console.error("Cloud Save Failed", e);
    }
  }

  // 2. Fallback Local
  const localDb = await getLocalDB();
  const tx = localDb.transaction(STORE_SETTINGS, 'readwrite');
  const store = tx.objectStore(STORE_SETTINGS);
  store.put({ id: 'brand_logo', value: logoUrl });
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
  });
};

export const getLogoFromDB = async (): Promise<string | null> => {
  // 1. Try Cloud
  if (db) {
    try {
      // @ts-ignore
      const docSnap = await import("firebase/firestore").then(mod => mod.getDoc(mod.doc(db, "oriana_settings", "branding")));
      if (docSnap.exists()) {
        return docSnap.data().logoUrl;
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
      // Strategy: We replace the entire collection or sync individually.
      // For this demo, we'll save each doc.
      // Note: Firestore writes have limits, but for <50 docs it's fine.
      const batch = (await import("firebase/firestore")).writeBatch(db);
      
      // First, we might want to delete old ones, but for now let's just overwrite by ID
      docs.forEach(d => {
        const docRef = doc(db, "oriana_documents", d.id);
        // Serialize Date objects to ISO strings for JSON storage
        const safeDoc = {
          ...d,
          uploadDate: d.uploadDate instanceof Date ? d.uploadDate.toISOString() : d.uploadDate
        };
        batch.set(docRef, safeDoc);
      });

      await batch.commit();
      return;
    } catch (e) {
      console.error("Cloud Save Failed (Docs)", e);
    }
  }

  // 2. Fallback Local
  const localDb = await getLocalDB();
  const tx = localDb.transaction(STORE_DOCS, 'readwrite');
  const store = tx.objectStore(STORE_DOCS);
  
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

// Helper for deleting from Cloud
export const deleteDocumentFromDB = async (id: string): Promise<void> => {
    if (db) {
        try {
            await deleteDoc(doc(db, "oriana_documents", id));
        } catch(e) { console.error(e) }
    }
    // Also delete from local to keep sync
    const localDb = await getLocalDB();
    const tx = localDb.transaction(STORE_DOCS, 'readwrite');
    tx.objectStore(STORE_DOCS).delete(id);
};