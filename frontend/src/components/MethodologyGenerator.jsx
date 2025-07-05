import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaChevronRight, FaChevronDown, FaEdit, FaSave, FaTimes, FaSyncAlt, FaInfoCircle } from 'react-icons/fa';

const MethodologyGenerator = ({ finalThesis, sourceCategories, setMethodology, proceedToOutline, selectedPaperType, pageCount }) => {
  const [methodologyOptions, setMethodologyOptions] = useState([]);
  const [selectedMethodology, setSelectedMethodology] = useState('');
  const [selectedSubMethodology, setSelectedSubMethodology] = useState('');
  const [generatedMethodologies, setGeneratedMethodologies] = useState([]);
  const [selectedMethodologyIndex, setSelectedMethodologyIndex] = useState(null);
  const [customMethodology, setCustomMethodology] = useState('');
  const [selectedMethodologyDetails, setSelectedMethodologyDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState(null);
  const [showMethodologySelection, setShowMethodologySelection] = useState(true);
  const [outlineActivated, setOutlineActivated] = useState(false);
  const [outlineNeedsRerun, setOutlineNeedsRerun] = useState(false);

  // Load methodology options on component mount
  useEffect(() => {
    const loadMethodologyOptions = async () => {
      try {
        const res = await axios.get('http://localhost:8000/methodology_options');
        setMethodologyOptions(res.data.methodologies);
      } catch (err) {
        console.error('Error loading methodology options:', err);
        setError('Failed to load methodology options');
      }
    };
    
    loadMethodologyOptions();
  }, []);

  const handleMethodologySelect = (methodologyId) => {
    setSelectedMethodology(methodologyId);
    setSelectedSubMethodology('');
    setGeneratedMethodologies([]);
    setSelectedMethodologyIndex(null);
  };

  const handleSubMethodologySelect = (subMethodologyId) => {
    setSelectedSubMethodology(subMethodologyId);
    setGeneratedMethodologies([]);
    setSelectedMethodologyIndex(null);
  };

  const generateMethodologyOptions = async () => {
    // Debug logging
    console.log('Debug - generateMethodologyOptions called with:');
    console.log('selectedMethodology:', selectedMethodology);
    console.log('finalThesis:', finalThesis);
    console.log('sourceCategories:', sourceCategories);
    console.log('selectedPaperType:', selectedPaperType);
    console.log('pageCount:', pageCount);

    // More specific error checking
    if (!selectedMethodology) {
      alert('Please select a methodology type first.');
      return;
    }

    if (!finalThesis || finalThesis.trim() === '') {
      alert('Please ensure a thesis has been finalized before generating methodology options.');
      return;
    }

    if (!sourceCategories || sourceCategories.length === 0) {
      alert('Please ensure source categories have been selected before generating methodology options.');
      return;
    }

    if (!selectedPaperType) {
      alert('Please ensure a paper type has been selected before generating methodology options.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const requestData = {
        methodology_type: selectedMethodology,
        sub_methodology: selectedSubMethodology || '',
        final_thesis: finalThesis,
        paper_type: selectedPaperType.name,
        paper_purpose: selectedPaperType.purpose,
        paper_tone: selectedPaperType.tone,
        paper_structure: selectedPaperType.structure,
        source_categories: sourceCategories,
        page_count: pageCount || 10
      };

      console.log('Sending request with data:', requestData);

      const res = await axios.post('http://localhost:8000/generate_methodology_options', requestData);

      console.log('Response received:', res.data);
      setGeneratedMethodologies(res.data.methodologies);
      setShowMethodologySelection(false);
    } catch (err) {
      console.error('Methodology generation error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.detail || err.message || 'Failed to generate methodology options.');
    }
    setLoading(false);
  };

  const handleMethodologyChoice = (index) => {
    setSelectedMethodologyIndex(index);
    const selectedMethod = generatedMethodologies[index];
    setCustomMethodology(selectedMethod.description);
    setSelectedMethodologyDetails(selectedMethod);
  };

  const handleFinalizeMethodology = () => {
    if (!customMethodology.trim()) {
      alert('Please select or customize a methodology before finalizing.');
      return;
    }
    
    setFinalized(true);
    setCollapsed(true);
    
    // Create comprehensive methodology object with all details
    const fullMethodology = {
      description: customMethodology,
      details: selectedMethodologyDetails,
      methodologyType: getSelectedMethodologyInfo()?.name || selectedMethodology,
      subMethodology: selectedSubMethodology
    };
    
    setMethodology(fullMethodology);
    
    if (proceedToOutline) {
      proceedToOutline();
      setOutlineActivated(true);
    }
  };

  const handleEditMethodology = () => {
    if (finalized) {
      alert("Warning: Any changes made to the Methodology at this point will NOT modify any research outputs already generated.");
    }
    setFinalized(false);
    setCollapsed(false);
    
    if (outlineActivated) {
      setOutlineNeedsRerun(true);
    }
  };

  const handleRegenerate = () => {
    if (finalized) {
      const confirmRegenerate = window.confirm(
        "This will reset all methodology selections and customizations. Are you sure you want to regenerate?"
      );
      if (!confirmRegenerate) return;
      
      setFinalized(false);
      setCollapsed(false);
    }
    
    setGeneratedMethodologies([]);
    setSelectedMethodologyIndex(null);
    setCustomMethodology('');
    setSelectedMethodologyDetails(null);
    setShowMethodologySelection(true);
  };

  const handleBackToSelection = () => {
    setGeneratedMethodologies([]);
    setSelectedMethodologyIndex(null);
    setCustomMethodology('');
    setSelectedMethodologyDetails(null);
    setShowMethodologySelection(true);
  };

  const toggleCollapse = () => setCollapsed(prev => !prev);

  const getSelectedMethodologyInfo = () => {
    const mainMethodology = methodologyOptions.find(m => m.id === selectedMethodology);
    if (!mainMethodology) return null;
    
    if (selectedSubMethodology) {
      const subMethodology = mainMethodology.sub_methodologies?.find(sm => sm.id === selectedSubMethodology);
      return subMethodology || mainMethodology;
    }
    return mainMethodology;
  };

  return (
    <div className="mb-4 position-relative w-100">
      <div className="d-flex" style={{ position: 'absolute', top: -5, right: 10 }}>
        <FaSyncAlt 
          style={{ 
            cursor: 'pointer', 
            color: '#aaa', 
            marginRight: '8px',
            fontSize: '0.9em'
          }}
          onClick={handleRegenerate}
          title="Regenerate methodology"
        />
        <div
          style={{ cursor: 'pointer', color: '#aaa' }}
          onClick={toggleCollapse}
        >
          {collapsed ? <FaChevronRight /> : <FaChevronDown />}
        </div>
      </div>

      <h3>
        Research Methodology
        {finalized && (
          <small className="text-muted ms-2">(Finalized)</small>
        )}
      </h3>

      {!collapsed && (
        <>
          {error && (
            <div className="alert alert-danger">
              <p>{error}</p>
            </div>
          )}

          {/* Carried Forward Information Summary */}
          <div className="alert alert-info mb-3">
            <h6><strong>Carried Forward Information:</strong></h6>
            <div className="row">
              <div className="col-md-6">
                <small>
                  <strong>Selected Methodology:</strong> {getSelectedMethodologyInfo()?.name || selectedMethodology || 'None'}<br/>
                  <strong>Final Thesis:</strong> {finalThesis || 'Not set'}<br/>
                  <strong>Source Categories:</strong> {sourceCategories?.length || 0} selected
                </small>
              </div>
              <div className="col-md-6">
                <small>
                  <strong>Selected Paper Type:</strong> {selectedPaperType?.name || 'None'}<br/>
                  <strong>Page Count:</strong> {pageCount || 'Not set'}
                </small>
              </div>
            </div>
          </div>

          {/* Methodology Selection Phase */}
          {showMethodologySelection && !finalized && (
            <div className="mb-4">
              <h5>Select Research Methodology</h5>
              
              {/* Main Methodology Selection */}
              <div className="mb-3">
                <label className="form-label">Choose your primary methodology approach:</label>
                <div className="row">
                  {methodologyOptions.map((methodology) => (
                    <div key={methodology.id} className="col-md-6 mb-2">
                      <div
                        className={`card h-100 methodology-card ${selectedMethodology === methodology.id ? 'border-primary' : ''}`}
                        style={{ cursor: 'pointer', minHeight: '120px' }}
                        onClick={() => handleMethodologySelect(methodology.id)}
                      >
                        <div className="card-body">
                          <div className="d-flex align-items-center mb-2">
                            <input
                              type="radio"
                              name="methodology"
                              checked={selectedMethodology === methodology.id}
                              onChange={() => handleMethodologySelect(methodology.id)}
                              className="me-2"
                            />
                            <h6 className="card-title mb-0">{methodology.name}</h6>
                          </div>
                          <div className="mt-2">
                            <small className="text-muted">{methodology.description}</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub-methodology Selection */}
              {selectedMethodology && (
                <div className="mb-3">
                  <label className="form-label">Choose a specific approach (optional):</label>
                  <div className="row">
                    {methodologyOptions
                      .find(m => m.id === selectedMethodology)
                      ?.sub_methodologies?.map((subMethodology) => (
                        <div key={subMethodology.id} className="col-md-6 mb-2">
                          <div
                            className={`card h-100 methodology-card ${selectedSubMethodology === subMethodology.id ? 'border-primary' : ''}`}
                            style={{ cursor: 'pointer', minHeight: '120px' }}
                            onClick={() => handleSubMethodologySelect(subMethodology.id)}
                          >
                            <div className="card-body">
                              <div className="d-flex align-items-center mb-2">
                                <input
                                  type="radio"
                                  name="subMethodology"
                                  checked={selectedSubMethodology === subMethodology.id}
                                  onChange={() => handleSubMethodologySelect(subMethodology.id)}
                                  className="me-2"
                                />
                                <h6 className="card-title mb-0">{subMethodology.name}</h6>
                              </div>
                              <div className="mt-2">
                                <small className="text-muted">{subMethodology.description}</small>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <div className="mt-3">
                <button
                  className="btn btn-primary"
                  onClick={generateMethodologyOptions}
                  disabled={!selectedMethodology || loading}
                >
                  {loading ? 'Generating Options...' : 'Generate Methodology Options'}
                </button>
              </div>
            </div>
          )}

          {/* Generated Methodology Options */}
          {generatedMethodologies.length > 0 && !finalized && (
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5>Select Your Methodology Approach</h5>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={handleBackToSelection}
                >
                  Back to Selection
                </button>
              </div>

              {getSelectedMethodologyInfo() && (
                <div className="alert alert-info mb-3">
                  <strong>Selected:</strong> {getSelectedMethodologyInfo().name}
                  <br />
                  <small>{getSelectedMethodologyInfo().description}</small>
                </div>
              )}

              <div className="row">
                {generatedMethodologies.map((methodology, index) => (
                  <div key={index} className="col-12 mb-3">
                    <div 
                      className={`card h-100 ${selectedMethodologyIndex === index ? 'border-primary' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleMethodologyChoice(index)}
                    >
                      <div className="card-body">
                        <div className="d-flex align-items-start">
                          <input
                            type="radio"
                            name="generatedMethodology"
                            checked={selectedMethodologyIndex === index}
                            onChange={() => handleMethodologyChoice(index)}
                            className="me-2 mt-1"
                          />
                          <div className="flex-grow-1">
                            <h6 className="card-title">{methodology.title}</h6>
                            <p className="card-text">{methodology.description}</p>
                            <div className="mt-2">
                              <small className="text-muted">
                                <strong>Approach:</strong> {methodology.approach}
                              </small>
                            </div>
                            <div className="mt-1">
                              <small className="text-muted">
                                <strong>Source Focus:</strong> {methodology.source_focus}
                              </small>
                            </div>
                            <div className="mt-1">
                              <small className="text-muted">
                                <strong>Structure Alignment:</strong> {methodology.structure_alignment}
                              </small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom Methodology Text Area */}
              {selectedMethodologyIndex !== null && (
                <div className="mb-3">
                  <label className="form-label">Customize your methodology (optional):</label>
                  <textarea
                    className="form-control"
                    rows={6}
                    value={customMethodology}
                    onChange={(e) => setCustomMethodology(e.target.value)}
                    placeholder="Edit the methodology description as needed..."
                  />
                </div>
              )}

              {/* Finalize Button */}
              <div className="mt-3">
                <button
                  className="btn btn-primary"
                  onClick={handleFinalizeMethodology}
                  disabled={selectedMethodologyIndex === null}
                >
                  Save Methodology
                </button>
              </div>
            </div>
          )}

          {/* Finalized State */}
          {finalized && (
            <div className="mt-3">
              <div className="alert alert-success">
                <strong>Finalized Methodology:</strong>
                <div className="mt-2" style={{ whiteSpace: 'pre-wrap' }}>
                  {customMethodology}
                </div>
                
                {selectedMethodologyDetails && (
                  <div className="mt-3">
                    <h6><strong>Methodology Details:</strong></h6>
                    <div className="row">
                      <div className="col-md-4">
                        <small className="text-muted">
                          <strong>Approach:</strong> {selectedMethodologyDetails.approach}
                        </small>
                      </div>
                      <div className="col-md-4">
                        <small className="text-muted">
                          <strong>Source Focus:</strong> {selectedMethodologyDetails.source_focus}
                        </small>
                      </div>
                      <div className="col-md-4">
                        <small className="text-muted">
                          <strong>Structure Alignment:</strong> {selectedMethodologyDetails.structure_alignment}
                        </small>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="d-flex gap-2">
                <button
                  className="btn btn-secondary"
                  onClick={handleEditMethodology}
                >
                  Edit Methodology
                </button>

                {!outlineActivated && (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      if (proceedToOutline) {
                        proceedToOutline();
                        setOutlineActivated(true);
                      }
                    }}
                  >
                    Proceed to Outline
                  </button>
                )}

                {outlineActivated && outlineNeedsRerun && (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      if (proceedToOutline) {
                        proceedToOutline();
                        setOutlineNeedsRerun(false);
                      }
                    }}
                  >
                    Rerun Outline
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MethodologyGenerator;
