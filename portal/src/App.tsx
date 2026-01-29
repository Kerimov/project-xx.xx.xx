import { Layout, theme } from 'antd';
import { Content } from 'antd/es/layout/layout';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppSidebar } from './components/layout/AppSidebar';
import { AppHeader } from './components/layout/AppHeader';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { PackagesPage } from './pages/PackagesPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { IntegrationMonitorPage } from './pages/IntegrationMonitorPage';
import { DocumentDetailsPage } from './pages/DocumentDetailsPage';
import { CreateDocumentPage } from './pages/CreateDocumentPage';
import { SelectDocumentTypePage } from './pages/SelectDocumentTypePage';
import { NSIPage } from './pages/NSIPage';
import { OrganizationDetailsPage } from './pages/nsi/OrganizationDetailsPage';
import { CounterpartyDetailsPage } from './pages/nsi/CounterpartyDetailsPage';
import { ContractDetailsPage } from './pages/nsi/ContractDetailsPage';
import { AccountDetailsPage } from './pages/nsi/AccountDetailsPage';
import { WarehouseDetailsPage } from './pages/nsi/WarehouseDetailsPage';

const { Sider } = Layout;

function AppLayout() {
  const {
    token: { colorBgLayout }
  } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={260} theme="light" breakpoint="lg" collapsedWidth={80}>
        <div className="app-logo">ЕЦОФ</div>
        <AppSidebar />
      </Sider>
      <Layout style={{ background: colorBgLayout }}>
        <AppHeader />
        <Content className="app-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/packages" element={<PackagesPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/documents/new" element={<SelectDocumentTypePage />} />
            <Route path="/documents/new/:type" element={<CreateDocumentPage />} />
            <Route path="/documents/:id/edit" element={<CreateDocumentPage />} />
            <Route path="/documents/:id" element={<DocumentDetailsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/integration" element={<IntegrationMonitorPage />} />
            <Route path="/nsi" element={<NSIPage />} />
            <Route path="/nsi/organizations/:id" element={<OrganizationDetailsPage />} />
            <Route path="/nsi/counterparties/:id" element={<CounterpartyDetailsPage />} />
            <Route path="/nsi/contracts/:id" element={<ContractDetailsPage />} />
            <Route path="/nsi/accounts/:id" element={<AccountDetailsPage />} />
            <Route path="/nsi/warehouses/:id" element={<WarehouseDetailsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh'
        }}
      >
        <div>Загрузка...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

