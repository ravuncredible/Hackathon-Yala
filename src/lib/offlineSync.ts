import { supabase } from './supabase';

const QUEUE_KEY = 'triage_offline_queue';
const INCIDENT_QUEUE_KEY = 'incident_offline_queue';

export interface OfflinePayload {
  id: string; // uuid
  table: 'triage_patients' | 'incidents';
  data: any;
  timestamp: number;
}

export function saveToOfflineQueue(table: 'triage_patients' | 'incidents', data: any) {
  const key = table === 'triage_patients' ? QUEUE_KEY : INCIDENT_QUEUE_KEY;
  const existing = localStorage.getItem(key);
  const queue: OfflinePayload[] = existing ? JSON.parse(existing) : [];
  
  const payload: OfflinePayload = {
    id: crypto.randomUUID(),
    table,
    data,
    timestamp: Date.now()
  };
  
  queue.push(payload);
  localStorage.setItem(key, JSON.stringify(queue));
  
  // Dispatch custom event to notify UI
  window.dispatchEvent(new CustomEvent('offlineQueueUpdated'));
}

export function getOfflineQueueCount(): number {
  const triage = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  const incidents = JSON.parse(localStorage.getItem(INCIDENT_QUEUE_KEY) || '[]');
  return triage.length + incidents.length;
}

export async function syncOfflineData() {
  // Sync Triage
  const triageQueueStr = localStorage.getItem(QUEUE_KEY);
  if (triageQueueStr) {
    const queue: OfflinePayload[] = JSON.parse(triageQueueStr);
    if (queue.length > 0) {
      const dataToInsert = queue.map(q => q.data);
      const { error } = await supabase.from('triage_patients').insert(dataToInsert);
      if (!error) {
        localStorage.removeItem(QUEUE_KEY);
        window.dispatchEvent(new CustomEvent('offlineQueueUpdated'));
      } else {
        console.error('Failed to sync triage data', error);
      }
    }
  }

  // Sync Incidents
  const incidentQueueStr = localStorage.getItem(INCIDENT_QUEUE_KEY);
  if (incidentQueueStr) {
    const queue: OfflinePayload[] = JSON.parse(incidentQueueStr);
    if (queue.length > 0) {
      const dataToInsert = queue.map(q => q.data);
      const { error } = await supabase.from('incidents').insert(dataToInsert);
      if (!error) {
        localStorage.removeItem(INCIDENT_QUEUE_KEY);
        window.dispatchEvent(new CustomEvent('offlineQueueUpdated'));
      } else {
        console.error('Failed to sync incident data', error);
      }
    }
  }
}

// Global listener for online event
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Back online. Syncing offline data...');
    syncOfflineData();
  });
}
