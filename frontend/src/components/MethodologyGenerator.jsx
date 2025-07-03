import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaChevronRight, FaChevronDown, FaEdit, FaSave, FaTimes } from 'react-icons/fa';

const MethodologyGenerator = ({ finalThesis, sourceCategories, onMethodologyGenerated }) => {
  const [methodologyPoints, setMethodologyPoints] = useState([]);
  const [customPoint, setCustomPoint] = useState('');
  const [loading, setLoading] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    const generateMethodology = async () => {
      setLoading(true);
      setError(null);
      
      // Add delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        const res = await axios.post('http://localhost:8000/generate_methodology', {
          final_thesis: finalThesis,
          source_categories: sourceCategories,
        });

        // Parse methodology text into numbered points
        const methodologyText = res.data.methodology;
        const points = methodologyText
          .split(/\n+/)
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map((point, index) => {
            // Remove existing numbering if present
            const cleanPoint = point.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '').trim();
            return {
              text: cleanPoint,
              selected: true,
              number: index + 1,
              isOriginal: true
            };
          });

        setMethodologyPoints(points);
      } catch (err) {
        console.error('Methodology generation error:', err);
        const errorMsg = err.response?.data?.detail || err.message || 'Failed to generate methodology.';
        setError(errorMsg);
        
        // Set some default methodology points if the API fails
        const defaultPoints = [
          'Conduct comprehensive literature review of relevant academic sources',
          'Analyze primary source documents and government reports',
          'Apply comparative analysis methodology across different source categories',
          'Synthesize findings to support thesis arguments',
          'Ensure proper citation and documentation of all sources'
        ];
        const points = defaultPoints.map((point, index) => ({
          text: point,
          selected: true,
          number: index + 1,
          isOriginal: true
        }));
        setMethodologyPoints(points);
      }
      setLoading(false);
    };

    if (finalThesis && sourceCategories && sourceCategories.length > 0) {
      generateMethodology();
    }
  }, [finalThesis, sourceCategories]);

  const togglePoint = (index) => {
    if (!finalized) {
      setMethodologyPoints(prev =>
        prev.map((point, idx) =>
          idx === index ? { ...point, selected: !point.selected } : point
        )
      );
    }
  };

  const startEditing = (index) => {
    if (!finalized) {
      setEditingIndex(index);
      setEditingText(methodologyPoints[index].text);
    }
  };

  const saveEdit = () => {
    if (editingText.trim()) {
      setMethodologyPoints(prev =>
        prev.map((point, idx) =>
          idx === editingIndex 
            ? { ...point, text: editingText.trim(), isOriginal: false }
            : point
        )
      );
    }
    setEditingIndex(null);
    setEditingText('');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingText('');
  };

  const addCustomPoint = () => {
    if (customPoint.trim() && !finalized) {
      const nextNumber = methodologyPoints.length + 1;
      setMethodologyPoints(prev => [...prev, { 
        text: customPoint.trim(), 
        selected: true,
        number: nextNumber,
        isOriginal: false
      }]);
      setCustomPoint('');
    }
  };

  const handleFinalizeMethodology = () => {
    // Only pass selected methodology points to the parent component
    const selectedPoints = methodologyPoints.filter(point => point.selected).map(point => point.text);
    
    if (selectedPoints.length === 0) {
      alert("Please select at least one methodology consideration before proceeding.");
      return;
    }
    
    const methodologyText = selectedPoints.join('\n\n');
    setFinalized(true);
    setCollapsed(true);  // Auto-collapse after finalizing
    onMethodologyGenerated(methodologyText);
  };

  const handleEditMethodology = () => {
    if (finalized) {
      alert("Warning: Any changes made to the Methodology at this point will NOT modify any research outputs already generated.");
    }
    setFinalized(false);
    setCollapsed(false);
  };

  const toggleCollapse = () => setCollapsed(prev => !prev);

  const selectedCount = methodologyPoints.filter(point => point.selected).length;
  const totalCount = methodologyPoints.length;

  return (
    <div className="position-relative">
      <div
        style={{ position: 'absolute', top: -5, right: 10, cursor: 'pointer', color: '#aaa' }}
        onClick={toggleCollapse}
      >
        {collapsed ? <FaChevronRight /> : <FaChevronDown />}
      </div>

      <h3>
        Methodology Considerations
        {finalized && (
          <small className="text-muted ms-2">
            ({selectedCount} of {totalCount} selected)
          </small>
        )}
      </h3>

      {!collapsed && (
        <>
          {loading ? (
            <p>Generating methodology considerations...</p>
          ) : error ? (
            <div className="alert alert-warning">
              <p>{error}</p>
              <p><small>Default methodology points have been loaded. You can modify them below.</small></p>
            </div>
          ) : null}
          
          {methodologyPoints.map((point, idx) => (
            <div 
              key={idx} 
              className={`form-check mb-2 ${finalized && !point.selected ? 'text-muted' : ''}`}
              style={{
                opacity: finalized && !point.selected ? 0.5 : 1,
                textDecoration: finalized && !point.selected ? 'line-through' : 'none'
              }}
            >
              <div className="d-flex align-items-start">
                {!finalized ? (
                  <input
                    className="form-check-input mt-1 me-2"
                    type="checkbox"
                    checked={point.selected}
                    onChange={() => togglePoint(idx)}
                  />
                ) : (
                  <span 
                    className={`badge me-2 ${point.selected ? 'bg-success' : 'bg-secondary'}`}
                    style={{ fontSize: '0.7em', marginTop: '2px' }}
                  >
                    {point.selected ? '✓' : '✗'}
                  </span>
                )}

                <div className="flex-grow-1">
                  {editingIndex === idx ? (
                    <div className="d-flex align-items-start">
                      <span className="text-muted me-2" style={{ marginTop: '8px' }}>{point.number}.</span>
                      <textarea
                        className="form-control me-2"
                        rows={2}
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            saveEdit();
                          }
                        }}
                        autoFocus
                      />
                      <div className="d-flex flex-column">
                        <button
                          className="btn btn-sm btn-success mb-1"
                          onClick={saveEdit}
                          disabled={!editingText.trim()}
                        >
                          <FaSave />
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={cancelEdit}
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="d-flex justify-content-between align-items-start">
                      <span 
                        className={`${finalized && !point.selected ? 'text-muted' : ''}`}
                      >
                        <span className="text-muted me-2">{point.number}.</span>
                        {point.text}
                        {!point.isOriginal && (
                          <small className="text-primary ms-2">(modified)</small>
                        )}
                        {finalized && !point.selected && (
                          <small className="text-muted ms-2">(excluded)</small>
                        )}
                      </span>
                      
                      {!finalized && (
                        <button
                          className="btn btn-sm btn-outline-secondary ms-2"
                          onClick={() => startEditing(idx)}
                          style={{ fontSize: '0.7em' }}
                        >
                          <FaEdit />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {!finalized && (
            <>
              <textarea
                className="form-control mt-3"
                rows={2}
                placeholder={`Add custom methodology consideration (will be #${methodologyPoints.length + 1})`}
                value={customPoint}
                onChange={(e) => setCustomPoint(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    addCustomPoint();
                  }
                }}
              />

              <div className="mt-3 d-flex gap-2">
                <button
                  className="btn btn-secondary"
                  onClick={addCustomPoint}
                  disabled={!customPoint.trim()}
                >
                  Add Consideration #{methodologyPoints.length + 1}
                </button>

                <button
                  className="btn btn-primary"
                  onClick={handleFinalizeMethodology}
                  disabled={selectedCount === 0}
                >
                  Finalize Methodology ({selectedCount} selected)
                </button>
              </div>
            </>
          )}

          {finalized && (
            <div className="mt-3">
              <div className="alert alert-info">
                <strong>Finalized Methodology:</strong> {selectedCount} considerations will guide the research approach.
                {totalCount - selectedCount > 0 && (
                  <div><small>{totalCount - selectedCount} considerations have been excluded.</small></div>
                )}
              </div>
              <button
                className="btn btn-secondary"
                onClick={handleEditMethodology}
              >
                Edit Methodology
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MethodologyGenerator;
