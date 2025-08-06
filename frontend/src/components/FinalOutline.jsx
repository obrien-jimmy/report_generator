import { useState } from 'react';
import {
  FaDownload, FaEdit, FaEye, FaEyeSlash, FaStickyNote, FaMagic,
  FaListOl, FaParagraph, FaRandom, FaChevronDown, FaChevronRight
} from 'react-icons/fa';
import FinalOutlineModal from './FinalOutlineModal';
import './FinalOutline.css';

// Outline numbering helpers
const romanNumeral = n => ['I','II','III','IV','V','VI','VII','VIII','IX','X'][n] || n+1;
const alpha = n => String.fromCharCode(65 + n);
const lowerAlpha = n => String.fromCharCode(97 + n);
const roman = n => ['i','ii','iii','iv','v','vi','vii','viii','ix','x'][n] || n+1;
const parenNum = n => `${n+1})`;
const parenAlpha = n => `${String.fromCharCode(97 + n)})`;

const getNumberForLevel = (level, idx) => {
  switch (level) {
    case 1: return `${romanNumeral(idx)}.`;
    case 2: return `${alpha(idx)}.`;
    case 3: return `${idx + 1}.`;
    case 4: return `${lowerAlpha(idx)}.`;
    case 5: return `${roman(idx)}.`;
    case 6: return parenNum(idx);
    case 7: return parenAlpha(idx);
    default: return '';
  }
};

const FinalOutline = ({ draftData, finalThesis, methodology, onEditOutline }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [level, setLevel] = useState(7); // Show all levels by default
  const [expandedSections, setExpandedSections] = useState({});
  const [noteModal, setNoteModal] = useState({ show: false, note: '' });
  const [showTransitions, setShowTransitions] = useState(false);
  const [methodologyText, setMethodologyText] = useState('');
  const [conclusionText, setConclusionText] = useState('');
  const [abstractText, setAbstractText] = useState('');
  const [transitions, setTransitions] = useState({});
  const [refinedOutline, setRefinedOutline] = useState('');
  const [refinedOutlineSections, setRefinedOutlineSections] = useState([]); // [{sectionTitle, subsections: [{subsectionTitle, text}]}]
  const [refining, setRefining] = useState(false);
  const [refineProgress, setRefineProgress] = useState({section: null, subsection: null, idx: 0, total: 0});
  const [showRefined, setShowRefined] = useState(false);
  const [hoveredCitation, setHoveredCitation] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  // Level selector options
  const levelOptions = [
    { label: 'Level 1 (I, II, ...)', value: 1 },
    { label: 'Level 2 (A, B, ...)', value: 2 },
    { label: 'Level 3 (1, 2, ...)', value: 3 },
    { label: 'Level 4 (a, b, ...)', value: 4 },
    { label: 'Level 5 (i, ii, ...)', value: 5 },
    { label: 'Level 6 (1), 2), ...)', value: 6 },
    { label: 'Level 7 (a), b), ...)', value: 7 }
  ];

  // Toggle section expansion
  const toggleSection = idx => setExpandedSections(prev => ({ ...prev, [idx]: !prev[idx] }));

  // Show/hide notes
  const handleShowNote = note => setNoteModal({ show: true, note });
  const handleCloseNote = () => setNoteModal({ show: false, note: '' });

  // Generate Methodology/Conclusion/Abstract/Transitions (calls backend)
  const generateSectionText = async (type) => {
    const res = await fetch(`http://localhost:8000/api/finaloutline/generate_${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outline: draftData.outline,
        responses: getStringResponses(draftData.responses),
        thesis: finalThesis,
        methodology
      })
    });
    const data = await res.json();
    if (type === 'methodology') setMethodologyText(data.text);
    if (type === 'conclusion') setConclusionText(data.text);
    if (type === 'abstract') setAbstractText(data.text);
    if (type === 'transitions') setTransitions(data.transitions);
  };

  // Refine Outline
  const handleRefineOutline = async () => {
    setRefining(true);
    setRefinedOutlineSections([]); // Reset
    const outline = draftData.outline || [];
    const total = outline.reduce((sum, sec) => sum + (sec.subsections?.length || 0), 0);
    let idx = 0;
    const newSections = [];

    for (let sIdx = 0; sIdx < outline.length; sIdx++) {
      const section = outline[sIdx];
      const sectionTitle = section.section_title;
      const newSubsections = [];
      for (let subIdx = 0; subIdx < (section.subsections?.length || 0); subIdx++) {
        const subsection = section.subsections[subIdx];
        const subsectionTitle = subsection.subsection_title;
        // Gather responses for this subsection
        const responsesArr = [];
        for (let qIdx = 0; qIdx < (subsection.questions?.length || 0); qIdx++) {
          const key = `${sIdx}-${subIdx}-${qIdx}`;
          const resp = getStringResponses(draftData.responses)[key];
          if (resp) responsesArr.push(resp);
        }
        idx++;
        setRefineProgress({
          section: sIdx + 1,
          subsection: subIdx + 1,
          idx,
          total
        });
        console.log(`Refining Section ${sIdx + 1} (${sectionTitle}), Subsection ${subIdx + 1} (${subsectionTitle})...`);
        // POST to backend for this subsection
        const safeSectionTitle = sectionTitle || "";
        const safeSubsectionTitle = subsectionTitle || "";
        const safeThesis = finalThesis || "";
        const safeMethodology = typeof methodology === "string" ? methodology : JSON.stringify(methodology || "");
        const safeResponses = Array.isArray(responsesArr) ? responsesArr.map(r => String(r)) : [];

        console.log("Refine subsection payload", {
          section_title: safeSectionTitle,
          subsection_title: safeSubsectionTitle,
          thesis: safeThesis,
          methodology: safeMethodology,
          responses: safeResponses
        });

        const res = await fetch('http://localhost:8000/api/finaloutline/refine_subsection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section_title: safeSectionTitle,
            subsection_title: safeSubsectionTitle,
            thesis: safeThesis,
            methodology: safeMethodology,
            responses: safeResponses
          })
        });
        const data = await res.json();
        newSubsections.push({ subsectionTitle, text: data.text });
        // Update UI live
        setRefinedOutlineSections(prev => {
          const updated = [...prev];
          updated[sIdx] = updated[sIdx] || { sectionTitle, subsections: [] };
          updated[sIdx].subsections = [...(updated[sIdx].subsections || [])];
          updated[sIdx].subsections[subIdx] = { subsectionTitle, text: data.text };
          return updated;
        });
      }
      newSections[sIdx] = { sectionTitle, subsections: newSubsections };
    }
    setRefining(false);
    setRefinedOutlineSections(newSections);
    setRefineProgress({section: null, subsection: null, idx: total, total});
  };

  // Download as text
  const downloadOutline = () => {
    let text = `Thesis: ${finalThesis}\n\n`;
    draftData?.outline?.forEach((section, sIdx) => {
      text += `${romanNumeral(sIdx)}. ${section.section_title}\n`;
      section.subsections?.forEach((sub, subIdx) => {
        text += `  ${alpha(subIdx)}. ${sub.subsection_title}\n`;
        sub.questions?.forEach((q, qIdx) => {
          const key = `${sIdx}-${subIdx}-${qIdx}`;
          const resp = getStringResponses(draftData.responses)[key];
          if (resp) text += `    ${qIdx + 1}. ${resp}\n`;
        });
      });
    });
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'final-outline.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper to convert responses to Dict[str, str] - ONLY uses fused/master responses
  function getStringResponses(responses) {
    const stringResponses = {};
    Object.entries(responses).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // Always use the last response (fused/master outline) if available
        if (value.length > 0) {
          const fusedResponse = value[value.length - 1]; // Last response is always fused
          stringResponses[key] = typeof fusedResponse === 'string' ? fusedResponse : String(fusedResponse);
        } else {
          stringResponses[key] = '';
        }
      } else if (typeof value === 'object' && value.raw) {
        stringResponses[key] = value.raw;
      } else {
        stringResponses[key] = String(value);
      }
    });
    return stringResponses;
  }

  // Parse fused response content into hierarchical structure
  function parseFusedResponseContent(responseText) {
    if (!responseText) return [];
    
    const lines = responseText.split('\n').filter(line => line.trim());
    const parsedContent = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Match different level patterns: 1., a., i., 1), a), i)
      const level3Match = trimmed.match(/^(\d+)\.\s*(.+)$/); // 1., 2., 3.
      const level4Match = trimmed.match(/^([a-z])\.\s*(.+)$/); // a., b., c.
      const level5Match = trimmed.match(/^([ivx]+)\.\s*(.+)$/); // i., ii., iii.
      const level6Match = trimmed.match(/^(\d+)\)\s*(.+)$/); // 1), 2), 3)
      const level7Match = trimmed.match(/^([a-z])\)\s*(.+)$/); // a), b), c)
      
      if (level3Match) {
        parsedContent.push({ level: 3, number: level3Match[1], content: level3Match[2] });
      } else if (level4Match) {
        parsedContent.push({ level: 4, number: level4Match[1], content: level4Match[2] });
      } else if (level5Match) {
        parsedContent.push({ level: 5, number: level5Match[1], content: level5Match[2] });
      } else if (level6Match) {
        parsedContent.push({ level: 6, number: level6Match[1], content: level6Match[2] });
      } else if (level7Match) {
        parsedContent.push({ level: 7, number: level7Match[1], content: level7Match[2] });
      } else {
        // If no level indicator found, treat as continuation of previous level or level 3
        parsedContent.push({ level: 3, number: '', content: trimmed });
      }
    }
    
    return parsedContent;
  }

  // Extract reference numbers from response text
  function extractReferenceNumbers(responseText) {
    if (!responseText) return [];
    
    // Match patterns like [1] or [1, 2, 3]
    const referencePattern = /\[(\d+(?:,\s*\d+)*)\]/g;
    const references = [];
    let match;
    
    while ((match = referencePattern.exec(responseText)) !== null) {
      const refNumbers = match[1].split(/,\s*/).map(num => parseInt(num.trim()));
      references.push(...refNumbers);
    }
    
    return [...new Set(references)].sort((a, b) => a - b); // Remove duplicates and sort
  }

  // Build a comprehensive reference index from all responses
  function buildReferenceIndex() {
    const allReferences = new Set();
    
    if (draftData?.responses) {
      Object.values(draftData.responses).forEach(responseArray => {
        if (Array.isArray(responseArray)) {
          responseArray.forEach(response => {
            const refs = extractReferenceNumbers(response);
            refs.forEach(ref => allReferences.add(ref));
          });
        }
      });
    }
    
    return Array.from(allReferences).sort((a, b) => a - b);
  }

  // Build citation mapping from draftData
  function buildCitationMapping() {
    const citationMap = {};
    
    if (draftData?.citationReferenceMap) {
      Object.values(draftData.citationReferenceMap).forEach(questionRefs => {
        Object.values(questionRefs).forEach(refInfo => {
          if (refInfo.referenceNumber && refInfo.citation) {
            citationMap[refInfo.referenceNumber] = refInfo.citation;
          }
        });
      });
    }
    
    return citationMap;
  }

  // Render text with hoverable citations
  function renderTextWithCitations(text, citationMap) {
    if (!text) return text;
    
    // Replace [1], [2], etc. with hoverable elements
    const parts = text.split(/(\[\d+(?:,\s*\d+)*\])/g);
    
    return parts.map((part, index) => {
      const citationMatch = part.match(/^\[(\d+(?:,\s*\d+)*)\]$/);
      if (citationMatch) {
        const refNumbers = citationMatch[1].split(/,\s*/).map(num => parseInt(num.trim()));
        const citations = refNumbers.map(num => citationMap[num]).filter(Boolean);
        
        return (
          <span
            key={index}
            style={{
              color: '#0dcaf0',
              fontWeight: 'bold',
              cursor: 'pointer',
              backgroundColor: '#e7f7fb',
              borderRadius: '3px',
              padding: '1px 4px',
              fontSize: '0.9em'
            }}
            onMouseEnter={(e) => {
              if (citations.length > 0) {
                setHoveredCitation(citations);
                setHoverPosition({ x: e.clientX, y: e.clientY });
              }
            }}
            onMouseLeave={() => {
              setHoveredCitation(null);
            }}
          >
            [{refNumbers.join(', ')}]
          </span>
        );
      }
      return part;
    });
  }

  // Build citation mapping for this render
  const citationMapping = buildCitationMapping();

  // Render outline recursively (with continuous numbering and notes)
  const renderOutline = () => (
    <div className="final-outline-content">
      <div style={{ fontWeight: 'bold', marginBottom: '1rem' }}>
        Thesis: <span style={{ fontWeight: 'normal' }}>{finalThesis}</span>
      </div>
      {draftData.outline?.map((section, sIdx) => {
        if (level < 1) return null;
        const secNum = romanNumeral(sIdx);
        return (
          <div key={sIdx} className="final-outline-section">
            <div className="final-outline-section-header">
              <span className="final-outline-section-num">{secNum}.</span>
              <span className="final-outline-section-title">{section.section_title}</span>
              {section.note && (
                <FaStickyNote className="final-outline-note-icon" onClick={() => handleShowNote(section.note)} />
              )}
              <button className="final-outline-expand-btn" onClick={() => toggleSection(sIdx)}>
                {expandedSections[sIdx] ? <FaChevronDown /> : <FaChevronRight />}
              </button>
            </div>
            {(expandedSections[sIdx] || level > 1) && section.subsections?.map((sub, subIdx) => {
              if (level < 2) return null;
              const subNum = alpha(subIdx);
              return (
                <div key={subIdx} className="final-outline-subsection">
                  <span className="final-outline-subsection-num">{subNum}.</span>
                  <span className="final-outline-subsection-title">{sub.subsection_title}</span>
                  {sub.note && (
                    <FaStickyNote className="final-outline-note-icon" onClick={() => handleShowNote(sub.note)} />
                  )}
                  {(expandedSections[sIdx] || level > 2) && sub.questions?.map((q, qIdx) => {
                    if (level < 3) return null;
                    const key = `${sIdx}-${subIdx}-${qIdx}`;
                    const rawResponse = getStringResponses(draftData.responses)[key];
                    const parsedContent = parseFusedResponseContent(rawResponse);
                    
                    // Maintain counters for each level to ensure proper numbering
                    const counters = { 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
                    
                    return (
                      <div key={qIdx} className="final-outline-question-section">
                        {parsedContent.map((item, itemIdx) => {
                          if (level < item.level) return null;
                          
                          // Reset lower level counters when we encounter a higher level
                          for (let resetLevel = item.level + 1; resetLevel <= 7; resetLevel++) {
                            counters[resetLevel] = 0;
                          }
                          
                          // Increment counter for current level
                          counters[item.level]++;
                          
                          // Determine the numbering based on the item level and counter
                          let displayNumber = '';
                          switch (item.level) {
                            case 3:
                              displayNumber = `${counters[3]}.`;
                              break;
                            case 4:
                              displayNumber = `${lowerAlpha(counters[4] - 1)}.`;
                              break;
                            case 5:
                              displayNumber = `${roman(counters[5] - 1)}.`;
                              break;
                            case 6:
                              displayNumber = `${counters[6]})`;
                              break;
                            case 7:
                              displayNumber = `${lowerAlpha(counters[7] - 1)})`;
                              break;
                            default:
                              displayNumber = '';
                          }
                          
                          return (
                            <div 
                              key={itemIdx} 
                              className={`final-outline-level-${item.level}`}
                              style={{ 
                                marginBottom: '4px'
                              }}
                            >
                              <span className="final-outline-item-num">{displayNumber}</span>
                              <span className="final-outline-item-text"> {renderTextWithCitations(item.content, citationMapping)}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  if (!draftData) {
    return (
      <div className="text-center py-5">
        <h4>No outline data available</h4>
        <p className="text-muted">Please complete the Outline Draft first.</p>
      </div>
    );
  }

  return (
    <div className="final-outline">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>Final Outline</h3>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <FaEye /> : <FaEyeSlash />} {collapsed ? ' Show' : ' Hide'}
          </button>
          <button className="btn btn-primary" onClick={downloadOutline}>
            Download Outline
          </button>
          <button className="btn btn-outline-info" onClick={onEditOutline}>
            <FaEdit className="me-1" /> Edit
          </button>
        </div>
      </div>

      {/* Level selector */}
      <div className="mb-3 d-flex gap-2 align-items-center">
        <span>Show Levels:</span>
        {levelOptions.map(opt => (
          <button
            key={opt.value}
            className={`btn btn-sm ${level === opt.value ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setLevel(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Generate buttons */}
      <div className="mb-3 d-flex gap-2 align-items-center">
        <button
          className="btn btn-outline-secondary"
          onClick={handleRefineOutline}
          disabled={refining}
        >
          {refining ? 'Refining...' : 'Refine Outline'}
        </button>
        <button className="btn btn-outline-secondary" onClick={() => generateSectionText('methodology')}>
          Generate Methodology
        </button>
        <button className="btn btn-outline-secondary" onClick={() => generateSectionText('conclusion')}>
          Generate Conclusion
        </button>
        <button className="btn btn-outline-secondary" onClick={() => generateSectionText('abstract')}>
          Generate Abstract
        </button>
        <button className="btn btn-outline-secondary" onClick={() => { generateSectionText('transitions'); setShowTransitions(true); }}>
          Generate Transitions
        </button>
        {showTransitions && (
          <button className="btn btn-outline-info" onClick={() => setShowTransitions(false)}>
            Hide Transitions
          </button>
        )}
      </div>

      {/* Methodology, Conclusion, Abstract, Transitions */}
      {methodologyText && (
        <div className="alert alert-info"><strong>Methodology:</strong> {methodologyText}</div>
      )}
      {conclusionText && (
        <div className="alert alert-success"><strong>Conclusion:</strong> {conclusionText}</div>
      )}
      {abstractText && (
        <div className="alert alert-warning"><strong>Abstract:</strong> {abstractText}</div>
      )}
      {showTransitions && transitions && (
        <div className="alert alert-secondary">
          <strong>Transitions:</strong>
          <ul>
            {Object.entries(transitions).map(([key, value]) => (
              <li key={key}><strong>{key}:</strong> {value}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Refined Outline toggle */}
      <div className="mb-3 d-flex gap-2 align-items-center">
        <button
          className={`btn btn-sm ${showRefined ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setShowRefined(!showRefined)}
        >
          {showRefined ? 'Show Raw Outline' : 'Show Refined Outline'}
        </button>
      </div>

      {/* Outline display */}
      {showRefined ? (
        <div className="card mb-4">
          <div className="card-body">
            <div style={{ fontFamily: 'monospace', fontSize: '1rem', whiteSpace: 'pre-wrap' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '1rem' }}>
                Thesis: <span style={{ fontWeight: 'normal' }}>{finalThesis}</span>
              </div>
              {draftData.outline?.map((section, sIdx) => (
                <div key={sIdx}>
                  <div style={{ fontWeight: 'bold' }}>{romanNumeral(sIdx)}. {section.section_title}</div>
                  {section.subsections?.map((sub, subIdx) => {
                    const refinedSub = refinedOutlineSections[sIdx]?.subsections?.[subIdx]?.text;
                    const isCurrent =
                      refining &&
                      refineProgress.section === sIdx + 1 &&
                      refineProgress.subsection === subIdx + 1;

                    return (
                      <div key={subIdx} style={{ marginLeft: 16 }}>
                        <div style={{ fontWeight: 'bold' }}>{alpha(subIdx)}. {sub.subsection_title}</div>
                        <div style={{ marginLeft: 16, color: '#888' }}>
                          {refinedSub !== undefined
                            ? refinedSub || <span style={{ color: '#aaa' }}>No details yet.</span>
                            : isCurrent
                              ? <span className="generating-outline-pulse">Generating Outline...</span>
                              : <span style={{ color: '#aaa' }}>Pending...</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            {refining && (
              <div className="progress mb-2" style={{ height: 6 }}>
                <div
                  className="progress-bar progress-bar-striped progress-bar-animated bg-info"
                  role="progressbar"
                  style={{
                    width: `${Math.round((refineProgress.idx / refineProgress.total) * 100)}%`
                  }}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        !collapsed && renderOutline()
      )}

      {/* Notes Modal */}
      <FinalOutlineModal show={noteModal.show} onClose={handleCloseNote} note={noteModal.note} />
      
      {/* Reference Index */}
      {!collapsed && (
        <div className="mt-4">
          <h5>Reference Index</h5>
          <div className="card">
            <div className="card-body">
              {buildReferenceIndex().length > 0 ? (
                <div style={{ fontSize: '0.9em' }}>
                  {buildReferenceIndex().map(refId => (
                    <div key={refId} style={{ marginBottom: '4px' }}>
                      <strong>#{refId}:</strong> <em>Citation reference tracked throughout outline</em>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No references found in outline responses.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinalOutline;