import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../AppContext';
import { Eye, EyeOff, ExternalLink, CheckCircle, XCircle, Loader } from 'lucide-react';
import { createOpenRouterClient, OpenRouterModel } from '../lib/openrouter';

export const Api: React.FC = () => {
  const { apiConfig, setApiConfig } = useApp();
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [modelsStatus, setModelsStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [modelsError, setModelsError] = useState<string | null>(null);

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

  useEffect(() => {
    const loadModels = async () => {
      const client = createOpenRouterClient(apiConfig);
      if (!client) {
        setModels([]);
        setModelsStatus('idle');
        return;
      }
      setModelsStatus('loading');
      setModelsError(null);
      try {
        const data = await client.getModels();
        setModels(data);
        setModelsStatus('success');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao buscar modelos.';
        setModelsError(message);
        setModelsStatus('error');
      }
    };

    loadModels();
  }, [apiConfig]);

  const topModels = useMemo(() => models.slice(0, 12), [models]);

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

        {/* Models */}
        <div className="p-4 bg-neutral-900 rounded text-sm space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-neutral-300 font-medium">Modelos disponíveis</p>
            {modelsStatus === 'loading' && (
              <span className="text-xs text-neutral-500 flex items-center gap-2">
                <Loader size={12} className="animate-spin" />
                Carregando
              </span>
            )}
          </div>

          {modelsStatus === 'error' && (
            <p className="text-xs text-red-400">{modelsError}</p>
          )}

          {modelsStatus === 'success' && models.length === 0 && (
            <p className="text-xs text-neutral-500">Nenhum modelo retornado.</p>
          )}

          {modelsStatus === 'success' && models.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-400">
              {topModels.map(model => (
                <div key={model.id} className="border border-neutral-800 rounded px-2 py-1">
                  <p className="text-neutral-200">{model.name}</p>
                  <p className="text-neutral-500">{model.id}</p>
                </div>
              ))}
            </div>
          )}

          {modelsStatus === 'success' && models.length > 12 && (
            <p className="text-xs text-neutral-500">
              Exibindo {topModels.length} de {models.length} modelos.
            </p>
          )}
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
