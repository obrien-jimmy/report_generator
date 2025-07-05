import { useState } from 'react';

const PaperTypeSelector = ({ onPaperTypeSelected }) => {
  const [selectedType, setSelectedType] = useState('');
  const [finalized, setFinalized] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const paperTypes = [
    {
      id: 'argumentative',
      name: 'Argumentative Paper',
      purpose: 'To prove a specific policy position or strategic recommendation using evidence and reasoning.',
      structure: 'Introduction with thesis → Body paragraphs with claims and evidence → Counterarguments → Conclusion.',
      tone: 'Persuasive, assertive, evidence-based.',
      example: 'The U.S. should increase defense spending in the Indo-Pacific region to counter Chinese military expansion.'
    },
    {
      id: 'analytical',
      name: 'Analytical Paper',
      purpose: 'To break down a security issue, policy, or strategic situation into component parts for better understanding.',
      structure: 'Introduction → Analytical breakdown → Supporting evidence → Conclusion.',
      tone: 'Objective, methodical.',
      example: 'A structural analysis of Russia\'s hybrid warfare tactics in Eastern Europe.'
    },
    {
      id: 'expository',
      name: 'Expository Paper',
      purpose: 'To explain or inform about a topic in a neutral, factual way for briefing purposes.',
      structure: 'Introduction → Explanation with supporting facts → Conclusion.',
      tone: 'Informative, clear, objective.',
      example: 'How cyber attribution works in national security investigations.'
    },
    {
      id: 'narrative',
      name: 'Narrative Paper',
      purpose: 'To recount historical events, operational experiences, or case studies chronologically.',
      structure: 'Chronological or thematic → Often with key turning points or lessons learned.',
      tone: 'Descriptive, factual, reflective.',
      example: 'The timeline of events leading to the fall of Kabul in August 2021.'
    },
    {
      id: 'descriptive',
      name: 'Descriptive Paper',
      purpose: 'To paint a detailed picture of a security situation, operational environment, or strategic landscape.',
      structure: 'Loosely structured; often thematic or geographical.',
      tone: 'Detailed, comprehensive.',
      example: 'Current security conditions in the Sahel region of Africa.'
    },
    {
      id: 'compare_contrast',
      name: 'Compare and Contrast Paper',
      purpose: 'To analyze similarities and/or differences between military doctrines, policies, or strategic approaches.',
      structure: 'Block (Subject A → Subject B) or Point-by-Point (Theme 1 → Theme 2, etc.).',
      tone: 'Objective or persuasive depending on intent.',
      example: 'Comparing NATO and Russian military doctrine in conventional warfare.'
    },
    {
      id: 'cause_effect',
      name: 'Cause and Effect Paper',
      purpose: 'To explore reasons behind geopolitical events or the consequences of policy decisions.',
      structure: 'Cause → Effect or Effect → Causes.',
      tone: 'Logical, analytical.',
      example: 'The effects of economic sanctions on Iranian nuclear program compliance.'
    },
    {
      id: 'definition',
      name: 'Definition Paper',
      purpose: 'To explain the meaning of strategic concepts, doctrines, or emerging security terms.',
      structure: 'Introduction → Definitions → Examples or contexts → Conclusion.',
      tone: 'Clarifying, explorative.',
      example: 'What constitutes "gray zone" operations in modern warfare?'
    },
    {
      id: 'exploratory',
      name: 'Exploratory Paper (Open-ended)',
      purpose: 'To investigate emerging security issues or policy questions without predetermined conclusions.',
      structure: 'Introduction → Background → Exploration of different views → Reflection or tentative conclusion.',
      tone: 'Inquisitive, balanced, thoughtful.',
      example: 'What are the strategic implications of artificial intelligence in military operations?'
    },
    {
      id: 'reflective',
      name: 'Reflective Paper',
      purpose: 'To reflect on operational experiences, policy outcomes, or strategic lessons learned.',
      structure: 'Experience/event → Analysis → Lessons learned or policy implications.',
      tone: 'Thoughtful, introspective, analytical.',
      example: 'Lessons learned from the U.S. withdrawal from Afghanistan for future operations.'
    },
    {
      id: 'synthesis',
      name: 'Synthesis Paper',
      purpose: 'To combine intelligence from multiple sources to form a cohesive threat assessment or policy recommendation.',
      structure: 'Thematic organization combining evidence from various intelligence sources.',
      tone: 'Analytical and integrative.',
      example: 'Synthesizing open-source intelligence on North Korean missile capabilities.'
    },
    {
      id: 'research',
      name: 'Research Paper',
      purpose: 'To present original research or compile existing analysis on a specific security question.',
      structure: 'Abstract → Introduction → Methodology → Findings → Discussion → Conclusion → References.',
      tone: 'Academic, evidence-driven.',
      example: 'A quantitative analysis of defense spending effectiveness across NATO allies.'
    },
    {
      id: 'literature_review',
      name: 'Literature Review',
      purpose: 'To summarize and evaluate existing research on a strategic or policy topic.',
      structure: 'Thematic or chronological organization of sources.',
      tone: 'Scholarly, comprehensive.',
      example: 'A review of recent studies on counterterrorism effectiveness in the Sahel.'
    },
    {
      id: 'critical_review',
      name: 'Critical Review / Critique',
      purpose: 'To evaluate and interpret defense policies, strategic documents, or operational plans.',
      structure: 'Summary of the work → Analysis/critique → Evaluation.',
      tone: 'Analytical and evaluative.',
      example: 'A critical review of the 2022 National Defense Strategy\'s Indo-Pacific focus.'
    },
    {
      id: 'position',
      name: 'Position Paper',
      purpose: 'To take a stance on a controversial policy issue and defend it with evidence.',
      structure: 'Thesis → Evidence → Rebuttals → Conclusion.',
      tone: 'Assertive, persuasive.',
      example: 'The U.S. should maintain strategic ambiguity regarding Taiwan defense commitments.'
    },
    {
      id: 'proposal',
      name: 'Proposal Paper',
      purpose: 'To propose a solution to a security problem or recommend a course of action.',
      structure: 'Problem statement → Proposed solution → Justification → Implementation plan.',
      tone: 'Persuasive and constructive.',
      example: 'A proposal for enhancing cybersecurity cooperation between Five Eyes nations.'
    },
    {
      id: 'concept',
      name: 'Concept Paper',
      purpose: 'To explore emerging strategic concepts or theoretical frameworks for analysis.',
      structure: 'Introduction → Explanation → Possible applications → Conclusion.',
      tone: 'Abstract, theoretical, forward-looking.',
      example: 'The concept of "cognitive warfare" in 21st century conflicts.'
    },
    {
      id: 'response',
      name: 'Response Paper',
      purpose: 'To offer analytical reaction to intelligence reports, policy documents, or strategic assessments.',
      structure: 'Summary → Reaction → Justification or analysis.',
      tone: 'Analytical with supporting evidence.',
      example: 'Response to the latest National Intelligence Estimate on climate security threats.'
    }
  ];

  const handlePaperTypeChange = (e) => {
    setSelectedType(e.target.value);
  };

  const handleProceedToThesis = () => {
    if (!selectedType) {
      alert("Please select a paper type before proceeding.");
      return;
    }
    
    const selectedPaper = paperTypes.find(type => type.id === selectedType);
    setFinalized(true);
    setCollapsed(true);
    onPaperTypeSelected(selectedPaper);
  };

  const handleEditPaperType = () => {
    if (finalized) {
      alert("Warning: Changing the paper type at this point will NOT modify any research outputs already generated unless subsequent sections are rerun.");
    }
    setFinalized(false);
    setCollapsed(false);
  };

  const toggleCollapse = () => setCollapsed(prev => !prev);

  const selectedPaper = paperTypes.find(type => type.id === selectedType);

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

      <h3>
        Paper Type Selection
        {finalized && selectedPaper && (
          <small className="text-muted ms-2">
            ({selectedPaper.name})
          </small>
        )}
      </h3>

      {!collapsed && (
        <>
          {!finalized ? (
            <>
              <div className="mb-3">
                <label htmlFor="paperTypeSelect" className="form-label">
                  Select the type of paper you want to write:
                </label>
                <select
                  id="paperTypeSelect"
                  className="form-select"
                  value={selectedType}
                  onChange={handlePaperTypeChange}
                >
                  <option value="">Choose a paper type...</option>
                  {paperTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPaper && (
                <div className="card p-3 mb-3">
                  <h5>{selectedPaper.name}</h5>
                  <div className="mb-2">
                    <strong>Purpose:</strong> {selectedPaper.purpose}
                  </div>
                  <div className="mb-2">
                    <strong>Structure:</strong> {selectedPaper.structure}
                  </div>
                  <div className="mb-2">
                    <strong>Tone:</strong> {selectedPaper.tone}
                  </div>
                  <div className="mb-2">
                    <strong>Example:</strong> <em>"{selectedPaper.example}"</em>
                  </div>
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={handleProceedToThesis}
                disabled={!selectedType}
              >
                Proceed to Thesis
              </button>
            </>
          ) : (
            <div className="mt-3">
              <div className="alert alert-info">
                <strong>Selected Paper Type:</strong> {selectedPaper.name}
                <div className="mt-2">
                  <small><strong>Purpose:</strong> {selectedPaper.purpose}</small>
                </div>
                <div>
                  <small><strong>Example:</strong> <em>"{selectedPaper.example}"</em></small>
                </div>
              </div>
              <button
                className="btn btn-secondary"
                onClick={handleEditPaperType}
              >
                Edit Paper Type
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PaperTypeSelector;