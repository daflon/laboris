import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
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

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard */}
          <Route path="dashboard" element={<Dashboard />} />

          {/* Ordens de Serviço */}
          <Route path="os" element={<ServiceOrdersList />} />
          <Route path="os/nova" element={<ServiceOrderForm />} />
          <Route path="os/:id" element={<ServiceOrderDetails />} />
          <Route path="os/:id/editar" element={<ServiceOrderForm />} />

          {/* Clientes */}
          <Route path="clientes" element={<ClientsList />} />
          <Route path="clientes/novo" element={<ClientForm />} />
          <Route path="clientes/:id" element={<ClientDetails />} />
          <Route path="clientes/:id/editar" element={<ClientForm />} />

          {/* Técnicos */}
          <Route path="tecnicos" element={<TechniciansList />} />
          <Route path="tecnicos/novo" element={<TechnicianForm />} />
          <Route path="tecnicos/:id/editar" element={<TechnicianForm />} />

          {/* Equipamentos */}
          <Route path="equipamentos" element={<EquipmentList />} />
          <Route path="equipamentos/novo" element={<EquipmentForm />} />
          <Route path="equipamentos/:id/editar" element={<EquipmentForm />} />
          <Route path="equipamentos/:id/historico" element={<EquipmentHistory />} />

          {/* Configurações */}
          <Route path="configuracoes" element={<CompanySettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
