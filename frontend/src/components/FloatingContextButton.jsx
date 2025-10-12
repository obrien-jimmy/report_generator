import React, { useState } from 'react';
import ContextPanel from './ContextPanel';

const FloatingContextButton = ({ 
  currentStep,
  finalThesis,
  selectedCategories,
  methodology,
  selectedPaperType,
  pageCount,
  outline
}) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <div 
        className="position-fixed d-flex align-items-center justify-content-center"
        style={{
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          backgroundColor: '#0d6efd',
          color: 'white',
          borderRadius: '50%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          zIndex: 9998,
          transition: 'all 0.3s ease',
          border: 'none'
        }}
        onClick={() => setIsPanelOpen(true)}
        title="View Context Information"
      >
        <div className="text-center">
          <i className="bi bi-info-circle fs-5 d-block"></i>
          <small style={{ fontSize: '10px' }}>Context</small>
        </div>
      </div>

      {/* Context Panel */}
      <ContextPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        currentStep={currentStep}
        finalThesis={finalThesis}
        selectedCategories={selectedCategories}
        methodology={methodology}
        selectedPaperType={selectedPaperType}
        pageCount={pageCount}
        outline={outline}
      />
    </>
  );
};

export default FloatingContextButton;