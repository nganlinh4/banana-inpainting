
import { SavedProject, ReferenceAsset } from "../types";

const DB_NAME = "BananaInpaintingDB";
const STORE_NAME = "projects";
const ASSETS_STORE_NAME = "assets";
const DB_VERSION = 2; // Bumped version

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(ASSETS_STORE_NAME)) {
        db.createObjectStore(ASSETS_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const saveProject = async (project: SavedProject): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(project);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllProjects = async (): Promise<SavedProject[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
        // Sort by updated at desc
        const res = request.result as SavedProject[];
        res.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(res);
    };
    request.onerror = () => reject(request.error);
  });
};

export const getProject = async (id: string): Promise<SavedProject | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteProject = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const clearAllProjects = async (): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
  
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
};

// -- Assets Methods --

export const saveAsset = async (asset: ReferenceAsset): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ASSETS_STORE_NAME, "readwrite");
    const store = transaction.objectStore(ASSETS_STORE_NAME);
    const request = store.put(asset);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllAssets = async (): Promise<ReferenceAsset[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ASSETS_STORE_NAME, "readonly");
    const store = transaction.objectStore(ASSETS_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
        const res = request.result as ReferenceAsset[];
        // Sort by created at desc (newest first)
        res.sort((a, b) => b.createdAt - a.createdAt);
        resolve(res);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteAsset = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ASSETS_STORE_NAME, "readwrite");
    const store = transaction.objectStore(ASSETS_STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
