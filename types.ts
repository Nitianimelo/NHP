export type Status = 'draft' | 'active' | 'archived';
export type RunStatus = 'running' | 'completed' | 'failed' | 'pending';
export type AgentType = 'specialist' | 'orchestrator';

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'file' | 'array';
  description: string;
  required: boolean;
}

export interface AgentAction {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface OrchestrationConfig {
  maxSteps: number;
  planningStrategy: 'sequential' | 'parallel' | 'dynamic';
  evaluationMode: 'none' | 'basic' | 'critic_loop';
  consolidationStrategy: 'concatenate' | 'summarize' | 'best_of_n';
}

export interface Agent {
  id: string;
  type: AgentType;
  name: string;
  role: string;
  description: string;
  avatar: string;
  
  // Configuration
  model: string;
  provider: string;
  temperature: number;
  
  // Process
  systemPrompt: string;
  ragEnabled: boolean;
  knowledgeBaseId?: string;
  
  // Contracts
  inputSchema: SchemaField[];
  outputSchema: SchemaField[];
  allowedActions: AgentAction[];
  
  // Orchestrator
  orchestrationConfig?: OrchestrationConfig;
  allowedAgents?: string[];

  status: Status;
  tags: string[];
  lastUpdated: string;
}

export interface RunLog {
  id: string;
  stepId?: string;
  agentName: string;
  agentAvatar?: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  phase?: 'INPUT' | 'PROCESS' | 'ACTION' | 'OUTPUT' | 'PLANNING' | 'DELEGATION'; 
  artifact?: {
    type: 'text' | 'code' | 'json' | 'image';
    content: string;
    label: string;
  };
}

export interface Run {
  id: string;
  orchestratorId: string;
  orchestratorName: string;
  goal: string; // The input that started it all
  status: RunStatus;
  startTime: string;
  duration: string;
  cost: number;
  logs: RunLog[];
  finalResult?: string; // Consolidated output
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  docCount: number;
  chunkCount: number;
  status: 'indexed' | 'indexing' | 'pending';
  lastUpdated: string;
}

export interface Document {
  id: string;
  name: string;
  size: string;
  type: string;
  status: 'synced' | 'pending';
}

export interface WorkflowStep {
  id: string;
  agentId: string;
  description: string;
  inputMapping?: Record<string, string>;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  lastRun?: string;
}