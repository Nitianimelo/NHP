// ============================================
// NHP - OpenRouter API Service
// ============================================

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// === Message Types ===
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image_url';
  image_url: {
    url: string; // URL or base64 data URI
    detail?: 'auto' | 'low' | 'high';
  };
}

export type MessageContent = string | (TextContent | ImageContent)[];

export interface ChatMessage {
  role: MessageRole;
  content: MessageContent;
  name?: string;
  tool_call_id?: string;
}

// === Tool/Function Calling ===
export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface Tool {
  type: 'function';
  function: FunctionDefinition;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// === Structured Output ===
export interface JsonSchema {
  name: string;
  strict?: boolean;
  schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export interface ResponseFormat {
  type: 'text' | 'json_object' | 'json_schema';
  json_schema?: JsonSchema;
}

// === Request Types ===
export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  stop?: string[];
  seed?: number;

  // Tools
  tools?: Tool[];
  tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };

  // Response format
  response_format?: ResponseFormat;

  // Plugins
  plugins?: Array<{ id: 'web' | 'file-parser' | 'response-healing' }>;

  // Fallback models
  models?: string[];
  route?: 'fallback';

  // Provider preferences
  provider?: {
    order?: string[];
    require_parameters?: boolean;
    data_collection?: 'allow' | 'deny';
  };
}

// === Response Types ===
export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';
    native_finish_reason?: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost?: number;
  };
}

// === Model Types ===
export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
    image?: string;
  };
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
  };
  supported_parameters?: string[];
  architecture?: {
    modality: string;
    tokenizer: string;
    instruct_type?: string;
  };
}

// === Image Generation ===
export interface ImageGenerationRequest {
  model: string; // e.g., 'openai/dall-e-3', 'stability/sdxl'
  prompt: string;
  n?: number;
  size?: '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024';
  quality?: 'standard' | 'hd';
  style?: 'natural' | 'vivid';
}

export interface ImageGenerationResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

// === Client Class ===
export class OpenRouterClient {
  private apiKey: string;
  private siteUrl?: string;
  private siteName?: string;

  constructor(apiKey: string, siteUrl?: string, siteName?: string) {
    this.apiKey = apiKey;
    this.siteUrl = siteUrl;
    this.siteName = siteName || 'NHP';
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    if (this.siteUrl) {
      headers['HTTP-Referer'] = this.siteUrl;
    }

    if (this.siteName) {
      headers['X-Title'] = this.siteName;
    }

    return headers;
  }

  // === Chat Completion ===
  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || error.message || `API Error: ${response.status}`);
    }

    return response.json();
  }

  // === Chat with Structured Output ===
  async chatWithSchema<T>(
    request: Omit<ChatCompletionRequest, 'response_format'>,
    schema: JsonSchema
  ): Promise<{ data: T; usage: ChatCompletionResponse['usage'] }> {
    const response = await this.chat({
      ...request,
      response_format: {
        type: 'json_schema',
        json_schema: schema,
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in response');
    }

    return {
      data: JSON.parse(content) as T,
      usage: response.usage,
    };
  }

  // === Image Generation ===
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const response = await fetch(`${OPENROUTER_BASE_URL}/images/generations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: request.model,
        prompt: request.prompt,
        n: request.n || 1,
        size: request.size || '1024x1024',
        quality: request.quality,
        style: request.style,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Image generation failed: ${response.status}`);
    }

    return response.json();
  }

  // === Image Analysis (Vision) ===
  async analyzeImage(
    imageUrl: string,
    prompt: string,
    model: string = 'openai/gpt-4o'
  ): Promise<string> {
    const response = await this.chat({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'auto' } },
          ],
        },
      ],
    });

    return response.choices[0]?.message?.content || '';
  }

  // === Function Calling ===
  async chatWithTools(
    request: ChatCompletionRequest
  ): Promise<{
    content: string | null;
    toolCalls: ToolCall[];
    usage: ChatCompletionResponse['usage'];
    finishReason: string;
  }> {
    const response = await this.chat(request);
    const choice = response.choices[0];

    return {
      content: choice?.message?.content || null,
      toolCalls: choice?.message?.tool_calls || [],
      usage: response.usage,
      finishReason: choice?.finish_reason || 'unknown',
    };
  }

  // === Get Models ===
  async getModels(): Promise<OpenRouterModel[]> {
    const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  // === Get Models by Capability ===
  async getImageModels(): Promise<OpenRouterModel[]> {
    const models = await this.getModels();
    return models.filter(m =>
      m.id.includes('dall-e') ||
      m.id.includes('stable-diffusion') ||
      m.id.includes('sdxl') ||
      m.id.includes('midjourney') ||
      m.architecture?.modality?.includes('image')
    );
  }

  async getVisionModels(): Promise<OpenRouterModel[]> {
    const models = await this.getModels();
    return models.filter(m =>
      m.architecture?.modality?.includes('multimodal') ||
      m.id.includes('vision') ||
      m.id.includes('gpt-4o') ||
      m.id.includes('claude-3')
    );
  }

  // === Test Connection ===
  async testConnection(): Promise<boolean> {
    try {
      await this.getModels();
      return true;
    } catch {
      return false;
    }
  }

  // === Get Generation Stats ===
  async getGenerationStats(generationId: string): Promise<unknown> {
    const response = await fetch(
      `${OPENROUTER_BASE_URL}/generation?id=${generationId}`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Failed to get stats: ${response.status}`);
    }

    return response.json();
  }
}

// === Helper Functions ===
export const createOpenRouterClient = (config: {
  openRouterKey: string;
  siteUrl?: string;
  siteName?: string;
}): OpenRouterClient | null => {
  if (!config.openRouterKey) return null;
  return new OpenRouterClient(config.openRouterKey, config.siteUrl, config.siteName);
};

// === Prompt Builders ===
export const buildSystemPrompt = (
  agentRole: string,
  agentDescription: string,
  customPrompt: string,
  outputSchema?: Array<{ name: string; type: string; description: string }>
): string => {
  let prompt = customPrompt;

  if (outputSchema && outputSchema.length > 0) {
    prompt += `\n\nYou must respond with a JSON object with the following structure:\n`;
    prompt += '```json\n{\n';
    prompt += outputSchema.map(f => `  "${f.name}": <${f.type}> // ${f.description}`).join(',\n');
    prompt += '\n}\n```';
  }

  return prompt;
};

export const buildOrchestratorPrompt = (
  goal: string,
  availableAgents: Array<{ id: string; name: string; role: string; description: string; inputSchema: unknown[] }>,
  context?: Record<string, unknown>
): string => {
  // Build a clear list of agents with their exact IDs
  const agentList = availableAgents.length > 0
    ? availableAgents.map(a => `- ID: "${a.id}" | Nome: ${a.name} | Função: ${a.description || a.role}`).join('\n')
    : '(Nenhum especialista disponível)';

  const prompt = `Você é um orquestrador que planeja a execução de tarefas delegando para especialistas.

## OBJETIVO DO USUÁRIO
${goal}

## ESPECIALISTAS DISPONÍVEIS
${agentList}

## REGRAS IMPORTANTES
1. SEMPRE use o campo "agentId" com o ID EXATO do agente (ex: "${availableAgents[0]?.id || '1'}")
2. Cada step deve usar UM especialista
3. Use "user_input.goal" para passar o objetivo original
4. Para passos sequenciais, use "steps.step1.output.resultado" para usar saída anterior

## FORMATO DE RESPOSTA (JSON obrigatório)
{
  "reasoning": "Breve explicação do plano",
  "steps": [
    {
      "stepId": "step1",
      "agentId": "${availableAgents[0]?.id || 'ID_DO_AGENTE'}",
      "description": "O que este passo faz",
      "inputMapping": { "tarefa": "user_input.goal" },
      "dependsOn": []
    }
  ],
  "strategy": "sequential"
}

${context ? `## CONTEXTO ADICIONAL\n${JSON.stringify(context, null, 2)}` : ''}

Responda APENAS com o JSON do plano. Não inclua explicações fora do JSON.`;

  return prompt;
};

// === Schema for Orchestrator Planning ===
// Note: Using non-strict mode to allow flexible LLM responses
export const ORCHESTRATOR_PLAN_SCHEMA: JsonSchema = {
  name: 'execution_plan',
  strict: false,
  schema: {
    type: 'object',
    properties: {
      reasoning: {
        type: 'string',
      },
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            stepId: { type: 'string' },
            agentId: { type: 'string' },
            description: { type: 'string' },
            inputMapping: {
              type: 'object',
            },
            dependsOn: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['stepId', 'agentId', 'description'],
        },
      },
      strategy: {
        type: 'string',
        enum: ['sequential', 'parallel', 'mixed'],
      },
    },
    required: ['steps'],
  },
};
