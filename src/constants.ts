
// constants.ts
import { Language, BriefingSlide, EvidenceCard, ConsistencyCheck, InsightItem, PodcastData } from "./types";

export const GEMINI_MODEL = "gemini-3-pro-preview";

export const SAMPLE_PDF_URL =
  "https://raw.githubusercontent.com/mozilla/pdf.js/master/web/compressed.tracemonkey-pldi-09.pdf";

export const TRANSLATIONS = {
  en: {
    uploadPdf: "Upload PDF",
    uploadNew: "Upload New",
    trySample: "Try Sample",
    processing: "Processing",
    briefing: "Briefing",
    evidence: "Evidence Cards",
    ask: "Ask",
    consistency: "Consistency",
    insights: "Insights",
    podcast: "Podcast",
    slide: "Slide",
    source: "Source",
    reference: "Reference",
    excerpt: "Excerpt extracted from document",
    noCitation: "No citation selected",
    noCitationDesc: "Click a citation chip or evidence card to view the source context here.",
    welcomeTitle: "Welcome to BrainLens",
    welcomeDesc: "Upload a research PDF to generate a briefing, check claims, and analyze evidence.",
    sourceViewer: "Source Viewer",
    confHigh: "High Conf.",
    confMed: "Medium Conf.",
    confLow: "Low Conf.",
    whyItMatters: "Why it matters",
    nextStep: "Next Step",
    speculative: "Speculative Analysis",
    evidenceLabel: "Evidence:",
    check: "Check:",
    verifyQuote: "Verify quote on page",
    askPlaceholder: "Ask a question about the paper...",
    generateAudio: "Generate Audio",
    generating: "Generating...",
    audioReady: "AI Audio Ready",
    scriptOnly: "Script Only",
    segments: "Segments",
    currentTopic: "Current Topic Evidence",
    exploreSource: "Explore source material",
    jumpSource: "Jump to Source",
    minListen: "min listen",
    analysis: "Analysis",
    inspectEvidence: "Inspect Evidence",
    viewFullSize: "View Full Size",
    noPreview: "No Preview Available",
    confidence: "Confidence",
    noPodcast: "No podcast generated for",
    ahaButton: "A-ha!",
    ahaTitle: "A-HA Mode: Hypothesis Pack",
    generateAha: "Generate A-HA",
    rq: "Research Question",
    hypotheses: "Hypotheses",
    pipeline: {
      ingest: "Ingest",
      figures: "Figures",
      claims: "Claims",
      check: "Check",
      insights: "Insights",
      podcast: "Podcast",
      compose: "Compose",
    }
  },
  pt: {
    uploadPdf: "Enviar PDF",
    uploadNew: "Enviar Novo",
    trySample: "Testar Exemplo",
    processing: "Processando",
    briefing: "Resumo",
    evidence: "Evidências",
    ask: "Perguntar",
    consistency: "Consistência",
    insights: "Insights",
    podcast: "Podcast",
    slide: "Slide",
    source: "Fonte",
    reference: "Referência",
    excerpt: "Trecho extraído do documento",
    noCitation: "Nenhuma citação selecionada",
    noCitationDesc: "Clique em uma citação ou card de evidência para ver o contexto aqui.",
    welcomeTitle: "Bem-vindo ao BrainLens",
    welcomeDesc: "Envie um PDF de pesquisa para gerar um resumo, verificar alegações e analisar evidências.",
    sourceViewer: "Visualizador",
    confHigh: "Conf. Alta",
    confMed: "Conf. Média",
    confLow: "Conf. Baixa",
    whyItMatters: "Por que importa",
    nextStep: "Próximo Passo",
    speculative: "Análise Especulativa",
    evidenceLabel: "Evidência:",
    check: "Verificar:",
    verifyQuote: "Verificar citação pág.",
    askPlaceholder: "Faça uma pergunta sobre o artigo...",
    generateAudio: "Gerar Áudio",
    generating: "Gerando...",
    audioReady: "Áudio IA Pronto",
    scriptOnly: "Apenas Roteiro",
    segments: "Segmentos",
    currentTopic: "Evidência do Tópico",
    exploreSource: "Explorar material fonte",
    jumpSource: "Ir para Fonte",
    minListen: "min de áudio",
    analysis: "Análise",
    inspectEvidence: "Inspecionar",
    viewFullSize: "Expandir",
    noPreview: "Sem Prévia",
    confidence: "Confiança",
    noPodcast: "Nenhum podcast gerado para",
    ahaButton: "A-ha!",
    ahaTitle: "Modo A-HA: Pacote de Hipóteses",
    generateAha: "Gerar A-HA",
    rq: "Questão de Pesquisa",
    hypotheses: "Hipóteses",
    pipeline: {
      ingest: "Ingestão",
      figures: "Figuras",
      claims: "Alegações",
      check: "Verificação",
      insights: "Insights",
      podcast: "Podcast",
      compose: "Composição",
    }
  }
};

import { AHA_MODE_PROMPT } from "./prompts/aha";
import { INGEST_PROMPT, COMPOSER_PROMPT } from "./prompts/briefing";
import { EVIDENCE_CHECKER_PROMPT } from "./prompts/consistency";
import { FIGURE_TABLE_PROMPT, CLAIM_PROMPT } from "./prompts/evidence";
import { INSIGHTS_PROMPT } from "./prompts/insights";
import { PODCAST_PROMPT } from "./prompts/podcast";
import { ASK_SYSTEM_PROMPT, CITATION_STYLE_GUIDE } from "./prompts/liveExplanation";

export {
  AHA_MODE_PROMPT,
  INGEST_PROMPT,
  COMPOSER_PROMPT,
  EVIDENCE_CHECKER_PROMPT,
  FIGURE_TABLE_PROMPT,
  CLAIM_PROMPT,
  INSIGHTS_PROMPT,
  PODCAST_PROMPT,
  ASK_SYSTEM_PROMPT,
  CITATION_STYLE_GUIDE
};


export const SUGGESTED_PROMPTS = {
  en: [
    "What is the main contribution of this paper?",
    "Does the method outperform the baselines?",
    "What are the limitations mentioned?",
    "Explain Figure 3 in simple terms.",
  ],
  pt: [
    "Qual é a principal contribuição deste artigo?",
    "O método supera as referências (baselines)?",
    "Quais são as limitações mencionadas?",
    "Explique a Figura 3 em termos simples.",
  ],
};

// --- MOCK DATA FOR "TRY SAMPLE" ---

const PODCAST_DATA_EN: PodcastData = {
  title: "Deep Dive: Momentum in Deep Learning",
  estimatedDurationSeconds: 150,
  segments: [
    {
      id: "intro",
      title: "Introduction: The Importance of Initialization",
      startSeconds: 0,
      endSeconds: 45,
      summary: "Discussing how simple initialization strategies can rival complex optimization methods.",
      citations: [{ page: 1, text: "SGD with momentum... matches Hessian-Free" }]
    },
    {
      id: "main",
      title: "NAG vs Classical Momentum",
      startSeconds: 45,
      endSeconds: 105,
      summary: "Why Nesterov's Accelerated Gradient handles high curvature better than classical approaches.",
      citations: [{ page: 4, text: "NAG handles high-curvature directions better" }]
    },
    {
      id: "outro",
      title: "Results & Impact on RNNs",
      startSeconds: 105,
      endSeconds: 150,
      summary: "Proving that first-order methods can successfully train deep RNNs.",
      citations: [{ page: 7, text: "Training RNNs on long-range dependencies" }]
    }
  ]
};

const PODCAST_DATA_PT: PodcastData = {
  title: "Mergulho Profundo: Momentum em Aprendizado Profundo",
  estimatedDurationSeconds: 150,
  segments: [
    {
      id: "intro",
      title: "Introdução: A Importância da Inicialização",
      startSeconds: 0,
      endSeconds: 45,
      summary: "Discutindo como estratégias simples de inicialização podem rivalizar com métodos complexos de otimização.",
      citations: [{ page: 1, text: "SGD com momentum... iguala Hessian-Free" }]
    },
    {
      id: "main",
      title: "NAG vs Momentum Clássico",
      startSeconds: 45,
      endSeconds: 105,
      summary: "Por que o Gradiente Acelerado de Nesterov lida melhor com alta curvatura do que abordagens clássicas.",
      citations: [{ page: 4, text: "NAG lida melhor com direções de alta curvatura" }]
    },
    {
      id: "outro",
      title: "Resultados e Impacto em RNNs",
      startSeconds: 105,
      endSeconds: 150,
      summary: "Provando que métodos de primeira ordem podem treinar RNNs profundas com sucesso.",
      citations: [{ page: 7, text: "Treinamento de RNNs em dependências de longo prazo" }]
    }
  ]
};

// ENGLISH MOCK
const MOCK_DATA_EN = {
  briefing: [
    {
      title: "Momentum Matches Second-Order Methods",
      points: [
        {
          text: "Stochastic Gradient Descent (SGD) with well-designed initialization and momentum schedules matches performance previously unique to Hessian-Free optimization.",
          citation: { page: 1, text: "SGD with momentum... matches Hessian-Free optimization." },
        },
        {
          text: "Deep learning optimization is dominated by a 'transient phase' where momentum is critical for navigating the error landscape, rather than just local convergence.",
          citation: { page: 2, text: "Transient phase... momentum is critical." },
        },
        {
          text: "Empirical results on deep autoencoders show Nesterov's Accelerated Gradient (NAG) achieving lower error rates than existing Hessian-Free benchmarks.",
          citation: { page: 5, sourceId: "Table 1", text: "NAG achieving lower error rates" },
        },
      ],
    },
    {
      title: "Superiority of Nesterov's Accelerated Gradient",
      points: [
        {
          text: "NAG handles high-curvature directions better than Classical Momentum (CM), allowing the use of much larger momentum coefficients without divergence.",
          citation: { page: 4, text: "NAG handles high-curvature directions better" },
        },
        {
          text: "Performance improves with higher momentum values (e.g., 0.999), where NAG significantly outperforms CM due to its lookahead stability mechanism.",
          citation: { page: 5, text: "Performance improves with higher momentum" },
        },
        {
          text: "Reducing the momentum coefficient (e.g., to 0.9) during the final training steps acts as a 'brake' to facilitate fine convergence into the minimum.",
          citation: { page: 5, text: "Acts as a brake to facilitate fine convergence" },
        },
      ],
    },
  ],
  evidenceCards: [
    {
      id: "Fig 1",
      type: "figure",
      caption: "Performance of NAG vs CM on Deep Autoencoders",
      description: "Comparison showing NAG converging faster and to a lower error rate than Classical Momentum.",
      page: 6,
      relevance: "Demonstrates the practical superiority of Nesterov's method."
    },
    {
      id: "Table 1",
      type: "table",
      caption: "Test Error Rates on MNIST",
      description: "Tabular results showing SGD+Momentum matching or beating Hessian-Free optimization scores.",
      page: 5,
      relevance: "Validates the core claim that first-order methods are sufficient."
    }
  ],
  consistencyReport: [
    {
      claim: "Stochastic gradient descent with momentum, when combined with a well-designed random initialization and a slowly increasing momentum schedule, can train deep and recurrent neural networks to performance levels previously achievable only with Hessian-Free optimization.",
      status: "Supported",
      explanation: "The abstract explicitly states that using well-designed initialization and a slowly increasing momentum schedule allows SGD with momentum to train DNNs and RNNs to performance levels previously only achievable with Hessian-Free optimization.",
      confidence: "High",
      citation: { page: 1, text: "SGD with momentum... matches Hessian-Free" }
    },
    {
      claim: "Nesterov's Accelerated Gradient (NAG) generally outperforms classical momentum (CM) in deep learning tasks because it remains stable with larger momentum coefficients.",
      status: "Supported",
      explanation: "The paper explains that NAG effectively uses smaller momentum for high-curvature eigen-directions, preventing oscillations or divergence. This stability allows the use of larger momentum coefficients compared to CM.",
      confidence: "High",
      citation: { page: 4, text: "NAG remains stable with larger momentum" }
    },
    {
      claim: "Contrary to prior beliefs regarding the vanishing gradient problem, first-order momentum methods can successfully train Recurrent Neural Networks (RNNs) on tasks with distinct long-range temporal dependencies.",
      status: "Supported",
      explanation: "The paper discusses training RNNs on the path-problem and addition-problem, showing that with initialization (spectral radius 1.1) and momentum, SGD can solve problems requiring long-range dependencies.",
      confidence: "High",
      citation: { page: 7, text: "Successful training of RNNs" }
    }
  ],
  insights: [
    {
      id: "INS-1",
      title: "The Transient Phase Dominance",
      kind: "Hidden Assumption",
      insight: "Most optimization difficulty in Deep Learning lies in the initial transient phase of navigating the global landscape, not local convergence.",
      whyItMatters: "Shifts research focus from local optimizers (Newton methods) to global navigation aids (Momentum).",
      actionableNextStep: "Analyze the trajectory of weights during the first 50 epochs relative to curvature.",
      confidence: "High",
      grounding: { status: "Grounded", citations: [{ page: 2, text: "Transient phase dominance" }] }
    }
  ]
};

// PORTUGUESE MOCK
const MOCK_DATA_PT = {
  briefing: [
    {
      title: "Momentum Iguala Métodos de Segunda Ordem",
      points: [
        {
          text: "O Descendente de Gradiente Estocástico (SGD) com inicialização bem projetada e agendamento de momentum iguala o desempenho anteriormente exclusivo da otimização Hessian-Free.",
          citation: { page: 1, text: "SGD with momentum... matches Hessian-Free optimization." },
        },
        {
          text: "A otimização de aprendizado profundo é dominada por uma 'fase transiente' onde o momentum é crítico para navegar no cenário de erro, em vez de apenas convergência local.",
          citation: { page: 2, text: "Transient phase... momentum is critical." },
        },
        {
          text: "Resultados empíricos em autoencoders profundos mostram o Gradiente Acelerado de Nesterov (NAG) alcançando taxas de erro menores que os benchmarks Hessian-Free existentes.",
          citation: { page: 5, sourceId: "Table 1", text: "NAG achieving lower error rates" },
        },
      ],
    },
    {
      title: "Superioridade do Gradiente Acelerado de Nesterov",
      points: [
        {
          text: "O NAG lida com direções de alta curvatura melhor que o Momentum Clássico (CM), permitindo o uso de coeficientes de momentum muito maiores sem divergência.",
          citation: { page: 4, text: "NAG handles high-curvature directions better" },
        },
        {
          text: "O desempenho melhora com valores de momentum mais altos (ex: 0,999), onde o NAG supera significativamente o CM devido ao seu mecanismo de estabilidade de antecipação (lookahead).",
          citation: { page: 5, text: "Performance improves with higher momentum" },
        },
        {
          text: "Reduzir o coeficiente de momentum (ex: para 0,9) durante as etapas finais de treinamento atua como um 'freio' para facilitar a convergência fina para o mínimo.",
          citation: { page: 5, text: "Acts as a brake to facilitate fine convergence" },
        },
      ],
    },
  ],
  evidenceCards: [
    {
      id: "Fig 1",
      type: "figure",
      caption: "Desempenho do NAG vs CM em Autoencoders Profundos",
      description: "Comparação mostrando NAG convergindo mais rápido e para uma taxa de erro menor que o Momentum Clássico.",
      page: 6,
      relevance: "Demonstra a superioridade prática do método de Nesterov."
    },
    {
      id: "Table 1",
      type: "table",
      caption: "Taxas de Erro de Teste no MNIST",
      description: "Resultados tabulares mostrando SGD+Momentum igualando ou superando pontuações de otimização Hessian-Free.",
      page: 5,
      relevance: "Valida a alegação central de que métodos de primeira ordem são suficientes."
    }
  ],
  consistencyReport: [
    {
      claim: "O Descendente de Gradiente Estocástico com momentum, quando combinado com uma inicialização aleatória bem projetada e um agendamento de momentum crescente, pode treinar redes neurais profundas e recorrentes para níveis de desempenho anteriormente alcançáveis apenas com otimização Hessian-Free.",
      status: "Supported",
      explanation: "O resumo afirma explicitamente que o uso de inicialização bem projetada e um agendamento de momentum crescente permite que o SGD com momentum treine DNNs e RNNs para níveis de desempenho anteriormente alcançáveis apenas com otimização Hessian-Free.",
      confidence: "High",
      citation: { page: 1, text: "SGD with momentum... matches Hessian-Free" }
    },
    {
      claim: "O Gradiente Acelerado de Nesterov (NAG) geralmente supera o momentum clássico (CM) em tarefas de aprendizado profundo porque permanece estável com coeficientes de momentum maiores.",
      status: "Supported",
      explanation: "O artigo explica que o NAG usa efetivamente momentum menor para direções próprias de alta curvatura, prevenindo oscilações ou divergência. Essa estabilidade permite o uso de coeficientes de momentum maiores em comparação ao CM.",
      confidence: "High",
      citation: { page: 4, text: "NAG remains stable with larger momentum" }
    },
    {
      claim: "Ao contrário de crenças anteriores sobre o problema do gradiente evanescente, métodos de momentum de primeira ordem podem treinar com sucesso Redes Neurais Recorrentes (RNNs) em tarefas com dependências temporais de longo alcance distintas.",
      status: "Supported",
      explanation: "O artigo discute o treinamento de RNNs no 'path-problem' e 'addition-problem', mostrando que com inicialização (raio espectral 1.1) e momentum, o SGD pode resolver problemas que exigem dependências de longo alcance.",
      confidence: "High",
      citation: { page: 7, text: "Successful training of RNNs" }
    }
  ],
  insights: [
    {
      id: "INS-1",
      title: "A Dominância da Fase Transiente",
      kind: "Hidden Assumption",
      insight: "A maior dificuldade de otimização em Aprendizado Profundo reside na fase transiente inicial de navegação no cenário global, não na convergência local.",
      whyItMatters: "Muda o foco da pesquisa de otimizadores locais (métodos de Newton) para auxílios de navegação global (Momentum).",
      actionableNextStep: "Analisar a trajetória dos pesos durante as primeiras 50 épocas em relação à curvatura.",
      confidence: "High",
      grounding: { status: "Grounded", citations: [{ page: 2, text: "Transient phase dominance" }] }
    }
  ]
};

export const getMockData = (lang: Language) => {
  const data = lang === 'pt' ? MOCK_DATA_PT : MOCK_DATA_EN;
  return {
    ...data,
    podcast: {
      en: PODCAST_DATA_EN,
      pt: PODCAST_DATA_PT
    }
  };
};

// Kept for backward compat if needed, but getMockData is preferred
export const MOCK_DATA = getMockData('en');
