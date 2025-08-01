import React from 'react';
import './Modal.css';

const Modal = ({ show, onClose, title, children, large = false, footer }) => {
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={large ? "modal-content-large" : "modal-content"}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">{title}</h5>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;