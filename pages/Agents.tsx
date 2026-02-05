import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { ModelSelector } from '../components/ModelSelector';
import {
  Plus,
  Search,
  ArrowLeft,
  Save,
  Trash2,
  Loader2,
  Bot,
  Zap,
  Settings2,
  Thermometer,
  Cpu,
  FileCode2,
  AlertCircle,
  Users,
} from 'lucide-react';
import {
  listAgents,
  getAgent,
  createAgent,
  updateAgentInSupabase,
  deleteAgentFromSupabase,
  SupabaseAgent,
} from '../lib/supabase';

// === Agent Card ===
const AgentCard: React.FC<{
  agent: SupabaseAgent;
  onDelete: (id: number) => void;
  deleting: number | null;
}> = ({ agent, onDelete, deleting }) => {
  const isDeleting = deleting === agent.id;

  return (
    <div className="relative group p-4 rounded-lg border border-neutral-800 hover:border-neutral-700 transition-colors">
      <Link to={`/agents/${agent.id}`} className="block">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              agent.tipo === 'orchestrator'
                ? 'bg-purple-500/10 text-purple-400'
                : 'bg-blue-500/10 text-blue-400'
            }`}>
              {agent.tipo === 'orchestrator' ? <Settings2 size={18} /> : <Bot size={18} />}
            </div>
            <div>
              <h3 className="font-medium text-white">{agent.nome}</h3>
              <span className={`text-[10px] uppercase font-semibold tracking-wider ${
                agent.tipo === 'orchestrator' ? 'text-purple-400' : 'text-blue-400'
              }`}>
                {agent.tipo === 'orchestrator' ? 'Orquestrador' : 'Especialista'}
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-neutral-500 mb-3 line-clamp-2 font-mono">
          {agent.system ? agent.system.substring(0, 120) + (agent.system.length > 120 ? '...' : '') : 'Sem system prompt'}
        </p>

        <div className="flex items-center gap-4 text-[11px] text-neutral-600">
          <span className="flex items-center gap-1">
            <Cpu size={10} />
            {agent.modelo || 'Sem modelo'}
          </span>
          <span className="flex items-center gap-1">
            <Thermometer size={10} />
            {agent.temperatura ?? 0.7}
          </span>
        </div>
      </Link>

      {/* Delete button — appears on hover */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (agent.id != null && confirm(`Excluir agente "${agent.nome}"?`)) {
            onDelete(agent.id);
          }
        }}
        disabled={isDeleting}
        className="absolute top-3 right-3 p-1.5 rounded text-neutral-700 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
        title="Excluir agente"
      >
        {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      </button>
    </div>
  );
};

// === Agents List ===
export const AgentsList: React.FC = () => {
  const { refreshAgents: refreshContext } = useApp();
  const [agents, setAgents] = useState<SupabaseAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'specialist' | 'orchestrator'>('all');
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAgents();
      setAgents(data);
    } catch {
      setError('Erro ao carregar agentes do Supabase');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleDelete = useCallback(async (id: number) => {
    setDeleting(id);
    const ok = await deleteAgentFromSupabase(id);
    if (ok) {
      setAgents(prev => prev.filter(a => a.id !== id));
      refreshContext();
    } else {
      alert('Erro ao excluir agente');
    }
    setDeleting(null);
  }, [refreshContext]);

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.nome.toLowerCase().includes(search.toLowerCase()) ||
      (agent.system || '').toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || agent.tipo === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Agentes</h1>
          <span className="text-xs text-neutral-600 bg-neutral-900 px-2 py-0.5 rounded-full">
            {agents.length} total
          </span>
        </div>
        <Link
          to="/agents/new"
          className="flex items-center gap-2 px-3 py-2 bg-white text-black text-sm font-medium rounded hover:bg-neutral-200 transition-colors"
        >
          <Plus size={16} />
          Novo Agente
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por nome ou system prompt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 pl-10 text-sm focus:outline-none focus:border-neutral-700"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-700"
        >
          <option value="all">Todos</option>
          <option value="orchestrator">Orquestradores</option>
          <option value="specialist">Especialistas</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={16} />
          {error}
          <button onClick={fetchAgents} className="ml-auto text-xs underline hover:text-red-300">Tentar novamente</button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-neutral-500" />
        </div>
      ) : (
        <>
          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAgents.map(agent => (
              <AgentCard key={agent.id} agent={agent} onDelete={handleDelete} deleting={deleting} />
            ))}
          </div>

          {filteredAgents.length === 0 && !loading && (
            <div className="text-center py-16 space-y-3">
              <Bot size={40} className="mx-auto text-neutral-700" />
              <p className="text-neutral-500">
                {agents.length === 0 ? 'Nenhum agente criado ainda' : 'Nenhum agente encontrado'}
              </p>
              {agents.length === 0 && (
                <Link
                  to="/agents/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-neutral-200"
                >
                  <Plus size={14} />
                  Criar primeiro agente
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// === Agent Editor ===
export const AgentEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshAgents } = useApp();
  const isNew = !id || id === 'new';
  const numericId = isNew ? null : parseInt(id, 10);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [modelo, setModelo] = useState('');
  const [system, setSystem] = useState('');
  const [tipo, setTipo] = useState<string>('specialist');
  const [temperatura, setTemperatura] = useState(0.7);
  const [especialistas, setEspecialistas] = useState<string[]>([]);
  const [modoExecucao, setModoExecucao] = useState<string>('sequencial');
  const [allAgents, setAllAgents] = useState<SupabaseAgent[]>([]);

  // Load all agents (for specialist selector)
  useEffect(() => {
    listAgents().then(setAllAgents);
  }, []);

  const availableSpecialists = allAgents.filter(
    a => a.tipo === 'specialist' && a.id != null && a.id !== numericId
  );

  const toggleSpecialist = (agentId: number) => {
    const idStr = String(agentId);
    setEspecialistas(prev =>
      prev.includes(idStr) ? prev.filter(s => s !== idStr) : [...prev, idStr]
    );
  };

  // Load existing agent
  useEffect(() => {
    if (isNew || numericId == null) return;
    setLoading(true);
    getAgent(numericId).then(agent => {
      if (agent) {
        setNome(agent.nome || '');
        setModelo(agent.modelo || '');
        setSystem(agent.system || '');
        setTipo(agent.tipo || 'specialist');
        setTemperatura(agent.temperatura ?? 0.7);
        setEspecialistas(
          agent.especialistas ? agent.especialistas.split(',').map(s => s.trim()).filter(Boolean) : []
        );
        setModoExecucao(agent.modo_execucao || 'sequencial');
      } else {
        setError('Agente nao encontrado');
      }
      setLoading(false);
    });
  }, [isNew, numericId]);

  const handleSave = async () => {
    if (!nome.trim()) {
      setError('Nome e obrigatorio');
      return;
    }

    setSaving(true);
    setError(null);

    const agentData = {
      nome: nome.trim(),
      modelo,
      system,
      tipo,
      temperatura,
      especialistas: tipo === 'orchestrator' ? especialistas.join(',') : '',
      modo_execucao: tipo === 'orchestrator' ? modoExecucao : '',
    };

    if (isNew) {
      const created = await createAgent(agentData);
      if (created) {
        await refreshAgents();
        navigate('/agents');
      } else {
        setError('Erro ao criar agente no Supabase. Verifique se a tabela agentnhp existe.');
      }
    } else if (numericId != null) {
      const updated = await updateAgentInSupabase(numericId, agentData);
      if (updated) {
        await refreshAgents();
        navigate('/agents');
      } else {
        setError('Erro ao atualizar agente no Supabase');
      }
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (numericId == null) return;
    if (!confirm(`Excluir agente "${nome}"?`)) return;

    setDeleting(true);
    const ok = await deleteAgentFromSupabase(numericId);
    if (ok) {
      await refreshAgents();
      navigate('/agents');
    } else {
      setError('Erro ao excluir agente');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-neutral-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/agents')}
          className="p-2 rounded hover:bg-neutral-800 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-semibold">
          {isNew ? 'Novo Agente' : 'Editar Agente'}
        </h1>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 mb-6 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium mb-2">Tipo</label>
          <div className="grid grid-cols-2 gap-3">
            {(['specialist', 'orchestrator'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`p-4 rounded border text-left transition-colors ${
                  tipo === t
                    ? t === 'orchestrator'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-blue-500 bg-blue-500/10'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {t === 'orchestrator' ? <Settings2 size={16} className="text-purple-400" /> : <Bot size={16} className="text-blue-400" />}
                  <p className="font-medium">
                    {t === 'orchestrator' ? 'Orquestrador' : 'Especialista'}
                  </p>
                </div>
                <p className="text-xs text-neutral-500">
                  {t === 'orchestrator'
                    ? 'Coordena outros agentes, planeja e delega'
                    : 'Executa tarefas especificas com inputs/outputs definidos'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Nome */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <span className="flex items-center gap-1.5">
              <Zap size={14} />
              Nome do Agente
            </span>
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Agente de Vendas, Code Reviewer, Content Writer..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-neutral-700"
          />
        </div>

        {/* Modelo */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <span className="flex items-center gap-1.5">
              <Cpu size={14} />
              Modelo
            </span>
          </label>
          <ModelSelector
            value={modelo}
            onChange={(modelId) => setModelo(modelId)}
            placeholder="Buscar e selecionar modelo..."
          />
        </div>

        {/* Temperatura */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <span className="flex items-center gap-1.5">
              <Thermometer size={14} />
              Temperatura: <span className="font-mono text-neutral-400">{temperatura}</span>
            </span>
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={temperatura}
            onChange={(e) => setTemperatura(parseFloat(e.target.value))}
            className="w-full accent-white"
          />
          <div className="flex justify-between text-xs text-neutral-600 mt-1">
            <span>0 — Preciso / Deterministico</span>
            <span>2 — Criativo / Aleatorio</span>
          </div>
        </div>

        {/* System Prompt */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <span className="flex items-center gap-1.5">
              <FileCode2 size={14} />
              System Prompt
            </span>
          </label>
          <textarea
            value={system}
            onChange={(e) => setSystem(e.target.value)}
            rows={8}
            placeholder="Defina a persona, comportamento, regras e contexto do agente..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-neutral-700 resize-y leading-relaxed"
          />
          <p className="text-[10px] text-neutral-600 mt-1">
            {system.length} caracteres
          </p>
        </div>

        {/* Modo de Execução (only for orchestrators) */}
        {tipo === 'orchestrator' && (
          <div className="border-t border-neutral-800 pt-6">
            <label className="block text-sm font-medium mb-3">Modo de Execução</label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { value: 'sequencial', label: 'Sequencial (Cadeia)', desc: 'Output de um → Input do próximo' },
                { value: 'paralelo', label: 'Paralelo', desc: 'Todos rodam juntos → Orquestrador compila' },
                { value: 'llm', label: 'LLM Define', desc: 'O orquestrador decide a ordem via prompt' },
              ].map(m => (
                <label
                  key={m.value}
                  className={`flex items-start gap-3 p-3 rounded cursor-pointer transition-colors ${
                    modoExecucao === m.value
                      ? 'bg-purple-500/10 border border-purple-500/30'
                      : 'bg-neutral-900 border border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="modoExecucao"
                    value={m.value}
                    checked={modoExecucao === m.value}
                    onChange={() => setModoExecucao(m.value)}
                    className="mt-1 accent-purple-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{m.label}</p>
                    <p className="text-xs text-neutral-500">{m.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Especialistas (only for orchestrators) */}
        {tipo === 'orchestrator' && (
          <div className="border-t border-neutral-800 pt-6">
            <label className="block text-sm font-medium mb-3">
              <span className="flex items-center gap-1.5">
                <Users size={14} />
                Especialistas permitidos
              </span>
            </label>
            <p className="text-xs text-neutral-500 mb-3">
              {modoExecucao === 'sequencial'
                ? 'A ordem de seleção define a ordem de execução (1º → 2º → 3º...)'
                : 'Selecione quais especialistas este orquestrador pode usar'}
            </p>

            {/* Ordem atual */}
            {especialistas.length > 0 && modoExecucao === 'sequencial' && (
              <div className="mb-3 p-2 bg-purple-500/10 border border-purple-500/20 rounded">
                <p className="text-xs text-purple-300 mb-1">Ordem de execução:</p>
                <div className="flex flex-wrap gap-1">
                  {especialistas.map((id, i) => {
                    const spec = allAgents.find(a => String(a.id) === id);
                    return (
                      <span key={id} className="text-xs bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded">
                        {i + 1}. {spec?.nome || id}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {availableSpecialists.length === 0 ? (
              <div className="p-4 rounded border border-dashed border-neutral-800 text-center">
                <p className="text-sm text-neutral-500 mb-2">Nenhum especialista disponivel</p>
                <Link
                  to="/agents/new"
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  Criar um especialista primeiro
                </Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableSpecialists.map(spec => {
                  const isSelected = especialistas.includes(String(spec.id));
                  const orderIndex = especialistas.indexOf(String(spec.id));
                  return (
                    <label
                      key={spec.id}
                      className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-500/10 border border-blue-500/30'
                          : 'bg-neutral-900 border border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSpecialist(spec.id!)}
                        className="rounded accent-blue-500"
                      />
                      {isSelected && modoExecucao === 'sequencial' && (
                        <span className="w-6 h-6 flex items-center justify-center bg-purple-500 text-white text-xs font-bold rounded-full">
                          {orderIndex + 1}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Bot size={14} className="text-blue-400 shrink-0" />
                          <p className="text-sm font-medium text-white truncate">{spec.nome}</p>
                        </div>
                        <p className="text-[11px] text-neutral-500 font-mono truncate mt-0.5">
                          {spec.modelo || 'Sem modelo'}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            {especialistas.length > 0 && (
              <p className="text-[10px] text-neutral-600 mt-2">
                {especialistas.length} especialista{especialistas.length > 1 ? 's' : ''} selecionado{especialistas.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-neutral-800">
          {!isNew && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Excluir
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              onClick={() => navigate('/agents')}
              className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !nome.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-white text-black text-sm font-medium rounded hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isNew ? 'Criar Agente' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
