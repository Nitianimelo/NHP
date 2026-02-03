import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { Run, RunLog } from '../types';
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Terminal,
  Code,
  FileText,
  AlertCircle,
  Zap,
  Filter,
  Search,
  RefreshCw,
  DollarSign,
  Timer
} from 'lucide-react';

const phaseColors: Record<string, string> = {
  INPUT: 'cyber-blue',
  PROCESS: 'cyber-cyan',
  ACTION: 'cyber-purple',
  OUTPUT: 'cyber-green',
  PLANNING: 'cyber-pink',
  DELEGATION: 'yellow-500'
};

const levelIcons: Record<string, React.ReactNode> = {
  info: <AlertCircle className="w-4 h-4 text-zinc-400" />,
  warn: <AlertCircle className="w-4 h-4 text-yellow-500" />,
  error: <XCircle className="w-4 h-4 text-red-500" />,
  success: <CheckCircle2 className="w-4 h-4 text-cyber-green" />
};

const RunCard: React.FC<{ run: Run }> = ({ run }) => {
  const [expanded, setExpanded] = useState(false);

  const statusConfig = {
    running: { color: 'cyber-cyan', icon: RefreshCw, label: 'Executando', iconClass: 'animate-spin' },
    completed: { color: 'cyber-green', icon: CheckCircle2, label: 'Concluído', iconClass: '' },
    failed: { color: 'red-500', icon: XCircle, label: 'Falhou', iconClass: '' },
    pending: { color: 'yellow-500', icon: Clock, label: 'Pendente', iconClass: '' }
  };

  const status = statusConfig[run.status];
  const StatusIcon = status.icon;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div
        className="p-5 cursor-pointer hover:bg-zinc-800/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-4">
          {/* Status Icon */}
          <div className={`w-12 h-12 rounded-xl bg-${status.color}/10 flex items-center justify-center flex-shrink-0`}>
            <StatusIcon className={`w-6 h-6 text-${status.color} ${status.iconClass}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-semibold truncate">{run.goal}</h3>
              <span className={`tag px-2 py-0.5 rounded bg-${status.color}/10 text-${status.color}`}>
                {status.label}
              </span>
            </div>
            <p className="text-sm text-zinc-500 mb-3">
              Orquestrador: <span className="text-zinc-400">{run.orchestratorName}</span>
            </p>

            {/* Meta */}
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {run.startTime}
              </div>
              <div className="flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" />
                {run.duration}
              </div>
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                ${run.cost.toFixed(2)}
              </div>
              <div className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                {run.logs.length} logs
              </div>
            </div>
          </div>

          {/* Expand Button */}
          <button className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center flex-shrink-0">
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-zinc-800/50">
          {/* Final Result */}
          {run.finalResult && (
            <div className="p-5 bg-cyber-green/5 border-b border-zinc-800/50">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-cyber-green" />
                <span className="text-sm font-medium text-cyber-green">Resultado Final</span>
              </div>
              <p className="text-sm text-zinc-300">{run.finalResult}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="p-5">
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-[19px] top-0 bottom-0 w-0.5 timeline-line"></div>

              {/* Logs */}
              <div className="space-y-4">
                {run.logs.map((log, index) => (
                  <LogItem key={log.id} log={log} isLast={index === run.logs.length - 1} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LogItem: React.FC<{ log: RunLog; isLast: boolean }> = ({ log, isLast }) => {
  const phaseColor = log.phase ? phaseColors[log.phase] || 'zinc-500' : 'zinc-500';

  return (
    <div className="relative flex gap-4 animate-slide-in" style={{ animationDelay: '0.1s' }}>
      {/* Avatar */}
      <div className="relative z-10 w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-lg flex-shrink-0 border border-zinc-700">
        {log.agentAvatar || '🤖'}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{log.agentName}</span>
          {log.phase && (
            <span className={`tag px-1.5 py-0.5 rounded bg-${phaseColor}/10 text-${phaseColor}`}>
              {log.phase}
            </span>
          )}
          <span className="text-xs text-zinc-600 font-mono">{log.timestamp}</span>
        </div>

        <div className="flex items-start gap-2">
          {levelIcons[log.level]}
          <p className={`text-sm ${
            log.level === 'error' ? 'text-red-400' :
            log.level === 'success' ? 'text-cyber-green' :
            log.level === 'warn' ? 'text-yellow-400' : 'text-zinc-400'
          }`}>
            {log.message}
          </p>
        </div>

        {/* Artifact */}
        {log.artifact && (
          <div className="mt-3 rounded-xl bg-zinc-900/80 border border-zinc-800 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800/50 bg-zinc-900/50">
              {log.artifact.type === 'code' ? (
                <Code className="w-4 h-4 text-cyber-purple" />
              ) : (
                <FileText className="w-4 h-4 text-cyber-cyan" />
              )}
              <span className="text-xs font-medium text-zinc-400">{log.artifact.label}</span>
            </div>
            <pre className="p-4 text-xs text-zinc-300 overflow-x-auto font-mono">
              {log.artifact.content}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export const Runs: React.FC = () => {
  const { runs } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'completed' | 'failed'>('all');

  const filteredRuns = runs.filter(run => {
    const matchesSearch = run.goal.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || run.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const runningCount = runs.filter(r => r.status === 'running').length;
  const completedCount = runs.filter(r => r.status === 'completed').length;
  const failedCount = runs.filter(r => r.status === 'failed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Execuções</h1>
          <p className="text-zinc-500">Histórico de orquestrações e logs detalhados</p>
        </div>
        <button className="btn-primary px-5 py-2.5 rounded-xl font-semibold text-sm text-zinc-900 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Nova Execução
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
            <Play className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">{runs.length}</p>
            <p className="text-xs text-zinc-500">Total</p>
          </div>
        </div>
        <div className="glass rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-cyber-cyan/10 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-cyber-cyan" />
          </div>
          <div>
            <p className="text-2xl font-bold">{runningCount}</p>
            <p className="text-xs text-zinc-500">Em Execução</p>
          </div>
        </div>
        <div className="glass rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-cyber-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-cyber-green" />
          </div>
          <div>
            <p className="text-2xl font-bold">{completedCount}</p>
            <p className="text-xs text-zinc-500">Concluídas</p>
          </div>
        </div>
        <div className="glass rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{failedCount}</p>
            <p className="text-xs text-zinc-500">Falharam</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar execuções..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full input-modern pl-12 pr-4 py-3 rounded-xl text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'running', 'completed', 'failed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                statusFilter === status
                  ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30'
                  : 'btn-secondary'
              }`}
            >
              {status === 'all' ? 'Todas' :
               status === 'running' ? 'Executando' :
               status === 'completed' ? 'Concluídas' : 'Falharam'}
            </button>
          ))}
        </div>
      </div>

      {/* Runs List */}
      <div className="space-y-4">
        {filteredRuns.map((run, index) => (
          <div key={run.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
            <RunCard run={run} />
          </div>
        ))}

        {filteredRuns.length === 0 && (
          <div className="glass rounded-2xl p-12 text-center">
            <Play className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-400 mb-2">Nenhuma execução encontrada</h3>
            <p className="text-sm text-zinc-600">Inicie uma nova orquestração para ver os resultados aqui</p>
          </div>
        )}
      </div>
    </div>
  );
};
