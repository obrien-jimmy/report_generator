import { useState } from 'react';
import { FaChevronDown, FaChevronUp, FaExternalLinkAlt, FaPlus, FaTrash } from 'react-icons/fa';

const CitationViewer = ({ citations, onAddCitation, onRemoveCitation }) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState(null);

  const toggleExpanded = () => setExpanded(!expanded);

  const openCitationDetails = (citation, index) => {
    setSelectedCitation({ ...citation, index });
  };

  const closeCitationDetails = () => {
    setSelectedCitation(null);
  };

  const handleRemoveCitation = (index) => {
    if (onRemoveCitation) {
      onRemoveCitation(index);
    }
    closeCitationDetails();
  };

  if (!citations || citations.length === 0) {
    return (
      <div className="citation-viewer">
        <div className="text-muted small">No citations generated yet</div>
      </div>
    );
  }

  return (
    <div className="citation-viewer">
      {/* Citation Summary Bar */}
      <div className="citation-summary d-flex justify-content-between align-items-center p-2 bg-light rounded">
        <div className="d-flex align-items-center">
          <span className="badge bg-info me-2">{citations.length}</span>
          <span className="small text-muted">
            {citations.length === 1 ? 'Citation' : 'Citations'} Available
          </span>
        </div>
        <div className="d-flex gap-2">
          {onAddCitation && (
            <button 
              className="btn btn-sm btn-outline-primary"
              onClick={onAddCitation}
              title="Add custom citation"
            >
              <FaPlus />
            </button>
          )}
          <button 
            className="btn btn-sm btn-outline-secondary"
            onClick={toggleExpanded}
            title={expanded ? 'Hide citations' : 'Show citations'}
          >
            {expanded ? <FaChevronUp /> : <FaChevronDown />}
          </button>
        </div>
      </div>

      {/* Expanded Citation List */}
      {expanded && (
        <div className="citation-list mt-2">
          {citations.map((citation, index) => (
            <div key={index} className="citation-item mb-2">
              <div className="citation-preview p-2 border rounded">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="citation-text flex-grow-1 me-2">
                    <div className="citation-apa small">
                      {citation.apa}
                    </div>
                    {/* Remove categories display from preview */}
                  </div>
                  <div className="citation-actions">
                    <button
                      className="btn btn-sm btn-outline-info"
                      onClick={() => openCitationDetails(citation, index)}
                      title="View details"
                    >
                      <FaExternalLinkAlt />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Citation Details Modal */}
      {selectedCitation && (
        <div className="modal-overlay" onClick={closeCitationDetails}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Citation Details</h5>
              <button
                type="button"
                className="btn-close"
                onClick={closeCitationDetails}
                aria-label="Close"
              ></button>
            </div>
            
            <div className="modal-body">
              {/* APA Citation */}
              <div className="mb-3">
                <h6 className="text-primary">APA Citation</h6>
                <div className="p-2 bg-light rounded">
                  <small>{selectedCitation.apa}</small>
                </div>
              </div>

              {/* Categories */}
              {selectedCitation.categories && selectedCitation.categories.length > 0 && (
                <div className="mb-3">
                  <h6 className="text-primary">Source Categories</h6>
                  <div className="p-2 bg-light rounded">
                    <small>{selectedCitation.categories.join(', ')}</small>
                  </div>
                </div>
              )}

              {/* Methodology Points */}
              {selectedCitation.methodologyPoints && selectedCitation.methodologyPoints.length > 0 && (
                <div className="mb-3">
                  <h6 className="text-primary">Methodology Points</h6>
                  <div className="p-2 bg-light rounded">
                    <small>{selectedCitation.methodologyPoints.join(', ')}</small>
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedCitation.description && (
                <div className="mb-3">
                  <h6 className="text-primary">Description</h6>
                  <div className="p-2 bg-light rounded">
                    <small>{selectedCitation.description}</small>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeCitationDetails}
              >
                Close
              </button>
              {onRemoveCitation && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleRemoveCitation(selectedCitation.index)}
                >
                  <FaTrash className="me-1" />
                  Remove Citation
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitationViewer;