import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Send, Loader2, Bot, User, ChevronDown, AlertCircle } from 'lucide-react';
import { OpenRouterClient } from '../lib/openrouter';
import { Agent } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agentName?: string;
  status?: 'sending' | 'sent' | 'error';
  steps?: Array<{
    agentName: string;
    description: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
  }>;
}

export const Chat: React.FC = () => {
  const { agents, apiConfig, createRun } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrchestrator, setSelectedOrchestrator] = useState<Agent | null>(null);
  const [showOrchestratorSelect, setShowOrchestratorSelect] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const orchestrators = agents.filter(a => a.type === 'orchestrator');
  const specialists = agents.filter(a => a.type === 'specialist');

  // Auto-select first orchestrator
  useEffect(() => {
    if (!selectedOrchestrator && orchestrators.length > 0) {
      setSelectedOrchestrator(orchestrators[0]);
    }
  }, [orchestrators, selectedOrchestrator]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !selectedOrchestrator) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      status: 'sent'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    // Check if API key is configured
    if (!apiConfig.openRouterKey) {
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: 'system',
        content: 'Configure sua API Key do OpenRouter na página de API para usar o chat.',
        timestamp: new Date(),
        status: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
      return;
    }

    try {
      const client = new OpenRouterClient(apiConfig.openRouterKey);

      // Build context about available specialists
      const specialistsContext = specialists.map(s =>
        `- ${s.name}: ${s.role} - ${s.description}`
      ).join('\n');

      const systemPrompt = `${selectedOrchestrator.systemPrompt}

Você é o orquestrador "${selectedOrchestrator.name}".
Sua função: ${selectedOrchestrator.role}

Agentes especialistas disponíveis:
${specialistsContext}

Ao receber uma tarefa:
1. Analise o que precisa ser feito
2. Indique quais agentes seriam acionados e em qual ordem
3. Forneça uma resposta clara e estruturada

Responda de forma direta e objetiva.`;

      const response = await client.chat({
        model: selectedOrchestrator.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
          })),
          { role: 'user', content: userMessage.content }
        ],
        temperature: selectedOrchestrator.temperature || 0.7,
        max_tokens: 2048
      });

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-response`,
        role: 'assistant',
        content: response.choices[0]?.message?.content || 'Sem resposta',
        timestamp: new Date(),
        agentName: selectedOrchestrator.name,
        status: 'sent'
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Create a run record
      createRun(selectedOrchestrator.id, userMessage.content);

    } catch (error) {
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: 'system',
        content: `Erro: ${error instanceof Error ? error.message : 'Falha na comunicação'}`,
        timestamp: new Date(),
        status: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      {/* Header with orchestrator selector */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-4">
        <h1 className="text-xl font-semibold">Chat</h1>

        <div className="relative">
          <button
            onClick={() => setShowOrchestratorSelect(!showOrchestratorSelect)}
            className="flex items-center gap-2 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded hover:border-neutral-700 text-sm"
          >
            <Bot size={16} className="text-neutral-400" />
            <span>{selectedOrchestrator?.name || 'Selecionar Orquestrador'}</span>
            <ChevronDown size={14} className="text-neutral-500" />
          </button>

          {showOrchestratorSelect && (
            <div className="absolute right-0 mt-1 w-64 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-10">
              {orchestrators.length === 0 ? (
                <div className="p-4 text-sm text-neutral-500 text-center">
                  Nenhum orquestrador configurado
                </div>
              ) : (
                orchestrators.map(orch => (
                  <button
                    key={orch.id}
                    onClick={() => {
                      setSelectedOrchestrator(orch);
                      setShowOrchestratorSelect(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-neutral-800 transition-colors ${
                      selectedOrchestrator?.id === orch.id ? 'bg-neutral-800' : ''
                    }`}
                  >
                    <p className="text-sm font-medium">{orch.name}</p>
                    <p className="text-xs text-neutral-500">{orch.role}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-neutral-500">
            <Bot size={48} className="mb-4 opacity-20" />
            <p className="text-sm mb-2">Inicie uma conversa com o orquestrador</p>
            <p className="text-xs text-neutral-600">
              {selectedOrchestrator
                ? `${selectedOrchestrator.name} está pronto para receber tarefas`
                : 'Selecione um orquestrador acima'}
            </p>
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
            >
              {message.role !== 'user' && (
                <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
                  message.status === 'error'
                    ? 'bg-red-500/10 text-red-500'
                    : 'bg-neutral-800 text-neutral-400'
                }`}>
                  {message.status === 'error' ? <AlertCircle size={16} /> : <Bot size={16} />}
                </div>
              )}

              <div className={`max-w-[80%] ${message.role === 'user' ? 'order-1' : ''}`}>
                {message.agentName && (
                  <p className="text-xs text-neutral-500 mb-1">{message.agentName}</p>
                )}
                <div className={`rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-white text-black'
                    : message.status === 'error'
                    ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-200'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                <p className="text-xs text-neutral-600 mt-1">
                  {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded bg-neutral-700 flex items-center justify-center shrink-0">
                  <User size={16} className="text-neutral-300" />
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center">
              <Loader2 size={16} className="text-neutral-400 animate-spin" />
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3">
              <p className="text-sm text-neutral-400">Processando...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-neutral-800 pt-4">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={selectedOrchestrator
              ? `Envie uma tarefa para ${selectedOrchestrator.name}...`
              : 'Selecione um orquestrador primeiro...'
            }
            disabled={!selectedOrchestrator || isLoading}
            rows={1}
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !selectedOrchestrator}
            className="px-4 py-3 bg-white text-black rounded-lg hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
        <p className="text-xs text-neutral-600 mt-2">
          Shift + Enter para nova linha
        </p>
      </div>
    </div>
  );
};
