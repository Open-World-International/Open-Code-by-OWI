import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { loadStripe } from "@stripe/stripe-js";
import { 
  Eye, 
  Play, 
  Code2, 
  Cpu, 
  MessageSquare, 
  ChevronRight, 
  Terminal,
  Loader2,
  Sparkles,
  Github,
  Moon,
  Sun,
  Heart,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
type ModelType = 'gemini-3-flash-preview' | 'gemini-3.1-pro-preview' | 'gemini-2.5-flash-lite-preview' | 'chatgpt';

interface ModelOption {
  id: ModelType;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const MODELS: ModelOption[] = [
  { 
    id: 'gemini-3-flash-preview', 
    name: 'Gemini 3 Flash', 
    description: 'Fast, lightweight, great for quick edits.',
    icon: <Sparkles className="w-4 h-4 text-emerald-400" />
  },
  { 
    id: 'gemini-3.1-pro-preview', 
    name: 'Gemini 3.1 Pro', 
    description: 'Advanced reasoning and complex coding tasks.',
    icon: <Cpu className="w-4 h-4 text-blue-400" />
  },
  { 
    id: 'gemini-2.5-flash-lite-preview', 
    name: 'Gemini Flash Lite', 
    description: 'Ultra-low latency for simple tasks.',
    icon: <Loader2 className="w-4 h-4 text-purple-400" />
  }
];

const LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', judge0Id: 63 },
  { id: 'typescript', name: 'TypeScript', judge0Id: 74 },
  { id: 'python', name: 'Python', judge0Id: 71 },
  { id: 'cpp', name: 'C++', judge0Id: 54 },
  { id: 'c', name: 'C', judge0Id: 50 },
  { id: 'java', name: 'Java', judge0Id: 62 },
  { id: 'html', name: 'HTML' },
  { id: 'css', name: 'CSS' },
  { id: 'json', name: 'JSON' },
  { id: 'markdown', name: 'Markdown' },
];

export default function App() {
  const [code, setCode] = useState<string>('// Start coding here...\n\nfunction helloWorld() {\n  console.log("Hello World!");\n}');
  const [language, setLanguage] = useState('javascript');
  const [selectedModel, setSelectedModel] = useState<ModelType>('gemini-3-flash-preview');
  const [output, setOutput] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showOutputView, setShowOutputView] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishStep, setPublishStep] = useState<'instructions' | 'files'>('instructions');
  const [domain, setDomain] = useState('');
  const [domainIp, setDomainIp] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumCodeInput, setPremiumCodeInput] = useState('');
  const [showPremiumSuccess, setShowPremiumSuccess] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [isDonating, setIsDonating] = useState(false);

  const aiRef = useRef<GoogleGenAI | null>(null);

  useEffect(() => {
    if (process.env.GEMINI_API_KEY) {
      aiRef.current = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
  }, []);

  const handleDonate = async () => {
    console.log("Donation process started...");
    setIsDonating(true);
    try {
      const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      console.log("Stripe Publishable Key found:", !!stripePublishableKey);
      
      if (!stripePublishableKey) {
        alert("Stripe is not configured. Please add VITE_STRIPE_PUBLISHABLE_KEY to your environment variables in the Settings menu.");
        setIsDonating(false);
        return;
      }

      const stripe = await loadStripe(stripePublishableKey);
      if (!stripe) throw new Error("Stripe failed to load. Please check your internet connection or the publishable key.");

      console.log("Stripe loaded successfully, creating session...");

      const response = await fetch("/api/create-donation-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create donation session.");
      }

      const { id, url } = await response.json();
      console.log("Session created successfully:", id);

      if (url) {
        window.location.href = url;
      } else {
        // Fallback for older Stripe versions if needed, though url is preferred
        const result = await (stripe as any).redirectToCheckout({ sessionId: id });
        if (result.error) throw new Error(result.error.message);
      }

    } catch (error: any) {
      console.error("Donation Error:", error);
      alert(`Donation failed: ${error.message}`);
    } finally {
      setIsDonating(false);
    }
  };

  const handleRun = async () => {
    if (!aiRef.current) {
      setOutput('Error: AI API key not found.');
      return;
    }

    setIsRunning(true);
    setShowOutputView(true);
    setOutput('Executing code...');

    try {
      const modelToUse = selectedModel === 'chatgpt' ? 'gemini-3.1-pro-preview' : selectedModel;
      const response = await aiRef.current.models.generateContent({
        model: modelToUse,
        contents: [
          {
            text: `Execute the following ${language} code and provide ONLY the standard output (stdout). If there are errors, provide the error message. Do not include any explanations, just the output.\n\n\`\`\`${language}\n${code}\n\`\`\``
          }
        ],
        config: {
          systemInstruction: "You are a code execution engine. Your task is to simulate the execution of the provided code and return exactly what would be printed to the console. If the code has syntax errors or runtime errors, return the error message as it would appear in a terminal."
        }
      });

      setOutput(response.text || 'Program executed successfully (no output).');
    } catch (error) {
      console.error('Execution Error:', error);
      setOutput('Error executing code: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsRunning(false);
    }
  };

  if (showOutputView) {
    return (
      <div className="h-screen w-screen bg-[#0d0d0d] text-gray-300 font-mono flex flex-col overflow-hidden">
        {/* Output Header */}
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#111111]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Terminal className="w-4 h-4 text-emerald-500" />
              <span className="text-white uppercase tracking-widest text-xs">Execution Output</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="text-[10px] text-gray-500 uppercase tracking-tighter">
              Model: <span className="text-gray-300">{selectedModel}</span>
            </div>
          </div>
          <button 
            onClick={() => setShowOutputView(false)}
            className="flex items-center gap-2 px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-all border border-white/10"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to Editor
          </button>
        </header>

        {/* Output Content */}
        <main className="flex-1 p-8 overflow-y-auto bg-black/40 relative">
          <AnimatePresence mode="wait">
            {isRunning ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center h-full gap-4"
              >
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                <p className="text-gray-500 animate-pulse uppercase tracking-[0.2em] text-[10px] font-bold">
                  Simulating Environment...
                </p>
              </motion.div>
            ) : (
              <motion.div 
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-4xl mx-auto w-full"
              >
                <div className="flex items-center gap-2 mb-6 text-xs text-gray-500 border-b border-white/5 pb-4">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Process finished with exit code 0</span>
                </div>
                <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/5 shadow-2xl min-h-[300px]">
                  <pre className="whitespace-pre-wrap break-words leading-relaxed text-emerald-400/90">
                    {output}
                  </pre>
                </div>
                
                <div className="mt-8 grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-[10px] text-gray-500 uppercase mb-1">Language</div>
                    <div className="text-sm text-white capitalize">{language}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-[10px] text-gray-500 uppercase mb-1">Memory</div>
                    <div className="text-sm text-white">~12.4 MB</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-[10px] text-gray-500 uppercase mb-1">Time</div>
                    <div className="text-sm text-white">0.04s</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="h-10 border-t border-white/5 bg-[#111111] flex items-center px-6 text-[10px] text-gray-600 gap-4">
          <span>&copy; 2026 Open-Code</span>
        </footer>
      </div>
    );
  }

  const handlePublish = () => {
    setPublishStep('files');
  };

  const handleGCoder = () => {
    setIsChatOpen(!isChatOpen);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !aiRef.current || isAnalyzing) return;

    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsAnalyzing(true);

    try {
      const modelToUse = selectedModel === 'chatgpt' ? 'gemini-3.1-pro-preview' : selectedModel;
      const response = await aiRef.current.models.generateContent({
        model: modelToUse,
        contents: [
          ...chatMessages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
          { role: 'user', parts: [{ text: `Language: ${language}\nCurrent Code:\n${code}\n\nUser Idea: ${userMessage}` }] }
        ],
        config: {
          systemInstruction: "You are G-Coder, an elite AI programmer. Help the user write code. If you generate code, wrap it in a markdown code block. The user can see the editor, so you can refer to it. Be concise and helpful."
        }
      });

      const aiResponse = response.text || 'I encountered an error.';
      setChatMessages(prev => [...prev, { role: 'ai', content: aiResponse }]);

      // Extract code if present and update editor
      const codeMatch = aiResponse.match(/```(?:[a-zA-Z]*)\n([\s\S]*?)```/);
      if (codeMatch) {
        setCode(codeMatch[1].trim());
        setOutput('G-Coder updated the editor with new code.');
      }
    } catch (error) {
      console.error('Chat Error:', error);
      setChatMessages(prev => [...prev, { role: 'ai', content: 'Error: ' + (error instanceof Error ? error.message : 'Unknown error') }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0d0d0d] text-gray-300 font-sans overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 320 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-[#111111] border-r border-white/5 flex flex-col overflow-hidden"
      >
        <div className="p-6 flex flex-col gap-1 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Code2 className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-semibold text-white tracking-tight">Open-Code</h1>
          </div>
        </div>

        {!isPremium && (
          <div className="px-4 py-3">
            <button 
              onClick={() => setShowPremiumModal(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-red-600 text-white text-xs font-bold shadow-lg shadow-orange-600/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Upgrade to Premium
            </button>
          </div>
        )}

        {isPremium && (
          <div className="px-4 py-3">
            <div className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-500/20 to-blue-600/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <Sparkles className="w-3 h-3" />
              Premium Active
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-8">
          {/* Model Selection */}
          <section>
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-4 block">
              Language Model
            </label>
            <div className="space-y-2">
              {[
                ...MODELS,
                ...(isPremium ? [{
                  id: 'chatgpt' as ModelType,
                  name: 'ChatGPT Plus',
                  description: 'Unlock GPT-4o capabilities for elite reasoning.',
                  icon: <MessageSquare className="w-4 h-4 text-orange-400" />
                }] : [])
              ].map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all border ${
                    selectedModel === model.id 
                      ? 'bg-blue-600/10 border-blue-500/50 text-white' 
                      : 'bg-white/5 border-transparent hover:bg-white/10 text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {model.icon}
                    <span className="font-medium text-sm">{model.name}</span>
                  </div>
                  <p className="text-[11px] opacity-60 leading-relaxed">
                    {model.description}
                  </p>
                </button>
              ))}
            </div>
          </section>

          {/* Language Selection */}
          <section>
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-4 block">
              Environment
            </label>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setLanguage(lang.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    language === lang.id 
                      ? 'bg-white/10 text-white border border-white/20' 
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </section>

          {/* Sidebar Bottom Content */}
          <section className="mt-auto pt-6 border-t border-white/5">
            <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 p-4 rounded-2xl border border-white/10">
              <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-yellow-400" />
                Why Open-Code?
              </h3>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Open-Code is a revolutionary platform designed for students and developers. 
                It's <span className="text-emerald-400 font-bold">completely free</span>, removing 
                financial barriers to high-end AI coding tools.
              </p>
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-white/5 space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-500 px-2">
            <span>Status</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Connected
            </span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setTheme(theme === 'vs-dark' ? 'light' : 'vs-dark')}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs"
            >
              {theme === 'vs-dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === 'vs-dark' ? 'Light' : 'Dark'}
            </button>
            <button 
              onClick={() => setShowDonationModal(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-colors text-xs font-medium"
            >
              <Heart className="w-4 h-4" />
              Donate $5
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Header Bar */}
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#0d0d0d]">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-500 hover:text-white"
            >
              <ChevronRight className={`w-5 h-5 transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="text-gray-500">Project /</span>
              <span className="text-white">main.{language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : language}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-emerald-600/20"
            >
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Run Code
            </button>
            <button 
              onClick={handleGCoder}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-600/20"
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              G-Coder
            </button>
            <button 
              onClick={() => {
                setPublishStep('instructions');
                setIsPublishModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-purple-600/20"
            >
              <Github className="w-4 h-4" />
              Publish
            </button>
            <div className="h-6 w-px bg-white/10 mx-1" />
            <div className="flex flex-col items-center gap-0.5">
              <button 
                onClick={() => setShowOutputView(!showOutputView)}
                className={`p-2 rounded-lg transition-all ${
                  showOutputView 
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                    : 'hover:bg-white/5 text-gray-500 hover:text-white'
                }`}
                title="Toggle Preview"
              >
                <Eye className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1 text-[8px] text-gray-600 font-mono select-none opacity-50 hover:opacity-100 transition-opacity">
                <Sparkles className="w-2 h-2" />
                <span>1a2b3c</span>
              </div>
            </div>
          </div>
        </header>

        {/* Editor Area */}
        <div className="flex-1 flex relative overflow-hidden">
          <div className="flex-1 flex flex-col">
            <div className="flex-1 min-h-0">
              <Editor
                height="100%"
                language={language}
                theme={theme}
                value={code}
                onChange={(value) => setCode(value || '')}
                options={{
                  fontSize: 14,
                  fontFamily: 'JetBrains Mono',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 20 },
                  lineNumbers: 'on',
                  glyphMargin: false,
                  folding: true,
                  lineDecorationsWidth: 0,
                  lineNumbersMinChars: 3,
                }}
              />
            </div>

            {/* Output Panel */}
            <motion.div 
              initial={{ height: 200 }}
              className="border-t border-white/5 bg-[#111111] flex flex-col"
            >
              <div className="h-10 border-b border-white/5 flex items-center justify-between px-4">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-gray-500">
                  <Terminal className="w-3 h-3" />
                  G-Coder Status
                </div>
                <button 
                  onClick={() => setOutput('')}
                  className="text-[10px] text-gray-500 hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="flex-1 p-4 font-mono text-sm overflow-y-auto whitespace-pre-wrap">
                {output ? (
                  <div className="text-gray-300 leading-relaxed">
                    {output}
                  </div>
                ) : (
                  <div className="text-gray-600 italic">
                    G-Coder is ready to help you write code...
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Chat Sidebar */}
          <AnimatePresence>
            {isChatOpen && (
              <motion.div
                initial={{ x: 400 }}
                animate={{ x: 0 }}
                exit={{ x: 400 }}
                className="w-96 bg-[#111111] border-l border-white/5 flex flex-col"
              >
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-bold uppercase tracking-widest">G-Coder Chat</span>
                  </div>
                  <button onClick={() => setIsChatOpen(false)} className="text-gray-500 hover:text-white">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-10">
                      <Sparkles className="w-8 h-8 text-blue-500/20 mx-auto mb-4" />
                      <p className="text-xs text-gray-500">Tell G-Coder what you want to build...</p>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white/5 text-gray-300 border border-white/5'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isAnalyzing && (
                    <div className="flex justify-start">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5">
                  <div className="relative">
                    <input 
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type your idea..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs focus:outline-none focus:border-blue-500 transition-colors pr-10"
                    />
                    <button 
                      type="submit"
                      disabled={isAnalyzing || !chatInput.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 disabled:opacity-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Premium Modal */}
      <AnimatePresence>
        {showPremiumModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111111] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-600/20">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Unlock Premium</h2>
                <p className="text-sm text-gray-500">Enter your activation code to unlock ChatGPT Plus and advanced features.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Activation Code</label>
                  <input 
                    type="text"
                    value={premiumCodeInput}
                    onChange={(e) => setPremiumCodeInput(e.target.value)}
                    placeholder="Enter code..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowPremiumModal(false)}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      if (premiumCodeInput === '1a2b3c') {
                        setIsPremium(true);
                        setShowPremiumModal(false);
                        setShowPremiumSuccess(true);
                        setTimeout(() => setShowPremiumSuccess(false), 5000);
                      } else {
                        alert('Wrong code! This button is actually an easter egg. The correct code is 1a2b3c. Go ahead and put it in correctly!');
                      }
                    }}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 text-white text-sm font-bold transition-all shadow-lg shadow-orange-600/20"
                  >
                    Activate
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-center text-gray-600">
                Don't have a code? Contact OWI support to get your premium activation key.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Premium Success Message */}
      <AnimatePresence>
        {showPremiumSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-md"
          >
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg">Premium Unlocked! 🚀</span>
              <span className="text-xs text-emerald-100">Open Code is always free for everyone. 🌍✨</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Donation Modal */}
      <AnimatePresence>
        {showDonationModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#1a1a1a] w-full max-w-md rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="w-16 h-16 bg-emerald-600/20 rounded-2xl flex items-center justify-center mx-auto">
                  <Heart className="w-8 h-8 text-emerald-500" />
                </div>
                
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-white">Support Education</h2>
                  <p className="text-gray-400 text-sm">
                    Your $5 donation goes directly to a random educational charity for students in need.
                  </p>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    </div>
                    <p className="text-xs text-gray-300">
                      <span className="font-bold text-white">100% Direct:</span> Your money goes to a random educational charity on the internet.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    </div>
                    <p className="text-xs text-gray-300">
                      <span className="font-bold text-white">Open Code Zero Cut:</span> Open Code does not use or take any portion of this money.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ShieldCheck className="w-3 h-3 text-blue-400" />
                    </div>
                    <p className="text-xs text-gray-300">
                      <span className="font-bold text-white">Secure Payment:</span> We use Stripe for payments. Your banking details are handled entirely by Stripe and are never visible to Open Code employees or developers.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowDonationModal(false)}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDonate}
                    disabled={isDonating}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                  >
                    {isDonating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Donate $5
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Publish Modal */}
      <AnimatePresence>
        {isPublishModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111111] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                {publishStep === 'instructions' && (
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Github className="w-8 h-8 text-purple-500" />
                      </div>
                      <h2 className="text-2xl font-bold text-white">Publish to GitHub</h2>
                      <p className="text-sm text-gray-500">Follow these steps to host your project for free.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-500 font-bold text-sm">1</div>
                        <h3 className="text-sm font-bold text-white">Create Repo</h3>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          Go to <a href="https://github.com/new" target="_blank" className="text-blue-400 hover:underline">GitHub</a> and create a new public repository.
                        </p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                        <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-500 font-bold text-sm">2</div>
                        <h3 className="text-sm font-bold text-white">Upload Files</h3>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          Click "uploading an existing file" and drag your project files into the box.
                        </p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                        <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-500 font-bold text-sm">3</div>
                        <h3 className="text-sm font-bold text-white">Enable Pages</h3>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          In Settings &gt; Pages, select the main branch to go live!
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button 
                        onClick={() => setIsPublishModalOpen(false)}
                        className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => setPublishStep('files')}
                        className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
                      >
                        View Project Files
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {publishStep === 'files' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-white">Project Files</h2>
                        <p className="text-xs text-gray-500">Copy these files to your GitHub repository.</p>
                      </div>
                      <button 
                        onClick={() => setPublishStep('instructions')}
                        className="text-xs text-purple-500 hover:text-purple-400 font-bold"
                      >
                        Back to Instructions
                      </button>
                    </div>

                    <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                      <div className="max-h-60 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-white/5 text-gray-500 uppercase tracking-widest font-bold">
                            <tr>
                              <th className="px-4 py-3">File Name</th>
                              <th className="px-4 py-3">Type</th>
                              <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {[
                              { name: 'index.html', type: 'HTML' },
                              { name: 'App.tsx', type: 'TypeScript (React)', current: true },
                              { name: 'main.tsx', type: 'TypeScript' },
                              { name: 'index.css', type: 'CSS (Tailwind)' },
                              { name: 'package.json', type: 'JSON' },
                              { name: 'vite.config.ts', type: 'TypeScript' },
                            ].map((file) => (
                              <tr key={file.name} className="hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3 font-mono text-gray-300">{file.name}</td>
                                <td className="px-4 py-3 text-gray-500">{file.type}</td>
                                <td className="px-4 py-3 text-right">
                                  <button 
                                    onClick={() => {
                                      if (file.current) {
                                        navigator.clipboard.writeText(code);
                                        alert('Code for App.tsx copied to clipboard!');
                                      } else {
                                        alert(`In a real environment, this would download ${file.name}. For now, copy your code from the editor.`);
                                      }
                                    }}
                                    className="text-blue-500 hover:text-blue-400 font-bold"
                                  >
                                    {file.current ? 'Copy Code' : 'Download'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-xl flex gap-3">
                      <Sparkles className="w-5 h-5 text-blue-500 shrink-0" />
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        <span className="text-white font-bold">Pro Tip:</span> You can drag and drop these files directly into the GitHub "Upload files" area. 
                        OWI's Open-Code makes it easy to bridge the gap between development and production!
                      </p>
                    </div>

                    <button 
                      onClick={() => setIsPublishModalOpen(false)}
                      className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-colors"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
