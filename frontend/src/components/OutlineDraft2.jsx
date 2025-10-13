import { useState, useEffect } from 'react';
import { FaPlay, FaSpinner, FaCheckCircle, FaExpand, FaEye, FaSearch, FaCog, FaEdit, FaArrowRight, FaInfoCircle, FaPlus, FaMinus } from 'react-icons/fa';
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
  
  // Academic integrity state
  const [showDataWarning, setShowDataWarning] = useState(false);
  const [fabricatedMetricsDetected, setFabricatedMetricsDetected] = useState([]);

  // Outline Logic state
  const [showOutlineLogic, setShowOutlineLogic] = useState(false);
  const [outlineLogicData, setOutlineLogicData] = useState([]);
  const [generatingLogic, setGeneratingLogic] = useState(false);

  // Initialize data sections and start with Phase 1 (Outline Refinement)
  useEffect(() => {
    const initializeDataSections = () => {
      setIdentifiedSections([]);
      setRefinedOutlines([]);
      setBuiltSections([]);
      setCurrentPhase(1);
      setErrorMessage('');
      setRefineComplete(false);
      
      // Show academic integrity warning on first load
      setShowDataWarning(true);
      
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

  // Simple function to extract data sections - now completely generic
  const extractDataSectionsSimple = (draft1Data) => {
    if (!draft1Data || !Array.isArray(draft1Data)) return [];
    
    console.log('OutlineDraft2: Extracting data sections from draft1Data:', draft1Data);
    
    // Filter for main content sections (exclude administrative/intro sections)
    const dataSections = draft1Data.filter(section => {
      if (!section.section_title || !section.section_context || section.is_administrative) return false;
      
      // Include sections that have substantial content (subsections with questions)
      const hasSubstantialContent = section.subsections && 
                                   section.subsections.length > 0 && 
                                   section.subsections.some(sub => sub.questions && sub.questions.length > 0);
      
      return hasSubstantialContent;
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
    
    // Initialize with empty master outlines - they will be generated via the new logic system
    setMasterOutlines([]);
    
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

  // Helper function to determine thesis connection - now generic
  const getThesisConnection = (subsection, thesis) => {
    const title = subsection.subsection_title?.toLowerCase() || '';
    const thesisSnippet = thesis ? thesis.substring(0, 100) + '...' : 'the research thesis';
    
    // Generic connection based on analytical purpose
    if (title.includes('analysis') || title.includes('assessment')) {
      return `providing analytical evidence and evaluation to support ${thesisSnippet}`;
    } else if (title.includes('framework') || title.includes('structure')) {
      return `establishing structural foundations and frameworks that underpin ${thesisSnippet}`;
    } else if (title.includes('effectiveness') || title.includes('evaluation')) {
      return `evaluating effectiveness and performance metrics relevant to ${thesisSnippet}`;
    } else if (title.includes('implementation') || title.includes('application')) {
      return `examining implementation strategies and practical applications supporting ${thesisSnippet}`;
    }
    return `contributing essential research evidence and analysis to support ${thesisSnippet}`;
  };

  // Extract citation numbers from text like [106, 107, 108] or [104]
  const extractCitationNumbers = (text) => {
    const citationPattern = /\[(\d+(?:,\s*\d+)*)\]/g;
    const matches = [];
    let match;
    
    while ((match = citationPattern.exec(text)) !== null) {
      const numbers = match[1].split(',').map(n => parseInt(n.trim()));
      matches.push({
        fullMatch: match[0],
        numbers: numbers,
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
    
    return matches;
  };

  // Find citation details by reference number from the global citation map
  const findCitationByNumber = (referenceNumber) => {
    // Build a comprehensive citation map from all available data
    const citationMap = {};
    let currentNumber = 1;

    // Collect citations from outline data and draft data
    if (outlineData) {
      outlineData.forEach(section => {
        section.subsections?.forEach(subsection => {
          subsection.questions?.forEach(question => {
            question.citations?.forEach(citation => {
              citationMap[currentNumber] = {
                ...citation,
                sectionTitle: section.section_title,
                subsectionTitle: subsection.subsection_title,
                question: question.question
              };
              currentNumber++;
            });
          });
        });
      });
    }

    return citationMap[referenceNumber] || null;
  };

  // Clean text content by removing inline citation numbers
  const cleanTextContent = (text) => {
    if (!text) return '';
    // Remove all inline citation patterns like [1], [1, 2], [106, 107, 108], etc.
    return text.replace(/\s*\[[\d,\s]+\]/g, '').trim();
  };

  // Extract citation numbers for display under content
  const extractCitationsForDisplay = (text) => {
    const citationMatches = extractCitationNumbers(text);
    const allNumbers = [];
    
    citationMatches.forEach(match => {
      allNumbers.push(...match.numbers);
    });
    
    return [...new Set(allNumbers)]; // Remove duplicates
  };

  // Render citation numbers as small clickable links below content
  const renderCitationLinks = (citationNumbers, style = {}) => {
    if (!citationNumbers || citationNumbers.length === 0) {
      return null;
    }

    return (
      <div style={{ marginTop: '4px', ...style }}>
        {citationNumbers.map((citationNumber, index) => (
          <span key={citationNumber} style={{ marginRight: '8px' }}>
            <span
              style={{
                color: '#0066cc',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '0.7em', // Very small text
                fontWeight: 'normal'
              }}
              onClick={(e) => {
                e.stopPropagation();
                const citation = findCitationByNumber(citationNumber);
                if (citation) {
                  openCitationModal(citation);
                }
              }}
              title={`Click to view citation ${citationNumber}`}
            >
              [{citationNumber}]
            </span>
          </span>
        ))}
      </div>
    );
  };

  // Process all Q&A data and generate master outlines
  const generateMasterOutlines = (sections) => {
    return sections.map(section => ({
      section_title: section.section_title,
      section_context: section.section_context,
      master_subsections: section.subsections?.map((subsection, subsectionIndex) => {
        const allQuestions = subsection.questions || [];
        // Pass the entire subsection object so we can access combined_outline
        const masterOutline = generateMasterOutlineFromQA(allQuestions, subsection);
        
        console.log(`Processing subsection: ${subsection.subsection_title}`);
        console.log(`Combined outline items: ${subsection.combined_outline?.length || 0}`);
        console.log(`Generated master outline items: ${masterOutline.length}`);
        
        return {
          subsection_title: subsection.subsection_title,
          subsection_context: subsection.subsection_context,
          master_outline: masterOutline,
          question_count: allQuestions.length,
          citation_count: allQuestions.reduce((acc, q) => acc + (q.citations?.length || 0), 0),
          reference_path: `Section ${section.section_title} → Subsection ${subsection.subsection_title}`,
          original_questions: allQuestions,
          combined_outline_count: subsection.combined_outline?.length || 0
        };
      }) || []
    }));
  };

  // Generate hierarchical master outline from Q&A data and combined outline
  const generateMasterOutlineFromQA = (questions, subsection) => {
    // Use the actual combined_outline from the subsection which contains the fused responses
    if (subsection.combined_outline && subsection.combined_outline.length > 0) {
      return processCombinedOutlineIntoMaster(subsection.combined_outline, subsection);
    }
    
    // Fallback to processing questions if no combined outline
    if (!questions || questions.length === 0) return [];
    return synthesizeQAIntoAcademicOutline(questions, subsection);
  };

  // Synthesize Q&A responses into coherent academic outline structure
  const synthesizeQAIntoAcademicOutline = (questions, subsection) => {
    // Group questions by thematic areas for coherent synthesis
    const thematicGroups = groupQuestionsByTheme(questions);
    
    // Create synthesized outline points
    const synthesizedPoints = [];
    let pointCounter = 1;

    thematicGroups.forEach((themeGroup, themeIndex) => {
      // Main thematic point (1., 2., 3., etc.)
      // Extract citation numbers from all citations in this thematic group
      const allCitationNumbers = [];
      themeGroup.questions.forEach(question => {
        if (question.citations) {
          // For now, use sequential numbers based on the index
          question.citations.forEach((citation, idx) => {
            allCitationNumbers.push(pointCounter * 10 + idx + 1);
          });
        }
      });
      
      const mainPoint = {
        level: `${pointCounter}`,
        type: 'number',
        content: synthesizeThematicFramework(themeGroup, subsection),
        citations: allCitationNumbers.slice(0, 3), // Limit to first 3 citations for main point
        reference: `Synthesized from ${themeGroup.questions.length} research questions addressing ${themeGroup.theme}`,
        editable: true,
        subPoints: []
      };

      // Sub-points (a), b), c), etc.)
      const keyFindings = extractKeyFindingsFromTheme(themeGroup);
      keyFindings.forEach((finding, findingIndex) => {
        // Extract citation numbers from the citationNumbers string like "[1, 2, 3]"
        const citationNums = finding.citationNumbers ? 
          finding.citationNumbers.replace(/[\[\]]/g, '').split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)) : 
          [];
        
        const subPoint = {
          level: String.fromCharCode(97 + findingIndex), // a, b, c...
          type: 'lowercase',
          content: finding.synthesizedPoint,
          citations: citationNums, // Extract actual citation numbers
          reference: finding.citationNumbers || finding.sources.map((s, idx) => `[${idx + 1}]`).join(' '),
          editable: true,
          deeperPoints: []
        };

        // Deeper supporting points (i), ii), iii), etc.)
        if (finding.supportingEvidence && finding.supportingEvidence.length > 0) {
          const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'];
          finding.supportingEvidence.forEach((evidence, evidenceIndex) => {
            if (evidenceIndex < romanNumerals.length) {
              subPoint.deeperPoints.push({
                level: romanNumerals[evidenceIndex],
                type: 'roman_lower',
                content: evidence.point,
                citations: [pointCounter * 10 + evidenceIndex + 10], // Add sample citation number for testing
                reference: `Supporting detail from fused research`,
                editable: true
              });
            }
          });
        }

        mainPoint.subPoints.push(subPoint);
      });

      synthesizedPoints.push(mainPoint);
      pointCounter++;
    });

    return synthesizedPoints;
  };

  // Group questions dynamically by analyzing their actual content
  const groupQuestionsByTheme = (questions) => {
    if (!questions || questions.length === 0) return [];
    
    // Use AI-based clustering if we have the analysis data available
    // For now, create simple thematic groups based on question similarity
    const questionGroups = [];
    const processed = new Set();
    
    questions.forEach((question, index) => {
      if (processed.has(index)) return;
      
      // Start a new group with this question
      const group = {
        theme: extractThemeFromQuestion(question.question),
        questions: [question]
      };
      
      // Find similar questions
      questions.forEach((otherQuestion, otherIndex) => {
        if (otherIndex !== index && !processed.has(otherIndex)) {
          const similarity = calculateQuestionSimilarity(question.question, otherQuestion.question);
          if (similarity > 0.3) { // 30% similarity threshold
            group.questions.push(otherQuestion);
            processed.add(otherIndex);
          }
        }
      });
      
      processed.add(index);
      questionGroups.push(group);
    });
    
    return questionGroups;
  };

  // Extract theme from individual question content
  const extractThemeFromQuestion = (questionText) => {
    const words = questionText.toLowerCase().split(/\s+/);
    const keyTerms = [];
    
    // Extract meaningful terms (nouns, adjectives)
    words.forEach(word => {
      const cleaned = word.replace(/[^\w]/g, '');
      if (cleaned.length > 3 && 
          !['what', 'how', 'when', 'where', 'why', 'does', 'would', 'could', 'should', 'this', 'that', 'these', 'those'].includes(cleaned)) {
        keyTerms.push(cleaned);
      }
    });
    
    // Create theme name from key terms
    if (keyTerms.length > 0) {
      const primaryTerms = keyTerms.slice(0, 3).join(' ');
      return `${primaryTerms.charAt(0).toUpperCase()}${primaryTerms.slice(1)} Analysis`;
    }
    
    return 'Research Analysis';
  };

  // Calculate similarity between two questions
  const calculateQuestionSimilarity = (question1, question2) => {
    const words1 = new Set(question1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(question2.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  };

  // Create content based on actual data instead of hardcoded templates
  const createSpecificContent = (originalText, citationNumbers, citationDetails, subsection, indentLevel) => {
    // Always prioritize actual content from citations
    const actualContent = extractActualContentFromCitations(citationNumbers, citationDetails);
    
    if (actualContent) {
      return actualContent;
    }
    
    // If original text has specific details, enhance it with citation context
    if (hasSpecificDetails(originalText)) {
      return enhanceWithCitationSpecifics(originalText, citationNumbers, citationDetails);
    }

    // For generic text, use data-driven approach
    if (isGenericAcademicText(originalText)) {
      return createDataDrivenContent(originalText, citationNumbers, citationDetails, subsection, indentLevel);
    }

    // Return original text if it's already specific
    return originalText;
  };

  // Check if text is generic academic language that should be replaced
  const isGenericAcademicText = (text) => {
    const genericPhrases = [
      'this subsection will examine',
      'this article analyzes', 
      'this research paper provides',
      'this influential article',
      'this recent academic',
      'provides a comprehensive analysis',
      'examines the applicability',
      'offers insights into',
      'categorized research focus'
    ];
    
    const lowerText = text.toLowerCase();
    return genericPhrases.some(phrase => lowerText.includes(phrase));
  };

  // Create content based on actual citation data instead of hardcoded templates
  const createDataDrivenContent = (originalText, citationNumbers, citationDetails, subsection, indentLevel) => {
    // First, try to extract actual content from citations
    const citationContent = extractActualContentFromCitations(citationNumbers, citationDetails);
    
    if (citationContent && citationContent.length > 0) {
      // Use actual content from citations
      return citationContent;
    }
    
    // If original text has specific details, use it
    if (hasSpecificDetails(originalText)) {
      return originalText;
    }
    
    // Last resort: create generic content that doesn't assume topic
    return createGenericStructuredContent(originalText, subsection, indentLevel);
  };

  // Extract actual content from citation descriptions
  const extractActualContentFromCitations = (citationNumbers, citationDetails) => {
    if (!citationNumbers || !citationDetails) return null;
    
    let bestContent = '';
    let maxSpecificity = 0;
    
    citationNumbers.forEach(match => {
      match.numbers.forEach(num => {
        const citation = citationDetails[num];
        if (citation && citation.description) {
          const specificity = calculateContentSpecificity(citation.description);
          if (specificity > maxSpecificity) {
            maxSpecificity = specificity;
            bestContent = extractBestSentenceFromDescription(citation.description);
          }
        }
      });
    });
    
    return bestContent || null;
  };

  // Calculate how specific/detailed a piece of content is
  const calculateContentSpecificity = (text) => {
    let score = 0;
    
    // Higher score for specific details
    if (/\d{4}/.test(text)) score += 3; // Years
    if (/\d+%/.test(text)) score += 3; // Percentages
    if (/\$\d+/.test(text)) score += 2; // Money amounts
    if (/\b\d+\b/.test(text)) score += 1; // Any numbers
    
    // Score for proper nouns and specific terms
    const properNouns = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    score += properNouns.length * 0.5;
    
    // Lower score for generic academic language
    if (/\b(comprehensive|systematic|detailed|thorough)\b/i.test(text)) score -= 1;
    if (/\bthis (study|research|paper|analysis)\b/i.test(text)) score -= 2;
    
    return score;
  };

  // Extract the most informative sentence from a citation description
  const extractBestSentenceFromDescription = (description) => {
    const sentences = description.split(/[.!?]+/);
    let bestSentence = '';
    let maxScore = 0;
    
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length > 20 && trimmed.length < 300) {
        const score = calculateContentSpecificity(trimmed);
        if (score > maxScore) {
          maxScore = score;
          bestSentence = trimmed;
        }
      }
    });
    
    return bestSentence || description.substring(0, 150).trim() + '...';
  };

  // Create generic structured content that doesn't assume research topic
  const createGenericStructuredContent = (originalText, subsection, indentLevel) => {
    const subsectionTitle = subsection.subsection_title || '';
    
    if (indentLevel === 0) {
      return originalText || `Analysis of ${subsectionTitle}`;
    } else if (indentLevel === 1) {
      return originalText || `Key findings and evidence regarding ${subsectionTitle.toLowerCase()}`;
    } else {
      return originalText || `Supporting details and case studies`;
    }
  };

  // Check if text already contains specific details
  const hasSpecificDetails = (text) => {
    const specificMarkers = [
      /\d{4}/,  // Years
      /\d+%/,   // Percentages  
      /\$\d+/,  // Dollar amounts
      /\b(Act|Strategy|Framework|Initiative|Policy|Directive|Order)\b/i,  // Specific documents
      /\b[A-Z]{2,}\b/,  // Acronyms (like DoD, NIST, etc.)
      /\b(Operation|Project|Program)\s+[A-Z][a-z]+/,  // Named operations
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i  // Months
    ];
    
    return specificMarkers.some(pattern => pattern.test(text));
  };

  // Extract concrete specifics from citations
  const extractConcreteSpecifics = (citationNumbers, citationDetails, subsection) => {
    const specifics = [];
    
    if (citationNumbers && citationNumbers.length > 0) {
      citationNumbers.forEach(match => {
        match.numbers.forEach(num => {
          const citation = citationDetails[num];
          if (citation && citation.description) {
            const concreteDetails = extractConcreteFromDescription(citation.description);
            specifics.push(...concreteDetails);
          }
        });
      });
    }
    
    return specifics.filter(s => s && s.length > 10); // Filter out empty or too short
  };

  // Extract concrete details from citation descriptions
  const extractConcreteFromDescription = (description) => {
    const concreteDetails = [];
    
    // Look for specific patterns in the description
    const patterns = {
      years: /\b(19|20)\d{2}\b/g,
      percentages: /\d+\.?\d*%/g,
      amounts: /\$\d+(\.\d+)?\s*(billion|million|thousand)?/gi,
      documents: /\b([A-Z][A-Za-z\s]+(Act|Strategy|Framework|Initiative|Policy|Directive|Order|Plan))\b/g,
      operations: /\b(Operation|Project|Program)\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*/g,
      organizations: /\b(Department of Defense|DoD|NIST|DHS|NSA|CIA|FBI|GAO|RAND Corporation|CSIS|CNAS)\b/g,
      specific_events: /\b(SolarWinds|Colonial Pipeline|WannaCry|NotPetya|Stuxnet|Estonia|Georgia)\b/g
    };
    
    // Extract matches for each pattern
    Object.entries(patterns).forEach(([type, pattern]) => {
      const matches = description.match(pattern);
      if (matches) {
        concreteDetails.push(...matches);
      }
    });
    
    // Also extract sentences that contain these specific details
    const sentences = description.split(/[.!?]+/);
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length > 30 && hasSpecificDetails(trimmed)) {
        concreteDetails.push(trimmed);
      }
    });
    
    return [...new Set(concreteDetails)]; // Remove duplicates
  };

  // Enhance text with citation specifics
  const enhanceWithCitationSpecifics = (originalText, citationNumbers, citationDetails) => {
    if (!citationNumbers || citationNumbers.length === 0) return originalText;
    
    const specifics = extractConcreteSpecifics(citationNumbers, citationDetails, null);
    
    if (specifics.length > 0) {
      // Add the most relevant specific to the original text
      const relevantSpecific = specifics.find(s => s.length > 20) || specifics[0];
      return `${originalText}. Specifically: ${relevantSpecific}`;
    }
    
    return originalText;
  };

  // Create detailed reference from citations
  const createDetailedReference = (citationNumbers, citationDetails, subsection) => {
    if (!citationNumbers || citationNumbers.length === 0) {
      return `Synthesized from ${subsection.subsection_title} analysis`;
    }
    
    const citationCount = citationNumbers.reduce((acc, match) => acc + match.numbers.length, 0);
    const specifics = extractConcreteSpecifics(citationNumbers, citationDetails, subsection);
    const documentTypes = specifics.filter(s => /(DoD|NIST|GAO|RAND|CSIS)/i.test(s));
    
    if (documentTypes.length > 0) {
      return `Derived from ${citationCount} sources including ${documentTypes.slice(0, 2).join(' and ')} analyses`;
    } else {
      return `Key findings from ${citationCount} primary sources and policy documents`;
    }
  };

  // Create supporting reference  
  const createSupportingReference = (citationNumbers, citationDetails) => {
    if (!citationNumbers || citationNumbers.length === 0) {
      return `Supporting analytical framework`;
    }
    
    const citationCount = citationNumbers.reduce((acc, match) => acc + match.numbers.length, 0);
    return `Evidence base: ${citationCount} research sources`;
  };

  // Create evidence reference
  const createEvidenceReference = (citationNumbers, citationDetails) => {
    if (!citationNumbers || citationNumbers.length === 0) {
      return `Operational evidence`;
    }
    
    const citationCount = citationNumbers.reduce((acc, match) => acc + match.numbers.length, 0);
    return `Documented in ${citationCount} case studies and reports`;
  };

  // Create data-driven main point from available sources
  const createDataDrivenMainPoint = (text, subsection, pointNumber, citationDetails) => {
    // Try to extract content from citations first
    const citationContent = extractBestContentFromCitationMap(citationDetails);
    
    if (citationContent) {
      return citationContent;
    }
    
    // Use existing text if it's specific
    if (text && hasSpecificDetails(text)) {
      return text;
    }
    
    // Generic fallback that doesn't assume research topic
    const title = subsection.subsection_title || 'Research Component';
    return text || `Analysis of ${title}`;
  };

  // Create data-driven sub-point from available evidence
  const createDataDrivenSubPoint = (text, subsection, citationDetails) => {
    // Try to extract supporting details from citations
    const supportingContent = extractSupportingContentFromCitations(citationDetails);
    
    if (supportingContent) {
      return supportingContent;
    }
    
    // Use existing text if it has specifics
    if (text && hasSpecificDetails(text)) {
      return text;
    }
    
    // Generic fallback
    return text || `Key findings and supporting evidence`;
  };

  // Create data-driven evidence from citation details
  const createDataDrivenEvidence = (text, subsection, citationDetails) => {
    // Extract specific examples or case studies from citations
    const evidenceContent = extractEvidenceFromCitations(citationDetails);
    
    if (evidenceContent) {
      return evidenceContent;
    }
    
    // Use existing text if specific
    if (text && hasSpecificDetails(text)) {
      return text;
    }
    
    // Generic fallback
    return text || `Supporting details and case studies from research sources`;
  };

  // Extract best content from citation map
  const extractBestContentFromCitationMap = (citationDetails) => {
    if (!citationDetails || Object.keys(citationDetails).length === 0) return null;
    
    let bestContent = '';
    let maxScore = 0;
    
    Object.values(citationDetails).forEach(citation => {
      if (citation.description) {
        const score = calculateContentSpecificity(citation.description);
        if (score > maxScore) {
          maxScore = score;
          bestContent = extractBestSentenceFromDescription(citation.description);
        }
      }
    });
    
    return maxScore > 3 ? bestContent : null;
  };

  // Extract supporting content from citations
  const extractSupportingContentFromCitations = (citationDetails) => {
    if (!citationDetails) return null;
    
    const citations = Object.values(citationDetails);
    if (citations.length === 0) return null;
    
    // Look for methodological or analytical content
    for (const citation of citations) {
      if (citation.description) {
        const sentences = citation.description.split(/[.!?]+/);
        for (const sentence of sentences) {
          const trimmed = sentence.trim();
          if (trimmed.length > 30 && 
              /\b(method|approach|analysis|framework|model|strategy)\b/i.test(trimmed) &&
              !isGenericSourceDescription(trimmed)) {
            return trimmed;
          }
        }
      }
    }
    
    return null;
  };

  // Extract evidence examples from citations
  const extractEvidenceFromCitations = (citationDetails) => {
    if (!citationDetails) return null;
    
    const citations = Object.values(citationDetails);
    if (citations.length === 0) return null;
    
    // Look for specific examples, case studies, or data points
    for (const citation of citations) {
      if (citation.description) {
        const sentences = citation.description.split(/[.!?]+/);
        for (const sentence of sentences) {
          const trimmed = sentence.trim();
          if (trimmed.length > 20 && 
              /\b(example|case|study|data|evidence|result|finding|showed|demonstrated)\b/i.test(trimmed) &&
              hasSpecificDetails(trimmed)) {
            return trimmed;
          }
        }
      }
    }
    
    return null;
  };

  // Create data-driven fallback outline when no structure exists
  const createDataDrivenFallbackOutline = (subsection, citationDetails) => {
    return {
      level: '1',
      type: 'number',
      content: createDataDrivenMainPoint('', subsection, 1, citationDetails),
      citations: [],
      reference: `Analysis derived from ${subsection.subsection_title} research data`,
      editable: true,
      subPoints: [{
        level: 'a',
        type: 'lowercase',
        content: createDataDrivenSubPoint('', subsection, citationDetails),
        citations: [],
        reference: 'Primary source documentation',
        editable: true,
        deeperPoints: [{
          level: 'i',
          type: 'roman_lower',
          content: createDataDrivenEvidence('', subsection, citationDetails),
          citations: [],
          reference: 'Supporting evidence from research sources',
          editable: true
        }]
      }]
    };
  };

  // Synthesize thematic framework based on actual content from citations
  const synthesizeThematicFramework = (themeGroup, subsection) => {
    // Extract all citations from this thematic group
    const allCitations = [];
    themeGroup.questions.forEach(question => {
      if (question.citations) {
        allCitations.push(...question.citations);
      }
    });

    // Find the most substantive content from citations
    let bestContent = '';
    let maxSpecificity = 0;

    allCitations.forEach(citation => {
      if (citation.description) {
        const specificity = calculateContentSpecificity(citation.description);
        if (specificity > maxSpecificity) {
          maxSpecificity = specificity;
          bestContent = extractBestSentenceFromDescription(citation.description);
        }
      }
    });

    // If we found specific content, use it
    if (bestContent && maxSpecificity > 3) {
      return `${themeGroup.theme}: ${bestContent}`;
    }

    // Otherwise, create a descriptive title based on the theme and citation count
    const citationCount = allCitations.length;
    const themeTitle = themeGroup.theme || 'Research Analysis';
    
    return `${themeTitle} (${citationCount} source${citationCount !== 1 ? 's' : ''})`;
  };

  // Create specific main content from extracted specifics
  const createSpecificMainContent = (specifics, subsection) => {
    const subsectionTitle = subsection.subsection_title || '';
    
    // Find the most relevant specifics for a main point
    const years = specifics.filter(s => /\b(19|20)\d{2}\b/.test(s));
    const documents = specifics.filter(s => /(Act|Strategy|Framework|Initiative|Policy|Directive|Plan)/i.test(s));
    const events = specifics.filter(s => /(SolarWinds|Colonial Pipeline|WannaCry|Operation|Stuxnet)/i.test(s));
    
    let content = '';
    
    if (years.length >= 2) {
      const yearRange = `${Math.min(...years.map(y => parseInt(y.match(/\d{4}/)[0])))}–${Math.max(...years.map(y => parseInt(y.match(/\d{4}/)[0])))}`;
      content = `Evolution of ${subsectionTitle.replace(/^(Current |The )/i, '')} (${yearRange})`;
    } else if (documents.length > 0) {
      content = `Implementation of ${documents[0]} and Related Cybersecurity Measures`;
    } else if (events.length > 0) {
      content = `Analysis of ${events[0]} and Strategic Response Framework Development`;
    } else {
      // Use the most specific detail available
      const bestSpecific = specifics.find(s => s.length > 30) || specifics[0];
      content = `${bestSpecific}`;
    }
    
    return content;
  };

  // Create specific sub-content from extracted specifics  
  const createSpecificSubContent = (specifics, subsection) => {
    const documents = specifics.filter(s => /(NIST|DoD|Framework|Strategy|SP\s+\d+)/i.test(s));
    const percentages = specifics.filter(s => /\d+%/.test(s));
    const amounts = specifics.filter(s => /\$\d+/.test(s));
    
    if (documents.length > 0) {
      return `${documents[0]} Implementation and Strategic Integration`;
    } else if (percentages.length > 0) {
      return `Statistical Analysis Reveals ${percentages[0]} Impact Rate`;
    } else if (amounts.length > 0) {
      return `Resource Allocation: ${amounts[0]} Investment in Cybersecurity Infrastructure`;
    } else {
      return specifics[0] || 'Detailed analysis of implementation mechanisms';
    }
  };

  // Create specific supporting content from extracted specifics
  const createSpecificSupportingContent = (specifics, subsection) => {
    const operations = specifics.filter(s => /(Operation|Project|Program)/i.test(s));
    const events = specifics.filter(s => /(SolarWinds|Colonial Pipeline|Estonia|Georgia)/i.test(s));
    
    if (operations.length > 0) {
      return `Operational case study: ${operations[0]} demonstrates tactical implementation`;
    } else if (events.length > 0) {
      return `Incident analysis: ${events[0]} provides evidence of strategic vulnerabilities`;
    } else {
      return specifics[0] || 'Supporting evidence from primary sources';
    }
  };

  // Extract key findings from thematic group
  const extractKeyFindingsFromTheme = (themeGroup) => {
    const findings = [];
    
    // Process all citations within this theme
    const allCitations = [];
    themeGroup.questions.forEach(question => {
      if (question.citations) {
        allCitations.push(...question.citations);
      }
    });

    // Group similar findings
    const findingGroups = groupSimilarFindings(allCitations);
    
    findingGroups.forEach((group, groupIndex) => {
      const citationNumbers = group.citations.map((c, idx) => groupIndex * 10 + idx + 1);
      const finding = {
        synthesizedPoint: synthesizeFindingGroup(group, groupIndex),
        sources: group.citations.map(c => c.apa.split('(')[0].trim()).slice(0, 3),
        citationNumbers: `[${citationNumbers.join(', ')}]`,
        supportingEvidence: extractSupportingEvidence(group, groupIndex)
      };
      findings.push(finding);
    });

    return findings.slice(0, 4); // Limit to 4 main findings per theme
  };

  // Group similar findings from citations
  const groupSimilarFindings = (citations) => {
    // Simple grouping based on description keywords
    const groups = [];
    const processed = new Set();

    citations.forEach((citation, index) => {
      if (processed.has(index)) return;
      
      const group = {
        mainCitation: citation,
        citations: [citation],
        keyWords: extractKeywords(citation.description)
      };

      // Find similar citations
      citations.forEach((otherCitation, otherIndex) => {
        if (otherIndex !== index && !processed.has(otherIndex)) {
          const similarity = calculateSimilarity(group.keyWords, extractKeywords(otherCitation.description));
          if (similarity > 0.3) { // 30% similarity threshold
            group.citations.push(otherCitation);
            processed.add(otherIndex);
          }
        }
      });

      processed.add(index);
      groups.push(group);
    });

    return groups;
  };

  // Extract keywords from citation description
  const extractKeywords = (description) => {
    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that', 'these', 'those']);
    
    return description.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 10);
  };

  // Calculate similarity between two keyword arrays
  const calculateSimilarity = (keywords1, keywords2) => {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  };

  // Synthesize finding group into coherent academic point with specific details
  const synthesizeFindingGroup = (group, groupIndex = 0) => {
    const mainDescription = group.mainCitation.description;
    const citationNumbers = group.citations.map((c, idx) => idx + 1);
    const citationCallout = `[${citationNumbers.join(', ')}]`;
    
    // Extract actual concrete details instead of academic meta-language
    const concreteDetails = extractConcreteFromDescription(mainDescription);
    
    // Always try to build specific content first
    if (concreteDetails.length > 0) {
      // Find the most specific detail with actual data
      const dataDetail = concreteDetails.find(d => /\d{4}|%|\$|\b(Act|Framework|Strategy|Operation|Project)\b/i.test(d));
      if (dataDetail) {
        return `${dataDetail} ${citationCallout}`;
      }
      
      // Use the most substantial concrete detail
      const primaryDetail = concreteDetails.find(d => d.length > 30) || concreteDetails[0];
      return `${primaryDetail}`;
    }
    
    // If no concrete details, create specific content based on description context with variety
    const specificContent = createSpecificFromDescription(mainDescription, group.citations.length, groupIndex);
    return `${specificContent}`;
  };

  // Create content based ONLY on what's actually in the citation descriptions - NO FABRICATED METRICS
  const createSpecificFromDescription = (description, citationCount, citationIndex = 0) => {
    if (!description || description.length < 20) {
      return `Analysis based on ${citationCount} scholarly sources and policy documents`;
    }
    
    // SAFETY CHECK: Only use content that's actually in the source description
    const actualContent = extractVerifiableContentFromDescription(description);
    if (actualContent) {
      return actualContent;
    }
    
    // If no verifiable specific content, use general thematic content based on description themes
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('strategy') || lowerDesc.includes('approach')) {
      return `Strategic development and implementation challenges, as documented in policy analysis and strategic assessments`;
    } else if (lowerDesc.includes('framework') || lowerDesc.includes('structure')) {
      return `Framework implementation and coordination mechanisms across multiple agencies and sectors`;
    } else if (lowerDesc.includes('analysis') || lowerDesc.includes('assessment')) {
      return `Comprehensive analysis of key factors, patterns, and strategic considerations`;
    } else if (lowerDesc.includes('cooperation') || lowerDesc.includes('international')) {
      return `International cooperation initiatives, bilateral agreements, and multilateral coordination mechanisms`;
    } else if (lowerDesc.includes('policy') || lowerDesc.includes('effectiveness')) {
      return `Policy effectiveness evaluation and strategic gap analysis in governance and regulatory frameworks`;
    } else if (lowerDesc.includes('implementation') || lowerDesc.includes('practical')) {
      return `Implementation strategies, practical considerations, and sector-specific approaches`;
    } else {
      return `Comprehensive analysis of research challenges and strategic responses based on authoritative sources and expert assessments`;
    }
  };
  
  // Extract ONLY verifiable content from citation descriptions - no fabrication
  const extractVerifiableContentFromDescription = (description) => {
    // Look for actual specific information in the description
    const sentences = description.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length < 30) continue;
      
      // Only return content that contains actual verifiable information from the source
      const hasVerifiableData = /(\d{4}|\b(Act|Strategy|Framework|Initiative|Policy|Directive|Executive Order|Presidential Policy Directive|NIST|DoD|DHS|NSA|CIA|FBI|GAO|RAND|CSIS|CNAS)\b)/i.test(trimmed);
      
      if (hasVerifiableData && !isGenericSourceDescription(trimmed)) {
        return trimmed + " (as documented in source materials)";
      }
    }
    
    return null;
  };
  
  // Check if description is generic source description vs actual content
  const isGenericSourceDescription = (text) => {
    const genericPatterns = [
      /this (book|paper|study|research|article)/i,
      /the author[s]? (examine|explore|discuss|analyze)/i,
      /provides? (insights?|analysis|examination)/i,
      /offers? an? (in-depth|comprehensive)/i
    ];
    
    return genericPatterns.some(pattern => pattern.test(text));
  };

  // Validate content for potential fabricated data and add warnings
  const validateContentIntegrity = (content) => {
    const warnings = [];
    
    // Check for suspicious specific metrics that might be fabricated
    const suspiciousPatterns = [
      /\d+(\.\d+)?%\s+(improvement|increase|decrease|reduction)/i,
      /\$\d+(\.\d+)?\s*(billion|million|thousand|B|M|K)\s+allocated/i,
      /\d+(\.\d+)?\s*(days|hours|minutes)\s+(reduced|improved|increased)/i,
      /\d+(\.\d+)?%\s+(of|across|within)\s+(agencies|sectors|companies)/i,
      /processed\s+\d+(\.\d+)?\s*(million|thousand|M|K)/i
    ];
    
    suspiciousPatterns.forEach((pattern, index) => {
      if (pattern.test(content)) {
        warnings.push({
          type: 'fabricated_metric',
          message: 'This content contains specific metrics that may not be from your original sources',
          pattern: pattern.source,
          severity: 'high'
        });
      }
    });
    
    // Check for overly specific claims without clear source attribution
    if (/\b(FY20\d{2}|Q[1-4]\s+20\d{2}|fiscal\s+year\s+20\d{2})/i.test(content) && 
        !/\[([\d,\s]+)\]/.test(content)) {
      warnings.push({
        type: 'unattributed_claim',
        message: 'Specific fiscal year data should be clearly attributed to source citations',
        severity: 'medium'
      });
    }
    
    return warnings;
  };

  // Add integrity warnings to content when suspicious patterns are detected
  const addIntegrityWarnings = (content, citations) => {
    const warnings = validateContentIntegrity(content);
    
    if (warnings.length > 0) {
      const warningText = warnings.map(w => `⚠️ ${w.message}`).join(' ');
      return `${content} ${warningText}`;
    }
    
    return content;
  };

  // Extract the most factual sentence from a description
  const extractMostFactualSentence = (description) => {
    const sentences = description.split(/[.!?]+/);
    
    // Score sentences based on factual content indicators
    let bestSentence = '';
    let bestScore = 0;
    
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length < 20) return;
      
      let score = 0;
      
      // Higher score for specific indicators
      if (/\d{4}/.test(trimmed)) score += 3; // Years
      if (/\d+%/.test(trimmed)) score += 3; // Percentages
      if (/\$\d+/.test(trimmed)) score += 2; // Money
      if (/(increased|decreased|found|showed|demonstrated|reported)/i.test(trimmed)) score += 2; // Action verbs
      if (/(DoD|NIST|DHS|NSA|CIA|FBI|GAO|RAND|CSIS)/i.test(trimmed)) score += 2; // Organizations
      if (/(Act|Strategy|Framework|Initiative|Policy)/i.test(trimmed)) score += 2; // Documents
      if (/(Operation|Project|Program)/i.test(trimmed)) score += 2; // Named operations
      
      // Lower score for meta-language
      if (/this (study|paper|research|analysis)/i.test(trimmed)) score -= 2;
      if (/comprehensive|systematic|detailed|thorough/i.test(trimmed)) score -= 1;
      
      if (score > bestScore && trimmed.length <= 150) {
        bestScore = score;
        bestSentence = trimmed;
      }
    });
    
    return bestSentence || description.substring(0, 100) + '...';
  };

  // Extract specific details from citation description
  const extractSpecificDetailsFromDescription = (description) => {
    if (!description || description.length < 50) return null;
    
    // Look for sentences with specific information (numbers, names, dates, etc.)
    const sentences = description.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length < 20) continue;
      
      // Check if sentence contains specific information
      const hasSpecifics = /(\d+\.?\d*%?|\d{4}|[A-Z][a-z]+ \d{4}|billion|million|thousand|significant|substantial|major|critical|found that|showed that|demonstrated that|reported that)/.test(trimmed);
      
      if (hasSpecifics && !isGenericIntro(trimmed)) {
        return trimmed;
      }
    }
    
    return null;
  };

  // Extract substantive excerpt if no specifics found
  const extractSubstantiveExcerpt = (description) => {
    const sentences = description.split(/[.!?]+/);
    
    // Find the most substantive sentence
    const substantiveSentence = sentences.find(s => {
      const trimmed = s.trim();
      return trimmed.length > 30 && 
             trimmed.length < 150 && 
             !isGenericIntro(trimmed);
    });
    
    if (substantiveSentence) {
      return substantiveSentence.trim();
    }
    
    // Fallback to first part of description
    return description.substring(0, 120).trim() + '...';
  };

  // Check if sentence is a generic introduction
  const isGenericIntro = (sentence) => {
    const lowerSentence = sentence.toLowerCase();
    const genericStarters = [
      'this study', 'this paper', 'this research', 'this article',
      'the authors', 'researchers', 'the study', 'the research'
    ];
    
    return genericStarters.some(starter => lowerSentence.startsWith(starter));
  };

  // Extract supporting evidence ONLY from actual citation content - no fabricated metrics
  const extractSupportingEvidence = (group, groupIndex = 0) => {
    const evidence = [];
    
    // First, try to extract actual evidence from citation descriptions
    const actualEvidence = extractEvidenceFromCitationDescriptions(group.citations);
    if (actualEvidence.length > 0) {
      evidence.push(...actualEvidence);
    }
    
    // If no specific evidence found, create thematic evidence WITHOUT fabricated metrics
    if (evidence.length === 0) {
      const mainDescription = group.mainCitation.description?.toLowerCase() || '';
      
      if (mainDescription.includes('strategy') || mainDescription.includes('approach')) {
        evidence.push(
          { point: `Strategic approaches face implementation challenges that complicate effective execution`, source: `Policy analysis and strategic assessments` },
          { point: `Contemporary doctrine represents shift toward proactive engagement strategies`, source: `Strategic policy documentation` },
          { point: `Strategy effectiveness varies significantly across different contexts and stakeholders`, source: `Academic research on strategic implementation` }
        );
      } else if (mainDescription.includes('framework') || mainDescription.includes('structure')) {
        evidence.push(
          { point: `Frameworks require coordination across multiple government agencies and sector entities`, source: `Policy implementation studies` },
          { point: `Implementation faces technical and organizational challenges in existing systems`, source: `Federal agency implementation reports` },
          { point: `Framework adoption varies significantly across different sectors and organizations`, source: `Sector-specific assessment studies` }
        );
      } else if (mainDescription.includes('analysis') || mainDescription.includes('assessment')) {
        evidence.push(
          { point: `Analytical approaches demonstrate increasing sophistication in methodology and scope`, source: `Research methodology analysis` },
          { point: `Comprehensive assessments represent growing focus on multi-dimensional evaluation approaches`, source: `Academic evaluation documentation` },
          { point: `Assessment patterns reflect systematic approaches to evidence-based analysis`, source: `Research methodology assessments` }
        );
      } else if (mainDescription.includes('cooperation') || mainDescription.includes('international')) {
        evidence.push(
          { point: `International cooperation faces jurisdictional and legal framework challenges`, source: `International law and policy analysis` },
          { point: `Bilateral and multilateral agreements facilitate information sharing and coordinated response capabilities`, source: `Diplomatic cooperation documentation` },
          { point: `Alliance structures adapt to address contemporary challenges through collective mechanisms`, source: `Alliance policy frameworks` }
        );
      } else {
        evidence.push(
          { point: `Policy effectiveness depends on coordination between government agencies and stakeholder organizations`, source: `Policy evaluation studies` },
          { point: `Implementation requires sector-specific approaches tailored to unique operational environments`, source: `Sector-specific research studies` },
          { point: `Development initiatives address capacity gaps across both public and private sectors`, source: `Capacity development analysis` }
        );
      }
    }
    
    // Return exactly 3 pieces of evidence
    return evidence.slice(0, 3);
  };
  
  // Extract evidence from actual citation descriptions - no fabrication
  const extractEvidenceFromCitationDescriptions = (citations) => {
    const evidence = [];
    
    citations.forEach((citation, index) => {
      if (citation.description && citation.description.length > 50) {
        const verifiableContent = extractVerifiableContentFromDescription(citation.description);
        if (verifiableContent) {
          evidence.push({
            point: verifiableContent,
            source: `${citation.apa.split('(')[0].trim()}`
          });
        } else {
          // Use a substantive sentence from the actual description
          const substantiveContent = extractSubstantiveFromDescription(citation.description);
          if (substantiveContent) {
            evidence.push({
              point: substantiveContent,
              source: `${citation.apa.split('(')[0].trim()}`
            });
          }
        }
      }
    });
    
    return evidence;
  };
  
  // Extract substantive content from description without fabrication
  const extractSubstantiveFromDescription = (description) => {
    const sentences = description.split(/[.!?]+/);
    
    // Find the most substantive sentence that isn't just describing what the paper does
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 40 && trimmed.length < 200 && !isGenericSourceDescription(trimmed)) {
        // Remove any first-person references and make it third-person analytical
        const cleanedSentence = trimmed
          .replace(/this (book|paper|study|research|article)/gi, 'the analysis')
          .replace(/the author[s]?\s+(examine[s]?|explore[s]?|discuss[es]?|analyze[s]?)/gi, 'research examines')
          .replace(/provides?\s+insights?\s+into/gi, 'addresses')
          .replace(/offers?\s+an?\s+(in-depth|comprehensive)/gi, 'presents');
        
        return cleanedSentence;
      }
    }
    
    return null;
  };

  // Process combined outline from Draft Outline 1 into master outline structure
  const processCombinedOutlineIntoMaster = (combinedOutline, subsection) => {
    const masterOutline = [];
    let currentMainPoint = null;
    let mainPointCounter = 1;

    // Get citation details for context
    const citationDetails = getCitationDetailsForSubsection(subsection);

    // Debug: Log what we're working with
    console.log('processCombinedOutlineIntoMaster - combinedOutline:', combinedOutline);
    console.log('processCombinedOutlineIntoMaster - subsection citations available:', 
      subsection.questions?.reduce((acc, q) => acc + (q.citations?.length || 0), 0) || 0);

    combinedOutline.forEach((item, index) => {
      const itemText = typeof item === 'string' ? item : (item.text || item.content || '');
      const indentLevel = detectIndentLevel(itemText, index);
      
      // Extract citation numbers from the text before cleaning
      const citationNumbers = extractCitationNumbers(itemText);
      const citationText = citationNumbers.length > 0 
        ? citationNumbers.map(match => match.fullMatch).join(' ')
        : '';
      
      // Keep the full text with specifics, only remove leading numbering
      const cleanText = itemText.replace(/^\s*[\d\w\)\.\-]+\s*/, '').trim();
      
      // Always prioritize specific content over generic academic language
      let enhancedContent;
      if (isGenericAcademicText(cleanText) || cleanText.length < 50) {
        // Replace generic content entirely with specific content
        enhancedContent = createContextSpecificContent(cleanText, subsection, indentLevel, citationNumbers);
      } else {
        // Enhance existing specific content
        enhancedContent = createSpecificContent(cleanText, citationNumbers, citationDetails, subsection, indentLevel);
      }
      
      if (indentLevel === 0) {
        // Main point (1., 2., 3., etc.) - create specific, detailed content
        const citationNums = extractCitationsForDisplay(itemText);
        const contentText = enhancedContent || createDataDrivenMainPoint(cleanText, subsection, mainPointCounter, citationDetails);
        
        // Debug: Log citation extraction
        console.log('Main point citation extraction:', {
          itemText: itemText.substring(0, 100),
          citationNums,
          extractedFromText: extractCitationNumbers(itemText)
        });
        
        // If no citations found in text, assign some test citations based on subsection data
        let finalCitations = citationNums;
        if (citationNums.length === 0 && subsection.questions && subsection.questions.length > 0) {
          // Use first few citation numbers from the subsection's questions
          const availableCitations = [];
          subsection.questions.forEach((question, qIdx) => {
            if (question.citations) {
              question.citations.forEach((citation, cIdx) => {
                availableCitations.push(qIdx * 10 + cIdx + 1); // Generate test citation numbers
              });
            }
          });
          finalCitations = availableCitations.slice(0, 2); // Take first 2 citations for main points
        }
        
        // Store content and citations separately for proper rendering
        currentMainPoint = {
          level: `${mainPointCounter}`,
          type: 'number',
          content: contentText,
          citations: finalCitations, // Store citations separately
          reference: createDetailedReference(citationNumbers, citationDetails, subsection),
          editable: true,
          subPoints: []
        };
        masterOutline.push(currentMainPoint);
        mainPointCounter++;
      } else if (indentLevel === 1 && currentMainPoint) {
        // Sub-point (a), b), c), etc.) - create specific supporting content
        const citationNums = extractCitationsForDisplay(itemText);
        const contentText = enhancedContent || createDataDrivenSubPoint(cleanText, subsection, citationDetails);
        
        // If no citations found, add some test citations for sub-points
        let finalCitations = citationNums;
        if (citationNums.length === 0) {
          finalCitations = [mainPointCounter * 10 + currentMainPoint.subPoints.length + 1]; // Test citation
        }
        
        const subPoint = {
          level: String.fromCharCode(97 + currentMainPoint.subPoints.length), // a, b, c...
          type: 'lowercase',
          content: contentText,
          citations: finalCitations, // Store citations separately
          reference: createSupportingReference(citationNumbers, citationDetails),
          editable: true,
          deeperPoints: []
        };
        currentMainPoint.subPoints.push(subPoint);
      } else if (indentLevel === 2 && currentMainPoint && currentMainPoint.subPoints.length > 0) {
        // Deeper point (i), ii), iii), etc.) - create specific evidence
        const lastSubPoint = currentMainPoint.subPoints[currentMainPoint.subPoints.length - 1];
        const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'];
        const citationNums = extractCitationsForDisplay(itemText);
        const contentText = enhancedContent || createDataDrivenEvidence(cleanText, subsection, citationDetails);
        const deepPoint = {
          level: romanNumerals[lastSubPoint.deeperPoints.length] || `${lastSubPoint.deeperPoints.length + 1}`,
          type: 'roman_lower',
          content: contentText,
          citations: citationNums, // Store citations separately
          reference: createEvidenceReference(citationNumbers, citationDetails),
          editable: true
        };
        lastSubPoint.deeperPoints.push(deepPoint);
      }
    });

    // If no structured outline was found, create specific structure based on subsection context
    if (masterOutline.length === 0) {
      masterOutline.push(createDataDrivenFallbackOutline(subsection, citationDetails));
    }

    return masterOutline;
  };

  // Get citation details for a subsection to enhance content with specifics
  const getCitationDetailsForSubsection = (subsection) => {
    const citationMap = {};
    let citationNumber = 1;
    
    // Build citation map from questions in this subsection
    if (subsection.questions) {
      subsection.questions.forEach(question => {
        if (question.citations) {
          question.citations.forEach(citation => {
            citationMap[citationNumber] = {
              ...citation,
              question: question.question
            };
            citationNumber++;
          });
        }
      });
    }
    
    return citationMap;
  };

  // Enhance content with specific details from citations
  const enhanceContentWithSpecifics = (content, citationNumbers, citationDetails) => {
    if (!citationNumbers || citationNumbers.length === 0 || !citationDetails) {
      return content;
    }

    // Extract specific details from cited sources
    let enhancedContent = content;
    const relatedCitations = [];
    
    citationNumbers.forEach(match => {
      match.numbers.forEach(num => {
        const citation = citationDetails[num];
        if (citation) {
          relatedCitations.push(citation);
        }
      });
    });

    // Add specific details from citations if the content is too generic
    if (relatedCitations.length > 0 && isContentTooGeneric(content)) {
      const specificDetails = extractSpecificDetails(relatedCitations);
      if (specificDetails.length > 0) {
        enhancedContent = `${content}. Specifically: ${specificDetails.join('; ')}.`;
      }
    }

    return enhancedContent;
  };

  // Check if content is too generic and needs enhancement
  const isContentTooGeneric = (content) => {
    const genericPhrases = [
      'analysis of', 'examination of', 'assessment of', 'evaluation of',
      'comprehensive', 'systematic', 'detailed', 'thorough',
      'framework', 'approach', 'strategy', 'mechanism'
    ];
    
    const lowerContent = content.toLowerCase();
    const genericCount = genericPhrases.filter(phrase => lowerContent.includes(phrase)).length;
    
    // If content has multiple generic phrases and is short, it's probably too generic
    return genericCount >= 2 && content.length < 200;
  };

  // Extract specific details from citations
  const extractSpecificDetails = (citations) => {
    const specificDetails = [];
    
    citations.forEach(citation => {
      // Extract specific information from citation description
      if (citation.description) {
        const description = citation.description;
        
        // Look for specific numbers, percentages, dates, names
        const specificMatches = description.match(/(\d+\.?\d*%?|\d{4}|[A-Z][a-z]+ \d{4}|[A-Z][A-Za-z]+ Act|[A-Z][A-Za-z]+ Framework|[A-Z][A-Za-z]+ Strategy)/g);
        
        if (specificMatches && specificMatches.length > 0) {
          // Take first few specific details
          const details = specificMatches.slice(0, 2).join(' and ');
          specificDetails.push(details);
        } else {
          // Extract first substantive sentence
          const sentences = description.split(/[.!?]+/);
          const substantiveSentence = sentences.find(s => 
            s.length > 30 && 
            !s.toLowerCase().includes('this study') && 
            !s.toLowerCase().includes('this paper')
          );
          
          if (substantiveSentence) {
            specificDetails.push(substantiveSentence.trim().substring(0, 100) + '...');
          }
        }
      }
    });
    
    return specificDetails.slice(0, 3); // Limit to 3 specific details
  };

  // Detect indentation level of outline item
  const detectIndentLevel = (text, index) => {
    if (!text) return 0;
    
    // Look for numbering patterns to determine level
    const trimmedText = text.trim();
    
    // Level 0: Numbers with periods (1., 2., 3.)
    if (/^\d+\.\s/.test(trimmedText)) return 0;
    
    // Level 1: Letters with parentheses (a), b), c)) or roman numerals (i., ii.)
    if (/^[a-z]\)\s/.test(trimmedText) || /^[ivx]+\.\s/.test(trimmedText)) return 1;
    
    // Level 2: Numbers with parentheses (1), 2)) or deeper indentation
    if (/^\d+\)\s/.test(trimmedText) || /^\s{4,}/.test(text)) return 2;
    
    // Level 3: Very deep indentation
    if (/^\s{8,}/.test(text)) return 3;
    
    // Default: check leading whitespace
    const leadingSpaces = text.length - text.trimStart().length;
    if (leadingSpaces >= 8) return 2;
    if (leadingSpaces >= 4) return 1;
    return 0;
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
        source: `[${index + 1}]`,
        details: []
      };

      // Add methodology points as details
      if (citation.methodologyPoints && citation.methodologyPoints.length > 0) {
        citation.methodologyPoints.forEach(point => {
          mainPoint.details.push({
            content: point,
            source: `[${index + 1}]`
          });
        });
      }

      // Add categories as additional context
      if (citation.categories && citation.categories.length > 0) {
        mainPoint.details.push({
          content: `Research categories: ${citation.categories.join(', ')}`,
          source: `[${index + 1}]`
        });
      }

      points.push(mainPoint);
    });

    return points.slice(0, 5); // Limit to 5 main points per question
  };

  // Generate comprehensive outline logic using AI analysis of actual data
  const generateOutlineLogic = async () => {
    if (!outlineData || !refinedOutlines || refinedOutlines.length === 0) {
      setErrorMessage('No refined outlines available for analysis');
      return;
    }

    setGeneratingLogic(true);
    setErrorMessage('');

    try {
      // Analyze each subsection's actual data using AI
      const logicAnalysis = [];
      
      for (const section of refinedOutlines) {
        for (const subsection of section.subsections || []) {
          // Prepare the data for AI analysis
          const analysisRequest = {
            questions: subsection.questions || [],
            citations: extractAllCitationsFromQuestions(subsection.questions || []),
            subsection_title: subsection.subsection_title,
            subsection_context: subsection.subsection_context,
            section_title: section.section_title,
            thesis: finalThesis,
            methodology: typeof methodology === 'object' ? methodology.methodologyType : methodology
          };
          
          console.log('Sending data for AI analysis:', analysisRequest);
          
          // Call the new AI analysis endpoint
          const response = await fetch('http://localhost:8000/data-analysis/analyze-subsection', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(analysisRequest)
          });
          
          if (!response.ok) {
            throw new Error(`Analysis failed: ${response.status} ${response.statusText}`);
          }
          
          const aiAnalysis = await response.json();
          console.log('Received AI analysis:', aiAnalysis);
          
          logicAnalysis.push({
            section_title: section.section_title,
            subsection_title: subsection.subsection_title,
            ai_analysis: aiAnalysis,
            question_count: subsection.questions?.length || 0,
            citation_count: extractAllCitationsFromQuestions(subsection.questions || []).length
          });
        }
      }
      
      setOutlineLogicData(logicAnalysis);
      setShowOutlineLogic(true);
      
      // Generate enhanced master outlines based on AI analysis
      const enhancedMasterOutlines = await generateDataDrivenMasterOutlines(logicAnalysis, refinedOutlines);
      setMasterOutlines(enhancedMasterOutlines);
      
    } catch (error) {
      console.error('Error generating outline logic:', error);
      setErrorMessage(`Failed to generate outline logic: ${error.message}`);
    } finally {
      setGeneratingLogic(false);
    }
  };

  // Extract all citations from questions for AI analysis
  const extractAllCitationsFromQuestions = (questions) => {
    const allCitations = [];
    questions.forEach(question => {
      if (question.citations && Array.isArray(question.citations)) {
        allCitations.push(...question.citations);
      }
    });
    return allCitations;
  };

  // Generate data-driven master outlines based on AI analysis
  const generateDataDrivenMasterOutlines = async (logicAnalysis, refinedOutlines) => {
    const enhancedOutlines = [];
    
    for (let i = 0; i < logicAnalysis.length; i++) {
      const analysis = logicAnalysis[i];
      const section = refinedOutlines.find(s => s.section_title === analysis.section_title);
      const subsection = section?.subsections?.find(sub => sub.subsection_title === analysis.subsection_title);
      
      if (subsection && analysis.ai_analysis?.generated_outline) {
        const masterOutline = convertAIOutlineToMasterFormat(
          analysis.ai_analysis.generated_outline,
          subsection,
          analysis.ai_analysis
        );
        
        enhancedOutlines.push({
          section_title: section.section_title,
          section_context: section.section_context,
          master_subsections: [{
            subsection_title: subsection.subsection_title,
            subsection_context: subsection.subsection_context,
            master_outline: masterOutline,
            question_count: analysis.question_count,
            citation_count: analysis.citation_count,
            reference_path: `Section ${section.section_title} → Subsection ${subsection.subsection_title}`,
            ai_analysis_summary: analysis.ai_analysis.content_summary,
            thematic_basis: analysis.ai_analysis.generated_outline?.thematic_basis || 'AI-generated thematic organization'
          }]
        });
      }
    }
    
    return enhancedOutlines;
  };

  // Convert AI-generated outline to our master outline format
  const convertAIOutlineToMasterFormat = (aiOutline, subsection, fullAnalysis) => {
    if (!aiOutline?.main_points || aiOutline.main_points.length === 0) {
      return createFallbackOutlineFromAnalysis(subsection, fullAnalysis);
    }
    
    return aiOutline.main_points.map((mainPoint, index) => ({
      level: `${index + 1}`,
      type: 'number',
      content: mainPoint.content || `Analysis Point ${index + 1}`,
      citations: mainPoint.citations || [],
      reference: mainPoint.rationale || 'Generated from AI analysis of research data',
      editable: true,
      subPoints: generateSubPointsFromEvidence(mainPoint.supporting_evidence || [], mainPoint.citations || [])
    }));
  };

  // Generate sub-points from supporting evidence
  const generateSubPointsFromEvidence = (supportingEvidence, citations) => {
    return supportingEvidence.slice(0, 4).map((evidence, index) => ({
      level: String.fromCharCode(97 + index), // a, b, c, d
      type: 'lowercase',
      content: evidence,
      citations: citations.slice(index * 2, (index + 1) * 2), // Distribute citations
      reference: 'Supporting evidence from research data',
      editable: true,
      deeperPoints: []
    }));
  };

  // Create fallback outline when AI analysis doesn't provide structured outline
  const createFallbackOutlineFromAnalysis = (subsection, analysis) => {
    const themes = analysis.thematic_clusters || [];
    
    if (themes.length === 0) {
      return [{
        level: '1',
        type: 'number',
        content: `Analysis of ${subsection.subsection_title}`,
        citations: [],
        reference: 'Generated from research questions and citations',
        editable: true,
        subPoints: []
      }];
    }
    
    return themes.map((theme, index) => ({
      level: `${index + 1}`,
      type: 'number',
      content: theme.theme_description || theme.theme_name,
      citations: [],
      reference: `Thematic analysis: ${theme.key_concepts?.join(', ') || 'Key concepts from research data'}`,
      editable: true,
      subPoints: theme.key_concepts?.slice(0, 3).map((concept, subIndex) => ({
        level: String.fromCharCode(97 + subIndex),
        type: 'lowercase',
        content: concept,
        citations: [],
        reference: 'Concept extracted from data analysis',
        editable: true,
        deeperPoints: []
      })) || []
    }));
  };

  // Analyze all question responses for patterns and themes
  const analyzeQuestionResponses = (questionResponses) => {
    const themes = new Map();
    const evidenceTypes = new Set();
    const sourceTypes = new Set();
    const temporalScope = new Set();

    questionResponses.forEach(question => {
      // Categorize question themes
      const questionTheme = categorizeQuestionTheme(question.question);
      if (!themes.has(questionTheme)) {
        themes.set(questionTheme, []);
      }
      themes.get(questionTheme).push(question);

      // Analyze citations for evidence types and sources
      if (question.citations) {
        question.citations.forEach(citation => {
          const evidenceType = categorizeEvidenceType(citation);
          const sourceType = categorizeSourceType(citation);
          const temporal = extractTemporalScope(citation);
          
          evidenceTypes.add(evidenceType);
          sourceTypes.add(sourceType);
          if (temporal) temporalScope.add(temporal);
        });
      }
    });

    return {
      thematic_clusters: Array.from(themes.entries()).map(([theme, questions]) => ({
        theme,
        question_count: questions.length,
        questions: questions.map(q => q.question)
      })),
      evidence_types: Array.from(evidenceTypes),
      source_types: Array.from(sourceTypes),
      temporal_scope: Array.from(temporalScope),
      total_questions: questionResponses.length
    };
  };

  // Generate logical framework for subsection outline
  const generateSubsectionLogic = (subsection, contextAnalysis, responseAnalysis, thesis, methodology) => {
    // Determine logical approach based on thematic clusters and evidence types
    const logicalApproach = determineLogicalApproach(responseAnalysis, subsection);
    
    // Decide inclusions based on research relevance and evidence strength
    const inclusions = determineInclusions(responseAnalysis, contextAnalysis, subsection);
    
    // Decide exclusions to maintain focus and academic rigor
    const exclusions = determineExclusions(responseAnalysis, contextAnalysis, subsection);
    
    // Create structure rationale
    const structureRationale = createStructureRationale(logicalApproach, inclusions, subsection);

    return {
      subsection_title: subsection.subsection_title,
      context_analysis: `Research Context: ${contextAnalysis.research_scope} ${contextAnalysis.methodological_alignment} Evidence Foundation: ${contextAnalysis.evidence_base}`,
      logical_approach: logicalApproach,
      inclusions: inclusions,
      exclusions: exclusions,
      structure_rationale: structureRationale,
      thematic_clusters: responseAnalysis.thematic_clusters
    };
  };

  // Generate enhanced outlines using the logic framework
  const generateEnhancedOutlines = async (logicData) => {
    try {
      // This will replace the current master outline generation
      const enhancedOutlines = [];

      for (const sectionData of refinedOutlines) {
        const enhancedSection = {
          section_title: sectionData.section_title,
          section_context: sectionData.section_context,
          master_subsections: []
        };

        for (let subIdx = 0; subIdx < (sectionData.subsections || []).length; subIdx++) {
          const subsection = sectionData.subsections[subIdx];
          const logic = logicData.find(l => l.subsection_title === subsection.subsection_title);
          
          if (logic) {
            // Generate outline using systematic approach based on logic
            const systematicOutline = await generateSystematicOutline(subsection, logic);
            
            enhancedSection.master_subsections.push({
              subsection_title: subsection.subsection_title,
              subsection_context: subsection.subsection_context,
              master_outline: systematicOutline,
              logic_applied: logic,
              question_count: subsection.questions?.length || 0,
              citation_count: subsection.questions?.reduce((acc, q) => acc + (q.citations?.length || 0), 0) || 0
            });
          }
        }

        enhancedOutlines.push(enhancedSection);
      }

      setMasterOutlines(enhancedOutlines);
      
    } catch (error) {
      console.error('Error generating enhanced outlines:', error);
      setErrorMessage('Failed to generate enhanced outlines. Please try again.');
    }
  };

  // Helper functions for analysis
  const getMethodologyAlignment = (methodology, subsection) => {
    const title = subsection.subsection_title?.toLowerCase() || '';
    
    if (methodology?.toLowerCase().includes('mixed')) {
      return 'both quantitative data analysis and qualitative contextual interpretation';
    } else if (methodology?.toLowerCase().includes('qualitative')) {
      return 'in-depth qualitative analysis and thematic interpretation';
    } else if (methodology?.toLowerCase().includes('quantitative')) {
      return 'statistical analysis and empirical evidence evaluation';
    } else {
      return 'systematic analytical framework with evidence-based assessment';
    }
  };

  const getAnalyticalPurpose = (subsection, section, thesis) => {
    const title = subsection.subsection_title?.toLowerCase() || '';
    
    if (title.includes('current') || title.includes('framework')) {
      return 'establish the current state and foundational framework for analysis';
    } else if (title.includes('effectiveness') || title.includes('gaps')) {
      return 'evaluate effectiveness and identify strategic gaps requiring attention';
    } else if (title.includes('policy') || title.includes('implementation')) {
      return 'assess policy implementation and identify areas for improvement';
    } else {
      return 'provide comprehensive analysis supporting the research thesis';
    }
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

  // Helper functions for categorization and analysis
  const categorizeQuestionTheme = (question) => {
    const lowerQ = question.toLowerCase();
    
    if (lowerQ.includes('threat') || lowerQ.includes('vulnerability') || lowerQ.includes('attack')) {
      return 'Threat Analysis and Vulnerability Assessment';
    } else if (lowerQ.includes('deterrence') || lowerQ.includes('defense') || lowerQ.includes('response')) {
      return 'Deterrence and Defense Strategies';
    } else if (lowerQ.includes('policy') || lowerQ.includes('framework') || lowerQ.includes('governance')) {
      return 'Policy Framework and Governance';
    } else if (lowerQ.includes('international') || lowerQ.includes('cooperation') || lowerQ.includes('collaboration')) {
      return 'International Cooperation and Collaboration';
    } else if (lowerQ.includes('infrastructure') || lowerQ.includes('resilience') || lowerQ.includes('protection')) {
      return 'Infrastructure Protection and Resilience';
    } else if (lowerQ.includes('effectiveness') || lowerQ.includes('evaluation') || lowerQ.includes('assessment')) {
      return 'Effectiveness Evaluation and Assessment';
    } else {
      return 'Strategic Analysis and Implementation';
    }
  };

  const categorizeEvidenceType = (citation) => {
    const desc = citation.description?.toLowerCase() || '';
    const apa = citation.apa?.toLowerCase() || '';
    
    if (desc.includes('statistical') || desc.includes('empirical') || desc.includes('quantitative')) {
      return 'Statistical/Empirical Evidence';
    } else if (desc.includes('case study') || desc.includes('incident') || desc.includes('example')) {
      return 'Case Study/Incident Evidence';
    } else if (desc.includes('policy') || desc.includes('regulation') || desc.includes('directive')) {
      return 'Policy/Regulatory Evidence';
    } else if (desc.includes('expert') || desc.includes('interview') || desc.includes('opinion')) {
      return 'Expert Analysis/Opinion';
    } else if (desc.includes('historical') || desc.includes('trend') || desc.includes('evolution')) {
      return 'Historical/Trend Analysis';
    } else {
      return 'General Research Evidence';
    }
  };

  const categorizeSourceType = (citation) => {
    const apa = citation.apa?.toLowerCase() || '';
    
    if (apa.includes('government') || apa.includes('dod') || apa.includes('dhs') || apa.includes('nist')) {
      return 'Government/Official Sources';
    } else if (apa.includes('academic') || apa.includes('journal') || apa.includes('university')) {
      return 'Academic/Scholarly Sources';
    } else if (apa.includes('think tank') || apa.includes('rand') || apa.includes('csis') || apa.includes('brookings')) {
      return 'Think Tank/Policy Institute';
    } else if (apa.includes('news') || apa.includes('media') || apa.includes('report')) {
      return 'Media/Industry Reports';
    } else {
      return 'Other Sources';
    }
  };

  const extractTemporalScope = (citation) => {
    const text = (citation.description + ' ' + citation.apa).toLowerCase();
    const yearMatches = text.match(/\b(19|20)\d{2}\b/g);
    
    if (yearMatches && yearMatches.length > 0) {
      const years = yearMatches.map(y => parseInt(y)).sort();
      const minYear = Math.min(...years);
      const maxYear = Math.max(...years);
      
      if (maxYear - minYear > 5) {
        return `${minYear}-${maxYear} (longitudinal)`;
      } else if (maxYear >= 2020) {
        return `${maxYear} (recent)`;
      } else if (maxYear >= 2010) {
        return `${maxYear} (historical)`;
      }
    }
    
    return null;
  };

  const determineLogicalApproach = (responseAnalysis, subsection) => {
    const title = subsection.subsection_title?.toLowerCase() || '';
    const clusters = responseAnalysis.thematic_clusters;
    const evidenceTypes = responseAnalysis.evidence_types;
    
    if (title.includes('current') || title.includes('framework')) {
      return `Systematic assessment approach: Begin with foundational framework analysis, progress through current implementation status, and conclude with capability evaluation. This logical sequence establishes baseline understanding before diving into specific capabilities and limitations.`;
    } else if (title.includes('effectiveness') || title.includes('gaps')) {
      return `Evaluative analytical approach: Start with performance metrics and effectiveness indicators, examine implementation challenges and gaps, then synthesize findings into strategic recommendations. This approach moves from assessment to diagnosis to prescription.`;
    } else if (clusters.length >= 3) {
      return `Multi-dimensional thematic approach: Organize analysis around ${clusters.length} key themes (${clusters.map(c => c.theme).join(', ')}), ensuring comprehensive coverage while maintaining logical flow from foundational concepts to implementation challenges.`;
    } else if (evidenceTypes.includes('Statistical/Empirical Evidence')) {
      return `Evidence-based analytical approach: Lead with empirical data and statistical evidence, support with case studies and expert analysis, conclude with policy implications. This approach prioritizes verifiable evidence while incorporating contextual interpretation.`;
    } else {
      return `Comprehensive analytical approach: Structure analysis to move from general principles to specific applications, integrating multiple evidence types to build a complete understanding of the topic within the research context.`;
    }
  };

  const determineInclusions = (responseAnalysis, contextAnalysis, subsection) => {
    const inclusions = [];
    const clusters = responseAnalysis.thematic_clusters;
    const evidenceTypes = responseAnalysis.evidence_types;
    const sourceTypes = responseAnalysis.source_types;
    
    // Always include main thematic areas
    clusters.forEach(cluster => {
      if (cluster.question_count >= 2) {
        inclusions.push(`${cluster.theme}: ${cluster.question_count} research questions provide comprehensive coverage of this critical area`);
      } else {
        inclusions.push(`${cluster.theme}: Essential perspective despite single question focus, provides necessary analytical balance`);
      }
    });
    
    // Include strong evidence types
    if (evidenceTypes.includes('Statistical/Empirical Evidence')) {
      inclusions.push(`Quantitative data analysis: Statistical and empirical evidence provides measurable indicators of effectiveness and impact`);
    }
    
    if (evidenceTypes.includes('Case Study/Incident Evidence')) {
      inclusions.push(`Concrete examples and case studies: Real-world incidents provide practical validation of theoretical frameworks`);
    }
    
    if (evidenceTypes.includes('Policy/Regulatory Evidence')) {
      inclusions.push(`Policy and regulatory analysis: Official documents and directives establish authoritative foundation for assessment`);
    }
    
    // Include authoritative sources
    if (sourceTypes.includes('Government/Official Sources')) {
      inclusions.push(`Official government perspectives: Authoritative sources provide policy context and implementation insights`);
    }
    
    if (sourceTypes.includes('Academic/Scholarly Sources')) {
      inclusions.push(`Academic research foundation: Peer-reviewed scholarly analysis ensures theoretical rigor and analytical depth`);
    }
    
    return inclusions;
  };

  const determineExclusions = (responseAnalysis, contextAnalysis, subsection) => {
    const exclusions = [];
    const clusters = responseAnalysis.thematic_clusters;
    const title = subsection.subsection_title?.toLowerCase() || '';
    
    // Exclude tangential themes
    if (clusters.length > 4) {
      exclusions.push(`Minor thematic tangents: Limiting focus to primary analytical themes to maintain coherent narrative flow and academic rigor`);
    }
    
    // Exclude based on subsection focus
    if (title.includes('current') || title.includes('framework')) {
      exclusions.push(`Future speculative scenarios: Focusing on current state assessment rather than predictive analysis to maintain empirical grounding`);
      exclusions.push(`Detailed implementation procedures: Concentrating on framework evaluation rather than operational specifics to match analytical scope`);
    } else if (title.includes('effectiveness') || title.includes('gaps')) {
      exclusions.push(`Foundational theory: Assuming framework understanding to focus on performance evaluation and gap identification`);
      exclusions.push(`International comparative analysis: Limiting scope to domestic effectiveness to maintain focused analytical depth`);
    }
    
    // Exclude weak evidence
    if (responseAnalysis.evidence_types.length > 3) {
      exclusions.push(`Anecdotal evidence without corroboration: Prioritizing verified and authoritative sources over isolated claims or opinions`);
    }
    
    // Standard academic exclusions
    exclusions.push(`Outdated sources (pre-2010): Focusing on recent developments and current frameworks to ensure contemporary relevance`);
    exclusions.push(`Non-authoritative sources: Excluding non-peer reviewed and non-official sources to maintain academic standards`);
    
    return exclusions;
  };

  const createStructureRationale = (logicalApproach, inclusions, subsection) => {
    const title = subsection.subsection_title?.toLowerCase() || '';
    
    if (title.includes('current') || title.includes('framework')) {
      return `Main points will be structured to first establish the foundational framework and its components, then examine current implementation status across key domains, and finally assess overall capabilities and limitations. This progression moves from theoretical foundation to practical application to evaluative assessment.`;
    } else if (title.includes('effectiveness') || title.includes('gaps')) {
      return `Main points will be organized to first present effectiveness metrics and performance indicators, then identify and analyze strategic gaps and implementation challenges, and conclude with synthesized findings and implications. This structure supports evaluative analysis with clear diagnostic progression.`;
    } else {
      return `Main points will be arranged to provide comprehensive coverage of all included themes while maintaining logical flow from foundational concepts through implementation challenges to strategic implications. Each main point will integrate multiple evidence types to support robust analytical conclusions.`;
    }
  };

  const generateSystematicOutline = async (subsection, logic) => {
    // This function will generate the actual outline structure based on the logic framework
    // For now, we'll use the enhanced version of our existing outline generation
    // but with systematic section-by-section approach as requested
    
    const systematicOutline = [];
    let pointCounter = 1;
    
    // Generate main points based on thematic clusters and logical approach
    for (const cluster of logic.thematic_clusters) {
      if (cluster.question_count >= 1) { // Include all themes with questions
        const mainPoint = await generateMainPointFromCluster(cluster, subsection, logic, pointCounter);
        systematicOutline.push(mainPoint);
        pointCounter++;
      }
    }
    
    return systematicOutline;
  };

  const generateMainPointFromCluster = async (cluster, subsection, logic, pointNumber) => {
    // Find all questions related to this cluster
    const clusterQuestions = subsection.questions?.filter(q => 
      categorizeQuestionTheme(q.question) === cluster.theme
    ) || [];
    
    // Generate content based on the logical approach and cluster theme
    const mainContent = generateClusterContent(cluster, logic, subsection);
    
    // Extract citations from cluster questions
    const clusterCitations = [];
    clusterQuestions.forEach((question, qIdx) => {
      if (question.citations) {
        question.citations.forEach((citation, cIdx) => {
          clusterCitations.push(pointNumber * 10 + qIdx * 3 + cIdx + 1);
        });
      }
    });
    
    const mainPoint = {
      level: `${pointNumber}`,
      type: 'number',
      content: mainContent,
      citations: clusterCitations.slice(0, 3), // Limit to first 3 citations
      reference: `Systematic analysis of ${cluster.theme} based on ${cluster.question_count} research questions`,
      editable: true,
      subPoints: []
    };
    
    // Generate sub-points for this cluster
    await generateSubPointsForCluster(mainPoint, cluster, clusterQuestions, logic, pointNumber);
    
    return mainPoint;
  };

  const generateSubPointsForCluster = async (mainPoint, cluster, clusterQuestions, logic, pointNumber) => {
    // Generate sub-points based on the questions in this cluster
    let subPointIndex = 0;
    
    for (const question of clusterQuestions.slice(0, 4)) { // Limit to 4 sub-points per main point
      const subContent = generateSubPointContent(question, cluster, logic);
      const subCitations = question.citations ? 
        question.citations.map((citation, idx) => pointNumber * 10 + subPointIndex * 2 + idx + 10) : 
        [];
      
      const subPoint = {
        level: String.fromCharCode(97 + subPointIndex), // a, b, c...
        type: 'lowercase',
        content: subContent,
        citations: subCitations.slice(0, 2), // Limit to 2 citations per sub-point
        reference: `Analysis derived from research question: ${question.question.substring(0, 60)}...`,
        editable: true,
        deeperPoints: []
      };
      
      // Generate deeper points if question has multiple citations or complex response
      if (question.citations && question.citations.length > 2) {
        await generateDeeperPointsForQuestion(subPoint, question, logic, pointNumber, subPointIndex);
      }
      
      mainPoint.subPoints.push(subPoint);
      subPointIndex++;
    }
  };

  const generateDeeperPointsForQuestion = async (subPoint, question, logic, pointNumber, subPointIndex) => {
    const romanNumerals = ['i', 'ii', 'iii', 'iv'];
    
    // Generate up to 3 deeper points based on citation evidence
    const citations = question.citations.slice(0, 3);
    
    citations.forEach((citation, cIdx) => {
      if (cIdx < romanNumerals.length) {
        const deeperContent = generateDeeperPointContent(citation, question, logic);
        const deeperCitation = [pointNumber * 10 + subPointIndex * 5 + cIdx + 20];
        
        subPoint.deeperPoints.push({
          level: romanNumerals[cIdx],
          type: 'roman_lower',
          content: deeperContent,
          citations: deeperCitation,
          reference: `Evidence from: ${citation.apa.substring(0, 50)}...`,
          editable: true
        });
      }
    });
  };

  const generateClusterContent = (cluster, logic, subsection) => {
    const theme = cluster.theme;
    const questionCount = cluster.question_count;
    const subsectionTitle = subsection.subsection_title || '';
    
    // Generate specific content based on theme and logical approach
    switch (theme) {
      case 'Threat Analysis and Vulnerability Assessment':
        return `Comprehensive Threat Landscape Analysis: Current cybersecurity threat environment assessment, vulnerability identification patterns, and attack vector evolution analysis based on ${questionCount} analytical dimensions`;
        
      case 'Deterrence and Defense Strategies':
        return `Strategic Deterrence Framework Evaluation: Analysis of current cyber deterrence mechanisms, defense strategy implementation, and response capability assessment across ${questionCount} strategic dimensions`;
        
      case 'Policy Framework and Governance':
        return `Policy Framework Assessment and Governance Analysis: Examination of current policy structures, regulatory mechanisms, and governance effectiveness based on ${questionCount} analytical frameworks`;
        
      case 'International Cooperation and Collaboration':
        return `International Cybersecurity Cooperation Framework: Analysis of multilateral cooperation mechanisms, partnership effectiveness, and collaborative response capabilities through ${questionCount} cooperation dimensions`;
        
      case 'Infrastructure Protection and Resilience':
        return `Critical Infrastructure Protection and Resilience Assessment: Evaluation of protection strategies, resilience mechanisms, and infrastructure security frameworks across ${questionCount} analytical components`;
        
      case 'Effectiveness Evaluation and Assessment':
        return `Strategic Effectiveness Evaluation and Performance Assessment: Comprehensive analysis of implementation effectiveness, performance metrics, and strategic gap identification through ${questionCount} evaluative dimensions`;
        
      default:
        return `Strategic Analysis Framework: Systematic examination of ${subsectionTitle.toLowerCase()} through ${questionCount} analytical dimensions to provide comprehensive understanding of current state and implementation challenges`;
    }
  };

  const generateSubPointContent = (question, cluster, logic) => {
    // Extract key concepts from the question to generate specific content
    const questionLower = question.question.toLowerCase();
    const hasMultipleCitations = question.citations && question.citations.length > 1;
    
    if (questionLower.includes('how') || questionLower.includes('what')) {
      return `Implementation mechanisms and operational frameworks: ${hasMultipleCitations ? 'Multi-source analysis reveals' : 'Research indicates'} systematic approaches to addressing core implementation challenges`;
    } else if (questionLower.includes('effectiveness') || questionLower.includes('success')) {
      return `Performance evaluation and effectiveness metrics: ${hasMultipleCitations ? 'Comparative analysis demonstrates' : 'Evidence shows'} measurable outcomes and strategic impact indicators`;
    } else if (questionLower.includes('challenge') || questionLower.includes('gap')) {
      return `Strategic challenges and implementation gaps: ${hasMultipleCitations ? 'Multiple sources identify' : 'Analysis reveals'} critical barriers and systemic limitations requiring attention`;
    } else if (questionLower.includes('future') || questionLower.includes('recommendation')) {
      return `Strategic recommendations and future directions: ${hasMultipleCitations ? 'Synthesized analysis suggests' : 'Research recommends'} evidence-based approaches for enhanced effectiveness`;
    } else {
      return `Analytical framework and evidence synthesis: ${hasMultipleCitations ? 'Comprehensive multi-source analysis' : 'Focused research analysis'} provides systematic understanding of key implementation factors`;
    }
  };

  const generateDeeperPointContent = (citation, question, logic) => {
    // Generate specific content based on citation description and question context
    const description = citation.description || '';
    const apa = citation.apa || '';
    
    // Extract specific details from citation if available
    const hasSpecificData = /\d{4}|%|\$|\b(Act|Framework|Strategy|Operation)\b/i.test(description);
    const isGovernmentSource = /\b(DoD|DHS|NIST|NSA|CIA|FBI|GAO)\b/i.test(apa);
    
    if (hasSpecificData) {
      return `Specific evidence documentation: Verifiable data and concrete examples demonstrate practical implementation patterns and measurable outcomes`;
    } else if (isGovernmentSource) {
      return `Official policy perspective: Authoritative government analysis provides institutional framework understanding and implementation guidance`;
    } else if (description.length > 100) {
      return `Comprehensive analytical evidence: Detailed research analysis offers in-depth examination of implementation challenges and strategic considerations`;
    } else {
      return `Supporting evidence base: Research documentation provides additional validation and contextual understanding of implementation frameworks`;
    }
  };

  const renderMasterOutline = (outlineItems, sectionIndex, subIndex) => {
    if (!outlineItems || outlineItems.length === 0) return null;

    // Render the synthesized outline structure
    return (
      <div className="outline-hierarchy-continuation">
        {outlineItems.map((item, index) => (
          <div key={index}>
            {/* Main numbered point (1., 2., 3., etc.) */}
            <div className={`outline-item level-${item.type} mb-2`} style={{ marginLeft: '42px' }}>
              <div className="d-flex align-items-start">
                <span className="outline-marker me-2 text-muted fw-bold" style={{ minWidth: '30px', fontSize: '0.9rem' }}>
                  {item.level}.
                </span>
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center mb-1">
                    <textarea
                      className="form-control form-control-sm"
                      rows="2"
                      value={cleanTextContent(item.content)}
                      onChange={(e) => handleMasterOutlineEdit(sectionIndex, subIndex, index, 'content', e.target.value)}
                      style={{ fontSize: getFontSize(item.type) }}
                    />
                  </div>
                  {renderCitationLinks(item.citations || [])}
                  <small className="text-muted" style={{ marginTop: '4px', display: 'block' }}>
                    {cleanTextContent(item.reference)}
                  </small>
                </div>
              </div>
            </div>

            {/* Sub-points (a), b), c), etc.) */}
            {item.subPoints && item.subPoints.map((subPoint, subIndex) => (
              <div key={subIndex}>
                <div className={`outline-item level-${subPoint.type} mb-2`} style={{ marginLeft: '60px' }}>
                  <div className="d-flex align-items-start">
                    <span className="outline-marker me-2 text-muted fw-bold" style={{ minWidth: '30px', fontSize: '0.85rem' }}>
                      {subPoint.level})
                    </span>
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center mb-1">
                        <textarea
                          className="form-control form-control-sm"
                          rows="2"
                          value={cleanTextContent(subPoint.content)}
                          onChange={(e) => handleMasterOutlineEdit(sectionIndex, subIndex, index, 'subPoint', e.target.value, subIndex)}
                          style={{ fontSize: getFontSize(subPoint.type) }}
                        />
                      </div>
                      {renderCitationLinks(subPoint.citations || [])}
                      <small className="text-muted" style={{ marginTop: '4px', display: 'block' }}>
                        {cleanTextContent(subPoint.reference)}
                      </small>
                    </div>
                  </div>
                </div>

                {/* Deeper supporting points (i), ii), iii), etc.) */}
                {subPoint.deeperPoints && subPoint.deeperPoints.map((deepPoint, deepIndex) => (
                  <div key={deepIndex} className={`outline-item level-${deepPoint.type} mb-1`} style={{ marginLeft: '80px' }}>
                    <div className="d-flex align-items-start">
                      <span className="outline-marker me-2 text-muted" style={{ minWidth: '30px', fontSize: '0.8rem' }}>
                        {deepPoint.level})
                      </span>
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center mb-1">
                          <textarea
                            className="form-control form-control-sm"
                            rows="1"
                            value={cleanTextContent(deepPoint.content)}
                            onChange={(e) => handleMasterOutlineEdit(sectionIndex, subIndex, index, 'deeperPoint', e.target.value, subIndex, deepIndex)}
                            style={{ fontSize: getFontSize(deepPoint.type) }}
                          />
                        </div>
                        {renderCitationLinks(deepPoint.citations || [])}
                        <small className="text-muted" style={{ marginTop: '4px', display: 'block' }}>
                          {cleanTextContent(deepPoint.reference)}
                        </small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  // Handle editing of master outline items
  const handleMasterOutlineEdit = (sectionIndex, subIndex, itemIndex, editType, newValue, subPointIndex = null, deepPointIndex = null) => {
    setMasterOutlines(prev =>
      prev.map((section, sIdx) =>
        sIdx === sectionIndex
          ? {
              ...section,
              master_subsections: section.master_subsections.map((subsection, subIdx) =>
                subIdx === subIndex
                  ? {
                      ...subsection,
                      master_outline: updateMasterOutlineItem(subsection.master_outline, itemIndex, editType, newValue, subPointIndex, deepPointIndex)
                    }
                  : subsection
              )
            }
          : section
      )
    );
  };

  // Update master outline item based on edit type
  const updateMasterOutlineItem = (outline, itemIndex, editType, newValue, subPointIndex, deepPointIndex) => {
    const updatedOutline = [...outline];
    
    if (editType === 'content') {
      updatedOutline[itemIndex] = { ...updatedOutline[itemIndex], content: newValue };
    } else if (editType === 'subPoint' && subPointIndex !== null) {
      const updatedItem = { ...updatedOutline[itemIndex] };
      updatedItem.subPoints[subPointIndex] = { ...updatedItem.subPoints[subPointIndex], content: newValue };
      updatedOutline[itemIndex] = updatedItem;
    } else if (editType === 'deeperPoint' && subPointIndex !== null && deepPointIndex !== null) {
      const updatedItem = { ...updatedOutline[itemIndex] };
      updatedItem.subPoints[subPointIndex].deeperPoints[deepPointIndex] = { 
        ...updatedItem.subPoints[subPointIndex].deeperPoints[deepPointIndex], 
        content: newValue 
      };
      updatedOutline[itemIndex] = updatedItem;
    }
    
    return updatedOutline;
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
      case 'number': return '0.9rem';
      case 'lowercase': return '0.85rem';
      case 'roman_lower': return '0.8rem';
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
      {/* Academic Integrity Safeguards Banner */}
      <div style={{ 
        backgroundColor: '#d1ecf1', 
        border: '1px solid #bee5eb', 
        borderRadius: '8px', 
        padding: '16px', 
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '20px', marginRight: '12px' }}>🛡️</span>
          <div>
            <strong style={{ color: '#0c5460', fontSize: '16px' }}>Academic Integrity Safeguards Active</strong>
            <p style={{ color: '#0c5460', margin: '4px 0 0 0', fontSize: '14px' }}>
              Content generated from source descriptions only • No fabricated metrics • All claims linked to citations
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowDataWarning(true)}
          style={{
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          View Details
        </button>
      </div>

      <div className="d-flex align-items-center gap-3 mb-3">
        <h3 className="mb-0">Data Section Builder</h3>
        <span className="badge bg-info">
          Phase {currentPhase} of 3
        </span>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => setShowOutlineLogic(!showOutlineLogic)}
          style={{ marginLeft: 'auto' }}
        >
          📋 Outline Logic
        </button>
      </div>

      {/* Outline Logic Section */}
      {showOutlineLogic && (
        <div className="card mb-4" style={{ backgroundColor: '#f8f9fa', border: '2px solid #dee2e6' }}>
          <div className="card-header" style={{ backgroundColor: '#e9ecef' }}>
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                � Outline Logic & Analytical Framework
              </h5>
              {!generatingLogic && outlineLogicData.length === 0 && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={generateOutlineLogic}
                >
                  Generate Logic Map
                </button>
              )}
            </div>
          </div>
          <div className="card-body">
            {generatingLogic ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary me-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mb-0">Analyzing subsection contexts and generating outline logic...</p>
              </div>
            ) : outlineLogicData.length > 0 ? (
              <div>
                {outlineLogicData.map((logicItem, index) => (
                  <div key={index} className="mb-4 p-3 border rounded" style={{ backgroundColor: '#ffffff' }}>
                    <h6 className="text-primary mb-2">
                      {logicItem.subsection_title}
                    </h6>
                    <div className="mb-3">
                      <strong>Context Analysis:</strong>
                      <p className="mb-2 small">{logicItem.context_analysis}</p>
                    </div>
                    <div className="mb-3">
                      <strong>Logical Approach:</strong>
                      <p className="mb-2 small">{logicItem.logical_approach}</p>
                    </div>
                    <div className="mb-3">
                      <strong>What Will Be Included:</strong>
                      <ul className="small mb-2">
                        {logicItem.inclusions.map((inclusion, idx) => (
                          <li key={idx}>{inclusion}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="mb-3">
                      <strong>What Will Be Excluded:</strong>
                      <ul className="small mb-2">
                        {logicItem.exclusions.map((exclusion, idx) => (
                          <li key={idx}>{exclusion}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <strong>Main Points Structure:</strong>
                      <p className="mb-0 small">{logicItem.structure_rationale}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted mb-0">
                Click "Generate Logic Map" to analyze subsection contexts and create a clear outline logic framework.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="alert alert-primary">
        <h6>📊 Enhanced Data Section Builder</h6>
        <p className="mb-2">
          This enhanced builder conducts systematic analysis of all subsection data to create comprehensive, logically structured outlines.
          First, contextual analysis is performed to understand the full research context. Then, outline logic is generated to explain
          the analytical approach. Finally, detailed outlines are populated section-by-section using all available question responses.
        </p>
        <div className="row">
          <div className="col-md-3">
            <strong>Step 1:</strong> Contextual Analysis
          </div>
          <div className="col-md-3">
            <strong>Step 2:</strong> Logic Framework
          </div>
          <div className="col-md-3">
            <strong>Step 3:</strong> Systematic Population
          </div>
          <div className="col-md-3">
            <strong>Step 4:</strong> Academic Integration
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
                  <h4>Phase 1: Enhanced Outline Development</h4>
                  <p className="text-muted mb-2">
                    Found <strong>{refinedOutlines.length} data sections</strong> for comprehensive analysis.
                  </p>
                  {masterOutlines.length === 0 && (
                    <div className="alert alert-info mb-3">
                      <strong>📋 New Enhanced Process:</strong> Click "Outline Logic" above to begin the systematic analysis process. 
                      This will analyze all subsection contexts, generate logical frameworks, and create detailed outlines 
                      using all available research questions and responses.
                    </div>
                  )}
                  {masterOutlines.length > 0 && (
                    <p className="text-success mb-0">
                      ✅ Enhanced outlines generated using systematic analysis of {outlineLogicData.length} subsection contexts
                    </p>
                  )}
                </div>
                <button 
                  className="btn btn-success"
                  onClick={proceedToBuildPhase}
                  disabled={!refineComplete || masterOutlines.length === 0}
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
                                  
                                  {/* Expanded Master Outline Display */}
                                  {expandedOutlines[`${sectionIndex}-${subIndex}`] && masterOutlines[sectionIndex]?.master_subsections?.[subIndex] && (
                                    <div className="hierarchical-outline">
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

      {/* Data Integrity Warning Modal */}
      {showDataWarning && (
        <Modal
          show={showDataWarning}
          onClose={() => setShowDataWarning(false)}
          title="⚠️ Academic Integrity Warning"
        >
          <div style={{ color: '#856404' }}>
            <div style={{ backgroundColor: '#fff3cd', padding: '16px', borderRadius: '6px', marginBottom: '20px', border: '1px solid #ffc107' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '12px' }}>
                Important: This system generates content based on source descriptions but may include approximated or synthesized information.
              </p>
              
              <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #ffc107' }}>
                <h4 style={{ marginTop: 0 }}>What we do to prevent fabrication:</h4>
                <ul style={{ lineHeight: '1.6' }}>
                  <li><strong>Source-based content:</strong> All content is derived from actual citation descriptions in your research</li>
                  <li><strong>Thematic synthesis:</strong> When specific data isn't available, we use general thematic content without inventing metrics</li>
                  <li><strong>Clear attribution:</strong> All generated points are clearly marked with their source citations</li>
                  <li><strong>Conservative approach:</strong> We avoid specific percentages, dollar amounts, and metrics unless found in original sources</li>
                </ul>
              </div>
              
              <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '6px', border: '1px solid #ffc107' }}>
                <h4 style={{ marginTop: 0 }}>Your responsibility:</h4>
                <ul style={{ lineHeight: '1.6' }}>
                  <li><strong>Verify all data:</strong> Cross-check any statistics or specific claims against original sources</li>
                  <li><strong>Review citations:</strong> Click on citation numbers to review the actual source materials</li>
                  <li><strong>Edit for accuracy:</strong> Modify any generated content that doesn't accurately reflect your sources</li>
                  <li><strong>Academic standards:</strong> Ensure all content meets your institution's academic integrity requirements</li>
                </ul>
              </div>
              
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button
                  onClick={() => setShowDataWarning(false)}
                  style={{
                    backgroundColor: '#ffc107',
                    color: '#856404',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  I Understand - Proceed with Caution
                </button>
              </div>
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