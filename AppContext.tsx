import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MOCK_AGENTS, MOCK_KBS, MOCK_WORKFLOWS } from './mockData';
import { Agent, Run, RunLog, Step, KnowledgeBase, Workflow } from './types';
import { OpenRouterClient } from './lib/openrouter';
import { executeRun as executeRunEngine, createRun as createRunFactory } from './lib/executor';

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
  addRun: (run: Run) => void;
  updateRun: (id: string, data: Partial<Run>) => void;
  executeOrchestration: (orchestratorId: string, goal: string, context?: Record<string, unknown>) => Promise<Run | null>;
  setApiConfig: (config: Partial<ApiConfig>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const loadAgents = (): Agent[] => {
  try {
    const stored = localStorage.getItem('nhp_agents');
    if (stored) return JSON.parse(stored);
  } catch {}
  return MOCK_AGENTS;
};

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
  const [agents, setAgents] = useState<Agent[]>(loadAgents);
  const [runs, setRuns] = useState<Run[]>(loadRuns);
  const [kbs] = useState<KnowledgeBase[]>(MOCK_KBS);
  const [workflows] = useState<Workflow[]>(MOCK_WORKFLOWS);
  const [apiConfig, setApiConfigState] = useState<ApiConfig>(loadApiConfig);

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

    // Create the run
    const run = createRunFactory(
      orchestrator.id,
      orchestrator.name,
      goal,
      context
    );

    // Add to state immediately
    addRun(run);

    // Create OpenRouter client
    const client = new OpenRouterClient(
      apiConfig.openRouterKey,
      apiConfig.siteUrl,
      apiConfig.siteName
    );

    // Execute with callbacks
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

  // Persist agents
  useEffect(() => {
    try {
      localStorage.setItem('nhp_agents', JSON.stringify(agents));
    } catch {}
  }, [agents]);

  // Persist runs
  useEffect(() => {
    try {
      localStorage.setItem('nhp_runs', JSON.stringify(runs));
    } catch {}
  }, [runs]);

  return (
    <AppContext.Provider value={{
      agents, runs, kbs, workflows, apiConfig,
      addAgent, updateAgent, addRun, updateRun, executeOrchestration, setApiConfig
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
