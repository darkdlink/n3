import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  // Informações básicas
  title: {
    type: String,
    required: [true, 'Título é obrigatório'],
    trim: true,
    maxlength: [200, 'Título não pode exceder 200 caracteres']
  },
  description: {
    type: String,
    required: [true, 'Descrição é obrigatória'],
    trim: true,
    maxlength: [1000, 'Descrição não pode exceder 1000 caracteres']
  },
  category: {
    type: String,
    required: [true, 'Categoria é obrigatória'],
    enum: {
      values: [
        'transport', 'accommodation', 'meals', 'office_supplies',
        'travel', 'training', 'marketing', 'equipment', 'maintenance',
        'communication', 'software', 'consulting', 'other'
      ],
      message: 'Categoria inválida'
    }
  },
  amount: {
    type: Number,
    required: [true, 'Valor é obrigatório'],
    min: [0.01, 'Valor deve ser maior que zero'],
    max: [999999.99, 'Valor não pode exceder R$ 999.999,99']
  },
  currency: {
    type: String,
    default: 'BRL',
    enum: ['BRL', 'USD', 'EUR'],
    uppercase: true
  },
  expenseDate: {
    type: Date,
    required: [true, 'Data da despesa é obrigatória'],
    validate: {
      validator: function(date) {
        // Não permitir datas futuras além de 1 dia
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return date <= tomorrow;
      },
      message: 'Data da despesa não pode ser no futuro'
    }
  },

  // Funcionário que criou a despesa
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Funcionário é obrigatório'],
    index: true
  },

  // Arquivos anexos (recibos)
  receipts: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    mimetype: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true,
      max: [5242880, 'Arquivo não pode exceder 5MB'] // 5MB
    },
    path: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Status da despesa
  status: {
    type: String,
    enum: {
      values: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'signed'],
      message: 'Status inválido'
    },
    default: 'draft',
    index: true
  },

  // Processo de aprovação
  submittedAt: {
    type: Date,
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  signedAt: {
    type: Date,
    default: null
  },

  // Responsáveis pela aprovação
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    default: null
  },
  signer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Comentários e observações
  reviewComments: {
    type: String,
    trim: true,
    maxlength: [500, 'Comentários não podem exceder 500 caracteres']
  },
  approvalComments: {
    type: String,
    trim: true,
    maxlength: [500, 'Comentários não podem exceder 500 caracteres']
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Motivo da rejeição não pode exceder 500 caracteres']
  },

  // Dados da assinatura digital
  signature: {
    digitalSignature: {
      type: String,
      default: null
    },
    signatureHash: {
      type: String,
      default: null
    },
    timestamp: {
      type: Date,
      default: null
    },
    signerPublicKey: {
      type: String,
      default: null
    },
    algorithm: {
      type: String,
      default: 'SHA256withRSA'
    }
  },

  // Informações de auditoria
  history: [{
    action: {
      type: String,
      enum: ['created', 'submitted', 'reviewed', 'approved', 'rejected', 'signed', 'updated'],
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
    comments: {
      type: String,
      trim: true
    },
    previousStatus: String,
    newStatus: String
  }],

  // Tags para organização
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],

  // Projeto ou centro de custo
  project: {
    type: String,
    trim: true,
    maxlength: [100, 'Projeto não pode exceder 100 caracteres']
  },
  costCenter: {
    type: String,
    trim: true,
    maxlength: [50, 'Centro de custo não pode exceder 50 caracteres']
  },

  // Dados para reembolso
  reimbursed: {
    type: Boolean,
    default: false
  },
  reimbursementDate: {
    type: Date,
    default: null
  },
  reimbursementAmount: {
    type: Number,
    default: null
  },

  // Metadados
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices compostos para queries comuns
expenseSchema.index({ employee: 1, status: 1 });
expenseSchema.index({ status: 1, createdAt: -1 });
expenseSchema.index({ expenseDate: -1 });
expenseSchema.index({ category: 1, expenseDate: -1 });
expenseSchema.index({ reviewer: 1, status: 1 });
expenseSchema.index({ approver: 1, status: 1 });
expenseSchema.index({ project: 1 });
expenseSchema.index({ costCenter: 1 });

// Virtual para valor formatado
expenseSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: this.currency
  }).format(this.amount);
});

// Virtual para verificar se pode ser editada
expenseSchema.virtual('canEdit').get(function() {
  return ['draft', 'rejected'].includes(this.status);
});

// Virtual para verificar se pode ser excluída
expenseSchema.virtual('canDelete').get(function() {
  return ['draft', 'rejected'].includes(this.status);
});

// Virtual para verificar se está pendente de aprovação
expenseSchema.virtual('isPending').get(function() {
  return ['submitted', 'under_review'].includes(this.status);
});

// Virtual para verificar se está assinada
expenseSchema.virtual('isSigned').get(function() {
  return this.status === 'signed' && this.signature && this.signature.digitalSignature;
});

// Middleware para adicionar ao histórico antes de salvar
expenseSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    const action = this.status === 'submitted' ? 'submitted' :
                  this.status === 'under_review' ? 'reviewed' :
                  this.status === 'approved' ? 'approved' :
                  this.status === 'rejected' ? 'rejected' :
                  this.status === 'signed' ? 'signed' : 'updated';

    this.history.push({
      action,
      performedBy: this._performedBy,
      previousStatus: this._previousStatus,
      newStatus: this.status,
      comments: this._actionComments
    });
  }
  next();
});

// Middleware para soft delete
expenseSchema.pre(/^find/, function(next) {
  // Não incluir documentos deletados por padrão
  this.find({ isDeleted: { $ne: true } });
  next();
});

// Método para submeter para aprovação
expenseSchema.methods.submit = function(performedBy) {
  this.status = 'submitted';
  this.submittedAt = new Date();
  this._performedBy = performedBy;
  this._previousStatus = 'draft';
  this._actionComments = 'Despesa submetida para aprovação';
  return this.save();
};

// Método para aprovar despesa
expenseSchema.methods.approve = function(performedBy, comments) {
  this.status = 'approved';
  this.approvedAt = new Date();
  this.approver = performedBy;
  this.approvalComments = comments;
  this._performedBy = performedBy;
  this._previousStatus = 'under_review';
  this._actionComments = comments;
  return this.save();
};

// Método para rejeitar despesa
expenseSchema.methods.reject = function(performedBy, reason) {
  this.status = 'rejected';
  this.reviewedAt = new Date();
  this.reviewer = performedBy;
  this.rejectionReason = reason;
  this._performedBy = performedBy;
  this._previousStatus = 'under_review';
  this._actionComments = reason;
  return this.save();
};

// Método para assinar despesa
expenseSchema.methods.sign = function(performedBy, signatureData) {
  this.status = 'signed';
  this.signedAt = new Date();
  this.signer = performedBy;
  this.signature = signatureData;
  this._performedBy = performedBy;
  this._previousStatus = 'approved';
  this._actionComments = 'Despesa assinada digitalmente';
  return this.save();
};

// Método para soft delete
expenseSchema.methods.softDelete = function(performedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = performedBy;
  return this.save();
};

// Método estático para buscar por funcionário
expenseSchema.statics.findByEmployee = function(employeeId, status) {
  const query = { employee: employeeId };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

// Método estático para buscar despesas pendentes
expenseSchema.statics.findPending = function() {
  return this.find({ 
    status: { $in: ['submitted', 'under_review'] } 
  }).sort({ submittedAt: 1 });
};

// Método estático para relatórios por período
expenseSchema.statics.getByPeriod = function(startDate, endDate, filters = {}) {
  const query = {
    expenseDate: { $gte: startDate, $lte: endDate },
    ...filters
  };
  return this.find(query).populate('employee', 'name employeeId department');
};

export default mongoose.models.Expense || mongoose.model('Expense', expenseSchema);