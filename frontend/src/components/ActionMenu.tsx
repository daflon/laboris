import { useState, useRef, useEffect } from 'react';
import { FiMoreVertical } from 'react-icons/fi';
import './ActionMenu.css';

export interface ActionMenuItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  dividerBefore?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  quickActions?: ActionMenuItem[];
}

export default function ActionMenu({ items, quickActions }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  // Calcula posição do dropdown (abre pra cima se não couber embaixo)
  useEffect(() => {
    if (open && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const dropdownHeight = 280; // Altura estimada do dropdown
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;

      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setPosition('top');
      } else {
        setPosition('bottom');
      }
    }
  }, [open]);

  const handleItemClick = (item: ActionMenuItem, e: React.MouseEvent) => {
    e.stopPropagation();
    item.onClick();
    setOpen(false);
  };

  return (
    <div className="action-menu-container" ref={menuRef}>
      {/* Quick Actions (hover) */}
      {quickActions && quickActions.length > 0 && (
        <div className="quick-actions">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              className={`quick-btn ${action.danger ? 'quick-btn-danger' : ''}`}
              onClick={(e) => handleItemClick(action, e)}
              title={action.label}
              aria-label={action.label}
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}

      {/* Menu Trigger */}
      <button
        ref={triggerRef}
        className="menu-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        aria-label="Mais ações"
        aria-expanded={open}
      >
        <FiMoreVertical />
      </button>

      {/* Dropdown */}
      {open && (
        <div 
          ref={dropdownRef}
          className={`action-dropdown position-${position}`}
        >
          {items.map((item, idx) => (
            <div key={idx}>
              {item.dividerBefore && <div className="dropdown-divider" />}
              <button
                className={`dropdown-item ${item.danger ? 'dropdown-item-danger' : ''}`}
                onClick={(e) => handleItemClick(item, e)}
              >
                <span className="dropdown-item-icon">{item.icon}</span>
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
