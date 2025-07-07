import { useState } from 'react';
import { FaDownload, FaEdit, FaEye, FaEyeSlash } from 'react-icons/fa';

const InitialDraft = ({ draftData, finalThesis }) => {
  const [collapsed, setCollapsed] = useState(false);

  const generateFullDraft = () => {
    let fullDraft = `# ${finalThesis}\n\n`;
    
    draftData?.outline?.forEach((section, sectionIndex) => {
      fullDraft += `## ${section.section_title}\n\n`;
      
      section.subsections?.forEach((subsection, subsectionIndex) => {
        fullDraft += `### ${subsection.subsection_title}\n\n`;
        
        subsection.questions?.forEach((question, questionIndex) => {
          const key = `${sectionIndex}-${subsectionIndex}-${questionIndex}`;
          const response = draftData.responses[key];
          
          if (response) {
            fullDraft += `${response}\n\n`;
          }
        });
      });
    });
    
    return fullDraft;
  };

  const downloadDraft = () => {
    const draft = generateFullDraft();
    const blob = new Blob([draft], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'initial-draft.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!draftData) {
    return (
      <div className="text-center py-5">
        <h4>No draft data available</h4>
        <p className="text-muted">Please complete the Outline Draft first.</p>
      </div>
    );
  }

  return (
    <div className="initial-draft">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>Initial Draft</h3>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-secondary"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <FaEye /> : <FaEyeSlash />}
            {collapsed ? ' Show' : ' Hide'}
          </button>
          <button
            className="btn btn-primary"
            onClick={downloadDraft}
          >
            <FaDownload className="me-2" />
            Download Draft
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="card">
          <div className="card-body">
            <div className="draft-content" style={{ 
              fontFamily: 'Times New Roman, serif',
              fontSize: '14px',
              lineHeight: '1.6',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}>
              <h1 className="text-center mb-4">{finalThesis}</h1>
              
              {draftData.outline?.map((section, sectionIndex) => (
                <div key={sectionIndex} className="mb-4">
                  <h2 className="mb-3">{section.section_title}</h2>
                  
                  {section.subsections?.map((subsection, subsectionIndex) => (
                    <div key={subsectionIndex} className="mb-3">
                      <h3 className="mb-2">{subsection.subsection_title}</h3>
                      
                      {subsection.questions?.map((question, questionIndex) => {
                        const key = `${sectionIndex}-${subsectionIndex}-${questionIndex}`;
                        const response = draftData.responses[key];
                        
                        return response ? (
                          <div key={questionIndex} className="mb-3">
                            <p style={{ whiteSpace: 'pre-wrap', textAlign: 'justify' }}>
                              {response}
                            </p>
                          </div>
                        ) : null;
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InitialDraft;