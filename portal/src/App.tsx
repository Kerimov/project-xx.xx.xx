import { Layout, theme } from 'antd';
import { Content } from 'antd/es/layout/layout';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppSidebar } from './components/layout/AppSidebar';
import { AppHeader } from './components/layout/AppHeader';
import { DashboardPage } from './pages/DashboardPage';
import { PackagesPage } from './pages/PackagesPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { IntegrationMonitorPage } from './pages/IntegrationMonitorPage';
import { DocumentDetailsPage } from './pages/DocumentDetailsPage';

const { Sider } = Layout;

export default function App() {
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
            <Route path="/documents/:id" element={<DocumentDetailsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/integration" element={<IntegrationMonitorPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

