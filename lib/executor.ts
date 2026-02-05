// ============================================
// NHP - Agent Execution Engine
// ============================================

import {
  Agent,
  Run,
  RunLog,
  Step,
  StepInput,
  StepOutput,
  ExecutionPlan,
  PlanStep,
  AgentResponse,
} from '../types';

import {
  OpenRouterClient,
  ChatMessage,
  JsonSchema,
  buildSystemPrompt,
  buildOrchestratorPrompt,
  ORCHESTRATOR_PLAN_SCHEMA,
} from './openrouter';

import { getKnowledgeForAgent, searchKnowledge, SupabaseKnowledge } from './supabase';

// === Types ===
export interface ExecutionContext {
  run: Run;
  agents: Agent[];
  client: OpenRouterClient;
  onLog: (log: RunLog) => void;
  onStepUpdate: (step: Step) => void;
  onRunUpdate: (run: Partial<Run>) => void;
}

// === Execution Configuration ===
export interface ExecutionConfig {
  maxRetries: number;
  retryDelayMs: number;
  stepTimeoutMs: number;
  enableParallel: boolean;
}

const DEFAULT_CONFIG: ExecutionConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  stepTimeoutMs: 60000, // 60 seconds
  enableParallel: true,
};

// === Utility Functions ===
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const timestamp = () => new Date().toISOString();

// Ensure temperature is a valid number for API calls
const ensureNumber = (value: unknown, defaultValue: number): number => {
  if (typeof value === 'number' && !isNaN(value)) return value;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

// === Retry with Exponential Backoff ===
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async <T>(
  fn: () => Promise<T>,
  config: { maxRetries: number; delayMs: number; onRetry?: (attempt: number, error: Error) => void }
): Promise<T> => {
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < config.maxRetries) {
        config.onRetry?.(attempt, lastError);
        // Exponential backoff: 1s, 2s, 4s, etc.
        await sleep(config.delayMs * Math.pow(2, attempt - 1));
      }
    }
  }

  throw lastError;
};

// === Timeout Wrapper ===
const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
};

// === Dependency Graph Utils ===
const getReadySteps = (
  allSteps: PlanStep[],
  completedStepIds: Set<string>,
  runningStepIds: Set<string>
): PlanStep[] => {
  return allSteps.filter(step => {
    // Skip if already completed or running
    if (completedStepIds.has(step.stepId) || runningStepIds.has(step.stepId)) {
      return false;
    }
    // Check if all dependencies are completed
    return step.dependsOn.every(depId => completedStepIds.has(depId));
  });
};

const createLog = (
  agentName: string,
  message: string,
  phase: RunLog['phase'],
  level: RunLog['level'] = 'info',
  stepId?: string,
  artifact?: RunLog['artifact']
): RunLog => ({
  id: generateId(),
  stepId,
  agentName,
  timestamp: timestamp(),
  level,
  message,
  phase,
  artifact,
});

// === Accumulated Context ===
// Keeps track of all outputs for richer context passing
interface AccumulatedContext {
  userInput: Record<string, unknown>;
  completedSteps: Map<string, Step>;
  globalContext: Record<string, unknown>;
}

// === Input Resolution ===
// Resolves input mappings like "user_input.field" or "steps.step1.output.field"
const resolveInputMapping = (
  mapping: Record<string, string>,
  ctx: AccumulatedContext
): StepInput => {
  const resolved: StepInput = {};
  const { userInput, completedSteps, globalContext } = ctx;

  for (const [targetField, sourcePath] of Object.entries(mapping)) {
    const parts = sourcePath.split('.');

    if (parts[0] === 'user_input') {
      // e.g., "user_input.tema" -> userInput.tema
      resolved[targetField] = parts.length > 1
        ? userInput[parts[1]]
        : userInput;
    } else if (parts[0] === 'steps') {
      // e.g., "steps.step1.output.texto" -> completedSteps.get('step1').output.texto
      const stepId = parts[1];
      const step = completedSteps.get(stepId);
      if (step && step.output && parts[2] === 'output') {
        resolved[targetField] = parts.length > 3
          ? (step.output as Record<string, unknown>)[parts[3]]
          : step.output;
      }
    } else if (parts[0] === 'context') {
      // e.g., "context.someValue" -> globalContext.someValue
      resolved[targetField] = parts.length > 1
        ? globalContext[parts[1]]
        : globalContext;
    } else if (parts[0] === 'last_output') {
      // Get the most recent step output
      const stepsArray = Array.from(completedSteps.values());
      const lastStep = stepsArray[stepsArray.length - 1];
      if (lastStep?.output) {
        resolved[targetField] = parts.length > 1
          ? (lastStep.output as Record<string, unknown>)[parts[1]]
          : lastStep.output;
      }
    } else if (parts[0] === 'all_outputs') {
      // Get all outputs as an array (useful for consolidation)
      resolved[targetField] = Array.from(completedSteps.values())
        .filter(s => s.output)
        .map(s => ({ stepId: s.id, agentName: s.agentName, output: s.output }));
    } else {
      // Direct value
      resolved[targetField] = sourcePath;
    }
  }

  return resolved;
};

// === Image Model Detection ===
const IMAGE_GENERATION_MODELS = [
  'dall-e',
  'stable-diffusion',
  'sdxl',
  'midjourney',
  'imagen',
  'ideogram',
  'flux',
  'playground',
  'leonardo',
  'black-forest-labs',
  'stability',
];

const isImageGenerationModel = (modelId: string): boolean => {
  const modelLower = modelId.toLowerCase();
  return IMAGE_GENERATION_MODELS.some(m => modelLower.includes(m));
};

// === RAG Knowledge Retrieval ===
const retrieveKnowledgeForAgent = async (
  agentId: string,
  query: string
): Promise<SupabaseKnowledge[]> => {
  try {
    const agentIdNum = parseInt(agentId, 10);

    // First, get knowledge specifically for this agent
    const agentKnowledge = isNaN(agentIdNum) ? [] : await getKnowledgeForAgent(agentIdNum);

    // Then search for relevant knowledge based on the query
    const searchResults = await searchKnowledge(query, isNaN(agentIdNum) ? undefined : agentIdNum);

    // Combine and deduplicate
    const allKnowledge = new Map<number, SupabaseKnowledge>();

    for (const k of agentKnowledge) {
      if (k.id) allKnowledge.set(k.id, k);
    }

    for (const k of searchResults) {
      if (k.id && !allKnowledge.has(k.id)) {
        allKnowledge.set(k.id, k);
      }
    }

    return Array.from(allKnowledge.values()).slice(0, 5); // Limit to 5 entries
  } catch (error) {
    console.error('[RAG] Failed to retrieve knowledge:', error);
    return [];
  }
};

// Format knowledge for injection into system prompt
const formatKnowledgeContext = (knowledge: SupabaseKnowledge[]): string => {
  if (knowledge.length === 0) return '';

  const formatted = knowledge.map(k => {
    const header = `### ${k.titulo}${k.tags ? ` [${k.tags}]` : ''}`;
    return `${header}\n${k.conteudo}`;
  }).join('\n\n---\n\n');

  return `
## CONHECIMENTO DISPONÍVEL (RAG)
Use as informações abaixo como referência para sua resposta:

${formatted}

---
`
;
};

// === Specialist Executor ===
export const executeSpecialist = async (
  agent: Agent,
  input: StepInput,
  client: OpenRouterClient,
  enableRag: boolean = true
): Promise<AgentResponse> => {
  try {
    // Check if this is an image generation model
    if (isImageGenerationModel(agent.model)) {
      // Extract prompt from input
      const prompt = input.prompt || input.text || input.description ||
        Object.values(input).find(v => typeof v === 'string') ||
        JSON.stringify(input);

      const imageResponse = await client.generateImage({
        model: agent.model,
        prompt: String(prompt),
        size: (input.size as '1024x1024' | '1024x1792' | '1792x1024') || '1024x1024',
        quality: (input.quality as 'standard' | 'hd') || 'standard',
        style: (input.style as 'natural' | 'vivid') || 'vivid',
      });

      // Return image URLs
      const imageUrls = imageResponse.data
        .map(d => d.url || d.b64_json)
        .filter(Boolean);

      return {
        success: true,
        output: {
          images: imageUrls,
          image_url: imageUrls[0] || null,
          prompt: prompt,
          revised_prompt: imageResponse.data[0]?.revised_prompt,
        },
      };
    }

    // Regular text model execution
    // Retrieve RAG knowledge if enabled
    let knowledgeContext = '';
    if (enableRag && agent.ragEnabled !== false) {
      const query = input.objetivo || input.tarefa || Object.values(input).filter(v => typeof v === 'string').join(' ');
      const knowledge = await retrieveKnowledgeForAgent(agent.id, String(query));
      if (knowledge.length > 0) {
        console.log(`[RAG] Retrieved ${knowledge.length} knowledge entries for ${agent.name}`);
        knowledgeContext = formatKnowledgeContext(knowledge);
      }
    }

    // Build system prompt with output schema and RAG context
    const basePrompt = buildSystemPrompt(
      agent.role,
      agent.description,
      agent.systemPrompt,
      agent.outputSchema
    );

    const systemPrompt = knowledgeContext
      ? `${basePrompt}\n\n${knowledgeContext}`
      : basePrompt;

    // Build user message from input
    const userMessage = Object.entries(input)
      .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
      .join('\n');

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    // If agent has output schema, use structured output
    if (agent.outputSchema.length > 0) {
      const schema: JsonSchema = {
        name: `${agent.id}_output`,
        strict: true,
        schema: {
          type: 'object',
          properties: Object.fromEntries(
            agent.outputSchema.map(f => [f.name, { type: f.type === 'json' ? 'object' : f.type }])
          ),
          required: agent.outputSchema.filter(f => f.required).map(f => f.name),
          additionalProperties: false,
        },
      };

      const response = await client.chatWithSchema<StepOutput>(
        {
          model: agent.model,
          messages,
          temperature: ensureNumber(agent.temperature, 0.7),
          max_tokens: ensureNumber(agent.maxTokens, 2048),
        },
        schema
      );

      return {
        success: true,
        output: response.data,
        tokensUsed: response.usage.total_tokens,
        cost: response.usage.cost,
      };
    } else {
      // Free-form response
      const response = await client.chat({
        model: agent.model,
        messages,
        temperature: ensureNumber(agent.temperature, 0.7),
        max_tokens: ensureNumber(agent.maxTokens, 2048),
      });

      const content = response.choices[0]?.message?.content || '';

      // Try to parse as JSON, otherwise return as text
      let output: StepOutput;
      try {
        output = JSON.parse(content);
      } catch {
        output = { result: content };
      }

      return {
        success: true,
        output,
        tokensUsed: response.usage.total_tokens,
        cost: response.usage.cost,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// === Orchestrator Planner ===
export const createExecutionPlan = async (
  orchestrator: Agent,
  goal: string,
  availableAgents: Agent[],
  client: OpenRouterClient,
  context?: Record<string, unknown>
): Promise<ExecutionPlan> => {
  const prompt = buildOrchestratorPrompt(
    goal,
    availableAgents.map(a => ({
      id: a.id,
      name: a.name,
      role: a.role,
      description: a.description,
      inputSchema: a.inputSchema,
    })),
    context
  );

  // Build list of available agent IDs for the system prompt
  const agentIdList = availableAgents.map(a => `"${a.id}"`).join(', ');

  // Add JSON instruction to system prompt
  const systemPrompt = `${orchestrator.systemPrompt || 'Você é um orquestrador que planeja a execução de tarefas.'}

IMPORTANTE: Responda APENAS com JSON válido. Sem markdown, sem explicações fora do JSON.

IDs DE AGENTES VÁLIDOS: ${agentIdList || '(nenhum)'}

O JSON DEVE ter esta estrutura:
{
  "reasoning": "sua análise do que precisa ser feito",
  "steps": [
    {
      "stepId": "step1",
      "agentId": "${availableAgents[0]?.id || 'ID_DO_AGENTE'}",
      "description": "o que este passo faz",
      "inputMapping": { "tarefa": "user_input.goal" },
      "dependsOn": []
    }
  ],
  "strategy": "sequential"
}

REGRA CRÍTICA: O campo "agentId" DEVE ser um dos IDs listados acima: ${agentIdList || 'nenhum disponível'}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ];

  // Try with schema first (works with OpenAI models)
  // If fails, fallback to regular chat with JSON parsing
  let planData: {
    reasoning: string;
    steps: Array<{
      stepId: string;
      agentId: string;
      description: string;
      inputMapping: Record<string, string>;
      dependsOn: string[];
    }>;
    strategy: 'sequential' | 'parallel' | 'mixed';
  };

  try {
    const response = await client.chatWithSchema<typeof planData>(
      {
        model: orchestrator.model,
        messages,
        temperature: ensureNumber(orchestrator.temperature, 0.7),
      },
      ORCHESTRATOR_PLAN_SCHEMA
    );
    planData = response.data;
  } catch {
    // Fallback: use regular chat and parse JSON
    const response = await client.chat({
      model: orchestrator.model,
      messages,
      temperature: ensureNumber(orchestrator.temperature, 0.7),
      max_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content || '';

    // Try to extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Orchestrator did not return valid JSON plan');
    }

    try {
      planData = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error('Failed to parse orchestrator plan JSON');
    }

    // Validate required fields
    if (!planData.steps || !Array.isArray(planData.steps)) {
      throw new Error('Orchestrator plan missing steps array');
    }

    // Normalize step data
    planData.steps = planData.steps.map((s: Record<string, unknown>) => ({
      ...s,
      stepId: String(s.stepId || ''),
      agentId: String(s.agentId || ''),
      description: String(s.description || ''),
      inputMapping: (s.inputMapping && typeof s.inputMapping === 'object')
        ? s.inputMapping as Record<string, string>
        : {} as Record<string, string>,
      dependsOn: Array.isArray(s.dependsOn) ? s.dependsOn.map(String) : [],
    }));
  }

  const plan: ExecutionPlan = {
    goal,
    reasoning: planData.reasoning || 'No reasoning provided',
    steps: planData.steps.map((s, i) => {
      // Normalize agentId to string for consistent comparison
      const normalizedAgentId = String(s.agentId);
      const agent = availableAgents.find(a => a.id === normalizedAgentId);
      return {
        stepId: s.stepId || `step${i + 1}`,
        agentId: normalizedAgentId,
        agentName: agent?.name || normalizedAgentId,
        description: s.description || '',
        inputMapping: s.inputMapping || {},
        dependsOn: s.dependsOn || [],
        priority: i,
      };
    }),
    estimatedSteps: planData.steps.length,
    strategy: planData.strategy || 'sequential',
  };

  // Validate and clean up dependencies
  const validStepIds = new Set(plan.steps.map(s => s.stepId));
  plan.steps.forEach((step, index) => {
    // Remove invalid dependencies (IDs that don't exist)
    step.dependsOn = step.dependsOn.filter(depId => validStepIds.has(depId));

    // First step should never have dependencies
    if (index === 0) {
      step.dependsOn = [];
    }

    // Remove self-references
    step.dependsOn = step.dependsOn.filter(depId => depId !== step.stepId);
  });

  console.log('[Executor] Plan created with steps:', plan.steps.map(s => ({
    stepId: s.stepId,
    agentId: s.agentId,
    agentName: s.agentName,
    dependsOn: s.dependsOn
  })));

  return plan;
};

// === Consolidator ===
export const consolidateResults = async (
  orchestrator: Agent,
  goal: string,
  steps: Step[],
  client: OpenRouterClient,
  strategy: 'concatenate' | 'summarize' | 'best_of_n'
): Promise<string> => {
  const completedSteps = steps.filter(s => s.status === 'completed' && s.output);

  if (strategy === 'concatenate') {
    return completedSteps
      .map(s => `## ${s.agentName}\n${JSON.stringify(s.output, null, 2)}`)
      .join('\n\n');
  }

  if (strategy === 'summarize') {
    const prompt = `
You are consolidating results from multiple agents.

## ORIGINAL GOAL
${goal}

## AGENT OUTPUTS
${completedSteps.map(s => `
### ${s.agentName}
${JSON.stringify(s.output, null, 2)}
`).join('\n')}

Provide a coherent, consolidated response that addresses the original goal.
`;

    const response = await client.chat({
      model: orchestrator.model,
      messages: [
        { role: 'system', content: 'You are a consolidator. Merge agent outputs into a coherent response.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content || '';
  }

  // best_of_n - just return the last successful output
  const lastStep = completedSteps[completedSteps.length - 1];
  return lastStep ? JSON.stringify(lastStep.output, null, 2) : 'No results';
};

// === Execute Single Step with Retry and Timeout ===
const executeStepWithRetry = async (
  step: Step,
  planStep: PlanStep,
  agent: Agent,
  client: OpenRouterClient,
  accCtx: AccumulatedContext,
  config: ExecutionConfig,
  onLog: (log: RunLog) => void
): Promise<AgentResponse> => {
  return withRetry(
    async () => {
      // Resolve inputs with accumulated context
      step.input = resolveInputMapping(planStep.inputMapping, accCtx);

      // Auto-chain: if no input from previous steps, include last step's output
      const hasStepReference = Object.values(planStep.inputMapping).some(
        v => typeof v === 'string' && v.startsWith('steps.')
      );

      if (!hasStepReference && accCtx.completedSteps.size > 0) {
        // Get the last completed step's output
        const lastStep = Array.from(accCtx.completedSteps.values()).pop();
        if (lastStep?.output) {
          step.input = {
            ...step.input,
            input_anterior: lastStep.output,
            agente_anterior: lastStep.agentName,
          };
        }
      }

      // Ensure there's always input for the specialist
      if (Object.keys(step.input).length === 0) {
        step.input = {
          tarefa: planStep.description || accCtx.userInput.goal,
          objetivo: accCtx.userInput.goal,
        };
      }

      // Always include the goal for context
      if (!step.input.objetivo) {
        step.input.objetivo = accCtx.userInput.goal;
      }

      console.log(`[Executor] Step ${step.id} input:`, step.input);

      // Execute with timeout
      return withTimeout(
        executeSpecialist(agent, step.input, client),
        config.stepTimeoutMs,
        `Step ${step.id} timed out after ${config.stepTimeoutMs / 1000}s`
      );
    },
    {
      maxRetries: config.maxRetries,
      delayMs: config.retryDelayMs,
      onRetry: (attempt, error) => {
        onLog(createLog(
          agent.name,
          `Tentativa ${attempt} falhou: ${error.message}. Retentando...`,
          'PROCESS',
          'warn',
          step.id
        ));
      },
    }
  );
};

// === Main Executor with Parallel Support ===
export const executeRun = async (
  ctx: ExecutionContext,
  config: ExecutionConfig = DEFAULT_CONFIG
): Promise<Run> => {
  const { run, agents, client, onLog, onStepUpdate, onRunUpdate } = ctx;

  const orchestrator = agents.find(a => a.id === run.orchestratorId);
  if (!orchestrator) {
    throw new Error('Orchestrator not found');
  }

  // Filter specialists that are allowed by the orchestrator
  // Ensure consistent string comparison for IDs
  const allowedIds = (orchestrator.allowedAgents || []).map(id => String(id));
  const availableAgents = agents.filter(
    a => a.type === 'specialist' && allowedIds.includes(String(a.id))
  );

  // Log available specialists for debugging
  console.log('[Executor] Orchestrator:', orchestrator.name, 'ID:', orchestrator.id);
  console.log('[Executor] Allowed IDs:', allowedIds);
  console.log('[Executor] Available specialists:', availableAgents.map(a => ({ id: a.id, name: a.name })));

  // Update run status
  onRunUpdate({ status: 'running' });
  onLog(createLog(orchestrator.name, 'Iniciando execução', 'PLANNING', 'info'));

  // Validate we have specialists
  if (availableAgents.length === 0) {
    onLog(createLog(
      orchestrator.name,
      'Nenhum especialista configurado para este orquestrador. Configure especialistas na página de agentes.',
      'PLANNING',
      'error'
    ));
    throw new Error('Nenhum especialista disponível. Configure especialistas no orquestrador.');
  }

  // Get execution mode from orchestrator config
  const executionMode = orchestrator.orchestrationConfig?.executionMode || 'sequencial';

  onLog(createLog(
    orchestrator.name,
    `${availableAgents.length} especialista(s) disponível(is): ${availableAgents.map(a => a.name).join(', ')} | Modo: ${executionMode}`,
    'PLANNING',
    'info'
  ));

  try {
    let plan: ExecutionPlan;

    // Create plan based on execution mode
    if (executionMode === 'llm') {
      // LLM decides the order
      onLog(createLog(orchestrator.name, 'LLM criando plano de execução...', 'PLANNING', 'info'));
      plan = await createExecutionPlan(orchestrator, run.goal, availableAgents, client, run.context);
    } else {
      // For sequencial/paralelo, use the order of allowedAgents
      onLog(createLog(orchestrator.name, `Usando modo ${executionMode}...`, 'PLANNING', 'info'));
      plan = {
        goal: run.goal,
        reasoning: executionMode === 'paralelo'
          ? 'Executando todos especialistas em paralelo'
          : 'Executando especialistas em cadeia sequencial',
        steps: availableAgents.map((agent, i) => ({
          stepId: `step${i + 1}`,
          agentId: agent.id,
          agentName: agent.name,
          description: `Executar ${agent.name}`,
          inputMapping: {},
          dependsOn: executionMode === 'sequencial' && i > 0 ? [`step${i}`] : [],
          priority: i,
        })),
        estimatedSteps: availableAgents.length,
        strategy: executionMode === 'paralelo' ? 'parallel' : 'sequential',
      };
    }

    onLog(createLog(
      orchestrator.name,
      `Plano criado: ${plan.reasoning} (${plan.steps.length} steps)`,
      'PLANNING',
      'success',
      undefined,
      { type: 'json', label: 'Plano', content: JSON.stringify(plan, null, 2) }
    ));

    // Initialize steps
    const steps: Step[] = plan.steps.map(ps => ({
      id: ps.stepId,
      agentId: ps.agentId,
      agentName: ps.agentName,
      status: 'pending',
      input: {},
      description: ps.description,
      dependsOn: ps.dependsOn,
    }));

    onRunUpdate({ steps });

    // Step 2: Execute steps (parallel or sequential based on strategy)
    const completedSteps = new Map<string, Step>();
    const completedStepIds = new Set<string>();
    const runningStepIds = new Set<string>();
    const failedStepIds = new Set<string>();

    const accCtx: AccumulatedContext = {
      userInput: { goal: run.goal, ...run.context },
      completedSteps,
      globalContext: run.context || {},
    };

    const shouldRunParallel = config.enableParallel &&
      (plan.strategy === 'parallel' || plan.strategy === 'mixed');

    // Execute a single step
    const executeStep = async (planStep: PlanStep): Promise<void> => {
      const step = steps.find(s => s.id === planStep.stepId)!;
      // Normalize agentId to string for consistent comparison
      const normalizedAgentId = String(planStep.agentId);

      // Try to find agent by ID first, then by name as fallback
      let agent = agents.find(a => a.id === normalizedAgentId);

      // Fallback: try to match by name (case-insensitive)
      if (!agent) {
        agent = availableAgents.find(a =>
          a.name.toLowerCase() === planStep.agentName?.toLowerCase() ||
          a.name.toLowerCase() === normalizedAgentId.toLowerCase()
        );
        if (agent) {
          console.log(`[Executor] Agent matched by name: ${agent.name} (ID: ${agent.id})`);
        }
      }

      if (!agent) {
        step.status = 'failed';
        step.error = `Agente "${normalizedAgentId}" não encontrado. IDs disponíveis: ${availableAgents.map(a => a.id).join(', ')}`;
        failedStepIds.add(step.id);
        onStepUpdate(step);
        onLog(createLog(
          orchestrator.name,
          `Erro: Agente ${normalizedAgentId} não encontrado no sistema`,
          'DELEGATION',
          'error',
          step.id
        ));
        return;
      }

      // Update step status
      step.status = 'running';
      step.startedAt = timestamp();
      runningStepIds.add(step.id);
      onStepUpdate(step);

      onLog(createLog(
        orchestrator.name,
        `Delegando para ${agent.name}: ${planStep.description}`,
        'DELEGATION',
        'info',
        step.id
      ));

      onLog(createLog(agent.name, 'Processando...', 'PROCESS', 'info', step.id));

      const startTime = Date.now();

      try {
        const result = await executeStepWithRetry(
          step, planStep, agent, client, accCtx, config, onLog
        );

        const duration = Date.now() - startTime;
        step.completedAt = timestamp();
        step.duration = duration;
        step.tokensUsed = result.tokensUsed;
        step.cost = result.cost;

        if (result.success && result.output) {
          step.status = 'completed';
          step.output = result.output;
          completedSteps.set(step.id, step);
          completedStepIds.add(step.id);

          onLog(createLog(
            agent.name,
            `Output gerado (${(duration / 1000).toFixed(1)}s)`,
            'OUTPUT',
            'success',
            step.id,
            { type: 'json', label: 'Output', content: JSON.stringify(result.output, null, 2) }
          ));
        } else {
          throw new Error(result.error || 'Unknown error');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        step.status = 'failed';
        step.error = errorMessage;
        step.completedAt = timestamp();
        step.duration = Date.now() - startTime;
        failedStepIds.add(step.id);

        onLog(createLog(
          agent.name,
          `Erro após ${config.maxRetries} tentativas: ${errorMessage}`,
          'OUTPUT',
          'error',
          step.id
        ));
      } finally {
        runningStepIds.delete(step.id);
        onStepUpdate(step);
      }
    };

    if (shouldRunParallel) {
      // Parallel execution based on dependency graph
      onLog(createLog(orchestrator.name, 'Executando em modo paralelo', 'PROCESS', 'info'));

      while (completedStepIds.size + failedStepIds.size < plan.steps.length) {
        const readySteps = getReadySteps(plan.steps, completedStepIds, runningStepIds);

        if (readySteps.length === 0 && runningStepIds.size === 0) {
          // No ready steps and nothing running - check for skipped due to failed deps
          const remainingSteps = plan.steps.filter(
            ps => !completedStepIds.has(ps.stepId) && !failedStepIds.has(ps.stepId)
          );
          for (const ps of remainingSteps) {
            const step = steps.find(s => s.id === ps.stepId)!;
            step.status = 'skipped';
            step.error = 'Dependências falharam';
            failedStepIds.add(step.id);
            onStepUpdate(step);
          }
          break;
        }

        if (readySteps.length > 0) {
          onLog(createLog(
            orchestrator.name,
            `Executando ${readySteps.length} step(s) em paralelo: ${readySteps.map(s => s.stepId).join(', ')}`,
            'DELEGATION',
            'info'
          ));

          // Execute all ready steps in parallel
          await Promise.all(readySteps.map(ps => executeStep(ps)));
        } else {
          // Wait a bit for running steps to complete
          await sleep(100);
        }
      }
    } else {
      // Sequential execution
      onLog(createLog(orchestrator.name, 'Executando em modo sequencial', 'PROCESS', 'info'));

      for (const planStep of plan.steps) {
        // Check dependencies - but be lenient for sequential execution
        // If previous step completed, we can proceed even if specific dependency not met
        const dependenciesMet = planStep.dependsOn.length === 0 ||
          planStep.dependsOn.every(depId => completedStepIds.has(depId));

        // For sequential, if previous step completed, allow this one to run
        const previousStepIndex = plan.steps.indexOf(planStep) - 1;
        const previousCompleted = previousStepIndex < 0 ||
          completedStepIds.has(plan.steps[previousStepIndex].stepId);

        if (!dependenciesMet && !previousCompleted) {
          const step = steps.find(s => s.id === planStep.stepId)!;
          step.status = 'skipped';
          step.error = 'Dependências não satisfeitas';
          failedStepIds.add(step.id);
          onStepUpdate(step);
          onLog(createLog(
            orchestrator.name,
            `Step ${planStep.stepId} pulado: dependências ${planStep.dependsOn.join(', ')} não satisfeitas`,
            'DELEGATION',
            'warn',
            step.id
          ));
          continue;
        }

        onRunUpdate({ currentStepId: planStep.stepId });
        await executeStep(planStep);
      }
    }

    // Step 3: Consolidate
    onLog(createLog(orchestrator.name, 'Consolidando resultados...', 'EVALUATION', 'info'));

    const consolidatedOutput = await consolidateResults(
      orchestrator,
      run.goal,
      steps,
      client,
      orchestrator.orchestrationConfig?.consolidationStrategy || 'summarize'
    );

    // Calculate totals
    const totalTokens = steps.reduce((sum, s) => sum + (s.tokensUsed || 0), 0);
    const totalCost = steps.reduce((sum, s) => sum + (s.cost || 0), 0);
    const hasFailures = failedStepIds.size > 0;

    onLog(createLog(
      orchestrator.name,
      `Execução finalizada (${completedStepIds.size}/${plan.steps.length} steps completos)`,
      'OUTPUT',
      hasFailures ? 'warn' : 'success',
      undefined,
      { type: 'markdown', label: 'Resultado Final', content: consolidatedOutput }
    ));

    // Final update
    const endTime = timestamp();
    const finalRun: Partial<Run> = {
      status: hasFailures && completedStepIds.size === 0 ? 'failed' : 'completed',
      steps,
      consolidatedOutput,
      endTime,
      totalTokens,
      cost: totalCost,
    };

    onRunUpdate(finalRun);

    return { ...run, ...finalRun } as Run;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    onLog(createLog(
      orchestrator.name,
      `Erro fatal: ${errorMessage}`,
      'PROCESS',
      'error'
    ));

    onRunUpdate({
      status: 'failed',
      endTime: timestamp(),
    });

    throw error;
  }
};

// === Create New Run ===
export const createRun = (
  orchestratorId: string,
  orchestratorName: string,
  goal: string,
  context?: Record<string, unknown>
): Run => ({
  id: `run-${generateId()}`,
  orchestratorId,
  orchestratorName,
  goal,
  context,
  status: 'pending',
  steps: [],
  logs: [],
  startTime: timestamp(),
  cost: 0,
});
