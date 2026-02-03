import React, { createContext, useContext, useState, useEffect } from 'react';
import { MOCK_AGENTS, MOCK_RUNS, MOCK_KBS, MOCK_WORKFLOWS } from './mockData';
import { Agent, Run, KnowledgeBase, Workflow } from './types';

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
  createRun: (orchestratorId: string, goal: string) => void;
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

const loadApiConfig = (): ApiConfig => {
  try {
    const stored = localStorage.getItem('nhp_api_config');
    if (stored) return JSON.parse(stored);
  } catch {}
  return { openRouterKey: '', siteUrl: '', siteName: 'NHP' };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [agents, setAgents] = useState<Agent[]>(loadAgents);
  const [runs, setRuns] = useState<Run[]>(MOCK_RUNS);
  const [kbs, setKbs] = useState<KnowledgeBase[]>(MOCK_KBS);
  const [workflows, setWorkflows] = useState<Workflow[]>(MOCK_WORKFLOWS);
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

  const createRun = (orchestratorId: string, goal: string) => {
    const orchestrator = agents.find(a => a.id === orchestratorId);
    if (!orchestrator) return;

    const newRun: Run = {
      id: `r-${Date.now()}`,
      orchestratorId: orchestrator.id,
      orchestratorName: orchestrator.name,
      goal: goal,
      status: 'completed',
      startTime: 'Agora',
      duration: '2s (mock)',
      cost: 0.00,
      logs: [
        { id: 'l1', agentName: orchestrator.name, agentAvatar: orchestrator.avatar, timestamp: new Date().toISOString(), level: 'info', message: 'Iniciando orquestração dinâmica.', phase: 'PLANNING' },
        { id: 'l2', agentName: orchestrator.name, agentAvatar: orchestrator.avatar, timestamp: new Date().toISOString(), level: 'success', message: 'Execução mock finalizada.', phase: 'OUTPUT', artifact: { type: 'text', label: 'Resultado', content: 'Orquestração concluída com sucesso (Simulação).' } }
      ]
    };
    setRuns(prev => [newRun, ...prev]);
  };

  useEffect(() => {
    try {
      localStorage.setItem('nhp_agents', JSON.stringify(agents));
    } catch {}
  }, [agents]);

  return (
    <AppContext.Provider value={{
      agents, runs, kbs, workflows, apiConfig,
      addAgent, updateAgent, createRun, setApiConfig
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
