import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './Modal.css';

interface CreatePortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPortfolioCreated: () => void;
  userId: number;
  userName: string;
}

const CreatePortfolioModal = ({ isOpen, onClose, onPortfolioCreated, userId, userName }: CreatePortfolioModalProps) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('El nombre del portafolio es requerido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await invoke('create_portfolio', {
        userId: userId,
        name: name.trim()
      });
      
      onPortfolioCreated();
      onClose();
      
      // Reset form
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear portafolio');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Crear Nuevo Portafolio</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="user-info-display">
            <div className="user-avatar-display">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <div className="user-name-display">{userName}</div>
              <div className="user-id-display">ID: {userId}</div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="portfolioName">Nombre del Portafolio *</label>
            <input
              id="portfolioName"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Mi Portafolio Principal, Inversiones 2025..."
              disabled={loading}
              autoFocus
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
              disabled={loading || !name.trim()}
            >
              {loading ? 'Creando...' : 'Crear Portafolio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePortfolioModal;
