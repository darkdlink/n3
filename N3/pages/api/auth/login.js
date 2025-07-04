import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { connectDB } from '../../../lib/db/mongodb';
import User from '../../../lib/db/models/User';

// Rate limiting - 5 tentativas por 15 minutos
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware para aplicar rate limiting
function applyRateLimit(req, res) {
  return new Promise((resolve, reject) => {
    loginLimiter(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Método não permitido' 
    });
  }

  try {
    // Aplicar rate limiting
    await applyRateLimit(req, res);

    // Conectar ao banco de dados
    await connectDB();

    const { email, password, rememberMe } = req.body;

    // Validação básica
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'Email e senha são obrigatórios'
      });
    }

    // Validação de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_EMAIL',
        message: 'Formato de email inválido'
      });
    }

    // Buscar usuário (incluindo senha para comparação)
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      isActive: true 
    }).select('+password +loginAttempts +lockUntil');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Email ou senha incorretos'
      });
    }

    // Verificar se a conta está bloqueada
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        error: 'ACCOUNT_LOCKED',
        message: 'Conta temporariamente bloqueada devido a muitas tentativas de login'
      });
    }

    // Verificar se a conta está ativa
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'ACCOUNT_INACTIVE',
        message: 'Conta inativa. Entre em contato com o administrador'
      });
    }

    // Comparar senha
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Incrementar tentativas de login
      await user.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Email ou senha incorretos'
      });
    }

    // Login bem-sucedido - resetar tentativas
    await user.resetLoginAttempts();

    // Gerar JWT token
    const tokenPayload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId
    };

    const tokenOptions = {
      expiresIn: rememberMe ? '30d' : '24h',
      issuer: 'expense-management-system',
      audience: 'expense-management-users'
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, tokenOptions);

    // Gerar refresh token para sessões prolongadas
    const refreshTokenPayload = {
      userId: user._id,
      type: 'refresh'
    };

    const refreshToken = jwt.sign(
      refreshTokenPayload, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    // Configurar cookies seguros
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 30 dias ou 24 horas
    };

    res.setHeader('Set-Cookie', [
      `token=${token}; Path=/; ${Object.entries(cookieOptions)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ')}`,
      `refreshToken=${refreshToken}; Path=/; ${Object.entries({
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias para refresh token
      })
        .map(([key, value]) => `${key}=${value}`)
        .join('; ')}`
    ]);

    // Registrar log de auditoria
    console.log(`Login bem-sucedido: ${user.email} - IP: ${req.headers['x-forwarded-for'] || req.connection.remoteAddress}`);

    // Retornar dados do usuário (sem senha)
    const userData = user.toPublicJSON();

    res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso',
      user: userData,
      token,
      expiresIn: tokenOptions.expiresIn
    });

  } catch (error) {
    console.error('Erro no login:', error);
    
    // Rate limit error
    if (error.message && error.message.includes('Rate limit')) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Erro interno do servidor'
    });
  }
}

// Configuração para o Next.js
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}