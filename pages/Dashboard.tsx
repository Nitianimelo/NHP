import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../AppContext';
import {
  Bot,
  Play,
  Database,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Zap,
  Activity,
  BarChart3,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { agents, runs, kbs } = useApp();

  const activeAgents = agents.filter(a => a.status === 'active').length;
  const completedRuns = runs.filter(r => r.status === 'completed').length;
  const failedRuns = runs.filter(r => r.status === 'failed').length;
  const totalCost = runs.reduce((acc, r) => acc + r.cost, 0);

  const stats = [
    {
      label: 'Agentes Ativos',
      value: activeAgents,
      total: agents.length,
      icon: Bot,
      color: 'cyber-cyan',
      trend: '+12%',
      link: '/agents'
    },
    {
      label: 'Execuções Completas',
      value: completedRuns,
      total: runs.length,
      icon: CheckCircle2,
      color: 'cyber-green',
      trend: '+8%',
      link: '/runs'
    },
    {
      label: 'Knowledge Bases',
      value: kbs.length,
      icon: Database,
      color: 'cyber-purple',
      trend: '+2',
      link: '/knowledge'
    },
    {
      label: 'Custo Total',
      value: `$${totalCost.toFixed(2)}`,
      icon: TrendingUp,
      color: 'cyber-pink',
      trend: '-5%'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-zinc-500">Visão geral do sistema cognitivo</p>
        </div>
        <Link
          to="/agents/new"
          className="btn-primary px-5 py-2.5 rounded-xl font-semibold text-sm text-zinc-900 flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Novo Agente
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="glass rounded-2xl p-5 card-hover group"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-11 h-11 rounded-xl bg-${stat.color}/10 flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}`} />
              </div>
              {stat.trend && (
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  stat.trend.startsWith('+')
                    ? 'bg-cyber-green/10 text-cyber-green'
                    : 'bg-cyber-pink/10 text-cyber-pink'
                }`}>
                  {stat.trend}
                </span>
              )}
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold mb-1">{stat.value}</p>
                <p className="text-xs text-zinc-500">
                  {stat.label}
                  {stat.total && <span className="text-zinc-600"> / {stat.total}</span>}
                </p>
              </div>
              {stat.link && (
                <Link
                  to={stat.link}
                  className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ArrowUpRight className="w-4 h-4 text-zinc-400" />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Runs */}
        <div className="lg:col-span-2 glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyber-cyan/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-cyber-cyan" />
              </div>
              <div>
                <h2 className="font-semibold">Execuções Recentes</h2>
                <p className="text-xs text-zinc-500">Últimas atividades do sistema</p>
              </div>
            </div>
            <Link to="/runs" className="text-sm text-cyber-cyan hover:underline flex items-center gap-1">
              Ver todas
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {runs.slice(0, 4).map((run) => (
              <div
                key={run.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                  run.status === 'completed' ? 'bg-cyber-green/10' :
                  run.status === 'failed' ? 'bg-red-500/10' : 'bg-cyber-cyan/10'
                }`}>
                  {run.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-cyber-green" />
                  ) : run.status === 'failed' ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <Play className="w-5 h-5 text-cyber-cyan" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{run.goal}</p>
                  <p className="text-xs text-zinc-500">{run.orchestratorName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-400">{run.startTime}</p>
                  <p className="text-xs text-zinc-600">{run.duration}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Agents */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyber-purple/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-cyber-purple" />
              </div>
              <div>
                <h2 className="font-semibold">Agentes</h2>
                <p className="text-xs text-zinc-500">Time disponível</p>
              </div>
            </div>
            <Link to="/agents" className="text-sm text-cyber-cyan hover:underline flex items-center gap-1">
              Ver todos
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                to={`/agents/${agent.id}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-cyber-cyan/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-xl">
                  {agent.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate group-hover:text-cyber-cyan transition-colors">
                    {agent.name}
                  </p>
                  <p className="text-xs text-zinc-500">{agent.role}</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  agent.status === 'active' ? 'bg-cyber-green' : 'bg-zinc-600'
                }`}></div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass rounded-2xl p-6 gradient-border">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyber-cyan to-cyber-purple flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Início Rápido</h2>
            <p className="text-sm text-zinc-500">Execute uma orquestração com um clique</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-cyber-cyan/30 transition-all text-left group">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🚀</span>
              <span className="font-medium group-hover:text-cyber-cyan transition-colors">Landing Page</span>
            </div>
            <p className="text-xs text-zinc-500">Copy + Código React</p>
          </button>

          <button className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-cyber-purple/30 transition-all text-left group">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📝</span>
              <span className="font-medium group-hover:text-cyber-purple transition-colors">Conteúdo Blog</span>
            </div>
            <p className="text-xs text-zinc-500">Artigo SEO otimizado</p>
          </button>

          <button className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-cyber-pink/30 transition-all text-left group">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📊</span>
              <span className="font-medium group-hover:text-cyber-pink transition-colors">Análise de Dados</span>
            </div>
            <p className="text-xs text-zinc-500">Relatório completo</p>
          </button>
        </div>
      </div>
    </div>
  );
};
