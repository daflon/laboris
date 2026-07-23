import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { FiUsers, FiTool, FiMonitor, FiClipboard, FiSettings, FiHome, FiLogOut, FiShield, FiDollarSign } from 'react-icons/fi';
import api from '../services/api';
import { authService } from '../services/auth.service';
import GlobalSearch from './GlobalSearch';
import './Layout.css';

export default function Layout() {
  const navigate = useNavigate();
  const [openCount, setOpenCount] = useState(0);
  const [modules, setModules] = useState<string[]>(['os']);
  const [companyName, setCompanyName] = useState('');
  const isMasterImpersonating = !!localStorage.getItem('master_token');

  useEffect(() => {
    api.get('/dashboard/stats')
      .then((res) => {
        const s = res.data.data.statuses;
        setOpenCount((s.aberta || 0) + (s.aprovada || 0) + (s.aguardando_peca || 0));
      })
      .catch(() => {});

    // Carregar módulos e nome da empresa
    if (isMasterImpersonating) {
      setModules(['os', 'financeiro']);
    } else {
      api.get('/auth/me')
        .then((res) => {
          if (res.data.data.tenant?.modules) {
            const mods = res.data.data.tenant.modules;
            setModules(typeof mods === 'string' ? JSON.parse(mods) : mods);
          }
        })
        .catch(() => {});
    }

    // Pegar nome da empresa das configurações
    api.get('/company')
      .then((res) => {
        if (res.data.data?.name) setCompanyName(res.data.data.name);
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    authService.removeToken();
    navigate('/login');
  };

  const handleBackToMaster = () => {
    const masterToken = localStorage.getItem('master_token');
    if (masterToken) {
      localStorage.setItem('token', masterToken);
      localStorage.removeItem('master_token');
      const user = authService.getUser();
      if (user) {
        user.role = 'super_admin';
        user.tenant_id = null;
        authService.setUser(user);
      }
      navigate('/master');
      window.location.reload();
    }
  };

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
          <h1>{companyName || 'OS Laboris'}</h1>
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
          {modules.includes('financeiro') && (
            <NavLink to="/financeiro" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <FiDollarSign /> <span>Financeiro</span>
            </NavLink>
          )}
        </nav>
        <div style={{ marginTop: 'auto', padding: '1rem 0' }}>
          {isMasterImpersonating && (
            <>
              <button onClick={handleBackToMaster} className="nav-link" style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', color: '#f59e0b' }}>
                <FiShield /> <span>Painel Master</span>
              </button>
            </>
          )}
          <NavLink to="/configuracoes" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <FiSettings /> <span>Configurações</span>
          </NavLink>
          <button onClick={handleLogout} className="nav-link" style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
            <FiLogOut /> <span>Sair</span>
          </button>
        </div>
        <div className="sidebar-footer-brand">
          <span className="sidebar-brand-name">OS Laboris</span>
          <a href="https://wa.me/5521974303932" target="_blank" rel="noopener noreferrer" className="sidebar-support">
            Suporte: (21) 97430-3932
          </a>
        </div>
      </aside>

      <main className="main-content">
        <div className="top-bar">
          <GlobalSearch />
        </div>
        <Outlet />
      </main>

      {/* Mobile bottom navigation */}
      <nav className="mobile-nav">
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}>
          <FiHome />
          <span>Início</span>
        </NavLink>
        <NavLink to="/os" className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}>
          <FiClipboard />
          <span>OS</span>
        </NavLink>
        <NavLink to="/clientes" className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}>
          <FiUsers />
          <span>Clientes</span>
        </NavLink>
        <NavLink to="/tecnicos" className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}>
          <FiTool />
          <span>Técnicos</span>
        </NavLink>
        <NavLink to="/configuracoes" className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}>
          <FiSettings />
          <span>Config</span>
        </NavLink>
      </nav>
    </div>
  );
}
