const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const { publicLimiter } = require('./middlewares/rateLimiter.middleware');

const app = express();

// Trust proxy - necessário para rate limiting correto atrás de reverse proxy (Render, etc)
app.set('trust proxy', 1);

// =============================================
// CONFIGURAÇÃO DE SEGURANÇA
// =============================================

// CORS restritivo - apenas origens permitidas
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://os-laboris.onrender.com']
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir requests sem origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS bloqueado para origem: ${origin}`);
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // Cache preflight por 24h
};

// Helmet com Content Security Policy
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // React precisa de unsafe-inline/eval em dev
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'https://os-laboris.onrender.com', 'http://localhost:*'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false, // Desabilitar para permitir imagens externas
  crossOriginResourcePolicy: { policy: 'cross-origin' }
};

// Middlewares globais
app.use(helmet(helmetOptions));
app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' })); // Aumentado para suportar fotos em Base64
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// Rotas da API (rate limiting aplicado nas rotas individuais)
app.use('/api/v1', routes);

// Health check (com rate limiting básico)
app.get('/health', publicLimiter, (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Servir frontend em produção
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
  app.use(express.static(frontendPath));

  // Qualquer rota que não seja API → retorna index.html (SPA)
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
}

// 404 para rotas de API não encontradas
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Rota ${req.method} ${req.path} não encontrada`,
    },
  });
});

// Handler de erros global
app.use(errorHandler);

module.exports = app;
