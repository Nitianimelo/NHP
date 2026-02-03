import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { Run, RunLog } from '../types';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';

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
                'bg-neutral-800 text-neutral-400'
              }`}>
                {run.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-neutral-500">
              <span>{run.orchestratorName}</span>
              <span>{run.startTime}</span>
              <span>{run.duration}</span>
              <span>${run.cost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-neutral-800 p-4">
          {(run.finalResult || run.consolidatedOutput) && (
            <div className="mb-4 p-3 rounded bg-green-500/5 border border-green-500/20">
              <p className="text-xs text-green-500 mb-1">Resultado</p>
              <p className="text-sm text-neutral-300">
                {run.consolidatedOutput || (typeof run.finalResult === 'string' ? run.finalResult : JSON.stringify(run.finalResult))}
              </p>
            </div>
          )}
          <div className="space-y-1 divide-y divide-neutral-800/50">
            {run.logs.map(log => (
              <LogItem key={log.id} log={log} />
            ))}
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
