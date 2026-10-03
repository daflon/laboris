import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiSave, FiArrowLeft, FiCamera, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { patrimonioService, Patrimonio, STATUS_PATRIMONIO } from '../../services/alugueis.service';
import PageHeader from '../../components/PageHeader';

const CATEGORIAS = [
  'Gerador',
  'Compressor',
  'Ferramenta Elétrica',
  'Ferramenta Manual',
  'Equipamento de Solda',
  'Equipamento de Medição',
  'Máquina de Limpeza',
  'Outro'
];

export default function PatrimonioForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Patrimonio>>({
    codigo: '',
    nome: '',
    categoria: '',
    marca: '',
    modelo: '',
    numero_serie: '',
    valor_compra: undefined,
    valor_diaria: undefined,
    valor_semanal: undefined,
    valor_mensal: undefined,
    observacoes: '',
    foto_url: '',
    status: 'disponivel'
  });

  useEffect(() => {
    if (isEditing) {
      loadPatrimonio();
    }
  }, [id]);

  const loadPatrimonio = async () => {
    try {
      setLoading(true);
      const response = await patrimonioService.getById(id!);
      setForm(response.data);
    } catch {
      toast.error('Erro ao carregar equipamento');
      navigate('/alugueis');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseFloat(value) : undefined) : value
    }));
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      // Redimensionar imagem
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 800;
        let { width, height } = img;
        
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const resized = canvas.toDataURL('image/jpeg', 0.8);
        setForm(prev => ({ ...prev, foto_url: resized }));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setForm(prev => ({ ...prev, foto_url: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.codigo?.trim() || !form.nome?.trim()) {
      toast.error('Código e nome são obrigatórios');
      return;
    }

    try {
      setSaving(true);
      if (isEditing) {
        await patrimonioService.update(id!, form);
        toast.success('Equipamento atualizado!');
      } else {
        await patrimonioService.create(form);
        toast.success('Equipamento cadastrado!');
      }
      navigate('/alugueis');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este equipamento?')) return;
    
    try {
      await patrimonioService.delete(id!);
      toast.success('Equipamento removido!');
      navigate('/alugueis');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao excluir');
    }
  };

  if (loading) return <p className="loading-text">Carregando...</p>;

  return (
    <div>
      <PageHeader title={isEditing ? 'Editar Patrimônio' : 'Novo Patrimônio'}>
        <button className="btn btn-secondary" onClick={() => navigate('/alugueis')}>
          <FiArrowLeft /> Voltar
        </button>
        {isEditing && (
          <button className="btn btn-danger" onClick={handleDelete}>
            <FiTrash2 /> Excluir
          </button>
        )}
      </PageHeader>

      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-grid">
          {/* Foto */}
          <div className="form-group col-span-2">
            <label>Foto do Equipamento</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              {form.foto_url ? (
                <div style={{ position: 'relative' }}>
                  <img 
                    src={form.foto_url} 
                    alt="Foto" 
                    style={{ 
                      width: '150px', 
                      height: '150px', 
                      objectFit: 'cover', 
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)'
                    }} 
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label 
                  style={{ 
                    width: '150px', 
                    height: '150px', 
                    border: '2px dashed var(--border-color)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <FiCamera size={32} />
                  <span style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>Adicionar foto</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    onChange={handlePhotoCapture}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Código e Nome */}
          <div className="form-group">
            <label htmlFor="codigo">Código *</label>
            <input
              type="text"
              id="codigo"
              name="codigo"
              value={form.codigo || ''}
              onChange={handleChange}
              placeholder="Ex: GER-001"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="nome">Nome/Descrição *</label>
            <input
              type="text"
              id="nome"
              name="nome"
              value={form.nome || ''}
              onChange={handleChange}
              placeholder="Ex: Gerador 5KVA"
              required
            />
          </div>

          {/* Categoria e Marca */}
          <div className="form-group">
            <label htmlFor="categoria">Categoria</label>
            <select
              id="categoria"
              name="categoria"
              value={form.categoria || ''}
              onChange={handleChange}
            >
              <option value="">Selecione...</option>
              {CATEGORIAS.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="marca">Marca</label>
            <input
              type="text"
              id="marca"
              name="marca"
              value={form.marca || ''}
              onChange={handleChange}
              placeholder="Ex: Tramontina"
            />
          </div>

          {/* Modelo e Número de Série */}
          <div className="form-group">
            <label htmlFor="modelo">Modelo</label>
            <input
              type="text"
              id="modelo"
              name="modelo"
              value={form.modelo || ''}
              onChange={handleChange}
              placeholder="Ex: GT-5000"
            />
          </div>

          <div className="form-group">
            <label htmlFor="numero_serie">Número de Série</label>
            <input
              type="text"
              id="numero_serie"
              name="numero_serie"
              value={form.numero_serie || ''}
              onChange={handleChange}
            />
          </div>

          {/* Valores */}
          <div className="form-group">
            <label htmlFor="valor_compra">Valor de Compra (R$)</label>
            <input
              type="number"
              id="valor_compra"
              name="valor_compra"
              value={form.valor_compra || ''}
              onChange={handleChange}
              step="0.01"
              min="0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="valor_diaria">Valor Diária (R$)</label>
            <input
              type="number"
              id="valor_diaria"
              name="valor_diaria"
              value={form.valor_diaria || ''}
              onChange={handleChange}
              step="0.01"
              min="0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="valor_semanal">Valor Semanal (R$)</label>
            <input
              type="number"
              id="valor_semanal"
              name="valor_semanal"
              value={form.valor_semanal || ''}
              onChange={handleChange}
              step="0.01"
              min="0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="valor_mensal">Valor Mensal (R$)</label>
            <input
              type="number"
              id="valor_mensal"
              name="valor_mensal"
              value={form.valor_mensal || ''}
              onChange={handleChange}
              step="0.01"
              min="0"
            />
          </div>

          {/* Status (apenas edição) */}
          {isEditing && (
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={form.status || 'disponivel'}
                onChange={handleChange}
              >
                {STATUS_PATRIMONIO.map(s => (
                  <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Observações */}
          <div className="form-group col-span-2">
            <label htmlFor="observacoes">Observações</label>
            <textarea
              id="observacoes"
              name="observacoes"
              value={form.observacoes || ''}
              onChange={handleChange}
              rows={3}
              placeholder="Informações adicionais sobre o equipamento..."
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/alugueis')}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <FiSave /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
