import { useEffect, useState } from 'react';
import { STATUSES, serviceOrdersService } from '../services/serviceOrders.service';
import './StatusTimeline.css';

interface StatusHistoryItem {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
}

interface StatusTimelineProps {
  serviceOrderId: string;
  currentStatus: string;
}

// Ordem padrão dos status (fluxo típico)
const STATUS_ORDER = ['aberta', 'aprovada', 'aguardando_peca', 'concluida', 'entregue', 'cancelada'];

export default function StatusTimeline({ serviceOrderId, currentStatus }: StatusTimelineProps) {
  const [history, setHistory] = useState<StatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [serviceOrderId]);

  const loadHistory = async () => {
    try {
      const response = await serviceOrdersService.getStatusHistory(serviceOrderId);
      setHistory(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cria um mapa de status -> data da mudança
  const statusDates: Record<string, string> = {};
  history.forEach(item => {
    if (!statusDates[item.to_status]) {
      statusDates[item.to_status] = item.changed_at;
    }
  });

  // Determina o índice do status atual na ordem
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  // Formata data para exibição
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  if (loading) {
    return <div className="status-timeline-loading">Carregando...</div>;
  }

  // Filtra status que fazem sentido mostrar (não mostra cancelada se não foi cancelada)
  const visibleStatuses = STATUS_ORDER.filter(status => {
    // Sempre mostra se já passou por esse status
    if (statusDates[status]) return true;
    // Mostra status futuros no fluxo normal (não mostra cancelada como futuro)
    if (status === 'cancelada') return false;
    // Mostra se é o próximo no fluxo
    const statusIndex = STATUS_ORDER.indexOf(status);
    return statusIndex >= currentIndex && statusIndex <= 4; // Até entregue
  });

  return (
    <div className="status-timeline">
      <div className="timeline-track">
        {visibleStatuses.map((status, index) => {
          const statusInfo = STATUSES.find(s => s.value === status);
          const isDone = statusDates[status] !== undefined;
          const isCurrent = status === currentStatus;
          const date = statusDates[status];

          return (
            <div 
              key={status} 
              className={`timeline-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
            >
              {/* Linha conectora (exceto no primeiro) */}
              {index > 0 && (
                <div className={`timeline-connector ${isDone ? 'done' : ''}`} />
              )}
              
              {/* Dot */}
              <div 
                className="timeline-dot"
                style={{ 
                  backgroundColor: isDone || isCurrent ? statusInfo?.color : undefined 
                }}
              >
                {isCurrent ? statusInfo?.emoji : (isDone ? '✓' : '')}
              </div>
              
              {/* Label */}
              <span className="timeline-label">{statusInfo?.label}</span>
              
              {/* Data */}
              <span className="timeline-date">
                {date ? formatDate(date) : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
