import { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { FiUsers, FiTool, FiMonitor, FiClipboard, FiSettings, FiHome } from 'react-icons/fi';
import api from '../services/api';
import GlobalSearch from './GlobalSearch';
import './Layout.css';

export default function Layout() {
  const [openCount, setOpenCount] = useState(0);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then((res) => {
        const s = res.data.data.statuses;
        setOpenCount((s.aberta || 0) + (s.aprovada || 0) + (s.aguardando_peca || 0));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>OS Laboris</h1>
          <span className="subtitle">Assistência Técnica</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <FiHome /> <span>Dashboard</span>
          </NavLink>
          <NavLink to="/os" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <FiClipboard /> <span>Ordens de Serviço</span>
            {openCount > 0 && <span className="nav-badge">{openCount}</span>}
          </NavLink>
          <NavLink to="/clientes" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <FiUsers /> <span>Clientes</span>
          </NavLink>
          <NavLink to="/tecnicos" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <FiTool /> <span>Técnicos</span>
          </NavLink>
          <NavLink to="/equipamentos" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <FiMonitor /> <span>Equipamentos</span>
          </NavLink>
        </nav>
        <div style={{ marginTop: 'auto', padding: '1rem 0' }}>
          <NavLink to="/configuracoes" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <FiSettings /> <span>Configurações</span>
          </NavLink>
        </div>
      </aside>
      <main className="main-content">
        <div className="top-bar">
          <GlobalSearch />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
