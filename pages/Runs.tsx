import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { Run, RunLog, Step } from '../types';
import { ChevronDown, ChevronRight, Search, Clock, Coins, Zap, Image, CheckCircle, XCircle, Loader2, SkipForward } from 'lucide-react';

// Check if output contains image URLs
const extractImageUrls = (output: unknown): string[] => {
  if (!output) return [];

  const urls: string[] = [];

  const extract = (obj: unknown) => {
    if (typeof obj === 'string') {
      // Check if it's a URL
      if (obj.match(/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)/i)) {
        urls.push(obj);
      }
      // Check if it's a base64 image
      if (obj.startsWith('data:image/')) {
        urls.push(obj);
      }
    } else if (Array.isArray(obj)) {
      obj.forEach(extract);
    } else if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach(extract);
    }
  };

  extract(output);
  return urls;
};

const StepStatusIcon: React.FC<{ status: Step['status'] }> = ({ status }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle size={14} className="text-green-500" />;
    case 'failed':
      return <XCircle size={14} className="text-red-500" />;
    case 'running':
      return <Loader2 size={14} className="text-blue-500 animate-spin" />;
    case 'skipped':
      return <SkipForward size={14} className="text-neutral-500" />;
    default:
      return <Clock size={14} className="text-neutral-500" />;
  }
};

const StepCard: React.FC<{ step: Step; index: number }> = ({ step, index }) => {
  const [expanded, setExpanded] = useState(false);
  const imageUrls = extractImageUrls(step.output);

  return (
    <div className="border border-neutral-800 rounded-lg overflow-hidden">
      <div
        className="p-3 cursor-pointer hover:bg-neutral-900/50 flex items-center gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-xs text-neutral-600 font-mono w-6">{index + 1}</span>
        <StepStatusIcon status={step.status} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{step.agentName}</p>
          <p className="text-xs text-neutral-500 truncate">{step.description}</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          {step.duration && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {(step.duration / 1000).toFixed(1)}s
            </span>
          )}
          {step.tokensUsed && (
            <span className="flex items-center gap-1">
              <Zap size={12} />
              {step.tokensUsed}
            </span>
          )}
          {imageUrls.length > 0 && (
            <span className="flex items-center gap-1 text-purple-400">
              <Image size={12} />
              {imageUrls.length}
            </span>
          )}
        </div>
        <ChevronRight size={14} className={`text-neutral-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </div>

      {expanded && (
        <div className="border-t border-neutral-800 p-3 space-y-3 bg-neutral-950">
          {/* Input */}
          {step.input && Object.keys(step.input).length > 0 && (
            <div>
              <p className="text-xs text-neutral-500 mb-1">Input</p>
              <pre className="text-xs bg-neutral-900 p-2 rounded overflow-x-auto font-mono text-neutral-300">
                {JSON.stringify(step.input, null, 2)}
              </pre>
            </div>
          )}

          {/* Output */}
          {step.output && (
            <div>
              <p className="text-xs text-neutral-500 mb-1">Output</p>
              <pre className="text-xs bg-neutral-900 p-2 rounded overflow-x-auto font-mono text-neutral-300">
                {JSON.stringify(step.output, null, 2)}
              </pre>
            </div>
          )}

          {/* Image Preview */}
          {imageUrls.length > 0 && (
            <div>
              <p className="text-xs text-neutral-500 mb-2">Imagens Geradas</p>
              <div className="grid grid-cols-2 gap-2">
                {imageUrls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded overflow-hidden border border-neutral-800 hover:border-neutral-700"
                  >
                    <img
                      src={url}
                      alt={`Generated ${i + 1}`}
                      className="w-full h-auto"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {step.error && (
            <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400">{step.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const LogItem: React.FC<{ log: RunLog }> = ({ log }) => {
  return (
    <div className="flex gap-3 py-2">
      <div className="w-16 text-xs text-neutral-600 font-mono shrink-0">
        {log.timestamp.split('T').pop()?.slice(0, 8) || log.timestamp}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{log.agentName}</span>
          {log.phase && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
              {log.phase}
            </span>
          )}
        </div>
        <p className={`text-sm ${
          log.level === 'error' ? 'text-red-400' :
          log.level === 'success' ? 'text-green-400' :
          'text-neutral-400'
        }`}>
          {log.message}
        </p>
        {log.artifact && (
          <div className="mt-2 rounded bg-neutral-900 border border-neutral-800 overflow-hidden">
            <div className="px-3 py-1.5 border-b border-neutral-800 text-xs text-neutral-500">
              {log.artifact.label}
            </div>
            <pre className="p-3 text-xs text-neutral-300 overflow-x-auto font-mono">
              {log.artifact.content}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

const RunCard: React.FC<{ run: Run }> = ({ run }) => {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'steps' | 'logs'>('steps');

  return (
    <div className="rounded-lg border border-neutral-800">
      <div
        className="p-4 cursor-pointer hover:bg-neutral-900/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          <button className="mt-1 text-neutral-500">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium truncate">{run.goal}</p>
              <span className={`text-xs px-2 py-0.5 rounded ${
                run.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                run.status === 'failed' ? 'bg-red-500/10 text-red-500' :
                run.status === 'running' ? 'bg-blue-500/10 text-blue-500' :
                'bg-neutral-800 text-neutral-400'
              }`}>
                {run.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-neutral-500">
              <span>{run.orchestratorName}</span>
              <span>{run.startTime}</span>
              {run.steps && run.steps.length > 0 && (
                <span>{run.steps.filter(s => s.status === 'completed').length}/{run.steps.length} steps</span>
              )}
              {run.totalTokens && (
                <span className="flex items-center gap-1">
                  <Zap size={10} />
                  {run.totalTokens}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Coins size={10} />
                ${run.cost.toFixed(4)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-neutral-800">
          {/* Resultado Final */}
          {(run.finalResult || run.consolidatedOutput) && (
            <div className="p-4 border-b border-neutral-800">
              <div className="p-3 rounded bg-green-500/5 border border-green-500/20">
                <p className="text-xs text-green-500 mb-2">Resultado Final</p>
                <p className="text-sm text-neutral-300 whitespace-pre-wrap">
                  {run.consolidatedOutput || (typeof run.finalResult === 'string' ? run.finalResult : JSON.stringify(run.finalResult, null, 2))}
                </p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-neutral-800">
            <button
              onClick={() => setActiveTab('steps')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'steps'
                  ? 'text-white border-b-2 border-white'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Steps ({run.steps?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'logs'
                  ? 'text-white border-b-2 border-white'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Logs ({run.logs?.length || 0})
            </button>
          </div>

          <div className="p-4">
            {activeTab === 'steps' ? (
              <div className="space-y-2">
                {run.steps && run.steps.length > 0 ? (
                  run.steps.map((step, i) => (
                    <StepCard key={step.id} step={step} index={i} />
                  ))
                ) : (
                  <p className="text-sm text-neutral-500 text-center py-4">
                    Nenhum step registrado
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1 divide-y divide-neutral-800/50">
                {run.logs && run.logs.length > 0 ? (
                  run.logs.map(log => (
                    <LogItem key={log.id} log={log} />
                  ))
                ) : (
                  <p className="text-sm text-neutral-500 text-center py-4">
                    Nenhum log registrado
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const Runs: React.FC = () => {
  const { runs } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('all');

  const filteredRuns = runs.filter(run => {
    const matchesSearch = run.goal.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || run.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold mb-6">Execuções</h1>

      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 pl-10 text-sm focus:outline-none focus:border-neutral-700"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm"
        >
          <option value="all">Todas</option>
          <option value="completed">Concluídas</option>
          <option value="failed">Falharam</option>
        </select>
      </div>

      <div className="space-y-3">
        {filteredRuns.map(run => (
          <RunCard key={run.id} run={run} />
        ))}
      </div>

      {filteredRuns.length === 0 && (
        <div className="text-center py-12 text-neutral-500">
          Nenhuma execução encontrada
        </div>
      )}
    </div>
  );
};
