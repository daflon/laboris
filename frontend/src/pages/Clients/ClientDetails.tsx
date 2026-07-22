import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiEdit2, FiArrowLeft, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { clientsService, Client } from '../../services/clients.service';
import { Equipment } from '../../services/equipment.service';
import PageHeader from '../../components/PageHeader';
import { formatDocument, formatPhone } from '../../utils/masks';

export default function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client & { equipment?: Equipment[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientsService.getById(id!)
      .then((response) => setClient(response.data))
      .catch(() => toast.error('Erro ao carregar cliente'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="loading-text">Carregando...</p>;
  if (!client) return <p className="empty-text">Cliente não encontrado.</p>;

  return (
    <div>
      <PageHeader title={client.name}>
        <button className="btn btn-secondary" onClick={() => navigate('/clientes')}>
          <FiArrowLeft /> Voltar
        </button>
        <Link to={`/clientes/${id}/editar`} className="btn btn-primary">
          <FiEdit2 /> Editar
        </Link>
      </PageHeader>

      <div className="detail-card">
        <div className="detail-section">
          <h3>Dados Pessoais</h3>
          <div className="detail-grid">
            <div><strong>Documento:</strong> {formatDocument(client.document)}</div>
            <div><strong>Telefone:</strong> {formatPhone(client.phone)}</div>
            <div><strong>Email:</strong> {client.email || '—'}</div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Endereço</h3>
          <div className="detail-grid">
            <div>
              <strong>Endereço:</strong>{' '}
              {client.address_street
                ? `${client.address_street}, ${client.address_number || 'S/N'}${client.address_complement ? ` - ${client.address_complement}` : ''}`
                : '—'}
            </div>
            <div><strong>Bairro:</strong> {client.address_neighborhood || '—'}</div>
            <div><strong>Cidade/UF:</strong> {client.address_city || '—'}{client.address_state ? `/${client.address_state}` : ''}</div>
            <div><strong>CEP:</strong> {client.address_zip || '—'}</div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Equipamentos ({client.equipment?.length || 0})</h3>
          {client.equipment && client.equipment.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Marca</th>
                  <th>Modelo</th>
                  <th>Nº Série</th>
                  <th>Histórico</th>
                </tr>
              </thead>
              <tbody>
                {client.equipment.map((eq) => (
                  <tr key={eq.id}>
                    <td>{eq.type}</td>
                    <td>{eq.brand}</td>
                    <td>{eq.model}</td>
                    <td>{eq.serial_number || '—'}</td>
                    <td>
                      <button className="btn-icon" title="Ver histórico de reparos" onClick={() => navigate(`/equipamentos/${eq.id}/historico`)}>
                        <FiClock />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-text">Nenhum equipamento cadastrado.</p>
          )}
        </div>
      </div>
    </div>
  );
}
