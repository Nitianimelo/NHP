// OpenRouter API Service

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  response_format?: { type: 'json_object' | 'text' };
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>;
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost?: number;
  };
}

export interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
}

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

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    return response.json();
  }

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

  async testConnection(): Promise<boolean> {
    try {
      await this.getModels();
      return true;
    } catch {
      return false;
    }
  }
}

// Helper to create client from config
export const createOpenRouterClient = (config: {
  openRouterKey: string;
  siteUrl?: string;
  siteName?: string;
}): OpenRouterClient | null => {
  if (!config.openRouterKey) return null;
  return new OpenRouterClient(config.openRouterKey, config.siteUrl, config.siteName);
};
