import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { authService } from './services/auth.service';
import Layout from './components/Layout';
import Login from './pages/Login/Login';
import MasterDashboard from './pages/Master/MasterDashboard';
import CreateTenant from './pages/Master/CreateTenant';
import EditTenant from './pages/Master/EditTenant';
import Dashboard from './pages/Dashboard/Dashboard';
import ClientsList from './pages/Clients/ClientsList';
import ClientForm from './pages/Clients/ClientForm';
import ClientDetails from './pages/Clients/ClientDetails';
import TechniciansList from './pages/Technicians/TechniciansList';
import TechnicianForm from './pages/Technicians/TechnicianForm';
import EquipmentList from './pages/Equipment/EquipmentList';
import EquipmentForm from './pages/Equipment/EquipmentForm';
import EquipmentHistory from './pages/Equipment/EquipmentHistory';
import ServiceOrdersList from './pages/ServiceOrders/ServiceOrdersList';
import ServiceOrderForm from './pages/ServiceOrders/ServiceOrderForm';
import ServiceOrderDetails from './pages/ServiceOrders/ServiceOrderDetails';
import CompanySettingsPage from './pages/Settings/CompanySettings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  // Super admin sem impersonate não pode acessar rotas de tenant
  const user = authService.getUser();
  if (user?.role === 'super_admin' && !user?.tenant_id && !localStorage.getItem('master_token')) {
    return <Navigate to="/master" replace />;
  }
  return <>{children}</>;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  if (!authService.isAuthenticated()) return <Navigate to="/login" replace />;
  // Aceita se é super_admin OU se tem master_token salvo (impersonando)
  if (!authService.isSuperAdmin() && !localStorage.getItem('master_token')) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Super Admin */}
        <Route path="/master" element={<SuperAdminRoute><MasterDashboard /></SuperAdminRoute>} />
        <Route path="/master/tenants/novo" element={<SuperAdminRoute><CreateTenant /></SuperAdminRoute>} />
        <Route path="/master/tenants/:id/editar" element={<SuperAdminRoute><EditTenant /></SuperAdminRoute>} />

        {/* Tenant routes */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

          <Route path="os" element={<ServiceOrdersList />} />
          <Route path="os/nova" element={<ServiceOrderForm />} />
          <Route path="os/:id" element={<ServiceOrderDetails />} />
          <Route path="os/:id/editar" element={<ServiceOrderForm />} />

          <Route path="clientes" element={<ClientsList />} />
          <Route path="clientes/novo" element={<ClientForm />} />
          <Route path="clientes/:id" element={<ClientDetails />} />
          <Route path="clientes/:id/editar" element={<ClientForm />} />

          <Route path="tecnicos" element={<TechniciansList />} />
          <Route path="tecnicos/novo" element={<TechnicianForm />} />
          <Route path="tecnicos/:id/editar" element={<TechnicianForm />} />

          <Route path="equipamentos" element={<EquipmentList />} />
          <Route path="equipamentos/novo" element={<EquipmentForm />} />
          <Route path="equipamentos/:id/editar" element={<EquipmentForm />} />
          <Route path="equipamentos/:id/historico" element={<EquipmentHistory />} />

          <Route path="configuracoes" element={<CompanySettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
