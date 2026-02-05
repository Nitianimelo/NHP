import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../AppContext';
import { Plus } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { agents, runs, kbs } = useApp();

  const activeAgents = agents.filter(a => a.status === 'active').length;
  const completedRuns = runs.filter(r => r.status === 'completed').length;
  const failedRuns = runs.filter(r => r.status === 'failed').length;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold">Nini Hub Paradise</h1>
        <Link
          to="/agents/new"
          className="flex items-center gap-2 px-3 py-2 bg-white text-black text-sm font-medium rounded hover:bg-neutral-200"
        >
          <Plus size={16} />
          Novo Agente
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-lg border border-neutral-800">
          <p className="text-2xl font-semibold">{activeAgents}</p>
          <p className="text-sm text-neutral-500">Agentes Ativos</p>
        </div>
        <div className="p-4 rounded-lg border border-neutral-800">
          <p className="text-2xl font-semibold">{runs.length}</p>
          <p className="text-sm text-neutral-500">Execuções</p>
        </div>
        <div className="p-4 rounded-lg border border-neutral-800">
          <p className="text-2xl font-semibold">{completedRuns}</p>
          <p className="text-sm text-neutral-500">Concluídas</p>
        </div>
        <div className="p-4 rounded-lg border border-neutral-800">
          <p className="text-2xl font-semibold">{kbs.length}</p>
          <p className="text-sm text-neutral-500">Knowledge Bases</p>
        </div>
      </div>

      {/* Recent Runs */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-neutral-400">Execuções Recentes</h2>
          <Link to="/runs" className="text-sm text-neutral-500 hover:text-white">
            Ver todas
          </Link>
        </div>
        <div className="space-y-2">
          {runs.slice(0, 5).map(run => (
            <div
              key={run.id}
              className="flex items-center justify-between p-3 rounded-lg border border-neutral-800"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{run.goal}</p>
                <p className="text-xs text-neutral-500">{run.orchestratorName}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs ${
                  run.status === 'completed' ? 'text-green-500' :
                  run.status === 'failed' ? 'text-red-500' : 'text-neutral-500'
                }`}>
                  {run.status}
                </span>
                <span className="text-xs text-neutral-600">{run.startTime}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agents */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-neutral-400">Agentes</h2>
          <Link to="/agents" className="text-sm text-neutral-500 hover:text-white">
            Ver todos
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {agents.map(agent => (
            <Link
              key={agent.id}
              to={`/agents/${agent.id}`}
              className="p-3 rounded-lg border border-neutral-800 hover:border-neutral-700"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">{agent.name}</p>
                <span className={`w-2 h-2 rounded-full ${
                  agent.status === 'active' ? 'bg-green-500' : 'bg-neutral-600'
                }`}></span>
              </div>
              <p className="text-xs text-neutral-500">{agent.role}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
