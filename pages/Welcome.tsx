import React from 'react';
import { Link } from 'react-router-dom';
import {
  Hexagon,
  ArrowRight,
  Sparkles,
  Bot,
  Workflow,
  Database,
  Zap,
  Layers,
  GitBranch,
  ChevronRight
} from 'lucide-react';

export const Welcome: React.FC = () => {
  const features = [
    {
      icon: Bot,
      title: 'Agentes Modulares',
      description: 'Crie especialistas e orquestradores que colaboram em tempo real',
      color: 'cyber-cyan'
    },
    {
      icon: Workflow,
      title: 'Framework I-P-A-O',
      description: 'Input → Process → Action → Output com rastreabilidade total',
      color: 'cyber-purple'
    },
    {
      icon: Database,
      title: 'Knowledge Bases',
      description: 'RAG integrado para contexto persistente em cada agente',
      color: 'cyber-pink'
    },
    {
      icon: GitBranch,
      title: 'Orquestração Dinâmica',
      description: 'Planejamento sequencial, paralelo ou adaptativo',
      color: 'cyber-green'
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 grid-bg"></div>

      {/* Floating Orbs */}
      <div className="orb w-[500px] h-[500px] bg-cyber-cyan top-[-200px] left-[-100px] animate-pulse-slow"></div>
      <div className="orb w-[600px] h-[600px] bg-cyber-purple bottom-[-300px] right-[-200px] animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      <div className="orb w-[300px] h-[300px] bg-cyber-pink top-1/2 left-1/2 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyber-cyan via-cyber-purple to-cyber-pink flex items-center justify-center glow-cyan">
              <Hexagon className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-xl">NHP</span>
          </div>
          <Link
            to="/"
            className="btn-secondary px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 hover:glow-cyan"
          >
            Entrar no Sistema
            <ArrowRight className="w-4 h-4" />
          </Link>
        </header>

        {/* Hero */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-8 animate-slide-up">
              <Sparkles className="w-4 h-4 text-cyber-cyan" />
              <span className="text-sm text-zinc-400">Cognitive Operating System</span>
              <span className="tag px-2 py-0.5 rounded bg-cyber-cyan/20 text-cyber-cyan">BETA</span>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <span className="gradient-text">Nini Hub</span>
              <br />
              <span className="text-white">Paradise</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto mb-12 animate-slide-up leading-relaxed" style={{ animationDelay: '0.2s' }}>
              Orquestre unidades funcionais de inteligência.
              <br />
              <span className="text-zinc-500">Um sistema operacional para seus agentes de IA.</span>
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <Link
                to="/"
                className="btn-primary px-8 py-4 rounded-xl font-semibold text-lg text-zinc-900 flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5" />
                Começar Agora
              </Link>
              <button className="btn-secondary px-8 py-4 rounded-xl font-medium text-lg flex items-center justify-center gap-2">
                <Layers className="w-5 h-5" />
                Ver Documentação
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="px-6 pb-20">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="glass rounded-2xl p-6 card-hover animate-slide-up"
                style={{ animationDelay: `${0.4 + index * 0.1}s` }}
              >
                <div className={`w-12 h-12 rounded-xl bg-${feature.color}/10 flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-6 h-6 text-${feature.color}`} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="p-6 text-center text-xs text-zinc-600">
          <p>Sistema desenvolvido para orquestração de agentes inteligentes</p>
        </footer>
      </div>
    </div>
  );
};
