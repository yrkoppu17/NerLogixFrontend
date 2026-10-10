import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { submitFieldReportApi } from '../api/fieldReports';

export interface QueuedReport {
  clientId: string;
  payload: {
    lat: number;
    lng: number;
    accuracy?: number;
    capturedAt: string;
    type: string;
    severity: number;
    note?: string;
  };
  imageBlobs: Blob[];
  status: 'Waiting' | 'Syncing' | 'Synced' | 'Failed';
  errorReason?: string;
  createdAt: string;
}

interface NERLogixDB extends DBSchema {
  queuedReports: {
    key: string;
    value: QueuedReport;
  };
}

const DB_NAME = 'nerlogix-offline-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<NERLogixDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<NERLogixDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('queuedReports')) {
          db.createObjectStore('queuedReports', { keyPath: 'clientId' });
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueueFieldReport(
  payload: QueuedReport['payload'],
  imageBlobs: Blob[]
): Promise<string> {
  const clientId = 'LOCAL-' + crypto.randomUUID();
  const db = await getDB();
  const item: QueuedReport = {
    clientId,
    payload,
    imageBlobs,
    status: 'Waiting',
    createdAt: new Date().toISOString(),
  };
  await db.put('queuedReports', item);

  // Attempt sync immediately if online
  if (navigator.onLine) {
    flushQueue();
  }
  return clientId;
}

export async function getQueuedReports(): Promise<QueuedReport[]> {
  const db = await getDB();
  return db.getAll('queuedReports');
}

export async function removeQueuedReport(clientId: string): Promise<void> {
  const db = await getDB();
  await db.delete('queuedReports', clientId);
}

let isSyncing = false;

export async function flushQueue(): Promise<void> {
  if (isSyncing || !navigator.onLine) return;
  isSyncing = true;

  try {
    const db = await getDB();
    const queuedItems = await db.getAll('queuedReports');

    for (const item of queuedItems) {
      if (item.status === 'Synced') continue;

      item.status = 'Syncing';
      await db.put('queuedReports', item);

      try {
        const formData = new FormData();
        const fullPayload = {
          clientId: item.clientId,
          ...item.payload,
        };
        formData.append('payload', JSON.stringify(fullPayload));

        if (item.imageBlobs && item.imageBlobs.length > 0) {
          item.imageBlobs.forEach((blob, idx) => {
            formData.append('images', blob, `photo_${idx}.png`);
          });
        }

        await submitFieldReportApi(formData);

        item.status = 'Synced';
        await db.put('queuedReports', item);
        // Clean up synced items after short delay
        await db.delete('queuedReports', item.clientId);
      } catch (err: unknown) {
        const errorMsg = err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : (err instanceof Error ? err.message : 'Sync failed');
        item.status = 'Failed';
        item.errorReason = errorMsg;
        await db.put('queuedReports', item);
      }
    }
  } finally {
    isSyncing = false;
  }
}

// Auto sync listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushQueue();
  });
  setInterval(() => {
    if (navigator.onLine) {
      flushQueue();
    }
  }, 15000);
}
