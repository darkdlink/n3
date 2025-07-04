import mongoose from 'mongoose';

const signatureSchema = new mongoose.Schema({
  // Documento assinado
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense',
    required: [true, 'Documento é obrigatório'],
    index: true
  },

  // Signatário
  signer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Signatário é obrigatório'],
    index: true
  },

  // Dados da assinatura digital
  digitalSignature: {
    type: String,
    required: [true, 'Assinatura digital é obrigatória']
  },

  // Hash do documento no momento da assinatura
  documentHash: {
    type: String,
    required: [true, 'Hash do documento é obrigatório']
  },

  // Algoritmo usado para gerar a assinatura
  algorithm: {
    type: String,
    required: [true, 'Algoritmo é obrigatório'],
    enum: {
      values: ['SHA256withRSA', 'SHA256withECDSA', 'SHA512withRSA'],
      message: 'Algoritmo deve ser SHA256withRSA, SHA256withECDSA ou SHA512withRSA'
    },
    default: 'SHA256withRSA'
  },

  // Chave pública usada para verificação
  publicKey: {
    type: String,
    required: [true, 'Chave pública é obrigatória']
  },

  // Certificado digital (se aplicável)
  certificate: {
    serialNumber: String,
    issuer: String,
    subject: String,
    validFrom: Date,
    validTo: Date,
    fingerprint: String
  },

  // Timestamp da assinatura
  signedAt: {
    type: Date,
    required: [true, 'Data da assinatura é obrigatória'],
    default: Date.now,
    index: true
  },

  // Timestamp servidor (RFC 3161)
  timestampToken: {
    type: String,
    default: null
  },

  // Status da assinatura
  status: {
    type: String,
    enum: {
      values: ['valid', 'invalid', 'revoked', 'expired', 'pending_verification'],
      message: 'Status deve ser valid, invalid, revoked, expired ou pending_verification'
    },
    default: 'pending_verification',
    index: true
  },

  // Metadados da assinatura
  metadata: {
    // IP do signatário
    ipAddress: {
      type: String,
      validate: {
        validator: function(ip) {
          return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) || /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(ip);
        },
        message: 'IP inválido'
      }
    },
    
    // User agent do navegador
    userAgent: {
      type: String,
      maxlength: [500, 'User agent não pode exceder 500 caracteres']
    },
    
    // Localização geográfica (se disponível)
    location: {
      country: String,
      region: String,
      city: String,
      latitude: Number,
      longitude: Number
    },
    
    // Informações do dispositivo
    device: {
      type: String,
      maxlength: [200, 'Informações do dispositivo não podem exceder 200 caracteres']
    }
  },

  // Verificações realizadas
  verifications: [{
    verifiedAt: {
      type: Date,
      default: Date.now
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    result: {
      type: String,
      enum: ['valid', 'invalid'],
      required: true
    },
    details: {
      signatureValid: Boolean,
      certificateValid: Boolean,
      timestampValid: Boolean,
      documentIntact: Boolean,
      errors: [String]
    },
    method: {
      type: String,
      enum: ['automatic', 'manual'],
      default: 'automatic'
    }
  }],

  // Chain of trust (cadeia de confiança)
  chainOfTrust: [{
    level: {
      type: Number,
      required: true
    },
    authority: {
      type: String,
      required: true
    },
    certificate: {
      type: String,
      required: true
    },
    validFrom: {
      type: Date,
      required: true
    },
    validTo: {
      type: Date,
      required: true
    }
  }],

  // Política de assinatura aplicada
  signaturePolicy: {
    name: {
      type: String,
      default: 'PKCS#7 Detached'
    },
    oid: {
      type: String,
      default: '1.2.840.113549.1.7.2'
    },
    requirements: {
      certificateRequired: {
        type: Boolean,
        default: false
      },
      timestampRequired: {
        type: Boolean,
        default: true
      },
      minimumKeyLength: {
        type: Number,
        default: 2048
      }
    }
  },

  // Dados para auditoria
  auditTrail: [{
    action: {
      type: String,
      enum: ['created', 'verified', 'invalidated', 'revoked'],
      required: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    reason: String,
    details: mongoose.Schema.Types.Mixed
  }],

  // Dados de revogação (se aplicável)
  revocation: {
    revokedAt: Date,
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: ['key_compromise', 'affiliation_changed', 'superseded', 'cessation_of_operation', 'privilege_withdrawn']
    },
    details: String
  },

  // Informações técnicas adicionais
  technical: {
    // Tamanho da assinatura em bytes
    signatureSize: {
      type: Number,
      required: true
    },
    
    // Encoding usado
    encoding: {
      type: String,
      enum: ['base64', 'hex', 'der'],
      default: 'base64'
    },
    
    // Versão do formato de assinatura
    formatVersion: {
      type: String,
      default: '1.0'
    },
    
    // Biblioteca/ferramenta usada
          signingTool: {
      name: String,
      version: String
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para performance
signatureSchema.index({ document: 1, signer: 1 }, { unique: true });
signatureSchema.index({ status: 1, signedAt: -1 });
signatureSchema.index({ signer: 1, signedAt: -1 });
signatureSchema.index({ 'certificate.validTo': 1 });
signatureSchema.index({ 'revocation.revokedAt': 1 });

// Virtual para verificar se a assinatura está válida
signatureSchema.virtual('isValid').get(function() {
  if (this.status === 'revoked' || this.status === 'expired') {
    return false;
  }
  
  // Verificar se o certificado não expirou
  if (this.certificate && this.certificate.validTo && this.certificate.validTo < new Date()) {
    return false;
  }
  
  return this.status === 'valid';
});

// Virtual para verificar se está próximo do vencimento
signatureSchema.virtual('isExpiringSoon').get(function() {
  if (!this.certificate || !this.certificate.validTo) {
    return false;
  }
  
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  return this.certificate.validTo <= thirtyDaysFromNow && this.certificate.validTo > new Date();
});

// Virtual para última verificação
signatureSchema.virtual('lastVerification').get(function() {
  if (!this.verifications || this.verifications.length === 0) {
    return null;
  }
  
  return this.verifications.sort((a, b) => b.verifiedAt - a.verifiedAt)[0];
});

// Middleware para atualizar auditTrail antes de salvar
signatureSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    const action = this.status === 'valid' ? 'verified' :
                  this.status === 'invalid' ? 'invalidated' :
                  this.status === 'revoked' ? 'revoked' : 'created';

    this.auditTrail.push({
      action,
      performedBy: this._performedBy,
      reason: this._actionReason,
      details: this._actionDetails
    });
  }
  next();
});

// Método para verificar a assinatura
signatureSchema.methods.verify = async function(verifiedBy, method = 'automatic') {
  const crypto = require('crypto');
  
  try {
    // Importar a chave pública
    const publicKey = crypto.createPublicKey({
      key: this.publicKey,
      format: 'pem',
      type: 'spki'
    });

    // Verificar a assinatura
    const verify = crypto.createVerify(this.algorithm.replace('with', ''));
    verify.update(this.documentHash);
    verify.end();

    const signatureBuffer = Buffer.from(this.digitalSignature, 'base64');
    const isSignatureValid = verify.verify(publicKey, signatureBuffer);

    // Verificar se o documento não foi alterado
    const Expense = require('./Expense').default;
    const document = await Expense.findById(this.document);
    const currentDocumentHash = this.calculateDocumentHash(document);
    const isDocumentIntact = currentDocumentHash === this.documentHash;

    // Verificar certificado (se presente)
    let isCertificateValid = true;
    if (this.certificate) {
      isCertificateValid = this.certificate.validTo > new Date();
    }

    // Verificar timestamp
    let isTimestampValid = true;
    if (this.timestampToken) {
      // Implementar verificação de timestamp RFC 3161
      isTimestampValid = await this.verifyTimestamp();
    }

    const isValid = isSignatureValid && isDocumentIntact && isCertificateValid && isTimestampValid;

    // Registrar verificação
    this.verifications.push({
      verifiedBy,
      result: isValid ? 'valid' : 'invalid',
      method,
      details: {
        signatureValid: isSignatureValid,
        certificateValid: isCertificateValid,
        timestampValid: isTimestampValid,
        documentIntact: isDocumentIntact,
        errors: []
      }
    });

    // Atualizar status se necessário
    if (this.status === 'pending_verification') {
      this.status = isValid ? 'valid' : 'invalid';
      this._performedBy = verifiedBy;
      this._actionReason = 'Verificação automática da assinatura';
    }

    await this.save();
    return isValid;

  } catch (error) {
    // Registrar erro na verificação
    this.verifications.push({
      verifiedBy,
      result: 'invalid',
      method,
      details: {
        signatureValid: false,
        certificateValid: false,
        timestampValid: false,
        documentIntact: false,
        errors: [error.message]
      }
    });

    this.status = 'invalid';
    this._performedBy = verifiedBy;
    this._actionReason = 'Erro na verificação da assinatura';
    this._actionDetails = { error: error.message };

    await this.save();
    return false;
  }
};

// Método para revogar assinatura
signatureSchema.methods.revoke = function(revokedBy, reason, details) {
  this.status = 'revoked';
  this.revocation = {
    revokedAt: new Date(),
    revokedBy,
    reason,
    details
  };
  this._performedBy = revokedBy;
  this._actionReason = reason;
  this._actionDetails = details;
  
  return this.save();
};

// Método para calcular hash do documento
signatureSchema.methods.calculateDocumentHash = function(document) {
  const crypto = require('crypto');
  
  // Criar uma representação canônica do documento para hash
  const documentData = {
    title: document.title,
    description: document.description,
    amount: document.amount,
    currency: document.currency,
    category: document.category,
    expenseDate: document.expenseDate,
    employee: document.employee,
    receipts: document.receipts.map(r => ({
      filename: r.filename,
      size: r.size,
      mimetype: r.mimetype
    }))
  };

  const documentString = JSON.stringify(documentData, Object.keys(documentData).sort());
  return crypto.createHash('sha256').update(documentString).digest('hex');
};

// Método para verificar timestamp RFC 3161
signatureSchema.methods.verifyTimestamp = async function() {
  // Implementação simplificada - em produção, usar biblioteca especializada
  if (!this.timestampToken) {
    return true; // Se não há timestamp, considera válido
  }
  
  try {
    // Aqui implementaria a verificação real do timestamp RFC 3161
    // Por simplicidade, apenas verifica se o token existe e não está vazio
    return this.timestampToken.length > 0;
  } catch (error) {
    return false;
  }
};

// Método estático para buscar assinaturas por documento
signatureSchema.statics.findByDocument = function(documentId) {
  return this.find({ document: documentId })
    .populate('signer', 'name email employeeId')
    .sort({ signedAt: -1 });
};

// Método estático para buscar assinaturas por signatário
signatureSchema.statics.findBySigner = function(signerId, status) {
  const query = { signer: signerId };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('document', 'title amount status')
    .sort({ signedAt: -1 });
};

// Método estático para buscar assinaturas expiradas
signatureSchema.statics.findExpired = function() {
  const now = new Date();
  return this.find({
    $or: [
      { 'certificate.validTo': { $lt: now } },
      { status: 'expired' }
    ]
  }).populate('signer document');
};

// Método estático para buscar assinaturas próximas do vencimento
signatureSchema.statics.findExpiringSoon = function(days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    'certificate.validTo': { 
      $gte: new Date(),
      $lte: futureDate 
    },
    status: 'valid'
  }).populate('signer document');
};

// Método para estatísticas de assinaturas
signatureSchema.statics.getStatistics = async function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgSignatureSize: { $avg: '$technical.signatureSize' }
      }
    }
  ];

  const stats = await this.aggregate(pipeline);
  
  const result = {
    total: 0,
    valid: 0,
    invalid: 0,
    revoked: 0,
    expired: 0,
    pending: 0
  };

  stats.forEach(stat => {
    result.total += stat.count;
    result[stat._id] = stat.count;
  });

  return result;
};

export default mongoose.models.Signature || mongoose.model('Signature', signatureSchema);