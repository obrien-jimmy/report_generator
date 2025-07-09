import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCheck, FaEdit, FaQuestionCircle, FaBookOpen, FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa';
import CitationViewer from './CitationViewer';
import './CitationViewer.css';
import PaperStructurePreview from './PaperStructurePreview';
import RetryService from '../services/retryService';

const OutlineGenerator = ({ 
  finalThesis, 
  methodology, 
  paperLength, 
  sourceCategories, 
  selectedPaperType, 
  onFrameworkComplete, 
  onTransferToOutlineDraft,
  savedOutlineData
}) => {
  const [outline, setOutline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [collapsed, setCollapsed] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');

  // Paper Structure States
  const [customStructure, setCustomStructure] = useState(null);
  const [structureApproved, setStructureApproved] = useState(false);

  // Question and Citation States
  const [loadingQuestions, setLoadingQuestions] = useState({});
  const [loadingCitations, setLoadingCitations] = useState({});
  const [batchLoadingQuestions, setBatchLoadingQuestions] = useState(false);
  const [batchLoadingCitations, setBatchLoadingCitations] = useState(false);

  // Restore saved outline data
  useEffect(() => {
    if (savedOutlineData && Array.isArray(savedOutlineData) && savedOutlineData.length > 0) {
      console.log('OutlineGenerator: Restoring saved outline data:', savedOutlineData);
      setOutline(savedOutlineData);
      setHasGenerated(true);
      setStructureApproved(true);
    }
  }, [savedOutlineData]);

  // Auto-call framework complete when outline is generated
  useEffect(() => {
    if (outline.length > 0 && hasGenerated && onFrameworkComplete) {
      console.log('OutlineGenerator: Auto-calling framework complete with outline:', outline);
      onFrameworkComplete(outline);
    }
  }, [outline, hasGenerated, onFrameworkComplete]);

  const toggleCollapse = () => setCollapsed(prev => !prev);

  const handleStructureChange = (structure) => {
    setCustomStructure(structure);
    setStructureApproved(false);
  };

  const approveStructure = () => {
    setStructureApproved(true);
  };

  const editStructure = () => {
    setStructureApproved(false);
    setOutline([]);
    setHasGenerated(false);
    setError(null);
  };

  const generateOutline = async (isRegeneration = false) => {
    if (!structureApproved) {
      setError('Please approve the paper structure first');
      return;
    }

    setLoading(true);
    setError(null);
    setGenerationProgress('Generating initial outline structure...');
    
    if (isRegeneration) {
      setOutline([]);
      setHasGenerated(false);
    }
    
    try {
      const safePaperLength = paperLength === 'Maximum Detail' ? -2 :
                              paperLength === 'Adjusted Based on Thesis' ? -1 :
                              parseInt(paperLength, 10);

      const methodologyId = methodology?.methodologyType || methodology?.methodology_type;
      const subMethodologyId = methodology?.subMethodology || methodology?.sub_methodology;

      const structureToUse = customStructure ? 
        customStructure.filter(s => !s.isAdmin).map(s => ({
          section_title: s.title,
          section_context: s.context || `Analysis and discussion of ${s.title}`,
          pages_allocated: s.pages
        })) : null;

      // Step 1: Generate initial outline structure
      const res = await RetryService.withRetry(async () => {
        return await axios.post('http://localhost:8000/generate_structured_outline', {
          final_thesis: finalThesis,
          paper_type: selectedPaperType?.id || 'research',
          methodology,
          paper_length_pages: safePaperLength,
          source_categories: sourceCategories,
          methodology_id: methodologyId,
          sub_methodology_id: subMethodologyId,
          custom_structure: structureToUse
        });
      }, 3, 3000);

      let sections = res.data.outline.map(section => ({
        section_title: section.section_title,
        section_context: section.section_context,
        subsections: [],
        is_administrative: section.is_administrative || false,
        pages_allocated: section.pages_allocated || 2
      }));

      console.log('OutlineGenerator: Initial structure generated:', sections);
      setOutline(sections);

      // Step 2: Generate detailed subsections for content sections
      const contentSections = sections.filter(sec => !sec.is_administrative);
      
      if (contentSections.length > 0) {
        setGenerationProgress(`Generating detailed subsections for ${contentSections.length} sections...`);
        
        // Create operations for batch processing
        const operations = contentSections.map(section => async () => {
          const requestPayload = {
            section_title: section.section_title,
            section_context: section.section_context,
            final_thesis: finalThesis,
            methodology: methodology,
            paper_length_pages: safePaperLength,
            source_categories: sourceCategories,
            pages_allocated: section.pages_allocated || 2
          };

          console.log(`OutlineGenerator: Generating subsections for: ${section.section_title}`);
          const response = await axios.post('http://localhost:8000/generate_subsections', requestPayload);
          return { 
            section_title: section.section_title, 
            data: response.data 
          };
        });

        // Process in batches to avoid rate limits
        const results = await RetryService.batchWithRetry(operations, 2, 3000);
        
        // Update sections with subsections
        sections = sections.map(section => {
          if (section.is_administrative) return section;
          
          const result = results.find(r => r && r.section_title === section.section_title);
          if (result && result.data.subsections) {
            return {
              ...section,
              subsections: result.data.subsections.map(sub => ({
                ...sub
              }))
            };
          }
          return section;
        });

        console.log('OutlineGenerator: Subsections generated, now generating questions...');
        setGenerationProgress('Generating questions for subsections...');

        // Step 3: Generate questions for each subsection
        for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
          const section = sections[sectionIndex];
          if (section.is_administrative) continue;

          for (let subsectionIndex = 0; subsectionIndex < section.subsections.length; subsectionIndex++) {
            const subsection = section.subsections[subsectionIndex];
            
            try {
              const questionResponse = await axios.post('http://localhost:8000/generate_questions', {
                final_thesis: finalThesis,
                methodology: methodology,
                section_title: section.section_title,
                section_context: section.section_context,
                subsection_title: subsection.subsection_title,
                subsection_context: subsection.subsection_context
              });

              const questionObjects = (questionResponse.data.questions || []).map(questionText => ({
                question: questionText,
                citations: []
              }));

              sections[sectionIndex].subsections[subsectionIndex].questions = questionObjects;
              
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (err) {
              console.error(`Error generating questions for ${section.section_title} - ${subsection.subsection_title}:`, err);
            }
          }
        }

        console.log('OutlineGenerator: Questions generated, now generating citations...');
        setGenerationProgress('Generating citations for questions...');

        // Step 4: Generate citations for each question
        for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
          const section = sections[sectionIndex];
          if (section.is_administrative) continue;

          for (let subsectionIndex = 0; subsectionIndex < section.subsections.length; subsectionIndex++) {
            const subsection = section.subsections[subsectionIndex];
            
            if (subsection.questions && subsection.questions.length > 0) {
              for (let questionIndex = 0; questionIndex < subsection.questions.length; questionIndex++) {
                const questionObj = subsection.questions[questionIndex];
                
                try {
                  // Fix: Use the correct endpoint and response field
                  const citationResponse = await axios.post('http://localhost:8000/generate_question_citations', {
                    final_thesis: finalThesis,
                    methodology: methodology,
                    source_categories: sourceCategories,
                    question: questionObj.question,
                    section_title: section.section_title,
                    section_context: section.section_context,
                    subsection_title: subsection.subsection_title,
                    subsection_context: subsection.subsection_context,
                    citation_count: 3
                  });
                  
                  // Fix: Use the correct response field name
                  sections[sectionIndex].subsections[subsectionIndex].questions[questionIndex].citations = citationResponse.data.recommended_sources || [];
                  
                  await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (err) {
                  console.error(`Error generating citations for question ${questionIndex}:`, err);
                }
              }
            }
          }
        }
      }

      console.log('OutlineGenerator: Complete detailed outline generated:', sections);
      setOutline(sections);
      setHasGenerated(true);
      setGenerationProgress('');

    } catch (err) {
      console.error('Error generating detailed outline:', err);
      setGenerationProgress('');
      
      if (err.response?.status === 429 || err.message?.includes('rate limit')) {
        setError('Rate limit exceeded. The system will automatically retry in a few moments.');
        
        setTimeout(() => {
          generateOutline(isRegeneration);
        }, 10000);
      } else {
        setError(err.response?.data?.detail || err.message || 'Failed to generate detailed outline.');
      }
    }
    setLoading(false);
  };

  // Update the generateQuestions function
  const generateQuestions = async (sectionIndex, subsectionIndex) => {
    const questionKey = `${sectionIndex}-${subsectionIndex}`;
    setLoadingQuestions(prev => ({ ...prev, [questionKey]: true }));

    try {
      const section = outline[sectionIndex];
      const subsection = section.subsections[subsectionIndex];

      const res = await axios.post('http://localhost:8000/generate_questions', {
        final_thesis: finalThesis,
        methodology: methodology,
        section_title: section.section_title,
        section_context: section.section_context,
        subsection_title: subsection.subsection_title,
        subsection_context: subsection.subsection_context
      });

      const questionObjects = (res.data.questions || []).map(questionText => ({
        question: questionText,
        citations: []
      }));

      setOutline(prevOutline => 
        prevOutline.map((outlineSection, secIdx) => {
          if (secIdx !== sectionIndex) return outlineSection;
          return {
            ...outlineSection,
            subsections: outlineSection.subsections.map((sub, subIdx) => {
              if (subIdx !== subsectionIndex) return sub;
              return { ...sub, questions: questionObjects };
            })
          };
        })
      );
    } catch (err) {
      console.error('Error generating questions:', err);
      setError('Failed to generate questions for this subsection.');
    }

    setLoadingQuestions(prev => ({ ...prev, [questionKey]: false }));
  };

  // Update the generateCitations function (around line 307)
  const generateCitations = async (sectionIndex, subsectionIndex, questionIndex) => {
    const citationKey = `${sectionIndex}-${subsectionIndex}-${questionIndex}`;
    setLoadingCitations(prev => ({ ...prev, [citationKey]: true }));

    try {
      const section = outline[sectionIndex];
      const subsection = section.subsections[subsectionIndex];
      const questionObj = subsection.questions[questionIndex];

      // Fix: Use the correct endpoint from your backend
      const res = await axios.post('http://localhost:8000/generate_question_citations', {
        final_thesis: finalThesis,
        methodology: methodology,
        source_categories: sourceCategories,
        question: questionObj.question,
        section_title: section.section_title,
        section_context: section.section_context,
        subsection_title: subsection.subsection_title,
        subsection_context: subsection.subsection_context,
        citation_count: 3
      });

      setOutline(prevOutline => 
        prevOutline.map((outlineSection, secIdx) => {
          if (secIdx !== sectionIndex) return outlineSection;
          return {
            ...outlineSection,
            subsections: outlineSection.subsections.map((sub, subIdx) => {
              if (subIdx !== subsectionIndex) return sub;
              return {
                ...sub,
                questions: sub.questions.map((q, qIdx) => {
                  if (qIdx !== questionIndex) return q;
                  // Fix: Use the correct response field name
                  return { ...q, citations: res.data.recommended_sources || [] };
                })
              };
            })
          };
        })
      );
    } catch (err) {
      console.error('Error generating citations:', err);
    }

    setLoadingCitations(prev => ({ ...prev, [citationKey]: false }));
  };

  // **Fixed** handleAddCitation
  const handleAddCitation = (sectionIndex, subsectionIndex, questionIndex, newCitation) => {
    if (!newCitation) return;

    setOutline(prevOutline =>
      prevOutline.map((outlineSection, secIdx) => {
        if (secIdx !== sectionIndex) return outlineSection;
        return {
          ...outlineSection,
          subsections: outlineSection.subsections.map((sub, subIdx) => {
            if (subIdx !== subsectionIndex) return sub;
            return {
              ...sub,
              questions: sub.questions.map((q, qIdx) => {
                if (qIdx !== questionIndex) return q;
                return {
                  ...q,
                  citations: [...(q.citations || []), newCitation],
                };
              }),
            };
          }),
        };
      })
    );
  };

  // **Fixed** handleRemoveCitation
  const handleRemoveCitation = (sectionIndex, subsectionIndex, questionIndex, citationIndex) => {
    setOutline(prevOutline =>
      prevOutline.map((outlineSection, secIdx) => {
        if (secIdx !== sectionIndex) return outlineSection;
        return {
          ...outlineSection,
          subsections: outlineSection.subsections.map((sub, subIdx) => {
            if (subIdx !== subsectionIndex) return sub;
            return {
              ...sub,
              questions: sub.questions.map((q, qIdx) => {
                if (qIdx !== questionIndex) return q;
                return {
                  ...q,
                  citations: q.citations?.filter((_, idx) => idx !== citationIndex) || [],
                };
              }),
            };
          }),
        };
      })
    );
  };

  const generateAllQuestions = async () => {
    setBatchLoadingQuestions(true);
    
    for (let sectionIndex = 0; sectionIndex < outline.length; sectionIndex++) {
      const section = outline[sectionIndex];
      if (section.is_administrative) continue;
      for (let subsectionIndex = 0; subsectionIndex < section.subsections.length; subsectionIndex++) {
        const subsection = section.subsections[subsectionIndex];
        if (subsection.questions && subsection.questions.length > 0) continue;
        await generateQuestions(sectionIndex, subsectionIndex);
      }
    }
    
    setBatchLoadingQuestions(false);
  };

  const generateAllCitations = async () => {
    setBatchLoadingCitations(true);
    
    for (let sectionIndex = 0; sectionIndex < outline.length; sectionIndex++) {
      const section = outline[sectionIndex];
      if (section.is_administrative) continue;
      for (let subsectionIndex = 0; subsectionIndex < section.subsections.length; subsectionIndex++) {
        const subsection = section.subsections[subsectionIndex];
        if (!subsection.questions || subsection.questions.length === 0) continue;
        for (let questionIndex = 0; questionIndex < subsection.questions.length; questionIndex++) {
          const questionObj = subsection.questions[questionIndex];
          if (questionObj.citations && questionObj.citations.length > 0) continue;
          await generateCitations(sectionIndex, subsectionIndex, questionIndex);
        }
      }
    }
    
    setBatchLoadingCitations(false);
  };

  const hasQuestionsToGenerate = () => {
    return outline.some(section => 
      !section.is_administrative && 
      section.subsections.some(sub => !sub.questions || sub.questions.length === 0)
    );
  };

  const hasCitationsToGenerate = () => {
    return outline.some(section => 
      !section.is_administrative && 
      section.subsections.some(sub => 
        sub.questions && sub.questions.length > 0 && 
        sub.questions.some(questionObj => !questionObj.citations || questionObj.citations.length === 0)
      )
    );
  };

  const handleFrameworkComplete = () => {
    console.log('OutlineGenerator: Manual framework completion triggered');
    if (onFrameworkComplete && outline.length > 0) {
      onFrameworkComplete(outline);
    }
  };

  return (
    <div className="mb-4 position-relative w-100">
      <div className="d-flex" style={{ position: 'absolute', top: 0, right: 0 }}>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={toggleCollapse}
        >
          {collapsed ? <FaEye /> : <FaEyeSlash />}
          {collapsed ? ' Show' : ' Hide'}
        </button>
      </div>

      <h3>Research Outline Generator</h3>
      
      {!collapsed && (
        <>
          <PaperStructurePreview 
            paperType={selectedPaperType}
            methodology={methodology?.methodologyType || methodology?.methodology_type}
            subMethodology={methodology?.subMethodology || methodology?.sub_methodology}
            paperLength={paperLength}
            onStructureChange={handleStructureChange}
          />

          {customStructure && !hasGenerated && (
            <div className="card mb-3">
              <div className="card-header d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <h6 className="mb-0">Structure Approval</h6>
                  {structureApproved && (
                    <span className="badge bg-success ms-2">
                      <FaCheck className="me-1" />
                      Approved
                    </span>
                  )}
                </div>
              </div>
              <div className="card-body">
                {!structureApproved ? (
                  <div>
                    <p className="text-muted mb-3">
                      Review the paper structure above and approve it to proceed with detailed outline generation.
                    </p>
                    <button 
                      className="btn btn-success"
                      onClick={approveStructure}
                    >
                      <FaCheck className="me-1" />
                      Approve Structure
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-success mb-3">
                      ✓ Structure approved! You can now generate the detailed outline with subsections, questions, and citations.
                    </p>
                    <button 
                      className="btn btn-outline-secondary"
                      onClick={editStructure}
                    >
                      <FaEdit className="me-1" />
                      Edit Structure
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {(structureApproved || hasGenerated) && (
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Generate Complete Research Framework</h5>
              </div>
              <div className="card-body">
                {!hasGenerated && (
                  <div className="mb-3">
                    <p className="text-muted">
                      Generate a complete research framework including sections, subsections, questions, and citations.
                    </p>
                    <button 
                      className="btn btn-primary"
                      onClick={() => generateOutline(false)}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <FaSpinner className="fa-spin me-2" />
                          Generating Complete Framework...
                        </>
                      ) : (
                        'Generate Complete Research Framework'
                      )}
                    </button>
                  </div>
                )}

                {loading && generationProgress && (
                  <div className="alert alert-info">
                    <FaSpinner className="fa-spin me-2" />
                    {generationProgress}
                  </div>
                )}

                {error && (
                  <div className="alert alert-danger">
                    <strong>Error:</strong> {error}
                  </div>
                )}

                {hasGenerated && outline.length > 0 && (
                  <div className="mt-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6>
                        Complete Research Framework ({outline.length} sections, {
                          outline.reduce((total, section) => total + (section.subsections?.length || 0), 0)
                        } subsections, {
                          outline.reduce((total, section) => 
                            total + section.subsections?.reduce((subTotal, sub) => 
                              subTotal + (sub.questions?.length || 0), 0
                            ) || 0, 0
                          )} questions)
                      </h6>
                      <button 
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => generateOutline(true)}
                        disabled={loading}
                      >
                        {loading ? 'Regenerating...' : 'Regenerate Framework'}
                      </button>
                    </div>

                    {outline.map((section, sectionIndex) => (
                      <div key={sectionIndex} className="card mb-3">
                        <div className="card-header d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center">
                            <span className="badge bg-primary me-2">{sectionIndex + 1}</span>
                            <h6 className="mb-0">{section.section_title}</h6>
                            {section.is_administrative && (
                              <span className="badge bg-secondary ms-2">Admin</span>
                            )}
                            {section.subsections && section.subsections.length > 0 && (
                              <span className="badge bg-info ms-2">{section.subsections.length} subsections</span>
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
                            
                            {section.subsections && section.subsections.length > 0 && (
                              <div className="mt-3">
                                <h6 className="text-primary mb-3">Subsections:</h6>
                                {section.subsections.map((subsection, subIndex) => (
                                  <div key={subIndex} className="border-start border-3 border-primary ps-3 mb-4">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                      <h6 className="mb-1">{subsection.subsection_title}</h6>
                                      <div className="d-flex gap-1">
                                        <button
                                          className="btn btn-sm btn-outline-info"
                                          onClick={() => generateQuestions(sectionIndex, subIndex)}
                                          disabled={loadingQuestions[`${sectionIndex}-${subIndex}`]}
                                        >
                                          <FaQuestionCircle 
                                            className={loadingQuestions[`${sectionIndex}-${subIndex}`] ? 'fa-spin' : ''}
                                          />
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-muted small mb-3">{subsection.subsection_context}</p>
                                    
                                    {subsection.questions && subsection.questions.length > 0 && (
                                      <div className="mt-2">
                                        <strong className="small text-info">Questions:</strong>
                                        {subsection.questions.map((question, questionIndex) => (
                                          <div key={questionIndex} className="mt-2 p-2 bg-light rounded">
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                              <p className="mb-1 small">{question.question}</p>
                                              <button
                                                className="btn btn-sm btn-outline-warning"
                                                onClick={() => generateCitations(sectionIndex, subIndex, questionIndex)}
                                                disabled={loadingCitations[`${sectionIndex}-${subIndex}-${questionIndex}`]}
                                              >
                                                <FaBookOpen 
                                                  className={loadingCitations[`${sectionIndex}-${subIndex}-${questionIndex}`] ? 'fa-spin' : ''}
                                                />
                                              </button>
                                            </div>

                                            <CitationViewer
                                              citations={question.citations || []}
                                              onAddCitation={(newCitation) => handleAddCitation(sectionIndex, subIndex, questionIndex, newCitation)}
                                              onRemoveCitation={(citationIndex) => handleRemoveCitation(sectionIndex, subIndex, questionIndex, citationIndex)}
                                              finalThesis={finalThesis}
                                              methodology={methodology}
                                              paperLength={paperLength}
                                              sourceCategories={sourceCategories}
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="mt-4 p-3 bg-light rounded">
                      <h6 className="mb-3">Batch Generation</h6>
                      <div className="d-flex gap-2">
                        {hasQuestionsToGenerate() && (
                          <button 
                            className="btn btn-info"
                            onClick={generateAllQuestions}
                            disabled={batchLoadingQuestions}
                          >
                            <FaQuestionCircle className="me-1" />
                            {batchLoadingQuestions ? 'Generating All Questions...' : 'Generate All Questions'}
                          </button>
                        )}
                        
                        {hasCitationsToGenerate() && (
                          <button 
                            className="btn btn-info"
                            onClick={generateAllCitations}
                            disabled={batchLoadingCitations}
                          >
                            <FaBookOpen className="me-1" />
                            {batchLoadingCitations ? 'Generating All Citations...' : 'Generate All Citations'}
                          </button>
                        )}
                      </div>
                      <small className="text-muted mt-2 d-block">
                        Use batch generation to automatically populate questions and citations for all subsections.
                      </small>
                    </div>

                    <div className="mt-3 p-3 bg-success bg-opacity-10 border border-success rounded">
                      <h6 className="text-success mb-3">Complete Research Framework Ready</h6>
                      <p className="mb-3">
                        Your complete research framework with detailed sections, subsections, questions, and citations is ready. 
                        Transfer it to the Outline Draft to begin generating responses.
                      </p>
                      <button 
                        className="btn btn-success"
                        onClick={() => {
                          handleFrameworkComplete();
                          onTransferToOutlineDraft();
                        }}
                      >
                        Transfer to Outline Draft
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OutlineGenerator;
