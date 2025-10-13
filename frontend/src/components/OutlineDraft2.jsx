import { useState, useEffect } from 'react';
import { FaPlay, FaSpinner, FaCheckCircle, FaExpand, FaEye } from 'react-icons/fa';
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
  const [fusedOutline, setFusedOutline] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [allCitations, setAllCitations] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Process Draft 1 data to extract Data sections
  const getDataSections = () => {
    if (!outlineData || !draftData?.responses) return [];
    
    const dataSections = [];
    
    outlineData.forEach((section, sectionIndex) => {
      // Categorize the section using our categorization logic
      const category = categorizeSection(section.section_title);
      
      if (category === 'Data') {
        // Collect all responses and citations from this section
        const allResponses = [];
        const allCitations = [];
        
        if (section.subsections) {
          section.subsections.forEach((subsection, subsectionIndex) => {
            if (subsection.questions) {
              subsection.questions.forEach((questionObj, questionIndex) => {
                const questionKey = `${sectionIndex}-${subsectionIndex}-${questionIndex}`;
                const responses = draftData.responses[questionKey] || [];
                
                // Get the fused response (last item) or all responses
                if (responses.length > 0) {
                  const fusedResponse = responses[responses.length - 1];
                  if (fusedResponse) {
                    allResponses.push(fusedResponse);
                  }
                }
                
                // Collect citations
                if (questionObj.citations) {
                  allCitations.push(...questionObj.citations);
                }
              });
            }
          });
        }
        
        if (allResponses.length > 0) {
          dataSections.push({
            section_title: section.section_title,
            section_context: section.section_context || '',
            category: category,
            subsections: section.subsections || [],
            all_responses: allResponses,
            all_citations: allCitations
          });
        }
      }
    });
    
    return dataSections;
  };

  // Simple categorization logic (matching backend)
  const categorizeSection = (sectionTitle) => {
    const sectionLower = sectionTitle.toLowerCase();
    
    // Admin sections
    if (['title page', 'abstract', 'references', 'bibliography', 'appendix']
        .some(term => sectionLower.includes(term))) {
      return 'Admin';
    }
    
    // Intro sections
    if (['introduction', 'background', 'context', 'overview', 'scope']
        .some(term => sectionLower.includes(term))) {
      return 'Intro';
    }
    
    // Method sections
    if (['analytical framework', 'model', 'methodology', 'method', 'approach', 
         'framework', 'theoretical', 'literature context', 'proposed solution']
        .some(term => sectionLower.includes(term))) {
      return 'Method';
    }
    
    // Summary sections
    if (['conclusion', 'summary', 'implications', 'future', 'lessons learned',
         'reflections', 'tentative conclusions']
        .some(term => sectionLower.includes(term))) {
      return 'Summary';
    }
    
    // Analysis sections
    if (['synthesis', 'discussion', 'evaluation', 'assessment', 'analysis',
         'critique', 'reaction', 'inter-relationships', 'comparison',
         'counterarguments', 'rebuttals', 'overall assessment']
        .some(term => sectionLower.includes(term))) {
      return 'Analysis';
    }
    
    // Data sections (explicitly include component)
    if (['component', 'body', 'claim', 'evidence', 'facts', 'timeline',
         'description', 'cause', 'effect', 'example']
        .some(term => sectionLower.includes(term))) {
      return 'Data';
    }
    
    // Default to Data for main content sections
    return 'Data';
  };

  // Collect all citations for the modal
  useEffect(() => {
    const dataSections = getDataSections();
    const citations = [];
    dataSections.forEach(section => {
      citations.push(...section.all_citations);
    });
    setAllCitations(citations);
  }, [outlineData, draftData]);

  // Citation modal functions
  const openCitationModal = (citationIndex) => {
    if (allCitations[citationIndex]) {
      setSelectedCitation({ ...allCitations[citationIndex], index: citationIndex });
    }
  };

  const closeCitationModal = () => {
    setSelectedCitation(null);
  };

  // Make openCitationModal globally available for the inline citation links
  useEffect(() => {
    window.openCitationModal = openCitationModal;
    return () => {
      delete window.openCitationModal;
    };
  }, [allCitations]);

  const generateFusedOutline = async () => {
    setLoading(true);
    
    try {
      const dataSections = getDataSections();
      
      if (dataSections.length === 0) {
        alert('No Data sections found in Outline Draft 1. Please ensure you have completed sections that contain core analysis content.');
        setLoading(false);
        return;
      }

      const response = await axios.post('http://localhost:8000/generate_fused_outline', {
        data_sections: dataSections,
        thesis: finalThesis,
        methodology: typeof methodology === 'string' ? methodology : JSON.stringify(methodology),
        paper_type: selectedPaperType?.id || 'analytical'
      });

      setFusedOutline(response.data);
      
      // Call completion callback
      if (onOutlineDraft2Complete) {
        onOutlineDraft2Complete(response.data);
      }
      
    } catch (error) {
      console.error('Error generating fused outline:', error);
      alert('Failed to generate fused outline. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const viewSection = (section) => {
    setSelectedSection(section);
    setShowModal(true);
  };

  const dataSections = getDataSections();

  return (
    <div className="outline-draft-2">
      <div className="d-flex align-items-center gap-3 mb-3">
        <h3 className="mb-0">Outline Draft 2</h3>
        <span className="badge bg-secondary">
          Data Fusion & Restructuring
        </span>
      </div>

      <div className="alert alert-info">
        <h6>About Outline Draft 2</h6>
        <p className="mb-2">
          This stage takes all the "Data" sections from your Outline Draft 1 and creates a cohesive, 
          well-structured outline that better organizes your evidence and citations to support your thesis.
        </p>
        <p className="mb-0">
          <strong>Found {dataSections.length} Data sections</strong> from Draft 1 ready for fusion and restructuring.
        </p>
      </div>

      {dataSections.length > 0 && (
        <div className="mb-4">
          <h5>Data Sections from Draft 1</h5>
          {dataSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="mb-4">
              <div className="card">
                <div className="card-header">
                  <h6 className="mb-0">{section.section_title}</h6>
                  <small className="text-muted">
                    {section.all_responses.length} responses • {section.all_citations.length} citations
                  </small>
                </div>
                <div className="card-body">
                  <p className="card-text">{section.section_context}</p>
                  
                  {/* Display all responses with citations */}
                  {section.all_responses.map((response, responseIndex) => (
                    <div key={responseIndex} className="mb-3 p-3 border-start border-info border-3 bg-light">
                      <div className="response-content" 
                           dangerouslySetInnerHTML={{ 
                             __html: response.replace(/\[(\d+)\]/g, (match, citationNumber) => {
                               return `<sup><a href="#" class="citation-link text-primary fw-bold text-decoration-none" onclick="openCitationModal(${citationNumber - 1}); return false;">[${citationNumber}]</a></sup>`;
                             })
                           }} 
                      />
                      {responseIndex < section.all_responses.length - 1 && <hr className="my-2" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="d-flex gap-3 mb-4">
        <button
          className="btn btn-primary"
          onClick={generateFusedOutline}
          disabled={loading || dataSections.length === 0}
        >
          {loading ? (
            <>
              <FaSpinner className="fa-spin me-2" />
              Generating Fused Outline...
            </>
          ) : (
            <>
              <FaPlay className="me-2" />
              Generate Fused Outline
            </>
          )}
        </button>
      </div>

      {fusedOutline && (
        <div className="fused-outline-results">
          <div className="d-flex align-items-center gap-3 mb-3">
            <h5 className="mb-0">Fused Outline Results</h5>
            <span className="badge bg-success">
              <FaCheckCircle className="me-1" />
              Complete
            </span>
          </div>

          <div className="alert alert-success">
            <h6>Outline Summary</h6>
            <p className="mb-0">{fusedOutline.outline_summary}</p>
          </div>

          {fusedOutline.restructuring_notes && fusedOutline.restructuring_notes.length > 0 && (
            <div className="alert alert-info">
              <h6>Restructuring Notes</h6>
              <ul className="mb-0">
                {fusedOutline.restructuring_notes.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="sections-list">
            {fusedOutline.sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="card mb-3">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">{section.title}</h6>
                    <small className="text-muted">{section.context}</small>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => viewSection(section)}
                    >
                      <FaEye className="me-1" />
                      View Details
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-8">
                      <h6>Subsections ({section.subsections.length})</h6>
                      <ul className="list-unstyled">
                        {section.subsections.map((subsection, subIndex) => (
                          <li key={subIndex} className="mb-2">
                            <strong>{subsection.title}</strong>
                            <div className="small text-muted">
                              {subsection.supporting_evidence.length} evidence points • {subsection.citations.length} citations
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="col-md-4">
                      <h6>Section Summary</h6>
                      <p className="small">{section.section_summary}</p>
                    </div>
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
          title={selectedSection.title}
          size="xl"
        >
          <div className="section-details">
            <div className="alert alert-info">
              <strong>Context:</strong> {selectedSection.context}
            </div>
            
            <div className="mb-4">
              <strong>Section Summary:</strong>
              <p>{selectedSection.section_summary}</p>
            </div>

            {selectedSection.subsections.map((subsection, index) => (
              <div key={index} className="card mb-3">
                <div className="card-header">
                  <h6 className="mb-0">{subsection.title}</h6>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <h6>Content</h6>
                    <div className="p-3 bg-light rounded">
                      <div dangerouslySetInnerHTML={{ __html: subsection.content.replace(/\n/g, '<br>') }} />
                    </div>
                  </div>

                  {subsection.supporting_evidence.length > 0 && (
                    <div className="mb-3">
                      <h6>Supporting Evidence</h6>
                      <ul>
                        {subsection.supporting_evidence.map((evidence, evidenceIndex) => (
                          <li key={evidenceIndex}>{evidence}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {subsection.citations.length > 0 && (
                    <div>
                      <h6>Citations</h6>
                      {subsection.citations.map((citation, citationIndex) => (
                        <div key={citationIndex} className="citation-item mb-2 p-2 border rounded">
                          <small className="text-muted">
                            <strong>APA:</strong> {citation.apa}
                          </small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
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
            
            {selectedCitation.methodologyPoints && selectedCitation.methodologyPoints.length > 0 && (
              <div className="mb-3">
                <strong>Methodology Points:</strong>
                <ul className="mt-1">
                  {selectedCitation.methodologyPoints.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OutlineDraft2;