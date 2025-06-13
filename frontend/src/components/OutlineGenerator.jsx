import { useState, useEffect } from 'react';
import axios from 'axios';
import CitationCards from './CitationCards';
import { FaSyncAlt, FaPlusCircle } from 'react-icons/fa';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';


const OutlineGenerator = ({ finalThesis, methodology, paperLength, sourceCategories }) => {
  const [outline, setOutline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [worksCited, setWorksCited] = useState({});
  const [currentLoadingSub, setCurrentLoadingSub] = useState(null);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [collapsedSubsections, setCollapsedSubsections] = useState({});
  const [allCollapsed, setAllCollapsed] = useState(false);



  // Modal state for additional context input
  const [showContextModal, setShowContextModal] = useState(false);
  const [contextInput, setContextInput] = useState('');
  const [desiredCount, setDesiredCount] = useState(4);
  const [currentAction, setCurrentAction] = useState({ section: null, subsection: null, append: false });

  const [questions, setQuestions] = useState({});

  useEffect(() => {
    if (finalThesis && methodology) {
      generateOutline();
    }
  }, [finalThesis, methodology]);

  const generateOutline = async () => {
    setLoading(true);
    setError(null);

    let safePaperLength;
    
    // Handle special string cases explicitly
    if (paperLength === 'Maximum Detail') {
      safePaperLength = -2;
    } else if (paperLength === 'Adjusted Based on Thesis') {
      safePaperLength = -1;
    } else {
      // Ensure it is parsed as integer
      safePaperLength = parseInt(paperLength, 10);
    }

    try {
      const res = await axios.post('http://localhost:8000/generate_sections', {
        final_thesis: finalThesis,
        methodology,
        paper_length_pages: safePaperLength,
        source_categories: sourceCategories,
      });

      // Initialize outline with sections but empty subsections
      setOutline(res.data.sections.map(sec => ({ ...sec, subsections: [] })));

      setHasGenerated(true);
      setIsEditing(false);
      setSaved(true);
      
    await generateSubsectionsSequentially(res.data.sections);

    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to generate outline.');
    }
    setLoading(false);
  };

  const generateSubsectionsSequentially = async (sections) => {
  const safePaperLength =
    paperLength === 'Maximum Detail' ? -2 :
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

  const fetchWorksCited = async (section, subsection, append = false, additionalContext = '', citationCount = 4) => {
    const key = `${section.section_title}-${subsection.subsection_title}`;
    setCurrentLoadingSub(key);

    if (!append) setWorksCited(prev => ({ ...prev, [key]: 'loading' }));

    try {
      const res = await axios.post('http://localhost:8000/generate_works_cited', {
        final_thesis: finalThesis,
        methodology,
        section_title: section.section_title,
        section_context: section.section_context,
        subsection_title: subsection.subsection_title,
        subsection_context: `${subsection.subsection_context}. Additional context: ${additionalContext}`,
        source_categories: sourceCategories,
        citation_count: citationCount,
      });
      setWorksCited(prev => ({
        ...prev,
        [key]: append && Array.isArray(prev[key])
          ? [...prev[key], ...res.data.recommended_sources]
          : res.data.recommended_sources,
      }));
    } catch (err) {
      setWorksCited(prev => ({
        ...prev,
        [key]: [{
          apa: `Error: ${err.message}`,
          categories: ["Error"],
          methodologyPoints: ["Error"],
          description: "An error occurred retrieving citation details."
        }],
      }));
    }
    setCurrentLoadingSub(null);
  };

  const handleIconClick = (section, subsection, append) => {
    setCurrentAction({ section, subsection, append });
    setContextInput('');
    setDesiredCount(4);
    setShowContextModal(true);
  };

  const handleContextSubmit = () => {
    const { section, subsection, append } = currentAction;
    fetchWorksCited(section, subsection, append, contextInput, desiredCount);
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


  const createWorksCitedSequentially = async () => {
    for (let sIdx = 0; sIdx < outline.length; sIdx++) {
      const section = outline[sIdx];
      for (let subIdx = 0; subIdx < section.subsections.length; subIdx++) {
        await fetchWorksCited(section, section.subsections[subIdx]);
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


  return (
<div className="container position-relative">
  <h3>Outline Generation</h3>

  <button
    className="btn btn-sm btn-outline-secondary position-absolute"
    style={{ top: '10px', right: '10px' }}
    onClick={handleCollapseExpandAll}
  >
    {allCollapsed ? 'Expand All' : 'Collapse All'}
  </button>

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
              const key = `${section.section_title}-${sub.subsection_title}`;
              const collapseKey = `${sIdx}-${subIdx}`;

              return (
                <div key={subIdx} className="card p-3 my-2 position-relative">
                  <div style={{ position: 'absolute', top: 10, right: 10, cursor: 'pointer', color: '#aaa' }} 
                      onClick={() => toggleSubsectionCollapse(sIdx, subIdx)}>
                    {collapsedSubsections[collapseKey] ? <FaChevronRight /> : <FaChevronDown />}
                  </div>

                  <h5>{sub.subsection_title}</h5>
                  <p><strong>Context:</strong> {sub.subsection_context}</p>

                  {!collapsedSubsections[collapseKey] && (
                    <>
                      {questions[key] && (
                        <div className="mt-3">
                          <strong>Questions:</strong>
                          {questions[key] === 'loading' ? (
                            <p>Generating questions...</p>
                          ) : (
                            <ul>
                              {questions[key].map((q, idx) => <li key={idx}>{q}</li>)}
                            </ul>
                          )}
                        </div>
                      )}

                      {worksCited[key] && (
                        <div className="mt-3">
                          <strong>Recommended Sources:</strong>
                          {worksCited[key] === 'loading' || currentLoadingSub === key ? (
                            <p className="loading-text">Generating Works Cited...</p>
                          ) : (
                            <CitationCards citations={worksCited[key]} />
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {saved && (
                    <div style={{ position: 'absolute', top: 10, right: 40, cursor: 'pointer' }}>
                      <FaSyncAlt
                        style={{ color: '#aaa', marginRight: '8px' }}
                        onClick={() => handleIconClick(section, sub, false)}
                      />
                      <FaPlusCircle
                        style={{ color: '#aaa' }}
                        onClick={() => handleIconClick(section, sub, true)}
                      />
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
            <button className="btn btn-primary ms-2" onClick={createWorksCitedSequentially}>
              Create Works Cited
            </button>
          </>
        )}
      </div>

      {/* Context Input Modal */}
      {showContextModal && (
        <div className="modal-overlay" onClick={() => setShowContextModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Additional Works Cited Search Context</h4>
            <textarea
              className="form-control mb-2"
              rows={3}
              placeholder="Enter additional context here..."
              value={contextInput}
              onChange={(e) => setContextInput(e.target.value)}
            />
            {currentAction.append && (
              <input
                className="form-control mb-2"
                type="number"
                min={1}
                placeholder="Number of desired citations"
                value={desiredCount}
                onChange={(e) => setDesiredCount(parseInt(e.target.value, 10))}
              />
            )}
            <button className="btn btn-primary" onClick={handleContextSubmit}>
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutlineGenerator;
