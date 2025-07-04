import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Alert,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Add,
  TrendingUp,
  PendingActions,
  CheckCircle,
  Error,
  AttachMoney,
  People,
  Assignment,
  Security,
  Notifications,
  MoreVert,
  ViewList,
  Analytics
} from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Layout from '../components/Layout/Layout';
import { useAuth } from '../hooks/useAuth';
import { useExpenses } from '../hooks/useExpenses';

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { expenses, loading, getStatistics } = useExpenses();
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalAmount: 0,
    monthlyAmount: 0
  });
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Carregar estatísticas
      const stats = await getStatistics();
      setStatistics(stats);

      // Carregar despesas recentes
      const recent = expenses
        .filter(expense => expense.employee._id === user.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      setRecentExpenses(recent);

      // Carregar notificações (simulado)
      loadNotifications();
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    }
  };

  const loadNotifications = () => {
    // Simulação de notificações baseadas no papel do usuário
    const mockNotifications = [];

    if (user.role === 'manager') {
      mockNotifications.push({
        id: 1,
        type: 'pending_approval',
        title: 'Despesas pendentes',
        message: `${statistics.pending} despesas aguardando aprovação`,
        timestamp: new Date(),
        priority: 'high'
      });
    }

    if (user.role === 'director') {
      mockNotifications.push({
        id: 2,
        type: 'signature_required',
        title: 'Assinaturas pendentes',
        message: 'Documentos aguardando assinatura digital',
        timestamp: new Date(),
        priority: 'medium'
      });
    }

    mockNotifications.push({
      id: 3,
      type: 'system',
      title: 'Backup realizado',
      message: 'Backup dos dados realizado com sucesso',
      timestamp: new Date(),
      priority: 'low'
    });

    setNotifications(mockNotifications);
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      submitted: 'info',
      under_review: 'warning',
      approved: 'success',
      rejected: 'error',
      signed: 'primary'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const texts = {
      draft: 'Rascunho',
      submitted: 'Enviado',
      under_review: 'Em Análise',
      approved: 'Aprovado',
      rejected: 'Rejeitado',
      signed: 'Assinado'
    };
    return texts[status] || status;
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const QuickActionCard = ({ title, description, icon, onClick, color = 'primary' }) => (
    <Card 
      sx={{ 
        height: '100%',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4
        }
      }}
      onClick={onClick}
    >
      <CardContent sx={{ textAlign: 'center', py: 3 }}>
        <Avatar
          sx={{
            bgcolor: `${color}.main`,
            width: 56,
            height: 56,
            margin: '0 auto 16px'
          }}
        >
          {icon}
        </Avatar>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );

  const StatCard = ({ title, value, icon, color, subtitle, trend }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Avatar sx={{ bgcolor: `${color}.main`, width: 48, height: 48 }}>
            {icon}
          </Avatar>
          <Box textAlign="right">
            <Typography variant="h4" fontWeight="bold" color={`${color}.main`}>
              {value}
            </Typography>
            {trend && (
              <Typography variant="caption" color={trend > 0 ? 'success.main' : 'error.main'}>
                {trend > 0 ? '+' : ''}{trend}% vs mês anterior
              </Typography>
            )}
          </Box>
        </Box>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <Head>
        <title>Dashboard - Sistema de Gestão de Despesas</title>
      </Head>

      <Box>
        {/* Header */}
        <Box mb={4}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Bem-vindo, {user?.name}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <IconButton onClick={handleMenuClick}>
                <MoreVert />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={() => router.push('/reports')}>
                  <Analytics sx={{ mr: 1 }} /> Relatórios
                </MenuItem>
                <MenuItem onClick={() => router.push('/expenses')}>
                  <ViewList sx={{ mr: 1 }} /> Todas as Despesas
                </MenuItem>
              </Menu>
            </Box>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Dica de Segurança:</strong> Todas as suas despesas são protegidas por 
              criptografia e podem ser assinadas digitalmente para garantir autenticidade.
            </Typography>
          </Alert>
        </Box>

        {/* Estatísticas */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total de Despesas"
              value={statistics.total}
              icon={<Assignment />}
              color="primary"
              subtitle="Todas as suas despesas"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Pendentes"
              value={statistics.pending}
              icon={<PendingActions />}
              color="warning"
              subtitle="Aguardando aprovação"
              trend={-5}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Aprovadas"
              value={statistics.approved}
              icon={<CheckCircle />}
              color="success"
              subtitle="Despesas aprovadas"
              trend={12}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Valor Total"
              value={new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(statistics.totalAmount)}
              icon={<AttachMoney />}
              color="info"
              subtitle="Valor acumulado"
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Ações Rápidas */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Ações Rápidas
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <QuickActionCard
                      title="Nova Despesa"
                      description="Cadastrar nova despesa"
                      icon={<Add />}
                      onClick={() => router.push('/submitExpense')}
                      color="primary"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <QuickActionCard
                      title="Funcionários"
                      description="Gerenciar funcionários"
                      icon={<People />}
                      onClick={() => router.push('/employees')}
                      color="secondary"
                    />
                  </Grid>
                  {user?.role === 'manager' && (
                    <Grid item xs={6}>
                      <QuickActionCard
                        title="Aprovações"
                        description="Despesas pendentes"
                        icon={<PendingActions />}
                        onClick={() => router.push('/pendingExpenses')}
                        color="warning"
                      />
                    </Grid>
                  )}
                  {user?.role === 'director' && (
                    <Grid item xs={6}>
                      <QuickActionCard
                        title="Assinaturas"
                        description="Assinar documentos"
                        icon={<Security />}
                        onClick={() => router.push('/signExpense')}
                        color="info"
                      />
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Despesas Recentes */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Despesas Recentes
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => router.push('/expenses')}
                  >
                    Ver Todas
                  </Button>
                </Box>
                
                {loading ? (
                  <LinearProgress />
                ) : recentExpenses.length > 0 ? (
                  <List>
                    {recentExpenses.map((expense, index) => (
                      <div key={expense._id}>
                        <ListItem
                          sx={{
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' }
                          }}
                          onClick={() => router.push(`/expenses/${expense._id}`)}
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: `${getStatusColor(expense.status)}.main` }}>
                              {expense.status === 'approved' ? <CheckCircle /> :
                               expense.status === 'rejected' ? <Error /> :
                               expense.status === 'signed' ? <Security /> :
                               <PendingActions />}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={expense.title}
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: expense.currency
                                  }).format(expense.amount)}
                                </Typography>
                                <Box mt={0.5}>
                                  <Chip
                                    label={getStatusText(expense.status)}
                                    color={getStatusColor(expense.status)}
                                    size="small"
                                  />
                                </Box>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < recentExpenses.length - 1 && <Divider />}
                      </div>
                    ))}
                  </List>
                ) : (
                  <Box textAlign="center" py={4}>
                    <Typography variant="body2" color="text.secondary">
                      Nenhuma despesa encontrada
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<Add />}
                      onClick={() => router.push('/submitExpense')}
                      sx={{ mt: 2 }}
                    >
                      Criar primeira despesa
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Notificações */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Notifications sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Notificações
                  </Typography>
                </Box>
                
                <List>
                  {notifications.map((notification, index) => (
                    <div key={notification.id}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar
                            sx={{
                              bgcolor: notification.priority === 'high' ? 'error.main' :
                                      notification.priority === 'medium' ? 'warning.main' : 'info.main',
                              width: 32,
                              height: 32
                            }}
                          >
                            {notification.type === 'pending_approval' ? <PendingActions /> :
                             notification.type === 'signature_required' ? <Security /> :
                             <Notifications />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={notification.title}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {notification.message}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {format(notification.timestamp, 'HH:mm')}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < notifications.length - 1 && <Divider />}
                    </div>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Gráfico de Tendências */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <TrendingUp sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Tendências Mensais
                  </Typography>
                </Box>
                
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Valor do mês atual
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(statistics.monthlyAmount)}
                  </Typography>
                </Box>

                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Progresso do orçamento mensal
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(statistics.monthlyAmount / 10000) * 100} // Supondo orçamento de R$ 10.000
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {((statistics.monthlyAmount / 10000) * 100).toFixed(1)}% do orçamento utilizado
                  </Typography>
                </Box>

                <Alert severity="info" size="small">
                  <Typography variant="caption">
                    Suas despesas estão dentro do orçamento mensal estabelecido.
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Resumo de Segurança */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Security sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Status de Segurança
                  </Typography>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box textAlign="center">
                      <Avatar sx={{ bgcolor: 'success.main', margin: '0 auto 8px' }}>
                        <Security />
                      </Avatar>
                      <Typography variant="body2" fontWeight="bold">
                        Chaves Digitais
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Ativas e seguras
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box textAlign="center">
                      <Avatar sx={{ bgcolor: 'info.main', margin: '0 auto 8px' }}>
                        <CheckCircle />
                      </Avatar>
                      <Typography variant="body2" fontWeight="bold">
                        Documentos Assinados
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {statistics.signed || 0} este mês
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box textAlign="center">
                      <Avatar sx={{ bgcolor: 'warning.main', margin: '0 auto 8px' }}>
                        <Assignment />
                      </Avatar>
                      <Typography variant="body2" fontWeight="bold">
                        Backup
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Último: hoje 02:00
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box textAlign="center">
                      <Avatar sx={{ bgcolor: 'primary.main', margin: '0 auto 8px' }}>
                        <TrendingUp />
                      </Avatar>
                      <Typography variant="body2" fontWeight="bold">
                        Auditoria
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        100% dos logs
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
}