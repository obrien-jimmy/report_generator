import React, { useState } from 'react';
import CitationsPanel from './CitationsPanel';

const FloatingCitationsButton = ({ 
  outline,
  finalThesis,
  methodology
}) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Check if citations are available
  const hasCitations = () => {
    if (!outline || outline.length === 0) return false;
    
    return outline.some(section => 
      section.subsections?.some(subsection => 
        subsection.questions?.some(questionObj => 
          questionObj.citations && questionObj.citations.length > 0
        )
      )
    );
  };

  // Count total citations
  const getCitationCount = () => {
    if (!outline || outline.length === 0) return 0;
    
    let count = 0;
    outline.forEach(section => {
      if (section.subsections) {
        section.subsections.forEach(subsection => {
          if (subsection.questions) {
            subsection.questions.forEach(questionObj => {
              if (questionObj.citations) {
                count += questionObj.citations.length;
              }
            });
          }
        });
      }
    });
    return count;
  };

  const citationsAvailable = hasCitations();
  const citationCount = getCitationCount();

  return (
    <>
      {/* Floating Button */}
      <div 
        className="position-fixed d-flex align-items-center justify-content-center"
        style={{
          bottom: '20px',
          right: '100px', // Position next to context button
          width: '60px',
          height: '60px',
          backgroundColor: citationsAvailable ? '#0d6efd' : '#6c757d',
          color: 'white',
          borderRadius: '50%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          cursor: citationsAvailable ? 'pointer' : 'not-allowed',
          zIndex: 9998,
          transition: 'all 0.3s ease',
          opacity: citationsAvailable ? 1 : 0.6
        }}
        onClick={() => citationsAvailable && setIsPanelOpen(true)}
        title={citationsAvailable ? `View ${citationCount} Citations` : 'No citations available yet'}
      >
        <div className="text-center">
          <i className="bi bi-journals fs-5 d-block"></i>
          <small style={{ fontSize: '10px' }}>Citations</small>
          {citationsAvailable && (
            <div 
              className="position-absolute bg-danger text-white rounded-circle d-flex align-items-center justify-content-center"
              style={{
                top: '-2px',
                right: '-2px',
                width: '20px',
                height: '20px',
                fontSize: '10px'
              }}
            >
              {citationCount > 99 ? '99+' : citationCount}
            </div>
          )}
        </div>
      </div>

      {/* Citations Panel */}
      <CitationsPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        outline={outline}
        finalThesis={finalThesis}
        methodology={methodology}
      />
    </>
  );
};

export default FloatingCitationsButton;