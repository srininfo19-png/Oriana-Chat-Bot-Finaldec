import { UploadedDocument } from '../types';

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

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event);
  });
};

export const saveLogoToDB = async (logoUrl: string): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction(STORE_SETTINGS, 'readwrite');
  const store = tx.objectStore(STORE_SETTINGS);
  store.put({ id: 'brand_logo', value: logoUrl });
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
  });
};

export const getLogoFromDB = async (): Promise<string | null> => {
  const db = await getDB();
  const tx = db.transaction(STORE_SETTINGS, 'readonly');
  const store = tx.objectStore(STORE_SETTINGS);
  const request = store.get('brand_logo');
  return new Promise((resolve) => {
    request.onsuccess = () => resolve(request.result?.value || null);
  });
};

export const saveDocumentsToDB = async (docs: UploadedDocument[]): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction(STORE_DOCS, 'readwrite');
  const store = tx.objectStore(STORE_DOCS);
  
  // Clear existing to sync with current state
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
  const db = await getDB();
  const tx = db.transaction(STORE_DOCS, 'readonly');
  const store = tx.objectStore(STORE_DOCS);
  const request = store.getAll();
  return new Promise((resolve) => {
    request.onsuccess = () => resolve(request.result || []);
  });
};