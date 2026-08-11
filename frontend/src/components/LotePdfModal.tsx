import { useState, useEffect } from 'react';
import { FiX, FiPrinter, FiFileText, FiList } from 'react-icons/fi';
import { ServiceOrder, STATUSES, formatOrderNumber } from '../services/serviceOrders.service';

interface LoteItem {
  id: string;
  lote_sufixo: string;
  status: string;
  equipment_type: string;
  equipment_brand: string;
  equipment_model: string;
}

interface LotePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ServiceOrder;
  onPrint: (options: { formato: 'individual' | 'resumo'; selectedIds: string[] }) => void;
}

function getStatusLabel(status: string) {
  const s = STATUSES.find((s) => s.value === status);
  return s ? `${s.emoji} ${s.label}` : status;
}

function getStatusColor(status: string) {
  return STATUSES.find((s) => s.value === status)?.color || '#6b7280';
}

export default function LotePdfModal({ isOpen, onClose, order, onPrint }: LotePdfModalProps) {
  const [formato, setFormato] = useState<'individual' | 'resumo'>('individual');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Construir lista completa de itens do lote (item atual + outros)
  const allLoteItems: LoteItem[] = [
    {
      id: order.id,
      lote_sufixo: order.lote_sufixo || 'A',
      status: order.status,
      equipment_type: order.equipment_type || '',
      equipment_brand: order.equipment_brand || '',
      equipment_model: order.equipment_model || '',
    },
    ...(order.lote_items || []),
  ].sort((a, b) => a.lote_sufixo.localeCompare(b.lote_sufixo));

  // Inicializar com todos selecionados
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(allLoteItems.map((item) => item.id)));
      setFormato('individual');
    }
  }, [isOpen]);

  const toggleItem = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectByStatus = (status: string) => {
    const ids = allLoteItems.filter((item) => item.status === status).map((item) => item.id);
    setSelectedIds(new Set(ids));
  };

  const selectAll = () => {
    setSelectedIds(new Set(allLoteItems.map((item) => item.id)));
  };

  const handlePrint = () => {
    if (selectedIds.size === 0) return;
    onPrint({ formato, selectedIds: Array.from(selectedIds) });
    onClose();
  };

  if (!isOpen) return null;

  // Agrupar por status para mostrar contagens
  const statusCounts: Record<string, number> = {};
  allLoteItems.forEach((item) => {
    statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>PDF do Lote #{String(order.lote_numero).padStart(4, '0')}</h2>
          <button className="modal-close" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem' }}>
          {/* Formato */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'block' }}>
              Formato do PDF:
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label
                style={{
                  flex: 1,
                  padding: '1rem',
                  border: formato === 'individual' ? '2px solid #2563eb' : '2px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: formato === 'individual' ? '#eff6ff' : 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <input
                  type="radio"
                  name="formato"
                  value="individual"
                  checked={formato === 'individual'}
                  onChange={() => setFormato('individual')}
                  style={{ display: 'none' }}
                />
                <FiFileText size={24} color={formato === 'individual' ? '#2563eb' : '#64748b'} />
                <span style={{ fontWeight: 500 }}>Individual</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
                  Uma página por OS
                </span>
              </label>

              <label
                style={{
                  flex: 1,
                  padding: '1rem',
                  border: formato === 'resumo' ? '2px solid #2563eb' : '2px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: formato === 'resumo' ? '#eff6ff' : 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <input
                  type="radio"
                  name="formato"
                  value="resumo"
                  checked={formato === 'resumo'}
                  onChange={() => setFormato('resumo')}
                  style={{ display: 'none' }}
                />
                <FiList size={24} color={formato === 'resumo' ? '#2563eb' : '#64748b'} />
                <span style={{ fontWeight: 500 }}>Resumo</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
                  Tabela com valor total
                </span>
              </label>
            </div>
          </div>

          {/* Filtros rápidos por status */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
              Filtrar por status:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: '#e2e8f0' }}
                onClick={selectAll}
              >
                Todos ({allLoteItems.length})
              </button>
              {Object.entries(statusCounts).map(([status, count]) => (
                <button
                  key={status}
                  type="button"
                  className="btn"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.3rem 0.6rem',
                    background: getStatusColor(status),
                    color: 'white',
                  }}
                  onClick={() => selectByStatus(status)}
                >
                  {getStatusLabel(status)} ({count})
                </button>
              ))}
            </div>
          </div>

          {/* Lista de itens */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
              Equipamentos ({selectedIds.size} selecionados):
            </label>
            <div
              style={{
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
              }}
            >
              {allLoteItems.map((item) => (
                <label
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    background: selectedIds.has(item.id) ? '#f0f9ff' : 'white',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleItem(item.id)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>
                      {formatOrderNumber({ order_number: order.order_number, lote_sufixo: item.lote_sufixo })}
                      <span style={{ marginLeft: '0.5rem', fontWeight: 400, color: '#64748b' }}>
                        {item.equipment_brand} {item.equipment_model}
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      background: getStatusColor(item.status),
                      color: 'white',
                    }}
                  >
                    {getStatusLabel(item.status)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={handlePrint}
            disabled={selectedIds.size === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FiPrinter />
            Gerar PDF ({selectedIds.size})
          </button>
        </div>
      </div>
    </div>
  );
}
