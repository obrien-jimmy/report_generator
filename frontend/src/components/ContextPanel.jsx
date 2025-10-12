import React, { useState, useEffect } from 'react';
import ContextService from '../services/contextService';
import axios from 'axios';

const ContextPanel = ({ 
  isOpen, 
  onClose, 
  currentStep,
  finalThesis,
  selectedCategories,
  methodology,
  selectedPaperType,
  pageCount,
  outline
}) => {
  const [structurePreview, setStructurePreview] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load structure preview when methodology changes
  useEffect(() => {
    if (methodology && selectedPaperType) {
      loadStructurePreview();
    }
  }, [methodology, selectedPaperType]);

  const loadStructurePreview = async () => {
    if (!selectedPaperType || !methodology) return;
    
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/paper_structure_preview', {
        paper_type: selectedPaperType.id,
        methodology_id: methodology.methodology_type || methodology.id,
        sub_methodology_id: methodology.sub_methodology_id || null,
        page_count: pageCount || 10
      });
      setStructurePreview(response.data);
    } catch (error) {
      console.error('Error loading structure preview:', error);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex" style={{ zIndex: 9999 }}>
      {/* Backdrop */}
      <div 
        className="position-absolute w-100 h-100 bg-dark bg-opacity-50"
        onClick={onClose}
      ></div>
      
      {/* Panel */}
      <div 
        className="position-relative bg-white h-100 overflow-auto shadow-lg"
        style={{ width: '500px', marginLeft: 'auto' }}
      >
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between p-3 border-bottom bg-light">
          <h5 className="mb-0">
            <i className="bi bi-info-circle me-2"></i>
            Process Context
          </h5>
          <button 
            className="btn btn-sm btn-outline-secondary"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="p-3">
          {/* Current Step */}
          <div className="mb-4">
            <h6 className="text-primary">
              <i className="bi bi-geo-alt me-2"></i>
              Current Step: {currentStep.charAt(0).toUpperCase() + currentStep.slice(1).replace('-', ' ')}
            </h6>
            <div className="alert alert-info small mb-3">
              {ContextService.getStepExplanation(currentStep)}
            </div>
          </div>

          {/* Progress Indicators */}
          <div className="mb-4">
            <h6>Progress Overview</h6>
            <div className="d-flex align-items-center mb-2">
              <span className={`me-2 ${selectedPaperType ? 'text-success' : 'text-muted'}`}>
                {selectedPaperType ? '✓' : '○'}
              </span>
              <span className={selectedPaperType ? 'text-success' : 'text-muted'}>Paper Type Selected</span>
            </div>
            <div className="d-flex align-items-center mb-2">
              <span className={`me-2 ${finalThesis ? 'text-success' : 'text-muted'}`}>
                {finalThesis ? '✓' : '○'}
              </span>
              <span className={finalThesis ? 'text-success' : 'text-muted'}>Thesis Finalized</span>
            </div>
            <div className="d-flex align-items-center mb-2">
              <span className={`me-2 ${selectedCategories?.length ? 'text-success' : 'text-muted'}`}>
                {selectedCategories?.length ? '✓' : '○'}
              </span>
              <span className={selectedCategories?.length ? 'text-success' : 'text-muted'}>Sources Selected</span>
            </div>
            <div className="d-flex align-items-center mb-2">
              <span className={`me-2 ${methodology ? 'text-success' : 'text-muted'}`}>
                {methodology ? '✓' : '○'}
              </span>
              <span className={methodology ? 'text-success' : 'text-muted'}>Methodology Chosen</span>
            </div>
            <div className="d-flex align-items-center mb-2">
              <span className={`me-2 ${outline?.length ? 'text-success' : 'text-muted'}`}>
                {outline?.length ? '✓' : '○'}
              </span>
              <span className={outline?.length ? 'text-success' : 'text-muted'}>Outline Generated</span>
            </div>
          </div>

          {/* Finalized Selections */}
          <div className="mb-4">
            <h6>Current Selections</h6>
            
            {/* Paper Type */}
            {selectedPaperType && (
              <div className="card mb-2">
                <div className="card-body py-2">
                  <div className="row">
                    <div className="col-4">
                      <small className="text-muted">Paper Type:</small>
                    </div>
                    <div className="col-8">
                      <small><strong>{selectedPaperType.name}</strong></small>
                      <br />
                      <small className="text-muted">{selectedPaperType.description}</small>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Page Count */}
            {pageCount && (
              <div className="card mb-2">
                <div className="card-body py-2">
                  <div className="row">
                    <div className="col-4">
                      <small className="text-muted">Page Count:</small>
                    </div>
                    <div className="col-8">
                      <small>{pageCount} pages</small>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Thesis */}
            {finalThesis && (
              <div className="card mb-2">
                <div className="card-body py-2">
                  <div className="row">
                    <div className="col-4">
                      <small className="text-muted">Thesis:</small>
                    </div>
                    <div className="col-8">
                      <small>{finalThesis}</small>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Source Categories */}
            {selectedCategories?.length > 0 && (
              <div className="card mb-2">
                <div className="card-body py-2">
                  <div className="row">
                    <div className="col-4">
                      <small className="text-muted">Sources:</small>
                    </div>
                    <div className="col-8">
                      <small>{selectedCategories.join(', ')}</small>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Methodology */}
            {methodology && (
              <div className="card mb-2">
                <div className="card-body py-2">
                  <div className="row">
                    <div className="col-4">
                      <small className="text-muted">Methodology:</small>
                    </div>
                    <div className="col-8">
                      <small><strong>{methodology.title || methodology.name}</strong></small>
                      <br />
                      <small className="text-muted">Type: {methodology.methodology_type}</small>
                      {methodology.description && (
                        <>
                          <br />
                          <small className="text-muted">{methodology.description.substring(0, 100)}...</small>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Context Explanation */}
          <div className="mb-4">
            <h6>Process Context</h6>
            <div className="alert alert-light small">
              <p className="mb-2">
                <strong>How sections inform each other:</strong>
              </p>
              <ul className="mb-2">
                <li><strong>Paper Type</strong> → Establishes structure template and requirements</li>
                <li><strong>Thesis</strong> → Determines research focus and argument direction</li>
                <li><strong>Sources</strong> → Define evidence scope and research boundaries</li>
                <li><strong>Methodology</strong> → Shapes analytical approach and enhances paper structure</li>
                <li><strong>Outline</strong> → Provides detailed framework for content generation</li>
              </ul>
              <p className="mb-0">
                Each selection builds upon previous choices to create a cohesive, methodologically sound research paper structure.
              </p>
            </div>
          </div>

          {/* Outline Summary */}
          {outline?.length > 0 && (
            <div className="mb-4">
              <h6>Generated Outline Summary</h6>
              <div className="alert alert-info small">
                <strong>Sections:</strong> {outline.length}
                <br />
                <strong>Total Subsections:</strong> {outline.reduce((sum, section) => sum + (section.subsections?.length || 0), 0)}
                <br />
                <strong>Total Questions:</strong> {outline.reduce((sum, section) => 
                  sum + (section.subsections?.reduce((subSum, sub) => subSum + (sub.questions?.length || 0), 0) || 0), 0)}
              </div>
            </div>
          )}

          {loading && (
            <div className="text-center py-3">
              <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              Loading structure preview...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContextPanel;