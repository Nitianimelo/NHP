import React, { useState } from 'react';
import { useApp } from '../AppContext';
import {
  Database,
  Plus,
  Search,
  FileText,
  Upload,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Clock,
  HardDrive,
  Layers,
  MoreVertical,
  FolderOpen,
  File,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export const Knowledge: React.FC = () => {
  const { kbs } = useApp();
  const [selectedKb, setSelectedKb] = useState<string | null>(null);

  const statusConfig = {
    indexed: { color: 'cyber-green', icon: CheckCircle2, label: 'Indexado' },
    indexing: { color: 'cyber-cyan', icon: RefreshCw, label: 'Indexando', iconClass: 'animate-spin' },
    pending: { color: 'yellow-500', icon: Clock, label: 'Pendente' }
  };

  // Mock documents for the selected KB
  const mockDocuments = [
    { id: 'd1', name: 'brand-guidelines.pdf', size: '2.4 MB', type: 'PDF', status: 'synced' },
    { id: 'd2', name: 'tone-of-voice.docx', size: '856 KB', type: 'DOCX', status: 'synced' },
    { id: 'd3', name: 'product-descriptions.txt', size: '124 KB', type: 'TXT', status: 'synced' },
    { id: 'd4', name: 'marketing-copy-examples.md', size: '67 KB', type: 'MD', status: 'pending' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Knowledge Bases</h1>
          <p className="text-zinc-500">Gerencie bases de conhecimento para RAG</p>
        </div>
        <button className="btn-primary px-5 py-2.5 rounded-xl font-semibold text-sm text-zinc-900 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nova Knowledge Base
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-cyber-purple/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-cyber-purple" />
          </div>
          <div>
            <p className="text-2xl font-bold">{kbs.length}</p>
            <p className="text-xs text-zinc-500">Knowledge Bases</p>
          </div>
        </div>
        <div className="glass rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-cyber-cyan/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-cyber-cyan" />
          </div>
          <div>
            <p className="text-2xl font-bold">{kbs.reduce((acc, kb) => acc + kb.docCount, 0)}</p>
            <p className="text-xs text-zinc-500">Documentos</p>
          </div>
        </div>
        <div className="glass rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-cyber-green/10 flex items-center justify-center">
            <Layers className="w-5 h-5 text-cyber-green" />
          </div>
          <div>
            <p className="text-2xl font-bold">{kbs.reduce((acc, kb) => acc + kb.chunkCount, 0).toLocaleString()}</p>
            <p className="text-xs text-zinc-500">Chunks Indexados</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KB List */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar KBs..."
              className="w-full input-modern pl-12 pr-4 py-3 rounded-xl text-sm"
            />
          </div>

          <div className="space-y-2">
            {kbs.map((kb) => {
              const status = statusConfig[kb.status];
              const StatusIcon = status.icon;
              const isSelected = selectedKb === kb.id;

              return (
                <button
                  key={kb.id}
                  onClick={() => setSelectedKb(kb.id)}
                  className={`w-full glass rounded-xl p-4 text-left transition-all ${
                    isSelected
                      ? 'border-cyber-purple/50 bg-cyber-purple/5'
                      : 'hover:bg-zinc-800/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyber-purple/10 flex items-center justify-center flex-shrink-0">
                      <Database className="w-5 h-5 text-cyber-purple" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{kb.name}</h3>
                        <span className={`tag px-1.5 py-0.5 rounded bg-${status.color}/10 text-${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 truncate">{kb.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-zinc-600">
                        <span>{kb.docCount} docs</span>
                        <span>{kb.chunkCount.toLocaleString()} chunks</span>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-zinc-600 flex-shrink-0 transition-transform ${
                      isSelected ? 'rotate-90' : ''
                    }`} />
                  </div>
                </button>
              );
            })}

            {/* Add New KB */}
            <button className="w-full glass rounded-xl p-4 border-2 border-dashed border-zinc-700 hover:border-cyber-purple/50 transition-colors group">
              <div className="flex items-center justify-center gap-2 text-zinc-500 group-hover:text-cyber-purple transition-colors">
                <Plus className="w-5 h-5" />
                <span className="font-medium">Nova Knowledge Base</span>
              </div>
            </button>
          </div>
        </div>

        {/* KB Details */}
        <div className="lg:col-span-2">
          {selectedKb ? (
            <div className="glass rounded-2xl overflow-hidden">
              {/* KB Header */}
              <div className="p-6 border-b border-zinc-800/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyber-purple to-cyber-pink flex items-center justify-center">
                      <Database className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold mb-1">
                        {kbs.find(kb => kb.id === selectedKb)?.name}
                      </h2>
                      <p className="text-sm text-zinc-500">
                        {kbs.find(kb => kb.id === selectedKb)?.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="btn-secondary px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Re-indexar
                    </button>
                    <button className="w-9 h-9 rounded-lg bg-zinc-800/50 flex items-center justify-center hover:bg-zinc-700/50 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-4 gap-4 mt-6">
                  <div className="text-center p-3 rounded-lg bg-zinc-900/50">
                    <p className="text-lg font-bold text-cyber-cyan">
                      {kbs.find(kb => kb.id === selectedKb)?.docCount}
                    </p>
                    <p className="text-xs text-zinc-500">Documentos</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-zinc-900/50">
                    <p className="text-lg font-bold text-cyber-purple">
                      {kbs.find(kb => kb.id === selectedKb)?.chunkCount.toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-500">Chunks</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-zinc-900/50">
                    <p className="text-lg font-bold text-cyber-green">98%</p>
                    <p className="text-xs text-zinc-500">Cobertura</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-zinc-900/50">
                    <p className="text-lg font-bold text-cyber-pink">3</p>
                    <p className="text-xs text-zinc-500">Agentes</p>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Documentos</h3>
                  <button className="btn-primary px-4 py-2 rounded-lg text-sm text-zinc-900 font-medium flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload
                  </button>
                </div>

                {/* Upload Zone */}
                <div className="mb-4 p-6 rounded-xl border-2 border-dashed border-zinc-700 hover:border-cyber-cyan/50 transition-colors text-center group cursor-pointer">
                  <Upload className="w-8 h-8 text-zinc-600 mx-auto mb-2 group-hover:text-cyber-cyan transition-colors" />
                  <p className="text-sm text-zinc-500 group-hover:text-zinc-400 transition-colors">
                    Arraste arquivos aqui ou clique para fazer upload
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">PDF, DOCX, TXT, MD (máx 10MB)</p>
                </div>

                {/* Documents List */}
                <div className="space-y-2">
                  {mockDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/50 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                        <File className="w-5 h-5 text-zinc-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{doc.name}</p>
                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                          <span>{doc.type}</span>
                          <span>{doc.size}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.status === 'synced' ? (
                          <span className="flex items-center gap-1 text-xs text-cyber-green">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Sincronizado
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-yellow-500">
                            <Clock className="w-3.5 h-3.5" />
                            Pendente
                          </span>
                        )}
                        <button className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-10 h-10 text-zinc-600" />
              </div>
              <h3 className="text-lg font-medium text-zinc-400 mb-2">Selecione uma Knowledge Base</h3>
              <p className="text-sm text-zinc-600 max-w-sm">
                Escolha uma KB na lista ao lado para visualizar e gerenciar seus documentos
              </p>
            </div>
          )}
        </div>
      </div>

      {/* AI Suggestion Card */}
      <div className="glass rounded-2xl p-6 gradient-border">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyber-purple to-cyber-pink flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Otimização com IA</h3>
            <p className="text-sm text-zinc-500 mb-4">
              Nossa IA pode analisar seus documentos e sugerir melhorias na estrutura de chunks
              para obter resultados de RAG mais precisos.
            </p>
            <button className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium">
              Analisar Knowledge Bases
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
