import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Box, 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  Typography, 
  Alert,
  InputAdornment,
  IconButton,
  Checkbox,
  FormControlLabel,
  Divider,
  CircularProgress
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff, 
  Email, 
  Lock,
  Security,
  Business
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';

// Schema de validação
const loginSchema = yup.object({
  email: yup
    .string()
    .email('Email inválido')
    .required('Email é obrigatório'),
  password: yup
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .required('Senha é obrigatória'),
});

export default function Login() {
  const router = useRouter();
  const { login, user, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError
  } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  // Redirect se já estiver logado
  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Carregar dados salvos do localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setRememberMe(true);
    }
  }, []);

  const onSubmit = async (data) => {
    setIsLoading(true);
    
    try {
      const result = await login(data.email, data.password, rememberMe);
      
      if (result.success) {
        // Salvar email se "Lembrar-me" estiver marcado
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', data.email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }

        toast.success('Login realizado com sucesso!');
        
        // Redirect baseado no papel do usuário
        const redirectPath = router.query.redirect || '/dashboard';
        router.push(redirectPath);
      } else {
        // Tratar erros específicos
        if (result.error === 'ACCOUNT_LOCKED') {
          setError('email', { 
            message: 'Conta bloqueada devido a muitas tentativas. Tente novamente mais tarde.' 
          });
        } else if (result.error === 'INVALID_CREDENTIALS') {
          setError('password', { 
            message: 'Email ou senha incorretos.' 
          });
        } else if (result.error === 'ACCOUNT_INACTIVE') {
          setError('email', { 
            message: 'Conta inativa. Entre em contato com o administrador.' 
          });
        } else {
          toast.error(result.message || 'Erro ao fazer login');
        }
      }
    } catch (error) {
      console.error('Erro no login:', error);
      toast.error('Erro interno do servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        bgcolor="grey.50"
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <>
      <Head>
        <title>Login - Sistema de Gestão de Despesas</title>
        <meta name="description" content="Faça login no sistema de gestão de despesas com assinatura digital" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 2
        }}
      >
        <Card
          sx={{
            maxWidth: 450,
            width: '100%',
            borderRadius: 3,
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <Box
            sx={{
              background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
              color: 'white',
              textAlign: 'center',
              py: 4,
              px: 3
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2
              }}
            >
              <Business sx={{ fontSize: 40, mr: 1 }} />
              <Security sx={{ fontSize: 40 }} />
            </Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Sistema de Despesas
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Gestão segura com assinatura digital
            </Typography>
          </Box>

          <CardContent sx={{ p: 4 }}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Box mb={3}>
                <TextField
                  {...register('email')}
                  fullWidth
                  label="Email"
                  type="email"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color={errors.email ? 'error' : 'action'} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
              </Box>

              <Box mb={3}>
                <TextField
                  {...register('password')}
                  fullWidth
                  label="Senha"
                  type={showPassword ? 'text' : 'password'}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color={errors.password ? 'error' : 'action'} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleTogglePassword}
                          edge="end"
                          disabled={isLoading}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
              </Box>

              <Box mb={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={isLoading}
                      color="primary"
                    />
                  }
                  label="Lembrar-me"
                />
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading || isSubmitting}
                sx={{
                  borderRadius: 2,
                  py: 1.5,
                  background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1565c0 30%, #1976d2 90%)',
                  }
                }}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Entrar'
                )}
              </Button>

              <Divider sx={{ my: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Problemas para acessar?
                </Typography>
              </Divider>

              <Box textAlign="center">
                <Link href="/forgot-password" passHref>
                  <Button
                    variant="text"
                    color="primary"
                    disabled={isLoading}
                    sx={{ textTransform: 'none' }}
                  >
                    Esqueci minha senha
                  </Button>
                </Link>
              </Box>
            </form>
          </CardContent>

          {/* Footer */}
          <Box
            sx={{
              bgcolor: 'grey.50',
              textAlign: 'center',
              py: 2,
              px: 3
            }}
          >
            <Typography variant="caption" color="text.secondary">
              © 2025 Sistema de Gestão de Despesas
            </Typography>
            <br />
            <Typography variant="caption" color="text.secondary">
              Protegido por criptografia e assinatura digital
            </Typography>
          </Box>
        </Card>
      </Box>

      {/* Informações de segurança */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          maxWidth: 300,
          display: { xs: 'none', md: 'block' }
        }}
      >
        <Alert 
          severity="info" 
          icon={<Security />}
          sx={{ 
            borderRadius: 2,
            backdropFilter: 'blur(10px)',
            backgroundColor: 'rgba(255, 255, 255, 0.9)'
          }}
        >
          <Typography variant="caption">
            <strong>Segurança:</strong> Este sistema utiliza criptografia de ponta a ponta 
            e assinaturas digitais para garantir a autenticidade dos documentos.
          </Typography>
        </Alert>
      </Box>
    </>
  );
}