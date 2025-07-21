import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './Modal.css';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

const CreateUserModal = ({ isOpen, onClose, onUserCreated }: CreateUserModalProps) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('El nombre de usuario es requerido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await invoke('create_user', {
        username: username.trim(),
        email: email.trim() || null
      });
      
      onUserCreated();
      onClose();
      
      // Reset form
      setUsername('');
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUsername('');
    setEmail('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Crear Nuevo Usuario</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="username">Nombre de Usuario *</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Ej: Juan Pérez, MariaTrader, InversorPro..."
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email (opcional)</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button 
              type="button" 
              onClick={handleClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="btn-primary"
              disabled={loading || !username.trim()}
            >
              {loading ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;
