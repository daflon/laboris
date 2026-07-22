import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';
import api from '../services/api';
import { formatDocument } from '../utils/masks';
import { STATUSES } from '../services/serviceOrders.service';

interface SearchResults {
  clients: Array<{ id: string; name: string; document: string; phone: string }>;
  equipment: Array<{ id: string; type: string; brand: string; model: string; client_name: string }>;
  orders: Array<{ id: string; order_number: number; status: string; client_name: string; equipment_type: string; equipment_brand: string }>;
}

function getStatusLabel(status: string) {
  return STATUSES.find((s) => s.value === status)?.label || status;
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      setIsOpen(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const response = await api.get('/search', { params: { q: query } });
        setResults(response.data.data);
        setIsOpen(true);
      } catch {
        setResults(null);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (path: string) => {
    setQuery('');
    setIsOpen(false);
    navigate(path);
  };

  const hasResults = results && (results.clients.length > 0 || results.equipment.length > 0 || results.orders.length > 0);

  return (
    <div className="global-search" ref={wrapperRef}>
      <div className="global-search-input">
        <FiSearch className="global-search-icon" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cliente, OS, equipamento, telefone..."
          onFocus={() => results && setIsOpen(true)}
        />
      </div>

      {isOpen && (
        <div className="global-search-dropdown">
          {!hasResults ? (
            <div className="global-search-empty">Nenhum resultado para "{query}"</div>
          ) : (
            <>
              {results!.orders.length > 0 && (
                <div className="global-search-section">
                  <div className="global-search-section-title">Ordens de Serviço</div>
                  {results!.orders.map((os) => (
                    <div key={os.id} className="global-search-item" onClick={() => handleSelect(`/os/${os.id}`)}>
                      <strong>#{String(os.order_number).padStart(4, '0')}</strong>
                      <span>{os.client_name} — {os.equipment_brand} {os.equipment_type}</span>
                      <span className="global-search-badge">{getStatusLabel(os.status)}</span>
                    </div>
                  ))}
                </div>
              )}
              {results!.clients.length > 0 && (
                <div className="global-search-section">
                  <div className="global-search-section-title">Clientes</div>
                  {results!.clients.map((c) => (
                    <div key={c.id} className="global-search-item" onClick={() => handleSelect(`/clientes/${c.id}`)}>
                      <strong>{c.name}</strong>
                      <span>{formatDocument(c.document)}</span>
                    </div>
                  ))}
                </div>
              )}
              {results!.equipment.length > 0 && (
                <div className="global-search-section">
                  <div className="global-search-section-title">Equipamentos</div>
                  {results!.equipment.map((eq) => (
                    <div key={eq.id} className="global-search-item" onClick={() => handleSelect(`/equipamentos/${eq.id}/historico`)}>
                      <strong>{eq.type} {eq.brand} {eq.model}</strong>
                      <span>{eq.client_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
