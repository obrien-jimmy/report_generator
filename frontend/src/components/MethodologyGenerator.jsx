import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEdit, FaSave, FaTimes, FaInfoCircle, FaChevronLeft, FaChevronRight, FaPlus } from 'react-icons/fa';
import './ComponentStyles.css';

const MethodologyGenerator = ({
  finalThesis,
  sourceCategories,
  methodology, // <-- receive saved methodology as prop
  setMethodology,
  proceedToOutline,
  selectedPaperType,
  pageCount
}) => {
  const [methodologyOptions, setMethodologyOptions] = useState([]);
  const [selectedMethodology, setSelectedMethodology] = useState('');
  const [selectedSubMethodology, setSelectedSubMethodology] = useState('');
  const [generatedMethodologies, setGeneratedMethodologies] = useState([]);
  const [methodologySets, setMethodologySets] = useState([]);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [selectedMethodologyIndex, setSelectedMethodologyIndex] = useState(null);
  const [selectedSetIndex, setSelectedSetIndex] = useState(null);
  const [customMethodology, setCustomMethodology] = useState('');
  const [customApproach, setCustomApproach] = useState('');
  const [customSourceFocus, setCustomSourceFocus] = useState('');
  const [customStructureAlignment, setCustomStructureAlignment] = useState('');
  const [selectedMethodologyDetails, setSelectedMethodologyDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState(null);
  const [showMethodologySelection, setShowMethodologySelection] = useState(true);
  const [outlineActivated, setOutlineActivated] = useState(false);
  const [outlineNeedsRerun, setOutlineNeedsRerun] = useState(false);
  const [hasLoadedOptions, setHasLoadedOptions] = useState(false);
  const [isCustomMethodology, setIsCustomMethodology] = useState(false);

  // Hydrate from saved methodology when it changes (e.g., after loading a project)
  useEffect(() => {
    // Debug: See what is being loaded
    // console.log('Loaded methodology:', methodology);

    if (
      methodology &&
      typeof methodology === 'object' &&
      Object.keys(methodology).length > 0 &&
      methodology.description && methodology.approach && methodology.source_focus && methodology.structure_alignment
    ) {
      setCustomMethodology(methodology.description || '');
      setCustomApproach(methodology.approach || '');
      setCustomSourceFocus(methodology.source_focus || '');
      setCustomStructureAlignment(methodology.structure_alignment || '');
      setSelectedMethodologyDetails(methodology.details || null);
      
      // Use IDs if available, fallback to names/types for backward compatibility
      setSelectedMethodology(methodology.methodologyId || methodology.methodologyType || '');
      setSelectedSubMethodology(methodology.subMethodologyId || methodology.subMethodology || '');
      setIsCustomMethodology(!!methodology.isCustom);

      // Mark as finalized and show the finalized UI
      setFinalized(true);
      setCollapsed(false); // or true if you want it collapsed by default
      setShowMethodologySelection(false);

      // Optionally, clear out any selection UI state
      setSelectedMethodologyIndex(null);
      setSelectedSetIndex(null);
      setGeneratedMethodologies([]);
      setMethodologySets([]);
      setCurrentSetIndex(0);
    } else {
      // If no saved methodology, reset to initial state
      setCustomMethodology('');
      setCustomApproach('');
      setCustomSourceFocus('');
      setCustomStructureAlignment('');
      setSelectedMethodologyDetails(null);
      setSelectedMethodology('');
      setSelectedSubMethodology('');
      setIsCustomMethodology(false);
      setFinalized(false);
      setCollapsed(false);
      setShowMethodologySelection(true);
      setSelectedMethodologyIndex(null);
      setSelectedSetIndex(null);
      setGeneratedMethodologies([]);
      setMethodologySets([]);
      setCurrentSetIndex(0);
    }
  }, [methodology]);

  const loadMethodologyOptions = async () => {
    if (hasLoadedOptions) return;
    
    try {
      const res = await axios.get('http://localhost:8000/methodology_options');
      setMethodologyOptions(res.data.methodologies);
      setHasLoadedOptions(true);
    } catch (err) {
      console.error('Error loading methodology options:', err);
      setError('Failed to load methodology options');
    }
  };

  // Auto-load when component is first mounted
  useEffect(() => {
    if (!hasLoadedOptions) {
      loadMethodologyOptions();
    }
  }, [hasLoadedOptions]);

  const handleManualLoad = () => {
    if (!hasLoadedOptions) {
      loadMethodologyOptions();
    }
  };

  const handleMethodologySelect = (methodologyId) => {
    setSelectedMethodology(methodologyId);
    setSelectedSubMethodology('');
    setGeneratedMethodologies([]);
    setMethodologySets([]);
    setCurrentSetIndex(0);
    setSelectedMethodologyIndex(null);
    setSelectedSetIndex(null);
  };

  const handleSubMethodologySelect = (subMethodologyId) => {
    setSelectedSubMethodology(subMethodologyId);
    setGeneratedMethodologies([]);
    setMethodologySets([]);
    setCurrentSetIndex(0);
    setSelectedMethodologyIndex(null);
    setSelectedSetIndex(null);
  };

  const generateMethodologyOptions = async () => {
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

      const res = await axios.post('http://localhost:8000/generate_methodology_options', requestData);
      
      // If this is the first set, initialize arrays
      if (methodologySets.length === 0) {
        setMethodologySets([res.data.methodologies]);
        setGeneratedMethodologies(res.data.methodologies);
        setCurrentSetIndex(0);
      } else {
        // Add new set to existing sets
        const newSets = [...methodologySets, res.data.methodologies];
        setMethodologySets(newSets);
        setGeneratedMethodologies(res.data.methodologies);
        setCurrentSetIndex(newSets.length - 1);
      }
      
      setShowMethodologySelection(false);
      setSelectedMethodologyIndex(null);
      setSelectedSetIndex(null);
    } catch (err) {
      console.error('Methodology generation error:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to generate methodology options.');
    }
    setLoading(false);
  };

  const handleMethodologyChoice = (index) => {
    setSelectedMethodologyIndex(index);
    setSelectedSetIndex(currentSetIndex);
    setIsCustomMethodology(false);
    const selectedMethod = generatedMethodologies[index];
    setCustomMethodology(selectedMethod.description);
    setCustomApproach(selectedMethod.approach);
    setCustomSourceFocus(selectedMethod.source_focus);
    setCustomStructureAlignment(selectedMethod.structure_alignment);
    setSelectedMethodologyDetails(selectedMethod);
  };

  const handleCustomMethodologyChoice = () => {
    setIsCustomMethodology(true);
    setSelectedMethodologyIndex(null);
    setSelectedSetIndex(null);
    setCustomMethodology('');
    setCustomApproach('');
    setCustomSourceFocus('');
    setCustomStructureAlignment('');
    setSelectedMethodologyDetails(null);
  };

  const handleSetNavigation = (direction) => {
    if (direction === 'prev' && currentSetIndex > 0) {
      const newIndex = currentSetIndex - 1;
      setCurrentSetIndex(newIndex);
      setGeneratedMethodologies(methodologySets[newIndex]);
      setSelectedMethodologyIndex(null);
      setSelectedSetIndex(null);
    } else if (direction === 'next' && currentSetIndex < methodologySets.length - 1) {
      const newIndex = currentSetIndex + 1;
      setCurrentSetIndex(newIndex);
      setGeneratedMethodologies(methodologySets[newIndex]);
      setSelectedMethodologyIndex(null);
      setSelectedSetIndex(null);
    }
  };

  const validateMethodologyFields = () => {
    const errors = [];
    
    if (!customMethodology.trim()) {
      errors.push('Description is required');
    }
    if (!customApproach.trim()) {
      errors.push('Approach is required');
    }
    if (!customSourceFocus.trim()) {
      errors.push('Source Focus is required');
    }
    if (!customStructureAlignment.trim()) {
      errors.push('Structure Alignment is required');
    }
    
    return errors;
  };

  const handleFinalizeMethodology = () => {
    const validationErrors = validateMethodologyFields();
    
    if (validationErrors.length > 0) {
      alert('Please fill in all required fields:\n' + validationErrors.join('\n'));
      return;
    }
    
    setFinalized(true);
    setCollapsed(true);
    
    // Get the actual methodology names instead of IDs
    const selectedMethodologyInfo = getSelectedMethodologyInfo();
    const mainMethodologyInfo = methodologyOptions.find(m => m.id === selectedMethodology);
    const subMethodologyInfo = mainMethodologyInfo?.sub_methodologies?.find(sm => sm.id === selectedSubMethodology);
    
    const fullMethodology = {
      description: customMethodology,
      approach: customApproach,
      source_focus: customSourceFocus,
      structure_alignment: customStructureAlignment,
      details: selectedMethodologyDetails,
      methodologyType: mainMethodologyInfo?.name || selectedMethodology,
      methodologyId: selectedMethodology,
      subMethodology: subMethodologyInfo?.name || selectedSubMethodology,
      subMethodologyId: selectedSubMethodology,
      isCustom: isCustomMethodology
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
    setMethodologySets([]);
    setCurrentSetIndex(0);
    setSelectedMethodologyIndex(null);
    setSelectedSetIndex(null);
    setCustomMethodology('');
    setCustomApproach('');
    setCustomSourceFocus('');
    setCustomStructureAlignment('');
    setSelectedMethodologyDetails(null);
    setShowMethodologySelection(true);
    setIsCustomMethodology(false);
  };

  const handleBackToSelection = () => {
    setGeneratedMethodologies([]);
    setMethodologySets([]);
    setCurrentSetIndex(0);
    setSelectedMethodologyIndex(null);
    setSelectedSetIndex(null);
    setCustomMethodology('');
    setCustomApproach('');
    setCustomSourceFocus('');
    setCustomStructureAlignment('');
    setSelectedMethodologyDetails(null);
    setShowMethodologySelection(true);
    setIsCustomMethodology(false);
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

  const getPageCountDisplay = () => {
    if (pageCount === -1) {
      return 'Adjusted based on scope';
    }
    return pageCount || 'Not set';
  };

  return (
    <div className="mb-4 position-relative w-100">
      <div className="d-flex" style={{ position: 'absolute', top: 0, right: 0 }}>
        {!finalized && (
          <button
            className="btn btn-sm btn-outline-secondary me-2"
            onClick={handleRegenerate}
            title="Regenerate methodology"
          >
            Refresh
          </button>
        )}
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={toggleCollapse}
        >
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
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

          {/* Show manual load button if methodology options haven't been loaded yet */}
          {!hasLoadedOptions && (
            <div className="mb-3">
              <button
                className="btn btn-primary"
                onClick={handleManualLoad}
              >
                Load Methodology Options
              </button>
            </div>
          )}

          {/* Carried Forward Information Summary */}
          {hasLoadedOptions && (
            <div className="alert alert-info mb-3">
              <h6><strong>Carried Forward Information:</strong></h6>
              <div className="row">
                <div className="col-md-6">
                  <small>
                    <strong>Final Thesis:</strong> {finalThesis || 'Not set'}
                  </small>
                </div>
                <div className="col-md-6">
                  <small>
                    <strong>Source Categories:</strong> {sourceCategories?.length || 0} selected<br/>
                    <strong>Selected Paper Type:</strong> {selectedPaperType?.name || 'None'}<br/>
                    <strong>Paper Structure:</strong> {selectedPaperType?.structure || 'Not set'}<br/>
                    <strong>Page Count:</strong> {getPageCountDisplay()}
                  </small>
                </div>
              </div>
            </div>
          )}

          {/* Methodology Selection Phase */}
          {showMethodologySelection && !finalized && hasLoadedOptions && (
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
          {methodologySets.length > 0 && !finalized && (
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

              {/* Set Navigation and Controls */}
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center">
                  <button
                    className="btn btn-sm btn-outline-secondary me-2"
                    onClick={() => handleSetNavigation('prev')}
                    disabled={currentSetIndex === 0}
                  >
                    <FaChevronLeft />
                  </button>
                  <span className="me-2">
                    Set {currentSetIndex + 1} of {methodologySets.length}
                  </span>
                  <button
                    className="btn btn-sm btn-outline-secondary me-3"
                    onClick={() => handleSetNavigation('next')}
                    disabled={currentSetIndex === methodologySets.length - 1}
                  >
                    <FaChevronRight />
                  </button>
                </div>
                
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={generateMethodologyOptions}
                    disabled={loading}
                  >
                    <FaPlus className="me-1" />
                    {loading ? 'Generating...' : 'Generate New Set'}
                  </button>
                </div>
              </div>

              {/* Methodology Options Grid */}
              <div className="row">
                {generatedMethodologies.map((methodology, index) => (
                  <div key={index} className="col-12 mb-3">
                    <div 
                      className={`card h-100 ${selectedMethodologyIndex === index && selectedSetIndex === currentSetIndex ? 'border-primary' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleMethodologyChoice(index)}
                    >
                      <div className="card-body">
                        <div className="d-flex align-items-start">
                          <input
                            type="radio"
                            name="generatedMethodology"
                            checked={selectedMethodologyIndex === index && selectedSetIndex === currentSetIndex}
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
                
                {/* Custom Methodology Option */}
                <div className="col-12 mb-3">
                  <div 
                    className={`card h-100 ${isCustomMethodology ? 'border-primary' : 'border-secondary'}`}
                    style={{ cursor: 'pointer', borderStyle: 'dashed' }}
                    onClick={handleCustomMethodologyChoice}
                  >
                    <div className="card-body">
                      <div className="d-flex align-items-start">
                        <input
                          type="radio"
                          name="generatedMethodology"
                          checked={isCustomMethodology}
                          onChange={handleCustomMethodologyChoice}
                          className="me-2 mt-1"
                        />
                        <div className="flex-grow-1">
                          <h6 className="card-title">Create Custom Methodology</h6>
                          <p className="card-text text-muted">
                            Design your own methodology with custom approach, source focus, and structure alignment
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Methodology Fields */}
              {(selectedMethodologyIndex !== null || isCustomMethodology) && (
                <div className="mb-3">
                  <h6 className="form-label">
                    {isCustomMethodology ? 'Create Custom Methodology' : 'Customize Your Methodology'} 
                    <span className="text-danger">*</span>
                  </h6>
                  <p className="text-muted small">All fields are required. Edit the methodology to match your research needs.</p>
                  
                  {/* Description */}
                  <div className="mb-3">
                    <label className="form-label">
                      Description <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={customMethodology}
                      onChange={(e) => setCustomMethodology(e.target.value)}
                      placeholder="Describe your methodology approach..."
                      required
                    />
                  </div>

                  {/* Approach */}
                  <div className="mb-3">
                    <label className="form-label">
                      Approach <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={customApproach}
                      onChange={(e) => setCustomApproach(e.target.value)}
                      placeholder="Describe your approach..."
                      required
                    />
                  </div>

                  {/* Source Focus */}
                  <div className="mb-3">
                    <label className="form-label">
                      Source Focus <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={customSourceFocus}
                      onChange={(e) => setCustomSourceFocus(e.target.value)}
                      placeholder="Describe your source focus..."
                      required
                    />
                  </div>

                  {/* Structure Alignment */}
                  <div className="mb-3">
                    <label className="form-label">
                      Structure Alignment <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={customStructureAlignment}
                      onChange={(e) => setCustomStructureAlignment(e.target.value)}
                      placeholder="Describe how this methodology aligns with your paper structure..."
                      required
                    />
                  </div>
                </div>
              )}

              {/* Finalize Button */}
              <div className="mt-3">
                <button
                  className="btn btn-primary"
                  onClick={handleFinalizeMethodology}
                  disabled={selectedMethodologyIndex === null && !isCustomMethodology}
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
                {isCustomMethodology && <span className="badge bg-info ms-2">Custom</span>}
                <div className="mt-2" style={{ whiteSpace: 'pre-wrap' }}>
                  {customMethodology}
                </div>
                <div className="mt-3">
                  <h6><strong>Methodology Details:</strong></h6>
                  <div className="row">
                    <div className="col-md-4">
                      <small className="text-muted">
                        <strong>Approach:</strong><br/>
                        {customApproach}
                      </small>
                    </div>
                    <div className="col-md-4">
                      <small className="text-muted">
                        <strong>Source Focus:</strong><br/>
                        {customSourceFocus}
                      </small>
                    </div>
                    <div className="col-md-4">
                      <small className="text-muted">
                        <strong>Structure Alignment:</strong><br/>
                        {customStructureAlignment}
                      </small>
                    </div>
                  </div>
                </div>
                {selectedMethodology && (
                  <div className="mt-3">
                    <small className="text-muted">
                      <strong>Selected Methodology:</strong> {methodologyOptions.find(m => m.id === selectedMethodology)?.name || selectedMethodology}
                      {selectedSubMethodology && (
                        <>
                          <br />
                          <strong>Sub-Methodology:</strong> {(() => {
                            const mainMethod = methodologyOptions.find(m => m.id === selectedMethodology);
                            const subMethod = mainMethod?.sub_methodologies?.find(sm => sm.id === selectedSubMethodology);
                            return subMethod?.name || selectedSubMethodology;
                          })()}
                        </>
                      )}
                    </small>
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
