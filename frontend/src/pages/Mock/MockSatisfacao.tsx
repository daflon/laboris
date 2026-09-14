import { useState } from 'react';
import { FiSettings, FiSend, FiStar, FiSmartphone, FiExternalLink, FiCheck, FiCopy } from 'react-icons/fi';
import './MockSatisfacao.css';

// Dados de exemplo para simular uma OS
const osExemplo = {
  numero: '2024-0847',
  cliente: 'João Silva',
  telefone: '11999887766',
  equipamento: 'iPhone 13 Pro',
  problema: 'Troca de tela',
  valor: 450.00,
  tecnico: 'Carlos',
  dataEntrega: new Date().toLocaleDateString('pt-BR')
};

// Template padrão
const templatePadrao = `Olá, {cliente}! 👋

Aqui é da *{empresa}*. Passando para avisar que seu *{equipamento}* (OS #{numero}) foi entregue!

Esperamos que esteja funcionando perfeitamente. 🛠️✨

Queremos muito saber como foi sua experiência:

⭐ *Avalie nosso atendimento:*
{link_avaliacao}

📍 *Nos ajude no Google também:*
{link_google}

Muito obrigado pela confiança! 🙏`;

export default function MockSatisfacao() {
  const [activeTab, setActiveTab] = useState<'config' | 'botao' | 'avaliacao'>('config');
  
  // Estado da configuração
  const [config, setConfig] = useState({
    empresa: 'TechFix Assistência',
    googleLink: 'https://g.page/r/CeXXXXX/review',
    template: templatePadrao,
    avaliacaoInterna: true
  });

  // Estado da simulação de envio
  const [enviado, setEnviado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // Estado da avaliação do cliente
  const [avaliacao, setAvaliacao] = useState({
    nota: 0,
    notaHover: 0,
    comentario: '',
    enviada: false
  });

  // Monta a mensagem final substituindo variáveis
  const montarMensagem = () => {
    let msg = config.template
      .replace(/{cliente}/g, osExemplo.cliente)
      .replace(/{empresa}/g, config.empresa)
      .replace(/{equipamento}/g, osExemplo.equipamento)
      .replace(/{numero}/g, osExemplo.numero)
      .replace(/{link_google}/g, config.googleLink)
      .replace(/{link_avaliacao}/g, config.avaliacaoInterna 
        ? `https://seusite.com/avaliar/${osExemplo.numero}` 
        : '(desativado)');
    return msg;
  };

  // Gera link do WhatsApp
  const gerarLinkWhatsApp = () => {
    const msg = encodeURIComponent(montarMensagem());
    const tel = osExemplo.telefone.replace(/\D/g, '');
    return `https://wa.me/55${tel}?text=${msg}`;
  };

  // Copiar mensagem
  const copiarMensagem = () => {
    navigator.clipboard.writeText(montarMensagem());
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  // Simular envio
  const simularEnvio = () => {
    setEnviado(true);
  };

  // Enviar avaliação
  const enviarAvaliacao = () => {
    if (avaliacao.nota > 0) {
      setAvaliacao(prev => ({ ...prev, enviada: true }));
    }
  };

  return (
    <div className="mock-satisfacao">
      {/* Header */}
      <div className="mock-header">
        <div className="mock-header-content">
          <h1>🧪 Mock: Pesquisa de Satisfação</h1>
          <p>Teste o fluxo completo antes de implementar no sistema</p>
        </div>
        <span className="mock-badge">DEMONSTRAÇÃO</span>
      </div>

      {/* Tabs */}
      <div className="mock-tabs">
        <button 
          className={`mock-tab ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          <FiSettings /> Configuração
        </button>
        <button 
          className={`mock-tab ${activeTab === 'botao' ? 'active' : ''}`}
          onClick={() => setActiveTab('botao')}
        >
          <FiSend /> Botão na OS
        </button>
        <button 
          className={`mock-tab ${activeTab === 'avaliacao' ? 'active' : ''}`}
          onClick={() => setActiveTab('avaliacao')}
        >
          <FiStar /> Página do Cliente
        </button>
      </div>

      {/* Conteúdo das Tabs */}
      <div className="mock-content">
        
        {/* === TAB: CONFIGURAÇÃO === */}
        {activeTab === 'config' && (
          <div className="mock-config">
            <div className="mock-config-grid">
              {/* Formulário */}
              <div className="mock-config-form">
                <h2>⚙️ Configurações do Tenant</h2>
                <p className="mock-subtitle">Estas configurações ficariam em Configurações → Pesquisa de Satisfação</p>

                <div className="form-group">
                  <label>Nome da Empresa</label>
                  <input 
                    type="text" 
                    value={config.empresa}
                    onChange={(e) => setConfig({...config, empresa: e.target.value})}
                    placeholder="Nome que aparece na mensagem"
                  />
                </div>

                <div className="form-group">
                  <label>
                    Link do Google Reviews
                    <a href="https://support.google.com/business/answer/7035772" target="_blank" rel="noopener noreferrer" className="help-link">
                      <FiExternalLink /> Como obter?
                    </a>
                  </label>
                  <input 
                    type="url" 
                    value={config.googleLink}
                    onChange={(e) => setConfig({...config, googleLink: e.target.value})}
                    placeholder="https://g.page/r/seu-link/review"
                  />
                  <small>Cole o link curto de avaliação do seu Google Negócios</small>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={config.avaliacaoInterna}
                      onChange={(e) => setConfig({...config, avaliacaoInterna: e.target.checked})}
                    />
                    <span>Incluir link de avaliação interna (NPS)</span>
                  </label>
                  <small>Se ativado, envia também um link para avaliar dentro do sistema</small>
                </div>

                <div className="form-group">
                  <label>
                    Template da Mensagem
                    <span className="label-hint">Variáveis disponíveis: {'{cliente}'}, {'{empresa}'}, {'{equipamento}'}, {'{numero}'}</span>
                  </label>
                  <textarea 
                    value={config.template}
                    onChange={(e) => setConfig({...config, template: e.target.value})}
                    rows={12}
                  />
                </div>

                <button className="btn btn-secondary" onClick={() => setConfig({...config, template: templatePadrao})}>
                  Restaurar Template Padrão
                </button>
              </div>

              {/* Preview */}
              <div className="mock-config-preview">
                <h2>📱 Preview da Mensagem</h2>
                <p className="mock-subtitle">Como o cliente vai receber no WhatsApp</p>

                <div className="whatsapp-preview">
                  <div className="whatsapp-header">
                    <div className="whatsapp-avatar">{config.empresa.charAt(0)}</div>
                    <div className="whatsapp-contact">
                      <strong>{config.empresa}</strong>
                      <span>online</span>
                    </div>
                  </div>
                  <div className="whatsapp-body">
                    <div className="whatsapp-bubble">
                      <pre>{montarMensagem()}</pre>
                      <span className="whatsapp-time">
                        {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        <FiCheck /><FiCheck />
                      </span>
                    </div>
                  </div>
                </div>

                <div className="preview-actions">
                  <button className="btn btn-secondary" onClick={copiarMensagem}>
                    {copiado ? <><FiCheck /> Copiado!</> : <><FiCopy /> Copiar Mensagem</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === TAB: BOTÃO NA OS === */}
        {activeTab === 'botao' && (
          <div className="mock-botao">
            <h2>📋 Simulação: OS na Listagem/Detalhe</h2>
            <p className="mock-subtitle">Como apareceria o botão quando a OS estiver com status "Entregue"</p>

            {/* Card da OS Exemplo */}
            <div className="os-card-exemplo">
              <div className="os-card-header">
                <div className="os-numero">
                  <span className="os-label">OS</span>
                  <strong>#{osExemplo.numero}</strong>
                </div>
                <span className="badge badge-success">✓ Entregue</span>
              </div>

              <div className="os-card-body">
                <div className="os-info-grid">
                  <div className="os-info">
                    <span className="os-info-label">Cliente</span>
                    <span className="os-info-value">{osExemplo.cliente}</span>
                  </div>
                  <div className="os-info">
                    <span className="os-info-label">Telefone</span>
                    <span className="os-info-value">{osExemplo.telefone}</span>
                  </div>
                  <div className="os-info">
                    <span className="os-info-label">Equipamento</span>
                    <span className="os-info-value">{osExemplo.equipamento}</span>
                  </div>
                  <div className="os-info">
                    <span className="os-info-label">Serviço</span>
                    <span className="os-info-value">{osExemplo.problema}</span>
                  </div>
                  <div className="os-info">
                    <span className="os-info-label">Valor</span>
                    <span className="os-info-value">R$ {osExemplo.valor.toFixed(2)}</span>
                  </div>
                  <div className="os-info">
                    <span className="os-info-label">Técnico</span>
                    <span className="os-info-value">{osExemplo.tecnico}</span>
                  </div>
                </div>
              </div>

              <div className="os-card-footer">
                {!enviado ? (
                  <div className="os-actions">
                    <a 
                      href={gerarLinkWhatsApp()} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-whatsapp"
                      onClick={simularEnvio}
                    >
                      <FiSmartphone /> Enviar Pesquisa de Satisfação
                    </a>
                    <small>Abre o WhatsApp com a mensagem pronta</small>
                  </div>
                ) : (
                  <div className="os-enviado">
                    <span className="badge badge-info">
                      <FiCheck /> Pesquisa enviada em {new Date().toLocaleString('pt-BR')}
                    </span>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEnviado(false)}>
                      Reenviar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Explicação */}
            <div className="mock-explicacao">
              <h3>💡 Como funcionaria:</h3>
              <ol>
                <li>Quando a OS muda para status <strong>"Entregue"</strong>, o botão verde aparece</li>
                <li>Você clica no botão → abre o WhatsApp Web/App com a mensagem montada</li>
                <li>Você confere e clica em Enviar no WhatsApp</li>
                <li>O sistema registra que a pesquisa foi enviada (evita reenvios acidentais)</li>
              </ol>
            </div>
          </div>
        )}

        {/* === TAB: PÁGINA DO CLIENTE === */}
        {activeTab === 'avaliacao' && (
          <div className="mock-avaliacao">
            <h2>⭐ Página de Avaliação (visão do cliente)</h2>
            <p className="mock-subtitle">O que o cliente veria ao clicar no link de avaliação interna</p>

            {/* Simulação da página de avaliação */}
            <div className="avaliacao-page">
              {!avaliacao.enviada ? (
                <>
                  <div className="avaliacao-header">
                    <div className="avaliacao-logo">{config.empresa.charAt(0)}</div>
                    <h2>{config.empresa}</h2>
                  </div>

                  <div className="avaliacao-body">
                    <div className="avaliacao-os-info">
                      <p>Olá, <strong>{osExemplo.cliente}</strong>!</p>
                      <p>Como foi sua experiência com o serviço?</p>
                      <div className="avaliacao-os-detalhe">
                        <span>OS #{osExemplo.numero}</span>
                        <span>{osExemplo.equipamento}</span>
                        <span>{osExemplo.problema}</span>
                      </div>
                    </div>

                    <div className="avaliacao-estrelas">
                      <p>Toque para avaliar:</p>
                      <div className="estrelas-container">
                        {[1, 2, 3, 4, 5].map((estrela) => (
                          <button
                            key={estrela}
                            className={`estrela ${(avaliacao.notaHover || avaliacao.nota) >= estrela ? 'ativa' : ''}`}
                            onClick={() => setAvaliacao({...avaliacao, nota: estrela})}
                            onMouseEnter={() => setAvaliacao({...avaliacao, notaHover: estrela})}
                            onMouseLeave={() => setAvaliacao({...avaliacao, notaHover: 0})}
                          >
                            <FiStar />
                          </button>
                        ))}
                      </div>
                      {avaliacao.nota > 0 && (
                        <span className="nota-texto">
                          {avaliacao.nota === 1 && '😞 Muito ruim'}
                          {avaliacao.nota === 2 && '😐 Ruim'}
                          {avaliacao.nota === 3 && '🙂 Regular'}
                          {avaliacao.nota === 4 && '😊 Bom'}
                          {avaliacao.nota === 5 && '🤩 Excelente!'}
                        </span>
                      )}
                    </div>

                    <div className="avaliacao-comentario">
                      <label>Quer deixar um comentário? (opcional)</label>
                      <textarea
                        value={avaliacao.comentario}
                        onChange={(e) => setAvaliacao({...avaliacao, comentario: e.target.value})}
                        placeholder="Conte-nos mais sobre sua experiência..."
                        rows={4}
                      />
                    </div>

                    <button 
                      className="btn btn-primary btn-lg"
                      onClick={enviarAvaliacao}
                      disabled={avaliacao.nota === 0}
                    >
                      Enviar Avaliação
                    </button>

                    <div className="avaliacao-google-cta">
                      <p>Gostou do atendimento?</p>
                      <a href={config.googleLink} target="_blank" rel="noopener noreferrer" className="btn btn-google">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                          <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                        </svg>
                        Avaliar no Google também
                      </a>
                    </div>
                  </div>
                </>
              ) : (
                <div className="avaliacao-sucesso">
                  <div className="sucesso-icon">🎉</div>
                  <h2>Obrigado pela avaliação!</h2>
                  <p>Sua opinião é muito importante para nós.</p>
                  
                  <div className="sucesso-resumo">
                    <p>Você avaliou com</p>
                    <div className="sucesso-estrelas">
                      {[1, 2, 3, 4, 5].map((e) => (
                        <FiStar key={e} className={e <= avaliacao.nota ? 'ativa' : ''} />
                      ))}
                    </div>
                    {avaliacao.comentario && (
                      <p className="sucesso-comentario">"{avaliacao.comentario}"</p>
                    )}
                  </div>

                  {avaliacao.nota >= 4 && (
                    <div className="sucesso-google">
                      <p>Que bom que gostou! 😊</p>
                      <p>Nos ajude a crescer deixando uma avaliação no Google:</p>
                      <a href={config.googleLink} target="_blank" rel="noopener noreferrer" className="btn btn-google btn-lg">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                          <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                        </svg>
                        Avaliar no Google
                      </a>
                    </div>
                  )}

                  <button className="btn btn-secondary" onClick={() => setAvaliacao({nota: 0, notaHover: 0, comentario: '', enviada: false})}>
                    Testar novamente
                  </button>
                </div>
              )}
            </div>

            {/* Explicação */}
            <div className="mock-explicacao">
              <h3>💡 Sobre a avaliação interna:</h3>
              <ul>
                <li>Permite coletar feedback estruturado (nota + comentário)</li>
                <li>Você pode ver um dashboard com NPS e satisfação por período</li>
                <li>Se a nota for alta (4-5), incentiva o cliente a avaliar no Google também</li>
                <li>Se a nota for baixa (1-2), você pode entrar em contato para resolver</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
