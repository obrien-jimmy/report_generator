import React from 'react';

const FinalOutlineModal = ({ show, onClose, note }) => {
  if (!show) return null;
  return (
    <div className="final-outline-modal-backdrop">
      <div className="final-outline-modal">
        <button className="close" onClick={onClose}>&times;</button>
        <h5>Note</h5>
        <div>{note}</div>
      </div>
    </div>
  );
};

export default FinalOutlineModal;