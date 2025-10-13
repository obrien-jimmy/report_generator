import { useState, useEffect } from 'react';
import { FaPlay, FaSpinner, FaCheckCircle, FaExpand, FaEye, FaSearch, FaCog, FaEdit, FaArrowRight, FaInfoCircle, FaLink, FaPlus, FaMinus } from 'react-icons/fa';
import axios from 'axios';
import Modal from './Modal';

const OutlineDraft2 = ({
  outlineData,
  finalThesis,
  methodology,
  selectedPaperType,
  draftData,
  onOutlineDraft2Complete,
  preIdentifiedDataSections = null // Add this prop for pre-identified sections
}) => {
  // Phase 1: Outline Refinement state
  const [identifiedSections, setIdentifiedSections] = useState([]);
  const [refinedOutlines, setRefinedOutlines] = useState([]);
  const [outlineRefining, setOutlineRefining] = useState(false);
  const [refineComplete, setRefineComplete] = useState(false);
  
  // Phase 2: Building state  
  const [builtSections, setBuiltSections] = useState([]);
  const [buildingLoading, setBuildingLoading] = useState(false);
  const [selectedSubsectionIndices, setSelectedSubsectionIndices] = useState([]);
  const [completionStatus, setCompletionStatus] = useState('');
  const [continuityNotes, setContinuityNotes] = useState([]);
  
  // Additional state variables used in the component
  const [errorMessage, setErrorMessage] = useState('');
  const [currentBuildingSection, setCurrentBuildingSection] = useState(null);
  
  // Missing state variables for analysis functionality
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sectionPurposes, setSectionPurposes] = useState([]);
  const [recommendedOrder, setRecommendedOrder] = useState([]);
  const [analysisSummary, setAnalysisSummary] = useState('');
  
  // New enhanced functionality state
  const [masterOutlines, setMasterOutlines] = useState([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipData, setTooltipData] = useState(null);
  const [expandedOutlines, setExpandedOutlines] = useState({});
  const [editingOutline, setEditingOutline] = useState(null);
  const [processedQAData, setProcessedQAData] = useState([]);
  
  // UI state
  const [selectedSection, setSelectedSection] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(1); // Always start with identifying sections from outline/draft

  // Initialize data sections and start with Phase 1 (Outline Refinement)
  useEffect(() => {
    const initializeDataSections = () => {
      setIdentifiedSections([]);
      setRefinedOutlines([]);
      setBuiltSections([]);
      setCurrentPhase(1);
      setErrorMessage('');
      setRefineComplete(false);
      
      // Extract data sections directly from draftData without backend calls
      if (outlineData && draftData) {
        const draftOutline = draftData.outline || draftData;
        const extractedSections = extractDataSectionsSimple(draftOutline);
        if (extractedSections.length > 0) {
          setIdentifiedSections(extractedSections);
          // Automatically prepare refined outlines for editing
          prepareRefinedOutlines(extractedSections);
        }
      }
    };
    
    initializeDataSections();
  }, [outlineData, draftData]);

  // Simple function to extract data sections (Component 1 & 2) directly
  const extractDataSectionsSimple = (draft1Data) => {
    if (!draft1Data || !Array.isArray(draft1Data)) return [];
    
    console.log('OutlineDraft2: Extracting data sections from draft1Data:', draft1Data);
    
    // Filter for specific data analysis sections (the two main content sections)
    const dataSections = draft1Data.filter(section => {
      if (!section.section_title || !section.section_context || section.is_administrative) return false;
      const titleLower = section.section_title.toLowerCase();
      // Look for the two main analytical sections
      return (titleLower.includes('current us cybersecurity framework') || 
              titleLower.includes('policy effectiveness and strategic gaps'));
    });
    
    console.log('OutlineDraft2: Found data sections:', dataSections);
    return dataSections;
  };

  // Prepare refined outlines for editing with enhanced master outline generation
  const prepareRefinedOutlines = (sections) => {
    const refinedOutlines = sections.map(section => ({
      section_title: section.section_title,
      section_context: section.section_context,
      subsections: section.subsections || [],
      combined_outline: section.combined_outline || [],
      original_section: section
    }));
    
    setRefinedOutlines(refinedOutlines);
    
    // Process Q&A data and generate master outlines
    const masterOutlineData = generateMasterOutlines(sections);
    setMasterOutlines(masterOutlineData);
    
    setRefineComplete(true);
  };

  // Generate comprehensive purpose explanation for tooltip
  const generatePurposeExplanation = (subsection, section, thesis, methodology) => {
    const subsectionContext = subsection.subsection_context || '';
    const sectionContext = section.section_context || '';
    
    return {
      subsectionPurpose: `This subsection "${subsection.subsection_title}" ${subsectionContext}`,
      sectionConnection: `It supports the broader section "${section.section_title}" which ${sectionContext}`,
      methodologyAlignment: `This aligns with the ${typeof methodology === 'object' ? methodology.methodologyType : methodology} methodology by providing ${getMethodologyConnection(subsection, methodology)}`,
      thesisSupport: `Ultimately, this contributes to the thesis by ${getThesisConnection(subsection, thesis)}`,
      researchQuestions: subsection.questions?.length || 0,
      citationCount: subsection.questions?.reduce((acc, q) => acc + (q.citations?.length || 0), 0) || 0
    };
  };

  // Helper function to determine methodology connection
  const getMethodologyConnection = (subsection, methodology) => {
    if (typeof methodology === 'object' && methodology.methodologyType) {
      switch (methodology.methodologyType.toLowerCase()) {
        case 'mixed methods':
          return 'quantitative and qualitative data sources for comprehensive analysis';
        case 'qualitative':
          return 'in-depth qualitative insights and thematic analysis';
        case 'quantitative':
          return 'statistical data and empirical evidence';
        default:
          return 'systematic analytical framework and evidence-based approach';
      }
    }
    return 'structured analytical approach to understanding the research problem';
  };

  // Helper function to determine thesis connection
  const getThesisConnection = (subsection, thesis) => {
    const title = subsection.subsection_title?.toLowerCase() || '';
    if (title.includes('threat') || title.includes('vulnerability')) {
      return 'identifying and analyzing critical vulnerabilities that necessitate policy reassessment';
    } else if (title.includes('deterrence') || title.includes('defense')) {
      return 'evaluating current defense strategies and their effectiveness';
    } else if (title.includes('cooperation') || title.includes('diplomacy')) {
      return 'examining international cooperation mechanisms essential for comprehensive cybersecurity';
    } else if (title.includes('policy') || title.includes('framework')) {
      return 'assessing current policy frameworks and identifying areas for strategic improvement';
    }
    return 'providing essential evidence and analysis to support the need for comprehensive cybersecurity policy reassessment';
  };

  // Process all Q&A data and generate master outlines
  const generateMasterOutlines = (sections) => {
    return sections.map(section => ({
      section_title: section.section_title,
      section_context: section.section_context,
      master_subsections: section.subsections?.map((subsection, subsectionIndex) => {
        const allQuestions = subsection.questions || [];
        const masterOutline = generateMasterOutlineFromQA(allQuestions, subsection);
        
        return {
          subsection_title: subsection.subsection_title,
          subsection_context: subsection.subsection_context,
          master_outline: masterOutline,
          question_count: allQuestions.length,
          citation_count: allQuestions.reduce((acc, q) => acc + (q.citations?.length || 0), 0),
          reference_path: `Section ${section.section_title} → Subsection ${subsection.subsection_title}`,
          original_questions: allQuestions
        };
      }) || []
    }));
  };

  // Generate hierarchical master outline from Q&A data
  const generateMasterOutlineFromQA = (questions, subsection) => {
    const outline = [];
    
    // Level I: Main subsection framework
    outline.push({
      level: 'I',
      type: 'roman',
      content: `${subsection.subsection_title} Analysis Framework`,
      editable: true,
      reference: `Original subsection: ${subsection.subsection_title}`,
      children: []
    });

    // Level A, B, C: Major themes from questions
    questions.forEach((question, qIndex) => {
      const thematicArea = extractThematicArea(question.question);
      const childItem = {
        level: String.fromCharCode(65 + qIndex), // A, B, C, etc.
        type: 'capital',
        content: thematicArea,
        editable: true,
        reference: `Question ${qIndex + 1}: ${question.question.substring(0, 100)}...`,
        children: []
      };

      // Level 1, 2, 3: Key points from citations
      const keyPoints = extractKeyPointsFromCitations(question.citations || []);
      keyPoints.forEach((point, pIndex) => {
        const pointItem = {
          level: `${pIndex + 1}`,
          type: 'number',
          content: point.content,
          editable: true,
          reference: `Citation: ${point.source}`,
          children: []
        };

        // Level a, b, c: Supporting details
        point.details.forEach((detail, dIndex) => {
          pointItem.children.push({
            level: String.fromCharCode(97 + dIndex), // a, b, c, etc.
            type: 'lowercase',
            content: detail.content,
            editable: true,
            reference: `Detail from: ${detail.source}`,
            children: []
          });
        });

        childItem.children.push(pointItem);
      });

      outline[0].children.push(childItem);
    });

    return outline;
  };

  // Extract thematic area from question
  const extractThematicArea = (question) => {
    const lowerQuestion = question.toLowerCase();
    if (lowerQuestion.includes('threat') || lowerQuestion.includes('vulnerability')) {
      return 'Cyber Threat Landscape and Vulnerability Assessment';
    } else if (lowerQuestion.includes('deterrence') || lowerQuestion.includes('defense')) {
      return 'Deterrence Strategies and Defense Mechanisms';
    } else if (lowerQuestion.includes('cooperation') || lowerQuestion.includes('international')) {
      return 'International Cooperation and Collaborative Frameworks';
    } else if (lowerQuestion.includes('policy') || lowerQuestion.includes('effective')) {
      return 'Policy Effectiveness and Strategic Implementation';
    } else if (lowerQuestion.includes('resilience') || lowerQuestion.includes('infrastructure')) {
      return 'Critical Infrastructure Resilience and Protection';
    }
    return 'Comprehensive Analysis and Strategic Assessment';
  };

  // Extract key points from citations
  const extractKeyPointsFromCitations = (citations) => {
    const points = [];
    
    citations.forEach((citation, index) => {
      const mainPoint = {
        content: `${citation.description.substring(0, 150)}...`,
        source: citation.apa.split('(')[0].trim(), // Extract author name
        details: []
      };

      // Add methodology points as details
      if (citation.methodologyPoints && citation.methodologyPoints.length > 0) {
        citation.methodologyPoints.forEach(point => {
          mainPoint.details.push({
            content: point,
            source: `Methodology alignment: ${citation.apa.split('(')[0].trim()}`
          });
        });
      }

      // Add categories as additional context
      if (citation.categories && citation.categories.length > 0) {
        mainPoint.details.push({
          content: `Research categories: ${citation.categories.join(', ')}`,
          source: `Source categorization: ${citation.apa.split('(')[0].trim()}`
        });
      }

      points.push(mainPoint);
    });

    return points.slice(0, 5); // Limit to 5 main points per question
  };

  // Handler functions for enhanced functionality
  const showSubsectionTooltip = (section, subsection, sectionIndex, subIndex) => {
    console.log('showSubsectionTooltip called with:', { section, subsection, sectionIndex, subIndex });
    const purposeData = generatePurposeExplanation(subsection, section, finalThesis, methodology);
    console.log('Generated purpose data:', purposeData);
    setTooltipData({
      ...purposeData,
      sectionIndex,
      subIndex,
      subsection_title: subsection.subsection_title,
      section_title: section.section_title
    });
    setShowTooltip(true);
    console.log('Tooltip should now be visible');
  };

  const toggleOutlineExpansion = (sectionIndex, subIndex) => {
    const key = `${sectionIndex}-${subIndex}`;
    setExpandedOutlines(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSubsectionEdit = (sectionIndex, subIndex, field, newValue) => {
    setRefinedOutlines(prev => 
      prev.map((section, sIdx) => 
        sIdx === sectionIndex 
          ? {
              ...section,
              subsections: section.subsections.map((sub, subIdx) =>
                subIdx === subIndex ? { ...sub, [field]: newValue } : sub
              )
            }
          : section
      )
    );
  };

  const handleOutlineItemEdit = (sectionIndex, subIndex, outlineIndex, newValue) => {
    setMasterOutlines(prev =>
      prev.map((section, sIdx) =>
        sIdx === sectionIndex
          ? {
              ...section,
              master_subsections: section.master_subsections.map((subsection, subIdx) =>
                subIdx === subIndex
                  ? {
                      ...subsection,
                      master_outline: updateOutlineItem(subsection.master_outline, outlineIndex, newValue)
                    }
                  : subsection
              )
            }
          : section
      )
    );
  };

  const updateOutlineItem = (outline, path, newValue) => {
    // This function would recursively update nested outline items
    // Implementation depends on the specific path structure
    return outline; // Simplified for now
  };

  const renderMasterOutline = (outlineItems, sectionIndex, subIndex) => {
    if (!outlineItems || outlineItems.length === 0) return null;

    return (
      <div className="outline-hierarchy">
        {outlineItems.map((item, index) => (
          <div key={index} className={`outline-item level-${item.type}`} style={{ marginLeft: `${getIndentLevel(item.type)}px` }}>
            <div className="d-flex align-items-start mb-2">
              <span className="outline-marker me-2 fw-bold text-primary">
                {item.level}.
              </span>
              <div className="flex-grow-1">
                <div className="d-flex align-items-center mb-1">
                  <textarea
                    className="form-control form-control-sm"
                    rows="2"
                    value={item.content}
                    onChange={(e) => handleOutlineItemEdit(sectionIndex, subIndex, [index], e.target.value)}
                    style={{ fontSize: getFontSize(item.type) }}
                  />
                  <button
                    className="btn btn-outline-secondary btn-sm ms-2"
                    title={item.reference}
                  >
                    <FaLink />
                  </button>
                </div>
                <small className="text-muted">{item.reference}</small>
              </div>
            </div>
            
            {/* Render children recursively */}
            {item.children && item.children.length > 0 && (
              <div className="children-items">
                {item.children.map((child, childIndex) => (
                  <div key={childIndex} className={`outline-item level-${child.type}`} style={{ marginLeft: `${getIndentLevel(child.type)}px` }}>
                    <div className="d-flex align-items-start mb-2">
                      <span className="outline-marker me-2 fw-bold text-secondary">
                        {child.level}.
                      </span>
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center mb-1">
                          <textarea
                            className="form-control form-control-sm"
                            rows="1"
                            value={child.content}
                            onChange={(e) => handleOutlineItemEdit(sectionIndex, subIndex, [index, childIndex], e.target.value)}
                            style={{ fontSize: getFontSize(child.type) }}
                          />
                          <button
                            className="btn btn-outline-secondary btn-sm ms-2"
                            title={child.reference}
                          >
                            <FaLink />
                          </button>
                        </div>
                        <small className="text-muted">{child.reference}</small>
                        
                        {/* Render grandchildren */}
                        {child.children && child.children.length > 0 && (
                          <div className="grandchildren-items">
                            {child.children.map((grandchild, grandIndex) => (
                              <div key={grandIndex} className={`outline-item level-${grandchild.type}`} style={{ marginLeft: `${getIndentLevel(grandchild.type)}px` }}>
                                <div className="d-flex align-items-start mb-1">
                                  <span className="outline-marker me-2 text-muted">
                                    {grandchild.level}.
                                  </span>
                                  <div className="flex-grow-1">
                                    <div className="d-flex align-items-center">
                                      <textarea
                                        className="form-control form-control-sm"
                                        rows="1"
                                        value={grandchild.content}
                                        onChange={(e) => handleOutlineItemEdit(sectionIndex, subIndex, [index, childIndex, grandIndex], e.target.value)}
                                        style={{ fontSize: getFontSize(grandchild.type) }}
                                      />
                                      <button
                                        className="btn btn-outline-secondary btn-sm ms-2"
                                        title={grandchild.reference}
                                      >
                                        <FaLink />
                                      </button>
                                    </div>
                                    <small className="text-muted">{grandchild.reference}</small>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const getIndentLevel = (type) => {
    switch (type) {
      case 'roman': return 0;
      case 'capital': return 20;
      case 'number': return 40;
      case 'lowercase': return 60;
      case 'roman_lower': return 80;
      default: return 0;
    }
  };

  const getFontSize = (type) => {
    switch (type) {
      case 'roman': return '1.1rem';
      case 'capital': return '1rem';
      case 'number': return '0.95rem';
      case 'lowercase': return '0.9rem';
      case 'roman_lower': return '0.85rem';
      default: return '0.9rem';
    }
  };

  // Phase 1: Analyze and identify data sections
      const handleAnalyzeDataSections = async () => {
        if (!outlineData || !draftData) {
            setErrorMessage('Please complete the outline framework and draft phases first.');
            return;
        }

        setIsAnalyzing(true);
        setErrorMessage('');
        
        try {
            // Extract the outline array from draftData if it's wrapped in an object
            const draftOutline = draftData.outline || draftData;
            
            const requestData = {
                outline_framework: outlineData || [],
                outline_draft1: Array.isArray(draftOutline) ? draftOutline : [draftOutline],
                thesis: finalThesis || '',
                methodology: typeof methodology === 'string' ? methodology : JSON.stringify(methodology || ''),
                paper_type: 'research'
            };

            console.log('Sending analysis request:', requestData);
            
            const response = await axios.post('http://localhost:8000/analyze_data_sections', requestData);
            console.log('Analysis response:', response.data);
            
            setIdentifiedSections(response.data.identified_sections);
            setSectionPurposes(response.data.section_purposes);
            setRecommendedOrder(response.data.recommended_build_order);
            setAnalysisSummary(response.data.analysis_summary);
            setCurrentPhase(2);
            
        } catch (error) {
            console.error('Analysis error:', error);
            console.error('Error response:', error.response?.data);
            const errorMessage = error.response?.data?.detail || 
                                 (error.response?.data?.message) ||
                                 'Failed to analyze data sections. Please try again.';
            setErrorMessage(errorMessage);
        } finally {
            setIsAnalyzing(false);
        }
    };

  // Handle outline editing
  const handleOutlineEdit = (sectionIndex, field, newValue) => {
    setRefinedOutlines(prev => 
      prev.map((section, index) => 
        index === sectionIndex 
          ? { ...section, [field]: newValue }
          : section
      )
    );
  };





  const proceedToBuildPhase = () => {
    if (refinedOutlines.length === 0) {
      setErrorMessage('Please refine outlines before proceeding to build phase.');
      return;
    }
    setCurrentPhase(2);
  };

  // Phase 2: Build selected sections into academic prose
  const buildDataSections = async (sectionIndices = null) => {
    if (refinedOutlines.length === 0) {
      setErrorMessage('No refined outlines available for building.');
      return;
    }

    setBuildingLoading(true);
    setErrorMessage(''); // Clear any previous error messages
    
    try {
      const indicesToBuild = sectionIndices || selectedSectionIndices;
      
      // Extract the outline array from draftData if it's wrapped in an object
      const draftOutline = draftData.outline || draftData;
      
      // Convert refined outlines back to the expected format for the backend
      const sectionsForBuilding = refinedOutlines.map(refined => ({
        title: refined.title,
        tag: refined.tag,
        outline: refined.refinedOutline, // Use the refined outline instead of original
        academic_purpose: "Convert refined outline to academic prose based on thesis and methodology"
      }));
      
      const response = await axios.post('http://localhost:8000/build_data_sections', {
        identified_data_sections: sectionsForBuilding,
        outline_framework: outlineData || [],
        outline_draft1: Array.isArray(draftOutline) ? draftOutline : [draftOutline],
        thesis: finalThesis,
        methodology: typeof methodology === 'string' ? methodology : JSON.stringify(methodology),
        paper_type: selectedPaperType?.id || 'analytical',
        target_section_indices: indicesToBuild
      });

      setBuiltSections([...builtSections, ...response.data.built_sections]);
      setCompletionStatus(response.data.completion_status);
      setContinuityNotes(response.data.continuity_notes);
      
      if (response.data.completion_status === 'complete') {
        setCurrentPhase(3);
        if (onOutlineDraft2Complete) {
          onOutlineDraft2Complete(response.data);
        }
        // Show success message
        alert('Data sections completed! Your factual evidence has been converted to academic prose. The next phase will use this data foundation for analysis.');
      }
      
    } catch (error) {
      console.error('Error building data sections:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message ||
                          `Server error (${error.response?.status}): ${error.message}`;
      
      setErrorMessage(errorMessage);
      alert(`Failed to build data sections: ${errorMessage}`);
    } finally {
      setBuildingLoading(false);
    }
  };

  // Section selection handlers
  const toggleSectionSelection = (index) => {
    setSelectedSectionIndices(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const selectAllSections = () => {
    setSelectedSectionIndices(refinedOutlines.map((_, index) => index));
  };

  const clearSelection = () => {
    setSelectedSectionIndices([]);
  };

  // Modal handlers
  const viewSection = (section) => {
    setSelectedSection(section);
    setShowModal(true);
  };

  const openCitationModal = (citation) => {
    setSelectedCitation(citation);
  };

  const closeCitationModal = () => {
    setSelectedCitation(null);
  };

  return (
    <div className="outline-draft-2">
      <div className="d-flex align-items-center gap-3 mb-3">
        <h3 className="mb-0">Data Section Builder</h3>
        <span className="badge bg-info">
          Phase {currentPhase} of 3
        </span>
      </div>

      <div className="alert alert-primary">
        <h6>📊 Data Section Builder</h6>
        <p className="mb-2">
          Transform your data sections from the combined outline into refined, structured academic prose. 
          First refine the outline structure to ensure all major considerations from your best sources are captured, 
          then convert each subsection into scholarly prose based on your thesis and methodology.
        </p>
        <div className="row">
          <div className="col-md-4">
            <strong>Phase 1:</strong> Refine Data Sections (Outline)
          </div>
          <div className="col-md-4">
            <strong>Phase 2:</strong> Build Academic Prose (Subsection by Subsection)
          </div>
          <div className="col-md-4">
            <strong>Phase 3:</strong> Review & Integration
          </div>
        </div>
      </div>

      {/* Phase 1: Outline Refinement */}
      {currentPhase === 1 && (
        <div className="phase-1">
          {!outlineData || !draftData ? (
            <div className="alert alert-warning">
              <strong>Missing Data:</strong> Please complete the Outline Framework and Outline Draft 1 phases first.
            </div>
          ) : refinedOutlines.length === 0 ? (
            <div className="alert alert-info">
              <strong>No Data Sections Found:</strong> No data sections requiring outline refinement were found. 
              This might indicate that your outline structure is already complete.
            </div>
          ) : (
            <>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h4>Phase 1: Refine Data Section Outlines</h4>
                  <p className="text-muted mb-0">
                    Found <strong>{refinedOutlines.length} data sections</strong>. 
                    Edit section headers, subsection headers, and outline points below.
                  </p>
                </div>
                <button 
                  className="btn btn-success"
                  onClick={proceedToBuildPhase}
                  disabled={!refineComplete}
                >
                  <FaArrowRight className="me-2" />
                  Proceed to Build Phase
                </button>
              </div>
              
              {refinedOutlines.map((section, sectionIndex) => {
                const romanNumeral = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][sectionIndex] || `${sectionIndex + 1}`;
                
                return (
                  <div key={sectionIndex} className="mb-5">
                    <div className="outline-structure">
                      {/* Main Section Header */}
                      <div className="section-header mb-3">
                        <div className="d-flex align-items-center mb-2">
                          <span className="section-number me-3 text-primary fw-bold" style={{ fontSize: '1.5rem', minWidth: '40px' }}>
                            {romanNumeral}.
                          </span>
                          <input
                            type="text"
                            className="form-control form-control-lg fw-bold"
                            value={section.section_title}
                            onChange={(e) => handleOutlineEdit(sectionIndex, 'section_title', e.target.value)}
                            placeholder="Section Title"
                            style={{ fontSize: '1.25rem' }}
                          />
                        </div>
                      </div>

                      {/* Subsections with proper hierarchy */}
                      {section.subsections && section.subsections.length > 0 && (
                        <div className="subsections-hierarchy ms-4">
                          {section.subsections.map((subsection, subIndex) => {
                            const letter = String.fromCharCode(65 + subIndex); // A, B, C, etc.
                            
                            return (
                              <div key={subIndex} className="subsection-item mb-3">
                                {/* Subsection Title with buttons on the same line */}
                                <div className="d-flex align-items-center mb-2">
                                  <span className="subsection-number me-3 text-secondary fw-bold" style={{ fontSize: '1.2rem', minWidth: '30px' }}>
                                    {letter}.
                                  </span>
                                  <input
                                    type="text"
                                    className="form-control fw-bold"
                                    value={subsection.subsection_title || subsection.title || ''}
                                    onChange={(e) => handleSubsectionEdit(sectionIndex, subIndex, 'subsection_title', e.target.value)}
                                    placeholder="Subsection Title"
                                  />
                                  {masterOutlines[sectionIndex]?.master_subsections?.[subIndex] && (
                                    <button
                                      className="btn btn-sm btn-outline-secondary ms-2"
                                      onClick={() => toggleOutlineExpansion(sectionIndex, subIndex)}
                                      title="Toggle master outline"
                                    >
                                      {expandedOutlines[`${sectionIndex}-${subIndex}`] ? <FaMinus /> : <FaPlus />}
                                    </button>
                                  )}
                                  <button
                                    className="btn btn-outline-info btn-sm ms-2"
                                    onClick={() => showSubsectionTooltip(section, subsection, sectionIndex, subIndex)}
                                    title="View comprehensive purpose and methodology alignment"
                                  >
                                    <FaInfoCircle />
                                  </button>
                                </div>

                                {/* Subsection Context - aligned with subsection title text */}
                                <div style={{ marginLeft: '42px' }}>
                                  <textarea
                                    className="form-control mb-2"
                                    rows="3"
                                    value={subsection.subsection_context || subsection.context || ''}
                                    onChange={(e) => handleSubsectionEdit(sectionIndex, subIndex, 'subsection_context', e.target.value)}
                                    placeholder="Subsection context and description"
                                  />
                                  
                                  {/* Master Outline Information */}
                                  {masterOutlines[sectionIndex]?.master_subsections?.[subIndex] && (
                                    <div className="master-outline-info mb-2">
                                      <small className="text-muted">
                                        Master Outline: {masterOutlines[sectionIndex].master_subsections[subIndex].question_count} questions, 
                                        {masterOutlines[sectionIndex].master_subsections[subIndex].citation_count} citations
                                      </small>
                                    </div>
                                  )}

                                  {/* Expanded Master Outline Display */}
                                  {expandedOutlines[`${sectionIndex}-${subIndex}`] && masterOutlines[sectionIndex]?.master_subsections?.[subIndex] && (
                                    <div className="hierarchical-outline bg-light p-3 rounded mb-2">
                                      {renderMasterOutline(masterOutlines[sectionIndex].master_subsections[subIndex].master_outline, sectionIndex, subIndex)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Combined Outline Points with proper indentation */}
                      {section.combined_outline && section.combined_outline.length > 0 && (
                        <div className="combined-outline-hierarchy ms-5 mt-3">
                          {section.combined_outline.map((outlineItem, outlineIndex) => {
                            // Create proper outline numbering: 1, 2, 3... then a), b), c)... then i, ii, iii... then 1), 2), 3)...
                            let outlineNumber;
                            let indentLevel = 0;
                            
                            if (outlineIndex < 9) {
                              outlineNumber = `${outlineIndex + 1}.`;
                              indentLevel = 0;
                            } else if (outlineIndex < 18) {
                              outlineNumber = `${String.fromCharCode(97 + (outlineIndex - 9))})`;
                              indentLevel = 1;
                            } else if (outlineIndex < 27) {
                              const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix'];
                              outlineNumber = `${romanNumerals[outlineIndex - 18] || `${outlineIndex - 17}`}.`;
                              indentLevel = 2;
                            } else {
                              outlineNumber = `${outlineIndex - 26})`;
                              indentLevel = 3;
                            }
                            
                            return (
                              <div 
                                key={outlineIndex} 
                                className="outline-point mb-2"
                                style={{ marginLeft: `${indentLevel * 20}px` }}
                              >
                                <div className="d-flex align-items-center">
                                  <span className="outline-number me-2 text-muted fw-bold" style={{ minWidth: '30px', fontSize: '0.9rem' }}>
                                    {outlineNumber}
                                  </span>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={typeof outlineItem === 'string' ? outlineItem : outlineItem.text || outlineItem.content || ''}
                                    onChange={(e) => {
                                      const newOutline = [...section.combined_outline];
                                      newOutline[outlineIndex] = e.target.value;
                                      handleOutlineEdit(sectionIndex, 'combined_outline', newOutline);
                                    }}
                                    placeholder="Outline point"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    {/* Divider between sections */}
                    {sectionIndex < refinedOutlines.length - 1 && (
                      <hr className="my-5 border-2" />
                    )}
                  </div>
                );
              })}
            </>
          )}
          
          {errorMessage && (
            <div className="alert alert-danger mt-3">
              <strong>Error:</strong> {errorMessage}
            </div>
          )}
        </div>
      )}

      {/* Phase 2: Section Building */}
      {currentPhase === 2 && (
        <div className="phase-2">
          {/* Error Message */}
          {errorMessage && (
            <div className="alert alert-danger mb-4">
              <h6>Error</h6>
              <p className="mb-0">{errorMessage}</p>
            </div>
          )}

          {/* Analysis Summary */}
          {analysisSummary && (
            <div className="alert alert-success mb-4">
              <h6>Analysis Complete</h6>
              <p className="mb-0">{analysisSummary}</p>
            </div>
          )}

          {/* Refined Sections Ready for Building */}
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <FaCog className="me-2" />
                Phase 2: Build Academic Prose from Refined Outlines
              </h5>
              <div>
                <button 
                  className="btn btn-sm btn-outline-secondary me-2" 
                  onClick={selectAllSections}
                >
                  Select All
                </button>
                <button 
                  className="btn btn-sm btn-outline-secondary" 
                  onClick={clearSelection}
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="card-body">
              <p>
                Found <strong>{refinedOutlines.length} refined sections</strong>. 
                Select sections to convert from refined outlines to academic prose (recommended: 1-2 at a time).
              </p>
              
              {refinedOutlines.map((section, index) => (
                <div key={index} className="mb-3">
                  <div className="form-check">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id={`section-${index}`}
                      checked={selectedSectionIndices.includes(index)}
                      onChange={() => toggleSectionSelection(index)}
                    />
                    <label className="form-check-label" htmlFor={`section-${index}`}>
                      <strong>{section.title}</strong>
                    </label>
                  </div>
                  <div className="ms-4 mt-2">
                    <div className="small text-muted mb-2">
                      <strong>Section:</strong> {section.tag}
                    </div>
                    <div className="small">
                      <strong>Refined Outline Preview:</strong>
                      <div className="bg-light p-2 rounded mt-1" style={{ maxHeight: '100px', overflow: 'hidden' }}>
                        <pre style={{ fontSize: '0.8em', margin: 0 }}>
                          {section.refinedOutline.slice(0, 200)}{section.refinedOutline.length > 200 ? '...' : ''}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="mt-3">
                <button
                  className="btn btn-success"
                  onClick={() => buildDataSections()}
                  disabled={buildingLoading || selectedSectionIndices.length === 0}
                >
                  {buildingLoading ? (
                    <>
                      <FaSpinner className="fa-spin me-2" />
                      Building Sections...
                    </>
                  ) : (
                    <>
                      <FaPlay className="me-2" />
                      Build Selected Sections ({selectedSectionIndices.length})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Built Sections Preview */}
          {builtSections.length > 0 && (
            <div className="built-sections">
              <h5>Built Sections Preview</h5>
              {builtSections.map((section, index) => (
                <div key={index} className="card mb-3">
                  <div className="card-header">
                    <h6 className="mb-0">
                      {section.section_number}. {section.section_title}
                    </h6>
                  </div>
                  <div className="card-body">
                    <p className="text-muted">{section.section_purpose}</p>
                    <div className="row">
                      <div className="col-md-8">
                        <h6>Subsections ({section.subsections.length})</h6>
                        {section.subsections.slice(0, 2).map((subsection, subIndex) => (
                          <div key={subIndex} className="mb-3 p-3 bg-light rounded">
                            <strong>{subsection.subsection_number}. {subsection.subsection_title}</strong>
                            <div className="mt-2 small">
                              {subsection.academic_content.substring(0, 200)}...
                            </div>
                          </div>
                        ))}
                        {section.subsections.length > 2 && (
                          <div className="text-muted">
                            + {section.subsections.length - 2} more subsections
                          </div>
                        )}
                      </div>
                      <div className="col-md-4">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => viewSection(section)}
                        >
                          <FaEye className="me-1" />
                          View Full Section
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {continuityNotes.length > 0 && (
                <div className="alert alert-info">
                  <h6>Continuity Notes</h6>
                  <ul className="mb-0">
                    {continuityNotes.map((note, index) => (
                      <li key={index}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Phase 3: Review & Integration */}
      {currentPhase === 3 && (
        <div className="phase-3">
          <div className="alert alert-success">
            <h6>
              <FaCheckCircle className="me-2" />
              Data Sections Complete - Ready for Analysis Phase
            </h6>
            <p className="mb-0">
              Your factual data and evidence have been successfully converted to academic prose. 
              These data sections will now serve as the foundation for the analysis phase, where 
              interpretations, insights, and conclusions will be drawn from this evidence.
            </p>
          </div>

          <div className="built-sections-final">
            {builtSections.map((section, index) => (
              <div key={index} className="card mb-4">
                <div className="card-header">
                  <h5 className="mb-0">
                    {section.section_number}. {section.section_title}
                  </h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <strong>Purpose:</strong> {section.section_purpose}
                  </div>
                  
                  <h6>Subsections</h6>
                  {section.subsections.map((subsection, subIndex) => (
                    <div key={subIndex} className="mb-4 border-start border-3 border-primary ps-3">
                      <h6>{subsection.subsection_number}. {subsection.subsection_title}</h6>
                      <div 
                        className="academic-content"
                        dangerouslySetInnerHTML={{ 
                          __html: subsection.academic_content.replace(/\[(\d+)\]/g, 
                            '<sup><strong>[$1]</strong></sup>'
                          )
                        }}
                      />
                      
                      {subsection.data_sources.length > 0 && (
                        <div className="mt-2">
                          <small className="text-muted">
                            <strong>Data Sources:</strong> {subsection.data_sources.join(', ')}
                          </small>
                        </div>
                      )}
                      
                      {subsection.citations.length > 0 && (
                        <div className="mt-2">
                          <small className="text-muted">
                            <strong>Citations:</strong> {subsection.citations.length} sources
                          </small>
                        </div>
                      )}
                      
                      {subsection.transition_to_next && (
                        <div className="mt-2 fst-italic text-muted">
                          {subsection.transition_to_next}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <div className="mt-3 p-3 bg-light rounded">
                    <strong>Section Summary:</strong> {section.section_summary}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section Detail Modal */}
      {showModal && selectedSection && (
        <Modal
          show={showModal}
          onClose={() => setShowModal(false)}
          title={`${selectedSection.section_number}. ${selectedSection.section_title}`}
          large={true}
        >
          <div className="section-details">
            <div className="alert alert-info">
              <strong>Purpose:</strong> {selectedSection.section_purpose}
            </div>
            
            {selectedSection.subsections.map((subsection, index) => (
              <div key={index} className="mb-4">
                <h5>{subsection.subsection_number}. {subsection.subsection_title}</h5>
                
                <div className="mb-3">
                  <div 
                    className="academic-prose p-3 bg-light rounded"
                    dangerouslySetInnerHTML={{ 
                      __html: subsection.academic_content.replace(/\n/g, '<br><br>')
                    }} 
                  />
                </div>

                {subsection.data_sources.length > 0 && (
                  <div className="mb-3">
                    <h6>Data Sources</h6>
                    <ul>
                      {subsection.data_sources.map((source, sourceIndex) => (
                        <li key={sourceIndex}>{source}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {subsection.citations.length > 0 && (
                  <div className="mb-3">
                    <h6>Citations ({subsection.citations.length})</h6>
                    {subsection.citations.map((citation, citationIndex) => (
                      <div 
                        key={citationIndex} 
                        className="citation-item mb-2 p-2 border rounded cursor-pointer"
                        onClick={() => openCitationModal(citation)}
                      >
                        <small>
                          <strong>APA:</strong> {citation.apa}
                        </small>
                      </div>
                    ))}
                  </div>
                )}

                {subsection.transition_to_next && (
                  <div className="transition-note p-2 bg-warning bg-opacity-25 rounded">
                    <strong>Transition:</strong> {subsection.transition_to_next}
                  </div>
                )}
              </div>
            ))}

            <div className="section-summary p-3 bg-success bg-opacity-25 rounded">
              <strong>Section Summary:</strong> {selectedSection.section_summary}
            </div>
          </div>
        </Modal>
      )}

      {/* Citation Modal */}
      {selectedCitation && (
        <Modal
          show={!!selectedCitation}
          onClose={closeCitationModal}
          title="Citation Details"
        >
          <div className="citation-details">
            <div className="mb-3">
              <strong>Citation:</strong>
              <p className="mt-1">{selectedCitation.apa}</p>
            </div>
            
            {selectedCitation.description && (
              <div className="mb-3">
                <strong>Description:</strong>
                <p className="mt-1">{selectedCitation.description}</p>
              </div>
            )}
            
            {selectedCitation.categories && selectedCitation.categories.length > 0 && (
              <div className="mb-3">
                <strong>Categories:</strong>
                <div className="mt-1">
                  {selectedCitation.categories.map((category, idx) => (
                    <span key={idx} className="badge bg-secondary me-1 mb-1">{category}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Comprehensive Purpose Tooltip Modal */}
      {showTooltip && tooltipData && (
        <Modal 
          show={showTooltip} 
          onClose={() => setShowTooltip(false)}
          title="Subsection Purpose & Methodology Alignment"
          large={true}
        >
          <div className="tooltip-content">
            <div className="row">
              <div className="col-12">
                <h5 className="text-primary mb-3">
                  <FaInfoCircle className="me-2" />
                  {tooltipData.subsection_title}
                </h5>
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <div className="card border-primary">
                  <div className="card-header bg-primary text-white">
                    <h6 className="mb-0">📋 Subsection Purpose</h6>
                  </div>
                  <div className="card-body">
                    <p className="mb-0">{tooltipData.subsectionPurpose}</p>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card border-info">
                  <div className="card-header bg-info text-white">
                    <h6 className="mb-0">🔗 Section Connection</h6>
                  </div>
                  <div className="card-body">
                    <p className="mb-0">{tooltipData.sectionConnection}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <div className="card border-success">
                  <div className="card-header bg-success text-white">
                    <h6 className="mb-0">🔬 Methodology Alignment</h6>
                  </div>
                  <div className="card-body">
                    <p className="mb-0">{tooltipData.methodologyAlignment}</p>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card border-warning">
                  <div className="card-header bg-warning text-white">
                    <h6 className="mb-0">🎯 Thesis Support</h6>
                  </div>
                  <div className="card-body">
                    <p className="mb-0">{tooltipData.thesisSupport}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-12">
                <div className="card border-secondary">
                  <div className="card-header bg-secondary text-white">
                    <h6 className="mb-0">📊 Research Foundation</h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-6">
                        <div className="d-flex align-items-center">
                          <FaSearch className="text-primary me-2" />
                          <strong>Research Questions:</strong> {tooltipData.researchQuestions}
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="d-flex align-items-center">
                          <FaEye className="text-success me-2" />
                          <strong>Total Citations:</strong> {tooltipData.citationCount}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-muted">
                      <small>
                        This subsection is supported by {tooltipData.researchQuestions} carefully crafted research questions 
                        and {tooltipData.citationCount} authoritative citations, ensuring comprehensive coverage of the topic 
                        within the context of your {typeof methodology === 'object' ? methodology.methodologyType : methodology} methodology.
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 text-center">
              <button 
                className="btn btn-primary"
                onClick={() => setShowTooltip(false)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OutlineDraft2;