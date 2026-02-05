import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MOCK_KBS, MOCK_WORKFLOWS } from './mockData';
import { Agent, Run, RunLog, Step, KnowledgeBase, Workflow, AgentType, ExecutionMode } from './types';
import { OpenRouterClient } from './lib/openrouter';
import { executeRun as executeRunEngine, createRun as createRunFactory } from './lib/executor';
import { listAgents, SupabaseAgent } from './lib/supabase';

interface ApiConfig {
  openRouterKey: string;
  siteUrl?: string;
  siteName?: string;
}

interface AppContextType {
  agents: Agent[];
  runs: Run[];
  kbs: KnowledgeBase[];
  workflows: Workflow[];
  apiConfig: ApiConfig;
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, data: Partial<Agent>) => void;
  refreshAgents: () => Promise<void>;
  addRun: (run: Run) => void;
  updateRun: (id: string, data: Partial<Run>) => void;
  executeOrchestration: (orchestratorId: string, goal: string, context?: Record<string, unknown>) => Promise<Run | null>;
  setApiConfig: (config: Partial<ApiConfig>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/** Map a Supabase agent row to the internal Agent type */
function mapSupabaseAgent(sa: SupabaseAgent): Agent {
  const agentType: AgentType = sa.tipo === 'orchestrator' ? 'orchestrator' : 'specialist';
  // Ensure temperature is a number (Supabase might return it as string)
  const temp = typeof sa.temperatura === 'number' ? sa.temperatura : Number(sa.temperatura);
  const temperature = isNaN(temp) ? 0.7 : temp;

  return {
    id: String(sa.id),
    type: agentType,
    name: sa.nome || 'Sem nome',
    role: agentType === 'orchestrator' ? 'Orquestrador' : 'Especialista',
    description: sa.system ? sa.system.substring(0, 200) : '',
    avatar: '',
    model: sa.modelo || 'gpt-4o',
    provider: (sa.modelo || '').split('/')[0] || 'openai',
    temperature,
    systemPrompt: sa.system || '',
    ragEnabled: false,
    inputSchema: [],
    outputSchema: [],
    allowedActions: [],
    allowedAgents: sa.especialistas ? sa.especialistas.split(',').map(s => s.trim()).filter(Boolean) : [],
    orchestrationConfig: agentType === 'orchestrator' ? {
      maxSteps: 10,
      planningStrategy: 'sequential',
      evaluationMode: 'none',
      consolidationStrategy: 'summarize',
      executionMode: (sa.modo_execucao as ExecutionMode) || 'sequencial',
      allowReplanning: false,
      maxRetries: 3,
    } : undefined,
    capabilities: {
      textGeneration: true,
      imageGeneration: false,
      imageAnalysis: false,
      codeExecution: false,
      webSearch: false,
      fileProcessing: false,
    },
    status: 'active',
    tags: [],
    lastUpdated: 'Supabase',
  };
}

const loadRuns = (): Run[] => {
  try {
    const stored = localStorage.getItem('nhp_runs');
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
};

const loadApiConfig = (): ApiConfig => {
  try {
    const stored = localStorage.getItem('nhp_api_config');
    if (stored) return JSON.parse(stored);
  } catch {}
  return { openRouterKey: '', siteUrl: '', siteName: 'NHP' };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [runs, setRuns] = useState<Run[]>(loadRuns);
  const [kbs] = useState<KnowledgeBase[]>(MOCK_KBS);
  const [workflows] = useState<Workflow[]>(MOCK_WORKFLOWS);
  const [apiConfig, setApiConfigState] = useState<ApiConfig>(loadApiConfig);

  // Load agents from Supabase on mount
  const refreshAgents = useCallback(async () => {
    try {
      const supabaseAgents = await listAgents();
      setAgents(supabaseAgents.map(mapSupabaseAgent));
    } catch (err) {
      console.error('[AppContext] Failed to load agents from Supabase:', err);
    }
  }, []);

  useEffect(() => {
    refreshAgents();
  }, [refreshAgents]);

  const setApiConfig = (config: Partial<ApiConfig>) => {
    setApiConfigState(prev => {
      const updated = { ...prev, ...config };
      localStorage.setItem('nhp_api_config', JSON.stringify(updated));
      return updated;
    });
  };

  const addAgent = (agent: Agent) => setAgents(prev => [agent, ...prev]);
  const updateAgent = (id: string, data: Partial<Agent>) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
  };

  const addRun = useCallback((run: Run) => {
    setRuns(prev => [run, ...prev]);
  }, []);

  const updateRun = useCallback((id: string, data: Partial<Run>) => {
    setRuns(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
  }, []);

  // Execute real orchestration
  const executeOrchestration = useCallback(async (
    orchestratorId: string,
    goal: string,
    context?: Record<string, unknown>
  ): Promise<Run | null> => {
    const orchestrator = agents.find(a => a.id === orchestratorId);
    if (!orchestrator) {
      console.error('Orchestrator not found');
      return null;
    }

    if (!apiConfig.openRouterKey) {
      console.error('API key not configured');
      return null;
    }

    const run = createRunFactory(
      orchestrator.id,
      orchestrator.name,
      goal,
      context
    );

    addRun(run);

    const client = new OpenRouterClient(
      apiConfig.openRouterKey,
      apiConfig.siteUrl,
      apiConfig.siteName
    );

    try {
      const result = await executeRunEngine({
        run,
        agents,
        client,
        onLog: (log: RunLog) => {
          updateRun(run.id, {
            logs: [...(runs.find(r => r.id === run.id)?.logs || []), log]
          });
        },
        onStepUpdate: (step: Step) => {
          updateRun(run.id, {
            steps: (runs.find(r => r.id === run.id)?.steps || []).map(s =>
              s.id === step.id ? step : s
            )
          });
        },
        onRunUpdate: (data: Partial<Run>) => {
          updateRun(run.id, data);
        }
      });

      return result;
    } catch (error) {
      console.error('Execution failed:', error);
      updateRun(run.id, {
        status: 'failed',
        endTime: new Date().toISOString()
      });
      return null;
    }
  }, [agents, apiConfig, addRun, updateRun, runs]);

  // Persist runs
  useEffect(() => {
    try {
      localStorage.setItem('nhp_runs', JSON.stringify(runs));
    } catch {}
  }, [runs]);

  return (
    <AppContext.Provider value={{
      agents, runs, kbs, workflows, apiConfig,
      addAgent, updateAgent, refreshAgents, addRun, updateRun, executeOrchestration, setApiConfig
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
