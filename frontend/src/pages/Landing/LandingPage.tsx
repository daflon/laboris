import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiClipboard, FiDollarSign, FiSmartphone, FiTool, FiBarChart2, FiUsers, FiArrowRight, FiPlay, FiStar } from 'react-icons/fi';
import { authService } from '../../services/auth.service';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();

  // Se já estiver logado, redireciona pro dashboard
  useEffect(() => {
    if (authService.isAuthenticated()) {
      const user = authService.getUser();
      if (user?.role === 'super_admin' && !localStorage.getItem('master_token')) {
        navigate('/master', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [navigate]);

  const features = [
    {
      icon: <FiClipboard />,
      title: 'Ordens de Serviço',
      description: 'Crie, acompanhe e imprima PDF profissional em segundos.'
    },
    {
      icon: <FiDollarSign />,
      title: 'Financeiro Integrado',
      description: 'Controle receitas, despesas e veja seu saldo em tempo real.'
    },
    {
      icon: <FiSmartphone />,
      title: 'Funciona no Celular',
      description: 'Acesse de qualquer lugar. Instale como app no seu celular.'
    },
    {
      icon: <FiTool />,
      title: 'Histórico de Equipamentos',
      description: 'Saiba tudo que já foi feito em cada aparelho do cliente.'
    },
    {
      icon: <FiBarChart2 />,
      title: 'Relatórios',
      description: 'Faturamento por técnico, por período, exportável.'
    },
    {
      icon: <FiUsers />,
      title: 'Multi-usuário',
      description: 'Cada funcionário com seu acesso e permissões.'
    }
  ];

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-container">
          <div className="landing-logo">
            <span className="logo-icon">⚙️</span>
            <span className="logo-text">Laboris</span>
          </div>
          <nav className="landing-nav">
            <a href="#features">Recursos</a>
            <Link to="/login" className="btn-login">Entrar</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-container">
          <div className="hero-content">
            <h1>
              Controle sua assistência técnica
              <span className="hero-highlight"> do orçamento ao pagamento</span>
            </h1>
            <p className="hero-subtitle">
              Sistema simples para gestão de ordens de serviço. 
              Sem complicação. Feito para assistências técnicas.
            </p>
            <div className="hero-cta">
              <Link to="/login" className="btn-primary btn-lg">
                Acessar sistema <FiArrowRight />
              </Link>
              <a href="#features" className="btn-secondary btn-lg">
                <FiPlay /> Ver recursos
              </a>
            </div>
          </div>
          <div className="hero-image">
            <div className="hero-mockup">
              <div className="mockup-header">
                <div className="mockup-dots">
                  <span></span><span></span><span></span>
                </div>
                <span className="mockup-title">Laboris</span>
              </div>
              <div className="mockup-body">
                <div className="mockup-sidebar">
                  <div className="mockup-menu-item active"></div>
                  <div className="mockup-menu-item"></div>
                  <div className="mockup-menu-item"></div>
                  <div className="mockup-menu-item"></div>
                </div>
                <div className="mockup-content">
                  <div className="mockup-cards">
                    <div className="mockup-card blue"></div>
                    <div className="mockup-card green"></div>
                    <div className="mockup-card orange"></div>
                  </div>
                  <div className="mockup-table">
                    <div className="mockup-row"></div>
                    <div className="mockup-row"></div>
                    <div className="mockup-row"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="landing-features">
        <div className="landing-container">
          <div className="section-header">
            <h2>Tudo que você precisa para gerenciar sua assistência</h2>
            <p>Simples de usar, poderoso nos resultados</p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="landing-testimonial">
        <div className="landing-container">
          <div className="testimonial-card">
            <div className="testimonial-stars">
              <FiStar className="star-filled" />
              <FiStar className="star-filled" />
              <FiStar className="star-filled" />
              <FiStar className="star-filled" />
              <FiStar className="star-filled" />
            </div>
            <blockquote className="testimonial-quote">
              "Controlar o que tenho que pagar ficou muito fácil. Sempre que olho aqui consigo ver quanto tenho pendente. Tá ficando muito bom!"
            </blockquote>
            <div className="testimonial-author">
              <div className="author-avatar">FQ</div>
              <div className="author-info">
                <strong>Felipe Queiroz</strong>
                <span>Eletrotécnica São Miguel - RJ</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="landing-proof">
        <div className="landing-container">
          <div className="proof-stats">
            <div className="proof-stat">
              <span className="stat-number">500+</span>
              <span className="stat-label">Ordens de serviço criadas</span>
            </div>
            <div className="proof-divider"></div>
            <div className="proof-stat">
              <span className="stat-number">100%</span>
              <span className="stat-label">Online e seguro</span>
            </div>
            <div className="proof-divider"></div>
            <div className="proof-stat">
              <span className="stat-number">24/7</span>
              <span className="stat-label">Disponível sempre</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="landing-cta">
        <div className="landing-container">
          <div className="cta-content">
            <h2>Pronto para organizar sua assistência?</h2>
            <p>Acesse o sistema e comece a usar agora mesmo.</p>
            <Link to="/login" className="btn-primary btn-lg">
              Acessar sistema <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-content">
            <div className="footer-brand">
              <span className="logo-icon">⚙️</span>
              <span className="logo-text">Laboris</span>
              <p>Sistema de gestão para assistências técnicas</p>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>Produto</h4>
                <a href="#features">Recursos</a>
              </div>
              <div className="footer-column">
                <h4>Suporte</h4>
                <a href="mailto:suporte@laboris.com.br">Contato</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 Laboris. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
