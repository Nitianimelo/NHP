import { Agent, Run, KnowledgeBase, Workflow } from './types';

export const MOCK_AGENTS: Agent[] = [
  {
    id: 'a0',
    type: 'orchestrator',
    name: 'Gerente de Produto',
    role: 'Orquestrador',
    description: 'Recebe a demanda, monta o time e consolida a entrega.',
    avatar: '👔',
    model: 'gemini-1.5-pro',
    provider: 'google',
    temperature: 0.1,
    status: 'active',
    tags: ['management'],
    systemPrompt: 'Você é um GP. Analise o pedido. Se precisar de copy, chame o Redator. Se precisar de tela, chame o Dev.',
    ragEnabled: true,
    inputSchema: [],
    outputSchema: [],
    allowedActions: [],
    allowedAgents: ['a1', 'a2'],
    orchestrationConfig: {
        maxSteps: 10,
        planningStrategy: 'dynamic',
        evaluationMode: 'basic',
        consolidationStrategy: 'summarize'
    },
    lastUpdated: 'Agora mesmo',
  },
  {
    id: 'a1',
    type: 'specialist',
    name: 'Redator Alpha',
    role: 'Copywriter',
    description: 'Gera textos persuasivos.',
    avatar: '📝',
    model: 'gpt-4o',
    provider: 'openai',
    temperature: 0.7,
    status: 'active',
    tags: ['marketing'],
    systemPrompt: 'Gere copy focado em conversão.',
    ragEnabled: true,
    knowledgeBaseId: 'kb1',
    inputSchema: [{ name: 'tema', type: 'string', description: 'Sobre o que escrever', required: true }],
    outputSchema: [{ name: 'texto', type: 'string', description: 'O texto gerado', required: true }],
    allowedActions: [],
    lastUpdated: '2 horas atrás',
  },
  {
    id: 'a2',
    type: 'specialist',
    name: 'Dev Frontend',
    role: 'Engenheiro',
    description: 'Cria componentes React.',
    avatar: '💻',
    model: 'claude-3-5-sonnet',
    provider: 'anthropic',
    temperature: 0.2,
    status: 'active',
    tags: ['dev'],
    systemPrompt: 'Crie componentes baseados no texto fornecido.',
    ragEnabled: false,
    inputSchema: [{ name: 'spec', type: 'string', description: 'Especificação', required: true }],
    outputSchema: [{ name: 'code', type: 'string', description: 'Código React', required: true }],
    allowedActions: [],
    lastUpdated: '1 dia atrás',
  },
];

export const MOCK_KBS: KnowledgeBase[] = [
  {
    id: 'kb1',
    name: 'Manual de Marca',
    description: 'Diretrizes de tom de voz.',
    docCount: 12,
    chunkCount: 1450,
    status: 'indexed',
    lastUpdated: '2 dias atrás',
  },
];

export const MOCK_RUNS: Run[] = [
  {
    id: 'r-dynamic-01',
    orchestratorId: 'a0',
    orchestratorName: 'Gerente de Produto',
    goal: 'Criar uma landing page para um Pet Shop chamado "Bolinha Feliz".',
    status: 'completed',
    startTime: 'Hoje, 10:45',
    duration: '1m 20s',
    cost: 0.15,
    finalResult: 'Landing page completa com Copy e Código gerados e validados.',
    logs: [
      { id: 'l1', agentName: 'Gerente de Produto', agentAvatar: '👔', timestamp: '10:45:00', level: 'info', message: 'Recebi o objetivo. Iniciando plano dinâmico.', phase: 'PLANNING' },
      { id: 'l2', agentName: 'Gerente de Produto', agentAvatar: '👔', timestamp: '10:45:02', level: 'info', message: 'Delegando tarefa de texto para Redator Alpha.', phase: 'DELEGATION' },
      { 
        id: 'l3', agentName: 'Redator Alpha', agentAvatar: '📝', timestamp: '10:45:10', level: 'success', message: 'Copy gerado.', phase: 'OUTPUT', 
        artifact: { type: 'text', label: 'Copy Promocional', content: '# Bolinha Feliz\nO melhor lugar para seu amigo!\n\nTemos banho, tosa e muito carinho.' } 
      },
      { id: 'l4', agentName: 'Gerente de Produto', agentAvatar: '👔', timestamp: '10:45:12', level: 'info', message: 'Copy validado. Delegando código para Dev Frontend.', phase: 'DELEGATION' },
      { 
        id: 'l5', agentName: 'Dev Frontend', agentAvatar: '💻', timestamp: '10:46:15', level: 'success', message: 'Componente criado.', phase: 'OUTPUT', 
        artifact: { type: 'code', label: 'HeroSection.tsx', content: 'export default function Hero() {\n  return <h1>Bolinha Feliz</h1>;\n}' } 
      },
      { id: 'l6', agentName: 'Gerente de Produto', agentAvatar: '👔', timestamp: '10:46:20', level: 'success', message: 'Orquestração finalizada com sucesso.', phase: 'OUTPUT' },
    ],
  },
  {
    id: 'r-dynamic-02',
    orchestratorId: 'a0',
    orchestratorName: 'Gerente de Produto',
    goal: 'Resumir relatório financeiro.',
    status: 'failed',
    startTime: 'Ontem, 16:20',
    duration: '10s',
    cost: 0.01,
    logs: [
      { id: 'l1', agentName: 'Gerente de Produto', agentAvatar: '👔', timestamp: '16:20:00', level: 'info', message: 'Iniciando análise.', phase: 'PLANNING' },
      { id: 'l2', agentName: 'Gerente de Produto', agentAvatar: '👔', timestamp: '16:20:10', level: 'error', message: 'Erro: Nenhum especialista financeiro encontrado na equipe.', phase: 'PROCESS' },
    ],
  },
];

export const MOCK_WORKFLOWS: Workflow[] = [
  {
    id: 'wf-landing-01',
    name: 'Pipeline de Landing Page',
    description: 'Sequência de geração de conteúdo e código para páginas de marketing.',
    lastRun: '1 hora atrás',
    steps: [
      {
        id: 's1',
        agentId: 'a1',
        description: 'Gerar o texto base',
        inputMapping: { 'tema': 'user_input' }
      },
      {
        id: 's2',
        agentId: 'a2',
        description: 'Gerar código React',
        inputMapping: { 'spec': 's1.output.texto' }
      }
    ]
  }
];