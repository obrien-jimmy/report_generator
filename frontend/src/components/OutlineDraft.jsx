import { useState } from 'react';
import { FaPlay, FaPlayCircle, FaExpand, FaChevronLeft, FaChevronRight, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import axios from 'axios';

const OutlineDraft = ({ outlineData, finalThesis, methodology, onOutlineDraftComplete }) => {
  const [responses, setResponses] = useState({}); // { questionKey: [resp1, resp2, ..., fusedResp] }
  const [loading, setLoading] = useState({});
  const [currentResponseIdx, setCurrentResponseIdx] = useState({}); // { questionKey: idx }
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);

  // Safe stringify for methodology and thesis
  const safeMethodology = typeof methodology === "string" ? methodology : JSON.stringify(methodology);
  const safeThesis = typeof finalThesis === "string" ? finalThesis : JSON.stringify(finalThesis);



  // Generate all responses for a question: one per citation, then fused
  const generateAllQuestionResponses = async (sectionIndex, subsectionIndex, questionIndex, questionObj) => {
    const key = `${sectionIndex}-${subsectionIndex}-${questionIndex}`;
    setLoading(prev => ({ ...prev, [key]: true }));

    try {
      const sectionContext = outlineData[sectionIndex]?.section_context;
      const subsectionContext = outlineData[sectionIndex]?.subsections[subsectionIndex]?.subsection_context;
      const citations = questionObj.citations || [];
      const questionNum = questionIndex + 1;

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

        const response = await axios.post('http://localhost:8000/generate_citation_response', {
          question: questionObj.question,
          citation: safeCitation,
          section_context: sectionContext,
          subsection_context: subsectionContext,
          thesis: safeThesis,
          methodology: safeMethodology,
          question_number: questionNum,
          citation_number: i + 1
        });
        citationResponses.push(response.data.response);
      }

      // 2. Generate fused/master outline
      let fusedResponse = '';
      if (citationResponses.length > 0) {
        const safeCitations = citations.map(c => ({
          apa: typeof c.apa === "string" ? c.apa : null,
          title: typeof c.title === "string" ? c.title : null,
          source: typeof c.source === "string" ? c.source : null,
          author: typeof c.author === "string" ? c.author : null
        }));
        const fusedResp = await axios.post('http://localhost:8000/generate_fused_response', {
          question: questionObj.question,
          citation_responses: citationResponses,
          citations: safeCitations,
          section_context: sectionContext,
          subsection_context: subsectionContext,
          thesis: safeThesis,
          methodology: safeMethodology,
          question_number: questionNum
        });
        fusedResponse = fusedResp.data.response;
      }

      setResponses(prev => ({
        ...prev,
        [key]: [...citationResponses, fusedResponse]
      }));
      setCurrentResponseIdx(prev => ({
        ...prev,
        [key]: 0
      }));
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
  const isAllComplete = () => getCompletedQuestions() === getTotalQuestions();
  const handleCompleteOutlineDraft = () => {
    if (onOutlineDraftComplete) {
      onOutlineDraftComplete({
        outline: outlineData,
        responses: responses,
        thesis: finalThesis,
        methodology: methodology
      });
    }
  };

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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>Outline Draft</h3>
        <div className="d-flex gap-2 align-items-center">
          <span className="badge bg-info">
            {getCompletedQuestions()} / {getTotalQuestions()} Questions Answered
          </span>
          <button
            className="btn btn-primary"
            onClick={generateAllResponses}
            disabled={batchProcessing || isAllComplete()}
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
          {isAllComplete() && (
            <button
              className="btn btn-success"
              onClick={handleCompleteOutlineDraft}
            >
              <FaCheckCircle className="me-2" />
              Complete Outline Draft
            </button>
          )}
        </div>
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
                                  <ul className="mb-2">
                                    {citations.map((citation, i) => (
                                      <li
                                        key={i}
                                        style={{
                                          fontSize: '0.95em',
                                          cursor: 'pointer',
                                          background: idx === i ? '#e7f7fb' : 'transparent', // subtle highlight for active
                                          borderRadius: '4px',
                                          padding: '2px 6px',
                                          display: 'inline-block',
                                          marginBottom: '2px',
                                          marginRight: '6px',
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
                                            fontWeight: 'normal'
                                          }}
                                        >
                                          {`${questionNum}.${i + 1}`}
                                        </span>
                                        {citation.apa || citation.title || citation.source || JSON.stringify(citation)}
                                      </li>
                                    ))}
                                    {/* Fused/master outline */}
                                    {citations.length > 0 && (
                                      <li
                                        key="fused-master-outline"
                                        style={{
                                          fontSize: '0.95em',
                                          cursor: 'pointer',
                                          background: idx === citations.length ? '#e7f7fb' : 'transparent',
                                          borderRadius: '4px',
                                          padding: '2px 6px',
                                          display: 'inline-block',
                                          marginBottom: '2px',
                                          marginRight: '6px',
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
                                            fontWeight: 'normal'
                                          }}
                                        >
                                          {`${questionNum}.F`}
                                        </span>
                                        <em>Fused/Master Outline</em>
                                      </li>
                                    )}
                                  </ul>
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
                                        fontWeight: 'normal',
                                        border: '1px solid #0dcaf0'
                                      }}
                                    >
                                      {idx < citations.length
                                        ? `${questionNum}.${idx + 1}`
                                        : `${questionNum}.F`}
                                    </span>
                                  )}
                                </h6>
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
                                <div className="bg-light p-3 rounded" style={{ minHeight: 120 }}>
                                  <pre className="mb-0" style={{
                                    maxHeight: '150px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    fontFamily: 'inherit',
                                    whiteSpace: 'pre-wrap'
                                  }}>
                                    {respArr[idx]}
                                  </pre>
                                </div>
                              ) : (
                                <div className="bg-light p-3 rounded text-muted" style={{ minHeight: 120 }}>
                                  <em>No response generated yet</em>
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
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Question Response</h5>
              <button
                type="button"
                className="btn-close"
                onClick={closeModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <h6 className="text-primary mb-3">Question:</h6>
              <p className="mb-4 bg-light p-3 rounded">{selectedResponse.question}</p>
              <h6 className="text-success mb-3">Response:</h6>
              <div className="bg-light p-3 rounded" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <pre className="mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {selectedResponse.response}
                </pre>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutlineDraft;