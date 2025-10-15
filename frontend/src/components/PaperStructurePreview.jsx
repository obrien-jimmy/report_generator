import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaList, FaEye, FaEyeSlash, FaPlus, FaTrash, FaEdit, FaSave, FaTimes, FaArrowUp, FaArrowDown, FaSpinner, FaCheck, FaSync } from 'react-icons/fa';

const PaperStructurePreview = ({ 
  paperType, 
  methodology, 
  // subMethodology,  // Removed from production, kept for future consideration
  onStructureChange,
  onGenerateOutline, // Add this prop
  loading, // Add this prop  
  hasGenerated, // Add this prop
  refreshTrigger, // Add this prop to force refresh
  finalThesis,
  sourceCategories,
  methodologyComplete // Add this prop to trigger generation
}) => {
  const [structureData, setStructureData] = useState(null);
  const [error, setError] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [editableStructure, setEditableStructure] = useState([]);
  const [editingMode, setEditingMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingSections, setGeneratingSections] = useState(false);
  const [sectionsGenerated, setSectionsGenerated] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showAutoSaveIndicator, setShowAutoSaveIndicator] = useState(false);



  useEffect(() => {
    if (paperType?.id) {
      // Initialize with just background section
      const initialStructure = [
        {
          id: 'background-section',
          title: 'Background',
          context: 'Factual background needed to understand the thesis',
          isAdmin: false,
          isMethodology: false,
          isIntro: false,
          isSummary: false,
          isAnalysis: false,
          isData: true,
          category: 'Data',
          order: 0
        }
      ];
      setEditableStructure(initialStructure);
      if (onStructureChange) {
        onStructureChange(initialStructure);
      }
    }
  }, [paperType?.id]);

  // Trigger generation when methodology is completed
  useEffect(() => {
    if (methodologyComplete && finalThesis && sourceCategories && paperType?.id) {
      generateSections();
    }
  }, [methodologyComplete, finalThesis, sourceCategories, paperType?.id]);

  // Re-initialize structure when needed
  useEffect(() => {
    if (structureData) {
      initializeEditableStructure(structureData);
    }
  }, [structureData]);

  // Load saved structure on component mount
  useEffect(() => {
    if (!paperType?.id || !methodology) return;
    
    const saveKey = `paper_structure_${paperType.id}_${methodology}`;
    try {
      const saved = localStorage.getItem(saveKey);
      if (saved) {
        const savedData = JSON.parse(saved);
        if (savedData.structure && savedData.structure.length > 0) {
          setEditableStructure(savedData.structure);
          setLastSaved(new Date(savedData.timestamp));
          console.log('Loaded saved paper structure:', saveKey);
        }
      }
    } catch (err) {
      console.error('Error loading saved structure:', err);
    }
  }, [paperType?.id, methodology]);

  // Auto-save when structure changes (debounced)
  useEffect(() => {
    if (!autoSaveEnabled || editableStructure.length === 0) return;
    
    const timeoutId = setTimeout(() => {
      saveStructure(editableStructure, false);
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [editableStructure, autoSaveEnabled]);

  const fetchStructure = async () => {
    setError(null);
    
    try {
      // Get the actual methodology ID to send
      const methodologyId = methodology?.methodologyType || methodology?.methodology_type || methodology;
      // const subMethodologyId = subMethodology?.subMethodology || subMethodology?.sub_methodology || subMethodology;  // Removed from production, kept for future consideration
      
      console.log('Sending to backend:');
      console.log('- Paper Type:', paperType.id);
      console.log('- Methodology ID:', methodologyId);
      // console.log('- Sub-methodology ID:', subMethodologyId);  // Removed from production, kept for future consideration
      console.log('- Original methodology object:', methodology);
      
      const response = await axios.post('http://localhost:8000/paper_structure', {
        paper_type: paperType.id,
        methodology_id: methodologyId,
        // sub_methodology_id: subMethodologyId  // Removed from production, kept for future consideration
      });
      
      // Debug logging
      console.log('Structure response:', response.data);
      console.log('Has methodology sections:', response.data.has_methodology_sections);
      
      setStructureData(response.data);
      initializeEditableStructure(response.data);
    } catch (err) {
      setError('Failed to load paper structure');
      console.error('Structure fetch error:', err);
    }
  };

  const initializeEditableStructure = (data) => {
    const sections = data.structure.map((section, index) => {
      const isAdmin = ['Title Page', 'Abstract', 'References (APA 7th)'].includes(section);
      
      // HARDCODED categorization matching backend logic for exploratory papers
      const sectionLower = section.toLowerCase().trim();
      
      // Use exact hardcoded mapping for exploratory sections
      let category = 'Data'; // Default
      let isIntro = false;
      let isSummary = false; 
      let isMethodology = false;
      let isAnalysis = false;
      let isData = true; // Default
      
      if (sectionLower === 'introduction') {
        category = 'Intro';
        isIntro = true;
        isData = false;
      } else if (sectionLower === 'background') {
        category = 'Data';
        isData = true;
      } else if (sectionLower === 'methodology and approach') {
        category = 'Method';
        isMethodology = true;
        isData = false;
      } else if (sectionLower === 'data & observations') {
        category = 'Data';
        isData = true;
      } else if (sectionLower === 'analysis') {
        category = 'Analysis';
        isAnalysis = true;
        isData = false;
      } else if (sectionLower === 'impact') {
        category = 'Analysis';
        isAnalysis = true;
        isData = false;
      } else if (sectionLower === 'conclusion') {
        category = 'Summary';
        isSummary = true;
        isData = false;
      }
      console.log('- Final isMethodology:', isMethodology);
      
      return {
        id: `section-${index}`,
        title: section,
        context: '',
        isAdmin,
        isMethodology,
        isIntro,
        isSummary,
        isAnalysis,
        isData,
        category, // Add the hardcoded category
        order: index
      };
    });

    console.log('Final sections with methodology tags:', sections);
    setEditableStructure(sections);
    
    // Notify parent component
    if (onStructureChange) {
      onStructureChange(sections);
    }
  };

  const updateSection = (sectionId, updates) => {
    const newStructure = editableStructure.map(section => {
      if (section.id === sectionId) {
        return { ...section, ...updates };
      }
      return section;
    });
    setEditableStructure(newStructure);
    
    if (onStructureChange) {
      onStructureChange(newStructure);
    }
  };

  const addSection = () => {
    const newSection = {
      id: `section-${Date.now()}`,
      title: 'New Section',
      context: '',
      isAdmin: false,
      isMethodology: false,
      isIntro: false,
      isSummary: false,
      order: editableStructure.length
    };
    
    const newStructure = [...editableStructure, newSection];
    setEditableStructure(newStructure);
    
    if (onStructureChange) {
      onStructureChange(newStructure);
    }
  };

  const removeSection = (sectionId) => {
    const newStructure = editableStructure.filter(section => section.id !== sectionId);
    setEditableStructure(newStructure);
    
    if (onStructureChange) {
      onStructureChange(newStructure);
    }
  };

  const moveSection = (sectionId, direction) => {
    const currentIndex = editableStructure.findIndex(s => s.id === sectionId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= editableStructure.length) return;

    const newStructure = [...editableStructure];
    [newStructure[currentIndex], newStructure[newIndex]] = [newStructure[newIndex], newStructure[currentIndex]];
    
    // Update order
    newStructure.forEach((section, index) => {
      section.order = index;
    });

    setEditableStructure(newStructure);
    
    if (onStructureChange) {
      onStructureChange(newStructure);
    }
  };



  const getMethodologyDisplay = () => {
    if (!methodology) return 'Base structure';
    
    // Find methodology names from the methodology options
    const methodologyNames = {
      'quantitative': 'Quantitative Analysis',
      'qualitative': 'Qualitative Analysis', 
      'literature_review': 'Literature-Based Review',
      'mixed_methods': 'Mixed Methods'
    };
    
    // const subMethodologyNames = {  // Removed from production, kept for future consideration
    //   'thematic_analysis': 'Thematic Analysis',
    //   'case_study': 'Case Study',
    //   'systematic_review': 'Systematic Review',
    //   'statistical_techniques': 'Core Statistical Techniques',
    //   'regression_models': 'Regression & Generalized Models',
    //   'content_analysis': 'Content Analysis',
    //   'narrative_review': 'Narrative Review',
    //   'narrative_analysis': 'Narrative Analysis',
    //   'scoping_review': 'Scoping Review',
    //   'integrative_review': 'Integrative Review',
    //   'critical_review': 'Critical Review',
    //   'conceptual_review': 'Conceptual Review',
    //   'meta_synthesis': 'Meta-Synthesis'
    // };
    
    // Get the main methodology display name
    const mainMethod = methodologyNames[methodology] || methodology;
    
    // Get the sub-methodology display name if it exists (Removed from production, kept for future consideration)
    // const subMethod = subMethodology ? subMethodologyNames[subMethodology] : null;
    
    // Only show the sub-methodology if it exists and is different from the main methodology (Removed from production, kept for future consideration)
    // if (subMethod && subMethod !== mainMethod) {
    //   return `${mainMethod} - ${subMethod}`;
    // }
    
    // If sub-methodology is the same as main or doesn't exist, just show the main
    return mainMethod;
  };

  // Save/Load functionality
  const getMethodologyIdForKey = () => {
    return methodology?.methodologyType || methodology?.methodology_type || methodology;
  };

  const getSaveKey = () => {
    const methodologyId = getMethodologyIdForKey();
    if (!paperType?.id || !methodologyId) return null;
    return `paper_structure_${paperType.id}_${methodologyId}`;
  };

  const saveStructure = async (structure = editableStructure, manual = false) => {
    const saveKey = getSaveKey();
    if (!saveKey) return;

    setSaving(true);
    try {
      const saveData = {
        structure: structure,
        paperType: paperType,
        methodology: methodology,
        timestamp: Date.now(),
        version: '1.0'
      };
      
      localStorage.setItem(saveKey, JSON.stringify(saveData));
      setLastSaved(new Date());
      
      if (manual) {
        // Show brief success indicator for manual saves
        setTimeout(() => setSaving(false), 500);
      } else {
        // Show auto-save indicator briefly
        setShowAutoSaveIndicator(true);
        setTimeout(() => setShowAutoSaveIndicator(false), 2000);
        setSaving(false);
      }
      
      console.log('Paper structure saved:', saveKey);
    } catch (err) {
      console.error('Error saving structure:', err);
      setSaving(false);
    }
  };

  const loadStructure = () => {
    const saveKey = getSaveKey();
    if (!saveKey) return null;

    try {
      const saved = localStorage.getItem(saveKey);
      if (saved) {
        const saveData = JSON.parse(saved);
        console.log('Loading saved structure:', saveKey);
        return saveData;
      }
    } catch (err) {
      console.error('Error loading structure:', err);
    }
    return null;
  };

  const deleteSavedStructure = () => {
    const saveKey = getSaveKey();
    if (saveKey) {
      localStorage.removeItem(saveKey);
      setLastSaved(null);
      console.log('Saved structure deleted:', saveKey);
    }
  };

  const toggleCollapse = () => setCollapsed(prev => !prev);
  const toggleEditingMode = () => setEditingMode(prev => !prev);

  const parseGeneratedText = (text) => {
    const sections = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    let currentSection = null;
    for (const line of lines) {
      if (line.startsWith('I. Background') || line.match(/^Section I:/)) {
        currentSection = { title: 'Background', description: '', subcategories: [] };
        sections.push(currentSection);
      } else if (line.match(/^Section [IVXLCDM]+:/) || line.match(/^[IVXLCDM]+\./)) {
        const titleMatch = line.match(/^Section [IVXLCDM]+: (.+)|^([IVXLCDM]+)\. (.+)/);
        if (titleMatch) {
          const title = titleMatch[1] || titleMatch[3];
          currentSection = { title, description: '', subcategories: [] };
          sections.push(currentSection);
        }
      } else if (line.startsWith('- ') && currentSection) {
        currentSection.subcategories.push(line.substring(2));
      } else if (currentSection && !currentSection.description && line) {
        currentSection.description = line;
      }
    }
    return sections;
  };

  const generateSections = async () => {
    if (!paperType?.id || !finalThesis || !sourceCategories) {
      setError('Paper type, thesis, and source categories are required to generate sections.');
      return;
    }

    setGeneratingSections(true);
    setError(null);

    try {
      // New prompt for data-only generation
      const prompt = `Paper Structure Preview (Data-Only Generation)

Instruction to the Model:

You are generating a Paper Structure Preview.
This is not the paper's outline or thesis structure — it is a data framework that identifies what must be researched or extracted from source material to fully understand and address the thesis.

Rules:

Do not include non-data or administrative sections.

Exclude: Methodology, Analysis, Discussion, Summary, or Administrative content.

Focus only on observable, data-based topics.

These should be facts, systems, historical background, case studies, technical parameters, organizational structures, key actors, frameworks, or data patterns that inform the thesis.

Start with a "Background" section.

This section provides factual, descriptive context to orient the reader to the problem space.

After the Background section, list all other categories and subcategories of topics that someone would need to research to fully understand the thesis.

Each category should represent a major thematic area of evidence or observation.

Each subcategory should represent a specific dimension, dataset, variable, or concept relevant to that category.

No argumentation or interpretation.

These items are strictly informational elements that a researcher would collect.

Thesis: "${finalThesis}"

Source Categories: ${JSON.stringify(sourceCategories)}

Output Format:

Title: Paper Structure Preview

Section I: Background

Describe what factual background is needed to understand the thesis.

Section II–X: Major Categories

For each category:

Heading (Category Name)

Subheadings (Subcategories) – each identifying a specific topic or dataset to explore.

Example (Illustrative Only):

Paper Structure Preview

I. Background
   - Evolution of cyber deterrence strategy since 2000
   - Key actors and institutional frameworks (DoD, NSA, USCYBERCOM)

II. Threat Landscape
   - Types of cyber adversaries (state, proxy, criminal)
   - Trends in offensive capabilities
   - Notable cyber incidents (2010–present)

III. Defensive Infrastructure
   - National cyber defense architecture
   - Public-private sector coordination
   - International partnerships (NATO, AUKUS)

IV. Legal and Policy Framework
   - U.S. statutory authorities for cyber operations
   - International norms and law of armed conflict

End of Prompt`;

      // Call the backend to generate sections and subsections
      const response = await axios.post('http://localhost:8000/generate_sections_subsections', {
        prompt: prompt,
        paper_type: paperType.id,
        methodology: methodology,
        final_thesis: finalThesis,
        source_categories: sourceCategories
      });

      if (response.data && response.data.sections) {
        // Parse the generated text into sections
        const generatedText = response.data.sections; // Assuming it's the text output
        const sections = parseGeneratedText(generatedText);

        // Convert to editable structure format
        const generatedSections = sections.map((section, index) => ({
          id: `generated-section-${index}`,
          title: section.title,
          context: section.description || '',
          subsections: section.subcategories.map(sub => ({
            subsection_title: sub,
            subsection_context: ''
          })),
          isAdmin: false,
          isMethodology: false,
          isIntro: false,
          isSummary: false,
          isAnalysis: false,
          isData: true,
          category: 'Data',
          order: index,
          generated: true
        }));

        setEditableStructure(generatedSections);

        // Notify parent
        if (onStructureChange) {
          onStructureChange(generatedSections);
        }

        // Save immediately
        saveStructure(generatedSections, true);

        setSectionsGenerated(true);
        console.log('Sections generated successfully:', generatedSections);
      }
    } catch (err) {
      console.error('Error generating sections:', err);
      setError(err.response?.data?.detail || 'Failed to generate sections. Please try again.');
    } finally {
      setGeneratingSections(false);
    }
  };

  const updateSubsection = (sectionId, subsectionIndex, field, value) => {
    setEditableStructure(prev => 
      prev.map(section => {
        if (section.id === sectionId) {
          const updatedSubsections = [...(section.subsections || [])];
          updatedSubsections[subsectionIndex] = {
            ...updatedSubsections[subsectionIndex],
            [field]: value
          };
          return { ...section, subsections: updatedSubsections };
        }
        return section;
      })
    );
  };

  const removeSubsection = (sectionId, subsectionIndex) => {
    setEditableStructure(prev => 
      prev.map(section => {
        if (section.id === sectionId) {
          const updatedSubsections = [...(section.subsections || [])];
          updatedSubsections.splice(subsectionIndex, 1);
          return { ...section, subsections: updatedSubsections };
        }
        return section;
      })
    );
  };

  const addSubsection = (sectionId) => {
    setEditableStructure(prev => 
      prev.map(section => {
        if (section.id === sectionId) {
          const newSubsection = {
            subsection_title: 'New Subsection',
            subsection_context: ''
          };
          return { 
            ...section, 
            subsections: [...(section.subsections || []), newSubsection] 
          };
        }
        return section;
      })
    );
  };

  if (loading) {
    return (
      <div className="alert alert-info">
        Loading paper structure...
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-warning">
        <strong>Structure Preview:</strong> {error}
      </div>
    );
  }

  if (!structureData) {
    return null;
  }

  return (
    <div className="card mb-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <h5 className="mb-0">Data Structure Preview</h5>
          <span className="badge bg-info ms-2">
            {editableStructure.length} sections
          </span>
          {lastSaved && (
            <span className="badge bg-success ms-2" title={`Last saved: ${lastSaved.toLocaleTimeString()}`}>
              Saved
            </span>
          )}
          {showAutoSaveIndicator && (
            <span className="badge bg-info ms-2">
              Auto-saved
            </span>
          )}
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={addSection}
            title="Add new section"
          >
            <FaPlus />
          </button>
          <button
            className="btn btn-sm btn-outline-info"
            onClick={() => saveStructure(editableStructure, true)}
            title="Save structure manually"
            disabled={saving}
          >
            {saving ? <FaSpinner className="fa-spin" /> : <FaSave />}
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={toggleEditingMode}
            title="Edit all sections"
          >
            <FaEdit />
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={toggleCollapse}
          >
            {collapsed ? <FaEye /> : <FaEyeSlash />}
          </button>
        </div>
      </div>
      
      {!collapsed && (
        <div className="card-body">
          {/* Structure Info */}
          <div className="row mb-3">
            <div className="col-md-4">
              <small className="text-muted">
                <strong>Paper Type:</strong> {paperType?.name || structureData.paper_type}
              </small>
            </div>
            <div className="col-md-4">
              <small className="text-muted">
                <strong>Methodology:</strong> {getMethodologyDisplay()}
              </small>
            </div>
            <div className="col-md-4">
              <small className="text-muted">
                <strong>Enhanced:</strong> {structureData.has_methodology_sections ? 'Yes' : 'No'}
              </small>
            </div>
          </div>

          {/* Editable Structure List */}
          <div className="mb-3">
            <h6 className="text-primary mb-2">
              <FaList className="me-2" />
              Structure Sections
            </h6>
            
            <div className="list-group">
              {editableStructure.map((section, index) => (
                <div key={section.id} className="list-group-item">
                  {editingMode ? (
                    // Edit Mode for All Sections
                    <div>
                      <div className="row align-items-center">
                      <div className="col-md-4">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={section.title}
                          onChange={(e) => updateSection(section.id, { title: e.target.value })}
                          placeholder="Section title"
                        />
                      </div>
                      <div className="col-md-6">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={section.context}
                          onChange={(e) => updateSection(section.id, { context: e.target.value })}
                          placeholder="Context/focus (optional)"
                        />
                      </div>
                      <div className="col-md-2">
                        <div className="d-flex gap-1">
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => moveSection(section.id, 'up')}
                            disabled={index === 0}
                            title="Move up"
                          >
                            <FaArrowUp />
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => moveSection(section.id, 'down')}
                            disabled={index === editableStructure.length - 1}
                            title="Move down"
                          >
                            <FaArrowDown />
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeSection(section.id)}
                            title="Remove section"
                            disabled={section.isAdmin}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Subsections editing in edit mode */}
                    {section.subsections && section.subsections.length > 0 && (
                      <div className="mt-3 ps-4 border-start border-2 border-primary">
                        <small className="text-primary fw-semibold d-block mb-2">Subsections:</small>
                        {section.subsections.map((subsection, subIndex) => (
                          <div key={subIndex} className="row mb-2 align-items-center">
                            <div className="col-md-5">
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={subsection.subsection_title}
                                onChange={(e) => updateSubsection(section.id, subIndex, 'subsection_title', e.target.value)}
                                placeholder="Subsection title"
                              />
                            </div>
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={subsection.subsection_context}
                                onChange={(e) => updateSubsection(section.id, subIndex, 'subsection_context', e.target.value)}
                                placeholder="Subsection description"
                              />
                            </div>
                            <div className="col-md-1">
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => removeSubsection(section.id, subIndex)}
                                title="Remove subsection"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </div>
                        ))}
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => addSubsection(section.id)}
                          title="Add subsection"
                        >
                          <FaPlus className="me-1" />
                          Add Subsection
                        </button>
                      </div>
                    )}
                    </div>
                  ) : (
                    // View Mode
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center flex-grow-1">
                        <span className="badge bg-secondary me-2">{index + 1}</span>
                        <div className="flex-grow-1">
                          <span className="fw-semibold">{section.title}</span>
                          {section.context && (
                            <div className="text-muted small mt-1">
                              Focus: {section.context}
                            </div>
                          )}
                          {section.subsections && section.subsections.length > 0 && (
                            <div className="mt-2">
                              <small className="text-primary fw-semibold">Subsections:</small>
                              <ul className="list-unstyled ms-3 mb-0 small">
                                {section.subsections.map((subsection, subIndex) => (
                                  <li key={subIndex} className="mt-1">
                                    <span className="fw-medium">{subsection.subsection_title}</span>
                                    {subsection.subsection_context && (
                                      <span className="text-muted"> - {subsection.subsection_context}</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <div className="d-flex align-items-center gap-2 me-3">
                          {section.isAdmin && (
                            <span className="badge bg-secondary" style={{ minWidth: '50px' }}>Admin</span>
                          )}
                          {!section.isAdmin && section.category === 'Method' && (
                            <span className="badge bg-primary" style={{ minWidth: '50px' }}>Method</span>
                          )}
                          {!section.isAdmin && section.category === 'Intro' && (
                            <span className="badge bg-success" style={{ minWidth: '50px' }}>Intro</span>
                          )}
                          {!section.isAdmin && section.category === 'Summary' && (
                            <span className="badge bg-success" style={{ minWidth: '50px' }}>Summary</span>
                          )}
                          {!section.isAdmin && section.category === 'Analysis' && (
                            <span className="badge bg-warning" style={{ minWidth: '50px' }}>Analysis</span>
                          )}
                          {!section.isAdmin && section.category === 'Data' && (
                            <span className="badge bg-info" style={{ minWidth: '50px' }}>Data</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {editingMode && (
              <div className="mt-3 d-flex gap-2">
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => setEditingMode(false)}
                >
                  <FaSave className="me-1" />
                  Save Changes
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setEditingMode(false)}
                >
                  <FaTimes className="me-1" />
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Methodology Integration Notice */}
          {structureData.has_methodology_sections && (
            <div className="alert alert-success">
              <small>
                <strong>Structure Enhanced:</strong> Your selected methodology has been integrated into the paper structure. 
                Methodology-specific sections have been added to support your research approach.
              </small>
            </div>
          )}

          {/* Paper Type Info */}
          <div className="mt-3">
            <details className="text-muted">
              <summary className="cursor-pointer">
                <small><strong>About this structure</strong></small>
              </summary>
              <small className="mt-2 d-block">
                This structure is specifically designed for <strong>{paperType?.name || structureData.paper_type}</strong> papers
                {structureData.has_methodology_sections && (
                  <span> with integrated <strong>{getMethodologyDisplay()}</strong> methodology sections</span>
                )}. 
                You can customize section titles, add context/focus areas, adjust percentage allocations, 
                and reorder sections to match your research needs. The outline generator will use 
                this customized structure as a foundation.
              </small>
            </details>
          </div>

          {/* Structure Summary */}
          <div className="mt-3 p-2 bg-light rounded">
            <div className="row text-center">
              <div className="col-md-3">
                <small className="text-muted">
                  <strong>Total Sections:</strong><br/>
                  {editableStructure.length}
                </small>
              </div>
              <div className="col-md-3">
                <small className="text-muted">
                  <strong>Content Sections:</strong><br/>
                  {editableStructure.filter(s => !s.isAdmin).length}
                </small>
              </div>
              <div className="col-md-3">
                <small className="text-muted">
                  <strong>Method Sections:</strong><br/>
                  {editableStructure.filter(s => s.isMethodology).length}
                </small>
              </div>
              <div className="col-md-3">
                <small className="text-muted">
                  <strong>Auto-Save:</strong>
                  <label className="form-check-label d-flex align-items-center ms-2">
                    <input
                      type="checkbox"
                      className="form-check-input me-1"
                      checked={autoSaveEnabled}
                      onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                    />
                    {autoSaveEnabled ? 'On' : 'Off'}
                  </label>
                  {lastSaved && (
                    <div className="mt-1">
                      <button
                        className="btn btn-xs btn-outline-danger"
                        onClick={deleteSavedStructure}
                        title="Clear saved data"
                        style={{ fontSize: '10px', padding: '1px 4px' }}
                      >
                        Clear Saved
                      </button>
                    </div>
                  )}
                </small>
              </div>
            </div>
          </div>

          {/* Add the Generate Sections and Generate Outline Framework buttons at the bottom */}
          <div className="mt-4 d-flex gap-3">
            <button 
              className="btn btn-outline-primary"
              onClick={generateSections}
              disabled={generatingSections || !paperType?.id || !methodology}
            >
              {generatingSections ? (
                <>
                  <FaSpinner className="fa-spin me-2" />
                  Generating Sections...
                </>
              ) : sectionsGenerated ? (
                <>
                  <FaCheck className="me-2" />
                  Sections Generated
                </>
              ) : (
                'Generate Sections'
              )}
            </button>
            
            <button 
              className="btn btn-primary"
              onClick={onGenerateOutline}
              disabled={loading || hasGenerated}
            >
              {loading ? (
                <>
                  <FaSpinner className="fa-spin me-2" />
                  Generating Framework...
                </>
              ) : hasGenerated ? (
                <>
                  <FaCheck className="me-2" />
                  Framework Generated
                </>
              ) : (
                'Generate Outline Framework'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaperStructurePreview;