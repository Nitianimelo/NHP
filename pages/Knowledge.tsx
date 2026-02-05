import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../AppContext';
import { Plus, Search, Trash2, X, BookOpen, Tag, User, FileText, Save, RefreshCw } from 'lucide-react';
import {
  listKnowledge,
  createKnowledge,
  deleteKnowledge,
  searchKnowledge,
  SupabaseKnowledge,
} from '../lib/supabase';

export const Knowledge: React.FC = () => {
  const { agents } = useApp();
  const [entries, setEntries] = useState<SupabaseKnowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<SupabaseKnowledge | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state for new entry
  const [newTitulo, setNewTitulo] = useState('');
  const [newConteudo, setNewConteudo] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newAgenteId, setNewAgenteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listKnowledge();
      setEntries(data);
    } catch (err) {
      console.error('Failed to load knowledge:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadEntries();
      return;
    }
    setLoading(true);
    try {
      const results = await searchKnowledge(searchQuery);
      setEntries(results);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitulo.trim() || !newConteudo.trim()) {
      alert('Título e Conteúdo são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const created = await createKnowledge({
        titulo: newTitulo.trim(),
        conteudo: newConteudo.trim(),
        tags: newTags.trim() || undefined,
        agente_id: newAgenteId,
      });
      if (created) {
        setEntries(prev => [created, ...prev]);
        setShowAddModal(false);
        resetForm();
      } else {
        alert('Erro ao criar conhecimento');
      }
    } catch (err) {
      console.error('Create failed:', err);
      alert('Erro ao criar conhecimento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este conhecimento?')) return;
    try {
      const success = await deleteKnowledge(id);
      if (success) {
        setEntries(prev => prev.filter(e => e.id !== id));
        if (selectedEntry?.id === id) {
          setSelectedEntry(null);
        }
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const resetForm = () => {
    setNewTitulo('');
    setNewConteudo('');
    setNewTags('');
    setNewAgenteId(null);
  };

  const getAgentName = (agenteId: number | null | undefined) => {
    if (!agenteId) return 'Global (todos os agentes)';
    const agent = agents.find(a => String(a.id) === String(agenteId));
    return agent?.name || `Agente #${agenteId}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen size={24} />
            Base de Conhecimento RAG
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Gerencie o conhecimento que os agentes podem acessar
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadEntries}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-neutral-700 rounded hover:bg-neutral-800"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white text-black text-sm font-medium rounded hover:bg-neutral-200"
          >
            <Plus size={16} />
            Novo Conhecimento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Entry List */}
        <div className="space-y-3">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Buscar conhecimento..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 pl-10 text-sm focus:outline-none focus:border-neutral-700"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-3 py-2 text-sm border border-neutral-700 rounded hover:bg-neutral-800"
            >
              Buscar
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-neutral-500">Carregando...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              <FileText size={32} className="mx-auto mb-2 opacity-50" />
              <p>Nenhum conhecimento cadastrado</p>
              <p className="text-xs mt-1">Clique em "Novo Conhecimento" para começar</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {entries.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className={`w-full p-3 rounded-lg border text-left transition-colors ${
                    selectedEntry?.id === entry.id
                      ? 'border-purple-500 bg-neutral-900'
                      : 'border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <p className="font-medium text-sm mb-1 truncate">{entry.titulo}</p>
                  <p className="text-xs text-neutral-500 mb-2 line-clamp-2">
                    {entry.conteudo.substring(0, 100)}...
                  </p>
                  <div className="flex items-center gap-2 text-xs text-neutral-600">
                    {entry.tags && (
                      <span className="flex items-center gap-1">
                        <Tag size={10} />
                        {entry.tags.split(',').slice(0, 2).join(', ')}
                      </span>
                    )}
                    {entry.agente_id && (
                      <span className="flex items-center gap-1">
                        <User size={10} />
                        {getAgentName(entry.agente_id).substring(0, 15)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Entry Details */}
        <div className="col-span-2">
          {selectedEntry ? (
            <div className="rounded-lg border border-neutral-800 h-full">
              <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                <h2 className="text-lg font-medium">{selectedEntry.titulo}</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => selectedEntry.id && handleDelete(selectedEntry.id)}
                    className="p-2 text-neutral-500 hover:text-red-400"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => setSelectedEntry(null)}
                    className="p-2 text-neutral-500 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Metadata */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 rounded bg-neutral-900">
                    <p className="text-xs text-neutral-500 mb-1">Agente Associado</p>
                    <p className="text-sm font-medium">{getAgentName(selectedEntry.agente_id)}</p>
                  </div>
                  <div className="p-3 rounded bg-neutral-900">
                    <p className="text-xs text-neutral-500 mb-1">Tags</p>
                    <p className="text-sm font-medium">{selectedEntry.tags || 'Nenhuma'}</p>
                  </div>
                  <div className="p-3 rounded bg-neutral-900">
                    <p className="text-xs text-neutral-500 mb-1">Criado em</p>
                    <p className="text-sm font-medium">{formatDate(selectedEntry.created_at)}</p>
                  </div>
                </div>

                {/* Content */}
                <div>
                  <p className="text-xs text-neutral-500 mb-2">Conteúdo</p>
                  <div className="p-4 rounded bg-neutral-900 max-h-[400px] overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {selectedEntry.conteudo}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center rounded-lg border border-neutral-800 text-neutral-500">
              <BookOpen size={48} className="mb-4 opacity-30" />
              <p>Selecione um conhecimento para visualizar</p>
              <p className="text-xs mt-1">ou adicione um novo clicando no botão acima</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <h2 className="text-lg font-medium">Novo Conhecimento</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="p-1 text-neutral-500 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Título */}
              <div>
                <label className="block text-sm font-medium mb-1">Título *</label>
                <input
                  type="text"
                  value={newTitulo}
                  onChange={e => setNewTitulo(e.target.value)}
                  placeholder="Ex: Guia de Tom de Voz da Marca"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-600"
                />
              </div>

              {/* Conteúdo */}
              <div>
                <label className="block text-sm font-medium mb-1">Conteúdo *</label>
                <textarea
                  value={newConteudo}
                  onChange={e => setNewConteudo(e.target.value)}
                  placeholder="Cole aqui o texto do conhecimento..."
                  rows={12}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-600 font-mono"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  {newConteudo.length} caracteres
                </p>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-1">Tags (separadas por vírgula)</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={e => setNewTags(e.target.value)}
                  placeholder="Ex: marca, comunicação, tom de voz"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-600"
                />
              </div>

              {/* Agente Associado */}
              <div>
                <label className="block text-sm font-medium mb-1">Agente Associado</label>
                <select
                  value={newAgenteId ?? ''}
                  onChange={e => setNewAgenteId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-600"
                >
                  <option value="">Global (todos os agentes)</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.type})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-neutral-500 mt-1">
                  Se global, todos os agentes terão acesso. Se específico, apenas o agente selecionado.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-neutral-800 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-sm border border-neutral-700 rounded hover:bg-neutral-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !newTitulo.trim() || !newConteudo.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                {saving ? 'Salvando...' : 'Salvar Conhecimento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
