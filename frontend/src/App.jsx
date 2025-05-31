import { useState } from 'react';
import axios from 'axios';
import socratesIcon from './assets/socrates.png';
import ThesisRefinement from './components/ThesisRefinement';
import MethodologyGenerator from './components/MethodologyGenerator';
import OutlineGenerator from './components/OutlineGenerator';

function App() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const [kbQuery, setKbQuery] = useState('');
  const [kbResults, setKbResults] = useState([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbError, setKbError] = useState(null);

  const [finalThesis, setFinalThesis] = useState('');
  const [paperLength, setPaperLength] = useState(10);
  const [sourceCategories, setSourceCategories] = useState([]);
  const [methodology, setMethodology] = useState('');
  const [showOutline, setShowOutline] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:8000/ai-response', { prompt });
      setResponse(res.data.response);
    } catch (error) {
      console.error('Error fetching response:', error);
      alert('Failed to get response. Check console.');
    }
    setLoading(false);
  };

  const handleKbQuery = async () => {
    setKbLoading(true);
    setKbError(null);
    try {
      const res = await axios.get('http://localhost:8000/api/query_kb', {
        params: { query: kbQuery },
      });
      setKbResults(res.data.results);
    } catch (err) {
      setKbError(err.message);
    }
    setKbLoading(false);
  };

  const proceedToOutline = () => {
    setShowOutline(true);
  };

  return (
    <div className="container py-5">
      <div className="d-flex align-items-center mb-4">
        <h1>Socratic AI Assistant</h1>
        <img
          src={socratesIcon}
          alt="Socrates Icon"
          width={70}
          height={70}
          className="ms-3"
        />
      </div>

      <ThesisRefinement
        setFinalThesis={setFinalThesis}
        setPaperLength={setPaperLength}
        setSourceCategories={setSourceCategories}
      />

      <hr className="my-5" />

      {finalThesis && sourceCategories.length > 0 && (
        <>
<MethodologyGenerator
  finalThesis={finalThesis}
  sourceCategories={sourceCategories}
  setMethodology={setMethodology}
  proceedToOutline={() => setReadyForOutline(true)}
/>

{readyForOutline && (
  <OutlineGenerator
    finalThesis={finalThesis}
    methodology={methodology}
    paperLength={paperLength}
    sourceCategories={sourceCategories}
  />
)}

        </>
      )}

      <hr className="my-5" />

      <h3>AI Prompt Interaction</h3>
      <textarea
        className="form-control my-3"
        rows={4}
        placeholder="Enter your prompt here..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <button
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={loading || !prompt}
      >
        {loading ? 'Generating...' : 'Generate AI Response'}
      </button>

      {response && (
        <div className="mt-4 card p-3">
          <h5>AI Response:</h5>
          <p>{response}</p>
        </div>
      )}

      <hr className="my-5" />

      <h3>Query Amazon Bedrock Knowledge Base</h3>
      <input
        type="text"
        className="form-control my-3"
        placeholder="Enter your Knowledge Base query..."
        value={kbQuery}
        onChange={(e) => setKbQuery(e.target.value)}
      />

      <button
        className="btn btn-success"
        onClick={handleKbQuery}
        disabled={kbLoading || !kbQuery}
      >
        {kbLoading ? 'Loading Results...' : 'Query Knowledge Base'}
      </button>

      {kbError && <div className="alert alert-danger mt-2">Error: {kbError}</div>}

      {kbResults.length > 0 && (
        <div className="mt-4">
          <h5>Knowledge Base Results:</h5>
          <ul className="list-group">
            {kbResults.map((result, idx) => (
              <li key={idx} className="list-group-item">
                <strong>Score: {result.score.toFixed(2)}</strong>
                <p>{result.content.text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
