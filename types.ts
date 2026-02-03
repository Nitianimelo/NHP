// ============================================
// NHP - Cognitive OS Type Definitions
// ============================================

// === Status Types ===
export type Status = 'draft' | 'active' | 'archived';
export type RunStatus = 'pending' | 'running' | 'completed' | 'failed';
export type AgentType = 'specialist' | 'orchestrator';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

// === Schema Types ===
export type FieldType = 'string' | 'number' | 'boolean' | 'json' | 'array' | 'image' | 'file';

export interface SchemaField {
  name: string;
  type: FieldType;
  description: string;
  required: boolean;
  default?: unknown;
}

// === Agent Capabilities ===
export interface AgentCapabilities {
  textGeneration: boolean;
  imageGeneration: boolean;
  imageAnalysis: boolean;
  codeExecution: boolean;
  webSearch: boolean;
  fileProcessing: boolean;
}

// === Agent Actions ===
export interface AgentAction {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  // For image generation
  type?: 'generate_image' | 'analyze_image' | 'search_web' | 'execute_code' | 'custom';
  config?: Record<string, unknown>;
}

// === Orchestration Config ===
export interface OrchestrationConfig {
  maxSteps: number;
  planningStrategy: 'sequential' | 'parallel' | 'dynamic';
  evaluationMode: 'none' | 'basic' | 'critic_loop';
  consolidationStrategy: 'concatenate' | 'summarize' | 'best_of_n';
  // For dynamic planning
  allowReplanning: boolean;
  maxRetries: number;
}

// === Agent Definition ===
export interface Agent {
  id: string;
  type: AgentType;
  name: string;
  role: string;
  description: string;
  avatar: string;

  // Model Configuration
  model: string;
  provider: string;
  temperature: number;
  maxTokens?: number;

  // Capabilities
  capabilities: AgentCapabilities;

  // Process
  systemPrompt: string;
  ragEnabled: boolean;
  knowledgeBaseId?: string;

  // Contracts (Specialist)
  inputSchema: SchemaField[];
  outputSchema: SchemaField[];

  // Actions (optional tools the agent can use)
  allowedActions: AgentAction[];

  // Orchestrator-specific
  orchestrationConfig?: OrchestrationConfig;
  allowedAgents?: string[]; // IDs of agents this orchestrator can call

  // Metadata
  status: Status;
  tags: string[];
  lastUpdated: string;
}

// === Execution Step ===
export interface StepInput {
  [key: string]: unknown;
}

export interface StepOutput {
  [key: string]: unknown;
}

export interface Step {
  id: string;
  agentId: string;
  agentName: string;
  status: StepStatus;

  // I-P-A-O tracking
  input: StepInput;
  output?: StepOutput;

  // Timing
  startedAt?: string;
  completedAt?: string;
  duration?: number; // ms

  // Cost tracking
  tokensUsed?: number;
  cost?: number;

  // Error handling
  error?: string;
  retryCount?: number;

  // For orchestrator planning
  description?: string;
  dependsOn?: string[]; // Step IDs this step depends on
}

// === Run Log Entry ===
export interface RunLog {
  id: string;
  stepId?: string;
  agentName: string;
  agentAvatar?: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success' | 'debug';
  message: string;
  phase: 'INPUT' | 'PROCESS' | 'ACTION' | 'OUTPUT' | 'PLANNING' | 'DELEGATION' | 'EVALUATION';
  artifact?: {
    type: 'text' | 'code' | 'json' | 'image' | 'markdown';
    content: string;
    label: string;
    language?: string; // For code artifacts
  };
  metadata?: Record<string, unknown>;
}

// === Run (Execution Instance) ===
export interface Run {
  id: string;
  orchestratorId: string;
  orchestratorName: string;

  // The user's request
  goal: string;
  context?: Record<string, unknown>;

  // Execution state
  status: RunStatus;
  currentStepId?: string;

  // Steps (the plan + execution)
  steps: Step[];

  // Logs (detailed trace)
  logs: RunLog[];

  // Results
  finalResult?: unknown;
  consolidatedOutput?: string;

  // Timing
  startTime: string;
  endTime?: string;
  duration?: string;

  // Cost
  totalTokens?: number;
  cost: number;
}

// === Knowledge Base ===
export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  docCount: number;
  chunkCount: number;
  status: 'indexed' | 'indexing' | 'pending' | 'error';
  lastUpdated: string;
  embeddingModel?: string;
}

export interface Document {
  id: string;
  knowledgeBaseId: string;
  name: string;
  size: string;
  type: string;
  status: 'synced' | 'pending' | 'error';
  chunks?: number;
}

// === Workflow (Pre-defined sequences) ===
export interface WorkflowStep {
  id: string;
  agentId: string;
  description: string;
  // Map input fields: { "agentInputField": "source" }
  // source can be: "user_input.field", "steps.stepId.output.field", "context.field"
  inputMapping: Record<string, string>;
  // Conditions for running this step
  condition?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  lastRun?: string;
  // Default context
  defaultContext?: Record<string, unknown>;
}

// === Orchestrator Planning Types ===
export interface PlanStep {
  stepId: string;
  agentId: string;
  agentName: string;
  description: string;
  inputMapping: Record<string, string>;
  dependsOn: string[];
  priority: number;
}

export interface ExecutionPlan {
  goal: string;
  reasoning: string;
  steps: PlanStep[];
  estimatedSteps: number;
  strategy: 'sequential' | 'parallel' | 'mixed';
}

// === API Response Types ===
export interface AgentResponse {
  success: boolean;
  output?: StepOutput;
  error?: string;
  tokensUsed?: number;
  cost?: number;
  artifacts?: Array<{
    type: string;
    content: string;
    label: string;
  }>;
  // For image generation
  images?: Array<{
    url: string;
    revisedPrompt?: string;
  }>;
}
