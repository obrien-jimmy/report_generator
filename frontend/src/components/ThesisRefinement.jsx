import { useState } from 'react';
import axios from 'axios';

const ThesisRefinement = ({ onFinalize }) => {
  const [topic, setTopic] = useState('');
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [hasFinalizedOnce, setHasFinalizedOnce] = useState(false);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:8000/ai-response', {
        prompt: `List 3-6 clarifying questions for: "${topic}".`,
      });
      const aiQuestions = res.data.response
        .split('\n')
        .filter((line) => /^\d+\./.test(line))
        .map((line) => line.replace(/^\d+\.\s*/, '').trim());

      setQuestions(aiQuestions);
      setResponses({});
    } catch {
      alert('Failed to fetch questions.');
    }
    setLoading(false);
  };

  const handleRefineThesis = async () => {
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:8000/refine_thesis', {
        current_topic: topic,
        user_responses: questions.map((_, idx) => responses[idx] || ''),
      });

      setTopic(res.data.refined_thesis);
      setQuestions([]);
      setResponses({});
    } catch {
      alert('Failed to refine thesis.');
    }
    setLoading(false);
  };

  const handleAutoRefineThesis = async () => {
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:8000/auto_refine_thesis', {
        thesis: topic,
      });

      setTopic(res.data.refined_thesis);
      setQuestions([]);
      setResponses({});
    } catch {
      alert('Failed to auto-refine thesis.');
    }
    setLoading(false);
  };

  const handleFinalize = () => {
    if (topic.trim()) {
      setIsFinalized(true);
      if (!hasFinalizedOnce) {
        onFinalize(topic);
        setHasFinalizedOnce(true);
      }
    } else {
      alert("Please enter a thesis before finalizing.");
    }
  };

  const handleEditThesis = () => {
    alert("Any changes made now won't modify existing research outputs below.");
    setIsFinalized(false);
  };

  const handleCancelQuestions = () => {
    setQuestions([]);
    setResponses({});
  };

  return (
    <div className="w-100">
      <h3>Thesis Refinement</h3>

      {isFinalized ? (
        <div className="mt-3">
          <p>
            <strong>Final Thesis:</strong> {topic}
          </p>
        </div>
      ) : (
        <textarea
          className="form-control"
          placeholder="Enter your thesis/topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
      )}

      {!isFinalized && questions.length === 0 && (
        <div className="mt-3">
          <button
            className="btn btn-secondary"
            onClick={fetchQuestions}
            disabled={loading || !topic}
          >
            {loading ? 'Generating...' : 'Thesis Refinement Questions'}
          </button>
          <button
            className="btn btn-secondary ms-2"
            onClick={handleAutoRefineThesis}
            disabled={loading || !topic}
          >
            {loading ? 'Refining...' : 'Auto-Refine Thesis'}
          </button>
          <button
            className="btn btn-primary ms-2"
            onClick={handleFinalize}
          >
            Finalize Thesis
          </button>
        </div>
      )}

      {!isFinalized && questions.length > 0 && (
        <>
          {questions.map((q, idx) => (
            <div key={idx} className="mt-3">
              <strong>{q}</strong>
              <textarea
                className="form-control mt-2"
                value={responses[idx] || ''}
                onChange={(e) => setResponses({ ...responses, [idx]: e.target.value })}
              />
            </div>
          ))}
          <div className="mt-3">
            <button
              className="btn btn-secondary me-2"
              onClick={handleCancelQuestions}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleRefineThesis}
              disabled={loading}
            >
              {loading ? 'Refining...' : 'Refine Thesis'}
            </button>
          </div>
        </>
      )}

      {isFinalized && (
        <div className="mt-3">
          <button
            className="btn btn-secondary"
            onClick={handleEditThesis}
          >
            Edit Thesis
          </button>
        </div>
      )}
    </div>
  );
};

export default ThesisRefinement;
