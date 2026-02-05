import { Agent, Run, KnowledgeBase, Workflow, AgentCapabilities } from './types';

// === Default Capabilities ===
const defaultCapabilities: AgentCapabilities = {
  textGeneration: true,
  imageGeneration: false,
  imageAnalysis: false,
  codeExecution: false,
  webSearch: false,
  fileProcessing: false,
};

// === Mock Agents ===
export const MOCK_AGENTS: Agent[] = [
  {
    id: 'orch-001',
    type: 'orchestrator',
    name: 'Gerente de Produto',
    role: 'Orquestrador',
    description: 'Recebe a demanda do usuário, cria plano de execução, delega para especialistas e consolida a entrega.',
    avatar: '',
    model: 'openai/gpt-4o',
    provider: 'openai',
    temperature: 0.2,
    maxTokens: 4096,
    capabilities: { ...defaultCapabilities },
    systemPrompt: `Você é um gerente de produto experiente. Sua função é:
1. Analisar o objetivo do usuário
2. Identificar quais especialistas são necessários
3. Criar um plano de execução claro
4. Mapear corretamente inputs e outputs entre etapas
5. Avaliar os resultados e consolidar a entrega

Sempre pense passo a passo e seja explícito no mapeamento de dados.`,
    ragEnabled: false,
    inputSchema: [],
    outputSchema: [],
    allowedActions: [],
    allowedAgents: ['spec-copy', 'spec-dev', 'spec-image'],
    orchestrationConfig: {
      maxSteps: 10,
      planningStrategy: 'dynamic',
      evaluationMode: 'basic',
      consolidationStrategy: 'summarize',
      executionMode: 'sequencial',
      allowReplanning: true,
      maxRetries: 2,
    },
    status: 'active',
    tags: ['management', 'planning'],
    lastUpdated: 'Agora',
  },
  {
    id: 'spec-copy',
    type: 'specialist',
    name: 'Redator',
    role: 'Copywriter',
    description: 'Especialista em criação de textos persuasivos e conteúdo.',
    avatar: '',
    model: 'openai/gpt-4o',
    provider: 'openai',
    temperature: 0.7,
    maxTokens: 2048,
    capabilities: { ...defaultCapabilities },
    systemPrompt: `Você é um copywriter expert. Crie textos persuasivos, claros e que convertem.`,
    ragEnabled: true,
    knowledgeBaseId: 'kb-brand',
    inputSchema: [
      { name: 'tema', type: 'string', description: 'O tema ou assunto do texto', required: true },
      { name: 'tom', type: 'string', description: 'Tom de voz', required: false, default: 'profissional' },
    ],
    outputSchema: [
      { name: 'titulo', type: 'string', description: 'Título principal', required: true },
      { name: 'corpo', type: 'string', description: 'Corpo do texto', required: true },
      { name: 'cta', type: 'string', description: 'Call to action', required: false },
    ],
    allowedActions: [],
    status: 'active',
    tags: ['marketing', 'copy'],
    lastUpdated: '2 horas atrás',
  },
  {
    id: 'spec-dev',
    type: 'specialist',
    name: 'Dev Frontend',
    role: 'Engenheiro',
    description: 'Cria componentes React e código frontend.',
    avatar: '',
    model: 'anthropic/claude-3.5-sonnet',
    provider: 'anthropic',
    temperature: 0.1,
    maxTokens: 4096,
    capabilities: { ...defaultCapabilities, codeExecution: true },
    systemPrompt: `Você é um engenheiro frontend sênior. Escreva código limpo em React/TypeScript com Tailwind.`,
    ragEnabled: false,
    inputSchema: [
      { name: 'especificacao', type: 'string', description: 'Descrição do componente', required: true },
      { name: 'conteudo', type: 'string', description: 'Conteúdo a usar', required: false },
    ],
    outputSchema: [
      { name: 'codigo', type: 'string', description: 'Código do componente', required: true },
      { name: 'arquivo', type: 'string', description: 'Nome do arquivo', required: true },
    ],
    allowedActions: [],
    status: 'active',
    tags: ['dev', 'react'],
    lastUpdated: '1 dia atrás',
  },
  {
    id: 'spec-image',
    type: 'specialist',
    name: 'Designer',
    role: 'Gerador de Imagens',
    description: 'Cria imagens usando IA generativa.',
    avatar: '',
    model: 'openai/dall-e-3',
    provider: 'openai',
    temperature: 0.8,
    maxTokens: 1024,
    capabilities: { ...defaultCapabilities, textGeneration: false, imageGeneration: true },
    systemPrompt: `Transforme descrições em prompts detalhados para geração de imagens.`,
    ragEnabled: false,
    inputSchema: [
      { name: 'descricao', type: 'string', description: 'Descrição da imagem', required: true },
      { name: 'estilo', type: 'string', description: 'Estilo visual', required: false },
    ],
    outputSchema: [
      { name: 'imageUrl', type: 'image', description: 'URL da imagem gerada', required: true },
      { name: 'promptUsado', type: 'string', description: 'Prompt utilizado', required: true },
    ],
    allowedActions: [
      { id: 'act-gen-image', name: 'generate_image', description: 'Gera imagem', enabled: true, type: 'generate_image' },
    ],
    status: 'active',
    tags: ['design', 'image'],
    lastUpdated: '3 horas atrás',
  },
];

// === Mock Knowledge Bases ===
export const MOCK_KBS: KnowledgeBase[] = [
  {
    id: 'kb-brand',
    name: 'Manual de Marca',
    description: 'Diretrizes de tom de voz e comunicação.',
    docCount: 12,
    chunkCount: 1450,
    status: 'indexed',
    lastUpdated: '2 dias atrás',
    embeddingModel: 'text-embedding-3-small',
  },
];

// === Mock Runs ===
export const MOCK_RUNS: Run[] = [
  {
    id: 'run-001',
    orchestratorId: 'orch-001',
    orchestratorName: 'Gerente de Produto',
    goal: 'Criar uma landing page para um Pet Shop chamado "Bolinha Feliz".',
    context: { segmento: 'pet' },
    status: 'completed',
    steps: [
      {
        id: 'step-1',
        agentId: 'spec-copy',
        agentName: 'Redator',
        status: 'completed',
        input: { tema: 'Pet Shop Bolinha Feliz', tom: 'amigável' },
        output: { titulo: 'Bolinha Feliz', corpo: 'O paraíso do seu pet!', cta: 'Agende uma visita' },
        startedAt: '2024-01-15T10:45:10Z',
        completedAt: '2024-01-15T10:45:25Z',
        duration: 15000,
        tokensUsed: 450,
        cost: 0.02,
        description: 'Gerar copy',
        dependsOn: [],
      },
      {
        id: 'step-2',
        agentId: 'spec-dev',
        agentName: 'Dev Frontend',
        status: 'completed',
        input: { especificacao: 'Hero section para pet shop', conteudo: 'Bolinha Feliz - O paraíso do seu pet!' },
        output: { codigo: 'export default function Hero() { return <h1>Bolinha Feliz</h1>; }', arquivo: 'Hero.tsx' },
        startedAt: '2024-01-15T10:45:30Z',
        completedAt: '2024-01-15T10:46:15Z',
        duration: 45000,
        tokensUsed: 680,
        cost: 0.05,
        description: 'Criar componente',
        dependsOn: ['step-1'],
      },
    ],
    logs: [
      { id: 'l1', agentName: 'Gerente de Produto', timestamp: '10:45:00', level: 'info', message: 'Analisando objetivo', phase: 'PLANNING' },
      { id: 'l2', agentName: 'Gerente de Produto', timestamp: '10:45:05', level: 'info', message: 'Plano: 1) Copy 2) Código', phase: 'PLANNING' },
      { id: 'l3', stepId: 'step-1', agentName: 'Gerente de Produto', timestamp: '10:45:08', level: 'info', message: 'Delegando para Redator', phase: 'DELEGATION' },
      { id: 'l4', stepId: 'step-1', agentName: 'Redator', timestamp: '10:45:10', level: 'info', message: 'Recebendo input', phase: 'INPUT' },
      { id: 'l5', stepId: 'step-1', agentName: 'Redator', timestamp: '10:45:25', level: 'success', message: 'Copy gerado', phase: 'OUTPUT', artifact: { type: 'text', label: 'Copy', content: 'Bolinha Feliz - O paraíso do seu pet!' } },
      { id: 'l6', stepId: 'step-2', agentName: 'Gerente de Produto', timestamp: '10:45:28', level: 'info', message: 'Delegando para Dev', phase: 'DELEGATION' },
      { id: 'l7', stepId: 'step-2', agentName: 'Dev Frontend', timestamp: '10:45:30', level: 'info', message: 'Recebendo input', phase: 'INPUT' },
      { id: 'l8', stepId: 'step-2', agentName: 'Dev Frontend', timestamp: '10:46:15', level: 'success', message: 'Componente criado', phase: 'OUTPUT', artifact: { type: 'code', label: 'Hero.tsx', content: 'export default function Hero()...' } },
      { id: 'l9', agentName: 'Gerente de Produto', timestamp: '10:46:20', level: 'info', message: 'Avaliando resultados', phase: 'EVALUATION' },
      { id: 'l10', agentName: 'Gerente de Produto', timestamp: '10:46:25', level: 'success', message: 'Execução finalizada', phase: 'OUTPUT' },
    ],
    consolidatedOutput: 'Landing page criada: Copy e componente Hero.tsx gerados.',
    startTime: 'Hoje, 10:45',
    endTime: '2024-01-15T10:46:25Z',
    duration: '1m 25s',
    totalTokens: 1130,
    cost: 0.07,
  },
  {
    id: 'run-002',
    orchestratorId: 'orch-001',
    orchestratorName: 'Gerente de Produto',
    goal: 'Resumir relatório financeiro Q4.',
    status: 'failed',
    steps: [],
    logs: [
      { id: 'l1', agentName: 'Gerente de Produto', timestamp: '16:20:00', level: 'info', message: 'Analisando objetivo', phase: 'PLANNING' },
      { id: 'l2', agentName: 'Gerente de Produto', timestamp: '16:20:05', level: 'error', message: 'Nenhum especialista financeiro disponível', phase: 'PLANNING' },
    ],
    startTime: 'Ontem, 16:20',
    duration: '5s',
    cost: 0.01,
  },
];

// === Mock Workflows ===
export const MOCK_WORKFLOWS: Workflow[] = [
  {
    id: 'wf-landing',
    name: 'Pipeline de Landing Page',
    description: 'Copy → Código → Imagem',
    lastRun: '1 hora atrás',
    steps: [
      {
        id: 'wf-step-1',
        agentId: 'spec-copy',
        description: 'Gerar copy',
        inputMapping: { tema: 'user_input.descricao', tom: 'user_input.tom' },
      },
      {
        id: 'wf-step-2',
        agentId: 'spec-dev',
        description: 'Criar componente',
        inputMapping: { especificacao: 'user_input.descricao', conteudo: 'steps.wf-step-1.output.corpo' },
      },
    ],
    defaultContext: { tom: 'profissional' },
  },
];
