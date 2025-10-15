import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEdit, FaQuestionCircle, FaBookOpen, FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa';
import CitationViewer from './CitationViewer';
import './CitationViewer.css';
// PaperStructurePreview moved to App.jsx (rendered below Methodology)
import RetryService from '../services/retryService';

const OutlineGenerator = ({ 
  finalThesis, 
  methodology, 
  sourceCategories, 
  selectedPaperType, 
  onFrameworkComplete, 
  onTransferToLiteratureReview,
  savedOutlineData,
  refreshTrigger,
  methodologyComplete
  , savedCustomStructure
}) => {
  const [outline, setOutline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [collapsed, setCollapsed] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [frameworkCompleteCalled, setFrameworkCompleteCalled] = useState(false);

  // Paper Structure States
  const [customStructure, setCustomStructure] = useState(null);

  // Accept custom structure from parent (App) which now renders the PaperStructurePreview
  useEffect(() => {
    if (savedCustomStructure && Array.isArray(savedCustomStructure)) {
      console.log('OutlineGenerator: Initializing customStructure from App provided preview structure');
      setCustomStructure(savedCustomStructure);
      // If outline was already generated, regenerate it with the new structure
      if (hasGenerated) {
        console.log('OutlineGenerator: Regenerating outline with updated structure');
        setHasGenerated(false);
        setFrameworkCompleteCalled(false);
      }
    }
  }, [savedCustomStructure]);

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
    }
  }, [savedOutlineData]);

  // Auto-call framework complete when outline is generated
  useEffect(() => {
    if (hasGenerated && outline.length > 0 && onFrameworkComplete && !frameworkCompleteCalled) {
      console.log('OutlineGenerator: Auto-calling framework complete with outline:', outline);
      setFrameworkCompleteCalled(true);
      onFrameworkComplete(outline);
    }
  }, [hasGenerated, outline, onFrameworkComplete, frameworkCompleteCalled]);

  // Auto-generate outline when component first appears with required props
  useEffect(() => {
    if (methodologyComplete && finalThesis && sourceCategories && selectedPaperType?.id && customStructure && !hasGenerated && !loading) {
      console.log('OutlineGenerator: Auto-generating outline on component mount');
      generateOutline();
    }
  }, [methodologyComplete, finalThesis, sourceCategories, selectedPaperType?.id, customStructure]);

  const toggleCollapse = () => setCollapsed(prev => !prev);
  const [outlineFrameworkCollapsed, setOutlineFrameworkCollapsed] = useState(false);

  const handleStructureChange = (structure) => {
    setCustomStructure(structure);
  };

  const editStructure = () => {
    // Preserve customStructure so the refined/generated preview persists
    setOutline([]);
    setHasGenerated(false);
    setError(null);
    setFrameworkCompleteCalled(false);
  };

  const generateOutline = async (isRegeneration = false) => {
    setLoading(true);
    setError(null);
    setGenerationProgress('Converting data structure to outline...');

    if (isRegeneration) {
      setOutline([]);
      setHasGenerated(false);
    }

    try {
      // Use only the custom structure from data structure preview
      if (!customStructure || !Array.isArray(customStructure) || customStructure.length === 0) {
        throw new Error('No data structure available. Please generate sections first.');
      }

      // Convert custom structure directly to outline format
      const sections = customStructure
        .filter(s => !s.isAdmin) // Exclude administrative sections
        .map(section => ({
          section_title: section.title,
          section_context: section.context || `Analysis and discussion of ${section.title} to support the thesis`,
          subsections: (section.subsections || []).map(sub => ({
            subsection_title: sub.subsection_title,
            subsection_context: sub.subsection_context || `Detailed examination of ${sub.subsection_title}`,
            questions: []
          })),
          is_administrative: false,
          pages_allocated: 2, // Default allocation
          is_data_section: section.isData || false,
          section_type: section.isData ? 'data' : (section.isMethodology ? 'methodology' : (section.isAnalysis ? 'analysis' : 'content')),
          category: section.category || (section.isData ? 'data_section' : 'content_section')
        }));

      console.log('OutlineGenerator: Converted custom structure to outline:', sections);
      setOutline(sections);
      setHasGenerated(true);
      setGenerationProgress('Outline generated successfully');

    } catch (err) {
      console.error('Outline generation error:', err);
      if (err.response?.status === 429) {
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

  // Update the generateCitations function (around line 307)
  const generateCitations = async (sectionIndex, subsectionIndex, questionIndex) => {
    const citationKey = `${sectionIndex}-${subsectionIndex}-${questionIndex}`;
    setLoadingCitations(prev => ({ ...prev, [citationKey]: true }));

    try {
      const section = outline[sectionIndex];
      const subsection = section.subsections[subsectionIndex];
      const questionObj = subsection.questions[questionIndex];

      console.log('Generating citations for:', {
        section: section.section_title,
        subsection: subsection.subsection_title,
        question: questionObj.question
      });

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

      console.log('Citations received:', res.data);

      // Backend returns recommended_sources, not citations
      const sources = res.data.recommended_sources || res.data.citations || [];
      const citationObjects = sources.map(source => {
        // If source is already an object with citation text
        if (typeof source === 'object') {
          return {
            citation: source.citation || source.source || source.title || JSON.stringify(source),
            source: source.source || '',
            relevance: source.relevance || ''
          };
        }
        // If source is just a string
        return {
          citation: source,
          source: '',
          relevance: ''
        };
      });

      console.log('Parsed citation objects:', citationObjects);

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
                    citations: citationObjects
                  };
                })
              };
            })
          };
        })
      );

    } catch (err) {
      console.error('Error generating citations:', err);
      console.error('Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      setError(err.response?.data?.detail || err.message || 'Failed to generate citations.');
    } finally {
      setLoadingCitations(prev => ({ ...prev, [citationKey]: false }));
    }
  };

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
              return {
                ...sub,
                questions: questionObjects
              };
            })
          };
        })
      );

    } catch (err) {
      console.error('Error generating questions:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to generate questions.');
    }
    
    setLoadingQuestions(prev => ({ ...prev, [questionKey]: false }));
  };

  const hasQuestionsToGenerate = () => {
    return outline.some(section => 
      section.subsections?.some(subsection => 
        !subsection.questions || subsection.questions.length === 0
      )
    );
  };

  const hasCitationsToGenerate = () => {
    return outline.some(section => 
      section.subsections?.some(subsection => 
        subsection.questions?.some(question => 
          !question.citations || question.citations.length === 0
        )
      )
    );
  };

  const generateAllQuestions = async () => {
    setBatchLoadingQuestions(true);
    
    for (let sectionIndex = 0; sectionIndex < outline.length; sectionIndex++) {
      const section = outline[sectionIndex];
      for (let subsectionIndex = 0; subsectionIndex < section.subsections.length; subsectionIndex++) {
        const subsection = section.subsections[subsectionIndex];
        if (!subsection.questions || subsection.questions.length === 0) {
          await generateQuestions(sectionIndex, subsectionIndex);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
        }
      }
    }
    
    setBatchLoadingQuestions(false);
  };

  const generateAllCitations = async () => {
    console.log('Starting batch citation generation...');
    console.log('Current outline state:', outline);
    setBatchLoadingCitations(true);
    
    let citationsGenerated = 0;
    
    // Use a callback to get the latest outline state
    setOutline(currentOutline => {
      (async () => {
        for (let sectionIndex = 0; sectionIndex < currentOutline.length; sectionIndex++) {
          const section = currentOutline[sectionIndex];
          if (!section.subsections) continue;
          
          for (let subsectionIndex = 0; subsectionIndex < section.subsections.length; subsectionIndex++) {
            const subsection = section.subsections[subsectionIndex];
            if (!subsection.questions) continue;
            
            for (let questionIndex = 0; questionIndex < subsection.questions.length; questionIndex++) {
              const question = subsection.questions[questionIndex];
              if (!question.citations || question.citations.length === 0) {
                console.log(`Generating citations ${citationsGenerated + 1} for: ${question.question.substring(0, 50)}...`);
                await generateCitations(sectionIndex, subsectionIndex, questionIndex);
                citationsGenerated++;
                await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
              }
            }
          }
        }
        
        console.log(`Batch citation generation complete. Generated ${citationsGenerated} citation sets.`);
        setBatchLoadingCitations(false);
      })();
      
      return currentOutline;
    });
  };

  const handleAddCitation = (sectionIndex, subsectionIndex, questionIndex, newCitation) => {
    setOutline(prevOutline => 
      prevOutline.map((section, secIdx) => {
        if (secIdx !== sectionIndex) return section;
        return {
          ...section,
          subsections: section.subsections.map((sub, subIdx) => {
            if (subIdx !== subsectionIndex) return sub;
            return {
              ...sub,
              questions: sub.questions.map((q, qIdx) => {
                if (qIdx !== questionIndex) return q;
                return {
                  ...q,
                  citations: [...(q.citations || []), newCitation]
                };
              })
            };
          })
        };
      })
    );
  };

  const handleRemoveCitation = (sectionIndex, subsectionIndex, questionIndex, citationIndex) => {
    setOutline(prevOutline => 
      prevOutline.map((section, secIdx) => {
        if (secIdx !== sectionIndex) return section;
        return {
          ...section,
          subsections: section.subsections.map((sub, subIdx) => {
            if (subIdx !== subsectionIndex) return sub;
            return {
              ...sub,
              questions: sub.questions.map((q, qIdx) => {
                if (qIdx !== questionIndex) return q;
                return {
                  ...q,
                  citations: q.citations.filter((_, cIdx) => cIdx !== citationIndex)
                };
              })
            };
          })
        };
      })
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
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>

      <h3>Research Outline Generator</h3>
      
      {!collapsed && (
        <>
          {/* PaperStructurePreview moved to App.jsx and is rendered under Methodology */}

          {customStructure && (
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Generate Outline Framework</h5>
                <div className="d-flex gap-2">
                  {/* Collapse/Expand All Sections Button */}
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      if (
                        outline.some((_, idx) => !collapsedSections[idx])
                      ) {
                        setCollapsedSections(
                          outline.reduce((acc, _, idx) => ({ ...acc, [idx]: true }), {})
                        );
                      } else {
                        setCollapsedSections(
                          outline.reduce((acc, _, idx) => ({ ...acc, [idx]: false }), {})
                        );
                      }
                    }}
                    title={
                      outline.some((_, idx) => !collapsedSections[idx])
                        ? 'Collapse All Sections'
                        : 'Expand All Sections'
                    }
                  >
                    {outline.some((_, idx) => !collapsedSections[idx])
                      ? 'Collapse Sections'
                      : 'Expand Sections'}
                  </button>
                  {/* Collapse/Expand Generate Outline Framework section only, using eye icon */}
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setOutlineFrameworkCollapsed(prev => !prev)}
                    title={outlineFrameworkCollapsed ? 'Expand Generate Outline Framework' : 'Collapse Generate Outline Framework'}
                  >
                    {outlineFrameworkCollapsed ? <FaEye /> : <FaEyeSlash />}
                  </button>
                </div>
              </div>
              {!outlineFrameworkCollapsed && (
                <div className="card-body">
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
                    <>

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
                        <h6 className="text-success mb-3">Complete Outline Framework Ready</h6>
                        <p className="mb-3">
                          Your complete outline framework with detailed sections, subsections, questions, and citations is ready. 
                          Transfer it to the Literature Review to begin generating responses.
                        </p>
                        <button 
                          className="btn btn-success"
                          onClick={() => {
                            handleFrameworkComplete();
                            onTransferToLiteratureReview();
                          }}
                        >
                          Transfer to Literature Review
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OutlineGenerator;
