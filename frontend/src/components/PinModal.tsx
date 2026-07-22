import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

interface PinModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PinModal({ isOpen, title, message, onSuccess, onCancel }: PinModalProps) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setPin(['', '', '', '']);
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);

    // Auto-focus next
    if (value && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }

    // Auto-submit when all 4 digits filled
    if (value && index === 3) {
      const fullPin = [...newPin.slice(0, 3), value.slice(-1)].join('');
      verifyPin(fullPin);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const verifyPin = async (fullPin: string) => {
    setVerifying(true);
    try {
      const response = await api.post('/admin/verify-pin', { pin: fullPin });
      if (response.data.success) {
        onSuccess();
      }
    } catch {
      toast.error('PIN incorreto');
      setPin(['', '', '', '']);
      inputsRef.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '340px', textAlign: 'center' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>🔒 {title}</h3>
        <p style={{ marginBottom: '1.5rem' }}>{message}</p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputsRef.current[index] = el; }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={verifying}
              style={{
                width: 48,
                height: 56,
                textAlign: 'center',
                fontSize: '1.5rem',
                border: '2px solid #e2e8f0',
                borderRadius: 8,
                fontWeight: 700,
              }}
            />
          ))}
        </div>

        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1rem' }}>
          {verifying ? 'Verificando...' : 'Digite o PIN de 4 dígitos do administrador'}
        </p>

        <div className="modal-actions" style={{ justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
