import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  Code2,
  FolderOpen,
  RefreshCw,
  Camera,
  Wifi,
  WifiOff,
  Play,
  Trash2,
  Save,
  Plus,
  FileText,
  X,
  MessageSquare,
  Send,
  Loader2,
  ChevronDown,
  Sparkles,
  Link2,
  Check,
  Globe,
  Copy,
  Pencil,
  Maximize,
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useApp } from '../AppContext';
import { createOpenRouterClient, OpenRouterModel } from '../lib/openrouter';
import {
  publishPageToSupabase,
  getSharedPageFromSupabase,
  listSharedPagesFromSupabase,
  deleteSharedPageFromSupabase,
  SharedPageData,
} from '../lib/supabase';

// === Types ===
type ViewportSize = 'mobile' | 'tablet' | 'desktop' | 'full';
type PreviewMode = 'sandbox' | 'server';
type ServerStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface PageFile {
  name: string;
  path: string;
  size: number;
  modified: string;
  type: string;
}

interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
  codeApplied?: boolean;
}

const VIEWPORT_PRESETS: Record<ViewportSize, { width: number; height: number; label: string }> = {
  mobile: { width: 375, height: 812, label: 'Mobile' },
  tablet: { width: 768, height: 1024, label: 'Tablet' },
  desktop: { width: 1440, height: 900, label: 'Desktop' },
  full: { width: 0, height: 0, label: 'Full' },
};

const PREVIEW_SERVER_URL = 'http://localhost:3456';

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0a0a;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 2rem;
    }
    h1 { font-size: 2rem; margin-bottom: 1rem; }
    p { color: #888; max-width: 500px; line-height: 1.6; }
  </style>
</head>
<body>
  <div>
    <h1>Hello Preview</h1>
    <p>Cole ou escreva seu HTML aqui. O preview atualiza automaticamente.</p>
  </div>
</body>
</html>`;

const AI_SYSTEM_PROMPT = `You are a frontend developer assistant that modifies HTML/CSS/JS code for landing pages.

CRITICAL FORMAT RULES:
1. Write a 1-line summary of your change
2. Then return the COMPLETE modified HTML inside a SINGLE code block:
\`\`\`html
<!DOCTYPE html>
...full code here...
</html>
\`\`\`
3. NEVER return partial code or just the changed snippet
4. ALWAYS use \`\`\`html to open and \`\`\` to close the code block
5. The code block MUST contain the entire file from <!DOCTYPE> to </html>

Other rules:
- Make ONLY the requested change — do not refactor or reorganize anything else
- Keep all existing styles, scripts, and structure unless told otherwise
- Be precise and minimal — only change what was asked
- Respond in the same language as the user (Portuguese if they write in Portuguese)`;

// === Sandbox Storage ===
const SANDBOX_STORAGE_KEY = 'nhp_preview_sandbox';
const SANDBOX_FILES_KEY = 'nhp_preview_sandbox_files';
const AI_CHAT_KEY = 'nhp_preview_ai_chat';
const AI_MODEL_KEY = 'nhp_preview_ai_model';
const SHARED_PAGES_KEY = 'nhp_shared_pages';

interface SandboxFile {
  name: string;
  content: string;
  createdAt: string;
}

interface SharedPage {
  id: string;
  title: string;
  html: string;
  createdAt: string;
  viewport?: string;
}

function generateShareId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 6)}`;
}

function loadSharedPages(): SharedPage[] {
  try {
    const stored = localStorage.getItem(SHARED_PAGES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveSharedPages(pages: SharedPage[]) {
  try {
    localStorage.setItem(SHARED_PAGES_KEY, JSON.stringify(pages));
  } catch {}
}

function getSharedPage(id: string): SharedPage | null {
  const pages = loadSharedPages();
  return pages.find(p => p.id === id) || null;
}

function publishPage(html: string, title?: string, viewport?: string): SharedPage {
  const page: SharedPage = {
    id: generateShareId(),
    title: title || extractTitleFromHtml(html) || `Page ${new Date().toLocaleString('pt-BR')}`,
    html,
    createdAt: new Date().toISOString(),
    viewport,
  };
  const pages = loadSharedPages();
  pages.unshift(page);
  // Keep max 50 shared pages
  if (pages.length > 50) pages.splice(50);
  saveSharedPages(pages);
  return page;
}

function deleteSharedPage(id: string) {
  const pages = loadSharedPages().filter(p => p.id !== id);
  saveSharedPages(pages);
}

function extractTitleFromHtml(html: string): string | null {
  const match = html.match(/<title[^>]*>(.*?)<\/title>/i);
  return match ? match[1].trim() : null;
}

function getShareUrl(id: string): string {
  return `${window.location.origin}${window.location.pathname}#/preview/share/${id}`;
}

function loadSandboxCode(): string {
  try {
    return localStorage.getItem(SANDBOX_STORAGE_KEY) || DEFAULT_HTML;
  } catch {
    return DEFAULT_HTML;
  }
}

function saveSandboxCode(code: string) {
  try {
    localStorage.setItem(SANDBOX_STORAGE_KEY, code);
  } catch {}
}

function loadSandboxFiles(): SandboxFile[] {
  try {
    const stored = localStorage.getItem(SANDBOX_FILES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveSandboxFiles(files: SandboxFile[]) {
  try {
    localStorage.setItem(SANDBOX_FILES_KEY, JSON.stringify(files));
  } catch {}
}

function loadAiMessages(): AiMessage[] {
  try {
    const stored = localStorage.getItem(AI_CHAT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveAiMessages(messages: AiMessage[]) {
  try {
    localStorage.setItem(AI_CHAT_KEY, JSON.stringify(messages));
  } catch {}
}

// Extract HTML code from AI response — robust against multiple code-block formats
function extractHtmlFromResponse(text: string): string | null {
  // 1. ```html ... ``` (case-insensitive, optional whitespace/newline after tag)
  const htmlBlock = text.match(/```(?:html|htm|HTML)\s*([\s\S]*?)```/);
  if (htmlBlock) {
    const content = htmlBlock[1].trim();
    if (content.length > 10) return content;
  }

  // 2. Generic ``` ... ``` that contains HTML
  const genericBlocks = text.matchAll(/```\s*([\s\S]*?)```/g);
  for (const match of genericBlocks) {
    const content = match[1].trim();
    if (
      content.length > 10 &&
      (content.includes('<!DOCTYPE') ||
       content.includes('<!doctype') ||
       content.includes('<html') ||
       content.includes('<head') ||
       content.includes('<body') ||
       (content.includes('<div') && content.includes('<style')))
    ) {
      return content;
    }
  }

  // 3. No code blocks at all — look for raw HTML in the response
  // Find the longest substring that starts with <!DOCTYPE or <html and ends with </html>
  const rawHtml = text.match(/(<!DOCTYPE[\s\S]*?<\/html\s*>)/i);
  if (rawHtml) return rawHtml[1].trim();

  // 4. Partial raw HTML (no </html> closing but has structure)
  const partialHtml = text.match(/(<!DOCTYPE[\s\S]*)/i);
  if (partialHtml && partialHtml[1].includes('<body') && partialHtml[1].length > 50) {
    return partialHtml[1].trim();
  }

  return null;
}

// Strip code blocks from display text, keeping only the summary
function stripCodeBlocksForDisplay(text: string): string {
  // Remove all code blocks (```...```) and replace with marker
  return text
    .replace(/```(?:html|htm|HTML)?\s*[\s\S]*?```/g, '\n[codigo aplicado ao preview]\n')
    .replace(/<!DOCTYPE[\s\S]*<\/html\s*>/gi, '\n[codigo aplicado ao preview]\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// === Main Component ===
export const Preview: React.FC = () => {
  const { apiConfig } = useApp();

  // State
  const [mode, setMode] = useState<PreviewMode>('sandbox');
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [showDeviceFrame, setShowDeviceFrame] = useState(false);
  const [code, setCode] = useState(loadSandboxCode);
  const [sandboxFiles, setSandboxFiles] = useState<SandboxFile[]>(loadSandboxFiles);
  const [currentFileName, setCurrentFileName] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [sharedPages, setSharedPages] = useState<SharedPage[]>(loadSharedPages);
  const [urlCopied, setUrlCopied] = useState(false);

  // Server mode state
  const [serverStatus, setServerStatus] = useState<ServerStatus>('disconnected');
  const [serverPages, setServerPages] = useState<PageFile[]>([]);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState(PREVIEW_SERVER_URL);

  // AI Chat state
  const [aiMessages, setAiMessages] = useState<AiMessage[]>(loadAiMessages);
  const [aiInput, setAiInput] = useState('');
  const [aiSending, setAiSending] = useState(false);
  const [aiModel, setAiModel] = useState(() => localStorage.getItem(AI_MODEL_KEY) || 'openai/gpt-4o-mini');
  const [aiModels, setAiModels] = useState<OpenRouterModel[]>([]);
  const [aiModelsLoading, setAiModelsLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Refs
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const codeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef(code);

  // Keep codeRef always in sync
  useEffect(() => { codeRef.current = code; }, [code]);

  // === Load Models ===
  useEffect(() => {
    if (!apiConfig.openRouterKey) return;

    const fetchModels = async () => {
      setAiModelsLoading(true);
      try {
        const client = createOpenRouterClient(apiConfig);
        if (!client) return;
        const models = await client.getModels();
        // Filter to text models and sort
        const textModels = models
          .filter(m => !m.id.includes('dall-e') && !m.id.includes('stable-diffusion') && !m.id.includes('flux'))
          .sort((a, b) => a.name.localeCompare(b.name));
        setAiModels(textModels);
      } catch {
        // Silent fail
      } finally {
        setAiModelsLoading(false);
      }
    };

    fetchModels();
  }, [apiConfig]);

  // Save AI model preference
  useEffect(() => {
    localStorage.setItem(AI_MODEL_KEY, aiModel);
  }, [aiModel]);

  // Save AI messages
  useEffect(() => {
    saveAiMessages(aiMessages);
  }, [aiMessages]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, aiSending]);

  // === Sandbox Mode ===
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    if (codeTimerRef.current) clearTimeout(codeTimerRef.current);
    codeTimerRef.current = setTimeout(() => {
      saveSandboxCode(newCode);
    }, 500);
  }, []);

  const saveSandboxFile = useCallback(() => {
    const name = currentFileName.trim() || `page-${Date.now()}.html`;
    const newFile: SandboxFile = { name, content: code, createdAt: new Date().toISOString() };
    const updated = sandboxFiles.filter(f => f.name !== name);
    updated.push(newFile);
    setSandboxFiles(updated);
    saveSandboxFiles(updated);
    setCurrentFileName(name);
  }, [code, currentFileName, sandboxFiles]);

  const loadSandboxFile = useCallback((file: SandboxFile) => {
    setCode(file.content);
    saveSandboxCode(file.content);
    setCurrentFileName(file.name);
  }, []);

  const deleteSandboxFile = useCallback((name: string) => {
    const updated = sandboxFiles.filter(f => f.name !== name);
    setSandboxFiles(updated);
    saveSandboxFiles(updated);
  }, [sandboxFiles]);

  // === AI Chat ===
  const sendAiMessage = useCallback(async () => {
    if (!aiInput.trim() || aiSending) return;

    const client = createOpenRouterClient(apiConfig);
    if (!client) {
      setAiError('Configure a API Key na pagina de API');
      return;
    }

    setAiError(null);
    setAiSending(true);

    const userMsg: AiMessage = { role: 'user', content: aiInput.trim() };
    const nextMessages = [...aiMessages, userMsg];
    setAiMessages(nextMessages);
    setAiInput('');

    // Always use the ref to get the freshest code
    const currentCode = codeRef.current;

    try {
      // Build conversation history for the API
      const apiMessages = [
        { role: 'system' as const, content: AI_SYSTEM_PROMPT },
        // Include current code context — always fresh via ref
        { role: 'user' as const, content: `Here is the current HTML code of the page:\n\`\`\`html\n${currentCode}\n\`\`\`` },
        { role: 'assistant' as const, content: 'Got it. I have the current code. Tell me what to change.' },
        // Previous conversation (last 10 messages for context)
        ...nextMessages.slice(-10).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      const response = await client.chat({
        model: aiModel,
        messages: apiMessages,
        temperature: 0.3,
        max_tokens: 16384,
      });

      const assistantContent = response.choices[0]?.message?.content || 'Sem resposta.';

      // Try to extract HTML code from response
      const extractedHtml = extractHtmlFromResponse(assistantContent);

      const assistantMsg: AiMessage = {
        role: 'assistant',
        content: assistantContent,
        codeApplied: !!extractedHtml,
      };

      setAiMessages(prev => [...prev, assistantMsg]);

      // Auto-apply extracted code
      if (extractedHtml) {
        setCode(extractedHtml);
        saveSandboxCode(extractedHtml);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao chamar a IA';
      setAiError(errorMsg);
      setAiMessages(prev => [...prev, {
        role: 'assistant',
        content: `Erro: ${errorMsg}`,
      }]);
    } finally {
      setAiSending(false);
    }
  }, [aiInput, aiSending, aiMessages, aiModel, apiConfig]);

  const clearAiChat = useCallback(() => {
    setAiMessages([]);
    saveAiMessages([]);
    setAiError(null);
  }, []);

  // === Publish / Share ===
  const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'success' | 'error'>('idle');

  const publishCurrentPage = useCallback(async () => {
    const currentCode = codeRef.current;
    if (!currentCode || currentCode === DEFAULT_HTML) return;

    setPublishStatus('publishing');

    // Save locally
    const page = publishPage(currentCode, currentFileName || undefined, viewport);

    // Save to Supabase for cross-browser access
    const pageData: SharedPageData = {
      id: page.id,
      title: page.title,
      html: page.html,
      createdAt: page.createdAt,
      viewport: page.viewport,
    };

    const supabaseOk = await publishPageToSupabase(pageData);
    if (!supabaseOk) {
      setPublishStatus('error');
      alert('Erro ao salvar no Supabase. Verifique se a tabela NHP tem RLS desabilitado ou uma policy permitindo INSERT. A pagina ficou salva localmente apenas.');
      setTimeout(() => setPublishStatus('idle'), 4000);
    } else {
      setPublishStatus('success');
      setTimeout(() => setPublishStatus('idle'), 3000);
    }

    setSharedPages(loadSharedPages());

    const url = getShareUrl(page.id);
    navigator.clipboard.writeText(url).then(() => {
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 3000);
    }).catch(() => {
      // Fallback for non-HTTPS
      prompt('Copie a URL:', url);
    });
  }, [currentFileName, viewport]);

  const copyShareUrl = useCallback((id: string) => {
    const url = getShareUrl(id);
    navigator.clipboard.writeText(url).then(() => {
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 3000);
    }).catch(() => {
      prompt('Copie a URL:', url);
    });
  }, []);

  const handleDeleteShared = useCallback((id: string) => {
    deleteSharedPage(id);
    deleteSharedPageFromSupabase(id).catch(() => {});
    setSharedPages(loadSharedPages());
  }, []);

  const loadSharedPageToEditor = useCallback((page: SharedPage) => {
    setCode(page.html);
    saveSandboxCode(page.html);
    setCurrentFileName(page.title || '');
    setMode('sandbox');
  }, []);

  // === Server Mode ===
  const connectToServer = useCallback(async () => {
    setServerStatus('connecting');
    try {
      const res = await fetch(`${serverUrl}/api/status`);
      if (!res.ok) throw new Error('Server not available');
      const pagesRes = await fetch(`${serverUrl}/api/pages`);
      const data = await pagesRes.json();
      setServerPages(data.pages || []);
      setServerStatus('connected');

      const wsUrl = serverUrl.replace('http', 'ws');
      const ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'reload' && data.file === selectedPage) {
          if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
        }
        if (data.type === 'page-added' || data.type === 'page-removed') {
          fetch(`${serverUrl}/api/pages`)
            .then(r => r.json())
            .then(d => setServerPages(d.pages || []))
            .catch(() => {});
        }
      };
      ws.onclose = () => setServerStatus('disconnected');
      ws.onerror = () => setServerStatus('error');
      wsRef.current = ws;
    } catch {
      setServerStatus('error');
    }
  }, [serverUrl, selectedPage]);

  const disconnectServer = useCallback(() => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    setServerStatus('disconnected');
    setServerPages([]);
    setSelectedPage(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (codeTimerRef.current) clearTimeout(codeTimerRef.current);
    };
  }, []);

  // === Actions ===
  const refreshPreview = () => {
    if (iframeRef.current) {
      if (mode === 'server' && selectedPage) {
        iframeRef.current.src = `${serverUrl}/preview/${selectedPage}`;
      } else {
        const current = code;
        setCode('');
        requestAnimationFrame(() => setCode(current));
      }
    }
  };

  const openInNewTab = () => {
    if (mode === 'server' && selectedPage) {
      window.open(`${serverUrl}/preview/${selectedPage}`, '_blank');
    } else {
      const blob = new Blob([code], { type: 'text/html' });
      window.open(URL.createObjectURL(blob), '_blank');
    }
  };

  const takeScreenshot = async () => {
    if (!iframeRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const rect = iframeRef.current.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#888';
      ctx.textAlign = 'center';
      ctx.fillText('Use Ctrl+Shift+S para captura completa', canvas.width / 2, canvas.height / 2);
      const link = document.createElement('a');
      link.download = `preview-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch {
      alert('Use Ctrl+Shift+S (ou Cmd+Shift+4 no Mac) para capturar a tela');
    }
  };

  // === Viewport Styles ===
  const getIframeStyles = (): React.CSSProperties => {
    if (viewport === 'full') return { width: '100%', height: '100%' };
    const preset = VIEWPORT_PRESETS[viewport];
    return { width: `${preset.width}px`, height: `${preset.height}px`, maxWidth: '100%', maxHeight: '100%' };
  };

  const getDeviceFrameClass = (): string => {
    if (!showDeviceFrame) return '';
    switch (viewport) {
      case 'mobile': return 'rounded-[2.5rem] ring-[8px] ring-neutral-700 shadow-2xl';
      case 'tablet': return 'rounded-[1.5rem] ring-[6px] ring-neutral-700 shadow-2xl';
      default: return 'rounded-lg ring-1 ring-neutral-700';
    }
  };

  const previewSrc = mode === 'server' && selectedPage
    ? `${serverUrl}/preview/${selectedPage}` : undefined;

  // Group models by provider for dropdown
  const groupedModels = useMemo(() => {
    const groups: Record<string, OpenRouterModel[]> = {};
    aiModels.forEach(m => {
      const provider = m.id.split('/')[0] || 'other';
      if (!groups[provider]) groups[provider] = [];
      groups[provider].push(m);
    });
    return groups;
  }, [aiModels]);

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 bg-neutral-950 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold">Nini Pages</h1>

          {/* Mode Toggle */}
          <div className="flex items-center gap-1 p-0.5 bg-neutral-900 rounded">
            <button
              onClick={() => setMode('sandbox')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                mode === 'sandbox' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Code2 size={12} />
              Sandbox
            </button>
            <button
              onClick={() => setMode('server')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                mode === 'server' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <FolderOpen size={12} />
              Server
            </button>
          </div>

          <div className="w-px h-5 bg-neutral-800" />

          {/* Viewport Toggles */}
          <div className="flex items-center gap-1">
            {(Object.keys(VIEWPORT_PRESETS) as ViewportSize[]).map(key => {
              const IconMap = { mobile: Smartphone, tablet: Tablet, desktop: Monitor, full: Monitor };
              const Icon = IconMap[key];
              return (
                <button
                  key={key}
                  onClick={() => setViewport(key)}
                  title={`${VIEWPORT_PRESETS[key].label} ${key !== 'full' ? `(${VIEWPORT_PRESETS[key].width}px)` : '(100%)'}`}
                  className={`p-1.5 rounded transition-colors ${
                    viewport === key ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  <Icon size={14} />
                </button>
              );
            })}
          </div>

          {viewport !== 'full' && (
            <span className="text-xs text-neutral-500 font-mono">
              {VIEWPORT_PRESETS[viewport].width}x{VIEWPORT_PRESETS[viewport].height}
            </span>
          )}

          <button
            onClick={() => setShowDeviceFrame(!showDeviceFrame)}
            title="Toggle device frame"
            className={`px-2 py-1 rounded text-xs transition-colors ${
              showDeviceFrame ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white'
            }`}
          >
            Frame
          </button>
        </div>

        <div className="flex items-center gap-2">
          {mode === 'server' && (
            <div className="flex items-center gap-1.5 text-xs">
              {serverStatus === 'connected' ? (
                <Wifi size={12} className="text-green-400" />
              ) : serverStatus === 'connecting' ? (
                <RefreshCw size={12} className="text-yellow-400 animate-spin" />
              ) : (
                <WifiOff size={12} className="text-neutral-500" />
              )}
              <span className={
                serverStatus === 'connected' ? 'text-green-400'
                : serverStatus === 'error' ? 'text-red-400'
                : 'text-neutral-500'
              }>
                {serverStatus === 'connected' ? 'Conectado'
                : serverStatus === 'connecting' ? 'Conectando...'
                : serverStatus === 'error' ? 'Erro'
                : 'Desconectado'}
              </span>
            </div>
          )}

          {/* Publish Button */}
          <button
            onClick={publishCurrentPage}
            disabled={publishStatus === 'publishing'}
            title="Publicar e copiar URL"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              publishStatus === 'error'
                ? 'bg-red-600 text-white'
                : publishStatus === 'success' || urlCopied
                  ? 'bg-green-600 text-white'
                  : publishStatus === 'publishing'
                    ? 'bg-blue-600 text-white animate-pulse'
                    : 'text-neutral-500 hover:text-white bg-neutral-900'
            }`}
          >
            {publishStatus === 'publishing' ? <Loader2 size={12} className="animate-spin" />
              : publishStatus === 'error' ? <X size={12} />
              : urlCopied ? <Check size={12} />
              : <Link2 size={12} />}
            {publishStatus === 'publishing' ? 'Salvando...'
              : publishStatus === 'error' ? 'Erro Supabase'
              : urlCopied ? 'URL copiada!'
              : 'Publicar'}
          </button>

          {/* AI Chat Toggle */}
          <button
            onClick={() => setShowChat(!showChat)}
            title="Toggle AI Chat"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              showChat ? 'bg-purple-600 text-white' : 'text-neutral-500 hover:text-white bg-neutral-900'
            }`}
          >
            <Sparkles size={12} />
            AI
          </button>

          <div className="w-px h-5 bg-neutral-800" />

          <button onClick={refreshPreview} title="Recarregar" className="p-1.5 rounded text-neutral-500 hover:text-white transition-colors">
            <RefreshCw size={14} />
          </button>
          <button onClick={takeScreenshot} title="Screenshot" className="p-1.5 rounded text-neutral-500 hover:text-white transition-colors">
            <Camera size={14} />
          </button>
          <button onClick={openInNewTab} title="Nova aba" className="p-1.5 rounded text-neutral-500 hover:text-white transition-colors">
            <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-56 border-r border-neutral-800 flex flex-col bg-neutral-950 shrink-0">
          {mode === 'sandbox' ? (
            <>
              {/* File Manager */}
              <div className="p-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={currentFileName}
                    onChange={e => setCurrentFileName(e.target.value)}
                    placeholder="arquivo.html"
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs focus:outline-none focus:border-neutral-700"
                  />
                  <button onClick={saveSandboxFile} title="Salvar" className="p-1 rounded text-neutral-500 hover:text-white transition-colors">
                    <Save size={14} />
                  </button>
                </div>
              </div>

              {/* Saved Files */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-2 text-xs uppercase text-neutral-500 font-medium">
                  Arquivos ({sandboxFiles.length})
                </div>
                {sandboxFiles.length === 0 && (
                  <div className="px-3 py-4 text-xs text-neutral-600 text-center">Nenhum arquivo</div>
                )}
                {sandboxFiles.map(file => (
                  <div
                    key={file.name}
                    className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-neutral-900 transition-colors ${
                      currentFileName === file.name ? 'bg-neutral-900' : ''
                    }`}
                  >
                    <FileText size={14} className="text-neutral-500 shrink-0" />
                    <button onClick={() => loadSandboxFile(file)} className="flex-1 text-left text-xs truncate text-neutral-300 hover:text-white">
                      {file.name}
                    </button>
                    <button onClick={() => deleteSandboxFile(file.name)} className="p-0.5 rounded text-neutral-600 hover:text-red-400 transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Published Pages / Templates */}
              {sharedPages.length > 0 && (
                <div className="border-t border-neutral-800">
                  <div className="p-2 text-xs uppercase text-neutral-500 font-medium flex items-center gap-1">
                    <Globe size={10} />
                    Templates ({sharedPages.length})
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {sharedPages.slice(0, 20).map(pg => (
                      <div
                        key={pg.id}
                        className="flex items-center gap-1 px-3 py-1.5 hover:bg-neutral-900 transition-colors group"
                      >
                        <Globe size={10} className="text-green-500 shrink-0" />
                        <button
                          onClick={() => loadSharedPageToEditor(pg)}
                          className="flex-1 text-[11px] truncate text-neutral-400 hover:text-white text-left"
                          title={`Carregar "${pg.title}" no editor`}
                        >
                          {pg.title}
                        </button>
                        <button
                          onClick={() => loadSharedPageToEditor(pg)}
                          title="Editar no sandbox"
                          className="p-0.5 rounded text-neutral-700 hover:text-purple-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Pencil size={10} />
                        </button>
                        <a
                          href={`#/preview/share/${pg.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir em tela cheia"
                          className="p-0.5 rounded text-neutral-700 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Maximize size={10} />
                        </a>
                        <button
                          onClick={() => copyShareUrl(pg.id)}
                          title="Copiar URL"
                          className="p-0.5 rounded text-neutral-700 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Copy size={10} />
                        </button>
                        <button
                          onClick={() => handleDeleteShared(pg.id)}
                          title="Excluir"
                          className="p-0.5 rounded text-neutral-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Code Editor */}
              <div className="border-t border-neutral-800">
                <div className="p-2 flex items-center justify-between">
                  <span className="text-xs uppercase text-neutral-500 font-medium">Codigo</span>
                  <button
                    onClick={() => { setCode(DEFAULT_HTML); saveSandboxCode(DEFAULT_HTML); }}
                    className="text-xs text-neutral-600 hover:text-white transition-colors"
                  >
                    Reset
                  </button>
                </div>
                <textarea
                  value={code}
                  onChange={e => handleCodeChange(e.target.value)}
                  spellCheck={false}
                  className="w-full h-56 bg-neutral-900 text-neutral-300 text-xs font-mono p-3 resize-none focus:outline-none border-t border-neutral-800"
                  placeholder="Cole seu HTML aqui..."
                />
              </div>
            </>
          ) : (
            <>
              {/* Server Connection */}
              <div className="p-3 border-b border-neutral-800 space-y-2">
                <label className="text-xs uppercase text-neutral-500 font-medium block">Servidor</label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={e => setServerUrl(e.target.value)}
                  placeholder="http://localhost:3456"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-neutral-700"
                />
                {serverStatus === 'connected' ? (
                  <button onClick={disconnectServer} className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors">
                    <WifiOff size={12} /> Desconectar
                  </button>
                ) : (
                  <button onClick={connectToServer} disabled={serverStatus === 'connecting'} className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs rounded bg-white text-black hover:bg-neutral-200 transition-colors disabled:opacity-50">
                    {serverStatus === 'connecting' ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                    Conectar
                  </button>
                )}
                {serverStatus === 'error' && (
                  <p className="text-xs text-red-400">
                    Servidor nao encontrado. Execute: <code className="bg-neutral-800 px-1 rounded">npm start</code> em preview-server
                  </p>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="p-2 text-xs uppercase text-neutral-500 font-medium">
                  Paginas ({serverPages.length})
                </div>
                {serverPages.length === 0 && serverStatus === 'connected' && (
                  <div className="px-3 py-4 text-xs text-neutral-600 text-center">Nenhuma pagina</div>
                )}
                {serverPages.map(page => (
                  <button
                    key={page.name}
                    onClick={() => setSelectedPage(page.name)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-900 transition-colors ${
                      selectedPage === page.name ? 'bg-neutral-900 border-l-2 border-white' : ''
                    }`}
                  >
                    <FileText size={14} className="text-neutral-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-neutral-300 truncate">{page.name}</p>
                      <p className="text-[10px] text-neutral-600">{(page.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </button>
                ))}
              </div>

              {serverStatus === 'disconnected' && (
                <div className="p-3 border-t border-neutral-800">
                  <div className="text-xs text-neutral-600 space-y-1">
                    <p className="font-medium text-neutral-500">Para iniciar:</p>
                    <code className="block bg-neutral-900 p-2 rounded text-[10px] font-mono">
                      cd preview-server<br />npm install<br />npm start
                    </code>
                  </div>
                </div>
              )}
            </>
          )}
        </aside>

        {/* Preview Area */}
        <div className="flex-1 flex items-center justify-center bg-neutral-900/50 overflow-auto p-4">
          <div
            className={`relative overflow-hidden bg-white transition-all ${getDeviceFrameClass()}`}
            style={getIframeStyles()}
          >
            {mode === 'sandbox' ? (
              <iframe
                ref={iframeRef}
                srcDoc={code}
                title="Nini Pages Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox allow-top-navigation allow-downloads allow-presentation"
                className="w-full h-full border-0"
                style={{ backgroundColor: '#fff' }}
              />
            ) : selectedPage ? (
              <iframe
                ref={iframeRef}
                src={previewSrc}
                title="Preview"
                className="w-full h-full border-0"
                style={{ backgroundColor: '#fff' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-950 text-neutral-500 text-sm">
                {serverStatus === 'connected' ? 'Selecione uma pagina' : 'Conecte ao servidor'}
              </div>
            )}
          </div>
        </div>

        {/* AI Chat Panel */}
        {showChat && (
          <aside className="w-80 border-l border-neutral-800 flex flex-col bg-neutral-950 shrink-0">
            {/* Chat Header */}
            <div className="p-3 border-b border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-purple-400" />
                  <span className="text-xs font-semibold">AI Assistant</span>
                </div>
                <button onClick={clearAiChat} title="Limpar chat" className="p-1 rounded text-neutral-600 hover:text-white transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Model Selector */}
              <select
                value={aiModel}
                onChange={e => setAiModel(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-neutral-700"
              >
                {aiModelsLoading ? (
                  <option>Carregando modelos...</option>
                ) : aiModels.length === 0 ? (
                  <option value={aiModel}>{aiModel}</option>
                ) : (
                  Object.entries(groupedModels).map(([provider, models]) => (
                    <optgroup key={provider} label={provider}>
                      {models.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </optgroup>
                  ))
                )}
              </select>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {aiMessages.length === 0 && (
                <div className="text-xs text-neutral-600 text-center py-8 space-y-2">
                  <Sparkles size={24} className="mx-auto text-neutral-700" />
                  <p>Peca alteracoes no codigo.</p>
                  <p className="text-neutral-700">Ex: "Mude o fundo para azul escuro" ou "Adicione um botao CTA"</p>
                </div>
              )}

              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[90%] rounded-lg px-3 py-2 text-xs ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-neutral-900 text-neutral-300 border border-neutral-800'
                    }`}
                  >
                    {msg.role === 'assistant' && msg.codeApplied && (
                      <div className="flex items-center gap-1 text-green-400 text-[10px] mb-1 font-medium">
                        <Sparkles size={10} />
                        Codigo aplicado automaticamente
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                      {msg.role === 'assistant'
                        ? stripCodeBlocksForDisplay(msg.content)
                        : msg.content}
                    </p>
                  </div>
                </div>
              ))}

              {aiSending && (
                <div className="flex justify-start">
                  <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs flex items-center gap-2 text-neutral-400">
                    <Loader2 size={12} className="animate-spin" />
                    Gerando...
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Error */}
            {aiError && (
              <div className="px-3 py-2 text-[10px] text-red-400 bg-red-500/10 border-t border-red-500/20">
                {aiError}
              </div>
            )}

            {/* Chat Input */}
            <div className="p-3 border-t border-neutral-800">
              {!apiConfig.openRouterKey ? (
                <p className="text-xs text-amber-400 text-center">Configure a API Key na pagina de API</p>
              ) : (
                <div className="flex items-end gap-2">
                  <textarea
                    value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendAiMessage();
                      }
                    }}
                    placeholder="Mude a cor do fundo..."
                    rows={2}
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2.5 py-2 text-xs resize-none focus:outline-none focus:border-neutral-700"
                  />
                  <button
                    onClick={sendAiMessage}
                    disabled={!aiInput.trim() || aiSending}
                    className="p-2 rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {aiSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

// === Shared Page Viewer — renders as a REAL published page ===
export const PreviewShare: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorDetail, setErrorDetail] = useState('');

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    // Try local first
    const found = getSharedPage(id);
    if (found) {
      renderPublishedPage(found.html, found.title);
      return;
    }

    // Fetch from Supabase
    getSharedPageFromSupabase(id)
      .then((remote) => {
        if (remote) {
          renderPublishedPage(remote.html, remote.title);
        } else {
          setErrorDetail('Pagina nao encontrada no banco de dados.');
          setNotFound(true);
          setLoading(false);
        }
      })
      .catch((err) => {
        setErrorDetail(err?.message || 'Erro de conexao com Supabase');
        setNotFound(true);
        setLoading(false);
      });
  }, [id]);

  // Replace the entire document with the published HTML
  function renderPublishedPage(html: string, title: string) {
    // Inject a minimal floating toolbar into the HTML
    const toolbar = `
<style>
  #nhp-pub-toolbar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 999999;
    opacity: 0; transition: opacity 0.3s; pointer-events: none;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  #nhp-pub-toolbar:hover { opacity: 1; pointer-events: auto; }
  #nhp-pub-toolbar-inner {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 16px; background: rgba(0,0,0,0.75); backdrop-filter: blur(12px);
  }
  #nhp-pub-toolbar span { color: #aaa; font-size: 11px; }
  #nhp-pub-toolbar a, #nhp-pub-toolbar button {
    color: #999; font-size: 11px; text-decoration: none; padding: 4px 10px;
    border-radius: 4px; background: rgba(255,255,255,0.1); border: none; cursor: pointer;
    margin-left: 6px; transition: all 0.2s;
  }
  #nhp-pub-toolbar a:hover, #nhp-pub-toolbar button:hover {
    color: #fff; background: rgba(255,255,255,0.2);
  }
</style>
<div id="nhp-pub-toolbar">
  <div id="nhp-pub-toolbar-inner">
    <span>${title}</span>
    <div>
      <button onclick="navigator.clipboard.writeText(window.location.href).then(function(){this.textContent='Copiado!'}.bind(this))">Copiar URL</button>
      <a href="${window.location.origin}${window.location.pathname}#/preview">Editor</a>
    </div>
  </div>
</div>
<script>
document.addEventListener('mousemove', function(e) {
  var tb = document.getElementById('nhp-pub-toolbar');
  if (!tb) return;
  if (e.clientY < 50) { tb.style.opacity = '1'; tb.style.pointerEvents = 'auto'; }
  else { tb.style.opacity = '0'; tb.style.pointerEvents = 'none'; }
});
<\/script>`;

    // Write directly to document — replaces React entirely, page IS the published content
    document.open();
    document.write(html.replace(/<\/body>/i, toolbar + '</body>'));
    document.close();
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-center p-8">
        <div className="space-y-4">
          <Globe size={48} className="mx-auto text-neutral-700" />
          <h1 className="text-xl font-semibold text-white">Pagina nao encontrada</h1>
          <p className="text-sm text-neutral-500 max-w-md">
            {errorDetail || 'Esta pagina pode ter sido removida ou o link e invalido.'}
          </p>
          <a
            href="#/preview"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-neutral-200"
          >
            Voltar ao Nini Pages
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-neutral-500" />
      </div>
    );
  }

  return null;
};
