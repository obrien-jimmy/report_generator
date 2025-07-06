import { useState } from 'react';
import axios from 'axios';
import socratesIcon from './assets/socrates.png';
import ThesisRefinement from './components/ThesisRefinement';
import SourceCategories from './components/SourceCategories';
import MethodologyGenerator from './components/MethodologyGenerator';
import OutlineGenerator from './components/OutlineGenerator';
import PaperTypeSelector from './components/PaperTypeSelector';

function App() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [kbQuery, setKbQuery] = useState('');
  const [kbResults, setKbResults] = useState([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbError, setKbError] = useState(null);

  const [finalThesis, setFinalThesis] = useState('');
  const [paperLength, setPaperLength] = useState(null);
  const [sourceCategories, setSourceCategories] = useState([]);
  const [methodology, setMethodology] = useState('');
  const [readyForOutline, setReadyForOutline] = useState(false);
  const [outlineVersion, setOutlineVersion] = useState(0);

  const [thesisFinalized, setThesisFinalized] = useState(false);
  const [categoriesFinalized, setCategoriesFinalized] = useState(false);
  const [selectedPaperType, setSelectedPaperType] = useState(null);
  const [sourceCategoriesActivated, setSourceCategoriesActivated] = useState(false);

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

  const handlePaperTypeSelected = (paperType, pageLength) => {
    setSelectedPaperType(paperType);
    setPaperLength(pageLength);
  };

  const handleThesisFinalized = (thesis) => {
    setFinalThesis(thesis);
    setThesisFinalized(true);
    setSourceCategoriesActivated(true);
  };

  const handleCategoriesSelected = (categories) => {
    setSourceCategories(categories);
    setCategoriesFinalized(true);
  };

  const proceedToOutline = () => setReadyForOutline(true);
  const resetOutline = () => setOutlineVersion(prev => prev + 1);

  return (
    <div className="container py-5">
      <div className="d-flex align-items-center mb-4" style={{ minWidth: '100vw' }}>
        <h1>Socratic AI Assistant</h1>
        <img src={socratesIcon} alt="Socrates Icon" width={70} height={70} className="ms-3" />
      </div>

      {/* Paper Type & Length Selector */}
      <div className="card p-3 mb-4">
        <PaperTypeSelector onPaperTypeSelected={handlePaperTypeSelected} />
      </div>

      {/* Thesis Refinement Section */}
      {selectedPaperType && paperLength !== null && (
        <div className="card p-3 mb-4">
          <ThesisRefinement 
            onFinalize={handleThesisFinalized} 
            selectedPaperType={selectedPaperType}
          />
        </div>
      )}

      {/* Source Categories */}
      {sourceCategoriesActivated && finalThesis && thesisFinalized && (
        <div className="card p-3 mb-4">
          <SourceCategories
            finalThesis={finalThesis}
            paperLength={paperLength || 0}
            onCategoriesSelected={handleCategoriesSelected}
          />
        </div>
      )}

      {/* Methodology Section */}
      {finalThesis && categoriesFinalized && (
        <div className="card p-3 mb-4">
          <MethodologyGenerator
            finalThesis={finalThesis}
            sourceCategories={sourceCategories}
            setMethodology={setMethodology}
            proceedToOutline={proceedToOutline}
            resetOutline={resetOutline}
            selectedPaperType={selectedPaperType}
            pageCount={paperLength}
          />
        </div>
      )}

      {/* Outline Section */}
      {readyForOutline && methodology && (
        <div className="card p-3 mb-4">
          <OutlineGenerator
            key={outlineVersion}
            finalThesis={finalThesis}
            methodology={methodology}
            paperLength={paperLength || 0}
            sourceCategories={sourceCategories}
            selectedPaperType={selectedPaperType}
          />
        </div>
      )}

      <hr className="my-5" />

      {/* AI Prompt Interaction */}
      <div className="card p-3 mb-4">
        <h3>AI Prompt Interaction</h3>
        <textarea
          className="form-control my-3"
          rows={4}
          placeholder="Enter your prompt here..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          style={{ width: '100%', resize: 'vertical' }}
        />
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={loading || !prompt}
        >
          {loading ? 'Generating...' : 'Generate AI Response'}
        </button>

        {response && (
          <div className="mt-4">
            <h5>AI Response:</h5>
            <p>{response}</p>
          </div>
        )}
      </div>

      <hr className="my-5" />

      {/* Knowledge Base Interaction */}
      <div className="card p-3">
        <h3>Query Amazon Bedrock Knowledge Base</h3>
        <input
          type="text"
          className="form-control my-3"
          placeholder="Enter your Knowledge Base query..."
          value={kbQuery}
          onChange={(e) => setKbQuery(e.target.value)}
          style={{ width: '100%' }}
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
    </div>
  );
}

export default App;
