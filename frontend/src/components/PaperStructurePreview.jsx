import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaList, FaEye, FaEyeSlash, FaPlus, FaTrash, FaEdit, FaSave, FaTimes, FaArrowUp, FaArrowDown } from 'react-icons/fa';

const PaperStructurePreview = ({ paperType, methodology, subMethodology, paperLength, onStructureChange }) => {
  const [structureData, setStructureData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [editableStructure, setEditableStructure] = useState([]);
  const [editingSection, setEditingSection] = useState(null);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    if (paperType?.id && methodology) {
      fetchStructure();
    }
  }, [paperType, methodology, subMethodology]);

  useEffect(() => {
    // Set total pages based on paperLength
    if (paperLength === 'Maximum Detail') {
      setTotalPages(25);
    } else if (paperLength === 'Adjusted Based on Thesis') {
      setTotalPages(15);
    } else {
      setTotalPages(parseInt(paperLength, 10) || 10);
    }
  }, [paperLength]);

  const fetchStructure = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('http://localhost:8000/paper_structure', {
        paper_type: paperType.id,
        methodology_id: methodology,
        sub_methodology_id: subMethodology
      });
      
      setStructureData(response.data);
      initializeEditableStructure(response.data);
    } catch (err) {
      setError('Failed to load paper structure');
      console.error('Structure fetch error:', err);
    }
    setLoading(false);
  };

  const initializeEditableStructure = (data) => {
    const sections = data.structure.map((section, index) => {
      const isAdmin = ['Title Page', 'Abstract', 'References (APA 7th)'].includes(section);
      const isMethodology = data.has_methodology_sections && 
                           !isAdmin && 
                           !section.includes('Introduction') && 
                           !section.includes('Conclusion');
      
      // Calculate default page allocation
      let defaultPages = 1;
      if (isAdmin) {
        defaultPages = section === 'Abstract' ? 1 : 0.5;
      } else if (section.includes('Introduction')) {
        defaultPages = Math.ceil(totalPages * 0.15);
      } else if (section.includes('Conclusion')) {
        defaultPages = Math.ceil(totalPages * 0.10);
      } else {
        // Distribute remaining pages among content sections
        const contentSections = data.structure.filter(s => 
          !['Title Page', 'Abstract', 'References (APA 7th)'].includes(s) &&
          !s.includes('Introduction') && 
          !s.includes('Conclusion')
        ).length;
        const remainingPages = totalPages - Math.ceil(totalPages * 0.25); // 25% for intro/conclusion
        defaultPages = Math.ceil(remainingPages / contentSections);
      }

      return {
        id: `section-${index}`,
        title: section,
        context: '',
        pages: defaultPages,
        isAdmin,
        isMethodology,
        order: index
      };
    });

    setEditableStructure(sections);
    
    // Notify parent component
    if (onStructureChange) {
      onStructureChange(sections);
    }
  };

  const updateSection = (sectionId, updates) => {
    const newStructure = editableStructure.map(section =>
      section.id === sectionId ? { ...section, ...updates } : section
    );
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
      pages: 2,
      isAdmin: false,
      isMethodology: false,
      order: editableStructure.length
    };
    
    const newStructure = [...editableStructure, newSection];
    setEditableStructure(newStructure);
    setEditingSection(newSection.id);
    
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

  const getTotalAllocatedPages = () => {
    return editableStructure.reduce((total, section) => total + section.pages, 0);
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
      'regression_models': 'Regression & Generalized Models'
      // Add more as needed
    };
    
    const mainMethod = methodologyNames[methodology] || methodology;
    const subMethod = subMethodology ? subMethodologyNames[subMethodology] || subMethodology : null;
    
    if (subMethod) {
      return `${mainMethod} - ${subMethod}`;
    }
    return mainMethod;
  };

  const toggleCollapse = () => setCollapsed(prev => !prev);

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

  const totalAllocated = getTotalAllocatedPages();
  const pagesDifference = totalAllocated - totalPages;

  return (
    <div className="card mb-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <h6 className="mb-0">Paper Structure Preview</h6>
          <span className="badge bg-info ms-2">
            {editableStructure.length} sections
          </span>
          <span className={`badge ms-2 ${pagesDifference === 0 ? 'bg-success' : pagesDifference > 0 ? 'bg-warning' : 'bg-secondary'}`}>
            {totalAllocated}/{totalPages} pages
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
            onClick={toggleCollapse}
          >
            {collapsed ? <FaEye /> : <FaEyeSlash />}
            {collapsed ? ' Show' : ' Hide'}
          </button>
        </div>
      </div>
      
      {!collapsed && (
        <div className="card-body">
          {/* Structure Info */}
          <div className="row mb-3">
            <div className="col-md-4">
              <small className="text-muted">
                <strong>Paper Type:</strong> {structureData.paper_type}
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

          {/* Page Allocation Warning */}
          {pagesDifference !== 0 && (
            <div className={`alert ${pagesDifference > 0 ? 'alert-warning' : 'alert-info'} mb-3`}>
              <small>
                <strong>Page Allocation:</strong> 
                {pagesDifference > 0 
                  ? ` You've allocated ${pagesDifference} more pages than the target length.`
                  : ` You have ${Math.abs(pagesDifference)} pages remaining to allocate.`
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
                  {editingSection === section.id ? (
                    // Edit Mode
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
                          value={section.pages}
                          onChange={(e) => updateSection(section.id, { pages: parseFloat(e.target.value) || 0 })}
                          min="0"
                          step="0.5"
                        />
                      </div>
                      <div className="col-md-2">
                        <div className="d-flex gap-1">
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => setEditingSection(null)}
                            title="Save"
                          >
                            <FaSave />
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => setEditingSection(null)}
                            title="Cancel"
                          >
                            <FaTimes />
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
                            {section.pages} {section.pages === 1 ? 'page' : 'pages'}
                          </span>
                          {section.isAdmin && (
                            <span className="badge bg-secondary">Admin</span>
                          )}
                          {section.isMethodology && (
                            <span className="badge bg-primary">Method</span>
                          )}
                        </div>
                      </div>
                      
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
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => setEditingSection(section.id)}
                          title="Edit section"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removeSection(section.id)}
                          title="Remove section"
                          disabled={section.isAdmin} // Prevent removing admin sections
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Methodology Integration Notice */}
          {structureData.has_methodology_sections && (
            <div className="alert alert-success">
              <small>
                <strong>📋 Structure Enhanced:</strong> Your selected methodology has been integrated into the paper structure. 
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
                This structure is specifically designed for <strong>{paperType.name}</strong> papers
                {structureData.has_methodology_sections && (
                  <span> with integrated <strong>{getMethodologyDisplay()}</strong> methodology sections</span>
                )}. 
                You can customize section titles, add context/focus areas, adjust page allocations, 
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
                  <strong>Page Allocation:</strong><br/>
                  <span className={pagesDifference === 0 ? 'text-success' : 'text-warning'}>
                    {totalAllocated}/{totalPages}
                  </span>
                </small>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaperStructurePreview;