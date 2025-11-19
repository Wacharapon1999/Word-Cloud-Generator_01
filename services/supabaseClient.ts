import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { WordCloudEntry } from '../types';

// Safely retrieve env vars without crashing if process is undefined
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    return (typeof process !== 'undefined' && process.env && process.env[key]) || '';
  } catch {
    return '';
  }
};

const supabaseUrl = getEnv('REACT_APP_SUPABASE_URL');
const supabaseAnonKey = getEnv('REACT_APP_SUPABASE_ANON_KEY');

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);

// --- Local In-Memory Store for Demo Mode ---
// This ensures data persists when switching views in the same session if no DB is connected
const localEntries: WordCloudEntry[] = [];

// --- Helper for Safe Demo Communication ---
// BroadcastChannel can fail in sandboxed iframes (like AI Studio preview), causing "Refused to connect"
class InMemoryEmitter {
  private static listeners: Function[] = [];
  
  static emit(event: any) {
    this.listeners.forEach(cb => cb(event));
  }
  
  static subscribe(cb: Function) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }
}

const safeBroadcast = (entry: WordCloudEntry) => {
  // 1. Always update in-memory emitter for same-tab updates
  InMemoryEmitter.emit({ type: 'INSERT', payload: entry });

  // 2. Try BroadcastChannel for cross-tab (might fail in sandbox)
  try {
    const bc = new BroadcastChannel('word-cloud-demo');
    bc.postMessage({ type: 'INSERT', payload: entry });
    bc.close();
  } catch (e) {
    // Ignore BroadcastChannel errors in sandbox
  }
};

// --- Storage Services ---

export const uploadImage = async (blob: Blob, fileName: string): Promise<string | null> => {
  if (!isSupabaseConfigured) {
    console.warn("Supabase not configured. Mocking upload.");
    await new Promise(resolve => setTimeout(resolve, 500));
    return URL.createObjectURL(blob);
  }

  try {
    const { data, error } = await supabase.storage
      .from('word-clouds')
      .upload(`public/${fileName}`, blob, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('word-clouds')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
};

// --- Database Services ---

export const saveEntry = async (userName: string, inputText: string, imageUrl: string | null = null) => {
  if (!isSupabaseConfigured) {
    console.warn("Supabase not configured. Mocking DB insert.");
    
    // Save to local memory store
    const newEntry: WordCloudEntry = {
      id: Date.now(),
      user_name: userName,
      input_text: inputText,
      image_url: imageUrl,
      created_at: new Date().toISOString()
    };
    localEntries.push(newEntry);

    // Safe Broadcast
    safeBroadcast(newEntry);
    
    return { data: { id: newEntry.id }, error: null };
  }

  return await supabase
    .from('entries')
    .insert([
      { user_name: userName, input_text: inputText, image_url: imageUrl },
    ])
    .select();
};

export const fetchAllTexts = async (): Promise<WordCloudEntry[]> => {
  if (!isSupabaseConfigured) {
    // Return local memory store sorted by newest first
    return [...localEntries].sort((a, b) => 
      (b.created_at || '').localeCompare(a.created_at || '')
    );
  }

  const { data, error } = await supabase
    .from('entries')
    .select('input_text, user_name, created_at')
    .order('created_at', { ascending: false })
    .limit(1000); // Limit to last 1000 entries for performance

  if (error) {
    console.error('Error fetching entries:', error);
    return [];
  }

  return data as WordCloudEntry[];
};

// --- Realtime Services ---

export const subscribeToNewEntries = (onNewEntry: (entry: WordCloudEntry) => void): (() => void) => {
  if (!isSupabaseConfigured) {
    // Fallback for demo mode
    // 1. Subscribe to local memory emitter (safe)
    const unsubscribeLocal = InMemoryEmitter.subscribe((event: any) => {
       if (event.type === 'INSERT') onNewEntry(event.payload);
    });

    // 2. Try subscribing to BroadcastChannel (might fail in sandbox)
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('word-cloud-demo');
      bc.onmessage = (event) => {
        if (event.data?.type === 'INSERT') {
          // Avoid duplicates if possible, but simple is fine for demo
          // Ideally check ID, but for now we rely on the fact that InMemoryEmitter handles the local tab
          // and BroadcastChannel handles ONLY other tabs.
          // Actually, BroadcastChannel receives messages from OTHER tabs, not the sender.
          // So we need both? 
          // For simplicity in this demo fix: Just use InMemory for current tab updates.
          // If the user opens a second tab, BroadcastChannel handles it.
          onNewEntry(event.data.payload);
        }
      };
    } catch (e) {
      console.warn("Realtime sync across tabs disabled (Sandbox restricted)");
    }

    return () => {
      unsubscribeLocal();
      if (bc) bc.close();
    };
  }

  const channel = supabase
    .channel('table-db-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'entries',
      },
      (payload) => {
        const newEntry = payload.new as WordCloudEntry;
        onNewEntry(newEntry);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};