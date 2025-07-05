import { useState } from 'react';
import axios from 'axios';
import { FaQuestionCircle } from 'react-icons/fa';

const ThesisRefinement = ({ onFinalize, selectedPaperType }) => {
  const [initialThesis, setInitialThesis] = useState('');
  const [refinedThesis, setRefinedThesis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [finalized, setFinalized] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  
  // Probing questions state
  const [showProbingQuestions, setShowProbingQuestions] = useState(false);
  const [probingQuestions, setProbingQuestions] = useState([]);
  const [probingAnswers, setProbingAnswers] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [processingAnswers, setProcessingAnswers] = useState(false);

  const handleRefineThesis = async () => {
    if (!initialThesis.trim()) {
      alert('Please enter a thesis statement to refine.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const res = await axios.post('http://localhost:8000/auto_refine_thesis', {
        thesis: initialThesis,
        paper_type: selectedPaperType?.name || 'General Paper',
        paper_purpose: selectedPaperType?.purpose || 'To present information and analysis',
        paper_tone: selectedPaperType?.tone || 'Academic, objective',
        paper_structure: selectedPaperType?.structure || 'Introduction → Body → Conclusion'
      });

      setRefinedThesis(res.data.refined_thesis);
    } catch (err) {
      console.error('Thesis refinement error:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to refine thesis.');
    }
    setLoading(false);
  };

  const handleGenerateProbingQuestions = async () => {
    if (!initialThesis.trim()) {
      alert('Please enter a thesis statement first.');
      return;
    }

    setLoadingQuestions(true);
    setError(null);
    
    try {
      const res = await axios.post('http://localhost:8000/generate_probing_questions', {
        thesis: initialThesis,
        paper_type: selectedPaperType?.name || 'General Paper',
        paper_purpose: selectedPaperType?.purpose || 'To present information and analysis',
        paper_tone: selectedPaperType?.tone || 'Academic, objective'
      });

      setProbingQuestions(res.data.questions);
      setProbingAnswers(new Array(res.data.questions.length).fill(''));
      setShowProbingQuestions(true);
    } catch (err) {
      console.error('Probing questions error:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to generate probing questions.');
    }
    setLoadingQuestions(false);
  };

  const handleAnswerChange = (index, value) => {
    const newAnswers = [...probingAnswers];
    newAnswers[index] = value;
    setProbingAnswers(newAnswers);
  };

  const handleSubmitAnswers = async () => {
    setProcessingAnswers(true);
    setError(null);
    
    try {
      const res = await axios.post('http://localhost:8000/answer_probing_questions', {
        thesis: initialThesis,
        questions: probingQuestions,
        answers: probingAnswers,
        paper_type: selectedPaperType?.name || 'General Paper',
        paper_purpose: selectedPaperType?.purpose || 'To present information and analysis',
        paper_tone: selectedPaperType?.tone || 'Academic, objective'
      });

      setRefinedThesis(res.data.refined_thesis);
      setShowProbingQuestions(false);
    } catch (err) {
      console.error('Answer processing error:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to process answers.');
    }
    setProcessingAnswers(false);
  };

  const handleCancelProbing = () => {
    setShowProbingQuestions(false);
    setProbingQuestions([]);
    setProbingAnswers([]);
  };

  const handleFinalize = () => {
    if (!refinedThesis.trim()) {
      alert('Please refine your thesis before finalizing.');
      return;
    }
    
    setFinalized(true);
    setCollapsed(true);
    onFinalize(refinedThesis);
  };

  const handleEdit = () => {
    if (finalized) {
      alert("Warning: Editing the thesis at this point will NOT modify any research outputs already generated unless subsequent sections are rerun.");
    }
    setFinalized(false);
    setCollapsed(false);
  };

  const toggleCollapse = () => setCollapsed(prev => !prev);

  const answeredQuestionsCount = probingAnswers.filter(answer => answer.trim()).length;

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
        Thesis Refinement
        {finalized && (
          <small className="text-muted ms-2">(Finalized)</small>
        )}
      </h3>

      {!collapsed && (
        <>
          {selectedPaperType && (
            <div className="alert alert-info mb-3">
              <strong>Paper Type:</strong> {selectedPaperType.name}
              <br />
              <small><strong>Purpose:</strong> {selectedPaperType.purpose}</small>
              <br />
              <small><strong>Tone:</strong> {selectedPaperType.tone}</small>
            </div>
          )}

          {!finalized ? (
            <>
              <div className="mb-3">
                <label htmlFor="initialThesis" className="form-label">
                  Enter your initial thesis or topic:
                </label>
                <textarea
                  id="initialThesis"
                  className="form-control"
                  rows={3}
                  placeholder={`Enter your ${selectedPaperType?.name.toLowerCase() || 'paper'} thesis or main topic here...`}
                  value={initialThesis}
                  onChange={(e) => setInitialThesis(e.target.value)}
                />
              </div>

              {error && (
                <div className="alert alert-danger">
                  <p>{error}</p>
                </div>
              )}

              {/* Probing Questions Section */}
              {showProbingQuestions && (
                <div className="card p-3 mb-3">
                  <h5><FaQuestionCircle className="me-2" />Probing Questions</h5>
                  <p className="text-muted mb-3">
                    Answer any questions that help clarify your thesis. You can skip questions that don't apply.
                  </p>
                  
                  {probingQuestions.map((question, index) => (
                    <div key={index} className="mb-3">
                      <label className="form-label">
                        <strong>Question {index + 1}:</strong> {question}
                      </label>
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder="Your answer (optional)..."
                        value={probingAnswers[index]}
                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                      />
                    </div>
                  ))}

                  <div className="d-flex gap-2 mt-3">
                    <button
                      className="btn btn-primary"
                      onClick={handleSubmitAnswers}
                      disabled={processingAnswers}
                    >
                      {processingAnswers ? 'Processing...' : `Submit Answers (${answeredQuestionsCount} answered)`}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={handleCancelProbing}
                      disabled={processingAnswers}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {refinedThesis && (
                <div className="card p-3 mb-3">
                  <h5>Refined Thesis:</h5>
                  <div className="mb-3">
                    <textarea
                      className="form-control"
                      rows={4}
                      value={refinedThesis}
                      onChange={(e) => setRefinedThesis(e.target.value)}
                      placeholder="Your refined thesis will appear here..."
                    />
                  </div>
                  <small className="text-muted">
                    This thesis has been refined to align with the {selectedPaperType?.name} format and purpose.
                    You can edit it above if needed.
                  </small>
                </div>
              )}

              <div className="mt-3 d-flex gap-2">
                <button
                  className="btn btn-secondary"
                  onClick={handleRefineThesis}
                  disabled={loading || !initialThesis.trim()}
                >
                  {loading ? 'Refining...' : `Auto-Refine for ${selectedPaperType?.name || 'Paper'}`}
                </button>

                <button
                  className="btn btn-outline-secondary"
                  onClick={handleGenerateProbingQuestions}
                  disabled={loadingQuestions || !initialThesis.trim() || showProbingQuestions}
                >
                  <FaQuestionCircle className="me-1" />
                  {loadingQuestions ? 'Generating...' : 'Ask Probing Questions'}
                </button>

                <button
                  className="btn btn-primary"
                  onClick={handleFinalize}
                  disabled={!refinedThesis.trim()}
                >
                  Finalize Thesis
                </button>
              </div>
            </>
          ) : (
            <div className="mt-3">
              <div className="alert alert-success">
                <strong>Finalized Thesis:</strong>
                <div className="mt-2">
                  {refinedThesis}
                </div>
                <div className="mt-2">
                  <small className="text-muted">
                    Optimized for: {selectedPaperType?.name}
                  </small>
                </div>
              </div>
              <button
                className="btn btn-secondary"
                onClick={handleEdit}
              >
                Edit Thesis
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ThesisRefinement;
