import React, { createContext, useContext, useState } from 'react';
import { MOCK_AGENTS, MOCK_RUNS, MOCK_KBS, MOCK_WORKFLOWS } from './mockData';
import { Agent, Run, KnowledgeBase, Workflow } from './types';

interface AppContextType {
  agents: Agent[];
  runs: Run[];
  kbs: KnowledgeBase[];
  workflows: Workflow[];
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, data: Partial<Agent>) => void;
  createRun: (orchestratorId: string, goal: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS);
  const [runs, setRuns] = useState<Run[]>(MOCK_RUNS);
  const [kbs, setKbs] = useState<KnowledgeBase[]>(MOCK_KBS);
  const [workflows, setWorkflows] = useState<Workflow[]>(MOCK_WORKFLOWS);

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
      status: 'completed', // Mock immediate completion for demo
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

  return (
    <AppContext.Provider value={{ agents, runs, kbs, workflows, addAgent, updateAgent, createRun }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};