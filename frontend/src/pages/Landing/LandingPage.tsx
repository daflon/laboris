import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiCheck, FiClipboard, FiDollarSign, FiSmartphone, FiTool, FiBarChart2, FiUsers, FiArrowRight, FiPlay } from 'react-icons/fi';
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

  const plans = [
    {
      id: 'free',
      name: 'Grátis',
      price: 'R$ 0',
      period: 'para sempre',
      description: 'Para começar a organizar',
      features: [
        'Até 30 OS por mês',
        '1 usuário',
        'Clientes e equipamentos',
        'PDF básico',
        'Suporte por email'
      ],
      notIncluded: [
        'Módulo financeiro',
        'Logo no PDF',
        'Relatórios'
      ],
      cta: 'Começar grátis',
      popular: false
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 'R$ 49,90',
      period: '/mês',
      description: 'Para quem quer crescer',
      features: [
        'OS ilimitadas',
        'Até 3 usuários',
        'Módulo financeiro completo',
        'PDF com sua logo',
        'Faturamento por técnico',
        'Suporte por WhatsApp'
      ],
      notIncluded: [
        'API para integrações'
      ],
      cta: 'Assinar Pro',
      popular: true
    },
    {
      id: 'business',
      name: 'Business',
      price: 'R$ 99,90',
      period: '/mês',
      description: 'Para equipes maiores',
      features: [
        'Tudo do Pro',
        'Usuários ilimitados',
        'Múltiplas filiais',
        'Relatórios avançados',
        'API para integrações',
        'Suporte prioritário'
      ],
      notIncluded: [],
      cta: 'Assinar Business',
      popular: false
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
            <a href="#pricing">Preços</a>
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
              Sem complicação. Sem mensalidade cara. Comece grátis.
            </p>
            <div className="hero-cta">
              <Link to="/login" className="btn-primary btn-lg">
                Criar conta grátis <FiArrowRight />
              </Link>
              <a href="#features" className="btn-secondary btn-lg">
                <FiPlay /> Ver recursos
              </a>
            </div>
            <p className="hero-note">✓ Não precisa de cartão &nbsp;&nbsp; ✓ Cancele quando quiser</p>
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

      {/* Social Proof */}
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

      {/* Pricing */}
      <section id="pricing" className="landing-pricing">
        <div className="landing-container">
          <div className="section-header">
            <h2>Planos que cabem no seu bolso</h2>
            <p>Comece grátis e faça upgrade quando precisar</p>
          </div>
          <div className="pricing-grid">
            {plans.map((plan) => (
              <div 
                key={plan.id} 
                className={`pricing-card ${plan.popular ? 'popular' : ''}`}
              >
                {plan.popular && <div className="popular-badge">Mais popular</div>}
                <div className="pricing-header">
                  <h3>{plan.name}</h3>
                  <p className="pricing-description">{plan.description}</p>
                  <div className="pricing-price">
                    <span className="price-value">{plan.price}</span>
                    <span className="price-period">{plan.period}</span>
                  </div>
                </div>
                <div className="pricing-features">
                  <ul>
                    {plan.features.map((feature, index) => (
                      <li key={index} className="included">
                        <FiCheck /> {feature}
                      </li>
                    ))}
                    {plan.notIncluded.map((feature, index) => (
                      <li key={index} className="not-included">
                        <span className="x-mark">✕</span> {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link 
                  to="/login" 
                  className={`btn-pricing ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="landing-cta">
        <div className="landing-container">
          <div className="cta-content">
            <h2>Pronto para organizar sua assistência?</h2>
            <p>Crie sua conta em menos de 1 minuto. Sem cartão de crédito.</p>
            <Link to="/login" className="btn-primary btn-lg">
              Começar grátis agora <FiArrowRight />
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
                <a href="#pricing">Preços</a>
              </div>
              <div className="footer-column">
                <h4>Suporte</h4>
                <a href="mailto:suporte@laboris.com.br">Contato</a>
              </div>
              <div className="footer-column">
                <h4>Legal</h4>
                <a href="#">Termos de uso</a>
                <a href="#">Privacidade</a>
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
