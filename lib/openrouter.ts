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
    // For image generation, we use the chat endpoint with specific models
    // Models like dall-e-3 are called through chat completions
    const response = await this.chat({
      model: request.model,
      messages: [
        {
          role: 'user',
          content: request.prompt,
        },
      ],
      // Some image models use these parameters differently
      max_tokens: 1024,
    });

    // For models that return images directly in content
    // This depends on the specific model's behavior
    const content = response.choices[0]?.message?.content;

    // Parse image URLs from response if present
    const urlMatch = content?.match(/https?:\/\/[^\s)]+\.(png|jpg|jpeg|webp|gif)/gi);

    return {
      created: Date.now(),
      data: urlMatch
        ? urlMatch.map(url => ({ url, revised_prompt: request.prompt }))
        : [{ revised_prompt: content || request.prompt }],
    };
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
  let prompt = `You are an orchestrator. Your goal is to create an execution plan.

## GOAL
${goal}

## AVAILABLE AGENTS
${availableAgents.map(a => `
### ${a.name} (${a.id})
- Role: ${a.role}
- Description: ${a.description}
- Required Inputs: ${JSON.stringify(a.inputSchema)}
`).join('\n')}

## RULES
1. Break down the goal into steps
2. Each step must use exactly one agent
3. Map outputs from previous steps to inputs of next steps
4. Use "user_input" for initial data
5. Use "steps.<stepId>.output.<field>" for data from previous steps

${context ? `## CONTEXT\n${JSON.stringify(context, null, 2)}` : ''}

Respond with a JSON execution plan.`;

  return prompt;
};

// === Schema for Orchestrator Planning ===
export const ORCHESTRATOR_PLAN_SCHEMA: JsonSchema = {
  name: 'execution_plan',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      reasoning: {
        type: 'string',
        description: 'Brief explanation of the plan',
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
              additionalProperties: { type: 'string' },
            },
            dependsOn: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['stepId', 'agentId', 'description', 'inputMapping', 'dependsOn'],
        },
      },
      strategy: {
        type: 'string',
        enum: ['sequential', 'parallel', 'mixed'],
      },
    },
    required: ['reasoning', 'steps', 'strategy'],
    additionalProperties: false,
  },
};
