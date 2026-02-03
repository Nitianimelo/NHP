import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createOpenRouterClient, ChatMessage } from '../lib/openrouter';
import { useApp } from '../AppContext';
import { Bot, Send, Trash2 } from 'lucide-react';
import { Run, RunLog, Agent } from '../types';

const getChatStorageKey = (orchestratorId: string) => `nhp_orchestrator_chat_${orchestratorId}`;

export const Chat: React.FC = () => {
  const { agents, apiConfig, addRun, updateRun } = useApp();
  const orchestrators = useMemo(
    () => agents.filter(agent => agent.type === 'orchestrator'),
    [agents]
  );
  const specialists = useMemo(
    () => agents.filter(agent => agent.type === 'specialist'),
    [agents]
  );
  const [selectedId, setSelectedId] = useState(orchestrators[0]?.id || '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runLogs, setRunLogs] = useState<RunLog[]>([]);
  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  const [runId, setRunId] = useState<string | null>(null);

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

  const buildOrchestratorRules = () => `
Você é o orquestrador. Respeite rigorosamente:
- Você decide o plano, mas NÃO cria conteúdo final por conta própria.
- Especialistas executam tarefas específicas com input/output explícitos.
- Especialistas não conversam entre si.
- Você não delega fluxo aos especialistas.
- Todo output deve respeitar o schema definido.
- O estado pertence ao sistema.
`.trim();

  const buildSchemaText = (agent: Agent) => {
    if (!agent.outputSchema?.length) return 'Sem schema definido.';
    return agent.outputSchema
      .map(field => `- ${field.name} (${field.type})${field.required ? ' [required]' : ''}: ${field.description}`)
      .join('\n');
  };

  const safeParseJson = (value: string, fallback: unknown) => {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };

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

    const goal = nextMessages[nextMessages.length - 1].content;
    const startTime = new Date();
    const newRunId = `r-${Date.now()}`;
    setRunId(newRunId);
    setRunStatus('running');
    setRunLogs([]);

    const runBase: Run = {
      id: newRunId,
      orchestratorId: selectedOrchestrator.id,
      orchestratorName: selectedOrchestrator.name,
      goal,
      status: 'running',
      startTime: startTime.toLocaleTimeString(),
      duration: 'em andamento',
      cost: 0,
      logs: [],
    };
    addRun(runBase);

    const addLog = (log: RunLog) => {
      setRunLogs(prev => {
        const updated = [...prev, log];
        updateRun(newRunId, { logs: updated });
        return updated;
      });
    };

    const orchestratorSystemPrompt = [
      selectedOrchestrator.systemPrompt?.trim(),
      buildOrchestratorRules(),
    ].filter(Boolean).join('\n\n');

    const availableSpecialists = (selectedOrchestrator.allowedAgents?.length
      ? specialists.filter(agent => selectedOrchestrator.allowedAgents?.includes(agent.id))
      : specialists
    ).map(agent => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      model: agent.model,
      inputSchema: agent.inputSchema,
      outputSchema: agent.outputSchema,
    }));

    try {
      addLog({
        id: `l-${Date.now()}-plan`,
        agentName: selectedOrchestrator.name,
        agentAvatar: selectedOrchestrator.avatar,
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Planejando execução com base no objetivo.',
        phase: 'PLANNING',
      });

      const planningResponse = await client.chat({
        model: selectedOrchestrator.model || 'gpt-4o',
        messages: [
          { role: 'system', content: orchestratorSystemPrompt },
          {
            role: 'user',
            content: JSON.stringify({
              goal,
              availableSpecialists,
              instructions: 'Retorne JSON com steps: [{agentId, task, input}]',
            }),
          },
        ],
        temperature: selectedOrchestrator.temperature ?? 0.7,
        response_format: { type: 'json_object' },
      });

      const planContent = planningResponse.choices[0]?.message?.content || '{}';
      const plan = safeParseJson(planContent || '{}', { steps: [] }) as { steps?: unknown };
      const steps = Array.isArray(plan.steps) ? plan.steps : [];

      addLog({
        id: `l-${Date.now()}-plan-ready`,
        agentName: selectedOrchestrator.name,
        agentAvatar: selectedOrchestrator.avatar,
        timestamp: new Date().toISOString(),
        level: 'success',
        message: `Plano criado com ${steps.length} etapa(s).`,
        phase: 'PLANNING',
        artifact: {
          type: 'json',
          label: 'Plano',
          content: JSON.stringify(plan, null, 2),
        },
      });

      const outputs: Array<{ agentId: string; output: unknown }> = [];

      for (const step of steps) {
        const stepAgentId = typeof step?.agentId === 'string' ? step.agentId : '';
        const targetAgent = specialists.find(agent => agent.id === stepAgentId);
        if (!targetAgent) {
          addLog({
            id: `l-${Date.now()}-missing`,
            agentName: selectedOrchestrator.name,
            agentAvatar: selectedOrchestrator.avatar,
            timestamp: new Date().toISOString(),
            level: 'warn',
            message: `Agente não encontrado para a etapa: ${stepAgentId || 'desconhecido'}`,
            phase: 'DELEGATION',
          });
          continue;
        }

        addLog({
          id: `l-${Date.now()}-delegate`,
          agentName: selectedOrchestrator.name,
          agentAvatar: selectedOrchestrator.avatar,
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Despachando tarefa para ${targetAgent.name}.`,
          phase: 'DELEGATION',
        });

        const specialistResponse = await client.chat({
          model: targetAgent.model || 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: [
                targetAgent.systemPrompt?.trim(),
                'Você é um agente especialista. Responda APENAS em JSON válido seguindo o schema.',
                `Schema de saída:\n${buildSchemaText(targetAgent)}`,
              ].filter(Boolean).join('\n\n'),
            },
            {
              role: 'user',
              content: JSON.stringify({
                task: step?.task ?? '',
                input: step?.input ?? {},
                goal,
                context: outputs,
              }),
            },
          ],
          temperature: targetAgent.temperature ?? 0.7,
          response_format: { type: 'json_object' },
        });

        const specialistContent = specialistResponse.choices[0]?.message?.content || '{}';
        const parsedOutput = safeParseJson(specialistContent || '{}', {});
        outputs.push({ agentId: targetAgent.id, output: parsedOutput });

        addLog({
          id: `l-${Date.now()}-output`,
          agentName: targetAgent.name,
          agentAvatar: targetAgent.avatar,
          timestamp: new Date().toISOString(),
          level: 'success',
          message: `Output recebido de ${targetAgent.name}.`,
          phase: 'OUTPUT',
          artifact: {
            type: 'json',
            label: `Output ${targetAgent.name}`,
            content: JSON.stringify(parsedOutput, null, 2),
          },
        });
      }

      const consolidationResponse = await client.chat({
        model: selectedOrchestrator.model || 'gpt-4o',
        messages: [
          { role: 'system', content: orchestratorSystemPrompt },
          {
            role: 'user',
            content: JSON.stringify({
              goal,
              outputs,
              instructions: 'Consolide e entregue a resposta final para o usuário.',
            }),
          },
        ],
        temperature: selectedOrchestrator.temperature ?? 0.7,
      });

      const assistantMessage = consolidationResponse.choices[0]?.message?.content || 'Sem resposta do modelo.';
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);

      setRunLogs(prev => {
        updateRun(newRunId, {
          status: 'completed',
          duration: `${Math.max(1, Math.round((Date.now() - startTime.getTime()) / 1000))}s`,
          finalResult: assistantMessage,
          logs: prev,
        });
        return prev;
      });
      setRunStatus('completed');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao chamar o OpenRouter.';
      setError(message);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Não consegui responder. Tente novamente.' },
      ]);
      setRunLogs(prev => {
        updateRun(newRunId, {
          status: 'failed',
          duration: `${Math.max(1, Math.round((Date.now() - startTime.getTime()) / 1000))}s`,
          logs: prev,
        });
        return prev;
      });
      setRunStatus('failed');
    } finally {
      setSending(false);
    }
  };

  const clearChat = () => {
    if (!selectedId) return;
    setMessages([]);
    setRunLogs([]);
    setRunStatus('idle');
    setRunId(null);
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
            {runStatus !== 'idle' && (
              <div className="rounded border border-neutral-800 bg-neutral-900/60 p-3 text-xs text-neutral-300">
                <p className="text-neutral-400">
                  Execução {runId ? `#${runId}` : ''} — {runStatus === 'running' ? 'em andamento' : runStatus}
                </p>
                {runLogs.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {runLogs.map(log => (
                      <div key={log.id}>
                        <p className="text-neutral-200">{log.agentName}: {log.message}</p>
                        {log.artifact && (
                          <pre className="mt-1 bg-neutral-950 rounded p-2 text-[11px] text-neutral-400 overflow-x-auto">
                            {log.artifact.content}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
