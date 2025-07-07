import { useState } from 'react';
import { FaPlay, FaPlayCircle, FaPause, FaExpand, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import axios from 'axios';

const OutlineDraft = ({ outlineData, finalThesis, methodology, onOutlineDraftComplete }) => {
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState({});
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);

  const generateResponse = async (sectionIndex, subsectionIndex, questionIndex, question) => {
    const key = `${sectionIndex}-${subsectionIndex}-${questionIndex}`;
    setLoading(prev => ({ ...prev, [key]: true }));

    try {
      const response = await axios.post('http://localhost:8000/generate_question_response', {
        thesis: finalThesis,
        methodology: methodology,
        question: question,
        section_context: outlineData[sectionIndex]?.section_context,
        subsection_context: outlineData[sectionIndex]?.subsections[subsectionIndex]?.subsection_context
      });

      setResponses(prev => ({
        ...prev,
        [key]: response.data.response
      }));
    } catch (error) {
      console.error('Error generating response:', error);
      alert('Failed to generate response. Please try again.');
    }

    setLoading(prev => ({ ...prev, [key]: false }));
  };

  const generateAllResponses = async () => {
    setBatchProcessing(true);
    
    for (const [sectionIndex, section] of outlineData.entries()) {
      if (section.subsections) {
        for (const [subsectionIndex, subsection] of section.subsections.entries()) {
          if (subsection.questions) {
            for (const [questionIndex, question] of subsection.questions.entries()) {
              const key = `${sectionIndex}-${subsectionIndex}-${questionIndex}`;
              if (!responses[key]) {
                await generateResponse(sectionIndex, subsectionIndex, questionIndex, question);
                // Add a small delay to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }
        }
      }
    }
    
    setBatchProcessing(false);
  };

  const openModal = (response, question) => {
    setSelectedResponse({ response, question });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedResponse(null);
  };

  const getTotalQuestions = () => {
    let total = 0;
    outlineData?.forEach(section => {
      section.subsections?.forEach(subsection => {
        total += subsection.questions?.length || 0;
      });
    });
    return total;
  };

  const getCompletedQuestions = () => {
    return Object.keys(responses).length;
  };

  const isAllComplete = () => {
    return getCompletedQuestions() === getTotalQuestions();
  };

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

                {subsection.questions?.map((question, questionIndex) => {
                  const key = `${sectionIndex}-${subsectionIndex}-${questionIndex}`;
                  const response = responses[key];
                  const isLoading = loading[key];

                  return (
                    <div key={questionIndex} className="card mb-3">
                      <div className="card-body">
                        <div className="row">
                          {/* Question Side */}
                          <div className="col-md-6">
                            <div className="border-end pe-3">
                              <h6 className="text-info mb-2">
                                Question {questionIndex + 1}
                              </h6>
                              <p className="mb-3">{question}</p>
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => generateResponse(sectionIndex, subsectionIndex, questionIndex, question)}
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
                                <h6 className="text-success mb-0">Response</h6>
                                {response && (
                                  <button
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => openModal(response, question)}
                                  >
                                    <FaExpand className="me-1" />
                                    Expand
                                  </button>
                                )}
                              </div>
                              
                              {response ? (
                                <div className="bg-light p-3 rounded">
                                  <p className="mb-0" style={{ 
                                    maxHeight: '150px', 
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {response.length > 200 ? `${response.substring(0, 200)}...` : response}
                                  </p>
                                </div>
                              ) : (
                                <div className="bg-light p-3 rounded text-muted">
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
                <p className="mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {selectedResponse.response}
                </p>
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