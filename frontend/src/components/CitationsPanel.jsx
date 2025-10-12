import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CitationsPanel = ({ 
  isOpen, 
  onClose, 
  outline,
  finalThesis,
  methodology
}) => {
  const [citations, setCitations] = useState([]);
  const [sortBy, setSortBy] = useState('number'); // 'number', 'author', 'category'
  const [expandedCitations, setExpandedCitations] = useState({});
  const [citationChecks, setCitationChecks] = useState({});
  const [checkingCitation, setCheckingCitation] = useState(null);
  const [loading, setLoading] = useState(false);

  // Extract all citations from outline when it changes
  useEffect(() => {
    if (outline && outline.length > 0) {
      extractCitationsFromOutline();
    }
  }, [outline]);

  const extractCitationsFromOutline = () => {
    const allCitations = [];
    let citationNumber = 1;

    outline.forEach((section, sectionIndex) => {
      if (section.subsections) {
        section.subsections.forEach((subsection, subsectionIndex) => {
          if (subsection.questions) {
            subsection.questions.forEach((questionObj, questionIndex) => {
              if (questionObj.citations) {
                questionObj.citations.forEach((citation, citationIndex) => {
                  allCitations.push({
                    number: citationNumber++,
                    ...citation,
                    sectionTitle: section.section_title,
                    sectionContext: section.section_context,
                    subsectionTitle: subsection.subsection_title,
                    subsectionContext: subsection.subsection_context,
                    question: questionObj.question,
                    sectionIndex,
                    subsectionIndex,
                    questionIndex,
                    citationIndex
                  });
                });
              }
            });
          }
        });
      }
    });

    setCitations(allCitations);
  };

  const getSortedCitations = () => {
    const sorted = [...citations];
    
    switch (sortBy) {
      case 'author':
        return sorted.sort((a, b) => {
          const authorA = extractAuthor(a.apa || '').toLowerCase();
          const authorB = extractAuthor(b.apa || '').toLowerCase();
          return authorA.localeCompare(authorB);
        });
      case 'category':
        return sorted.sort((a, b) => {
          const categoryA = (a.categories?.[0] || '').toLowerCase();
          const categoryB = (b.categories?.[0] || '').toLowerCase();
          return categoryA.localeCompare(categoryB);
        });
      default:
        return sorted.sort((a, b) => a.number - b.number);
    }
  };

  const getGroupedCitations = () => {
    if (sortBy !== 'category') {
      return { ungrouped: getSortedCitations() };
    }

    const groups = {};
    citations.forEach(citation => {
      const category = (citation.categories?.[0] || 'Uncategorized').trim();
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(citation);
    });

    // Sort categories alphabetically and sort citations within each category by author
    const sortedGroups = {};
    Object.keys(groups)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .forEach(category => {
        sortedGroups[category] = groups[category].sort((a, b) => {
          const authorA = extractAuthor(a.apa || '').toLowerCase();
          const authorB = extractAuthor(b.apa || '').toLowerCase();
          return authorA.localeCompare(authorB);
        });
      });

    return sortedGroups;
  };

  const extractAuthor = (apaString) => {
    const match = apaString.match(/^([^,]+)/);
    return match ? match[1].trim() : 'Unknown Author';
  };

  const toggleCitationExpansion = (citationNumber) => {
    setExpandedCitations(prev => ({
      ...prev,
      [citationNumber]: !prev[citationNumber]
    }));
  };

  const checkCitation = async (citation) => {
    setCheckingCitation(citation.number);
    
    try {
      const response = await axios.post('http://localhost:8000/check_citation_validity', {
        citation: {
          apa: citation.apa,
          title: citation.title || '',
          author: extractAuthor(citation.apa || ''),
          description: citation.description
        },
        context: {
          thesis: finalThesis,
          section_title: citation.sectionTitle,
          subsection_title: citation.subsectionTitle,
          question: citation.question,
          methodology: methodology
        }
      });

      setCitationChecks(prev => ({
        ...prev,
        [citation.number]: {
          status: response.data.status, // 'valid', 'partial', 'invalid'
          explanation: response.data.explanation,
          link: response.data.link || null,
          checkedAt: new Date().toLocaleString()
        }
      }));
    } catch (error) {
      console.error('Error checking citation:', error);
      setCitationChecks(prev => ({
        ...prev,
        [citation.number]: {
          status: 'error',
          explanation: 'Error occurred during citation check',
          link: null,
          checkedAt: new Date().toLocaleString()
        }
      }));
    }
    
    setCheckingCitation(null);
  };

  const checkAllCitations = async () => {
    setLoading(true);
    
    for (const citation of citations) {
      await checkCitation(citation);
      // Add a small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setLoading(false);
  };

  const exportToWorksCited = () => {
    const worksCitedText = getSortedCitations()
      .map(citation => citation.apa)
      .join('\n\n');
    
    const blob = new Blob([worksCitedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'works-cited.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'valid': return <span className="text-success">●</span>;
      case 'partial': return <span className="text-warning">●</span>;
      case 'invalid': return <span className="text-danger">●</span>;
      case 'error': return <span className="text-muted">●</span>;
      default: return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex" style={{ zIndex: 9999 }}>
      {/* Backdrop */}
      <div 
        className="position-absolute w-100 h-100 bg-dark bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div 
        className="ms-auto bg-white shadow-lg h-100 overflow-hidden d-flex flex-column position-relative" 
        style={{ width: '600px', zIndex: 10000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-bottom p-3 d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Citations ({citations.length})</h5>
            <small className="text-muted">All citations from the paper outline</small>
          </div>
          <button 
            className="btn-close" 
            onClick={onClose}
            aria-label="Close"
          />
        </div>
        
        {/* Controls */}
        <div className="border-bottom p-3">
          <div className="row align-items-center">
            <div className="col-md-6">
              <label className="form-label small mb-1">Sort by:</label>
              <select 
                className="form-select form-select-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="number">Citation Number</option>
                <option value="author">Author (A-Z)</option>
                <option value="category">Category (A-Z)</option>
              </select>
            </div>
            <div className="col-md-6 text-end">
              <div className="d-flex gap-2 justify-content-end">
                <button 
                  className="btn btn-outline-primary btn-sm"
                  onClick={checkAllCitations}
                  disabled={loading || citations.length === 0}
                >
                  {loading ? 'Checking...' : 'Check All'}
                </button>
                <button 
                  className="btn btn-outline-success btn-sm"
                  onClick={exportToWorksCited}
                  disabled={citations.length === 0}
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Citations List */}
        <div className="flex-grow-1 overflow-auto p-3">
          {citations.length === 0 ? (
            <div className="text-center py-5">
              <div className="text-muted">
                <i className="bi bi-journals fs-1 d-block mb-3"></i>
                <p>No citations available yet.</p>
                <p className="small">Citations will appear here once you generate your outline framework with questions and citations.</p>
              </div>
            </div>
          ) : (
            (() => {
              const groupedCitations = getGroupedCitations();
              
              if (sortBy === 'category') {
                return Object.entries(groupedCitations).map(([category, categoryCitations]) => (
                  <div key={category} className="mb-4">
                    <div className="d-flex align-items-center mb-3">
                      <h6 className="text-primary mb-0 me-2">{category}</h6>
                      <div className="flex-grow-1 border-bottom border-primary opacity-25"></div>
                      <small className="text-muted ms-2">({categoryCitations.length} citations)</small>
                    </div>
                    {categoryCitations.map((citation) => (
              <div key={citation.number} className="card mb-3">
                <div className="card-header py-2 d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center">
                    <strong className="me-2">[{citation.number}]</strong>
                    {citationChecks[citation.number] && getStatusIcon(citationChecks[citation.number].status)}
                    <span className="ms-2 small">{extractAuthor(citation.apa || '')}</span>
                  </div>
                  <div className="d-flex align-items-center">
                    <button
                      className="btn btn-sm btn-outline-info me-2"
                      onClick={() => checkCitation(citation)}
                      disabled={checkingCitation === citation.number}
                    >
                      {checkingCitation === citation.number ? '...' : 'Check'}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => toggleCitationExpansion(citation.number)}
                    >
                      {expandedCitations[citation.number] ? '▼' : '►'}
                    </button>
                  </div>
                </div>
                
                <div className="card-body py-2">
                  <p className="small mb-2"><strong>APA:</strong> {citation.apa}</p>
                  
                  {citation.categories && citation.categories.length > 0 && (
                    <p className="small mb-2">
                      <strong>Categories:</strong> {citation.categories.join(', ')}
                    </p>
                  )}
                  
                  {citationChecks[citation.number] && (
                    <div className="alert alert-sm py-1 px-2 mb-2" 
                         style={{
                           backgroundColor: 
                             citationChecks[citation.number].status === 'valid' ? '#d1edff' :
                             citationChecks[citation.number].status === 'partial' ? '#fff3cd' :
                             citationChecks[citation.number].status === 'invalid' ? '#f8d7da' : '#f8f9fa'
                         }}>
                      <div className="d-flex justify-content-between align-items-start">
                        <small>{citationChecks[citation.number].explanation}</small>
                      </div>
                      {citationChecks[citation.number].link && (
                        <div className="mt-1">
                          <a 
                            href={citationChecks[citation.number].link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="small"
                          >
                            Access Article Online
                          </a>
                        </div>
                      )}
                      {!citationChecks[citation.number].link && citationChecks[citation.number].status !== 'error' && (
                        <small className="text-muted d-block mt-1">No link found</small>
                      )}
                    </div>
                  )}
                  
                  {expandedCitations[citation.number] && (
                    <div className="mt-2 pt-2 border-top">
                      <div className="row">
                        <div className="col-12 mb-2">
                          <small><strong>Section:</strong> {citation.sectionTitle}</small>
                        </div>
                        <div className="col-12 mb-2">
                          <small><strong>Subsection:</strong> {citation.subsectionTitle}</small>
                        </div>
                        <div className="col-12 mb-2">
                          <small><strong>Question:</strong> {citation.question}</small>
                        </div>
                        {citation.description && (
                          <div className="col-12 mb-2">
                            <small><strong>Description:</strong> {citation.description}</small>
                          </div>
                        )}
                        {citation.methodologyPoints && citation.methodologyPoints.length > 0 && (
                          <div className="col-12 mb-2">
                            <small><strong>Methodology Support:</strong> {citation.methodologyPoints.join(', ')}</small>
                          </div>
                        )}
                        <div className="col-12">
                          <small className="text-muted"><strong>Context:</strong> This supports the thesis directly by providing evidence for "{citation.question}" within the {citation.subsectionTitle} analysis framework.</small>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
                    ))}
                  </div>
                ));
              } else {
                return groupedCitations.ungrouped.map((citation) => (
                  <div key={citation.number} className="card mb-3">
                    <div className="card-header py-2 d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        <strong className="me-2">[{citation.number}]</strong>
                        {citationChecks[citation.number] && getStatusIcon(citationChecks[citation.number].status)}
                        <span className="ms-2 small">{extractAuthor(citation.apa || '')}</span>
                      </div>
                      <div className="d-flex align-items-center">
                        <button
                          className="btn btn-sm btn-outline-info me-2"
                          onClick={() => checkCitation(citation)}
                          disabled={checkingCitation === citation.number}
                        >
                          {checkingCitation === citation.number ? '...' : 'Check'}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => toggleCitationExpansion(citation.number)}
                        >
                          {expandedCitations[citation.number] ? '▼' : '►'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="card-body py-2">
                      <p className="small mb-2"><strong>APA:</strong> {citation.apa}</p>
                      
                      {citation.categories && citation.categories.length > 0 && (
                        <div className="mb-2">
                          {citation.categories.map((category, idx) => (
                            <span key={idx} className="badge bg-secondary me-1 small">{category}</span>
                          ))}
                        </div>
                      )}
                      
                      {citationChecks[citation.number] && (
                        <div className="mt-2 p-2 bg-light rounded">
                          <div className="d-flex justify-content-between align-items-start">
                            <div className="flex-grow-1">
                              <small className="fw-bold d-block">Validation Status: </small>
                              <small className={`d-block ${citationChecks[citation.number].status === 'valid' ? 'text-success' : 
                                citationChecks[citation.number].status === 'partial' ? 'text-warning' : 'text-danger'}`}>
                                {citationChecks[citation.number].summary || 'No summary available'}
                              </small>
                            </div>
                          </div>
                          
                          {citationChecks[citation.number].analysis && (
                            <div className="mt-2">
                              <div className="row">
                                <div className="col-6">
                                  <small className="fw-bold">Format:</small>
                                  <small className={`d-block ${citationChecks[citation.number].analysis.format_correct ? 'text-success' : 'text-danger'}`}>
                                    {citationChecks[citation.number].analysis.format_correct ? '✓ Correct' : '✗ Issues found'}
                                  </small>
                                </div>
                                <div className="col-6">
                                  <small className="fw-bold">Credibility:</small>
                                  <small className={`d-block ${citationChecks[citation.number].analysis.source_credible ? 'text-success' : 'text-warning'}`}>
                                    {citationChecks[citation.number].analysis.source_credible ? '✓ Credible' : '⚠ Check source'}
                                  </small>
                                </div>
                                <div className="col-6">
                                  <small className="fw-bold">Relevance:</small>
                                  <small className={`d-block ${citationChecks[citation.number].analysis.content_relevant ? 'text-success' : 'text-warning'}`}>
                                    {citationChecks[citation.number].analysis.content_relevant ? '✓ Relevant' : '⚠ May not be relevant'}
                                  </small>
                                </div>
                                <div className="col-6">
                                  <small className="fw-bold">Accessibility:</small>
                                  <small className={`d-block ${citationChecks[citation.number].analysis.accessible ? 'text-success' : 'text-warning'}`}>
                                    {citationChecks[citation.number].analysis.accessible ? '✓ Accessible' : '⚠ Check access'}
                                  </small>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {citationChecks[citation.number].link && (
                            <div className="mt-2">
                              <a 
                                href={citationChecks[citation.number].link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-primary"
                              >
                                Access Article Online
                              </a>
                            </div>
                          )}
                          {!citationChecks[citation.number].link && citationChecks[citation.number].status !== 'error' && (
                            <small className="text-muted d-block mt-1">No link found</small>
                          )}
                        </div>
                      )}
                      
                      {expandedCitations[citation.number] && (
                        <div className="mt-2 pt-2 border-top">
                          <div className="row">
                            <div className="col-12 mb-2">
                              <small><strong>Section:</strong> {citation.sectionTitle}</small>
                            </div>
                            <div className="col-12 mb-2">
                              <small><strong>Subsection:</strong> {citation.subsectionTitle}</small>
                            </div>
                            <div className="col-12 mb-2">
                              <small><strong>Question:</strong> {citation.question}</small>
                            </div>
                            {citation.description && (
                              <div className="col-12 mb-2">
                                <small><strong>Description:</strong> {citation.description}</small>
                              </div>
                            )}
                            {citation.methodologyPoints && citation.methodologyPoints.length > 0 && (
                              <div className="col-12 mb-2">
                                <small><strong>Methodology Support:</strong> {citation.methodologyPoints.join(', ')}</small>
                              </div>
                            )}
                            <div className="col-12">
                              <small className="text-muted"><strong>Context:</strong> This supports the thesis directly by providing evidence for "{citation.question}" within the {citation.subsectionTitle} analysis framework.</small>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ));
              }
            })()
          )}
        </div>
      </div>
    </div>
  );
};

export default CitationsPanel;