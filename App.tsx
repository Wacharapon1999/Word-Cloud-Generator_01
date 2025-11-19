import React, { useState, useEffect, useRef } from 'react';
import { saveEntry, fetchAllTexts, subscribeToNewEntries, isBackendConfigured } from './services/googleSheetsClient';
import { generateWordCloudBlob } from './utils/wordCloudGenerator';
import { WordCloudEntry } from './types';

// --- Components ---

const Navbar: React.FC = () => {
  const [hash, setHash] = useState(window.location.hash);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    const handleScroll = () => setScrolled(window.scrollY > 10);
    
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const isLive = hash === '#/live';

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        scrolled || isLive
          ? 'bg-white/90 backdrop-blur-md border-gray-200 shadow-sm py-2' 
          : 'bg-[#007947] border-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12">
          <div className="flex items-center group cursor-pointer" onClick={() => window.location.hash = '#/'}>
            <div className="mr-3 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-[#007947] text-xl transform group-hover:scale-110 transition-transform">
              ☁️
            </div>
            <span className={`text-2xl font-black tracking-tight font-kanit transition-colors ${scrolled || isLive ? 'text-[#007947]' : 'text-white'}`}>
              CG&Risk Day
              <span className={`ml-2 px-2 py-0.5 rounded-md text-sm align-middle font-bold ${scrolled || isLive ? 'bg-[#F40000] text-white' : 'bg-white text-[#F40000]'}`}>Word Cloud</span>
            </span>
          </div>
          <div className="flex items-center space-x-2 bg-gray-100/10 rounded-full p-1 backdrop-blur-sm">
            <a
              href="#/"
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 font-kanit ${
                !isLive 
                  ? 'bg-[#F40000] text-white shadow-md transform scale-105' 
                  : scrolled || isLive ? 'text-gray-600 hover:bg-gray-100' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              ส่งข้อความ
            </a>
            <a
              href="#/live"
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 font-kanit ${
                isLive 
                  ? 'bg-[#007947] text-white shadow-md transform scale-105' 
                  : scrolled || isLive ? 'text-gray-600 hover:bg-gray-100' : 'text-white/80 hover:bg-white/10'
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
      const userName = "Anonymous User"; 
      const { error } = await saveEntry(userName, inputText, null);
      
      if (error) throw error;

      setStatus('success');
      setInputText('');
      
      setTimeout(() => setStatus('idle'), 3000);

    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-[#007947]/10 rounded-full blur-3xl -z-10 animate-pulse-soft"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#F40000]/5 rounded-full blur-3xl -z-10 animate-pulse-soft" style={{animationDelay: '1s'}}></div>

      <div className="max-w-2xl w-full animate-fade-in z-10">
        <div className="text-center mb-8">
          <h2 className="text-5xl font-black text-[#007947] font-kanit tracking-tight mb-4 drop-shadow-sm">
            แสดงความคิดเห็น
          </h2>
          <p className="text-xl text-gray-600 font-light font-kanit">
            ทุกคำของคุณมีค่า... ข้อความของคุณจะถูกนำไปสร้างเป็นงานศิลปะ
          </p>
          {!isBackendConfigured && (
            <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium border border-orange-200">
              <span className="w-2 h-2 rounded-full bg-orange-500 mr-2"></span>
              Demo Mode: Local Storage Only
            </div>
          )}
        </div>

        <div className="bg-white/60 backdrop-blur-2xl p-1 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,121,71,0.15)] border border-white">
          <div className="bg-gradient-to-b from-white to-slate-50 rounded-[2.3rem] p-6 sm:p-10 border border-gray-100">
            <label htmlFor="input-text" className="block text-lg font-bold text-gray-700 mb-3 font-kanit flex items-center">
              <div className="bg-gradient-to-br from-[#007947] to-[#005f37] text-white w-10 h-10 rounded-xl flex items-center justify-center mr-3 text-lg shadow-md">
                ✍️
              </div>
              ข้อความของคุณ (Your Message)
            </label>
            
            <div className="relative group">
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
                rows={3}
                className="w-full px-6 py-5 rounded-2xl border-2 border-gray-200 bg-white focus:bg-white focus:ring-4 focus:ring-[#007947]/10 focus:border-[#007947] outline-none resize-none text-2xl text-gray-700 placeholder-gray-300 transition-all duration-300 font-kanit leading-relaxed shadow-inner"
                placeholder="พิมพ์สิ่งที่คิดอยู่ที่นี่..."
              />
              <div className="absolute bottom-4 right-4 text-xs text-gray-400 font-medium pointer-events-none bg-white/80 px-2 py-1 rounded-md backdrop-blur">
                {inputText.length} chars
              </div>
            </div>
            
            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm min-h-[24px]">
                {status === 'success' && (
                  <span className="text-[#007947] flex items-center font-bold animate-fade-in bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                    <div className="w-5 h-5 mr-2 bg-[#007947] rounded-full flex items-center justify-center text-white text-xs">✓</div>
                    ส่งข้อมูลเรียบร้อยแล้ว!
                  </span>
                )}
                {status === 'error' && (
                  <span className="text-[#F40000] flex items-center font-bold animate-fade-in bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                    <div className="w-5 h-5 mr-2 bg-[#F40000] rounded-full flex items-center justify-center text-white text-xs">!</div>
                    เกิดข้อผิดพลาด โปรดลองใหม่
                  </span>
                )}
              </div>
              
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !inputText.trim()}
                className={`group relative px-10 py-4 rounded-xl font-bold text-white text-lg shadow-lg transition-all duration-300 font-kanit overflow-hidden ${
                  isSubmitting || !inputText.trim()
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#007947] to-[#005f37] hover:shadow-[#007947]/40 hover:-translate-y-1 hover:shadow-xl active:translate-y-0'
                }`}
              >
                <span className="relative z-10 flex items-center">
                   {isSubmitting ? (
                     <>
                       <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                       กำลังส่ง...
                     </>
                   ) : (
                     <>
                       ส่งข้อความ
                       <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                     </>
                   )}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LiveDisplayPage: React.FC = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [entries, setEntries] = useState<string[]>([]); // Store array of strings
  const [entryCount, setEntryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const fetchedEntries = await fetchAllTexts();
        if (fetchedEntries.length > 0) {
            const textArray = fetchedEntries.map(e => e.input_text);
            setEntries(textArray);
            setEntryCount(fetchedEntries.length);
        }
      } catch (e) {
        console.error("Failed to load initial data", e);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToNewEntries((newEntry: WordCloudEntry) => {
      setEntries(prev => [newEntry.input_text, ...prev]); // Add new entry to start of array
      setEntryCount(prev => prev + 1);
      setLastUpdate(new Date());
    });

    return () => unsubscribe();
  }, []);

  // Debounced Cloud Generation
  useEffect(() => {
    if (entries.length === 0) {
        setImageUrl(null);
        return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        // Pass raw array to generator to preserve phrases
        const blob = await generateWordCloudBlob(entries);
        if (blob) {
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
        }
      } catch(e) {
        console.error("Generation failed", e);
      } finally {
        setLoading(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [entries]);

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-figtree">
      {/* Navbar Spacer */}
      <div className="h-[64px] flex-shrink-0"></div>

      {/* Dashboard Header */}
      <div className="bg-white px-8 py-4 flex justify-between items-center border-b border-gray-200 shadow-sm z-10 flex-shrink-0 relative">
        <div className="flex items-center space-x-8">
            <div className="flex items-center px-4 py-2 bg-gray-50 rounded-lg border border-gray-100">
                <span className="relative flex h-3 w-3 mr-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isBackendConfigured ? 'bg-[#007947]' : 'bg-yellow-400'} opacity-75`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isBackendConfigured ? 'bg-[#007947]' : 'bg-yellow-500'}`}></span>
                </span>
                <span className={`font-bold text-sm tracking-wider ${isBackendConfigured ? 'text-[#007947]' : 'text-yellow-600'}`}>
                    {isBackendConfigured ? 'LIVE SYSTEM ONLINE' : 'DEMO MODE ACTIVE'}
                </span>
            </div>
            <div className="hidden md:block h-8 w-px bg-gray-200"></div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Total Responses</span>
              <span className="text-[#F40000] text-2xl font-black font-kanit leading-none">{entryCount.toLocaleString()}</span>
            </div>
        </div>
        <div className="text-right hidden sm:block">
            <div className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Last Updated</div>
            <div className="font-mono text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
              {lastUpdate.toLocaleTimeString('th-TH')}
            </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative flex items-center justify-center p-4 md:p-10 overflow-hidden bg-slate-50">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{backgroundImage: 'radial-gradient(#007947 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
        </div>

        {loading && !imageUrl ? (
           <div className="flex flex-col items-center justify-center z-10 bg-white/80 p-12 rounded-[2rem] backdrop-blur-md shadow-xl border border-gray-100">
             <div className="relative w-24 h-24 mb-8">
               <div className="absolute inset-0 border-8 border-gray-100 rounded-full"></div>
               <div className="absolute inset-0 border-8 border-[#007947] rounded-full border-t-transparent animate-spin"></div>
             </div>
             <p className="text-[#007947] font-kanit text-2xl animate-pulse font-bold">กำลังประมวลผลความคิดเห็น...</p>
           </div>
        ) : !imageUrl ? (
            <div className="text-center text-gray-300 z-10">
                <svg className="w-32 h-32 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                <p className="text-4xl font-kanit font-light">รอรับข้อความแรก</p>
                <p className="text-lg mt-2 font-light">Waiting for incoming messages...</p>
            </div>
        ) : (
            <div className="relative w-full h-full max-w-[90%] max-h-[90%] flex items-center justify-center p-6 animate-fade-in">
              {/* Premium Frame */}
              <div className="absolute inset-0 border border-white bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]"></div>
              <div className="absolute top-4 left-4 right-4 bottom-4 border border-dashed border-gray-200 rounded-[1.5rem] pointer-events-none"></div>
              
              <img 
                  src={imageUrl} 
                  alt="Live Word Cloud" 
                  className="relative max-w-full max-h-full object-contain z-10 drop-shadow-xl"
              />
            </div>
        )}
      </div>
      
      {/* Footer / Status Bar */}
      <div className="bg-white border-t border-gray-200 py-2 px-8 text-xs text-gray-400 flex justify-between items-center">
          <span>CG&Risk Day Word Cloud System</span>
          <span>Powered by React & Google Sheets</span>
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
    <div className="min-h-screen bg-gray-50 flex flex-col font-figtree text-gray-800">
      <Navbar />
      
      <main className="flex-1 flex flex-col">
        {(currentPath === '#/' || currentPath === '') && <InputPage />}
        {currentPath === '#/live' && <LiveDisplayPage />}
      </main>
    </div>
  );
};

export default App;