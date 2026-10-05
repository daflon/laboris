import { useState, useEffect } from 'react';
import { FiUser, FiLock, FiMail, FiShield, FiCheck, FiX, FiEye, FiEyeOff } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { authService } from '../../services/auth.service';
import api from '../../services/api';
import './MyAccount.css';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant_id: string | null;
}

export default function MyAccount() {
  const [user, setUser] = useState<UserData | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastLogin, setLastLogin] = useState<string | null>(null);

  useEffect(() => {
    const userData = authService.getUser();
    setUser(userData);

    // Buscar dados adicionais do usuário
    api.get('/auth/me')
      .then((res) => {
        if (res.data.data) {
          setUser(res.data.data);
        }
      })
      .catch(() => {});
  }, []);

  // Validações de senha
  const passwordValidations = {
    minLength: newPassword.length >= 6,
    hasUppercase: /[A-Z]/.test(newPassword),
    hasNumber: /\d/.test(newPassword),
    passwordsMatch: newPassword === confirmPassword && confirmPassword.length > 0,
  };

  const isPasswordValid = Object.values(passwordValidations).every(Boolean);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error('Digite a senha atual');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não conferem');
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      toast.success('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  const getRoleName = (role: string) => {
    const roles: Record<string, string> = {
      super_admin: 'Super Administrador',
      admin: 'Administrador',
      user: 'Usuário',
    };
    return roles[role] || role;
  };

  if (!user) {
    return <div className="page-container"><p>Carregando...</p></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1><FiUser /> Minha Conta</h1>
        <p className="page-subtitle">Gerencie suas informações e segurança</p>
      </div>

      <div className="account-grid">
        {/* Card de Informações do Usuário */}
        <div className="account-card">
          <div className="account-card-header">
            <FiUser className="card-icon" />
            <h2>Informações da Conta</h2>
          </div>
          <div className="account-card-body">
            <div className="info-row">
              <span className="info-label"><FiUser /> Nome</span>
              <span className="info-value">{user.name}</span>
            </div>
            <div className="info-row">
              <span className="info-label"><FiMail /> Email</span>
              <span className="info-value">{user.email}</span>
            </div>
            <div className="info-row">
              <span className="info-label"><FiShield /> Tipo de Conta</span>
              <span className="info-value">
                <span className={`role-badge role-${user.role}`}>
                  {getRoleName(user.role)}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Card de Alteração de Senha */}
        <div className="account-card">
          <div className="account-card-header">
            <FiLock className="card-icon" />
            <h2>Alterar Senha</h2>
          </div>
          <div className="account-card-body">
            <form onSubmit={handleChangePassword} className="password-form">
              <div className="form-group">
                <label htmlFor="currentPassword">Senha Atual</label>
                <div className="password-input-wrapper">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    id="currentPassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Digite sua senha atual"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">Nova Senha</label>
                <div className="password-input-wrapper">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite a nova senha"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirmar Nova Senha</label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme a nova senha"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              {/* Indicadores de validação */}
              {newPassword && (
                <div className="password-requirements">
                  <p className="requirements-title">Requisitos da senha:</p>
                  <ul>
                    <li className={passwordValidations.minLength ? 'valid' : 'invalid'}>
                      {passwordValidations.minLength ? <FiCheck /> : <FiX />}
                      Mínimo 6 caracteres
                    </li>
                    <li className={passwordValidations.hasUppercase ? 'valid' : 'invalid'}>
                      {passwordValidations.hasUppercase ? <FiCheck /> : <FiX />}
                      Uma letra maiúscula
                    </li>
                    <li className={passwordValidations.hasNumber ? 'valid' : 'invalid'}>
                      {passwordValidations.hasNumber ? <FiCheck /> : <FiX />}
                      Um número
                    </li>
                    {confirmPassword && (
                      <li className={passwordValidations.passwordsMatch ? 'valid' : 'invalid'}>
                        {passwordValidations.passwordsMatch ? <FiCheck /> : <FiX />}
                        Senhas conferem
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !currentPassword || !isPasswordValid}
              >
                {loading ? 'Alterando...' : 'Alterar Senha'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
