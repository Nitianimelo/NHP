import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { Agent, AgentType } from '../types';
import {
  Bot,
  Plus,
  Search,
  Filter,
  ChevronRight,
  Cpu,
  Users,
  Sparkles,
  ArrowLeft,
  Save,
  Trash2,
  Settings,
  Brain,
  Database,
  Code,
  Layers,
  Zap,
  GitBranch,
  MoreVertical
} from 'lucide-react';

// Agent Card Component
const AgentCard: React.FC<{ agent: Agent }> = ({ agent }) => {
  const typeColors = {
    orchestrator: 'cyber-cyan',
    specialist: 'cyber-purple'
  };

  const color = typeColors[agent.type];

  return (
    <Link
      to={`/agents/${agent.id}`}
      className="glass rounded-2xl p-5 card-hover group block"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-2xl border border-zinc-700/50`}>
            {agent.avatar}
          </div>
          <div>
            <h3 className="font-semibold group-hover:text-cyber-cyan transition-colors">
              {agent.name}
            </h3>
            <p className="text-xs text-zinc-500">{agent.role}</p>
          </div>
        </div>
        <div className={`w-2 h-2 rounded-full mt-2 ${
          agent.status === 'active' ? 'bg-cyber-green status-dot' :
          agent.status === 'draft' ? 'bg-yellow-500' : 'bg-zinc-600'
        }`}></div>
      </div>

      {/* Description */}
      <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
        {agent.description}
      </p>

      {/* Tags */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`tag px-2 py-1 rounded-md bg-${color}/10 text-${color}`}>
          {agent.type === 'orchestrator' ? 'Orquestrador' : 'Especialista'}
        </span>
        {agent.tags.map(tag => (
          <span key={tag} className="tag px-2 py-1 rounded-md bg-zinc-800 text-zinc-400">
            {tag}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Cpu className="w-3 h-3" />
          <span className="font-mono">{agent.model}</span>
        </div>
        <span className="text-xs text-zinc-600">{agent.lastUpdated}</span>
      </div>
    </Link>
  );
};

// Agents List Page
export const AgentsList: React.FC = () => {
  const { agents } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | AgentType>('all');

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(search.toLowerCase()) ||
      agent.description.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || agent.type === filter;
    return matchesSearch && matchesFilter;
  });

  const orchestrators = agents.filter(a => a.type === 'orchestrator').length;
  const specialists = agents.filter(a => a.type === 'specialist').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Agentes</h1>
          <p className="text-zinc-500">Gerencie sua equipe de agentes inteligentes</p>
        </div>
        <Link
          to="/agents/new"
          className="btn-primary px-5 py-2.5 rounded-xl font-semibold text-sm text-zinc-900 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Agente
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
            <Users className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">{agents.length}</p>
            <p className="text-xs text-zinc-500">Total de Agentes</p>
          </div>
        </div>
        <div className="glass rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-cyber-cyan/10 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-cyber-cyan" />
          </div>
          <div>
            <p className="text-2xl font-bold">{orchestrators}</p>
            <p className="text-xs text-zinc-500">Orquestradores</p>
          </div>
        </div>
        <div className="glass rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-cyber-purple/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-cyber-purple" />
          </div>
          <div>
            <p className="text-2xl font-bold">{specialists}</p>
            <p className="text-xs text-zinc-500">Especialistas</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar agentes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full input-modern pl-12 pr-4 py-3 rounded-xl text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'orchestrator', 'specialist'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                filter === type
                  ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30'
                  : 'btn-secondary'
              }`}
            >
              {type === 'all' ? 'Todos' : type === 'orchestrator' ? 'Orquestradores' : 'Especialistas'}
            </button>
          ))}
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgents.map((agent, index) => (
          <div key={agent.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
            <AgentCard agent={agent} />
          </div>
        ))}

        {/* Add New Card */}
        <Link
          to="/agents/new"
          className="glass rounded-2xl p-5 border-2 border-dashed border-zinc-700 hover:border-cyber-cyan/50 transition-colors flex flex-col items-center justify-center min-h-[240px] group"
        >
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4 group-hover:bg-cyber-cyan/10 transition-colors">
            <Plus className="w-7 h-7 text-zinc-500 group-hover:text-cyber-cyan transition-colors" />
          </div>
          <p className="font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors">Criar Novo Agente</p>
        </Link>
      </div>
    </div>
  );
};

// Agent Editor Page
export const AgentEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { agents, addAgent, updateAgent } = useApp();

  const existingAgent = id ? agents.find(a => a.id === id) : null;
  const isNew = !existingAgent;

  const [formData, setFormData] = useState<Partial<Agent>>(existingAgent || {
    type: 'specialist',
    name: '',
    role: '',
    description: '',
    avatar: '🤖',
    model: 'gpt-4o',
    provider: 'openai',
    temperature: 0.7,
    systemPrompt: '',
    ragEnabled: false,
    inputSchema: [],
    outputSchema: [],
    allowedActions: [],
    status: 'draft',
    tags: [],
  });

  const [activeTab, setActiveTab] = useState('basic');

  const tabs = [
    { id: 'basic', label: 'Básico', icon: Bot },
    { id: 'model', label: 'Modelo', icon: Brain },
    { id: 'prompt', label: 'Prompt', icon: Code },
    { id: 'knowledge', label: 'Knowledge', icon: Database },
    { id: 'advanced', label: 'Avançado', icon: Settings },
  ];

  const avatars = ['🤖', '👔', '📝', '💻', '🎨', '📊', '🔬', '🎯', '⚡', '🧠'];
  const models = [
    { value: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', provider: 'openai' },
    { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet', provider: 'anthropic' },
    { value: 'claude-3-opus', label: 'Claude 3 Opus', provider: 'anthropic' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', provider: 'google' },
  ];

  const handleSave = () => {
    if (isNew) {
      const newAgent: Agent = {
        ...formData as Agent,
        id: `a${Date.now()}`,
        lastUpdated: 'Agora mesmo',
      };
      addAgent(newAgent);
    } else {
      updateAgent(id!, formData);
    }
    navigate('/agents');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/agents')}
            className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center hover:bg-zinc-700/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">
              {isNew ? 'Novo Agente' : `Editar: ${existingAgent?.name}`}
            </h1>
            <p className="text-sm text-zinc-500">
              Configure as propriedades do agente
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isNew && (
            <button className="btn-secondary px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 text-red-400 hover:text-red-300">
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          )}
          <button
            onClick={handleSave}
            className="btn-primary px-5 py-2.5 rounded-xl font-semibold text-sm text-zinc-900 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Salvar Agente
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass rounded-2xl p-1.5 flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form Content */}
      <div className="glass rounded-2xl p-6">
        {activeTab === 'basic' && (
          <div className="space-y-6">
            {/* Type Selection */}
            <div>
              <label className="block text-sm font-medium mb-3">Tipo de Agente</label>
              <div className="grid grid-cols-2 gap-4">
                {(['specialist', 'orchestrator'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFormData({ ...formData, type })}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      formData.type === type
                        ? type === 'orchestrator'
                          ? 'border-cyber-cyan bg-cyber-cyan/5'
                          : 'border-cyber-purple bg-cyber-purple/5'
                        : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {type === 'orchestrator' ? (
                        <GitBranch className={`w-5 h-5 ${formData.type === type ? 'text-cyber-cyan' : 'text-zinc-500'}`} />
                      ) : (
                        <Sparkles className={`w-5 h-5 ${formData.type === type ? 'text-cyber-purple' : 'text-zinc-500'}`} />
                      )}
                      <span className="font-medium">
                        {type === 'orchestrator' ? 'Orquestrador' : 'Especialista'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {type === 'orchestrator'
                        ? 'Coordena outros agentes e delega tarefas'
                        : 'Executa tarefas específicas com expertise'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Avatar */}
            <div>
              <label className="block text-sm font-medium mb-3">Avatar</label>
              <div className="flex gap-2">
                {avatars.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setFormData({ ...formData, avatar: emoji })}
                    className={`w-12 h-12 rounded-xl text-2xl transition-all ${
                      formData.avatar === emoji
                        ? 'bg-cyber-cyan/20 border-2 border-cyber-cyan'
                        : 'bg-zinc-800 hover:bg-zinc-700 border-2 border-transparent'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Name & Role */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Assistente de Marketing"
                  className="w-full input-modern px-4 py-3 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <input
                  type="text"
                  value={formData.role || ''}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="Ex: Copywriter"
                  className="w-full input-modern px-4 py-3 rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Descrição</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o que este agente faz..."
                rows={3}
                className="w-full input-modern px-4 py-3 rounded-xl text-sm resize-none"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium mb-2">Tags</label>
              <input
                type="text"
                placeholder="marketing, seo, conteúdo (separados por vírgula)"
                className="w-full input-modern px-4 py-3 rounded-xl text-sm"
              />
            </div>
          </div>
        )}

        {activeTab === 'model' && (
          <div className="space-y-6">
            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium mb-3">Modelo de IA</label>
              <div className="grid grid-cols-1 gap-2">
                {models.map((model) => (
                  <button
                    key={model.value}
                    onClick={() => setFormData({ ...formData, model: model.value, provider: model.provider })}
                    className={`p-4 rounded-xl border transition-all text-left flex items-center justify-between ${
                      formData.model === model.value
                        ? 'border-cyber-cyan bg-cyber-cyan/5'
                        : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        model.provider === 'openai' ? 'bg-green-500/10' :
                        model.provider === 'anthropic' ? 'bg-orange-500/10' : 'bg-blue-500/10'
                      }`}>
                        <Brain className={`w-5 h-5 ${
                          model.provider === 'openai' ? 'text-green-500' :
                          model.provider === 'anthropic' ? 'text-orange-500' : 'text-blue-500'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium">{model.label}</p>
                        <p className="text-xs text-zinc-500 capitalize">{model.provider}</p>
                      </div>
                    </div>
                    {formData.model === model.value && (
                      <div className="w-5 h-5 rounded-full bg-cyber-cyan flex items-center justify-center">
                        <span className="text-zinc-900 text-xs">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Temperature */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Temperature: <span className="text-cyber-cyan">{formData.temperature}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={formData.temperature || 0.7}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyber-cyan"
              />
              <div className="flex justify-between mt-2 text-xs text-zinc-500">
                <span>Preciso</span>
                <span>Criativo</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'prompt' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">System Prompt</label>
              <textarea
                value={formData.systemPrompt || ''}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                placeholder="Você é um assistente especializado em..."
                rows={12}
                className="w-full input-modern px-4 py-3 rounded-xl text-sm font-mono resize-none"
              />
              <p className="text-xs text-zinc-500 mt-2">
                Defina a persona e comportamento base do agente
              </p>
            </div>
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-cyber-purple" />
                <div>
                  <p className="font-medium">RAG Habilitado</p>
                  <p className="text-xs text-zinc-500">Conecte a uma Knowledge Base</p>
                </div>
              </div>
              <button
                onClick={() => setFormData({ ...formData, ragEnabled: !formData.ragEnabled })}
                className={`w-12 h-6 rounded-full transition-all ${
                  formData.ragEnabled ? 'bg-cyber-purple' : 'bg-zinc-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                  formData.ragEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}></div>
              </button>
            </div>

            {formData.ragEnabled && (
              <div className="p-4 rounded-xl border border-dashed border-zinc-700 text-center">
                <Database className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">Selecione uma Knowledge Base</p>
                <button className="mt-3 btn-secondary px-4 py-2 rounded-lg text-sm">
                  Escolher KB
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <p className="text-sm text-zinc-400">
                Configurações avançadas como schemas de entrada/saída, ações permitidas e
                configuração de orquestração estarão disponíveis em breve.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
