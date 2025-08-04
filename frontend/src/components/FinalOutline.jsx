import { useState } from 'react';
import { FaDownload, FaEdit, FaEye, FaEyeSlash, FaStickyNote, FaMagic, FaListOl, FaParagraph, FaRandom, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import FinalOutlineModal from './FinalOutlineModal';
import './FinalOutline.css';

const romanNumeral = n => ['I','II','III','IV','V','VI','VII','VIII','IX','X'][n] || n+1;
const alpha = n => String.fromCharCode(65 + n);
const lowerAlpha = n => String.fromCharCode(97 + n);

const FinalOutline = ({ draftData, finalThesis, methodology, onEditOutline }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [level, setLevel] = useState(4); // 1=I, 2=A, 3=1, 4=a
  const [expandedSections, setExpandedSections] = useState({});
  const [noteModal, setNoteModal] = useState({ show: false, note: '' });
  const [showTransitions, setShowTransitions] = useState(false);
  const [methodologyText, setMethodologyText] = useState('');
  const [conclusionText, setConclusionText] = useState('');
  const [abstractText, setAbstractText] = useState('');
  const [transitions, setTransitions] = useState({});

  // Helper to toggle section expansion
  const toggleSection = idx => setExpandedSections(prev => ({ ...prev, [idx]: !prev[idx] }));

  // Helper to show notes
  const handleShowNote = note => setNoteModal({ show: true, note });
  const handleCloseNote = () => setNoteModal({ show: false, note: '' });

  // Level selector
  const levelOptions = [
    { label: 'Level 1 (I, II, ...)', value: 1 },
    { label: 'Level 2 (A, B, ...)', value: 2 },
    { label: 'Level 3 (1, 2, ...)', value: 3 },
    { label: 'Level 4 (a, b, ...)', value: 4 }
  ];

  // Generate Methodology/Conclusion/Abstract/Transitions (calls backend)
  const generateSectionText = async (type) => {
    const res = await fetch(`/api/finaloutline/generate_${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outline: draftData.outline,
        responses: draftData.responses,
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

  // Download as text
  const downloadOutline = () => {
    let text = `Thesis: ${finalThesis}\n\n`;
    draftData?.outline?.forEach((section, sIdx) => {
      text += `${romanNumeral(sIdx)}. ${section.section_title}\n`;
      section.subsections?.forEach((sub, subIdx) => {
        text += `  ${alpha(subIdx)}. ${sub.subsection_title}\n`;
        sub.questions?.forEach((q, qIdx) => {
          const key = `${sIdx}-${subIdx}-${qIdx}`;
          const resp = draftData.responses[key];
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

  // Render outline recursively
  const renderOutline = () => (
    <div className="final-outline-content">
      <h1 className="final-outline-thesis">{finalThesis}</h1>
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
                    const qNum = qIdx + 1;
                    const key = `${sIdx}-${subIdx}-${qIdx}`;
                    const resp = draftData.responses[key];
                    return (
                      <div key={qIdx} className="final-outline-question">
                        <span className="final-outline-question-num">{qNum}.</span>
                        <span className="final-outline-question-text">{resp}</span>
                        {q.note && (
                          <FaStickyNote className="final-outline-note-icon" onClick={() => handleShowNote(q.note)} />
                        )}
                        {(expandedSections[sIdx] || level > 3) && q.subpoints?.map((sp, spIdx) => {
                          if (level < 4) return null;
                          const spNum = lowerAlpha(spIdx);
                          return (
                            <div key={spIdx} className="final-outline-subpoint">
                              <span className="final-outline-subpoint-num">{spNum}.</span>
                              <span className="final-outline-subpoint-text">{sp.text}</span>
                              {sp.note && (
                                <FaStickyNote className="final-outline-note-icon" onClick={() => handleShowNote(sp.note)} />
                              )}
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
        <button className="btn btn-outline-secondary" onClick={() => generateSectionText('methodology')}>
          <FaMagic className="me-1" /> Generate Methodology
        </button>
        <button className="btn btn-outline-secondary" onClick={() => generateSectionText('conclusion')}>
          <FaParagraph className="me-1" /> Generate Conclusion
        </button>
        <button className="btn btn-outline-secondary" onClick={() => generateSectionText('abstract')}>
          <FaListOl className="me-1" /> Generate Abstract
        </button>
        <button className="btn btn-outline-secondary" onClick={() => { generateSectionText('transitions'); setShowTransitions(true); }}>
          <FaRandom className="me-1" /> Generate Transitions
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

      {!collapsed && renderOutline()}

      {/* Notes Modal */}
      <FinalOutlineModal show={noteModal.show} onClose={handleCloseNote} note={noteModal.note} />
    </div>
  );
};

export default FinalOutline;