import { useState } from 'react';
import axios from 'axios';
import MethodologyGenerator from './MethodologyGenerator';
import OutlineGenerator from './OutlineGenerator';

const ThesisRefinement = () => {
  const [topic, setTopic] = useState('');
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [paperLength, setPaperLength] = useState(5);
  const [sourceCategories, setSourceCategories] = useState([]);
  const [customCategory, setCustomCategory] = useState('');
  const [readyForMethodology, setReadyForMethodology] = useState(false);
  const [methodology, setMethodology] = useState('');
  const [readyForOutline, setReadyForOutline] = useState(false);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const prompt = `
        You are a professor skilled in the Socratic method. Given the thesis/topic "${topic}", explicitly list 2-3 concise clarifying questions numbered clearly.
      `;
      const res = await axios.post('http://localhost:8000/ai-response', { prompt });
      const aiQuestions = res.data.response
        .split('\n')
        .filter(line => /^\d+\./.test(line))
        .map(line => line.replace(/^\d+\.\s*/, '').trim());

      setQuestions(aiQuestions);
      setResponses({});
    } catch {
      alert('Failed to fetch questions.');
    }
    setLoading(false);
  };

  const handleResponseChange = (index, value) => {
    setResponses(prev => ({ ...prev, [index]: value }));
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

  const recommendSources = async () => {
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:8000/recommend_sources', {
        final_thesis: topic,
        paper_length_pages: paperLength,
      });

      const categories = res.data.recommended_categories
        .map(cat => cat.replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean);

      setSourceCategories(categories.map(name => ({ name, selected: true })));
    } catch {
      alert('Failed to recommend sources.');
    }
    setLoading(false);
  };

  const toggleCategory = index => {
    setSourceCategories(prev =>
      prev.map((cat, idx) =>
        idx === index ? { ...cat, selected: !cat.selected } : cat
      )
    );
  };

  const toggleAll = selectAll => {
    setSourceCategories(prev => prev.map(cat => ({ ...cat, selected: selectAll })));
  };

  const addCustomCategory = () => {
    if (customCategory.trim()) {
      setSourceCategories(prev => [...prev, { name: customCategory, selected: true }]);
      setCustomCategory('');
    }
  };

  return (
    <div className="container my-5">
      <h3>Thesis/Topic Refinement</h3>

      <textarea
        className="form-control"
        rows={Math.max(3, topic.split('\n').length)}
        placeholder="Enter initial thesis/topic..."
        value={topic}
        onChange={e => setTopic(e.target.value)}
        style={{ resize: 'none' }}
      />

      {questions.length === 0 && !finalized && (
        <div className="mt-3 d-flex gap-2">
          <button className="btn btn-primary" onClick={fetchQuestions} disabled={loading || !topic}>
            {loading ? 'Generating...' : 'Generate Clarifying Questions'}
          </button>
          <button className="btn btn-success" onClick={() => setFinalized(true)}>
            Finalize Thesis
          </button>
        </div>
      )}

      {questions.length > 0 && (
        <div className="mt-3 card p-3">
          <h5>Answer Clarifying Questions:</h5>
          {questions.map((q, idx) => (
            <div key={idx} className="mt-2">
              <strong>{q}</strong>
              <textarea
                className="form-control mt-1"
                rows={2}
                value={responses[idx] || ''}
                onChange={e => handleResponseChange(idx, e.target.value)}
                style={{ resize: 'none' }}
              />
            </div>
          ))}
          <button className="btn btn-primary mt-3" onClick={handleRefineThesis}>
            {loading ? 'Refining...' : 'Refine Thesis'}
          </button>
        </div>
      )}

      {finalized && (
        <>
          <div className="mt-4">
            <h3>Additional Focus</h3>
          </div>
          <div className="card p-3">
            <h5>Final Thesis:</h5>
            <textarea
              className="form-control"
              rows={Math.max(3, topic.split('\n').length)}
              value={topic}
              readOnly
              style={{ resize: 'none' }}
            />

            <label className="mt-3"><strong>Approximate Number of Pages:</strong></label>
            <input
              type="number"
              className="form-control"
              value={paperLength}
              onChange={e => setPaperLength(Number(e.target.value))}
            />
            <button className="btn btn-secondary mt-3" onClick={recommendSources}>
              {loading ? 'Loading...' : 'Recommend Sources'}
            </button>

            {sourceCategories.length > 0 && (
              <div className="mt-4">
                <h5>Select Source Categories:</h5>
                <button className="btn btn-sm btn-link" onClick={() => toggleAll(true)}>Select All</button>
                {' | '}
                <button className="btn btn-sm btn-link" onClick={() => toggleAll(false)}>Deselect All</button>

                {sourceCategories.map((cat, idx) => (
                  <div key={idx} className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={cat.selected}
                      onChange={() => toggleCategory(idx)}
                    />
                    <label className="form-check-label">{cat.name}</label>
                  </div>
                ))}

                <input
                  className="form-control mt-2"
                  placeholder="Add custom category"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                />
                <button className="btn btn-secondary mt-2" onClick={addCustomCategory}>Add Category</button>
              </div>
            )}

            <button
              className="btn btn-success mt-3"
              onClick={() => setReadyForMethodology(true)}
            >
              Generate Methodology
            </button>
          </div>

          {readyForMethodology && (
            <div className="mt-5">
              <MethodologyGenerator
                finalThesis={topic}
                sourceCategories={sourceCategories.filter(cat => cat.selected).map(cat => cat.name)}
                setMethodology={setMethodology}
                proceedToOutline={() => setReadyForOutline(true)}
              />
            </div>
          )}

          {readyForOutline && methodology && (
            <div className="mt-5">
              <OutlineGenerator
                finalThesis={topic}
                methodology={methodology}
                paperLength={paperLength}
                sourceCategories={sourceCategories.filter(cat => cat.selected).map(cat => cat.name)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ThesisRefinement;
