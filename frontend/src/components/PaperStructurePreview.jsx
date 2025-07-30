import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaList, FaEye, FaEyeSlash, FaPlus, FaTrash, FaEdit, FaSave, FaTimes, FaArrowUp, FaArrowDown, FaSpinner, FaCheck } from 'react-icons/fa';

const PaperStructurePreview = ({ 
  paperType, 
  methodology, 
  subMethodology, 
  paperLength, 
  onStructureChange,
  onGenerateOutline, // Add this prop
  loading, // Add this prop  
  hasGenerated // Add this prop
}) => {
  const [structureData, setStructureData] = useState(null);
  const [error, setError] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [editableStructure, setEditableStructure] = useState([]);
  const [editingMode, setEditingMode] = useState(false);

  // Calculate total pages based on paperLength
  const getTotalPages = () => {
    if (paperLength === 'Maximum Detail') {
      return 25;
    } else if (paperLength === 'Adjusted Based on Thesis') {
      return 15;
    } else {
      return parseInt(paperLength, 10) || 10;
    }
  };

  const totalPages = getTotalPages();

  useEffect(() => {
    if (paperType?.id && methodology) {
      fetchStructure();
    }
  }, [paperType, methodology, subMethodology]);

  // Re-initialize structure when paperLength changes
  useEffect(() => {
    if (structureData) {
      initializeEditableStructure(structureData);
    }
  }, [paperLength]);

  const fetchStructure = async () => {
    setError(null);
    
    try {
      // Get the actual methodology ID to send
      const methodologyId = methodology?.methodologyType || methodology?.methodology_type || methodology;
      const subMethodologyId = subMethodology?.subMethodology || subMethodology?.sub_methodology || subMethodology;
      
      console.log('Sending to backend:');
      console.log('- Paper Type:', paperType.id);
      console.log('- Methodology ID:', methodologyId);
      console.log('- Sub-methodology ID:', subMethodologyId);
      console.log('- Original methodology object:', methodology);
      
      const response = await axios.post('http://localhost:8000/paper_structure', {
        paper_type: paperType.id,
        methodology_id: methodologyId,
        sub_methodology_id: subMethodologyId
      });
      
      // Debug logging
      console.log('Structure response:', response.data);
      console.log('Has methodology sections:', response.data.has_methodology_sections);
      
      setStructureData(response.data);
      initializeEditableStructure(response.data);
    } catch (err) {
      setError('Failed to load paper structure');
      console.error('Structure fetch error:', err);
    }
  };

  const initializeEditableStructure = (data) => {
    const sections = data.structure.map((section, index) => {
      const isAdmin = ['Title Page', 'Abstract', 'References (APA 7th)'].includes(section);
      
      // Determine section type for tagging
      const isIntro = section.toLowerCase().includes('introduction');
      const isSummary = section.toLowerCase().includes('conclusion') || section.toLowerCase().includes('summary');
      
      // TEMPORARY: Force methodology sections to appear for debugging
      console.log('Section:', section);
      console.log('- isAdmin:', isAdmin);
      console.log('- isIntro:', isIntro);
      console.log('- isSummary:', isSummary);
      console.log('- data.has_methodology_sections:', data.has_methodology_sections);
      
      // Force methodology detection for debugging - all non-admin, non-intro, non-summary sections
      const isMethodology = !isAdmin && !isIntro && !isSummary;
      console.log('- Final isMethodology:', isMethodology);
      
      // Calculate default percentage allocation
      let defaultPercentage = 10;
      if (isAdmin) {
        defaultPercentage = 0; // Admin sections don't count toward percentage
      } else if (isIntro) {
        defaultPercentage = 15;
      } else if (isSummary) {
        defaultPercentage = 10;
      } else {
        // Distribute remaining percentage among content sections
        const contentSections = data.structure.filter(s => 
          !['Title Page', 'Abstract', 'References (APA 7th)'].includes(s) &&
          !s.toLowerCase().includes('introduction') && 
          !s.toLowerCase().includes('conclusion') &&
          !s.toLowerCase().includes('summary')
        ).length;
        const remainingPercentage = 100 - 25; // 25% for intro/conclusion
        defaultPercentage = Math.round(remainingPercentage / contentSections);
      }

      return {
        id: `section-${index}`,
        title: section,
        context: '',
        percentage: defaultPercentage,
        pages: isAdmin ? 0 : Math.ceil((defaultPercentage / 100) * totalPages) || 1,
        isAdmin,
        isMethodology, // Using the correctly defined variable
        isIntro,
        isSummary,
        order: index
      };
    });

    console.log('Final sections with methodology tags:', sections);
    setEditableStructure(sections);
    
    // Notify parent component
    if (onStructureChange) {
      onStructureChange(sections);
    }
  };

  const updateSection = (sectionId, updates) => {
    const newStructure = editableStructure.map(section => {
      if (section.id === sectionId) {
        const updatedSection = { ...section, ...updates };
        // Recalculate pages when percentage changes
        if (updates.percentage !== undefined) {
          updatedSection.pages = updatedSection.isAdmin ? 0 : Math.ceil((updates.percentage / 100) * totalPages) || 1;
        }
        return updatedSection;
      }
      return section;
    });
    setEditableStructure(newStructure);
    
    if (onStructureChange) {
      onStructureChange(newStructure);
    }
  };

  const addSection = () => {
    const newSection = {
      id: `section-${Date.now()}`,
      title: 'New Section',
      context: '',
      percentage: 10,
      pages: Math.ceil((10 / 100) * totalPages) || 1,
      isAdmin: false,
      isMethodology: false,
      isIntro: false,
      isSummary: false,
      order: editableStructure.length
    };
    
    const newStructure = [...editableStructure, newSection];
    setEditableStructure(newStructure);
    
    if (onStructureChange) {
      onStructureChange(newStructure);
    }
  };

  const removeSection = (sectionId) => {
    const newStructure = editableStructure.filter(section => section.id !== sectionId);
    setEditableStructure(newStructure);
    
    if (onStructureChange) {
      onStructureChange(newStructure);
    }
  };

  const moveSection = (sectionId, direction) => {
    const currentIndex = editableStructure.findIndex(s => s.id === sectionId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= editableStructure.length) return;

    const newStructure = [...editableStructure];
    [newStructure[currentIndex], newStructure[newIndex]] = [newStructure[newIndex], newStructure[currentIndex]];
    
    // Update order
    newStructure.forEach((section, index) => {
      section.order = index;
    });

    setEditableStructure(newStructure);
    
    if (onStructureChange) {
      onStructureChange(newStructure);
    }
  };

  const getTotalAllocatedPercentage = () => {
    return editableStructure
      .filter(section => !section.isAdmin)
      .reduce((total, section) => total + section.percentage, 0);
  };

  const getMethodologyDisplay = () => {
    if (!methodology) return 'Base structure';
    
    // Find methodology names from the methodology options
    const methodologyNames = {
      'quantitative': 'Quantitative Analysis',
      'qualitative': 'Qualitative Analysis', 
      'literature_review': 'Literature-Based Review',
      'mixed_methods': 'Mixed Methods'
    };
    
    const subMethodologyNames = {
      'thematic_analysis': 'Thematic Analysis',
      'case_study': 'Case Study',
      'systematic_review': 'Systematic Review',
      'statistical_techniques': 'Core Statistical Techniques',
      'regression_models': 'Regression & Generalized Models',
      'content_analysis': 'Content Analysis',
      'narrative_review': 'Narrative Review',
      'narrative_analysis': 'Narrative Analysis',
      'scoping_review': 'Scoping Review',
      'integrative_review': 'Integrative Review',
      'critical_review': 'Critical Review',
      'conceptual_review': 'Conceptual Review',
      'meta_synthesis': 'Meta-Synthesis'
    };
    
    // Get the main methodology display name
    const mainMethod = methodologyNames[methodology] || methodology;
    
    // Get the sub-methodology display name if it exists
    const subMethod = subMethodology ? subMethodologyNames[subMethodology] : null;
    
    // Only show the sub-methodology if it exists and is different from the main methodology
    if (subMethod && subMethod !== mainMethod) {
      return `${mainMethod} - ${subMethod}`;
    }
    
    // If sub-methodology is the same as main or doesn't exist, just show the main
    return mainMethod;
  };

  const toggleCollapse = () => setCollapsed(prev => !prev);
  const toggleEditingMode = () => setEditingMode(prev => !prev);

  if (loading) {
    return (
      <div className="alert alert-info">
        Loading paper structure...
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-warning">
        <strong>Structure Preview:</strong> {error}
      </div>
    );
  }

  if (!structureData) {
    return null;
  }

  const totalAllocated = getTotalAllocatedPercentage();
  const percentageDifference = totalAllocated - 100;

  return (
    <div className="card mb-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <h6 className="mb-0">Paper Structure Preview</h6>
          <span className="badge bg-info ms-2">
            {editableStructure.length} sections
          </span>
          <span className={`badge ms-2 ${percentageDifference === 0 ? 'bg-success' : percentageDifference > 0 ? 'bg-warning' : 'bg-secondary'}`}>
            {totalAllocated}% allocated
          </span>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={addSection}
            title="Add new section"
          >
            <FaPlus />
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={toggleEditingMode}
            title="Edit all sections"
          >
            <FaEdit />
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={toggleCollapse}
          >
            {collapsed ? <FaEye /> : <FaEyeSlash />}
          </button>
        </div>
      </div>
      
      {!collapsed && (
        <div className="card-body">
          {/* Structure Info */}
          <div className="row mb-3">
            <div className="col-md-4">
              <small className="text-muted">
                <strong>Paper Type:</strong> {paperType?.name || structureData.paper_type}
              </small>
            </div>
            <div className="col-md-4">
              <small className="text-muted">
                <strong>Methodology:</strong> {getMethodologyDisplay()}
              </small>
            </div>
            <div className="col-md-4">
              <small className="text-muted">
                <strong>Enhanced:</strong> {structureData.has_methodology_sections ? 'Yes' : 'No'}
              </small>
            </div>
          </div>

          {/* Percentage Allocation Warning */}
          {percentageDifference !== 0 && (
            <div className={`alert ${percentageDifference > 0 ? 'alert-warning' : 'alert-info'} mb-3`}>
              <small>
                <strong>Percentage Allocation:</strong> 
                {percentageDifference > 0 
                  ? ` You've allocated ${percentageDifference}% more than 100%.`
                  : ` You have ${Math.abs(percentageDifference)}% remaining to allocate.`
                }
              </small>
            </div>
          )}

          {/* Editable Structure List */}
          <div className="mb-3">
            <h6 className="text-primary mb-2">
              <FaList className="me-2" />
              Structure Sections
            </h6>
            
            <div className="list-group">
              {editableStructure.map((section, index) => (
                <div key={section.id} className="list-group-item">
                  {editingMode ? (
                    // Edit Mode for All Sections
                    <div className="row align-items-center">
                      <div className="col-md-4">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={section.title}
                          onChange={(e) => updateSection(section.id, { title: e.target.value })}
                          placeholder="Section title"
                        />
                      </div>
                      <div className="col-md-4">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={section.context}
                          onChange={(e) => updateSection(section.id, { context: e.target.value })}
                          placeholder="Context/focus (optional)"
                        />
                      </div>
                      <div className="col-md-2">
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={section.percentage}
                          onChange={(e) => updateSection(section.id, { percentage: parseInt(e.target.value) || 0 })}
                          min="0"
                          max="100"
                          disabled={section.isAdmin}
                          placeholder={section.isAdmin ? "N/A" : "%"}
                        />
                      </div>
                      <div className="col-md-2">
                        <div className="d-flex gap-1">
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => moveSection(section.id, 'up')}
                            disabled={index === 0}
                            title="Move up"
                          >
                            <FaArrowUp />
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => moveSection(section.id, 'down')}
                            disabled={index === editableStructure.length - 1}
                            title="Move down"
                          >
                            <FaArrowDown />
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeSection(section.id)}
                            title="Remove section"
                            disabled={section.isAdmin}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center flex-grow-1">
                        <span className="badge bg-secondary me-2">{index + 1}</span>
                        <div className="flex-grow-1">
                          <span className="fw-semibold">{section.title}</span>
                          {section.context && (
                            <div className="text-muted small mt-1">
                              Focus: {section.context}
                            </div>
                          )}
                        </div>
                        <div className="d-flex align-items-center gap-2 me-3">
                          <span className="badge bg-light text-dark">
                            {section.isAdmin ? 'Admin' : `${section.percentage}%`}
                          </span>
                          <span className="badge bg-light text-dark">
                            {section.isAdmin ? 'N/A' : `${section.pages}p`}
                          </span>
                          {section.isAdmin && (
                            <span className="badge bg-secondary" style={{ minWidth: '50px' }}>Admin</span>
                          )}
                          {section.isMethodology && (
                            <span className="badge bg-primary" style={{ minWidth: '50px' }}>Method</span>
                          )}
                          {section.isIntro && (
                            <span className="badge bg-success" style={{ minWidth: '50px' }}>Intro</span>
                          )}
                          {section.isSummary && (
                            <span className="badge bg-success" style={{ minWidth: '50px' }}>Summary</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {editingMode && (
              <div className="mt-3 d-flex gap-2">
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => setEditingMode(false)}
                >
                  <FaSave className="me-1" />
                  Save Changes
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setEditingMode(false)}
                >
                  <FaTimes className="me-1" />
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Methodology Integration Notice */}
          {structureData.has_methodology_sections && (
            <div className="alert alert-success">
              <small>
                <strong>Structure Enhanced:</strong> Your selected methodology has been integrated into the paper structure. 
                Methodology-specific sections have been added to support your research approach.
              </small>
            </div>
          )}

          {/* Paper Type Info */}
          <div className="mt-3">
            <details className="text-muted">
              <summary className="cursor-pointer">
                <small><strong>About this structure</strong></small>
              </summary>
              <small className="mt-2 d-block">
                This structure is specifically designed for <strong>{paperType?.name || structureData.paper_type}</strong> papers
                {structureData.has_methodology_sections && (
                  <span> with integrated <strong>{getMethodologyDisplay()}</strong> methodology sections</span>
                )}. 
                You can customize section titles, add context/focus areas, adjust percentage allocations, 
                and reorder sections to match your research needs. The outline generator will use 
                this customized structure as a foundation.
              </small>
            </details>
          </div>

          {/* Structure Summary */}
          <div className="mt-3 p-2 bg-light rounded">
            <div className="row text-center">
              <div className="col-md-3">
                <small className="text-muted">
                  <strong>Total Sections:</strong><br/>
                  {editableStructure.length}
                </small>
              </div>
              <div className="col-md-3">
                <small className="text-muted">
                  <strong>Content Sections:</strong><br/>
                  {editableStructure.filter(s => !s.isAdmin).length}
                </small>
              </div>
              <div className="col-md-3">
                <small className="text-muted">
                  <strong>Method Sections:</strong><br/>
                  {editableStructure.filter(s => s.isMethodology).length}
                </small>
              </div>
              <div className="col-md-3">
                <small className="text-muted">
                  <strong>Total Pages:</strong><br/>
                  <span className={percentageDifference === 0 ? 'text-success' : 'text-warning'}>
                    {editableStructure.filter(s => !s.isAdmin).reduce((total, s) => total + s.pages, 0)}/{totalPages}
                  </span>
                </small>
              </div>
            </div>
          </div>

          {/* Add the Generate Outline button at the bottom */}
          <div className="mt-4 d-flex justify-content-center">
            <button 
              className="btn btn-primary btn-lg"
              onClick={onGenerateOutline}
              disabled={loading || hasGenerated}
            >
              {loading ? (
                <>
                  <FaSpinner className="fa-spin me-2" />
                  Generating Framework...
                </>
              ) : hasGenerated ? (
                <>
                  <FaCheck className="me-2" />
                  Framework Generated
                </>
              ) : (
                'Generate Outline'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaperStructurePreview;