import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createOpenRouterClient, ChatMessage } from '../lib/openrouter';
import { useApp } from '../AppContext';
import { Bot, Send, Trash2 } from 'lucide-react';

const getChatStorageKey = (orchestratorId: string) => `nhp_orchestrator_chat_${orchestratorId}`;

export const Chat: React.FC = () => {
  const { agents, apiConfig } = useApp();
  const orchestrators = useMemo(
    () => agents.filter(agent => agent.type === 'orchestrator'),
    [agents]
  );
  const [selectedId, setSelectedId] = useState(orchestrators[0]?.id || '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && orchestrators.length > 0) {
      setSelectedId(orchestrators[0].id);
    }
  }, [orchestrators, selectedId]);

  const selectedOrchestrator = useMemo(
    () => orchestrators.find(orchestrator => orchestrator.id === selectedId),
    [orchestrators, selectedId]
  );

  useEffect(() => {
    if (!selectedId) return;
    try {
      const stored = localStorage.getItem(getChatStorageKey(selectedId));
      setMessages(stored ? JSON.parse(stored) : []);
    } catch {
      setMessages([]);
    }
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    try {
      localStorage.setItem(getChatStorageKey(selectedId), JSON.stringify(messages));
    } catch {}
  }, [messages, selectedId]);

  const sendMessage = async () => {
    if (!selectedOrchestrator || !input.trim() || sending) return;
    const client = createOpenRouterClient(apiConfig);
    if (!client) {
      setError('Configure sua chave do OpenRouter antes de enviar mensagens.');
      return;
    }

    setError(null);
    setSending(true);

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: input.trim() },
    ];
    setMessages(nextMessages);
    setInput('');

    const systemPrompt = selectedOrchestrator.systemPrompt?.trim();
    const payloadMessages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt } as ChatMessage] : []),
      ...nextMessages,
    ];

    try {
      const response = await client.chat({
        model: selectedOrchestrator.model || 'gpt-4o',
        messages: payloadMessages,
        temperature: selectedOrchestrator.temperature ?? 0.7,
      });
      const assistantMessage = response.choices[0]?.message?.content || 'Sem resposta do modelo.';
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao chamar o OpenRouter.';
      setError(message);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Não consegui responder. Tente novamente.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  const clearChat = () => {
    if (!selectedId) return;
    setMessages([]);
    try {
      localStorage.removeItem(getChatStorageKey(selectedId));
    } catch {}
  };

  if (orchestrators.length === 0) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-xl font-semibold">Chat com Orquestrador</h1>
        <p className="text-sm text-neutral-400">
          Você ainda não tem nenhum orquestrador cadastrado.
        </p>
        <Link
          to="/agents/new"
          className="inline-flex items-center gap-2 px-3 py-2 bg-white text-black text-sm font-medium rounded hover:bg-neutral-200"
        >
          <Bot size={16} />
          Criar Orquestrador
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Chat com Orquestrador</h1>
          <p className="text-sm text-neutral-500">
            Converse diretamente com o orquestrador para testar o fluxo completo.
          </p>
        </div>
        <button
          type="button"
          onClick={clearChat}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 border border-neutral-800 rounded hover:bg-neutral-900"
        >
          <Trash2 size={14} />
          Limpar conversa
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="space-y-3">
          <label className="text-xs uppercase text-neutral-500">Orquestrador ativo</label>
          <select
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-700"
          >
            {orchestrators.map(orchestrator => (
              <option key={orchestrator.id} value={orchestrator.id}>
                {orchestrator.name}
              </option>
            ))}
          </select>

          {selectedOrchestrator && (
            <div className="p-3 bg-neutral-900 rounded text-xs text-neutral-400 space-y-2">
              <div>
                <p className="text-neutral-500 mb-1">Modelo</p>
                <p className="text-sm text-neutral-200">{selectedOrchestrator.model}</p>
              </div>
              <div>
                <p className="text-neutral-500 mb-1">Role</p>
                <p className="text-sm text-neutral-200">{selectedOrchestrator.role}</p>
              </div>
            </div>
          )}

          {!apiConfig.openRouterKey && (
            <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
              Configure a API do OpenRouter para liberar o chat.{' '}
              <Link to="/api" className="underline text-amber-100">
                Ir para configuração
              </Link>
            </div>
          )}
        </div>

        <div className="flex flex-col border border-neutral-800 rounded-lg overflow-hidden">
          <div className="flex-1 min-h-[360px] p-4 space-y-4 overflow-y-auto bg-neutral-950">
            {messages.length === 0 && (
              <div className="text-sm text-neutral-500">
                Envie uma mensagem para iniciar a conversa com o orquestrador.
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    message.role === 'user'
                      ? 'bg-white text-black'
                      : message.role === 'system'
                        ? 'bg-neutral-800 text-neutral-200'
                        : 'bg-neutral-900 text-neutral-200 border border-neutral-800'
                  }`}
                >
                  <p className="text-xs uppercase text-neutral-500 mb-1">
                    {message.role === 'user' ? 'Você' : 'Orquestrador'}
                  </p>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="px-4 py-2 text-xs text-red-300 bg-red-500/10 border-t border-red-500/20">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 p-3 border-t border-neutral-800 bg-neutral-950">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Digite sua mensagem..."
              rows={2}
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:border-neutral-700"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
              {sending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
