import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiCalendar, FiAlertTriangle, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { alugueisService, CalendarioItem, formatAluguelNumero } from '../../services/alugueis.service';

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export default function CalendarioAlugueis() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState<CalendarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    loadCalendario();
  }, [year, month]);

  const loadCalendario = async () => {
    try {
      setLoading(true);
      const response = await alugueisService.getCalendario(year, month + 1);
      setItems(response.data.items || []);
    } catch (error) {
      toast.error('Erro ao carregar calendário');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today.getDate());
  };

  // Calcular dias do mês
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Agrupar itens por data de devolução
  const itemsByDay: Record<number, CalendarioItem[]> = {};
  items.forEach(item => {
    const date = new Date(item.data_prevista_devolucao);
    if (date.getFullYear() === year && date.getMonth() === month) {
      const day = date.getDate();
      if (!itemsByDay[day]) itemsByDay[day] = [];
      itemsByDay[day].push(item);
    }
  });

  // Calcular estatísticas do mês
  const totalDevolucoesEsteMes = items.length;
  const atrasados = items.filter(i => i.status === 'atrasado').length;
  const valorTotal = items.reduce((sum, i) => sum + i.valor_acordado, 0);

  // Itens do dia selecionado
  const selectedDayItems = selectedDay ? itemsByDay[selectedDay] || [] : [];

  return (
    <div className="calendario-container">
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={prevMonth}>
            <FiChevronLeft />
          </button>
          <h2 style={{ margin: 0, minWidth: '200px', textAlign: 'center' }}>
            {MONTHS[month]} {year}
          </h2>
          <button className="btn btn-secondary" onClick={nextMonth}>
            <FiChevronRight />
          </button>
        </div>
        <button className="btn btn-primary" onClick={goToToday}>
          <FiCalendar /> Hoje
        </button>
      </div>

      {/* Estatísticas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '1rem',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
            {totalDevolucoesEsteMes}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Devoluções este mês
          </div>
        </div>
        <div style={{
          background: atrasados > 0 ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-secondary)',
          padding: '1rem',
          borderRadius: '8px',
          textAlign: 'center',
          border: atrasados > 0 ? '1px solid #ef4444' : 'none'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: atrasados > 0 ? '#ef4444' : 'var(--text-primary)' }}>
            {atrasados}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Atrasados
          </div>
        </div>
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '1rem',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#22c55e' }}>
            {formatCurrency(valorTotal)}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Valor previsto
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        {/* Calendário */}
        <div style={{ flex: '1', minWidth: '320px' }}>
          {/* Dias da semana */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '2px',
            marginBottom: '0.5rem'
          }}>
            {DAYS_OF_WEEK.map(day => (
              <div key={day} style={{
                textAlign: 'center',
                fontWeight: '600',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                padding: '0.5rem'
              }}>
                {day}
              </div>
            ))}
          </div>

          {/* Grid do calendário */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '2px',
            background: 'var(--border-color)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {/* Dias vazios antes do primeiro dia */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} style={{
                background: 'var(--bg-secondary)',
                minHeight: '80px',
                opacity: 0.5
              }} />
            ))}

            {/* Dias do mês */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayItems = itemsByDay[day] || [];
              const hasItems = dayItems.length > 0;
              const hasAtrasados = dayItems.some(item => item.status === 'atrasado');
              const isToday = isCurrentMonth && today.getDate() === day;
              const isSelected = selectedDay === day;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  style={{
                    background: isSelected ? 'var(--color-primary)' : 'var(--bg-primary)',
                    minHeight: '80px',
                    padding: '0.5rem',
                    cursor: hasItems ? 'pointer' : 'default',
                    position: 'relative',
                    transition: 'all 0.2s',
                    border: isToday ? '2px solid var(--color-primary)' : 'none'
                  }}
                >
                  <div style={{
                    fontWeight: isToday ? '700' : '500',
                    fontSize: '0.9rem',
                    color: isSelected ? 'white' : (isToday ? 'var(--color-primary)' : 'var(--text-primary)')
                  }}>
                    {day}
                  </div>

                  {hasItems && (
                    <div style={{ marginTop: '0.25rem' }}>
                      {dayItems.slice(0, 2).map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            marginBottom: '2px',
                            background: item.status === 'atrasado' 
                              ? (isSelected ? 'rgba(255,255,255,0.3)' : '#fecaca')
                              : (isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(59, 130, 246, 0.15)'),
                            color: isSelected ? 'white' : (item.status === 'atrasado' ? '#dc2626' : 'var(--text-primary)'),
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {item.status === 'atrasado' && <FiAlertTriangle size={10} style={{ marginRight: '2px' }} />}
                          {item.patrimonio_codigo}
                        </div>
                      ))}
                      {dayItems.length > 2 && (
                        <div style={{
                          fontSize: '0.65rem',
                          color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)'
                        }}>
                          +{dayItems.length - 2} mais
                        </div>
                      )}
                    </div>
                  )}

                  {hasAtrasados && !isSelected && (
                    <div style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '8px',
                      height: '8px',
                      background: '#ef4444',
                      borderRadius: '50%'
                    }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Legenda */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginTop: '1rem',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ width: '12px', height: '12px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '3px' }} />
              <span>Devolução prevista</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ width: '12px', height: '12px', background: '#fecaca', borderRadius: '3px' }} />
              <span>Atrasado</span>
            </div>
          </div>
        </div>

        {/* Painel lateral - Detalhes do dia */}
        <div style={{ width: '300px', minWidth: '280px' }}>
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            padding: '1rem',
            position: 'sticky',
            top: '1rem'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>
              {selectedDay 
                ? `${selectedDay} de ${MONTHS[month]}`
                : 'Selecione um dia'
              }
            </h3>

            {loading ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Carregando...</p>
            ) : selectedDayItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedDayItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/alugueis/${item.id}`)}
                    style={{
                      background: 'var(--bg-primary)',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: item.status === 'atrasado' ? '1px solid #ef4444' : '1px solid var(--border-color)',
                      transition: 'transform 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                        #{formatAluguelNumero(item.numero)}
                      </span>
                      {item.status === 'atrasado' && (
                        <span style={{
                          background: '#ef4444',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}>
                          <FiAlertTriangle size={10} /> Atrasado
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      <strong>{item.patrimonio_codigo}</strong> - {item.patrimonio_nome}
                    </div>
                    <div style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      {item.client_name}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--color-primary)' }}>
                      {formatCurrency(item.valor_acordado)}
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedDay ? (
              <div style={{ 
                textAlign: 'center', 
                color: 'var(--text-secondary)', 
                padding: '2rem 1rem'
              }}>
                <FiClock size={32} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  Nenhuma devolução prevista para este dia
                </p>
              </div>
            ) : (
              <p style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '0.9rem',
                textAlign: 'center',
                padding: '2rem 1rem'
              }}>
                Clique em um dia para ver os detalhes
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
