import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import socratesIcon from './assets/socrates.png';
import ThesisRefinement from './components/ThesisRefinement';
import SourceCategories from './components/SourceCategories';
import MethodologyGenerator from './components/MethodologyGenerator';
import OutlineGenerator from './components/OutlineFrameworkGenerator';
import PaperTypeSelector from './components/PaperTypeSelector';
import OutlineDraft1 from './components/OutlineDraft1';
import OutlineDraft2 from './components/OutlineDraft2';
import FinalOutline from './components/FinalOutline';
import ProjectManager from './components/ProjectManager';
import FloatingContextButton from './components/FloatingContextButton'; // Add this import
import FloatingCitationsButton from './components/FloatingCitationsButton';

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
  const [draft2Data, setDraft2Data] = useState(null);

  // Project management
  const [currentProject, setCurrentProject] = useState(null);

  // Hidden debug sections
  const [showDebugSections, setShowDebugSections] = useState(false);

  const [autoSave, setAutoSave] = useState(true);

  // Ref for accessing ProjectManager's quickSave function
  const projectManagerRef = useRef(null);
  
  // Debounced auto-save to prevent excessive saving
  const autoSaveTimeoutRef = useRef(null);

  // Auto-save function with debouncing
  const triggerAutoSave = (immediate = false) => {
    if (!autoSave || !projectManagerRef.current || !projectManagerRef.current.quickSave) {
      return;
    }

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    if (immediate) {
      // Save immediately
      projectManagerRef.current.quickSave(true);
    } else {
      // Debounced save - wait 2 seconds after last change
      autoSaveTimeoutRef.current = setTimeout(() => {
        projectManagerRef.current.quickSave(true); // Pass true for silent auto-save
      }, 2000);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

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
    triggerAutoSave();
  };

  const handleThesisFinalized = (thesis) => {
    setFinalThesis(thesis);
    setThesisFinalized(true);
    setSourceCategoriesActivated(true);
    triggerAutoSave(true); // Immediate save for important milestone
  };

  const handleCategoriesSelected = (categories) => {
    setSourceCategories(categories);
    setCategoriesFinalized(true);
    triggerAutoSave(true); // Immediate save for important milestone
  };

  const proceedToOutline = () => {
    setReadyForOutline(true);
    triggerAutoSave();
  };

  const handleFrameworkComplete = useCallback((outlineData) => {
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
      triggerAutoSave(true); // Immediate save for important milestone
    } else {
      console.error('App.jsx: Invalid outline data received:', outlineData);
    }
  }, []);

  const handleTransferToOutlineDraft1 = () => {
    console.log('App.jsx: Transferring to outline draft 1');
    setActiveTab('draft1');
  };

  const handleOutlineDraft1Complete = (draftData) => {
    setDraftData(draftData);
    triggerAutoSave();
  };

  const handleTransferToOutlineDraft2 = () => {
    console.log('App.jsx: Transferring to outline draft 2');
    setActiveTab('draft2');
  };

  const handleOutlineDraft2Complete = (draft2Data) => {
    console.log('App.jsx: OutlineDraft2 data received:', draft2Data);
    setDraft2Data(draft2Data);
    triggerAutoSave(true); // Immediate save for step completion
  };

  // Auto-save function for OutlineDraft2 step updates
  const handleOutlineDraft2Update = (stepData) => {
    console.log('App.jsx: OutlineDraft2 step update:', stepData);
    setDraft2Data(prevData => ({
      ...prevData,
      ...stepData
    }));
    triggerAutoSave(); // Debounced save for frequent updates
  };

  const handleAutoSaveDraft = (draft) => {
    setDraftData(draft);
    triggerAutoSave(); // Debounced save for frequent draft updates
  };

  const handleMethodologySelected = (methodologyData) => {
    setMethodology(methodologyData);
    setOutlineVersion(prev => prev + 1); // Force outline regeneration
    setOutlineData(null); // Clear existing outline data
    triggerAutoSave(true); // Immediate save for important milestone
  };

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    // Don't auto-save on tab changes - this is just UI state
  };

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
    setDraft2Data(data.draft2Data || null);
    
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
      setDraft2Data(null);
      
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

  // Helper function to determine current step based on progress
  const getCurrentStep = () => {
    if (!selectedPaperType) return 'paper-type';
    if (!thesisFinalized) return 'thesis';
    if (!categoriesFinalized) return 'sources';
    if (!methodology) return 'methodology';
    if (!frameworkComplete) return 'outline';
    if (activeTab === 'draft1') return 'draft';
    if (activeTab === 'draft2') return 'draft';
    if (activeTab === 'initial') return 'final';
    return 'framework';
  };

  return (
    <div className="container py-5">
      <div className="d-flex align-items-center mb-4" style={{ minWidth: '100vw' }}>
        <h1>Report Generator</h1>
      </div>

      {/* Project Management */}
      <div className="card mb-4">
        <div className="card-header">
          <h6 className="mb-0">Project Management</h6>
        </div>
        <div className="card-body">
          {/* Auto-save toggle and debug toggle buttons */}
          <div className="d-flex gap-2 mb-3">
            <button
              className={`btn btn-sm ${autoSave ? 'btn-success' : 'btn-outline-secondary'}`}
              onClick={() => setAutoSave(!autoSave)}
            >
              {autoSave ? 'Auto-Save ON' : 'Auto-Save OFF'}
            </button>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setShowDebugSections(!showDebugSections)}
            >
              {showDebugSections ? 'Hide' : 'Show'} Debug
            </button>
          </div>
          <ProjectManager
            ref={projectManagerRef}
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
            draft2Data={draft2Data}
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
                onClick={() => handleTabChange('framework')}
                type="button"
                role="tab"
              >
                Outline Framework
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'draft1' ? 'active' : ''} ${!frameworkComplete ? 'disabled' : ''}`}
                onClick={() => frameworkComplete && handleTabChange('draft1')}
                type="button"
                role="tab"
                disabled={!frameworkComplete}
              >
                Outline Draft 1
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'draft2' ? 'active' : ''} ${!draftData ? 'disabled' : ''}`}
                onClick={() => draftData && handleTabChange('draft2')}
                type="button"
                role="tab"
                disabled={!draftData}
              >
                Outline Draft 2
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'initial' ? 'active' : ''} ${!draft2Data ? 'disabled' : ''}`}
                onClick={() => draft2Data && handleTabChange('initial')}
                type="button"
                role="tab"
                disabled={!draft2Data}
              >
                Final Outline
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
                    savedCategories={sourceCategories} // <-- add this line
                  />
                </div>
              )}

              {/* Methodology Section */}
              {finalThesis && categoriesFinalized && (
                <div className="card p-3 mb-4">
                  <MethodologyGenerator
                    finalThesis={finalThesis}
                    sourceCategories={sourceCategories}
                    methodology={methodology} // <-- should be the full object
                    setMethodology={handleMethodologySelected}
                    proceedToOutline={proceedToOutline}
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
                    onTransferToOutlineDraft={handleTransferToOutlineDraft1}
                    savedOutlineData={outlineData}
                  />
                </div>
              )}
            </div>
          )}

          {/* Outline Draft 1 Tab */}
          {activeTab === 'draft1' && (
            <div className="tab-pane fade show active">
              <OutlineDraft1
                outlineData={outlineData}
                finalThesis={finalThesis}
                methodology={methodology}
                onOutlineDraft1Complete={handleOutlineDraft1Complete}
                onTransferToOutlineDraft2={handleTransferToOutlineDraft2}
                autoSave={autoSave}
                onAutoSaveDraft={handleAutoSaveDraft}
                draftData={draftData}
              />
            </div>
          )}

          {/* Outline Draft 2 Tab */}
          {activeTab === 'draft2' && (
            <div className="tab-pane fade show active">
              <OutlineDraft2
                outlineData={outlineData}
                finalThesis={finalThesis}
                methodology={methodology}
                selectedPaperType={selectedPaperType}
                draftData={draftData}
                draft2Data={draft2Data}
                onOutlineDraft2Complete={handleOutlineDraft2Complete}
                onOutlineDraft2Update={handleOutlineDraft2Update}
                preIdentifiedDataSections={outlineData?.filter(section => 
                  section.is_data_section === true || 
                  section.section_type === 'data' ||
                  section.category === 'data_section'
                )}
              />
            </div>
          )}

          {/* Final Outline Tab */}
          {activeTab === 'initial' && (
            <div className="tab-pane fade show active">
              <FinalOutline
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

      {/* Floating Context Button - Add this at the end */}
      <FloatingContextButton
        currentStep={getCurrentStep()}
        finalThesis={finalThesis}
        selectedCategories={sourceCategories}
        methodology={methodology}
        selectedPaperType={selectedPaperType}
        pageCount={paperLength}
        outline={outlineData}
      />
      
      {/* Floating Citations Button */}
      <FloatingCitationsButton
        outline={outlineData}
        methodology={methodology}
        finalThesis={finalThesis}
      />
    </div>
  );
}

export default App;
