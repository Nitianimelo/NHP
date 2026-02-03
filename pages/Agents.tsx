import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { Agent, AgentType, SchemaField } from '../types';
import { ModelSelector } from '../components/ModelSelector';
import {
  Plus,
  Search,
  ArrowLeft,
  Save,
  Trash2,
  X
} from 'lucide-react';

// Agent Card
const AgentCard: React.FC<{ agent: Agent }> = ({ agent }) => {
  return (
    <Link
      to={`/agents/${agent.id}`}
      className="block p-4 rounded-lg border border-neutral-800 hover:border-neutral-700 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-medium text-white">{agent.name}</h3>
          <p className="text-xs text-neutral-500">{agent.role}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded ${
          agent.type === 'orchestrator'
            ? 'bg-neutral-800 text-neutral-300'
            : 'bg-neutral-800/50 text-neutral-400'
        }`}>
          {agent.type === 'orchestrator' ? 'Orquestrador' : 'Especialista'}
        </span>
      </div>

      <p className="text-sm text-neutral-400 mb-3 line-clamp-2">
        {agent.description}
      </p>

      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span className="font-mono">{agent.model}</span>
        <span>{agent.status}</span>
      </div>
    </Link>
  );
};

// Agents List
export const AgentsList: React.FC = () => {
  const { agents } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | AgentType>('all');

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || agent.type === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Agentes</h1>
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
            placeholder="Buscar..."
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

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAgents.map(agent => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-12 text-neutral-500">
          Nenhum agente encontrado
        </div>
      )}
    </div>
  );
};

// Schema Field Editor
const SchemaFieldEditor: React.FC<{
  fields: SchemaField[];
  onChange: (fields: SchemaField[]) => void;
  label: string;
}> = ({ fields, onChange, label }) => {
  const addField = () => {
    onChange([...fields, { name: '', type: 'string', description: '', required: false }]);
  };

  const updateField = (index: number, updates: Partial<SchemaField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    onChange(newFields);
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium">{label}</label>
        <button
          type="button"
          onClick={addField}
          className="text-xs text-neutral-400 hover:text-white"
        >
          + Adicionar campo
        </button>
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-neutral-500 py-4 text-center border border-dashed border-neutral-800 rounded">
          Nenhum campo definido
        </p>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={index} className="flex gap-2 items-start p-3 bg-neutral-900 rounded">
              <input
                type="text"
                placeholder="nome"
                value={field.name}
                onChange={(e) => updateField(index, { name: e.target.value })}
                className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm"
              />
              <select
                value={field.type}
                onChange={(e) => updateField(index, { type: e.target.value as SchemaField['type'] })}
                className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm"
              >
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="json">json</option>
                <option value="array">array</option>
              </select>
              <label className="flex items-center gap-1 text-xs text-neutral-400">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateField(index, { required: e.target.checked })}
                  className="rounded"
                />
                req
              </label>
              <button
                type="button"
                onClick={() => removeField(index)}
                className="p-1 text-neutral-500 hover:text-red-400"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Agent Editor
export const AgentEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { agents, kbs, addAgent, updateAgent } = useApp();

  const existingAgent = id ? agents.find(a => a.id === id) : null;
  const isNew = !existingAgent;
  const availableAgents = agents.filter(a => a.type === 'specialist');

  const [formData, setFormData] = useState<Partial<Agent>>(existingAgent || {
    type: 'specialist',
    name: '',
    role: '',
    description: '',
    avatar: '',
    model: 'gpt-4o',
    provider: 'openai',
    temperature: 0.7,
    systemPrompt: '',
    ragEnabled: false,
    inputSchema: [],
    outputSchema: [],
    allowedActions: [],
    allowedAgents: [],
    orchestrationConfig: {
      maxSteps: 10,
      planningStrategy: 'dynamic',
      evaluationMode: 'basic',
      consolidationStrategy: 'summarize',
      allowReplanning: true,
      maxRetries: 2,
    },
    status: 'draft',
    tags: [],
  });

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

  const isOrchestrator = formData.type === 'orchestrator';

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

      <div className="space-y-6">
        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium mb-2">Tipo</label>
          <div className="grid grid-cols-2 gap-3">
            {(['specialist', 'orchestrator'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData({ ...formData, type })}
                className={`p-4 rounded border text-left transition-colors ${
                  formData.type === type
                    ? 'border-white bg-neutral-900'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <p className="font-medium mb-1">
                  {type === 'orchestrator' ? 'Orquestrador' : 'Especialista'}
                </p>
                <p className="text-xs text-neutral-500">
                  {type === 'orchestrator'
                    ? 'Coordena outros agentes, planeja e delega'
                    : 'Executa tarefas específicas com inputs/outputs definidos'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Básico */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nome</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Role</label>
            <input
              type="text"
              value={formData.role || ''}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-700"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Descrição</label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-700 resize-none"
          />
        </div>

        {/* Modelo */}
        <div>
          <label className="block text-sm font-medium mb-2">Modelo</label>
          <ModelSelector
            value={formData.model || ''}
            onChange={(modelId) => setFormData({ ...formData, model: modelId })}
            placeholder="Buscar e selecionar modelo..."
          />
          <p className="text-xs text-neutral-500 mt-1">
            Todos os modelos disponíveis via OpenRouter. Configure sua API Key na página de API.
          </p>
        </div>

        {/* Temperature */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Temperature: {formData.temperature}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={formData.temperature || 0.7}
            onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-neutral-500 mt-1">
            <span>Preciso</span>
            <span>Criativo</span>
          </div>
        </div>

        {/* System Prompt */}
        <div>
          <label className="block text-sm font-medium mb-2">System Prompt</label>
          <textarea
            value={formData.systemPrompt || ''}
            onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
            rows={4}
            placeholder="Defina a persona e comportamento do agente..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-neutral-700 resize-none"
          />
        </div>

        {/* Configurações específicas por tipo */}
        {isOrchestrator ? (
          <>
            {/* Orquestrador Config */}
            <div className="border-t border-neutral-800 pt-6">
              <h3 className="text-sm font-medium mb-4">Configuração de Orquestração</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Max Steps</label>
                  <input
                    type="number"
                    value={formData.orchestrationConfig?.maxSteps || 10}
                    onChange={(e) => setFormData({
                      ...formData,
                      orchestrationConfig: {
                        ...formData.orchestrationConfig!,
                        maxSteps: parseInt(e.target.value)
                      }
                    })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Planning Strategy</label>
                  <select
                    value={formData.orchestrationConfig?.planningStrategy || 'dynamic'}
                    onChange={(e) => setFormData({
                      ...formData,
                      orchestrationConfig: {
                        ...formData.orchestrationConfig!,
                        planningStrategy: e.target.value as 'sequential' | 'parallel' | 'dynamic'
                      }
                    })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm"
                  >
                    <option value="sequential">Sequential</option>
                    <option value="parallel">Parallel</option>
                    <option value="dynamic">Dynamic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Evaluation Mode</label>
                  <select
                    value={formData.orchestrationConfig?.evaluationMode || 'basic'}
                    onChange={(e) => setFormData({
                      ...formData,
                      orchestrationConfig: {
                        ...formData.orchestrationConfig!,
                        evaluationMode: e.target.value as 'none' | 'basic' | 'critic_loop'
                      }
                    })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm"
                  >
                    <option value="none">None</option>
                    <option value="basic">Basic</option>
                    <option value="critic_loop">Critic Loop</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Consolidation</label>
                  <select
                    value={formData.orchestrationConfig?.consolidationStrategy || 'summarize'}
                    onChange={(e) => setFormData({
                      ...formData,
                      orchestrationConfig: {
                        ...formData.orchestrationConfig!,
                        consolidationStrategy: e.target.value as 'concatenate' | 'summarize' | 'best_of_n'
                      }
                    })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm"
                  >
                    <option value="concatenate">Concatenate</option>
                    <option value="summarize">Summarize</option>
                    <option value="best_of_n">Best of N</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Agentes Permitidos */}
            <div>
              <label className="block text-sm font-medium mb-2">Agentes Permitidos</label>
              <p className="text-xs text-neutral-500 mb-3">
                Selecione os especialistas que este orquestrador pode coordenar
              </p>
              <div className="space-y-2">
                {availableAgents.map(agent => (
                  <label
                    key={agent.id}
                    className="flex items-center gap-3 p-3 bg-neutral-900 rounded cursor-pointer hover:bg-neutral-800"
                  >
                    <input
                      type="checkbox"
                      checked={formData.allowedAgents?.includes(agent.id) || false}
                      onChange={(e) => {
                        const current = formData.allowedAgents || [];
                        setFormData({
                          ...formData,
                          allowedAgents: e.target.checked
                            ? [...current, agent.id]
                            : current.filter(id => id !== agent.id)
                        });
                      }}
                      className="rounded"
                    />
                    <div>
                      <p className="text-sm font-medium">{agent.name}</p>
                      <p className="text-xs text-neutral-500">{agent.role}</p>
                    </div>
                  </label>
                ))}
                {availableAgents.length === 0 && (
                  <p className="text-sm text-neutral-500 py-4 text-center">
                    Nenhum especialista disponível
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Especialista Config */}
            <div className="border-t border-neutral-800 pt-6">
              <h3 className="text-sm font-medium mb-4">Contratos de Entrada/Saída</h3>

              <div className="space-y-6">
                <SchemaFieldEditor
                  fields={formData.inputSchema || []}
                  onChange={(fields) => setFormData({ ...formData, inputSchema: fields })}
                  label="Input Schema"
                />

                <SchemaFieldEditor
                  fields={formData.outputSchema || []}
                  onChange={(fields) => setFormData({ ...formData, outputSchema: fields })}
                  label="Output Schema"
                />
              </div>
            </div>

            {/* Knowledge Base */}
            <div>
              <label className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={formData.ragEnabled || false}
                  onChange={(e) => setFormData({ ...formData, ragEnabled: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium">Habilitar RAG</span>
              </label>

              {formData.ragEnabled && (
                <select
                  value={formData.knowledgeBaseId || ''}
                  onChange={(e) => setFormData({ ...formData, knowledgeBaseId: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm"
                >
                  <option value="">Selecione uma Knowledge Base</option>
                  {kbs.map(kb => (
                    <option key={kb.id} value={kb.id}>{kb.name}</option>
                  ))}
                </select>
              )}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-neutral-800">
          {!isNew && (
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300">
              <Trash2 size={16} />
              Excluir
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              onClick={() => navigate('/agents')}
              className="px-4 py-2 text-sm text-neutral-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-neutral-200"
            >
              <Save size={16} />
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
