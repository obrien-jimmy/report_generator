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
    onOpenStructurePreview,
  selectedPaperType
}) => {
  const [methodologyOptions, setMethodologyOptions] = useState([]);
  const [selectedMethodology, setSelectedMethodology] = useState('');
  // const [selectedSubMethodology, setSelectedSubMethodology] = useState('');  // Removed from production, kept for future consideration
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
      // setSelectedSubMethodology(methodology.subMethodologyId || methodology.subMethodology || '');  // Removed from production, kept for future consideration
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
      // setSelectedSubMethodology('');  // Removed from production, kept for future consideration
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
    // setSelectedSubMethodology(''); // Clear but don't require - Removed from production, kept for future consideration
    setGeneratedMethodologies([]);
    setMethodologySets([]);
    setCurrentSetIndex(0);
    setSelectedMethodologyIndex(null);
    setSelectedSetIndex(null);
  };

  // const handleSubMethodologySelect = (subMethodologyId) => {  // Removed from production, kept for future consideration
  //   setSelectedSubMethodology(subMethodologyId);
  //   setGeneratedMethodologies([]);
  //   setMethodologySets([]);
  //   setCurrentSetIndex(0);
  //   setSelectedMethodologyIndex(null);
  //   setSelectedSetIndex(null);
  // };

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
        // Remove sub_methodology from request
        final_thesis: finalThesis,
        paper_type: selectedPaperType.name,
        paper_purpose: selectedPaperType.purpose,
        paper_tone: selectedPaperType.tone,
        paper_structure: selectedPaperType.structure,
        source_categories: sourceCategories,
        page_count: 15  // Default reasonable page count
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
    // const subMethodologyInfo = mainMethodologyInfo?.sub_methodologies?.find(sm => sm.id === selectedSubMethodology);  // Removed from production, kept for future consideration
    
    const fullMethodology = {
      description: customMethodology,
      approach: customApproach,
      source_focus: customSourceFocus,
      structure_alignment: customStructureAlignment,
      details: selectedMethodologyDetails,
      methodologyType: mainMethodologyInfo?.name || selectedMethodology,
      methodologyId: selectedMethodology,
      // subMethodology: subMethodologyInfo?.name || selectedSubMethodology,  // Removed from production, kept for future consideration
      // subMethodologyId: selectedSubMethodology,  // Removed from production, kept for future consideration
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
    
    // if (selectedSubMethodology) {  // Removed from production, kept for future consideration
    //   const subMethodology = mainMethodology.sub_methodologies?.find(sm => sm.id === selectedSubMethodology);
    //   return subMethodology || mainMethodology;
    // }
    return mainMethodology;
  };

  // Handle clicking the "Generate Research Structure" button
  const handleGenerateResearchStructure = () => {
    if (!selectedMethodology) return;

    const selected = selectedMethodology;
    const picked = methodologyOptions.find(m => m.id === selected) || { id: selected, name: selected };
    const meth = {
      methodologyType: picked.id || picked.name || selected,
      description: picked.name || selected,
      isCustom: false
    };

    if (typeof setMethodology === 'function') setMethodology(meth);
    // Prefer to open the preview if parent provided a handler; otherwise fall back to proceedToOutline
    if (typeof onOpenStructurePreview === 'function') {
      try {
        onOpenStructurePreview();
      } catch (e) {
        console.error('Error calling onOpenStructurePreview:', e);
      }
    } else if (typeof proceedToOutline === 'function') {
      try {
        proceedToOutline();
      } catch (e) {
        console.error('Error calling proceedToOutline:', e);
      }
    }
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
                  {methodologyOptions.map((methodology) => {
                    const isDisabled = methodology.id !== 'qualitative';
                    return (
                      <div key={methodology.id} className="col-md-6 mb-2">
                        <div
                          className={`card h-100 methodology-card ${selectedMethodology === methodology.id ? 'border-primary' : ''} ${isDisabled ? 'opacity-50' : ''}`}
                          style={{ 
                            cursor: isDisabled ? 'not-allowed' : 'pointer', 
                            minHeight: '120px',
                            backgroundColor: isDisabled ? '#f8f9fa' : ''
                          }}
                          onClick={() => !isDisabled && handleMethodologySelect(methodology.id)}
                        >
                          <div className="card-body">
                            <div className="d-flex align-items-center mb-2">
                              <input
                                type="radio"
                                name="methodology"
                                checked={selectedMethodology === methodology.id}
                                onChange={() => !isDisabled && handleMethodologySelect(methodology.id)}
                                className="me-2"
                                disabled={isDisabled}
                              />
                              <h6 className={`card-title mb-0 ${isDisabled ? 'text-muted' : ''}`}>
                                {methodology.name}
                                {isDisabled && <small className="ms-2">(Coming Soon)</small>}
                              </h6>
                            </div>
                            <div className="mt-2">
                              <small className="text-muted">{methodology.description}</small>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Generate Button */}
              <div className="mt-3">
                <button
                  className="btn btn-primary"
                  onClick={() => handleGenerateResearchStructure()}
                  disabled={!selectedMethodology}
                >
                  Generate Research Structure
                </button>
              </div>
            </div>
          )}
                      {/* Removed generated-options + refinement UI: methodology is set and user can open the Paper Structure Preview */}
        </>
      )}
    </div>
  );
};

export default MethodologyGenerator;
