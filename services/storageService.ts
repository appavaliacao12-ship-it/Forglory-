
const DB_NAME = 'ZenStudyDB';
const DB_VERSION = 1;
const STORE_NAME = 'notebooks';
const STATS_STORE = 'userStats';

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STATS_STORE)) {
        db.createObjectStore(STATS_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveNotebooks = async (notebooks: any[]) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => {
      notebooks.forEach(nb => store.add(nb));
    };
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
  });
};

export const loadNotebooks = async (): Promise<any[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const saveStats = async (stats: any) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STATS_STORE, 'readwrite');
    const store = transaction.objectStore(STATS_STORE);
    store.put(stats, 'currentStats');
    transaction.oncomplete = () => resolve(true);
  });
};

export const loadStats = async (): Promise<any | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STATS_STORE, 'readonly');
    const store = transaction.objectStore(STATS_STORE);
    const request = store.get('currentStats');
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};
