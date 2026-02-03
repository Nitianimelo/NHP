import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { Eye, EyeOff, ExternalLink, CheckCircle, XCircle, Loader } from 'lucide-react';

export const Api: React.FC = () => {
  const { apiConfig, setApiConfig } = useApp();
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const testConnection = async () => {
    if (!apiConfig.openRouterKey) return;

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiConfig.openRouterKey}`,
        },
      });

      if (response.ok) {
        setTestResult('success');
      } else {
        setTestResult('error');
      }
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  const maskedKey = apiConfig.openRouterKey
    ? `${apiConfig.openRouterKey.slice(0, 8)}${'•'.repeat(24)}${apiConfig.openRouterKey.slice(-4)}`
    : '';

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold mb-6">Configuração de API</h1>

      <div className="space-y-6">
        {/* OpenRouter API Key */}
        <div>
          <label className="block text-sm font-medium mb-2">
            OpenRouter API Key
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiConfig.openRouterKey}
              onChange={(e) => {
                setApiConfig({ openRouterKey: e.target.value });
                setTestResult(null);
              }}
              placeholder="sk-or-..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:border-neutral-700"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            Obtenha sua chave em{' '}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 hover:text-white inline-flex items-center gap-1"
            >
              openrouter.ai/keys
              <ExternalLink size={12} />
            </a>
          </p>
        </div>

        {/* Test Connection */}
        <div className="flex items-center gap-3">
          <button
            onClick={testConnection}
            disabled={!apiConfig.openRouterKey || testing}
            className="px-4 py-2 bg-neutral-800 text-sm rounded hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {testing ? (
              <>
                <Loader size={14} className="animate-spin" />
                Testando...
              </>
            ) : (
              'Testar Conexão'
            )}
          </button>

          {testResult === 'success' && (
            <span className="text-sm text-green-500 flex items-center gap-1">
              <CheckCircle size={14} />
              Conectado
            </span>
          )}

          {testResult === 'error' && (
            <span className="text-sm text-red-500 flex items-center gap-1">
              <XCircle size={14} />
              Falha na conexão
            </span>
          )}
        </div>

        {/* Divider */}
        <hr className="border-neutral-800" />

        {/* Info */}
        <div className="p-4 bg-neutral-900 rounded text-sm">
          <p className="text-neutral-400 mb-3">
            O OpenRouter unifica acesso a múltiplos provedores de IA (OpenAI, Anthropic, Google, etc.) com uma única API key.
          </p>
          <p className="text-neutral-500 text-xs">
            Modelos disponíveis: GPT-4, Claude, Gemini, Llama, Mistral e outros.
            <br />
            A chave é armazenada localmente no seu navegador.
          </p>
        </div>

        {/* Status */}
        {apiConfig.openRouterKey && (
          <div className="p-3 border border-neutral-800 rounded">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">Status</span>
              <span className="text-sm text-green-500">Configurado</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
