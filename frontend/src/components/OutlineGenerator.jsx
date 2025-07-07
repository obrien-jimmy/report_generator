import { useState } from 'react';
import axios from 'axios';
import { FaCheck, FaEdit, FaQuestionCircle, FaBookOpen, FaEye, FaEyeSlash } from 'react-icons/fa';
import CitationViewer from './CitationViewer';
import './CitationViewer.css';
import PaperStructurePreview from './PaperStructurePreview';

const OutlineGenerator = ({ finalThesis, methodology, paperLength, sourceCategories, selectedPaperType }) => {
  const [outline, setOutline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [collapsed, setCollapsed] = useState(false);

  // Paper Structure States
  const [customStructure, setCustomStructure] = useState(null);
  const [structureApproved, setStructureApproved] = useState(false);

  // Question and Citation States
  const [loadingQuestions, setLoadingQuestions] = useState({});
  const [loadingCitations, setLoadingCitations] = useState({});
  const [batchLoadingQuestions, setBatchLoadingQuestions] = useState(false);
  const [batchLoadingCitations, setBatchLoadingCitations] = useState(false);

  const toggleCollapse = () => setCollapsed(prev => !prev);

  const handleStructureChange = (structure) => {
    setCustomStructure(structure);
    setStructureApproved(false); // Reset approval when structure changes
  };

  const approveStructure = () => {
    setStructureApproved(true);
  };

  const editStructure = () => {
    setStructureApproved(false);
  };

  const handleAddCitation = (sectionIndex, subsectionIndex, questionIndex) => {
    // Placeholder for add citation functionality
    console.log('Add citation for:', sectionIndex, subsectionIndex, questionIndex);
  };

  const handleRemoveCitation = (sectionIndex, subsectionIndex, questionIndex, citationIndex) => {
    setOutline(prevOutline => 
      prevOutline.map((outlineSection, secIdx) => 
        secIdx === sectionIndex 
          ? {
              ...outlineSection,
              subsections: outlineSection.subsections.map((sub, subIdx) =>
                subIdx === subsectionIndex
                  ? { 
                      ...sub, 
                      citations: {
                        ...sub.citations,
                        [questionIndex]: sub.citations[questionIndex]?.filter((_, idx) => idx !== citationIndex) || []
                      }
                    }
                  : sub
              )
            }
          : outlineSection
      )
    );
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

      const methodologyId = methodology?.methodologyType || methodology?.methodology_type;
      const subMethodologyId = methodology?.subMethodology || methodology?.sub_methodology;

      // Use custom structure if available
      const structureToUse = customStructure ? 
        customStructure.filter(s => !s.isAdmin).map(s => ({
          section_title: s.title,
          section_context: s.context || `Analysis and discussion of ${s.title}`,
          pages_allocated: s.pages
        })) : null;

      const res = await axios.post('http://localhost:8000/generate_structured_outline', {
        final_thesis: finalThesis,
        paper_type: selectedPaperType?.id || 'research',
        methodology,
        paper_length_pages: safePaperLength,
        source_categories: sourceCategories,
        methodology_id: methodologyId,
        sub_methodology_id: subMethodologyId,
        custom_structure: structureToUse // Send custom structure to backend
      });

      const sections = res.data.outline.map(section => ({
        section_title: section.section_title,
        section_context: section.section_context,
        subsections: [],
        is_administrative: section.is_administrative || false,
        pages_allocated: section.pages_allocated || 2,
        questions: [],
        citations: {}
      }));

      setOutline(sections);
      setHasGenerated(true);
      
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
          source_categories: sourceCategories,
          pages_allocated: section.pages_allocated || 2
        };

        const res = await axios.post('http://localhost:8000/generate_subsections', requestPayload);

        setOutline(prevOutline => 
          prevOutline.map(outlineSection => 
            outlineSection.section_title === section.section_title
              ? { 
                  ...outlineSection, 
                  subsections: res.data.subsections.map(sub => ({
                    ...sub,
                    questions: [],
                    citations: {}
                  }))
                }
              : outlineSection
          )
        );
      } catch (err) {
        console.error(`Error generating subsections for ${section.section_title}:`, err);
        continue;
      }
    }
  };

  const generateQuestions = async (sectionIndex, subsectionIndex) => {
    const section = outline[sectionIndex];
    const subsection = section.subsections[subsectionIndex];
    const questionKey = `${sectionIndex}-${subsectionIndex}`;

    setLoadingQuestions(prev => ({ ...prev, [questionKey]: true }));

    try {
      const response = await axios.post('http://localhost:8000/generate_questions', {
        section_title: section.section_title,
        section_context: section.section_context,
        subsection_title: subsection.subsection_title,
        subsection_context: subsection.subsection_context,
        final_thesis: finalThesis,
        methodology: methodology
      });

      setOutline(prevOutline => 
        prevOutline.map((outlineSection, secIdx) => 
          secIdx === sectionIndex 
            ? {
                ...outlineSection,
                subsections: outlineSection.subsections.map((sub, subIdx) =>
                  subIdx === subsectionIndex
                    ? { ...sub, questions: response.data.questions }
                    : sub
                )
              }
            : outlineSection
        )
      );
    } catch (err) {
      console.error('Error generating questions:', err);
    }

    setLoadingQuestions(prev => ({ ...prev, [questionKey]: false }));
  };

  const generateCitations = async (sectionIndex, subsectionIndex, questionIndex) => {
    const section = outline[sectionIndex];
    const subsection = section.subsections[subsectionIndex];
    const question = subsection.questions[questionIndex];
    const citationKey = `${sectionIndex}-${subsectionIndex}-${questionIndex}`;

    setLoadingCitations(prev => ({ ...prev, [citationKey]: true }));

    const requestPayload = {
      final_thesis: finalThesis,
      methodology: methodology,
      section_title: section.section_title,
      section_context: section.section_context,
      subsection_title: subsection.subsection_title,
      subsection_context: subsection.subsection_context,
      question: question,
      source_categories: sourceCategories || [],
      citation_count: 3
    };

    try {
      const response = await axios.post('http://localhost:8000/generate_question_citations', requestPayload);

      setOutline(prevOutline => 
        prevOutline.map((outlineSection, secIdx) => 
          secIdx === sectionIndex 
            ? {
                ...outlineSection,
                subsections: outlineSection.subsections.map((sub, subIdx) =>
                  subIdx === subsectionIndex
                    ? { 
                        ...sub, 
                        citations: {
                          ...sub.citations,
                          [questionIndex]: response.data.recommended_sources
                        }
                      }
                    : sub
                )
              }
            : outlineSection
        )
      );
    } catch (err) {
      console.error('Error generating citations:', err);
    }

    setLoadingCitations(prev => ({ ...prev, [citationKey]: false }));
  };

  // NEW: Batch generate all questions
  const generateAllQuestions = async () => {
    setBatchLoadingQuestions(true);
    
    for (let sectionIndex = 0; sectionIndex < outline.length; sectionIndex++) {
      const section = outline[sectionIndex];
      
      // Skip administrative sections
      if (section.is_administrative) continue;
      
      for (let subsectionIndex = 0; subsectionIndex < section.subsections.length; subsectionIndex++) {
        const subsection = section.subsections[subsectionIndex];
        
        // Skip if questions already exist
        if (subsection.questions && subsection.questions.length > 0) continue;
        
        await generateQuestions(sectionIndex, subsectionIndex);
      }
    }
    
    setBatchLoadingQuestions(false);
  };

  // NEW: Batch generate all citations
  const generateAllCitations = async () => {
    setBatchLoadingCitations(true);
    
    for (let sectionIndex = 0; sectionIndex < outline.length; sectionIndex++) {
      const section = outline[sectionIndex];
      
      // Skip administrative sections
      if (section.is_administrative) continue;
      
      for (let subsectionIndex = 0; subsectionIndex < section.subsections.length; subsectionIndex++) {
        const subsection = section.subsections[subsectionIndex];
        
        // Skip if no questions exist
        if (!subsection.questions || subsection.questions.length === 0) continue;
        
        for (let questionIndex = 0; questionIndex < subsection.questions.length; questionIndex++) {
          // Skip if citations already exist
          if (subsection.citations && subsection.citations[questionIndex]) continue;
          
          await generateCitations(sectionIndex, subsectionIndex, questionIndex);
        }
      }
    }
    
    setBatchLoadingCitations(false);
  };

  // Helper functions to check if batch operations are available
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
        sub.questions.some((_, qIndex) => !sub.citations || !sub.citations[qIndex])
      )
    );
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

          {customStructure && (
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
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setCollapsedSections(prev => ({
                    ...prev,
                    structureApproval: !prev.structureApproval
                  }))}
                >
                  {collapsedSections.structureApproval ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
              {!collapsedSections.structureApproval && (
                <div className="card-body">
                  {!structureApproved ? (
                    <div>
                      <p className="text-muted mb-3">
                        Review the paper structure above and approve it to proceed with outline generation.
                        You can customize sections, allocate pages, and add specific focus areas.
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
                        ✓ Structure approved! You can now generate the detailed outline.
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
              )}
            </div>
          )}

          {structureApproved && (
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Generate Detailed Outline</h5>
                {hasGenerated && (
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setCollapsedSections(prev => {
                      const allCollapsed = Object.values(prev).every(val => val);
                      const newState = {};
                      outline.forEach((_, index) => {
                        newState[index] = !allCollapsed;
                      });
                      return newState;
                    })}
                  >
                    {Object.values(collapsedSections).every(val => val) ? <FaEye /> : <FaEyeSlash />}
                    {Object.values(collapsedSections).every(val => val) ? ' Show All' : ' Hide All'}
                  </button>
                )}
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
                                  <div key={subIndex} className="mb-4 p-3 border-start border-primary ps-3">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                      <div className="flex-grow-1">
                                        <div className="d-flex align-items-center mb-2">
                                          <strong className="me-2">{subsection.subsection_title}</strong>
                                          {/* Question generation icon */}
                                          <button
                                            className="btn btn-sm p-1 text-info"
                                            onClick={() => generateQuestions(sectionIndex, subIndex)}
                                            disabled={loadingQuestions[`${sectionIndex}-${subIndex}`]}
                                            style={{ border: 'none', background: 'transparent' }}
                                            title="Generate questions for this subsection"
                                          >
                                            <FaQuestionCircle 
                                              className={loadingQuestions[`${sectionIndex}-${subIndex}`] ? 'fa-spin' : ''}
                                            />
                                          </button>
                                        </div>
                                        <p className="text-muted small mb-2">{subsection.subsection_context}</p>
                                      </div>
                                    </div>

                                    {subsection.questions && subsection.questions.length > 0 && (
                                      <div className="mt-3">
                                        <h6 className="text-info mb-2">
                                          Research Questions:
                                        </h6>
                                        {subsection.questions.map((question, questionIndex) => (
                                          <div key={questionIndex} className="mb-3 p-3 bg-light rounded">
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                              <p className="mb-0 flex-grow-1">
                                                <strong>Q{questionIndex + 1}:</strong> {question}
                                              </p>
                                              {/* Citation generation icon */}
                                              <button
                                                className="btn btn-sm p-1 text-info ms-2"
                                                onClick={() => generateCitations(sectionIndex, subIndex, questionIndex)}
                                                disabled={loadingCitations[`${sectionIndex}-${subIndex}-${questionIndex}`]}
                                                style={{ border: 'none', background: 'transparent' }}
                                                title="Generate citations for this question"
                                              >
                                                <FaBookOpen 
                                                  className={loadingCitations[`${sectionIndex}-${subIndex}-${questionIndex}`] ? 'fa-spin' : ''}
                                                />
                                              </button>
                                            </div>

                                            {/* Citation Viewer */}
                                            <CitationViewer
                                              citations={subsection.citations?.[questionIndex] || []}
                                              onAddCitation={() => handleAddCitation(sectionIndex, subIndex, questionIndex)}
                                              onRemoveCitation={(citationIndex) => handleRemoveCitation(sectionIndex, subIndex, questionIndex, citationIndex)}
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

                    {/* Batch Generation Controls */}
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