import React, { useState, useEffect, useRef } from 'react';
import { saveEntry, fetchAllTexts, subscribeToNewEntries, isBackendConfigured } from './services/googleSheetsClient';
import { generateWordCloudBlob } from './utils/wordCloudGenerator';
import { WordCloudEntry } from './types';

// --- Components ---

const Navbar: React.FC = () => {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const isLive = hash === '#/live';

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-teal-600">
              ☁️ WordCloud<span className="font-light text-gray-800">Sheets</span>
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <a
              href="#/"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                !isLive ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Input
            </a>
            <a
              href="#/live"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isLive ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Live Display
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

const InputPage: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async () => {
    if (!inputText.trim()) return;

    setIsSubmitting(true);
    setStatus('idle');

    try {
      // We hardcode 'Anonymous' or a session ID since the UI no longer asks for it
      const userName = "Anonymous User"; 
      const { error } = await saveEntry(userName, inputText, null);
      
      if (error) throw error;

      setStatus('success');
      setInputText('');
      
      // Reset success message after 3 seconds
      setTimeout(() => setStatus('idle'), 3000);

    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 animate-fade-in">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-900">Share Your Thoughts</h2>
        <p className="mt-2 text-gray-600">Type anything below. It will be saved to Google Sheets and appear on the Live Cloud.</p>
        {!isBackendConfigured && (
          <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 p-1 rounded inline-block">
            Demo Mode: Google Sheet URL not set. Data is local only.
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
        <label htmlFor="input-text" className="block text-sm font-medium text-gray-700 mb-2">
          Your Text
        </label>
        <textarea
          id="input-text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
             if(e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
             }
          }}
          rows={6}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none text-lg"
          placeholder="Type words, lyrics, ideas..."
        />
        
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm">
            {status === 'success' && (
              <span className="text-green-600 flex items-center font-medium">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                Sent to Sheet!
              </span>
            )}
            {status === 'error' && (
              <span className="text-red-600 font-medium">Error sending text.</span>
            )}
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !inputText.trim()}
            className={`px-8 py-3 rounded-lg font-bold text-white shadow-md transition-all transform ${
              isSubmitting || !inputText.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 hover:-translate-y-1'
            }`}
          >
            {isSubmitting ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

const LiveDisplayPage: React.FC = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [allText, setAllText] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [entryCount, setEntryCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const entries = await fetchAllTexts();
        if (entries.length > 0) {
            const combinedText = entries.map(e => e.input_text).join(' ');
            setAllText(combinedText);
            setEntryCount(entries.length);
        }
      } catch (e) {
        console.error("Failed to load initial data", e);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Subscribe to real-time updates (polling or local)
  useEffect(() => {
    const unsubscribe = subscribeToNewEntries((newEntry: WordCloudEntry) => {
      console.log("New entry received:", newEntry);
      setAllText(prev => {
        return prev ? prev + ' ' + newEntry.input_text : newEntry.input_text;
      });
      setEntryCount(prev => prev + 1);
      setLastUpdate(new Date());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Debounced Cloud Generation
  useEffect(() => {
    if (!allText.trim()) {
        setImageUrl(null);
        return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const blob = await generateWordCloudBlob(allText);
        if (blob) {
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
        }
      } catch(e) {
        console.error("Generation failed", e);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [allText]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-900 text-white overflow-hidden">
      {/* Status Bar */}
      <div className="bg-gray-800 px-6 py-3 flex justify-between items-center shadow-md z-10">
        <div className="flex items-center space-x-4">
            <div className="flex items-center">
                <span className="relative flex h-3 w-3 mr-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isBackendConfigured ? 'bg-green-400' : 'bg-yellow-400'} opacity-75`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isBackendConfigured ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                </span>
                <span className={`font-mono text-sm ${isBackendConfigured ? 'text-green-400' : 'text-yellow-400'}`}>
                    {isBackendConfigured ? 'Google Sheets Connected' : 'Local Demo Mode'}
                </span>
            </div>
            <div className="h-4 w-px bg-gray-600"></div>
            <span className="text-sm text-gray-400">Entries: <span className="text-white font-bold">{entryCount}</span></span>
        </div>
        <div className="text-xs text-gray-500 font-mono">
            Last Update: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
        {loading && !imageUrl ? (
           <div className="flex flex-col items-center">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
             <p className="text-gray-400">Aggregating text from Sheets...</p>
           </div>
        ) : !imageUrl ? (
            <div className="text-center text-gray-500">
                <p className="text-xl">Waiting for input...</p>
                <p className="text-sm mt-2">Go to the Input page to start the cloud.</p>
            </div>
        ) : (
            <img 
                src={imageUrl} 
                alt="Live Word Cloud" 
                className="max-w-full max-h-full object-contain drop-shadow-2xl animate-fade-in transition-all duration-500"
            />
        )}
      </div>
    </div>
  );
};

// --- Main App Component with Routing ---

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
        if (!window.location.hash) window.location.hash = '#/';
        setCurrentPath(window.location.hash);
    };

    if (!window.location.hash) window.location.hash = '#/';
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-inter">
      <Navbar />
      
      <main className="flex-1">
        {(currentPath === '#/' || currentPath === '') && <InputPage />}
        {currentPath === '#/live' && <LiveDisplayPage />}
      </main>
    </div>
  );
};

export default App;