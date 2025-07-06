import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaFileAlt, FaList, FaEye, FaEyeSlash, FaCheck, FaEdit } from 'react-icons/fa';

const OutlineGenerator = ({ finalThesis, methodology, paperLength, sourceCategories, selectedPaperType }) => {
  const [outline, setOutline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [saved, setSaved] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});

  // Paper Structure States
  const [structureData, setStructureData] = useState(null);
  const [structureLoading, setStructureLoading] = useState(false);
  const [structureError, setStructureError] = useState(null);
  const [structureApproved, setStructureApproved] = useState(false);
  const [structureCollapsed, setStructureCollapsed] = useState(false);

  // Auto-load paper structure when component mounts
  useEffect(() => {
    if (selectedPaperType?.id && methodology) {
      loadPaperStructure();
    }
  }, [selectedPaperType, methodology]);

  const loadPaperStructure = async () => {
    setStructureLoading(true);
    setStructureError(null);
    
    try {
      // Extract methodology IDs from methodology object
      const methodologyId = methodology?.methodologyType || methodology?.methodology_type;
      const subMethodologyId = methodology?.subMethodology || methodology?.sub_methodology;

      const response = await axios.post('http://localhost:8000/paper_structure', {
        paper_type: selectedPaperType.id,
        methodology_id: methodologyId,
        sub_methodology_id: subMethodologyId
      });
      
      setStructureData(response.data);
    } catch (err) {
      setStructureError('Failed to load paper structure');
      console.error('Structure fetch error:', err);
    }
    setStructureLoading(false);
  };

  const approveStructure = () => {
    setStructureApproved(true);
  };

  const editStructure = () => {
    setStructureApproved(false);
    loadPaperStructure();
  };

  const generateOutline = async () => {
    if (!structureApproved) {
      setError('Please approve the paper structure first');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const safePaperLength = paperLength === 'Maximum Detail' ? -2 :
                              paperLength === 'Adjusted Based on Thesis' ? -1 :
                              parseInt(paperLength, 10);

      // Extract methodology IDs from methodology object
      const methodologyId = methodology?.methodologyType || methodology?.methodology_type;
      const subMethodologyId = methodology?.subMethodology || methodology?.sub_methodology;

      // Use structured outline generation
      const res = await axios.post('http://localhost:8000/generate_structured_outline', {
        final_thesis: finalThesis,
        paper_type: selectedPaperType?.id || 'research',
        methodology,
        paper_length_pages: safePaperLength,
        source_categories: sourceCategories,
        methodology_id: methodologyId,
        sub_methodology_id: subMethodologyId
      });

      // Convert structured outline to expected format
      const sections = res.data.outline.map(section => ({
        section_title: section.section_title,
        section_context: section.section_context,
        subsections: [],
        is_administrative: section.is_administrative || false
      }));

      setOutline(sections);
      setHasGenerated(true);
      setSaved(true);
      
      // Only generate subsections for non-administrative sections
      const contentSections = sections.filter(sec => !sec.is_administrative);
      await generateSubsectionsSequentially(contentSections);

    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to generate outline.');
    }
    setLoading(false);
  };

  const generateSubsectionsSequentially = async (sections) => {
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      try {
        const safePaperLength = paperLength === 'Maximum Detail' ? -2 :
                                paperLength === 'Adjusted Based on Thesis' ? -1 :
                                parseInt(paperLength, 10);

        const requestPayload = {
          section_title: section.section_title,
          section_context: section.section_context,
          final_thesis: finalThesis,
          methodology: methodology,
          paper_length_pages: safePaperLength,
          source_categories: sourceCategories // Add this if needed
        };

        console.log('Generating subsections for:', section.section_title);
        console.log('Request payload:', requestPayload);

        const res = await axios.post('http://localhost:8000/generate_subsections', requestPayload);

        setOutline(prevOutline => 
          prevOutline.map(outlineSection => 
            outlineSection.section_title === section.section_title
              ? { ...outlineSection, subsections: res.data.subsections }
              : outlineSection
          )
        );
      } catch (err) {
        console.error(`Error generating subsections for ${section.section_title}:`, err);
        console.error('Error details:', err.response?.data);
        
        // Continue with other sections even if one fails
        continue;
      }
    }
  };

  const toggleStructureCollapse = () => setStructureCollapsed(prev => !prev);

  // Paper Structure Preview Component
  const PaperStructurePreview = () => {
    if (structureLoading) {
      return (
        <div className="alert alert-info">
          <FaFileAlt className="me-2" />
          Loading paper structure...
        </div>
      );
    }

    if (structureError) {
      return (
        <div className="alert alert-danger">
          <strong>Structure Error:</strong> {structureError}
          <button 
            className="btn btn-sm btn-outline-primary ms-2"
            onClick={loadPaperStructure}
          >
            Retry
          </button>
        </div>
      );
    }

    if (!structureData) {
      return (
        <div className="alert alert-warning">
          <strong>No Structure:</strong> Unable to load paper structure.
          <button 
            className="btn btn-sm btn-outline-primary ms-2"
            onClick={loadPaperStructure}
          >
            Load Structure
          </button>
        </div>
      );
    }

    return (
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <FaFileAlt className="me-2 text-primary" />
            <h6 className="mb-0">Paper Structure Preview</h6>
            <span className="badge bg-info ms-2">
              {structureData.total_sections} sections
            </span>
            {structureApproved && (
              <span className="badge bg-success ms-2">
                <FaCheck className="me-1" />
                Approved
              </span>
            )}
          </div>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={toggleStructureCollapse}
          >
            {structureCollapsed ? <FaEye /> : <FaEyeSlash />}
            {structureCollapsed ? ' Show' : ' Hide'}
          </button>
        </div>
        
        {!structureCollapsed && (
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
                  <strong>Methodology:</strong> {structureData.methodology || 'Base structure'}
                </small>
              </div>
              <div className="col-md-4">
                <small className="text-muted">
                  <strong>Enhanced:</strong> {structureData.has_methodology_sections ? 'Yes' : 'No'}
                </small>
              </div>
            </div>

            {/* Structure List */}
            <div className="mb-3">
              <h6 className="text-primary mb-2">
                <FaList className="me-2" />
                Recommended Structure
              </h6>
              <div className="list-group">
                {structureData.structure.map((section, index) => (
                  <div key={index} className="list-group-item d-flex align-items-center">
                    <span className="badge bg-secondary me-2">{index + 1}</span>
                    <span className="flex-grow-1">{section}</span>
                    {/* Highlight methodology-specific sections */}
                    {structureData.has_methodology_sections && 
                     !['Title Page', 'Abstract', 'References (APA 7th)'].includes(section) && 
                     !section.includes('Introduction') && 
                     !section.includes('Conclusion') && (
                      <span className="badge bg-primary ms-2">Method</span>
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

            {/* Action Buttons */}
            <div className="d-flex gap-2 mt-3">
              {!structureApproved ? (
                <>
                  <button 
                    className="btn btn-success"
                    onClick={approveStructure}
                  >
                    <FaCheck className="me-1" />
                    Approve Structure
                  </button>
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={loadPaperStructure}
                  >
                    <FaEdit className="me-1" />
                    Regenerate
                  </button>
                </>
              ) : (
                <button 
                  className="btn btn-outline-warning"
                  onClick={editStructure}
                >
                  <FaEdit className="me-1" />
                  Edit Structure
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mb-4">
      <h4>Research Outline Generator</h4>
      
      {/* Paper Structure Preview - Always show first */}
      <PaperStructurePreview />

      {/* Outline Generation Section - Only show after structure is approved */}
      {structureApproved && (
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Generate Detailed Outline</h5>
          </div>
          <div className="card-body">
            {!hasGenerated && (
              <div className="mb-3">
                <p className="text-muted">
                  Your paper structure has been approved. Click below to generate a detailed outline 
                  based on your thesis, methodology, and the approved structure.
                </p>
                <button 
                  className="btn btn-primary"
                  onClick={generateOutline}
                  disabled={loading}
                >
                  {loading ? 'Generating Outline...' : 'Generate Detailed Outline'}
                </button>
              </div>
            )}

            {error && (
              <div className="alert alert-danger">
                <strong>Error:</strong> {error}
              </div>
            )}

            {/* Outline Display */}
            {hasGenerated && outline.length > 0 && (
              <div className="mt-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6>Generated Outline</h6>
                  <div className="d-flex gap-2">
                    <button 
                      className="btn btn-sm btn-outline-primary"
                      onClick={generateOutline}
                      disabled={loading}
                    >
                      {loading ? 'Regenerating...' : 'Regenerate Outline'}
                    </button>
                    <button 
                      className="btn btn-sm btn-success"
                      onClick={() => setSaved(true)}
                    >
                      {saved ? 'Saved' : 'Save Outline'}
                    </button>
                  </div>
                </div>

                {/* Outline Sections */}
                {outline.map((section, sectionIndex) => (
                  <div key={sectionIndex} className="card mb-3">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        <span className="badge bg-primary me-2">{sectionIndex + 1}</span>
                        <h6 className="mb-0">{section.section_title}</h6>
                        {section.is_administrative && (
                          <span className="badge bg-secondary ms-2">Admin</span>
                        )}
                      </div>
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setCollapsedSections(prev => ({
                          ...prev,
                          [sectionIndex]: !prev[sectionIndex]
                        }))}
                      >
                        {collapsedSections[sectionIndex] ? <FaEye /> : <FaEyeSlash />}
                      </button>
                    </div>
                    
                    {!collapsedSections[sectionIndex] && (
                      <div className="card-body">
                        <p className="text-muted mb-3">{section.section_context}</p>
                        
                        {/* Subsections */}
                        {section.subsections && section.subsections.length > 0 && (
                          <div className="ms-3">
                            <h6 className="text-secondary mb-2">Subsections:</h6>
                            {section.subsections.map((subsection, subIndex) => (
                              <div key={subIndex} className="mb-2 p-2 border-start border-primary ps-3">
                                <strong>{subsection.subsection_title}</strong>
                                <p className="text-muted small mb-0">{subsection.subsection_context}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OutlineGenerator;
