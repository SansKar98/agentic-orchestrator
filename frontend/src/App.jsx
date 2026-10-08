import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import WorkflowGraph from './WorkflowGraph';

const AGENT_MODES = ['Auto', 'Chat', 'Coding', 'PDF', 'Image', 'Search'];

function App() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState('Auto');
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Fetch all sessions on load
  useEffect(() => {
    fetchSessions();
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('http://localhost:5005/api/sessions');
      const data = await res.json();
      if (Array.isArray(data)) {
        setSessions(data);
        if (data.length > 0 && !activeSessionId) {
          loadSession(data[0]._id);
        }
      } else {
        console.error("Failed to fetch sessions: ", data.error);
        setSessions([]);
      }
    } catch (err) {
      console.error("Failed to fetch sessions");
      setSessions([]);
    }
  };

  const loadSession = async (id) => {
    setActiveSessionId(id);
    try {
      const res = await fetch(`http://localhost:5005/api/sessions/${id}/messages`);
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error("Failed to load messages");
    }
  };

  const createNewSession = async () => {
    try {
      const res = await fetch('http://localhost:5005/api/sessions', { method: 'POST' });
      const newSession = await res.json();
      setSessions([newSession, ...sessions]);
      setActiveSessionId(newSession._id);
      setMessages([]);
    } catch (err) {
      console.error("Failed to create session");
    }
  };

  const sendMessage = async () => {
    if (!prompt.trim()) return;
    
    // Create session if none exists
    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      try {
        const res = await fetch('http://localhost:5005/api/sessions', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: prompt.substring(0, 30) + "..." })
        });
        const newSession = await res.json();
        
        if (newSession._id) {
          setSessions([newSession, ...sessions]);
          currentSessionId = newSession._id;
          setActiveSessionId(currentSessionId);
        } else {
          throw new Error(newSession.error || "Failed to create session ID");
        }
      } catch (e) {
        setMessages(prev => [...prev, { role: 'agent', content: "Database error: Could not create a new chat session. Ensure MongoDB is connected and your IP is whitelisted." }]);
        return;
      }
    }

    const currentPrompt = prompt;
    setPrompt("");
    setLoading(true);

    // Optimistically add user message to UI
    setMessages(prev => [...prev, { role: 'user', content: currentPrompt }]);

    try {
      const res = await fetch(`http://localhost:5005/api/sessions/${currentSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentPrompt, mode }),
      });
      const data = await res.json();
      
      if (data.success) {
        setMessages(prev => [...prev.slice(0, -1), data.userMessage, data.agentMessage]);
        fetchSessions(); // Refresh titles/timestamps
      } else {
        setMessages(prev => [...prev, { role: 'agent', content: "Error: " + data.error }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'agent', content: "Network error: " + err.message }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex h-screen bg-[#0f1115] text-slate-200 font-sans">
      
      {/* Sidebar */}
      <div className="w-72 bg-[#171a21] border-r border-slate-800 flex flex-col p-4 hidden md:flex">
        <button 
          onClick={createNewSession}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 transition-colors rounded-xl font-semibold shadow flex items-center justify-center gap-2 mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          New Chat
        </button>
        
        <div className="text-xs font-semibold text-slate-500 uppercase mb-3 pl-2">Recent Sessions</div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {sessions.map(s => (
            <button 
              key={s._id}
              onClick={() => loadSession(s._id)}
              className={`w-full text-left px-4 py-3 rounded-xl truncate text-sm transition-all ${activeSessionId === s._id ? 'bg-[#252b36] text-blue-400 font-medium' : 'hover:bg-[#1e232c] text-slate-400'}`}
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        
        {/* Header (Mobile) */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-[#171a21]">
          <span className="font-semibold text-blue-400">Agentic Orchestrator</span>
          <button onClick={createNewSession} className="p-2 bg-blue-600 rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg></button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth custom-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
              <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
              </div>
              <h2 className="text-2xl font-bold">What can I help you orchestrate?</h2>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-5 ${m.role === 'user' ? 'bg-[#2563eb] text-white rounded-br-none shadow-blue-900/20' : 'bg-[#1e232c] border border-slate-700/50 rounded-bl-none shadow-xl'}`}>
                
                {m.role === 'agent' && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-400 flex items-center justify-center text-[10px] font-bold">A</span>
                    <span className="text-xs font-semibold text-slate-400">Agent Response</span>
                  </div>
                )}
                
                <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-slate-800 max-w-none">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>

                {/* Render Workflow Steps inside Agent bubble */}
                {m.steps && m.steps.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-slate-700/50">
                    <details className="group cursor-pointer">
                      <summary className="text-xs font-semibold text-slate-400 flex items-center gap-2 hover:text-slate-300 transition-colors">
                        <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        View Agent Workflow Network ({m.steps.length} Steps)
                      </summary>
                      <div className="mt-4 bg-[#0f1115] rounded-xl p-2 border border-slate-800">
                        <WorkflowGraph steps={m.steps} />
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-[#1e232c] border border-slate-700/50 rounded-2xl rounded-bl-none p-5 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-gradient-to-t from-[#0f1115] via-[#0f1115] to-transparent">
          <div className="max-w-4xl mx-auto bg-[#1e232c] border border-slate-700 rounded-3xl p-3 shadow-2xl focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
            
            {/* Agent Mode Selector */}
            <div className="flex gap-2 px-2 pb-3 overflow-x-auto custom-scrollbar">
              {AGENT_MODES.map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${mode === m ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#252b36] text-slate-400 hover:bg-[#2d3442] hover:text-slate-200'}`}
                >
                  {m === 'Auto' && '⚡ '}
                  {m === 'Chat' && '💬 '}
                  {m === 'Coding' && '</> '}
                  {m === 'PDF' && '📄 '}
                  {m === 'Image' && '🖼️ '}
                  {m === 'Search' && '🌐 '}
                  {m}
                </button>
              ))}
            </div>

            <div className="flex items-end gap-3">
              <textarea
                className="w-full bg-transparent text-slate-200 px-4 py-2 max-h-32 focus:outline-none resize-none"
                rows="1"
                placeholder={`Message Agentic Orchestrator (${mode} mode)...`}
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              ></textarea>
              <button 
                onClick={sendMessage}
                disabled={loading || !prompt.trim()}
                className="p-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 rounded-full text-white transition-colors flex-shrink-0 mb-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              </button>
            </div>
          </div>
          <div className="text-center text-[10px] text-slate-500 mt-4">
            Agentic Orchestrator can make mistakes. Consider verifying important information.
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
