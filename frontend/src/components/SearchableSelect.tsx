import { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiSearch, FiX } from 'react-icons/fi';
import './SearchableSelect.css';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function SearchableSelect({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  disabled = false,
  required = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtra opções baseado na busca
  const filteredOptions = options.filter(opt => {
    const searchLower = search.toLowerCase();
    return opt.label.toLowerCase().includes(searchLower) || 
           (opt.sublabel && opt.sublabel.toLowerCase().includes(searchLower));
  });

  // Encontra opção selecionada
  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Foca no input ao abrir
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
    } else if (e.key === 'Enter' && filteredOptions.length === 1) {
      handleSelect(filteredOptions[0].value);
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`searchable-select ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
    >
      {/* Hidden input for form validation */}
      <input 
        type="hidden" 
        name={name} 
        value={value} 
        required={required}
      />
      
      {/* Trigger/Display */}
      <div 
        className="searchable-select-trigger"
        onClick={handleToggle}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => e.key === 'Enter' && handleToggle()}
      >
        {selectedOption ? (
          <div className="searchable-select-value">
            <span className="searchable-select-label">{selectedOption.label}</span>
            {selectedOption.sublabel && (
              <span className="searchable-select-sublabel"> — {selectedOption.sublabel}</span>
            )}
          </div>
        ) : (
          <span className="searchable-select-placeholder">{placeholder}</span>
        )}
        
        <div className="searchable-select-actions">
          {value && !disabled && (
            <button 
              type="button" 
              className="searchable-select-clear"
              onClick={handleClear}
              tabIndex={-1}
            >
              <FiX size={14} />
            </button>
          )}
          <FiChevronDown className={`searchable-select-arrow ${isOpen ? 'rotated' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="searchable-select-dropdown">
          {/* Search input */}
          <div className="searchable-select-search">
            <FiSearch className="searchable-select-search-icon" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite para buscar..."
              autoComplete="off"
            />
          </div>

          {/* Options list */}
          <div className="searchable-select-options">
            {filteredOptions.length === 0 ? (
              <div className="searchable-select-empty">
                Nenhum resultado encontrado
              </div>
            ) : (
              filteredOptions.map(opt => (
                <div
                  key={opt.value}
                  className={`searchable-select-option ${opt.value === value ? 'selected' : ''}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  <span className="searchable-select-option-label">{opt.label}</span>
                  {opt.sublabel && (
                    <span className="searchable-select-option-sublabel">{opt.sublabel}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
