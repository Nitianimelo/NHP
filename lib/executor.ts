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

// === Types ===
export interface ExecutionContext {
  run: Run;
  agents: Agent[];
  client: OpenRouterClient;
  onLog: (log: RunLog) => void;
  onStepUpdate: (step: Step) => void;
  onRunUpdate: (run: Partial<Run>) => void;
}

// === Utility Functions ===
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const timestamp = () => new Date().toISOString();

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

// === Input Resolution ===
// Resolves input mappings like "user_input.field" or "steps.step1.output.field"
const resolveInputMapping = (
  mapping: Record<string, string>,
  userInput: Record<string, unknown>,
  completedSteps: Map<string, Step>
): StepInput => {
  const resolved: StepInput = {};

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
      // e.g., "context.someValue" -> context.someValue
      // Context is passed separately
      resolved[targetField] = sourcePath;
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

// === Specialist Executor ===
export const executeSpecialist = async (
  agent: Agent,
  input: StepInput,
  client: OpenRouterClient
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
    // Build system prompt with output schema
    const systemPrompt = buildSystemPrompt(
      agent.role,
      agent.description,
      agent.systemPrompt,
      agent.outputSchema
    );

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
          temperature: agent.temperature,
          max_tokens: agent.maxTokens || 2048,
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
        temperature: agent.temperature,
        max_tokens: agent.maxTokens || 2048,
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

  const messages: ChatMessage[] = [
    { role: 'system', content: orchestrator.systemPrompt },
    { role: 'user', content: prompt },
  ];

  const response = await client.chatWithSchema<{
    reasoning: string;
    steps: Array<{
      stepId: string;
      agentId: string;
      description: string;
      inputMapping: Record<string, string>;
      dependsOn: string[];
    }>;
    strategy: 'sequential' | 'parallel' | 'mixed';
  }>(
    {
      model: orchestrator.model,
      messages,
      temperature: orchestrator.temperature,
    },
    ORCHESTRATOR_PLAN_SCHEMA
  );

  const plan: ExecutionPlan = {
    goal,
    reasoning: response.data.reasoning,
    steps: response.data.steps.map((s, i) => {
      const agent = availableAgents.find(a => a.id === s.agentId);
      return {
        stepId: s.stepId,
        agentId: s.agentId,
        agentName: agent?.name || s.agentId,
        description: s.description,
        inputMapping: s.inputMapping,
        dependsOn: s.dependsOn,
        priority: i,
      };
    }),
    estimatedSteps: response.data.steps.length,
    strategy: response.data.strategy,
  };

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

// === Main Executor ===
export const executeRun = async (ctx: ExecutionContext): Promise<Run> => {
  const { run, agents, client, onLog, onStepUpdate, onRunUpdate } = ctx;

  const orchestrator = agents.find(a => a.id === run.orchestratorId);
  if (!orchestrator) {
    throw new Error('Orchestrator not found');
  }

  const availableAgents = agents.filter(
    a => a.type === 'specialist' && orchestrator.allowedAgents?.includes(a.id)
  );

  // Update run status
  onRunUpdate({ status: 'running' });
  onLog(createLog(orchestrator.name, 'Iniciando execução', 'PLANNING', 'info'));

  try {
    // Step 1: Create execution plan
    onLog(createLog(orchestrator.name, 'Criando plano de execução...', 'PLANNING', 'info'));

    const plan = await createExecutionPlan(
      orchestrator,
      run.goal,
      availableAgents,
      client,
      run.context
    );

    onLog(createLog(
      orchestrator.name,
      `Plano criado: ${plan.reasoning}`,
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

    // Step 2: Execute steps
    const completedSteps = new Map<string, Step>();
    const userInput: Record<string, unknown> = { goal: run.goal, ...run.context };

    for (const planStep of plan.steps) {
      const step = steps.find(s => s.id === planStep.stepId)!;
      const agent = agents.find(a => a.id === planStep.agentId);

      if (!agent) {
        step.status = 'failed';
        step.error = `Agent ${planStep.agentId} not found`;
        onStepUpdate(step);
        continue;
      }

      // Check dependencies
      const dependenciesMet = planStep.dependsOn.every(depId => {
        const dep = completedSteps.get(depId);
        return dep && dep.status === 'completed';
      });

      if (!dependenciesMet) {
        step.status = 'skipped';
        step.error = 'Dependencies not met';
        onStepUpdate(step);
        continue;
      }

      // Update step status
      step.status = 'running';
      step.startedAt = timestamp();
      onStepUpdate(step);
      onRunUpdate({ currentStepId: step.id });

      onLog(createLog(
        orchestrator.name,
        `Delegando para ${agent.name}: ${planStep.description}`,
        'DELEGATION',
        'info',
        step.id
      ));

      // Resolve inputs
      step.input = resolveInputMapping(planStep.inputMapping, userInput, completedSteps);

      onLog(createLog(
        agent.name,
        `Recebendo input: ${JSON.stringify(step.input)}`,
        'INPUT',
        'info',
        step.id
      ));

      // Execute agent
      onLog(createLog(agent.name, 'Processando...', 'PROCESS', 'info', step.id));

      const startTime = Date.now();
      const result = await executeSpecialist(agent, step.input, client);
      const duration = Date.now() - startTime;

      // Update step with result
      step.completedAt = timestamp();
      step.duration = duration;
      step.tokensUsed = result.tokensUsed;
      step.cost = result.cost;

      if (result.success && result.output) {
        step.status = 'completed';
        step.output = result.output;
        completedSteps.set(step.id, step);

        onLog(createLog(
          agent.name,
          'Output gerado',
          'OUTPUT',
          'success',
          step.id,
          { type: 'json', label: 'Output', content: JSON.stringify(result.output, null, 2) }
        ));
      } else {
        step.status = 'failed';
        step.error = result.error;

        onLog(createLog(
          agent.name,
          `Erro: ${result.error}`,
          'OUTPUT',
          'error',
          step.id
        ));
      }

      onStepUpdate(step);
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

    onLog(createLog(
      orchestrator.name,
      'Execução finalizada',
      'OUTPUT',
      'success',
      undefined,
      { type: 'markdown', label: 'Resultado Final', content: consolidatedOutput }
    ));

    // Final update
    const endTime = timestamp();
    const finalRun: Partial<Run> = {
      status: 'completed',
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
