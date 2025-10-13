import { useState, useEffect } from 'react';
import { FaPlay, FaSpinner, FaCheckCircle, FaExpand, FaEye, FaSearch, FaCog } from 'react-icons/fa';
import axios from 'axios';
import Modal from './Modal';

const OutlineDraft2 = ({
  outlineData,
  finalThesis,
  methodology,
  selectedPaperType,
  draftData,
  onOutlineDraft2Complete
}) => {
  // Phase 1: Analysis state
  const [identifiedSections, setIdentifiedSections] = useState([]);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisSummary, setAnalysisSummary] = useState('');
  
  // Phase 2: Building state  
  const [builtSections, setBuiltSections] = useState([]);
  const [buildingLoading, setBuildingLoading] = useState(false);
  const [selectedSectionIndices, setSelectedSectionIndices] = useState([]);
  const [completionStatus, setCompletionStatus] = useState('');
  const [continuityNotes, setContinuityNotes] = useState([]);
  
  // UI state
  const [selectedSection, setSelectedSection] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(1); // 1 = Analysis, 2 = Building, 3 = Review

  // Phase 1: Analyze and identify data sections
  const analyzeDataSections = async () => {
    setAnalysisLoading(true);
    
    try {
      const response = await axios.post('http://localhost:8000/analyze_data_sections', {
        outline_framework: outlineData || [],
        outline_draft1: draftData ? [draftData] : [],
        thesis: finalThesis,
        methodology: typeof methodology === 'string' ? methodology : JSON.stringify(methodology),
        paper_type: selectedPaperType?.id || 'analytical'
      });

      setIdentifiedSections(response.data.identified_sections);
      setAnalysisSummary(response.data.analysis_summary);
      setAnalysisComplete(true);
      setCurrentPhase(2);
      
      // Auto-select first 2 sections for building
      const recommendedOrder = response.data.recommended_build_order || [];
      setSelectedSectionIndices(recommendedOrder.slice(0, 2));
      
    } catch (error) {
      console.error('Error analyzing data sections:', error);
      alert('Failed to analyze data sections. Please try again.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Phase 2: Build selected sections into academic prose
  const buildDataSections = async (sectionIndices = null) => {
    setBuildingLoading(true);
    
    try {
      const indicesToBuild = sectionIndices || selectedSectionIndices;
      
      const response = await axios.post('http://localhost:8000/build_data_sections', {
        identified_data_sections: identifiedSections,
        outline_framework: outlineData || [],
        outline_draft1: draftData ? [draftData] : [],
        thesis: finalThesis,
        methodology: typeof methodology === 'string' ? methodology : JSON.stringify(methodology),
        paper_type: selectedPaperType?.id || 'analytical',
        target_section_indices: indicesToBuild
      });

      setBuiltSections([...builtSections, ...response.data.built_sections]);
      setCompletionStatus(response.data.completion_status);
      setContinuityNotes(response.data.continuity_notes);
      
      if (response.data.completion_status === 'complete') {
        setCurrentPhase(3);
        if (onOutlineDraft2Complete) {
          onOutlineDraft2Complete(response.data);
        }
      }
      
    } catch (error) {
      console.error('Error building data sections:', error);
      alert('Failed to build data sections. Please try again.');
    } finally {
      setBuildingLoading(false);
    }
  };

  // Section selection handlers
  const toggleSectionSelection = (index) => {
    setSelectedSectionIndices(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const selectAllSections = () => {
    setSelectedSectionIndices(identifiedSections.map((_, index) => index));
  };

  const clearSelection = () => {
    setSelectedSectionIndices([]);
  };

  // Modal handlers
  const viewSection = (section) => {
    setSelectedSection(section);
    setShowModal(true);
  };

  const openCitationModal = (citation) => {
    setSelectedCitation(citation);
  };

  const closeCitationModal = () => {
    setSelectedCitation(null);
  };

  return (
    <div className="outline-draft-2">
      <div className="d-flex align-items-center gap-3 mb-3">
        <h3 className="mb-0">Data Section Builder</h3>
        <span className="badge bg-info">
          Phase {currentPhase} of 3
        </span>
      </div>

      <div className="alert alert-primary">
        <h6>🧩 Data Section Builder</h6>
        <p className="mb-2">
          Transform your outlined sections into organized academic paragraphs that describe, contextualize, 
          and interpret the <strong>factual data being studied</strong>. Build data sections iteratively with 
          structural integrity and narrative continuity.
        </p>
        <div className="row">
          <div className="col-md-4">
            <strong>Phase 1:</strong> Identify Data Sections
          </div>
          <div className="col-md-4">
            <strong>Phase 2:</strong> Build Academic Prose  
          </div>
          <div className="col-md-4">
            <strong>Phase 3:</strong> Review & Integration
          </div>
        </div>
      </div>

      {/* Phase 1: Data Section Analysis */}
      {currentPhase === 1 && (
        <div className="phase-1">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <FaSearch className="me-2" />
                Phase 1: Identify Data Sections
              </h5>
            </div>
            <div className="card-body">
              <p>
                Analyze your Outline Framework and Draft 1 to identify sections containing 
                <strong> factual data, evidence, findings, or results</strong> that should be 
                transformed into scholarly prose.
              </p>
              
              <button
                className="btn btn-primary"
                onClick={analyzeDataSections}
                disabled={analysisLoading || !outlineData}
              >
                {analysisLoading ? (
                  <>
                    <FaSpinner className="fa-spin me-2" />
                    Analyzing Sections...
                  </>
                ) : (
                  <>
                    <FaSearch className="me-2" />
                    Analyze Data Sections
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 2: Section Building */}
      {currentPhase === 2 && (
        <div className="phase-2">
          {/* Analysis Summary */}
          {analysisSummary && (
            <div className="alert alert-success mb-4">
              <h6>Analysis Complete</h6>
              <p className="mb-0">{analysisSummary}</p>
            </div>
          )}

          {/* Identified Sections */}
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <FaCog className="me-2" />
                Phase 2: Build Data Sections
              </h5>
              <div>
                <button 
                  className="btn btn-sm btn-outline-secondary me-2" 
                  onClick={selectAllSections}
                >
                  Select All
                </button>
                <button 
                  className="btn btn-sm btn-outline-secondary" 
                  onClick={clearSelection}
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="card-body">
              <p>
                Found <strong>{identifiedSections.length} data sections</strong>. 
                Select sections to build into academic prose (recommended: 1-2 at a time).
              </p>
              
              {identifiedSections.map((section, index) => (
                <div key={index} className="mb-3">
                  <div className="form-check">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id={`section-${index}`}
                      checked={selectedSectionIndices.includes(index)}
                      onChange={() => toggleSectionSelection(index)}
                    />
                    <label className="form-check-label" htmlFor={`section-${index}`}>
                      <strong>{section.section_title}</strong>
                    </label>
                  </div>
                  <div className="ms-4 mt-2">
                    <div className="small text-muted mb-2">
                      <strong>Purpose:</strong> {section.academic_purpose}
                    </div>
                    <div className="small text-muted mb-2">
                      <strong>Data Scope:</strong> {section.data_scope}
                    </div>
                    {section.key_variables && section.key_variables.length > 0 && (
                      <div className="small">
                        <strong>Key Variables:</strong> {section.key_variables.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              <div className="mt-3">
                <button
                  className="btn btn-success"
                  onClick={() => buildDataSections()}
                  disabled={buildingLoading || selectedSectionIndices.length === 0}
                >
                  {buildingLoading ? (
                    <>
                      <FaSpinner className="fa-spin me-2" />
                      Building Sections...
                    </>
                  ) : (
                    <>
                      <FaPlay className="me-2" />
                      Build Selected Sections ({selectedSectionIndices.length})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Built Sections Preview */}
          {builtSections.length > 0 && (
            <div className="built-sections">
              <h5>Built Sections Preview</h5>
              {builtSections.map((section, index) => (
                <div key={index} className="card mb-3">
                  <div className="card-header">
                    <h6 className="mb-0">
                      {section.section_number}. {section.section_title}
                    </h6>
                  </div>
                  <div className="card-body">
                    <p className="text-muted">{section.section_purpose}</p>
                    <div className="row">
                      <div className="col-md-8">
                        <h6>Subsections ({section.subsections.length})</h6>
                        {section.subsections.slice(0, 2).map((subsection, subIndex) => (
                          <div key={subIndex} className="mb-3 p-3 bg-light rounded">
                            <strong>{subsection.subsection_number}. {subsection.subsection_title}</strong>
                            <div className="mt-2 small">
                              {subsection.academic_content.substring(0, 200)}...
                            </div>
                          </div>
                        ))}
                        {section.subsections.length > 2 && (
                          <div className="text-muted">
                            + {section.subsections.length - 2} more subsections
                          </div>
                        )}
                      </div>
                      <div className="col-md-4">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => viewSection(section)}
                        >
                          <FaEye className="me-1" />
                          View Full Section
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {continuityNotes.length > 0 && (
                <div className="alert alert-info">
                  <h6>Continuity Notes</h6>
                  <ul className="mb-0">
                    {continuityNotes.map((note, index) => (
                      <li key={index}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Phase 3: Review & Integration */}
      {currentPhase === 3 && (
        <div className="phase-3">
          <div className="alert alert-success">
            <h6>
              <FaCheckCircle className="me-2" />
              Data Section Building Complete
            </h6>
            <p className="mb-0">
              All data sections have been successfully built into academic prose. 
              Review the sections below and use them as the foundation for your paper's data content.
            </p>
          </div>

          <div className="built-sections-final">
            {builtSections.map((section, index) => (
              <div key={index} className="card mb-4">
                <div className="card-header">
                  <h5 className="mb-0">
                    {section.section_number}. {section.section_title}
                  </h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <strong>Purpose:</strong> {section.section_purpose}
                  </div>
                  
                  <h6>Subsections</h6>
                  {section.subsections.map((subsection, subIndex) => (
                    <div key={subIndex} className="mb-4 border-start border-3 border-primary ps-3">
                      <h6>{subsection.subsection_number}. {subsection.subsection_title}</h6>
                      <div 
                        className="academic-content"
                        dangerouslySetInnerHTML={{ 
                          __html: subsection.academic_content.replace(/\[(\d+)\]/g, 
                            '<sup><strong>[$1]</strong></sup>'
                          )
                        }}
                      />
                      
                      {subsection.data_sources.length > 0 && (
                        <div className="mt-2">
                          <small className="text-muted">
                            <strong>Data Sources:</strong> {subsection.data_sources.join(', ')}
                          </small>
                        </div>
                      )}
                      
                      {subsection.citations.length > 0 && (
                        <div className="mt-2">
                          <small className="text-muted">
                            <strong>Citations:</strong> {subsection.citations.length} sources
                          </small>
                        </div>
                      )}
                      
                      {subsection.transition_to_next && (
                        <div className="mt-2 fst-italic text-muted">
                          {subsection.transition_to_next}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <div className="mt-3 p-3 bg-light rounded">
                    <strong>Section Summary:</strong> {section.section_summary}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section Detail Modal */}
      {showModal && selectedSection && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={`${selectedSection.section_number}. ${selectedSection.section_title}`}
          size="xl"
        >
          <div className="section-details">
            <div className="alert alert-info">
              <strong>Purpose:</strong> {selectedSection.section_purpose}
            </div>
            
            {selectedSection.subsections.map((subsection, index) => (
              <div key={index} className="mb-4">
                <h5>{subsection.subsection_number}. {subsection.subsection_title}</h5>
                
                <div className="mb-3">
                  <div 
                    className="academic-prose p-3 bg-light rounded"
                    dangerouslySetInnerHTML={{ 
                      __html: subsection.academic_content.replace(/\n/g, '<br><br>')
                    }} 
                  />
                </div>

                {subsection.data_sources.length > 0 && (
                  <div className="mb-3">
                    <h6>Data Sources</h6>
                    <ul>
                      {subsection.data_sources.map((source, sourceIndex) => (
                        <li key={sourceIndex}>{source}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {subsection.citations.length > 0 && (
                  <div className="mb-3">
                    <h6>Citations ({subsection.citations.length})</h6>
                    {subsection.citations.map((citation, citationIndex) => (
                      <div 
                        key={citationIndex} 
                        className="citation-item mb-2 p-2 border rounded cursor-pointer"
                        onClick={() => openCitationModal(citation)}
                      >
                        <small>
                          <strong>APA:</strong> {citation.apa}
                        </small>
                      </div>
                    ))}
                  </div>
                )}

                {subsection.transition_to_next && (
                  <div className="transition-note p-2 bg-warning bg-opacity-25 rounded">
                    <strong>Transition:</strong> {subsection.transition_to_next}
                  </div>
                )}
              </div>
            ))}

            <div className="section-summary p-3 bg-success bg-opacity-25 rounded">
              <strong>Section Summary:</strong> {selectedSection.section_summary}
            </div>
          </div>
        </Modal>
      )}

      {/* Citation Modal */}
      {selectedCitation && (
        <Modal
          isOpen={!!selectedCitation}
          onClose={closeCitationModal}
          title="Citation Details"
        >
          <div className="citation-details">
            <div className="mb-3">
              <strong>Citation:</strong>
              <p className="mt-1">{selectedCitation.apa}</p>
            </div>
            
            {selectedCitation.description && (
              <div className="mb-3">
                <strong>Description:</strong>
                <p className="mt-1">{selectedCitation.description}</p>
              </div>
            )}
            
            {selectedCitation.categories && selectedCitation.categories.length > 0 && (
              <div className="mb-3">
                <strong>Categories:</strong>
                <div className="mt-1">
                  {selectedCitation.categories.map((category, idx) => (
                    <span key={idx} className="badge bg-secondary me-1 mb-1">{category}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OutlineDraft2;