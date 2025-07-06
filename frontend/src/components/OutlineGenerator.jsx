import { useState, useEffect } from 'react';
import axios from 'axios';
import CitationCards from './CitationCards';
import { FaSyncAlt, FaPlusCircle, FaChevronDown, FaChevronRight } from 'react-icons/fa';

const OutlineGenerator = ({ finalThesis, methodology, paperLength, sourceCategories, selectedPaperType }) => {
  const [outline, setOutline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [collapsedSubsections, setCollapsedSubsections] = useState({});
  const [collapsedQuestions, setCollapsedQuestions] = useState({});
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [questions, setQuestions] = useState({});
  const [questionCitations, setQuestionCitations] = useState({});
  const [loadingCitations, setLoadingCitations] = useState({});
  const [generatingAllCitations, setGeneratingAllCitations] = useState(false);

  // Modal state for additional context input
  const [showContextModal, setShowContextModal] = useState(false);
  const [contextInput, setContextInput] = useState('');
  const [desiredCount, setDesiredCount] = useState(3);
  const [currentAction, setCurrentAction] = useState({ 
    section: null, 
    subsection: null, 
    question: null, 
    append: false 
  });

  useEffect(() => {
    if (finalThesis && methodology) {
      generateOutline();
    }
  }, [finalThesis, methodology]);

  const generateOutline = async () => {
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
        paper_type: selectedPaperType?.id || 'research', // Use selected paper type
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
      setIsEditing(false);
      setSaved(true);
      
      // Show structure preview info
      if (res.data.structure_preview) {
        console.log('Generated structure:', res.data.structure_preview);
      }
      
      // Only generate subsections for non-administrative sections
      const contentSections = sections.filter(sec => !sec.is_administrative);
      await generateSubsectionsSequentially(contentSections);

    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to generate outline.');
    }
    setLoading(false);
  };

  const handleRegenerate = () => {
    const confirmRegenerate = window.confirm(
      "This will regenerate the entire outline and clear all questions and citations. Are you sure you want to continue?"
    );
    if (!confirmRegenerate) return;
    
    // Clear all existing data
    setOutline([]);
    setQuestions({});
    setQuestionCitations({});
    setLoadingCitations({});
    setCollapsedSections({});
    setCollapsedSubsections({});
    setCollapsedQuestions({});
    setAllCollapsed(false);
    setHasGenerated(false);
    setIsEditing(false);
    setSaved(false);
    
    // Regenerate the outline
    generateOutline();
  };

  const toggleCollapse = () => setCollapsed(prev => !prev);

  const generateSubsectionsSequentially = async (sections) => {
    const safePaperLength = paperLength === 'Maximum Detail' ? -2 :
                            paperLength === 'Adjusted Based on Thesis' ? -1 :
                            parseInt(paperLength, 10);

    for (let section of sections) {
      try {
        const res = await axios.post('http://localhost:8000/generate_subsections', {
          final_thesis: finalThesis,
          methodology,
          section_title: section.section_title,
          section_context: section.section_context,
          paper_length_pages: safePaperLength,
          source_categories: sourceCategories,
        });

        setOutline(prevOutline => prevOutline.map(sec => {
          if (sec.section_title === section.section_title) {
            return { ...sec, subsections: res.data.subsections };
          }
          return sec;
        }));
      } catch (err) {
        console.error(`Error generating subsections for section: ${section.section_title}`, err);
      }
    }
  };

  const generateQuestionsSequentially = async () => {
    for (let section of outline) {
      for (let subsection of section.subsections) {
        const key = `${section.section_title}-${subsection.subsection_title}`;

        setQuestions(prev => ({ ...prev, [key]: 'loading' }));

        try {
          const res = await axios.post('http://localhost:8000/generate_questions', {
            final_thesis: finalThesis,
            methodology,
            section_title: section.section_title,
            section_context: section.section_context,
            subsection_title: subsection.subsection_title,
            subsection_context: subsection.subsection_context,
          });

          setQuestions(prev => ({ ...prev, [key]: res.data.questions }));
        } catch (err) {
          setQuestions(prev => ({ ...prev, [key]: [`Error: ${err.message}`] }));
        }
      }
    }
  };

  const generateAllCitationsSequentially = async () => {
    setGeneratingAllCitations(true);
    
    for (let section of outline) {
      for (let subsection of section.subsections) {
        const questionKey = `${section.section_title}-${subsection.subsection_title}`;
        const questionsArray = questions[questionKey];
        
        if (Array.isArray(questionsArray)) {
          for (let question of questionsArray) {
            // Skip error questions
            if (question.startsWith('Error:')) continue;
            
            const citationKey = `${section.section_title}-${subsection.subsection_title}-${question}`;
            
            // Only generate if citations don't already exist
            if (!questionCitations[citationKey]) {
              setLoadingCitations(prev => ({ ...prev, [citationKey]: true }));
              setQuestionCitations(prev => ({ ...prev, [citationKey]: 'loading' }));

              try {
                // Add a small delay to prevent rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const res = await axios.post('http://localhost:8000/generate_question_citations', {
                  final_thesis: finalThesis,
                  methodology,
                  section_title: section.section_title,
                  section_context: section.section_context,
                  subsection_title: subsection.subsection_title,
                  subsection_context: subsection.subsection_context,
                  question: question,
                  source_categories: sourceCategories,
                  citation_count: 3,
                });

                setQuestionCitations(prev => ({
                  ...prev,
                  [citationKey]: res.data.recommended_sources,
                }));
              } catch (err) {
                console.error(`Error generating citations for question: ${question}`, err);
                setQuestionCitations(prev => ({
                  ...prev,
                  [citationKey]: [{
                    apa: `Error: ${err.message}`,
                    categories: ["Error"],
                    methodologyPoints: ["Error"],
                    description: "An error occurred retrieving citation details."
                  }],
                }));
              }
              setLoadingCitations(prev => ({ ...prev, [citationKey]: false }));
            }
          }
        }
      }
    }
    
    setGeneratingAllCitations(false);
  };

  const fetchQuestionCitations = async (section, subsection, question, append = false, additionalContext = '', citationCount = 3) => {
    const key = `${section.section_title}-${subsection.subsection_title}-${question}`;
    setLoadingCitations(prev => ({ ...prev, [key]: true }));

    if (!append) {
      setQuestionCitations(prev => ({ ...prev, [key]: 'loading' }));
    }

    try {
      const res = await axios.post('http://localhost:8000/generate_question_citations', {
        final_thesis: finalThesis,
        methodology,
        section_title: section.section_title,
        section_context: section.section_context,
        subsection_title: subsection.subsection_title,
        subsection_context: `${subsection.subsection_context}. Additional context: ${additionalContext}`,
        question: question,
        source_categories: sourceCategories,
        citation_count: citationCount,
      });

      setQuestionCitations(prev => ({
        ...prev,
        [key]: append && Array.isArray(prev[key])
          ? [...prev[key], ...res.data.recommended_sources]
          : res.data.recommended_sources,
      }));
    } catch (err) {
      setQuestionCitations(prev => ({
        ...prev,
        [key]: [{
          apa: `Error: ${err.message}`,
          categories: ["Error"],
          methodologyPoints: ["Error"],
          description: "An error occurred retrieving citation details."
        }],
      }));
    }
    setLoadingCitations(prev => ({ ...prev, [key]: false }));
  };

  const handleQuestionCitationClick = (section, subsection, question, append) => {
    setCurrentAction({ section, subsection, question, append });
    setContextInput('');
    setDesiredCount(3);
    setShowContextModal(true);
  };

  const handleContextSubmit = () => {
    const { section, subsection, question, append } = currentAction;
    fetchQuestionCitations(section, subsection, question, append, contextInput, desiredCount);
    setShowContextModal(false);
  };

  const toggleSectionCollapse = (sectionIdx) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionIdx]: !prev[sectionIdx]
    }));
  };

  const toggleSubsectionCollapse = (sectionIdx, subIdx) => {
    const key = `${sectionIdx}-${subIdx}`;
    setCollapsedSubsections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleQuestionCollapse = (sectionIdx, subIdx, questionIdx) => {
    const key = `${sectionIdx}-${subIdx}-${questionIdx}`;
    setCollapsedQuestions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleCollapseExpandAll = () => {
    const newCollapsedState = !allCollapsed;
    setAllCollapsed(newCollapsedState);

    setCollapsedSections(
      outline.reduce((acc, _, idx) => ({ ...acc, [idx]: newCollapsedState }), {})
    );

    setCollapsedSubsections(
      outline.reduce((acc, section, sIdx) => {
        section.subsections.forEach((_, subIdx) => {
          acc[`${sIdx}-${subIdx}`] = newCollapsedState;
        });
        return acc;
      }, {})
    );

    setCollapsedQuestions(
      outline.reduce((acc, section, sIdx) => {
        section.subsections.forEach((subsection, subIdx) => {
          const questionKey = `${section.section_title}-${subsection.subsection_title}`;
          const questionsArray = questions[questionKey];
          if (Array.isArray(questionsArray)) {
            questionsArray.forEach((_, qIdx) => {
              acc[`${sIdx}-${subIdx}-${qIdx}`] = newCollapsedState;
            });
          }
        });
        return acc;
      }, {})
    );
  };

  const updateSection = (idx, field, value) => {
    setOutline(prev =>
      prev.map((sec, sIdx) =>
        sIdx === idx ? { ...sec, [field]: value } : sec
      )
    );
    setSaved(false);
  };

  const handleSave = () => {
    setIsEditing(false);
    setSaved(true);
  };

  // Check if questions exist for the citation button
  const hasQuestions = Object.values(questions).some(q => Array.isArray(q) && q.length > 0);

  return (
    <div className="p-3 mb-4 position-relative w-100">
      <div className="d-flex" style={{ position: 'absolute', top: 0, right: 0 }}>
        <button
          className="btn btn-sm btn-outline-secondary me-2"
          onClick={handleRegenerate}
          title="Regenerate entire outline"
        >
          Refresh
        </button>
        <button
          className="btn btn-sm btn-outline-secondary me-2"
          onClick={handleCollapseExpandAll}
        >
          {allCollapsed ? 'Expand All' : 'Collapse All'}
        </button>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={toggleCollapse}
        >
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>

      <h3>Outline Generation</h3>

      {!collapsed && (
        <>
          {!hasGenerated && (
            <button className="btn btn-primary my-3" onClick={generateOutline} disabled={loading}>
              {loading ? 'Generating Outline...' : 'Generate Outline'}
            </button>
          )}

          {error && <div className="alert alert-danger">{error}</div>}

          {outline.map((section, sIdx) => (
            <div key={sIdx} className="card p-4 my-3 position-relative">
              <div style={{ position: 'absolute', top: 10, right: 10, cursor: 'pointer', color: '#aaa' }} 
                  onClick={() => toggleSectionCollapse(sIdx)}>
                {collapsedSections[sIdx] ? <FaChevronRight /> : <FaChevronDown />}
              </div>

              {!isEditing ? (
                <>
                  <h4>{section.section_title}</h4>
                  <p><strong>Context:</strong> {section.section_context}</p>
                </>
              ) : (
                <>
                  <input
                    className="form-control mb-2"
                    value={section.section_title}
                    onChange={e => updateSection(sIdx, 'section_title', e.target.value)}
                  />
                  <textarea
                    className="form-control mb-3"
                    rows={3}
                    value={section.section_context}
                    onChange={e => updateSection(sIdx, 'section_context', e.target.value)}
                  />
                </>
              )}

              {!collapsedSections[sIdx] && (
                <>
                  {section.subsections.length === 0 && <p>Generating subsections...</p>}

                  {section.subsections.map((sub, subIdx) => {
                    const questionKey = `${section.section_title}-${sub.subsection_title}`;
                    const collapseKey = `${sIdx}-${subIdx}`;
                    const questionsArray = questions[questionKey];

                    return (
                      <div key={subIdx} className="card p-3 my-2 position-relative">
                        <div style={{ position: 'absolute', top: 10, right: 10, cursor: 'pointer', color: '#aaa' }} 
                            onClick={() => toggleSubsectionCollapse(sIdx, subIdx)}>
                          {collapsedSubsections[collapseKey] ? <FaChevronRight /> : <FaChevronDown />}
                        </div>

                        <h5>{sub.subsection_title}</h5>
                        <p><strong>Context:</strong> {sub.subsection_context}</p>

                        {!collapsedSubsections[collapseKey] && questionsArray && (
                          <div className="mt-3">
                            <strong>Research Questions:</strong>
                            {questionsArray === 'loading' ? (
                              <p>Generating questions...</p>
                            ) : (
                              <div className="mt-2">
                                {questionsArray.map((question, qIdx) => {
                                  const questionCollapseKey = `${sIdx}-${subIdx}-${qIdx}`;
                                  const citationKey = `${section.section_title}-${sub.subsection_title}-${question}`;
                                  const isQuestionCollapsed = collapsedQuestions[questionCollapseKey];

                                  return (
                                    <div key={qIdx} className="card p-2 mb-2">
                                      <div 
                                        className="d-flex justify-content-between align-items-center cursor-pointer"
                                        onClick={() => toggleQuestionCollapse(sIdx, subIdx, qIdx)}
                                      >
                                        <span><strong>Q{qIdx + 1}:</strong> {question}</span>
                                        {isQuestionCollapsed ? <FaChevronRight /> : <FaChevronDown />}
                                      </div>

                                      {!isQuestionCollapsed && (
                                        <div className="mt-2">
                                          {questionCitations[citationKey] && (
                                            <div>
                                              <strong>Supporting Sources:</strong>
                                              {questionCitations[citationKey] === 'loading' || loadingCitations[citationKey] ? (
                                                <p className="loading-text">Generating citations...</p>
                                              ) : (
                                                <CitationCards citations={questionCitations[citationKey]} />
                                              )}
                                            </div>
                                          )}

                                          {saved && (
                                            <div className="mt-2">
                                              <button
                                                className="btn btn-sm btn-outline-primary me-2"
                                                onClick={() => handleQuestionCitationClick(section, sub, question, false)}
                                              >
                                                <FaSyncAlt /> Generate Citations
                                              </button>
                                              {questionCitations[citationKey] && Array.isArray(questionCitations[citationKey]) && (
                                                <button
                                                  className="btn btn-sm btn-outline-secondary"
                                                  onClick={() => handleQuestionCitationClick(section, sub, question, true)}
                                                >
                                                  <FaPlusCircle /> Add More Citations
                                                </button>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          ))}

          <div className="mt-3">
            {isEditing ? (
              <button className="btn btn-success" onClick={handleSave}>Save Outline</button>
            ) : (
              <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>Edit Outline</button>
            )}

            {saved && !isEditing && (
              <>
                <button className="btn btn-primary ms-2" onClick={generateQuestionsSequentially}>
                  Generate Questions
                </button>
                {hasQuestions && (
                  <button 
                    className="btn btn-primary ms-2" 
                    onClick={generateAllCitationsSequentially}
                    disabled={generatingAllCitations}
                  >
                    {generatingAllCitations ? 'Generating Citations...' : 'Generate Citations'}
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Context Input Modal */}
      {showContextModal && (
        <div className="modal-overlay" onClick={() => setShowContextModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Additional Citation Search Context</h4>
            <p><strong>Question:</strong> {currentAction.question}</p>
            <textarea
              className="form-control mb-2"
              rows={3}
              placeholder="Enter additional context for more targeted citations..."
              value={contextInput}
              onChange={(e) => setContextInput(e.target.value)}
            />
            {currentAction.append && (
              <input
                className="form-control mb-2"
                type="number"
                min={1}
                max={10}
                placeholder="Number of desired citations"
                value={desiredCount}
                onChange={(e) => setDesiredCount(parseInt(e.target.value, 10))}
              />
            )}
            <button className="btn btn-primary" onClick={handleContextSubmit}>
              Generate Citations
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutlineGenerator;
