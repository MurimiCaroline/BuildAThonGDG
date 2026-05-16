import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, CheckCircle, ShieldAlert, FileText, ChevronRight, MessageSquare, Loader, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

// Simple base64 encode
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// Notification Sound Sound Effect (Synthesized short blip)
const playBlip = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.start();
    gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    // Ignore if audio context not permitted
  }
};

export default function App() {
  const [messages, setMessages] = useState<{role: 'user'|'assistant', content: string}[]>([{
    role: 'assistant',
    content: "Welcome to Mradi wa Ardhi. I am Bwana, your land transaction risk analyst. Please upload your title deed, sale agreement, or seller ID, and tell me what you'd like me to check."
  }]);
  const [inputText, setInputText] = useState('');
  const [statusLogs, setStatusLogs] = useState<{type: string, text?: string, message?: string}[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [score, setScore] = useState<number | null>(null);
  const [quote, setQuote] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, statusLogs]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const newMsgs = [...messages, { role: 'user' as const, content: inputText }];
    setMessages(newMsgs);
    setInputText('');
    await processRequest(newMsgs);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      const newMsgs = [...messages, { role: 'user' as const, content: `Uploaded document: ${file.name}` }];
      setMessages(newMsgs);
      await processRequest(newMsgs, base64, file.type);
    } catch (err) {
      console.error(err);
    }
  };

  const processRequest = async (currentMessages: typeof messages, documentBase64?: string, documentType?: string) => {
    setIsProcessing(true);
    setStatusLogs([]);
    setReport(null);
    setScore(null);
    setQuote(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages,
          documentBase64,
          documentType
        })
      });

      if (!response.body) throw new Error("No readable stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
        } else {
          buffer += decoder.decode();
        }
        
        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const chunk = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          
          if (chunk.startsWith('data: ')) {
            try {
              const data = JSON.parse(chunk.slice(6));
              
              if (data.type === 'thinking' || data.type === 'status') {
                setStatusLogs(prev => [...prev, data]);
                playBlip();
              } else if (data.type === 'result') {
                setReport(data.text);
                if (data.score) setScore(data.score);
                if (data.quote) setQuote(data.quote);
                setMessages(prev => [...prev, { role: 'assistant', content: "Here is your risk analysis report." }]);
              } else if (data.type === 'error') {
                setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
              } else if (data.type === 'done_ingestion') {
                setMessages(prev => [...prev, { role: 'assistant', content: "Document ingested successfully. What would you like me to check?" }]);
              }
            } catch (err) {
              console.error("Failed to parse SSE event:", chunk, err);
            }
          }
          boundary = buffer.indexOf('\n\n');
        }
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'assistant', content: "Mawasiliano yamekatika / Connection failed. Please try again." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f2ed] font-sans text-[#1a1a1a] flex flex-col items-center">
      
      {/* Top Nav */}
      <header className="w-full bg-white shadow-sm px-6 py-4 flex items-center justify-between z-10 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold">M</div>
          <h1 className="text-xl font-bold tracking-tight">Mradi wa Ardhi</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
          <div className="flex items-center gap-1"><Lock size={14} /> Secured</div>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 lg:p-8">
        
        {/* Left Column: Chat & Interaction */}
        <div className="lg:col-span-5 flex flex-col gap-4 h-[calc(100vh-8rem)]">
          <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex-1 overflow-hidden flex flex-col border border-gray-100">
            
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
              {messages.map((m, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={i} 
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${m.role === 'user' ? 'bg-orange-600 text-white rounded-br-none' : 'bg-[#f5f5f5] text-gray-800 rounded-bl-none'}`}>
                    {m.content}
                  </div>
                </motion.div>
              ))}

              {/* Status Logs / Thinking Protocol */}
              <AnimatePresence>
                {statusLogs.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-[#151619] text-gray-300 font-mono text-xs rounded-xl p-4 shadow-inner mt-4 overflow-hidden"
                  >
                    {statusLogs.map((log, i) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i }}
                        key={i} 
                        className="mb-2 last:mb-0 border-l-2 border-orange-500 pl-3 leading-relaxed whitespace-pre-wrap"
                      >
                        {log.text}
                      </motion.div>
                    ))}
                    {isProcessing && (
                      <div className="flex flex-col items-start gap-2 mt-3 pl-3 pt-2 border-t border-gray-800">
                         <div className="flex items-center gap-2 text-orange-400">
                            <Loader className="animate-spin w-3 h-3" />
                            <span className="animate-pulse">Tafadhali subiri...</span>
                         </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-3">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload} 
                accept="image/*,application/pdf"
              />
              <div className="flex gap-2">
                 <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[#f0ece5] text-gray-700 p-3 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center"
                  title="Upload Document"
                  disabled={isProcessing}
                >
                  <UploadCloud size={20} />
                </button>
                <form onSubmit={handleSend} className="flex-1 flex gap-2 relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    disabled={isProcessing}
                    placeholder="Ask a question or request an analysis..."
                    className="flex-1 bg-[#f5f5f5] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-medium placeholder-gray-400"
                  />
                  <button 
                    type="submit" 
                    disabled={isProcessing || !inputText.trim()}
                    className="bg-orange-600 text-white px-4 py-3 rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-bold"
                  >
                    <ChevronRight size={20} />
                  </button>
                </form>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Report & Dashboard Elements */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <AnimatePresence mode="popLayout">
            {!report ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-10 shadow-[0_4px_20px_rgba(0,0,0,0.05)] min-h-[500px] flex flex-col items-center justify-center text-center text-gray-400 border border-gray-100"
              >
                <ShieldAlert size={64} className="mb-6 opacity-20" />
                <h2 className="text-2xl font-bold mb-2 text-gray-500">No active analysis</h2>
                <p className="max-w-md">Upload a document and ask Bwana to analyse the transaction risk. The full LandScore report will appear here.</p>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {/* Score Widget */}
                <div className="bg-white rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center border border-gray-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full blur-3xl -mr-10 -mt-10 opacity-50 pointer-events-none"></div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-6 w-full text-left">LandScore Risk Rating</h3>
                  
                  <div className="relative flex items-center justify-center mb-4">
                    <svg className="w-40 h-40 transform -rotate-90">
                      <circle cx="80" cy="80" r="70" fill="transparent" stroke="#f0f0f0" strokeWidth="12" />
                      <circle 
                        cx="80" 
                        cy="80" 
                        r="70" 
                        fill="transparent" 
                        stroke={score && score >= 80 ? '#22c55e' : score && score >= 50 ? '#eab308' : '#ef4444'} 
                        strokeWidth="12" 
                        strokeDasharray={440} 
                        strokeDashoffset={440 - (440 * (score || 0)) / 100}
                        className="transition-all duration-1000 ease-out"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                       <span className="text-4xl font-bold font-mono tracking-tighter text-gray-900">{score}</span>
                       <span className="text-xs text-gray-400 font-bold uppercase">/ 100</span>
                    </div>
                  </div>
                  
                  <div className="w-full flex items-center justify-between mt-4 px-2">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Status</span>
                      <span className={`text-lg font-bold ${score && score >= 80 ? 'text-green-600' : score && score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {score && score >= 80 ? 'Low Risk' : score && score >= 50 ? 'Moderate' : 'High Risk'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Insurance Widget */}
                <div className="bg-[#151619] text-white rounded-3xl p-6 shadow-[0_20px_40px_rgba(0,0,0,0.15)] flex flex-col justify-between border border-gray-800">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-2">Title Insurance Premium</h3>
                    <p className="text-sm text-gray-500">Estimated one-time premium to secure this transaction against legal defects.</p>
                  </div>
                  
                  <div className="my-6">
                    <div className="text-4xl font-mono tracking-tight font-light flex items-baseline gap-2">
                      <span className="text-lg text-gray-400 uppercase tracking-widest">KSh</span> 
                      {quote?.toLocaleString() || '---'}
                    </div>
                  </div>

                  <button className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">
                    Request Binding Quote
                  </button>
                </div>

                {/* Full Report Area */}
                <div className="md:col-span-2 bg-white rounded-3xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100 max-w-none">
                   <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-6 border-b border-gray-100 pb-4">Synthesised Report</h3>
                   <div className="markdown-body [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mb-4 [&>h2]:mt-6 [&>h3]:text-lg [&>h3]:font-bold [&>h3]:mb-3 [&>h3]:mt-5 [&>p]:mb-4 [&>p]:text-gray-700 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>ul>li]:mb-1 [&>ul>li]:text-gray-700 [&>strong]:font-bold">
                     <ReactMarkdown>{report}</ReactMarkdown>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
