import { HistoryItem } from '../types';

const DB_NAME = 'VoxEpubDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('history')) {
        const historyStore = db.createObjectStore('history', { keyPath: 'id' });
        historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        historyStore.createIndex('bookTitle', 'bookTitle', { unique: false });
      }
      if (!db.objectStoreNames.contains('voiceDemos')) {
        db.createObjectStore('voiceDemos', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

export async function saveHistoryItem(item: Omit<HistoryItem, 'audioBlobUrl'> & { audioBlob: Blob }): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('history', 'readwrite');
    const store = tx.objectStore('history');
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getHistoryItems(): Promise<HistoryItem[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('history', 'readonly');
      const store = tx.objectStore('history');
      const req = store.getAll();

      req.onsuccess = () => {
        const rawItems = (req.result || []) as Array<Omit<HistoryItem, 'audioBlobUrl'> & { audioBlob: Blob }>;
        // Create ephemeral Object URLs for browser audio playback
        const items: HistoryItem[] = rawItems
          .map((item) => ({
            ...item,
            audioBlobUrl: URL.createObjectURL(item.audioBlob),
          }))
          .sort((a, b) => b.timestamp - a.timestamp);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function deleteHistoryItem(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('history', 'readwrite');
    const store = tx.objectStore('history');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearAllHistory(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('history', 'readwrite');
    const store = tx.objectStore('history');
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// In-memory cache fallback for demo URLs
const memoryDemoCache = new Map<string, string>();

export async function getCachedVoiceDemo(key: string): Promise<string | null> {
  if (memoryDemoCache.has(key)) {
    return memoryDemoCache.get(key)!;
  }

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('voiceDemos', 'readonly');
      const store = tx.objectStore('voiceDemos');
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          const url = URL.createObjectURL(req.result.blob);
          memoryDemoCache.set(key, url);
          resolve(url);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setCachedVoiceDemo(key: string, blobUrl: string): Promise<void> {
  memoryDemoCache.set(key, blobUrl);
  try {
    // Fetch blob from blobUrl to persist in IDB
    const res = await fetch(blobUrl);
    const blob = await res.blob();
    const db = await getDB();
    const tx = db.transaction('voiceDemos', 'readwrite');
    tx.objectStore('voiceDemos').put({ key, blob });
  } catch {
    // Memory cache remains available
  }
}

export async function getStorageEstimate(): Promise<{ usage: number; quota: number }> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    } catch {
      return { usage: 0, quota: 0 };
    }
  }
  return { usage: 0, quota: 0 };
}
