import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, Loader2, X, ExternalLink } from 'lucide-react';
import { useApp } from '../AppContext';
import { OpenRouterClient, OpenRouterModel } from '../lib/openrouter';

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  placeholder?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Selecione um modelo...'
}) => {
  const { apiConfig } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch models from OpenRouter
  useEffect(() => {
    const fetchModels = async () => {
      if (!apiConfig.openRouterKey) {
        setError('Configure a API Key na página de API');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const client = new OpenRouterClient(apiConfig.openRouterKey);
        const fetchedModels = await client.getModels();
        // Sort by name
        fetchedModels.sort((a, b) => a.name.localeCompare(b.name));
        setModels(fetchedModels);
      } catch (err) {
        setError('Erro ao carregar modelos');
        console.error('Failed to fetch models:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [apiConfig.openRouterKey]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Filter models based on search
  const filteredModels = useMemo(() => {
    if (!search.trim()) return models;

    const searchLower = search.toLowerCase();
    return models.filter(model =>
      model.id.toLowerCase().includes(searchLower) ||
      model.name.toLowerCase().includes(searchLower) ||
      model.description?.toLowerCase().includes(searchLower)
    );
  }, [models, search]);

  // Group models by provider
  const groupedModels = useMemo(() => {
    const groups: Record<string, OpenRouterModel[]> = {};

    filteredModels.forEach(model => {
      const provider = model.id.split('/')[0] || 'other';
      if (!groups[provider]) {
        groups[provider] = [];
      }
      groups[provider].push(model);
    });

    // Sort providers alphabetically, but put popular ones first
    const priorityProviders = ['openai', 'anthropic', 'google', 'meta-llama', 'mistralai'];
    const sortedProviders = Object.keys(groups).sort((a, b) => {
      const aIndex = priorityProviders.indexOf(a);
      const bIndex = priorityProviders.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });

    return sortedProviders.map(provider => ({
      provider,
      models: groups[provider]
    }));
  }, [filteredModels]);

  // Get selected model info
  const selectedModel = models.find(m => m.id === value);

  // Format pricing
  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (num === 0) return 'Free';
    if (num < 0.001) return `$${(num * 1000000).toFixed(2)}/1M`;
    return `$${num.toFixed(4)}/1K`;
  };

  // Format context length
  const formatContext = (length: number) => {
    if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M`;
    if (length >= 1000) return `${(length / 1000).toFixed(0)}K`;
    return String(length);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected value button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-left flex items-center justify-between hover:border-neutral-700 focus:outline-none focus:border-neutral-600 transition-colors"
      >
        <div className="flex-1 min-w-0">
          {selectedModel ? (
            <div>
              <span className="text-white">{selectedModel.name}</span>
              <span className="text-neutral-500 ml-2 text-xs font-mono">{selectedModel.id}</span>
            </div>
          ) : (
            <span className="text-neutral-500">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={16} className={`text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-neutral-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar modelo..."
                className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 pl-9 pr-8 text-sm focus:outline-none focus:border-neutral-600"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Models list */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-neutral-500">
                <Loader2 size={20} className="animate-spin mr-2" />
                Carregando modelos...
              </div>
            ) : error ? (
              <div className="py-8 px-4 text-center">
                <p className="text-red-400 text-sm mb-2">{error}</p>
                <a
                  href="/#/api"
                  className="text-xs text-neutral-400 hover:text-white flex items-center justify-center gap-1"
                >
                  Configurar API <ExternalLink size={12} />
                </a>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="py-8 text-center text-neutral-500 text-sm">
                Nenhum modelo encontrado
              </div>
            ) : (
              groupedModels.map(group => (
                <div key={group.provider}>
                  {/* Provider header */}
                  <div className="sticky top-0 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-400 uppercase tracking-wide">
                    {group.provider}
                  </div>

                  {/* Models in group */}
                  {group.models.map(model => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => {
                        onChange(model.id);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-neutral-800 transition-colors ${
                        value === model.id ? 'bg-neutral-800' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{model.name}</p>
                          <p className="text-xs text-neutral-500 font-mono truncate">{model.id}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-neutral-400">
                            {formatContext(model.context_length)} ctx
                          </p>
                          <p className="text-xs text-neutral-500">
                            {formatPrice(model.pricing.prompt)}
                          </p>
                        </div>
                      </div>
                      {model.description && (
                        <p className="text-xs text-neutral-500 mt-1 line-clamp-1">
                          {model.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer with count */}
          {!loading && !error && models.length > 0 && (
            <div className="border-t border-neutral-800 px-3 py-2 text-xs text-neutral-500">
              {filteredModels.length} de {models.length} modelos
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
