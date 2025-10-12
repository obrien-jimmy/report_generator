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
      <button
        className="btn btn-primary position-fixed shadow"
        style={{
          bottom: '20px',
          right: '20px',
          zIndex: 9998,
          borderRadius: '50px',
          padding: '12px 20px',
          fontSize: '14px',
          fontWeight: '600'
        }}
        onClick={() => setIsPanelOpen(true)}
      >
        <i className="bi bi-info-circle me-2"></i>
        Context
      </button>

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