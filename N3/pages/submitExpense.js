import { useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Grid,
  MenuItem,
  Alert,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  AttachFile,
  Save,
  Send,
  Preview,
  Close,
  CheckCircle,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import Layout from '../components/Layout/Layout';
import { useAuth } from '../hooks/useAuth';
import { useExpenses } from '../hooks/useExpenses';

// Schema de validação
const expenseSchema = yup.object({
  title: yup
    .string()
    .required('Título é obrigatório')
    .max(200, 'Título não pode exceder 200 caracteres'),
  description: yup
    .string()
    .required('Descrição é obrigatória')
    .max(1000, 'Descrição não pode exceder 1000 caracteres'),
  category: yup
    .string()
    .required('Categoria é obrigatória'),
  amount: yup
    .number()
    .required('Valor é obrigatório')
    .positive('Valor deve ser positivo')
    .max(999999.99, 'Valor não pode exceder R$ 999.999,99'),
  expenseDate: yup
    .date()
    .required('Data da despesa é obrigatória')
    .max(new Date(), 'Data não pode ser no futuro'),
  project: yup.string(),
  costCenter: yup.string(),
  tags: yup.string()
});

const categories = [
  { value: 'transport', label: 'Transporte' },
  { value: 'accommodation', label: 'Hospedagem' },
  { value: 'meals', label: 'Alimentação' },
  { value: 'office_supplies', label: 'Material de Escritório' },
  { value: 'travel', label: 'Viagem' },
  { value: 'training', label: 'Treinamento' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'equipment', label: 'Equipamentos' },
  { value: 'maintenance', label: 'Manutenção' },
  { value: 'communication', label: 'Comunicação' },
  { value: 'software', label: 'Software' },
  { value: 'consulting', label: 'Consultoria' },
  { value: 'other', label: 'Outros' }
];

export default function SubmitExpense() {
  const router = useRouter();
  const { user } = useAuth();
  const { createExpense, loading } = useExpenses();
  const fileInputRef = useRef(null);
  
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [previewDialog, setPreviewDialog] = useState({ open: false, file: null });
  const [isDraft, setIsDraft] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    reset
  } = useForm({
    resolver: yupResolver(expenseSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      amount: '',
      expenseDate: format(new Date(), 'yyyy-MM-dd'),
      project: '',
      costCenter: '',
      tags: ''
    }
  });

  const watchedAmount = watch('amount');
  const watchedCategory = watch('category');

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    
    if (uploadedFiles.length + files.length > 5) {
      toast.error('Máximo de 5 arquivos permitidos');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validações
        if (file.size > 5 * 1024 * 1024) { // 5MB
          toast.error(`Arquivo ${file.name} é muito grande (máx: 5MB)`);
          continue;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
          toast.error(`Tipo de arquivo não permitido: ${file.name}`);
          continue;
        }

        // Simular upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'receipt');

        const progress = ((i + 1) / files.length) * 100;
        setUploadProgress(progress);

        // Simular delay de upload
        await new Promise(resolve => setTimeout(resolve, 1000));

        const fileData = {
          id: Date.now() + i,
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
          uploadedAt: new Date()
        };

        setUploadedFiles(prev => [...prev, fileData]);
      }

      toast.success('Arquivos enviados com sucesso!');
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar arquivos');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    toast.info('Arquivo removido');
  };

  const handlePreviewFile = (file) => {
    setPreviewDialog({ open: true, file });
  };

  const onSubmit = async (data, asDraft = false) => {
    if (!asDraft && uploadedFiles.length === 0) {
      toast.error('Pelo menos um recibo deve ser anexado');
      return;
    }

    setIsDraft(asDraft);

    try {
      const expenseData = {
        ...data,
        amount: parseFloat(data.amount),
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()) : [],
        receipts: uploadedFiles.map(file => ({
          filename: file.name,
          originalName: file.name,
          mimetype: file.type,
          size: file.size,
          path: file.url
        })),
        status: asDraft ? 'draft' : 'submitted',
        employee: user.id
      };

      const result = await createExpense(expenseData);

      if (result.success) {
        toast.success(
          asDraft 
            ? 'Despesa salva como rascunho!' 
            : 'Despesa submetida para aprovação!'
        );
        router.push('/dashboard');
      } else {
        toast.error(result.message || 'Erro ao criar despesa');
      }
    } catch (error) {
      console.error('Erro ao submeter despesa:', error);
      toast.error('Erro interno do servidor');
    }
  };

  const handleSaveAsDraft = () => {
    handleSubmit((data) => onSubmit(data, true))();
  };

  const handleSubmitForApproval = () => {
    handleSubmit((data) => onSubmit(data, false))();
  };

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type === 'application/pdf') return '📄';
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Layout>
      <Head>
        <title>Submeter Despesa - Sistema de Gestão de Despesas</title>
      </Head>

      <Box>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Nova Despesa
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Preencha os dados da despesa e anexe os recibos necessários
        </Typography>

        <Card sx={{ mt: 3 }}>
          <CardContent>
            <form>
              <Grid container spacing={3}>
                {/* Informações Básicas */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Informações Básicas
                  </Typography>
                </Grid>

                {/* Resumo */}
                {(watchedAmount || watchedCategory) && (
                  <Grid item xs={12}>
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="body2" fontWeight="bold" gutterBottom>
                        Resumo da Despesa
                      </Typography>
                      <Typography variant="body2">
                        <strong>Categoria:</strong> {categories.find(c => c.value === watchedCategory)?.label || 'Não selecionada'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Valor:</strong> {watchedAmount ? new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(parseFloat(watchedAmount)) : 'R$ 0,00'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Recibos:</strong> {uploadedFiles.length} arquivo(s) anexado(s)
                      </Typography>
                    </Alert>
                  </Grid>
                )}

                {/* Botões de Ação */}
                <Grid item xs={12}>
                  <Box 
                    display="flex" 
                    gap={2} 
                    justifyContent="flex-end" 
                    flexWrap="wrap"
                    sx={{ mt: 3 }}
                  >
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => router.push('/dashboard')}
                      disabled={isSubmitting || loading}
                    >
                      Cancelar
                    </Button>
                    
                    <Button
                      variant="outlined"
                      startIcon={<Save />}
                      onClick={handleSaveAsDraft}
                      disabled={isSubmitting || loading}
                    >
                      {isDraft && loading ? 'Salvando...' : 'Salvar Rascunho'}
                    </Button>
                    
                    <Button
                      variant="contained"
                      startIcon={<Send />}
                      onClick={handleSubmitForApproval}
                      disabled={isSubmitting || loading}
                      color="primary"
                    >
                      {!isDraft && loading ? 'Enviando...' : 'Enviar para Aprovação'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          </CardContent>
        </Card>

        {/* Dialog de Preview */}
        <Dialog
          open={previewDialog.open}
          onClose={() => setPreviewDialog({ open: false, file: null })}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">
                Preview: {previewDialog.file?.name}
              </Typography>
              <IconButton onClick={() => setPreviewDialog({ open: false, file: null })}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {previewDialog.file && (
              <Box textAlign="center">
                {previewDialog.file.type.startsWith('image/') ? (
                  <img
                    src={previewDialog.file.url}
                    alt={previewDialog.file.name}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '500px',
                      objectFit: 'contain'
                    }}
                  />
                ) : previewDialog.file.type === 'application/pdf' ? (
                  <Box>
                    <Typography variant="body1" gutterBottom>
                      Arquivo PDF: {previewDialog.file.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatFileSize(previewDialog.file.size)}
                    </Typography>
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Para visualizar o PDF, faça o download do arquivo.
                    </Alert>
                  </Box>
                ) : (
                  <Box>
                    <AttachFile sx={{ fontSize: 64, color: 'text.secondary' }} />
                    <Typography variant="body1">
                      {previewDialog.file.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatFileSize(previewDialog.file.size)}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              variant="outlined"
              href={previewDialog.file?.url}
              download={previewDialog.file?.name}
              target="_blank"
            >
              Download
            </Button>
            <Button onClick={() => setPreviewDialog({ open: false, file: null })}>
              Fechar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Informações de Segurança */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <CheckCircle color="success" />
              <Typography variant="h6">
                Segurança e Privacidade
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Box textAlign="center">
                  <CheckCircle sx={{ color: 'success.main', fontSize: 32, mb: 1 }} />
                  <Typography variant="body2" fontWeight="bold">
                    Dados Criptografados
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Todas as informações são protegidas por criptografia
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box textAlign="center">
                  <CheckCircle sx={{ color: 'success.main', fontSize: 32, mb: 1 }} />
                  <Typography variant="body2" fontWeight="bold">
                    Assinatura Digital
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Documentos podem ser assinados digitalmente
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box textAlign="center">
                  <CheckCircle sx={{ color: 'success.main', fontSize: 32, mb: 1 }} />
                  <Typography variant="body2" fontWeight="bold">
                    Auditoria Completa
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Todas as ações são registradas para auditoria
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Layout>
  );
}

                <Grid item xs={12} md={8}>
                  <Controller
                    name="title"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Título da Despesa"
                        error={!!errors.title}
                        helperText={errors.title?.message}
                        placeholder="Ex: Passagem aérea para São Paulo"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        select
                        label="Categoria"
                        error={!!errors.category}
                        helperText={errors.category?.message}
                      >
                        {categories.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        multiline
                        rows={4}
                        label="Descrição"
                        error={!!errors.description}
                        helperText={errors.description?.message}
                        placeholder="Descreva detalhadamente a despesa..."
                      />
                    )}
                  />
                </Grid>

                {/* Valores e Datas */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Valores e Datas
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="amount"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        type="number"
                        label="Valor (R$)"
                        error={!!errors.amount}
                        helperText={errors.amount?.message}
                        inputProps={{ step: '0.01', min: '0' }}
                      />
                    )}
                  />
                  {watchedAmount && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Valor por extenso: {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(parseFloat(watchedAmount) || 0)}
                    </Typography>
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="expenseDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        type="date"
                        label="Data da Despesa"
                        error={!!errors.expenseDate}
                        helperText={errors.expenseDate?.message}
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                </Grid>

                {/* Informações Adicionais */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Informações Adicionais
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="project"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Projeto (opcional)"
                        placeholder="Nome do projeto relacionado"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="costCenter"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Centro de Custo (opcional)"
                        placeholder="Centro de custo"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="tags"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Tags (opcional)"
                        placeholder="Digite tags separadas por vírgula"
                        helperText="Ex: urgente, viagem, cliente"
                      />
                    )}
                  />
                </Grid>

                {/* Upload de Arquivos */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Recibos e Comprovantes
                  </Typography>
                  
                  <Box
                    sx={{
                      border: '2px dashed',
                      borderColor: 'primary.main',
                      borderRadius: 2,
                      p: 3,
                      textAlign: 'center',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h6" gutterBottom>
                      Clique para fazer upload dos recibos
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Formatos aceitos: JPG, PNG, GIF, PDF (máx: 5MB por arquivo)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      Máximo de 5 arquivos
                    </Typography>
                  </Box>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.gif,.pdf"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />

                  {uploading && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        Enviando arquivos... {uploadProgress.toFixed(0)}%
                      </Typography>
                      <LinearProgress variant="determinate" value={uploadProgress} />
                    </Box>
                  )}

                  {uploadedFiles.length > 0 && (
                    <Card sx={{ mt: 2 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Arquivos Anexados ({uploadedFiles.length}/5)
                        </Typography>
                        <List>
                          {uploadedFiles.map((file, index) => (
                            <div key={file.id}>
                              <ListItem>
                                <ListItemText
                                  primary={
                                    <Box display="flex" alignItems="center" gap={1}>
                                      <span>{getFileIcon(file.type)}</span>
                                      <Typography variant="body2">
                                        {file.name}
                                      </Typography>
                                    </Box>
                                  }
                                  secondary={
                                    <Box>
                                      <Typography variant="caption" color="text.secondary">
                                        {formatFileSize(file.size)} • {format(file.uploadedAt, 'dd/MM/yyyy HH:mm')}
                                      </Typography>
                                    </Box>
                                  }
                                />
                                <ListItemSecondaryAction>
                                  <IconButton
                                    edge="end"
                                    onClick={() => handlePreviewFile(file)}
                                    sx={{ mr: 1 }}
                                  >
                                    <Preview />
                                  </IconButton>
                                  <IconButton
                                    edge="end"
                                    onClick={() => handleRemoveFile(file.id)}
                                    color="error"
                                  >
                                    <Delete />
                                  </IconButton>
                                </ListItemSecondaryAction>
                              </ListItem>
                              {index < uploadedFiles.length - 1 && <Divider />}
                            </div>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  )}