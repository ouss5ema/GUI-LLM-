const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const app = express();
app.use(cors());
app.use(express.json());

// Configuration avancée
const CONFIG = {
  MODEL: "phi:2.7b",
  PROMPT_MAX_LENGTH: 500,
  MAX_TOKENS: 1024,
  TIMEOUT: 120000, // 120 secondes
  TEMPERATURE: 0.6,
  NUM_CTX: 2048,
  REPEAT_PENALTY: 1.25,
  MAX_HISTORY: 7, // 3.5 tours de conversation
  LOW_MEMORY_MODE: true
};

// Rate limiter adaptatif
const rateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 120,
  blockDuration: 600
});

// Middleware de sécurité
app.use((req, res, next) => {
  rateLimiter.consume(req.ip)
    .then(() => next())
    .catch(() => res.status(429).json({
      error: 'Limite de débit dépassée',
      code: "RATE_LIMIT",
      recommendation: 'Attendez 2 minutes avant de réessayer'
    }));
});

// Formate l'historique conversationnel
const formatContext = (history, newPrompt) => {
  const context = history
    .slice(-CONFIG.MAX_HISTORY)
    .map(({ role, content }) => `${role}: ${content}`)
    .join('\n');
  
  return `${context}\nUser: ${newPrompt}\nAssistant:`;
};

// Endpoint principal
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, history = [] } = req.body;

    // Validation approfondie
    if (!prompt || typeof prompt !== 'string' || prompt.length > CONFIG.PROMPT_MAX_LENGTH) {
      return res.status(400).json({
        error: `Prompt invalide (max ${CONFIG.PROMPT_MAX_LENGTH} caractères)`,
        code: "INVALID_INPUT"
      });
    }

    // Construction dynamique du contexte
    const fullPrompt = formatContext(history, prompt);
    
    // Configuration adaptative
    const ollamaConfig = {
      model: CONFIG.MODEL,
      prompt: fullPrompt,
      stream: false,
      options: {
        num_ctx: CONFIG.LOW_MEMORY_MODE ? 1024 : CONFIG.NUM_CTX,
        temperature: CONFIG.TEMPERATURE,
        num_predict: CONFIG.MAX_TOKENS,
        repeat_penalty: CONFIG.REPEAT_PENALTY,
        main_gpu: CONFIG.LOW_MEMORY_MODE ? 0 : undefined
      }
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

    // Appel à Ollama avec gestion complète
    const response = await axios.post(
      'http://localhost:11434/api/generate',
      ollamaConfig,
      {
        signal: controller.signal,
        timeout: CONFIG.TIMEOUT,
        validateStatus: (status) => status < 500
      }
    );

    clearTimeout(timeout);

    // Traitement de la réponse
    let cleanResponse = response.data?.response?.trim() || '';
    
    // Fallback contextuel intelligent
    if (!cleanResponse) {
      const lastInstructions = history
        .filter(entry => entry.role === 'user')
        .slice(-3)
        .map(entry => entry.content);
      
      cleanResponse = lastInstructions.join(' | ') || 'Je besoin de plus de contexte pour répondre.';
    }

    // Mise à jour de l'historique
    const newHistory = [
      ...history.slice(-CONFIG.MAX_HISTORY),
      { role: 'user', content: prompt },
      { role: 'assistant', content: cleanResponse }
    ];

    res.json({
      response: cleanResponse,
      history: newHistory,
      metadata: {
        tokens: response.data?.eval_count || 0,
        model: CONFIG.MODEL,
        timestamp: Date.now()
      }
    });

  } catch (error) {
    handleError(error, res);
  }
});

// Gestion d'erreur centralisée
const handleError = (error, res) => {
  const errorDetails = {
    code: "SERVER_ERROR",
    message: "Erreur interne",
    recommendation: "Réessayez avec une formulation différente"
  };

  if (error.code === 'ECONNABORTED') {
    errorDetails.code = "TIMEOUT";
    errorDetails.message = "Temps de réponse dépassé";
    errorDetails.recommendation = "Simplifiez votre demande";
  }

  if (error.response?.data?.error?.includes('memory')) {
    errorDetails.code = "OUT_OF_MEMORY";
    errorDetails.message = "Limite mémoire dépassée";
    errorDetails.recommendation = "Redémarrez le service Ollama";
  }

  console.error(`[${new Date().toISOString()}] ${errorDetails.code}: ${error.message}`);
  
  res.status(500).json({
    ...errorDetails,
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
};

// Endpoint de diagnostic
app.get('/system-status', (req, res) => {
  res.json({
    status: 'operational',
    model: CONFIG.MODEL,
    config: {
      memory_mode: CONFIG.LOW_MEMORY_MODE ? 'optimisé' : 'standard',
      max_history: CONFIG.MAX_HISTORY,
      hardware_acceleration: !CONFIG.LOW_MEMORY_MODE
    },
    uptime: process.uptime()
  });
});

// Gestion des routes inconnues
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint non disponible",
    code: "NOT_FOUND"
  });
});

// Démarrage du serveur
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  // console.log(`
  // ██████╗ ██╗     ███████╗██╗     ██╗ █████╗ 
  // ██╔══██╗██║     ██╔════╝██║     ██║██╔══██╗
  // ██████╔╝██║     █████╗  ██║     ██║███████║
  // ██╔══██╗██║     ██╔══╝  ██║     ██║██╔══██║
  // ██████╔╝███████╗███████╗███████╗██║██║  ██║
  // ╚═════╝ ╚══════╝╚══════╝╚══════╝╚═╝╚═╝  ╚═╝
  // `);
  console.log(`Serveur actif sur le port ${PORT}`);
  console.log('Configuration:');
  console.table({
    Modèle: CONFIG.MODEL,
    'Mémoire max': `${CONFIG.NUM_CTX} tokens`,
    Historique: `${CONFIG.MAX_HISTORY} tours`,
    'Mode basse consommation': CONFIG.LOW_MEMORY_MODE ? 'Activé' : 'Désactivé'
  });
});