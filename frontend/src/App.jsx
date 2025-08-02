import { useState } from 'react';
import axios from 'axios';
import socratesIcon from './assets/socrates.png';
import ThesisRefinement from './components/ThesisRefinement';
import SourceCategories from './components/SourceCategories';
import MethodologyGenerator from './components/MethodologyGenerator';
import OutlineGenerator from './components/OutlineGenerator';
import PaperTypeSelector from './components/PaperTypeSelector';
import OutlineDraft from './components/OutlineDraft';
import InitialDraft from './components/InitialDraft';
import ProjectManager from './components/ProjectManager';

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

  // Tab management
  const [activeTab, setActiveTab] = useState('framework');
  const [frameworkComplete, setFrameworkComplete] = useState(false);
  const [outlineData, setOutlineData] = useState(null);
  const [draftData, setDraftData] = useState(null);

  // Project management
  const [currentProject, setCurrentProject] = useState(null);

  // Hidden debug sections
  const [showDebugSections, setShowDebugSections] = useState(false);

  const [autoSave, setAutoSave] = useState(true);

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

  const handleFrameworkComplete = (outlineData) => {
    console.log('=== App.jsx: handleFrameworkComplete called ===');
    console.log('App.jsx: Received outline data:', outlineData);
    console.log('App.jsx: Outline data type:', typeof outlineData);
    console.log('App.jsx: Is array:', Array.isArray(outlineData));
    console.log('App.jsx: Length:', outlineData?.length);
    
    if (outlineData && Array.isArray(outlineData) && outlineData.length > 0) {
      console.log('App.jsx: Setting outline data...');
      setOutlineData(outlineData);
      
      console.log('App.jsx: Setting framework complete to true...');
      setFrameworkComplete(true);
      
      console.log('App.jsx: Framework completion successful');
    } else {
      console.error('App.jsx: Invalid outline data received:', outlineData);
    }
  };

  const handleTransferToOutlineDraft = () => {
    console.log('App.jsx: Transferring to outline draft');
    setActiveTab('outline');
  };

  const handleOutlineDraftComplete = (draftData) => {
    setDraftData(draftData);
  };

  const handleAutoSaveDraft = (draft) => setDraftData(draft);

  // Project management functions
  const handleLoadProject = (project) => {
    const data = project.data;
    
    // Restore all state
    setFinalThesis(data.finalThesis || '');
    setPaperLength(data.paperLength ?? '');
    setSourceCategories(data.sourceCategories || []);
    setMethodology(data.methodology || '');
    setSelectedPaperType(data.selectedPaperType || null);
    setOutlineData(data.outlineData || null);
    setDraftData(data.draftData || null);
    
    // Restore state flags
    setThesisFinalized(data.thesisFinalized || false);
    setCategoriesFinalized(data.categoriesFinalized || false);
    setSourceCategoriesActivated(data.sourceCategoriesActivated || false);
    setReadyForOutline(data.readyForOutline || false);
    setFrameworkComplete(data.frameworkComplete || false);
    setActiveTab(data.activeTab || 'framework');
    
    setCurrentProject(project);
    
    // Only show the load message here
    alert(`Project "${project.name}" loaded successfully!`);
  };

  const handleNewProject = () => {
    if (window.confirm('Create a new project? All unsaved changes will be lost.')) {
      // Reset all state
      setFinalThesis('');
      setPaperLength(null);
      setSourceCategories([]);
      setMethodology('');
      setSelectedPaperType(null);
      setOutlineData(null);
      setDraftData(null);
      
      setThesisFinalized(false);
      setCategoriesFinalized(false);
      setSourceCategoriesActivated(false);
      setReadyForOutline(false);
      setFrameworkComplete(false);
      setActiveTab('framework');
      
      setCurrentProject(null);
      setOutlineVersion(prev => prev + 1);
    }
  };

  return (
    <div className="container py-5">
      <div className="d-flex align-items-center mb-4" style={{ minWidth: '100vw' }}>
        <h1>Socratic AI Assistant</h1>
        <img src={socratesIcon} alt="Socrates Icon" width={70} height={70} className="ms-3" />
      </div>

      {/* Project Management */}
      <div className="card mb-4">
        <div className="card-header">
          <h6 className="mb-0">Project Management</h6>
        </div>
        <div className="card-body">
          {/* Auto-save toggle button */}
          <button
            className={`btn btn-sm mb-3 ${autoSave ? 'btn-success' : 'btn-outline-secondary'}`}
            onClick={() => setAutoSave(!autoSave)}
          >
            {autoSave ? 'Auto-Save ON' : 'Auto-Save OFF'}
          </button>
          <ProjectManager
            currentProject={currentProject}
            setCurrentProject={setCurrentProject}
            onLoadProject={handleLoadProject}
            onNewProject={handleNewProject}
            finalThesis={finalThesis}
            paperLength={paperLength}
            sourceCategories={sourceCategories}
            methodology={methodology}
            selectedPaperType={selectedPaperType}
            outlineData={outlineData}
            draftData={draftData}
            thesisFinalized={thesisFinalized}
            categoriesFinalized={categoriesFinalized}
            sourceCategoriesActivated={sourceCategoriesActivated}
            readyForOutline={readyForOutline}
            frameworkComplete={frameworkComplete}
            activeTab={activeTab}
            showDebugSections={showDebugSections}
            setShowDebugSections={setShowDebugSections}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="card mb-4">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'framework' ? 'active' : ''}`}
                onClick={() => setActiveTab('framework')}
                type="button"
                role="tab"
              >
                Outline Framework
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'outline' ? 'active' : ''} ${!frameworkComplete ? 'disabled' : ''}`}
                onClick={() => frameworkComplete && setActiveTab('outline')}
                type="button"
                role="tab"
                disabled={!frameworkComplete}
              >
                Outline Draft
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'initial' ? 'active' : ''} ${!draftData ? 'disabled' : ''}`}
                onClick={() => draftData && setActiveTab('initial')}
                type="button"
                role="tab"
                disabled={!draftData}
              >
                Initial Draft
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body">
          {/* Outline Framework Tab */}
          {activeTab === 'framework' && (
            <div className="tab-pane fade show active">
              {/* Paper Type & Length Selector */}
              <div className="card p-3 mb-4">
                <PaperTypeSelector
                  selectedPaperType={selectedPaperType}
                  setSelectedPaperType={setSelectedPaperType}
                  paperLength={paperLength}
                  setPaperLength={setPaperLength}
                  onPaperTypeSelected={handlePaperTypeSelected}
                />
              </div>

              {/* Thesis Refinement Section */}
              {selectedPaperType && paperLength !== null && (
                <div className="card p-3 mb-4">
                  <ThesisRefinement 
                    finalThesis={finalThesis}
                    setFinalThesis={setFinalThesis}
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
                    onFrameworkComplete={handleFrameworkComplete}
                    onTransferToOutlineDraft={handleTransferToOutlineDraft}
                    savedOutlineData={outlineData}
                  />
                </div>
              )}
            </div>
          )}

          {/* Outline Draft Tab */}
          {activeTab === 'outline' && (
            <div className="tab-pane fade show active">
              <OutlineDraft
                outlineData={outlineData}
                finalThesis={finalThesis}
                methodology={methodology}
                onOutlineDraftComplete={handleOutlineDraftComplete}
                autoSave={autoSave}
                onAutoSaveDraft={handleAutoSaveDraft}
                draftData={draftData} // <-- add this line
              />
            </div>
          )}

          {/* Initial Draft Tab */}
          {activeTab === 'initial' && (
            <div className="tab-pane fade show active">
              <InitialDraft
                draftData={draftData}
                finalThesis={finalThesis}
              />
            </div>
          )}
        </div>
      </div>

      {/* Hidden Debug Sections */}
      {showDebugSections && (
        <>
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
        </>
      )}
    </div>
  );
}

export default App;
