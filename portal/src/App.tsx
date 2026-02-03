import { Layout, theme } from 'antd';
import { Content } from 'antd/es/layout/layout';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { AppSidebar } from './components/layout/AppSidebar';
import { AppHeader } from './components/layout/AppHeader';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { PackagesPage } from './pages/PackagesPage';
import { PackageDetailsPage } from './pages/PackageDetailsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { IntegrationMonitorPage } from './pages/IntegrationMonitorPage';
import { UHDbConnectionPage } from './pages/UHDbConnectionPage';
import { LogsPage } from './pages/LogsPage';
import { DocumentDetailsPage } from './pages/DocumentDetailsPage';
import CreateDocumentPage from './pages/CreateDocumentPage';
import { SelectDocumentTypePage } from './pages/SelectDocumentTypePage';
import { NSIPage } from './pages/NSIPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AnalyticsAdminPage } from './pages/AnalyticsAdminPage';
import { OrganizationCabinetPage } from './pages/OrganizationCabinetPage';
import { UsersAdminPage } from './pages/UsersAdminPage';
import { OrganizationDetailsPage } from './pages/nsi/OrganizationDetailsPage';
import { CounterpartyDetailsPage } from './pages/nsi/CounterpartyDetailsPage';
import { ContractDetailsPage } from './pages/nsi/ContractDetailsPage';
import { AccountDetailsPage } from './pages/nsi/AccountDetailsPage';
import { WarehouseDetailsPage } from './pages/nsi/WarehouseDetailsPage';
import { AccountingAccountDetailsPage } from './pages/nsi/AccountingAccountDetailsPage';
import { ObjectCardDetailsPage } from './pages/ObjectCardDetailsPage';

const { Sider } = Layout;

function AppLayout() {
  const {
    token: { colorBgLayout }
  } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={260} theme="light" breakpoint="lg" collapsedWidth={80}>
        <div className="app-logo">
          <span className="app-logo-text">ЕЦОФ</span>
        </div>
        <AppSidebar />
      </Sider>
      <Layout style={{ background: colorBgLayout }}>
        <AppHeader />
        <Content className="app-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/packages" element={<PackagesPage />} />
            <Route path="/packages/:id" element={<PackageDetailsPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/documents/new" element={<SelectDocumentTypePage />} />
            <Route path="/documents/new/:type" element={<CreateDocumentPage />} />
            <Route path="/documents/:id/edit" element={<CreateDocumentPage />} />
            <Route path="/documents/:id" element={<DocumentDetailsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/integration" element={<AdminRoute><IntegrationMonitorPage /></AdminRoute>} />
            <Route path="/logs" element={<AdminRoute><LogsPage /></AdminRoute>} />
            <Route path="/uh-db-connection" element={<AdminRoute><UHDbConnectionPage /></AdminRoute>} />
            <Route path="/nsi" element={<NSIPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/analytics/admin" element={<AnalyticsAdminPage />} />
            <Route path="/organization/cabinet" element={<OrganizationCabinetPage />} />
            <Route path="/admin/users" element={<UsersAdminPage />} />
            <Route path="/nsi/organizations/:id" element={<OrganizationDetailsPage />} />
            <Route path="/nsi/counterparties/:id" element={<CounterpartyDetailsPage />} />
            <Route path="/nsi/contracts/:id" element={<ContractDetailsPage />} />
            <Route path="/nsi/accounts/:id" element={<AccountDetailsPage />} />
            <Route path="/nsi/warehouses/:id" element={<WarehouseDetailsPage />} />
            <Route path="/nsi/accounting-accounts/:id" element={<AccountingAccountDetailsPage />} />
            <Route path="/objects/types" element={<AdminRoute><ObjectTypesPage /></AdminRoute>} />
            <Route path="/objects/types/:id" element={<AdminRoute><ObjectTypesPage /></AdminRoute>} />
            <Route path="/objects/cards" element={<ObjectCardsPage />} />
            <Route path="/objects/cards/:id" element={<ObjectCardDetailsPage />} />
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
