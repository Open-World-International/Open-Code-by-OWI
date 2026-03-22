import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { GoogleGenAI, GenerateContentResponse, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
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
  ShieldCheck,
  Send,
  User,
  Bot,
  Settings,
  Plus,
  Zap,
  X
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
    name: 'v1.0 Standard', 
    description: 'Optimized for speed and efficiency.',
    icon: <Zap className="w-4 h-4 text-yellow-400" />
  },
  { 
    id: 'gemini-3.1-pro-preview', 
    name: 'v2.0 Advanced', 
    description: 'Deep reasoning and complex logic.',
    icon: <Cpu className="w-4 h-4 text-blue-400" />
  },
  { 
    id: 'gemini-2.5-flash-lite-preview', 
    name: 'v0.5 Lite', 
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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishStep, setPublishStep] = useState<'login' | 'config' | 'publishing' | 'success'>('login');
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [repoName, setRepoName] = useState('my-open-code-project');
  const [publishUrl, setPublishUrl] = useState('');
  const [publishError, setPublishError] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [domain, setDomain] = useState('');
  const [domainIp, setDomainIp] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');
  const [isPremium, setIsPremium] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyError, setApiKeyError] = useState('');
  const [showApiKeySuccess, setShowApiKeySuccess] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [isDonating, setIsDonating] = useState(false);
  const [installedModels, setInstalledModels] = useState<ModelType[]>(['gemini-3-flash-preview', 'gemini-3.1-pro-preview', 'gemini-2.5-flash-lite-preview']);
  const [isInstalling, setIsInstalling] = useState(false);

  const aiRef = useRef<GoogleGenAI | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isAnalyzing]);

  useEffect(() => {
    const savedKey = localStorage.getItem('userGeminiApiKey');
    if (savedKey) {
      aiRef.current = new GoogleGenAI({ apiKey: savedKey });
      setIsPremium(true);
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GITHUB_AUTH_SUCCESS') {
        setGithubToken(event.data.token);
        setPublishStep('config');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGitHubLogin = () => {
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    window.open(
      '/api/auth/github',
      'github_oauth',
      `width=${width},height=${height},left=${left},top=${top}`
    );
  };

  const handlePublishToGitHub = async () => {
    if (!githubToken || !repoName) return;
    
    setIsPublishing(true);
    setPublishStep('publishing');
    setPublishError('');

    try {
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: githubToken,
          repoName,
          description: "Created with Open-Code"
        })
      });

      const data = await response.json();
      if (data.success) {
        setPublishUrl(data.url);
        setPublishStep('success');
      } else {
        throw new Error(data.error || 'Failed to publish');
      }
    } catch (error: any) {
      console.error('Publish Error:', error);
      setPublishError(error.message);
      setPublishStep('config');
    } finally {
      setIsPublishing(false);
    }
  };

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
      setOutput('Error: AI is not configured. Click "Unlock AI Potential" in the sidebar and enter your Gemini API key to get started.');
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
          systemInstruction: "You are a code execution engine. Your task is to simulate the execution of the provided code and return exactly what would be printed to the console. If the code has syntax errors or runtime errors, return the error message as it would appear in a terminal.",
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE }
          ]
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

  const handleSaveApiKey = () => {
    const key = apiKeyInput.trim();
    if (!key.startsWith('AIza') || key.length < 30) {
      setApiKeyError('That doesn\'t look like a valid Gemini API key. It should start with "AIza".');
      return;
    }
    localStorage.setItem('userGeminiApiKey', key);
    aiRef.current = new GoogleGenAI({ apiKey: key });
    setIsPremium(true);
    setApiKeyInput('');
    setApiKeyError('');
    setShowApiKeyModal(false);
    setShowApiKeySuccess(true);
    setTimeout(() => setShowApiKeySuccess(false), 4000);
  };

  const handleRemoveApiKey = () => {
    localStorage.removeItem('userGeminiApiKey');
    aiRef.current = null;
    setIsPremium(false);
    setShowApiKeyModal(false);
  };

  const handleOpenAI = () => {
    if (!aiRef.current) {
      setShowApiKeyModal(true);
      return;
    }
    setIsChatOpen(!isChatOpen);
  };

  const handleSendMessage = async (e?: React.FormEvent, overrideMessage?: string) => {
    if (e) e.preventDefault();
    const messageToSend = overrideMessage || chatInput;
    if (!messageToSend.trim() || !aiRef.current || isAnalyzing) return;

    const userMessage = messageToSend.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsAnalyzing(true);

    try {
      const modelToUse = selectedModel === 'chatgpt' ? 'gemini-3.1-pro-preview' : selectedModel;
      
      // We provide the app's own source code to the AI so it knows "inside out"
      const appSourceContext = `
        You are an AI coding assistant inside Open-Code, a free AI-driven code editor.
        You help users write, understand, and improve code using their own Gemini API key.
        Be practical, concise, and helpful. Write any code the user asks for.
        Models available: gemini-3-flash-preview, gemini-3.1-pro-preview, gemini-2.5-flash-lite-preview.
        If the user asks to switch model, include "modelSwitch": "[model_id]" in your JSON response.
      `;

      const response = await aiRef.current.models.generateContent({
        model: modelToUse,
        contents: [
          ...chatMessages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
          { role: 'user', parts: [{ text: `Language: ${language}\nCurrent Editor Code:\n${code}\n\nUser Message: ${userMessage}` }] }
        ],
        config: {
          systemInstruction: `${appSourceContext}
          
          APP CONTROL CAPABILITIES:
          You can control the app by including these fields in your JSON:
          - "modelSwitch": Switch the AI model (e.g., 'gemini-3.1-pro-preview').
          - "languageSwitch": Change the editor language (e.g., 'python', 'javascript', 'cpp').
          - "setPremium": Set to true to unlock premium features, or false to deactivate them. ONLY do this if the user explicitly asks to activate/deactivate premium.
          - "triggerPublish": Set to true to open the publish modal or start publishing.
          - "toggleSidebar": Set to true/false to open/close the sidebar.
          - "toggleOutput": Set to true/false to show/hide the execution output panel.
          - "installAI": Set to the name of an AI to "install" it (simulated).
          
          CRITICAL RULES:
          1. Speak like a human. Be practical and helpful.
          2. If you update the code in the editor, provide the FULL code in the "code" field.
          3. ALWAYS return a JSON object.`,
          responseMimeType: "application/json",
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE }
          ],
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              explanation: { type: Type.STRING },
              code: { type: Type.STRING, description: "The updated code for the editor (if any)" },
              modelSwitch: { type: Type.STRING, description: "The ID of the model to switch to" },
              languageSwitch: { type: Type.STRING, description: "The ID of the language to switch to" },
              setPremium: { type: Type.BOOLEAN, description: "Unlock premium features" },
              triggerPublish: { type: Type.BOOLEAN, description: "Open publish modal" },
              toggleSidebar: { type: Type.BOOLEAN, description: "Open/close sidebar" },
              toggleOutput: { type: Type.BOOLEAN, description: "Show/hide output panel" },
              installAI: { type: Type.STRING, description: "Name of AI to install" }
            },
            required: ["explanation"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      const aiResponse = data.explanation || 'I processed your request.';
      let systemNotes = [];

      // Handle App Controls
      if (data.modelSwitch) {
        const newModel = data.modelSwitch as ModelType;
        if (MODELS.find(m => m.id === newModel) || newModel === 'chatgpt') {
          setSelectedModel(newModel);
          systemNotes.push(`Engine updated to ${newModel}`);
        }
      }

      if (data.languageSwitch) {
        const newLang = data.languageSwitch.toLowerCase();
        if (LANGUAGES.find(l => l.id === newLang)) {
          setLanguage(newLang);
          systemNotes.push(`Language changed to ${newLang}`);
        }
      }

      if (data.setPremium !== undefined) {
        setIsPremium(data.setPremium);
        systemNotes.push(`Premium features ${data.setPremium ? 'unlocked' : 'deactivated'}`);
      }

      if (data.triggerPublish === true) {
        setIsPublishModalOpen(true);
        setPublishStep(githubToken ? 'config' : 'login');
        systemNotes.push(`Publishing panel opened`);
      }

      if (data.toggleOutput !== undefined) {
        setShowOutputView(data.toggleOutput);
        systemNotes.push(`Output panel ${data.toggleOutput ? 'opened' : 'closed'}`);
      }

      if (data.installAI) {
        setIsInstalling(true);
        setTimeout(() => {
          setIsInstalling(false);
          systemNotes.push(`${data.installAI} installed successfully.`);
          setChatMessages(prev => [...prev, { 
            role: 'ai', 
            content: `I've added ${data.installAI} to your available models. Note: The underlying engine is Gemini via your API key.` 
          }]);
        }, 3000);
      }

      const finalMessage = systemNotes.length > 0 
        ? `${aiResponse}\n\n[System: ${systemNotes.join(', ')}]`
        : aiResponse;

      setChatMessages(prev => [...prev, { role: 'ai', content: finalMessage }]);

      if (data.code) {
        setCode(data.code.trim());
        setOutput('AI updated the editor with new code.');
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
      <aside 
        className="w-80 bg-[#111111] border-r border-white/5 flex flex-col overflow-hidden z-[60]"
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
              onClick={() => setShowApiKeyModal(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-purple-700 text-white text-xs font-bold shadow-lg shadow-blue-600/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Unlock AI Potential
            </button>
          </div>
        )}

        {isPremium && (
          <div className="px-4 py-3">
            <button
              onClick={() => setShowApiKeyModal(true)}
              className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-500/20 to-blue-600/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Sparkles className="w-3 h-3" />
              AI Active — Manage Key
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-8">
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

          {/* Why Open-Code? */}
          <section>
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

          {/* AI Models */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                AI Models
              </label>
              {isPremium && (
                <button 
                  onClick={() => {
                    setChatMessages(prev => [...prev, { role: 'user', content: 'I want to update to a new AI' }]);
                    handleSendMessage(null as any, 'I want to update to a new AI');
                  }}
                  className="text-[9px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-tighter flex items-center gap-1"
                >
                  <Plus className="w-2.5 h-2.5" />
                  Update AI
                </button>
              )}
            </div>
            <div className="space-y-2">
              {MODELS.filter(m => installedModels.includes(m.id)).map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all border ${
                    selectedModel === model.id 
                      ? 'bg-blue-600/10 border-blue-500/50 text-white' 
                      : 'bg-white/5 border-transparent hover:bg-white/10 text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {model.icon}
                    <span className="font-medium text-sm">{model.name}</span>
                  </div>
                </button>
              ))}
              {isInstalling && (
                <div className="p-3 rounded-xl bg-white/5 border border-dashed border-white/10 flex items-center gap-3">
                  <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                  <span className="text-[10px] text-gray-500 italic">Installing new AI version...</span>
                </div>
              )}
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
          <a 
            href="https://github.com/Open-World-International/Open-Code-by-OWI"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 transition-all text-xs font-bold mt-2"
          >
            <Github className="w-4 h-4" />
            GitHub Repository
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Header Bar */}
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#0d0d0d]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="text-gray-500 ml-2">Project /</span>
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
              onClick={handleOpenAI}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-600/20"
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              AI Assistant
            </button>
            <button 
              onClick={() => {
                setPublishStep(githubToken ? 'config' : 'login');
                setIsPublishModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-purple-600/20"
            >
              <Github className="w-4 h-4" />
              Publish
            </button>
            <div className="h-6 w-px bg-white/10 mx-1" />
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
          </div>
        </header>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0">
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
          </div>

          {/* Chat Bottom Panel */}
          <AnimatePresence>
            {isChatOpen && (
              <motion.div
                initial={{ y: 400 }}
                animate={{ y: 0 }}
                exit={{ y: 400 }}
                className="h-[400px] bg-[#111111] border-t border-white/5 flex flex-col"
              >
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-bold uppercase tracking-widest">AI Chat</span>
                  </div>
                  <button onClick={() => setIsChatOpen(false)} className="text-gray-500 hover:text-white">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </button>
                </div>

                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
                >
                  {output && !showOutputView && (
                    <div className="p-3 rounded-xl bg-blue-600/10 border border-blue-500/20 text-[11px] text-blue-400 flex items-center gap-2 mb-2">
                      <Sparkles className="w-3 h-3" />
                      {output}
                      <button onClick={() => setOutput('')} className="ml-auto opacity-50 hover:opacity-100">×</button>
                    </div>
                  )}
                  {chatMessages.length === 0 && (
                    <div className="text-center py-10">
                      <Sparkles className="w-8 h-8 text-blue-500/20 mx-auto mb-4" />
                      <p className="text-xs text-gray-500">Ask the AI to help you write or improve code...</p>
                    </div>
                  )}
                  <div className="flex flex-col gap-6 max-w-4xl mx-auto">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 px-1">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-600/20' : 'bg-emerald-600/20'}`}>
                            {msg.role === 'user' ? <User className="w-3 h-3 text-blue-500" /> : <Bot className="w-3 h-3 text-emerald-500" />}
                          </div>
                          <span className={`text-[10px] uppercase font-bold tracking-widest ${msg.role === 'user' ? 'text-blue-500' : 'text-emerald-500'}`}>
                            {msg.role === 'user' ? 'You' : 'AI'}
                          </span>
                        </div>
                        <div className={`p-5 rounded-2xl text-xs leading-relaxed border ${
                          msg.role === 'user' 
                            ? 'bg-blue-600/5 border-blue-500/10 text-blue-100' 
                            : 'bg-white/5 text-gray-300 border-white/5'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                  {isAnalyzing && (
                    <div className="flex justify-start">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="p-4 pb-6 border-t border-white/5 bg-[#111111]">
                  <div className="relative max-w-4xl mx-auto">
                    <input 
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type your idea..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 transition-colors pr-12"
                    />
                    <button 
                      type="submit"
                      disabled={isAnalyzing || !chatInput.trim()}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-white/5 text-white rounded-lg transition-all shadow-lg shadow-blue-600/20"
                      title="Send Message"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* API Key Modal */}
      <AnimatePresence>
        {showApiKeyModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111111] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Unlock AI Potential</h2>
                <p className="text-sm text-gray-400">
                  Connect your own free Gemini API key to power all AI features — no subscriptions, no shared limits.
                </p>
              </div>

              <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">How to get a free API key</p>
                <ol className="text-xs text-gray-400 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Go to <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-medium">aistudio.google.com/apikey</a></li>
                  <li>Sign in with your Google account</li>
                  <li>Click <span className="text-white font-medium">"Create API Key"</span></li>
                  <li>Copy the key and paste it below</li>
                </ol>
                <p className="text-[10px] text-gray-600 mt-1">Your key is stored only in your browser and never sent to our servers.</p>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Your Gemini API Key</label>
                <input 
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => { setApiKeyInput(e.target.value); setApiKeyError(''); }}
                  placeholder="AIza..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
                {apiKeyError && (
                  <p className="text-xs text-red-400">{apiKeyError}</p>
                )}
              </div>

              <div className="flex gap-3">
                {isPremium && (
                  <button 
                    onClick={handleRemoveApiKey}
                    className="flex-1 py-3 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-bold transition-colors border border-red-500/20"
                  >
                    Remove Key
                  </button>
                )}
                <button 
                  onClick={() => { setShowApiKeyModal(false); setApiKeyError(''); }}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveApiKey}
                  disabled={!apiKeyInput.trim()}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-700 disabled:opacity-40 text-white text-sm font-bold transition-all shadow-lg shadow-blue-600/20"
                >
                  Activate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* API Key Success Toast */}
      <AnimatePresence>
        {showApiKeySuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-blue-700 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-blue-500/50 backdrop-blur-md"
          >
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg">AI Unlocked!</span>
              <span className="text-xs text-blue-200">Your Gemini API key is active and ready to use.</span>
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
              className="bg-[#111111] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                {publishStep === 'login' && (
                  <div className="space-y-6 text-center">
                    <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Github className="w-8 h-8 text-purple-500" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-white">Connect GitHub</h2>
                      <p className="text-sm text-gray-500">Login with your GitHub account to sync your project.</p>
                    </div>
                    <button 
                      onClick={handleGitHubLogin}
                      className="w-full py-3 rounded-xl bg-white text-black hover:bg-gray-200 text-sm font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Github className="w-4 h-4" />
                      Login with GitHub
                    </button>
                    <button 
                      onClick={() => setIsPublishModalOpen(false)}
                      className="text-xs text-gray-500 hover:text-white transition-colors"
                    >
                      Maybe later
                    </button>
                  </div>
                )}

                {publishStep === 'config' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center">
                        <Github className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Repository Settings</h2>
                        <p className="text-xs text-gray-500">Choose a name for your new repository.</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Repository Name</label>
                        <input 
                          type="text"
                          value={repoName}
                          onChange={(e) => setRepoName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                          placeholder="my-awesome-project"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                        />
                      </div>

                      {publishError && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                          {publishError}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button 
                          onClick={() => setIsPublishModalOpen(false)}
                          className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handlePublishToGitHub}
                          disabled={!repoName || isPublishing}
                          className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-bold transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
                        >
                          {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          Publish Now
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {publishStep === 'publishing' && (
                  <div className="py-12 text-center space-y-6">
                    <div className="relative w-20 h-20 mx-auto">
                      <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full" />
                      <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      <Github className="absolute inset-0 m-auto w-8 h-8 text-purple-500" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-bold text-white">Syncing to GitHub...</h2>
                      <p className="text-sm text-gray-500">Creating repository and pushing your files.</p>
                    </div>
                  </div>
                )}

                {publishStep === 'success' && (
                  <div className="space-y-6 text-center">
                    <div className="w-16 h-16 bg-emerald-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-white">Successfully Published!</h2>
                      <p className="text-sm text-gray-500">Your project is now live on GitHub.</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 break-all">
                      <a 
                        href={publishUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline text-sm font-mono"
                      >
                        {publishUrl}
                      </a>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setIsPublishModalOpen(false)}
                        className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-colors"
                      >
                        Close
                      </button>
                      <a 
                        href={publishUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                      >
                        View on GitHub
                        <ChevronRight className="w-4 h-4" />
                      </a>
                    </div>
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
