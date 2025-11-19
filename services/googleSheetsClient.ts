import { WordCloudEntry } from '../types';

// --- Configuration ---
// The deployed Google Apps Script Web App URL provided by the user
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyIj6IcB-P2_BqA7jheSRq11jr4WOYVcj9l6Gu5fenuE7mzNJ4F4BzrcdsL_oNRytQ/exec';

export const isBackendConfigured = !!GOOGLE_SCRIPT_URL;

// --- Local In-Memory Store for Demo Mode ---
const localEntries: WordCloudEntry[] = [];

// Helper for safe demo communication
class InMemoryEmitter {
  private static listeners: Function[] = [];
  static emit(event: any) { this.listeners.forEach(cb => cb(event)); }
  static subscribe(cb: Function) {
    this.listeners.push(cb);
    return () => { this.listeners = this.listeners.filter(l => l !== cb); };
  }
}

// --- API Services ---

export const saveEntry = async (userName: string, inputText: string, imageUrl: string | null = null) => {
  const entry: WordCloudEntry = {
    id: Date.now(),
    user_name: userName,
    input_text: inputText,
    image_url: imageUrl,
    created_at: new Date().toISOString()
  };

  // 1. Always save to local demo store immediately for optimistic UI updates
  localEntries.push(entry);
  InMemoryEmitter.emit({ type: 'INSERT', payload: entry });

  if (!isBackendConfigured) {
    console.warn("Google Sheets URL not configured. Using local demo mode.");
    return { data: { id: entry.id }, error: null };
  }

  // 2. Send to Google Sheets
  try {
    // TRICK: We use 'Content-Type': 'text/plain' to prevent the browser from triggering 
    // a CORS Preflight (OPTIONS) request. Google Apps Script cannot handle OPTIONS requests easily.
    // The body is still valid JSON, and the server (GAS) will parse it using JSON.parse(e.postData.contents).
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ user_name: userName, input_text: inputText })
    });

    const result = await response.json();
    if (result.status === 'error') throw new Error(result.message);
    
    return { data: result, error: null };
  } catch (error) {
    console.error('Error saving to Google Sheets:', error);
    // We don't return error here if local save succeeded to keep UI optimistic,
    // but in a real app we might want to notify the user.
    return { data: { id: entry.id }, error: null }; 
  }
};

export const fetchAllTexts = async (): Promise<WordCloudEntry[]> => {
  if (!isBackendConfigured) {
    return [...localEntries].sort((a, b) => 
      (b.created_at || '').localeCompare(a.created_at || '')
    );
  }

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL);
    const data = await response.json();
    
    // Google Sheets returns raw data. Ensure it matches our type.
    // Also, we can merge with localEntries if we wanted to show pending writes, 
    // but for simplicity we'll trust the server response plus any very recent local ones?
    // For this version, let's return the server data directly. 
    // If the server is empty but we have local writes, we might want to merge, 
    // but the saveEntry optimistic update handles the immediate UI.
    return data as WordCloudEntry[];
  } catch (error) {
    console.error('Error fetching from Google Sheets:', error);
    // Fallback to local if network fails
    return [...localEntries];
  }
};

// --- Realtime Simulation (Polling) ---

export const subscribeToNewEntries = (onNewEntry: (entry: WordCloudEntry) => void): (() => void) => {
  // 1. Local immediate updates (listen to optimistic writes from this tab)
  const unsubscribeLocal = InMemoryEmitter.subscribe((event: any) => {
    if (event.type === 'INSERT') onNewEntry(event.payload);
  });

  if (!isBackendConfigured) {
    return unsubscribeLocal;
  }

  // 2. Polling for Google Sheets
  // Google Sheets API (via GAS) doesn't support WebSockets, so we poll.
  let isPolling = true;
  let lastKnownIds = new Set<number | string>();

  // Initial fetch to populate known IDs so we don't re-announce old entries
  fetchAllTexts().then(entries => {
    entries.forEach(e => {
      if (e.id) lastKnownIds.add(e.id);
    });
  });

  const pollInterval = setInterval(async () => {
    if (!isPolling) return;
    try {
      const entries = await fetchAllTexts();
      // Check for new entries (assumes ID exists)
      const newEntries = entries.filter(e => e.id && !lastKnownIds.has(e.id));
      
      if (newEntries.length > 0) {
          // Sort oldest to newest so we replay them in order
          newEntries.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
          
          newEntries.forEach(entry => {
            if (entry.id) lastKnownIds.add(entry.id);
            // Only emit if it wasn't already emitted locally (simple check by ID/timestamp could be added)
            // But for now, duplication is low risk for word cloud stats.
            onNewEntry(entry);
          });
      }
    } catch (e) {
      // Silent fail on poll error
    }
  }, 5000); // Poll every 5 seconds

  return () => {
    isPolling = false;
    clearInterval(pollInterval);
    unsubscribeLocal();
  };
};