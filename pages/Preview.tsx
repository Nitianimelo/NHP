import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'lucide-react';

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

// === Sandbox Storage ===
const SANDBOX_STORAGE_KEY = 'nhp_preview_sandbox';
const SANDBOX_FILES_KEY = 'nhp_preview_sandbox_files';

interface SandboxFile {
  name: string;
  content: string;
  createdAt: string;
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

// === Main Component ===
export const Preview: React.FC = () => {
  // State
  const [mode, setMode] = useState<PreviewMode>('sandbox');
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [showDeviceFrame, setShowDeviceFrame] = useState(false);
  const [code, setCode] = useState(loadSandboxCode);
  const [sandboxFiles, setSandboxFiles] = useState<SandboxFile[]>(loadSandboxFiles);
  const [currentFileName, setCurrentFileName] = useState('');

  // Server mode state
  const [serverStatus, setServerStatus] = useState<ServerStatus>('disconnected');
  const [serverPages, setServerPages] = useState<PageFile[]>([]);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState(PREVIEW_SERVER_URL);

  // Refs
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const codeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // === Sandbox Mode ===
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);

    // Debounced save
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

      // Connect WebSocket
      const wsUrl = serverUrl.replace('http', 'ws');
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[Preview] WebSocket connected');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'reload' && data.file === selectedPage) {
          if (iframeRef.current) {
            iframeRef.current.src = iframeRef.current.src;
          }
        }

        if (data.type === 'page-added' || data.type === 'page-removed') {
          // Refresh page list
          fetch(`${serverUrl}/api/pages`)
            .then(r => r.json())
            .then(d => setServerPages(d.pages || []))
            .catch(() => {});
        }
      };

      ws.onclose = () => {
        setServerStatus('disconnected');
      };

      ws.onerror = () => {
        setServerStatus('error');
      };

      wsRef.current = ws;
    } catch {
      setServerStatus('error');
    }
  }, [serverUrl, selectedPage]);

  const disconnectServer = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setServerStatus('disconnected');
    setServerPages([]);
    setSelectedPage(null);
  }, []);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (codeTimerRef.current) {
        clearTimeout(codeTimerRef.current);
      }
    };
  }, []);

  // === Actions ===
  const refreshPreview = () => {
    if (iframeRef.current) {
      if (mode === 'server' && selectedPage) {
        iframeRef.current.src = `${serverUrl}/preview/${selectedPage}`;
      } else {
        // Force re-render sandbox
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
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };

  const takeScreenshot = async () => {
    if (!iframeRef.current) return;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const iframe = iframeRef.current;
      const rect = iframe.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Use html2canvas-like approach via the iframe content
      // For cross-origin we just screenshot the iframe element
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#888';
      ctx.textAlign = 'center';
      ctx.fillText('Screenshot salvo (use Ctrl+Shift+S no browser para captura completa)', canvas.width / 2, canvas.height / 2);

      const link = document.createElement('a');
      link.download = `preview-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch {
      // Fallback: suggest browser screenshot
      alert('Use Ctrl+Shift+S (ou Cmd+Shift+4 no Mac) para capturar a tela');
    }
  };

  // === Viewport Styles ===
  const getIframeStyles = (): React.CSSProperties => {
    if (viewport === 'full') {
      return { width: '100%', height: '100%' };
    }

    const preset = VIEWPORT_PRESETS[viewport];
    return {
      width: `${preset.width}px`,
      height: `${preset.height}px`,
      maxWidth: '100%',
      maxHeight: '100%',
    };
  };

  const getDeviceFrameClass = (): string => {
    if (!showDeviceFrame) return '';
    switch (viewport) {
      case 'mobile': return 'rounded-[2.5rem] ring-[8px] ring-neutral-700 shadow-2xl';
      case 'tablet': return 'rounded-[1.5rem] ring-[6px] ring-neutral-700 shadow-2xl';
      default: return 'rounded-lg ring-1 ring-neutral-700';
    }
  };

  // === Server Preview URL ===
  const previewSrc = mode === 'server' && selectedPage
    ? `${serverUrl}/preview/${selectedPage}`
    : undefined;

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 bg-neutral-950 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold">Preview</h1>

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

          {/* Separator */}
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
                    viewport === key
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-500 hover:text-white'
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

          {/* Device Frame Toggle */}
          <button
            onClick={() => setShowDeviceFrame(!showDeviceFrame)}
            title="Toggle device frame"
            className={`px-2 py-1 rounded text-xs transition-colors ${
              showDeviceFrame
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            Frame
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Server Status */}
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

          <button
            onClick={refreshPreview}
            title="Recarregar preview"
            className="p-1.5 rounded text-neutral-500 hover:text-white transition-colors"
          >
            <RefreshCw size={14} />
          </button>

          <button
            onClick={takeScreenshot}
            title="Screenshot"
            className="p-1.5 rounded text-neutral-500 hover:text-white transition-colors"
          >
            <Camera size={14} />
          </button>

          <button
            onClick={openInNewTab}
            title="Abrir em nova aba"
            className="p-1.5 rounded text-neutral-500 hover:text-white transition-colors"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-neutral-800 flex flex-col bg-neutral-950 shrink-0">
          {mode === 'sandbox' ? (
            <>
              {/* Sandbox File Manager */}
              <div className="p-3 border-b border-neutral-800">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={currentFileName}
                    onChange={e => setCurrentFileName(e.target.value)}
                    placeholder="nome-do-arquivo.html"
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs focus:outline-none focus:border-neutral-700"
                  />
                  <button
                    onClick={saveSandboxFile}
                    title="Salvar"
                    className="p-1 rounded text-neutral-500 hover:text-white transition-colors"
                  >
                    <Save size={14} />
                  </button>
                </div>
              </div>

              {/* Saved Files */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-2 text-xs uppercase text-neutral-500 font-medium">
                  Arquivos salvos ({sandboxFiles.length})
                </div>
                {sandboxFiles.length === 0 && (
                  <div className="px-3 py-4 text-xs text-neutral-600 text-center">
                    Nenhum arquivo salvo
                  </div>
                )}
                {sandboxFiles.map(file => (
                  <div
                    key={file.name}
                    className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-neutral-900 transition-colors ${
                      currentFileName === file.name ? 'bg-neutral-900' : ''
                    }`}
                  >
                    <FileText size={14} className="text-neutral-500 shrink-0" />
                    <button
                      onClick={() => loadSandboxFile(file)}
                      className="flex-1 text-left text-xs truncate text-neutral-300 hover:text-white"
                    >
                      {file.name}
                    </button>
                    <button
                      onClick={() => deleteSandboxFile(file.name)}
                      className="p-0.5 rounded text-neutral-600 hover:text-red-400 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>

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
                  className="w-full h-64 bg-neutral-900 text-neutral-300 text-xs font-mono p-3 resize-none focus:outline-none border-t border-neutral-800"
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
                  <button
                    onClick={disconnectServer}
                    className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
                  >
                    <WifiOff size={12} />
                    Desconectar
                  </button>
                ) : (
                  <button
                    onClick={connectToServer}
                    disabled={serverStatus === 'connecting'}
                    className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs rounded bg-white text-black hover:bg-neutral-200 transition-colors disabled:opacity-50"
                  >
                    {serverStatus === 'connecting' ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Play size={12} />
                    )}
                    Conectar
                  </button>
                )}
                {serverStatus === 'error' && (
                  <p className="text-xs text-red-400">
                    Servidor nao encontrado. Execute: <code className="bg-neutral-800 px-1 rounded">npm start</code> no diretorio preview-server
                  </p>
                )}
              </div>

              {/* Server Pages List */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-2 text-xs uppercase text-neutral-500 font-medium">
                  Paginas ({serverPages.length})
                </div>
                {serverPages.length === 0 && serverStatus === 'connected' && (
                  <div className="px-3 py-4 text-xs text-neutral-600 text-center">
                    Nenhuma pagina encontrada em /pages
                  </div>
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
                      <p className="text-[10px] text-neutral-600">
                        {(page.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Server Info */}
              {serverStatus === 'disconnected' && (
                <div className="p-3 border-t border-neutral-800">
                  <div className="text-xs text-neutral-600 space-y-1">
                    <p className="font-medium text-neutral-500">Para iniciar o servidor:</p>
                    <code className="block bg-neutral-900 p-2 rounded text-[10px] font-mono">
                      cd preview-server<br />
                      npm install<br />
                      npm start
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
                title="Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
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
                {serverStatus === 'connected'
                  ? 'Selecione uma pagina na sidebar'
                  : 'Conecte ao servidor para ver as paginas'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
