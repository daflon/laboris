import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { FiUsers, FiTool, FiMonitor, FiClipboard, FiSettings, FiHome, FiLogOut, FiShield, FiDollarSign, FiAlertTriangle, FiBarChart2, FiMoreHorizontal, FiX } from 'react-icons/fi';
import api from '../services/api';
import { authService } from '../services/auth.service';
import GlobalSearch from './GlobalSearch';
import './Layout.css';

export default function Layout() {
  const navigate = useNavigate();
  const [openCount, setOpenCount] = useState(0);
  const [modules, setModules] = useState<string[]>(['os']);
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [impersonatingTenant, setImpersonatingTenant] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const isMasterImpersonating = !!localStorage.getItem('master_token');

  useEffect(() => {
    api.get('/dashboard/stats')
      .then((res) => {
        const s = res.data.data.statuses;
        setOpenCount((s.aberta || 0) + (s.aprovada || 0) + (s.aguardando_peca || 0));
      })
      .catch(() => {});

    // Carregar módulos e nome da empresa
    // Sempre buscar os módulos do tenant via API (inclui impersonate)
    api.get('/auth/me')
      .then((res) => {
        if (res.data.data.tenant?.modules) {
          const mods = res.data.data.tenant.modules;
          setModules(typeof mods === 'string' ? JSON.parse(mods) : mods);
        }
      })
      .catch(() => {});

    // Pegar nome da empresa das configurações
    api.get('/company')
      .then((res) => {
        if (res.data.data?.name) {
          setCompanyName(res.data.data.name);
          // Se está impersonando, guardar o nome do tenant
          if (isMasterImpersonating) {
            setImpersonatingTenant(res.data.data.name);
          }
        }
        if (res.data.data?.logo_url) setCompanyLogo(res.data.data.logo_url);
      })
      .catch(() => {});
  }, [isMasterImpersonating]);

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
          {companyLogo && (
            <img 
              src={companyLogo} 
              alt="Logo" 
              style={{ 
                maxWidth: '140px', 
                maxHeight: '50px', 
                objectFit: 'contain',
                marginBottom: '0.5rem'
              }} 
            />
          )}
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
          {modules.includes('faturamento') && (
            <NavLink to="/faturamento" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <FiBarChart2 /> <span>Faturamento</span>
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
        {/* Barra de aviso de Impersonate */}
        {isMasterImpersonating && impersonatingTenant && (
          <div 
            className="impersonate-banner"
            role="alert"
            aria-live="polite"
            style={{
              background: 'linear-gradient(90deg, #f59e0b, #d97706)',
              color: 'white',
              padding: '0.6rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              fontSize: '0.85rem',
              fontWeight: 500,
              position: 'sticky',
              top: 0,
              zIndex: 100,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <FiAlertTriangle size={18} />
            <span>
              Você está acessando como <strong>"{impersonatingTenant}"</strong>
            </span>
            <button
              onClick={handleBackToMaster}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.4)',
                color: 'white',
                padding: '0.3rem 0.75rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                marginLeft: '0.5rem'
              }}
            >
              Sair do modo impersonate
            </button>
          </div>
        )}
        
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
        {modules.includes('financeiro') && (
          <NavLink to="/financeiro" className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}>
            <FiDollarSign />
            <span>Financ.</span>
          </NavLink>
        )}
        <button 
          className={`mobile-nav-link ${showMobileMenu ? 'active' : ''}`}
          onClick={() => setShowMobileMenu(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <FiMoreHorizontal />
          <span>Mais</span>
        </button>
      </nav>

      {/* Mobile menu drawer */}
      {showMobileMenu && (
        <>
          <div 
            className="mobile-menu-overlay"
            onClick={() => setShowMobileMenu(false)}
          />
          <div className="mobile-menu-drawer">
            <div className="mobile-menu-header">
              <h3>Menu</h3>
              <button onClick={() => setShowMobileMenu(false)} className="mobile-menu-close">
                <FiX />
              </button>
            </div>
            <div className="mobile-menu-items">
              {modules.includes('faturamento') && (
                <NavLink 
                  to="/faturamento" 
                  className="mobile-menu-item"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <FiBarChart2 /> Faturamento
                </NavLink>
              )}
              <NavLink 
                to="/tecnicos" 
                className="mobile-menu-item"
                onClick={() => setShowMobileMenu(false)}
              >
                <FiTool /> Técnicos
              </NavLink>
              <NavLink 
                to="/equipamentos" 
                className="mobile-menu-item"
                onClick={() => setShowMobileMenu(false)}
              >
                <FiMonitor /> Equipamentos
              </NavLink>
              <NavLink 
                to="/configuracoes" 
                className="mobile-menu-item"
                onClick={() => setShowMobileMenu(false)}
              >
                <FiSettings /> Configurações
              </NavLink>
              <button 
                onClick={() => { setShowMobileMenu(false); handleLogout(); }} 
                className="mobile-menu-item"
                style={{ color: '#dc2626' }}
              >
                <FiLogOut /> Sair
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
