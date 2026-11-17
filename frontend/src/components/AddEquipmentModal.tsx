import { useState, useEffect } from 'react';
import { FiX, FiPlus, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Equipment, equipmentService } from '../services/equipment.service';
import './AddEquipmentModal.css';

export interface EquipmentToAdd {
  id: string;
  name: string;
  serial: string;
  defect: string;
  isNew: boolean;
  // Dados para criação de equipamento novo
  newEquipmentData?: {
    type: string;
    brand: string;
    model: string;
    serial_number: string;
  };
}

interface AddEquipmentModalProps {
  isOpen: boolean;
  clientId: string;
  existingEquipments: Equipment[];
  alreadyAddedIds: string[];
  onClose: () => void;
  onAdd: (equipment: EquipmentToAdd, addAnother: boolean) => void;
}

export default function AddEquipmentModal({
  isOpen,
  clientId,
  existingEquipments,
  alreadyAddedIds,
  onClose,
  onAdd,
}: AddEquipmentModalProps) {
  const [tab, setTab] = useState<'existing' | 'new'>('existing');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [defect, setDefect] = useState('');
  const [addAnother, setAddAnother] = useState(false);

  // Form para novo equipamento
  const [newType, setNewType] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newSerial, setNewSerial] = useState('');

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setTab('existing');
      setSearch('');
      setSelectedId(null);
      setDefect('');
      setNewType('');
      setNewBrand('');
      setNewModel('');
      setNewSerial('');
    }
  }, [isOpen]);

  // Auto-switch para aba "novo" se não houver equipamentos
  useEffect(() => {
    if (isOpen && existingEquipments.length === 0) {
      setTab('new');
    }
  }, [isOpen, existingEquipments]);

  const filteredEquipments = existingEquipments.filter((eq) => {
    if (!search) return true;
    const searchText = `${eq.type} ${eq.brand} ${eq.model} ${eq.serial_number || ''}`.toLowerCase();
    return searchText.includes(search.toLowerCase());
  });

  const handleAdd = () => {
    if (!defect.trim()) {
      toast.error('Informe o defeito do equipamento');
      return;
    }

    if (tab === 'existing') {
      if (!selectedId) {
        toast.error('Selecione um equipamento');
        return;
      }

      const eq = existingEquipments.find((e) => e.id === selectedId);
      if (!eq) return;

      onAdd(
        {
          id: eq.id,
          name: `${eq.type} ${eq.brand} ${eq.model}`,
          serial: eq.serial_number || 'N/A',
          defect: defect.trim(),
          isNew: false,
        },
        addAnother
      );
    } else {
      if (!newType || !newBrand.trim() || !newModel.trim()) {
        toast.error('Preencha tipo, marca e modelo');
        return;
      }

      onAdd(
        {
          id: `new-${Date.now()}`,
          name: `${newType} ${newBrand} ${newModel}`,
          serial: newSerial || 'N/A',
          defect: defect.trim(),
          isNew: true,
          newEquipmentData: {
            type: newType,
            brand: newBrand.trim(),
            model: newModel.trim(),
            serial_number: newSerial.trim(),
          },
        },
        addAnother
      );

      // Limpar campos de novo equipamento
      setNewType('');
      setNewBrand('');
      setNewModel('');
      setNewSerial('');
    }

    // Limpar defeito e seleção
    setDefect('');
    setSelectedId(null);

    if (!addAnother) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay add-equipment-modal-overlay" onClick={onClose}>
      <div className="modal-content add-equipment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>➕ Adicionar Equipamento</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fechar">
            <FiX />
          </button>
        </div>

        <div className="modal-body">
          {/* Tabs */}
          <div className="eq-modal-tabs">
            <button
              className={`eq-modal-tab ${tab === 'existing' ? 'active' : ''}`}
              onClick={() => setTab('existing')}
            >
              📋 Do Cliente
            </button>
            <button
              className={`eq-modal-tab ${tab === 'new' ? 'active' : ''}`}
              onClick={() => setTab('new')}
            >
              ✨ Cadastrar Novo
            </button>
          </div>

          {/* Tab: Equipamentos existentes */}
          {tab === 'existing' && (
            <div className="eq-modal-tab-content">
              <div className="eq-search-box">
                <FiSearch className="eq-search-icon" />
                <input
                  type="text"
                  placeholder="Buscar equipamento..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="eq-select-list">
                {filteredEquipments.length === 0 ? (
                  <div className="eq-empty">
                    <p>Nenhum equipamento encontrado</p>
                    <button className="btn btn-success" onClick={() => setTab('new')}>
                      ✨ Cadastrar Novo
                    </button>
                  </div>
                ) : (
                  filteredEquipments.map((eq) => {
                    const isAdded = alreadyAddedIds.includes(eq.id);
                    const isSelected = selectedId === eq.id;

                    return (
                      <div
                        key={eq.id}
                        className={`eq-select-item ${isSelected ? 'selected' : ''} ${isAdded ? 'disabled' : ''}`}
                        onClick={() => !isAdded && setSelectedId(isSelected ? null : eq.id)}
                      >
                        <div className={`eq-checkbox ${isSelected ? 'checked' : ''}`}>
                          {isSelected && '✓'}
                        </div>
                        <div className="eq-select-info">
                          <div className="eq-select-name">
                            {eq.type} {eq.brand} {eq.model}
                          </div>
                          <div className="eq-select-meta">
                            {isAdded ? '⚠️ Já adicionado nesta OS' : `Nº Série: ${eq.serial_number || 'N/A'}`}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Tab: Cadastrar novo */}
          {tab === 'new' && (
            <div className="eq-modal-tab-content">
              <div className="eq-new-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Tipo *</label>
                    <select value={newType} onChange={(e) => setNewType(e.target.value)}>
                      <option value="">Selecione...</option>
                      <option value="Notebook">Notebook</option>
                      <option value="Desktop">Desktop</option>
                      <option value="Impressora">Impressora</option>
                      <option value="Monitor">Monitor</option>
                      <option value="Celular">Celular</option>
                      <option value="Tablet">Tablet</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Marca *</label>
                    <input
                      type="text"
                      placeholder="Ex: Dell, HP..."
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Modelo *</label>
                    <input
                      type="text"
                      placeholder="Ex: Inspiron 15..."
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Nº Série</label>
                    <input
                      type="text"
                      placeholder="Opcional"
                      value={newSerial}
                      onChange={(e) => setNewSerial(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Defeito (sempre visível) */}
          <div className="eq-defect-section">
            <div className="form-group">
              <label>Defeito Relatado *</label>
              <textarea
                placeholder="Descreva o problema do equipamento..."
                value={defect}
                onChange={(e) => setDefect(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <label className="eq-add-another">
            <input
              type="checkbox"
              checked={addAnother}
              onChange={(e) => setAddAnother(e.target.checked)}
            />
            Adicionar outro após salvar
          </label>
          <div className="modal-footer-actions">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn btn-success" onClick={handleAdd}>
              <FiPlus /> Adicionar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
