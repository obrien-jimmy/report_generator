import { useState, useEffect } from 'react';
import { FaPlay, FaPlayCircle, FaExpand, FaChevronLeft, FaChevronRight, FaCheckCircle, FaSpinner, FaEye } from 'react-icons/fa';
import axios from 'axios';
import Modal from './Modal';

const OutlineDraft1 = ({
  outlineData,
  finalThesis,
  methodology,
  onOutlineDraft1Complete,
  onTransferToOutlineDraft2,
  autoSave,
  onAutoSaveDraft,
  draftData // receives: { responses }
}) => {
  const [responses, setResponses] = useState({}); // { questionKey: [resp1, resp2, ..., fusedResp] }
  const [loading, setLoading] = useState({});
  const [currentResponseIdx, setCurrentResponseIdx] = useState({}); // { questionKey: idx }
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [citationReferenceMap, setCitationReferenceMap] = useState({}); // Global citation reference mapping

  // Safe stringify for methodology and thesis
  const safeMethodology = typeof methodology === "string" ? methodology : JSON.stringify(methodology);
  const safeThesis = typeof finalThesis === "string" ? finalThesis : JSON.stringify(finalThesis);

  // Hydrate responses from draftData when it changes
  useEffect(() => {
    if (draftData && draftData.responses) {
      setResponses(draftData.responses);
    }
  }, [draftData]);

  // Build citation reference map using simple running numbers
  const buildCitationReferenceMap = () => {
    const referenceMap = {};
    const globalCitationMap = {}; // Maps citation content to reference number
    let globalRefNumber = 1;
    
    outlineData.forEach((section, sectionIndex) => {
      if (section.subsections) {
        section.subsections.forEach((subsection, subsectionIndex) => {
          if (subsection.questions) {
            subsection.questions.forEach((questionObj, questionIndex) => {
              const questionNum = questionIndex + 1;
              const citations = questionObj.citations || [];
              
              citations.forEach((citation, citationIndex) => {
                const questionKey = `${sectionIndex}-${subsectionIndex}-${questionIndex}`;
                
                // Create a unique key for the citation to avoid duplicates
                const citationKey = `${citation.apa || citation.title || citation.source || citation.author}`;
                
                let referenceNumber;
                if (globalCitationMap[citationKey]) {
                  // Reuse existing reference number for the same citation
                  referenceNumber = globalCitationMap[citationKey];
                } else {
                  // Assign new reference number
                  referenceNumber = globalRefNumber;
                  globalCitationMap[citationKey] = globalRefNumber;
                  globalRefNumber++;
                }
                
                if (!referenceMap[questionKey]) {
                  referenceMap[questionKey] = {};
                }
                
                referenceMap[questionKey][citationIndex] = {
                  referenceNumber,
                  citation,
                  questionNum,
                  citationNum: citationIndex + 1
                };
              });
            });
          }
        });
      }
    });
    
    setCitationReferenceMap(referenceMap);
    return referenceMap;
  };

  // Initialize citation reference map when outline data changes
  useEffect(() => {
    if (outlineData && outlineData.length > 0) {
      buildCitationReferenceMap();
    }
  }, [outlineData]);

  // Function to generate complete hierarchical outline
  const generateCompleteOutline = () => {
    const completeOutline = [];
    
    outlineData.forEach((section, sectionIndex) => {
      // Level 1: Section (I, II, III, IV...)
      const sectionLevel1 = {
        level: 1,
        number: toRomanNumeral(sectionIndex + 1),
        title: section.section_title,
        content: section.section_context,
        children: []
      };
      
      if (section.subsections) {
        section.subsections.forEach((subsection, subsectionIndex) => {
          // Level 2: Subsection (A, B, C, D...)
          const subsectionLevel2 = {
            level: 2,
            number: toLetter(subsectionIndex),
            title: subsection.subsection_title,
            content: subsection.subsection_context,
            children: []
          };
          
          if (subsection.questions) {
            subsection.questions.forEach((questionObj, questionIndex) => {
              const questionKey = `${sectionIndex}-${subsectionIndex}-${questionIndex}`;
              const responseArray = responses[questionKey];
              
              // Always use the last response (fused/master outline) if available
              if (responseArray && responseArray.length > 0) {
                const fusedResponse = responseArray[responseArray.length - 1]; // Last response is always fused
                const responseContent = {
                  level: 3,
                  question: questionObj.question,
                  content: fusedResponse,
                  responseType: 'fused'
                };
                
                subsectionLevel2.children.push(responseContent);
              }
            });
          }
          
          sectionLevel1.children.push(subsectionLevel2);
        });
      }
      
      completeOutline.push(sectionLevel1);
    });
    
    return completeOutline;
  };

  // Utility functions for numbering
  const toRomanNumeral = (num) => {
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
    return romanNumerals[num - 1] || `${num}`;
  };

  const toLetter = (num) => {
    return String.fromCharCode(65 + num); // A, B, C, D...
  };

  // Generate all responses for a question: one per citation, then fused
  const generateAllQuestionResponses = async (sectionIndex, subsectionIndex, questionIndex, questionObj) => {
    const key = `${sectionIndex}-${subsectionIndex}-${questionIndex}`;
    setLoading(prev => ({ ...prev, [key]: true }));

    try {
      const sectionContext = outlineData[sectionIndex]?.section_context;
      const subsectionContext = outlineData[sectionIndex]?.subsections[subsectionIndex]?.subsection_context;
      const citations = questionObj.citations || [];
      const questionNum = questionIndex + 1;
      const questionRefs = citationReferenceMap[key] || {};

      // 1. Generate outline for each citation
      const citationResponses = [];
      for (let i = 0; i < citations.length; i++) {
        const c = citations[i] || {};
        const safeCitation = {
          apa: typeof c.apa === "string" ? c.apa : null,
          title: typeof c.title === "string" ? c.title : null,
          source: typeof c.source === "string" ? c.source : null,
          author: typeof c.author === "string" ? c.author : null
        };
        const safeMethodology = typeof methodology === "string" ? methodology : JSON.stringify(methodology);
        const safeThesis = typeof finalThesis === "string" ? finalThesis : JSON.stringify(finalThesis);

        // Include reference ID in the request
        const referenceInfo = questionRefs[i] || {};
        const referenceNumber = referenceInfo.referenceNumber || (i + 1);

        const response = await axios.post('http://localhost:8000/generate_citation_response', {
          question: questionObj.question,
          citation: safeCitation,
          section_context: sectionContext,
          subsection_context: subsectionContext,
          thesis: safeThesis,
          methodology: safeMethodology,
          question_number: questionNum,
          citation_number: i + 1,
          reference_id: referenceNumber.toString() // Add reference number to backend call
        });
        citationResponses.push(response.data.response);
      }

      // 2. Generate fused/master outline
      let fusedResponse = '';
      if (citationResponses.length > 0) {
        const safeCitations = citations.map((c, i) => ({
          apa: typeof c.apa === "string" ? c.apa : null,
          title: typeof c.title === "string" ? c.title : null,
          source: typeof c.source === "string" ? c.source : null,
          author: typeof c.author === "string" ? c.author : null,
          reference_id: (questionRefs[i]?.referenceNumber || (i + 1)).toString()
        }));
        const fusedResp = await axios.post('http://localhost:8000/generate_fused_response', {
          question: questionObj.question,
          citation_responses: citationResponses,
          citations: safeCitations,
          section_context: sectionContext,
          subsection_context: subsectionContext,
          thesis: safeThesis,
          methodology: safeMethodology,
          question_number: questionNum,
          citation_references: Object.values(questionRefs).map(ref => ({
            reference_id: ref.referenceNumber.toString(),
            citation: ref.citation
          }))
        });
        fusedResponse = fusedResp.data.response;
      }

      // Update responses and auto-save with the latest state
      setResponses(prev => {
        const updated = {
          ...prev,
          [key]: [...citationResponses, fusedResponse]
        };
        setCurrentResponseIdx(idxPrev => ({
          ...idxPrev,
          [key]: 0
        }));
        // Auto-save with the latest responses
        if (autoSave && onAutoSaveDraft) {
          onAutoSaveDraft({
            outline: outlineData,
            responses: updated,
            thesis: finalThesis,
            methodology,
            citationReferenceMap: citationReferenceMap
          });
        }
        return updated;
      });

    } catch (error) {
      console.error('Error generating responses:', error);
      alert('Failed to generate responses. Please try again.');
    }

    setLoading(prev => ({ ...prev, [key]: false }));
  };

  // Navigation for responses
  const handlePrevResponse = (key) => {
    setCurrentResponseIdx(prev => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) - 1)
    }));
  };
  const handleNextResponse = (key) => {
    setCurrentResponseIdx(prev => ({
      ...prev,
      [key]: Math.min((responses[key]?.length || 1) - 1, (prev[key] || 0) + 1)
    }));
  };
  const handleJumpToResponse = (key, idx) => {
    setCurrentResponseIdx(prev => ({
      ...prev,
      [key]: idx
    }));
  };

  // Modal controls
  const openModal = (response, question) => {
    setSelectedResponse({ response, question });
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setSelectedResponse(null);
  };

  // Batch processing
  const generateAllResponses = async () => {
    setBatchProcessing(true);
    for (const [sectionIndex, section] of outlineData.entries()) {
      if (section.subsections) {
        for (const [subsectionIndex, subsection] of section.subsections.entries()) {
          if (subsection.questions) {
            for (const [questionIndex, questionObj] of subsection.questions.entries()) {
              const key = `${sectionIndex}-${subsectionIndex}-${questionIndex}`;
              if (!responses[key]) {
                await generateAllQuestionResponses(sectionIndex, subsectionIndex, questionIndex, questionObj);
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }
        }
      }
    }
    setBatchProcessing(false);
  };

  // Completion
  const getTotalQuestions = () => {
    let total = 0;
    outlineData?.forEach(section => {
      section.subsections?.forEach(subsection => {
        total += subsection.questions?.length || 0;
      });
    });
    return total;
  };
  const getCompletedQuestions = () => Object.keys(responses).length;

  if (!outlineData || outlineData.length === 0) {
    return (
      <div className="text-center py-5">
        <h4>No outline data available</h4>
        <p className="text-muted">Please complete the Outline Framework first.</p>
      </div>
    );
  }

  return (
    <div className="outline-draft">
      <div className="d-flex align-items-center gap-3 mb-3">
        <h3 className="mb-0">Outline Draft 1</h3>
        <span className="badge bg-info">
          {getCompletedQuestions()} / {getTotalQuestions()} Questions Answered
        </span>
      </div>
      
      <div className="d-flex gap-2 align-items-center mb-4">
        <button
          className="btn btn-outline-info"
          onClick={() => {
            const completeOutline = generateCompleteOutline();
            setSelectedResponse({ 
              response: JSON.stringify(completeOutline, null, 2), 
              question: "Complete Hierarchical Outline Preview"
            });
            setShowModal(true);
          }}
          disabled={getCompletedQuestions() === 0}
        >
          <FaEye className="me-2" />
          Preview Final Outline
        </button>

        <button
          className="btn btn-success"
          onClick={() => {
            if (onTransferToOutlineDraft2) {
              onTransferToOutlineDraft2();
            }
          }}
          disabled={getCompletedQuestions() === 0}
        >
          <FaChevronRight className="me-2" />
          Transfer to Draft 2
        </button>
        <button
          className="btn btn-primary"
          onClick={generateAllResponses}
          disabled={batchProcessing}
        >
          {batchProcessing ? (
            <>
              <FaSpinner className="fa-spin me-2" />
              Processing...
            </>
          ) : (
            <>
              <FaPlayCircle className="me-2" />
              Generate All Responses
            </>
          )}
        </button>
      </div>

      {outlineData.map((section, sectionIndex) => (
        <div key={sectionIndex} className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">
              {sectionIndex + 1}. {section.section_title}
            </h5>
            <p className="text-muted mb-0 small">{section.section_context}</p>
          </div>

          <div className="card-body">
            {section.subsections?.map((subsection, subsectionIndex) => (
              <div key={subsectionIndex} className="mb-4">
                <h6 className="text-primary mb-3">
                  {subsection.subsection_title}
                </h6>
                <p className="text-muted small mb-3">{subsection.subsection_context}</p>

                {subsection.questions?.map((questionObj, questionIndex) => {
                  const key = `${sectionIndex}-${subsectionIndex}-${questionIndex}`;
                  const respArr = responses[key] || [];
                  const idx = currentResponseIdx[key] || 0;
                  const isLoading = loading[key];
                  const citations = questionObj.citations || [];
                  const totalResponses = citations.length + (citations.length > 0 ? 1 : 0); // +1 for fused

                  // Citation numbering: questionNumber.citationNumber
                  const questionNum = questionIndex + 1;

                  return (
                    <div key={questionIndex} className="card mb-3">
                      <div className="card-body">
                        <div className="row">
                          {/* Question Side */}
                          <div className="col-md-6">
                            <div className="border-end pe-3">
                              <h6 className="text-info mb-2">
                                Question {questionNum}
                              </h6>
                              <p className="mb-3">{questionObj.question}</p>
                              {/* Render citations with numbering */}
                              {citations.length > 0 && (
                                <div className="mb-2">
                                  <strong>Citations:</strong>
                                  <div className="mb-2">
                                    {citations.map((citation, i) => {
                                      const questionRefs = citationReferenceMap[key] || {};
                                      const refInfo = questionRefs[i] || {};
                                      const referenceNumber = refInfo.referenceNumber || (i + 1);
                                      
                                      return (
                                        <div
                                          key={i}
                                          style={{
                                            fontSize: '0.95em',
                                            cursor: 'pointer',
                                            background: idx === i ? '#e7f7fb' : 'transparent', // subtle highlight for active
                                            borderRadius: '4px',
                                            padding: '2px 6px',
                                            marginBottom: '2px',
                                            textDecoration: 'none'
                                          }}
                                          onClick={() => handleJumpToResponse(key, i)}
                                        >
                                          <span
                                            style={{
                                              color: '#0dcaf0', // Bootstrap light blue for citation number only
                                              background: 'transparent',
                                              borderRadius: '3px',
                                              padding: '1px 6px',
                                              marginRight: '4px',
                                              fontWeight: 'bold'
                                            }}
                                          >
                                            [{referenceNumber}]
                                          </span>
                                          <span style={{ fontWeight: 'normal' }}>
                                            {citation.author ? `${citation.author} - ` : ''}
                                            {citation.title || citation.apa || citation.source || 'Unknown Citation'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                    {/* Fused/master outline */}
                                    {citations.length > 0 && (
                                      <div
                                        key="fused-master-outline"
                                        style={{
                                          fontSize: '0.95em',
                                          cursor: 'pointer',
                                          background: idx === citations.length ? '#e7f7fb' : 'transparent',
                                          borderRadius: '4px',
                                          padding: '2px 6px',
                                          marginBottom: '2px',
                                          textDecoration: 'none'
                                        }}
                                        onClick={() => handleJumpToResponse(key, citations.length)}
                                      >
                                        <span
                                          style={{
                                            color: '#0dcaf0',
                                            background: 'transparent',
                                            borderRadius: '3px',
                                            padding: '1px 6px',
                                            marginRight: '4px',
                                            fontWeight: 'bold'
                                          }}
                                        >
                                          Fused
                                        </span>
                                        <em>Fused/Master Outline</em>
                                        <div style={{ fontSize: '0.85em', color: '#666', marginTop: '2px' }}>
                                          References: {Object.values(citationReferenceMap[key] || {}).map(ref => `[${ref.referenceNumber}]`).join(', ')}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => generateAllQuestionResponses(sectionIndex, subsectionIndex, questionIndex, questionObj)}
                                disabled={isLoading || batchProcessing}
                              >
                                {isLoading ? (
                                  <>
                                    <FaSpinner className="fa-spin me-1" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <FaPlay className="me-1" />
                                    Generate Response
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Response Side */}
                          <div className="col-md-6">
                            <div className="ps-3">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="text-success mb-0">
                                  Response{' '}
                                  {citations.length > 0 && (
                                    <span
                                      className="badge ms-2"
                                      style={{
                                        backgroundColor: 'transparent',
                                        color: '#0dcaf0',
                                        fontWeight: 'bold',
                                        border: '1px solid #0dcaf0'
                                      }}
                                    >
                                      {idx < citations.length
                                        ? `[${(citationReferenceMap[key] || {})[idx]?.referenceNumber || (idx + 1)}]`
                                        : `Fused`}
                                    </span>
                                  )}
                                </h6>
                                <div className="d-flex gap-2">
                                  {respArr[idx] && (
                                    <button
                                      className="btn btn-sm btn-outline-secondary"
                                      onClick={() => openModal(respArr[idx], questionObj.question)}
                                    >
                                      <FaExpand className="me-1" />
                                      Expand
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="d-flex align-items-center mb-2">
                                <button
                                  className="btn btn-sm btn-outline-secondary me-2"
                                  onClick={() => handlePrevResponse(key)}
                                  disabled={idx === 0}
                                >
                                  <FaChevronLeft />
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => handleNextResponse(key)}
                                  disabled={idx >= totalResponses - 1}
                                >
                                  <FaChevronRight />
                                </button>
                              </div>
                              {respArr[idx] ? (
                                <div style={{
                                  fontFamily: 'inherit',
                                  whiteSpace: 'pre-wrap',
                                  lineHeight: '1.6',
                                  margin: 0,
                                  maxHeight: '70vh',
                                  overflowY: 'auto',
                                  paddingRight: '8px'
                                }}>
                                  {respArr[idx]}
                                </div>
                              ) : (
                                <div className="text-muted" style={{ 
                                  minHeight: 100,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontStyle: 'italic'
                                }}>
                                  No response generated yet
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Response Modal */}
      {showModal && selectedResponse && (
        <Modal
          show={showModal}
          onClose={closeModal}
          title="Question Response"
          large
          footer={
            <button
              type="button"
              className="btn btn-secondary"
              onClick={closeModal}
            >
              Close
            </button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', height: '60vh' }}>
            <h6 className="text-primary mb-3">Question:</h6>
            <p className="mb-4 bg-light p-3 rounded">{selectedResponse.question}</p>
            <h6 className="text-success mb-3">Response:</h6>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              margin: 0,
              padding: 0,
              background: 'none'
            }}>
              {selectedResponse.question === "Complete Hierarchical Outline Preview" ? (
                <div style={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6',
                  fontFamily: 'monospace',
                  fontSize: '0.9em'
                }}>
                  {selectedResponse.response}
                </div>
              ) : (
                <pre className="mb-0" style={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6',
                  background: 'none',
                  margin: 0,
                  padding: 0,
                  fontFamily: 'inherit'
                }}>
                  {selectedResponse.response}
                </pre>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OutlineDraft1;