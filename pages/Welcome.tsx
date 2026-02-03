import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const Welcome: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-950">
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <span className="font-semibold text-lg">NHP</span>
        <Link
          to="/"
          className="flex items-center gap-2 px-4 py-2 text-sm border border-neutral-800 rounded hover:bg-neutral-900"
        >
          Entrar
          <ArrowRight size={16} />
        </Link>
      </header>

      {/* Hero */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          <p className="text-sm text-neutral-500 mb-4">Cognitive Operating System</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Nini Hub Paradise
          </h1>
          <p className="text-lg text-neutral-400 mb-8">
            Sistema para orquestração de agentes de IA.
            <br />
            Framework I-P-A-O: Input → Process → Action → Output
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/"
              className="px-6 py-3 bg-white text-black font-medium rounded hover:bg-neutral-200"
            >
              Começar
            </Link>
            <button className="px-6 py-3 border border-neutral-700 rounded hover:bg-neutral-900">
              Documentação
            </button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 pb-12">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-neutral-800">
            <p className="font-medium mb-1">Agentes Modulares</p>
            <p className="text-sm text-neutral-500">Especialistas e orquestradores</p>
          </div>
          <div className="p-4 rounded-lg border border-neutral-800">
            <p className="font-medium mb-1">Framework I-P-A-O</p>
            <p className="text-sm text-neutral-500">Rastreabilidade total</p>
          </div>
          <div className="p-4 rounded-lg border border-neutral-800">
            <p className="font-medium mb-1">Knowledge Bases</p>
            <p className="text-sm text-neutral-500">RAG integrado</p>
          </div>
          <div className="p-4 rounded-lg border border-neutral-800">
            <p className="font-medium mb-1">Orquestração</p>
            <p className="text-sm text-neutral-500">Sequencial, paralelo, dinâmico</p>
          </div>
        </div>
      </div>
    </div>
  );
};
