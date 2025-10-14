import { useState, useEffect, useRef } from 'react';
import { FaPlay, FaPlayCircle, FaExpand, FaChevronLeft, FaChevronRight, FaCheckCircle, FaSpinner, FaEye, FaInfoCircle, FaPlus, FaMinus, FaSyncAlt, FaPause, FaFastForward } from 'react-icons/fa';
import axios from 'axios';
import Modal from './Modal';

const LiteratureReview = ({
  outlineData,
  finalThesis,
  methodology,
  onLiteratureReviewComplete,
  onTransferToDataAndObservations,
  autoSave,
  onAutoSaveDraft,
  literatureReviewData // receives: { questions, responses, contextMapData, etc. }
}) => {
  // Step-based workflow state (Steps 1-3)
  const [currentStep, setCurrentStep] = useState(0); // 0 = not started, 1-3 = active steps
  const [stepStatus, setStepStatus] = useState({
    1: 'pending', // pending, processing, complete, ready
    2: 'pending',
    3: 'pending'
  });
  
  // Step 1: Contextual Analysis
  const [contextAnalysisComplete, setContextAnalysisComplete] = useState(false);
  const [contextMapData, setContextMapData] = useState(null);
  const [showContextMap, setShowContextMap] = useState(false);
  const [showStep2Interface, setShowStep2Interface] = useState(false);
  const [showStep3Interface, setShowStep3Interface] = useState(false);
  
  // Step 2: Answer Questions (existing functionality)
  const [questions, setQuestions] = useState({}); // { questionKey: "question text" }
  const [responses, setResponses] = useState({}); // { questionKey: [resp1, resp2, ..., fusedResp] }
  const [loading, setLoading] = useState({});
  const [currentResponseIdx, setCurrentResponseIdx] = useState({}); // { questionKey: idx }
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [questionAnsweringComplete, setQuestionAnsweringComplete] = useState(false);
  const isPausedRef = useRef(false); // Use ref for immediate pause detection in async functions
  
  // Step 3: Detailed Outline Builder
  const [detailedOutlineComplete, setDetailedOutlineComplete] = useState(false);
  const [masterOutlines, setMasterOutlines] = useState([]);
  const [expandedOutlines, setExpandedOutlines] = useState({});
  const [editingOutline, setEditingOutline] = useState(null);
  
  // General state
  const [stepProgress, setStepProgress] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [citationReferenceMap, setCitationReferenceMap] = useState({}); // Global citation reference mapping

  // Safe stringify for methodology and thesis
  const safeMethodology = typeof methodology === "string" ? methodology : JSON.stringify(methodology);
  const safeThesis = typeof finalThesis === "string" ? finalThesis : JSON.stringify(finalThesis);

  // Restore state from saved literatureReviewData
  useEffect(() => {
    console.log('🔍 LiteratureReview useEffect - literatureReviewData:', literatureReviewData);
    console.log('🔍 Questions check:', literatureReviewData?.questions);
    console.log('🔍 Responses check:', literatureReviewData?.responses);
    
    // Only restore if we have valid data - don't clear existing state if literatureReviewData becomes null/empty
    if (literatureReviewData && typeof literatureReviewData === 'object' && Object.keys(literatureReviewData).length > 0) {
      console.log('LiteratureReview: Restoring saved state from literatureReviewData:', literatureReviewData);
      
      // Restore step progress
      if (literatureReviewData.currentStep) setCurrentStep(literatureReviewData.currentStep);
      if (literatureReviewData.stepStatus) setStepStatus(literatureReviewData.stepStatus);
      if (literatureReviewData.stepProgress) setStepProgress(literatureReviewData.stepProgress);
      
      // Restore completion flags
      if (literatureReviewData.contextAnalysisComplete) setContextAnalysisComplete(literatureReviewData.contextAnalysisComplete);
      if (literatureReviewData.questionAnsweringComplete) setQuestionAnsweringComplete(literatureReviewData.questionAnsweringComplete);
      if (literatureReviewData.detailedOutlineComplete) setDetailedOutlineComplete(literatureReviewData.detailedOutlineComplete);
      
      // Restore generated data - only if we have actual data
      if (literatureReviewData.contextMapData) setContextMapData(literatureReviewData.contextMapData);
      if (literatureReviewData.questions && Object.keys(literatureReviewData.questions).length > 0) {
        console.log('📝 Loading questions from literatureReviewData:', literatureReviewData.questions);
        setQuestions(literatureReviewData.questions);
      }
      if (literatureReviewData.responses) {
        console.log('📄 Loading responses from literatureReviewData:', literatureReviewData.responses);
        setResponses(literatureReviewData.responses);
      }
      if (literatureReviewData.masterOutlines) setMasterOutlines(literatureReviewData.masterOutlines);
      
      // Restore UI states
      if (literatureReviewData.showContextMap !== undefined) setShowContextMap(literatureReviewData.showContextMap);
      if (literatureReviewData.showStep2Interface !== undefined) setShowStep2Interface(literatureReviewData.showStep2Interface);
      if (literatureReviewData.showStep3Interface !== undefined) setShowStep3Interface(literatureReviewData.showStep3Interface);
      if (literatureReviewData.expandedOutlines) setExpandedOutlines(literatureReviewData.expandedOutlines);
      
      // Auto-show sections based on current step and available data
      if (literatureReviewData.currentStep >= 1 && literatureReviewData.contextMapData) {
        setShowContextMap(true);
      }
      if (literatureReviewData.currentStep >= 2) {
        setShowStep2Interface(true);
      }
      if (literatureReviewData.masterOutlines && literatureReviewData.masterOutlines.length > 0) {
        setShowStep3Interface(true);
      }
      
      console.log('✅ LiteratureReview: State restored from saved data');
    } else if (literatureReviewData === null || literatureReviewData === undefined || Object.keys(literatureReviewData || {}).length === 0) {
      console.log('⚠️ LiteratureReview: Received null/empty literatureReviewData, keeping existing state');
    }
  }, [literatureReviewData]);

  // Build citation reference map using simple running numbers
  const buildCitationReferenceMap = () => {
    const referenceMap = {};
    const globalCitationMap = {}; // Maps citation content to reference number
    let globalRefNumber = 1;
    
    outlineData.forEach((section, sectionIndex) => {
      if (section.subsections) {
        section.subsections.forEach((subsection, subsectionIndex) => {
          if (subsection.questions) {
            subsection.questions.forEach((questionObj, questionIndex) => {
              const questionNum = questionIndex + 1;
              const citations = questionObj.citations || [];
              
              citations.forEach((citation, citationIndex) => {
                const questionKey = `${sectionIndex}-${subsectionIndex}-${questionIndex}`;
                
                // Create a unique key for the citation to avoid duplicates
                const citationKey = `${citation.apa || citation.title || citation.source || citation.author}`;
                
                let referenceNumber;
                if (globalCitationMap[citationKey]) {
                  // Reuse existing reference number for the same citation
                  referenceNumber = globalCitationMap[citationKey];
                } else {
                  // Assign new reference number
                  referenceNumber = globalRefNumber;
                  globalCitationMap[citationKey] = globalRefNumber;
                  globalRefNumber++;
                }
                
                if (!referenceMap[questionKey]) {
                  referenceMap[questionKey] = {};
                }
                
                referenceMap[questionKey][citationIndex] = {
                  referenceNumber,
                  citation,
                  questionNum,
                  citationNum: citationIndex + 1
                };
              });
            });
          }
        });
      }
    });
    
    setCitationReferenceMap(referenceMap);
    return referenceMap;
  };

  // Initialize citation reference map when outline data changes
  useEffect(() => {
    if (outlineData && outlineData.length > 0) {
      buildCitationReferenceMap();
      // Auto-start Step 1 if we haven't started the workflow yet
      if (currentStep === 0) {
        console.log('📚 Auto-starting Step 1: Contextual Analysis');
        startStep1ContextualAnalysis();
      }
    }
  }, [outlineData]);

  // Step 1: Contextual Analysis - Map outline framework context to questions
  const startStep1ContextualAnalysis = () => {
    console.log('🎯 Starting Step 1: Contextual Analysis');
    setCurrentStep(1);
    setStepStatus(prev => ({ ...prev, 1: 'processing' }));
    setErrorMessage('');
    
    try {
      // Build contextual analysis by mapping outline framework contexts to questions
      const contextAnalysis = performContextualAnalysis();
      setContextMapData(contextAnalysis);
      setContextAnalysisComplete(true);
      setStepStatus(prev => ({ ...prev, 1: 'complete', 2: 'ready' }));
      setShowContextMap(true);
      setCurrentStep(2);
      
      console.log('✅ Step 1: Contextual Analysis complete');
      
      // Auto-save the progress
      if (autoSave && onAutoSaveDraft) {
        onAutoSaveDraft({
          currentStep: 2,
          stepStatus: { 1: 'complete', 2: 'ready', 3: 'pending' },
          contextAnalysisComplete: true,
          contextMapData: contextAnalysis,
          showContextMap: true,
          showStep2Interface: true,
          showStep3Interface: false,
          questions: questions,
          responses: responses,
          masterOutlines: masterOutlines
        });
      }
    } catch (error) {
      console.error('❌ Error in Step 1:', error);
      setErrorMessage(`Failed to complete contextual analysis: ${error.message}`);
      setStepStatus(prev => ({ ...prev, 1: 'pending' }));
    }
  };

  // Perform contextual analysis - map outline framework context to sections and questions
  const performContextualAnalysis = () => {
    const contextData = {
      overallContext: {
        thesis: finalThesis,
        methodology: methodology,
        paperType: { name: 'Literature Review Analysis' },
        totalSections: outlineData?.length || 0,
        totalQuestions: getTotalQuestions()
      },
      literatureSections: []
    };

    outlineData.forEach((section, sectionIndex) => {
      const sectionAnalysis = {
        sectionTitle: section.section_title,
        sectionContext: section.section_context,
        literatureComponent: 'Research Analysis',
        detailedMapping: {
          thesisConnection: `This section directly supports the thesis by examining: ${section.section_context}`,
          methodologyAlignment: `Aligns with ${typeof methodology === 'object' ? methodology.methodologyType : methodology} methodology through systematic literature analysis`,
          evidenceRole: `Provides foundational research evidence from authoritative sources`,
          analyticalPurpose: `Establishes theoretical framework and empirical foundation for thesis arguments`
        },
        subsections: []
      };

      if (section.subsections) {
        section.subsections.forEach((subsection, subIndex) => {
          const subsectionAnalysis = {
            title: subsection.subsection_title,
            context: subsection.subsection_context,
            questionCount: subsection.questions?.length || 0,
            citationCount: subsection.questions?.reduce((acc, q) => acc + (q.citations?.length || 0), 0) || 0,
            detailedMapping: {
              thesisSupport: `Supports thesis through: ${subsection.subsection_context}`,
              methodologyRole: `Contributes to literature review methodology by providing structured analysis`,
              evidenceContribution: `Offers ${subsection.questions?.length || 0} research questions with ${subsection.questions?.reduce((acc, q) => acc + (q.citations?.length || 0), 0) || 0} citations`,
              analyticalFunction: `Performs systematic literature analysis within the broader section framework`
            }
          };
          sectionAnalysis.subsections.push(subsectionAnalysis);
        });
      }

      contextData.literatureSections.push(sectionAnalysis);
    });

    return contextData;
  };

  // Get total number of questions across all sections
  const getTotalQuestions = () => {
    let total = 0;
    outlineData?.forEach(section => {
      section.subsections?.forEach(subsection => {
        total += subsection.questions?.length || 0;
      });
    });
    return total;
  };

  // Step 2: Answer Questions (enhanced existing functionality)
  const startStep2AnswerQuestions = () => {
    console.log('📝 Starting Step 2: Answer Questions');
    setCurrentStep(2);
    setStepStatus(prev => ({ ...prev, 2: 'processing' }));
    setErrorMessage('');
    
    // Step 2 uses existing question answering functionality
    // We just need to track completion and move to Step 3
    console.log('Step 2 ready - use existing question answering interface');
  };

  // Check if all questions have been answered
  const checkQuestionAnsweringComplete = () => {
    const totalQuestions = getTotalQuestions();
    const answeredQuestions = Object.keys(responses).filter(key => 
      responses[key] && responses[key].length > 0
    ).length;
    
    const isComplete = totalQuestions > 0 && answeredQuestions === totalQuestions;
    
    if (isComplete && !questionAnsweringComplete) {
      setQuestionAnsweringComplete(true);
      setStepStatus(prev => ({ ...prev, 2: 'complete', 3: 'ready' }));
      setCurrentStep(3);
      
      // Auto-save progress
      if (autoSave && onAutoSaveDraft) {
        onAutoSaveDraft({
          currentStep: 3,
          stepStatus: { 1: 'complete', 2: 'complete', 3: 'ready' },
          questionAnsweringComplete: true,
          questions: questions,
          responses: responses
        });
      }
    }
    
    return isComplete;
  };

  // Step 3: Detailed Outline Builder
  const startStep3DetailedOutlineBuilder = () => {
    console.log('🏗️ Starting Step 3: Detailed Outline Builder');
    setCurrentStep(3);
    setStepStatus(prev => ({ ...prev, 3: 'processing' }));
    setErrorMessage('');
    setStepProgress('Generating detailed hierarchical outlines from fused responses...');
    
    try {
      // Generate master outlines from the fused responses
      const generatedOutlines = generateMasterOutlinesFromResponses();
      setMasterOutlines(generatedOutlines);
      setDetailedOutlineComplete(true);
      setStepStatus(prev => ({ ...prev, 3: 'complete' }));
      setStepProgress('');
      
      console.log('✅ Step 3: Detailed Outline Builder complete');
      
      // Auto-save progress
      if (autoSave && onAutoSaveDraft) {
        onAutoSaveDraft({
          currentStep: 3,
          stepStatus: { 1: 'complete', 2: 'complete', 3: 'complete' },
          detailedOutlineComplete: true,
          questions: questions,
          masterOutlines: generatedOutlines,
          responses: responses
        });
      }
      
      // Notify parent component of completion
      if (onLiteratureReviewComplete) {
        onLiteratureReviewComplete({
          responses: responses,
          masterOutlines: generatedOutlines,
          contextMapData: contextMapData,
          completionStatus: 'complete'
        });
      }
    } catch (error) {
      console.error('❌ Error in Step 3:', error);
      setErrorMessage(`Failed to generate detailed outlines: ${error.message}`);
      setStepStatus(prev => ({ ...prev, 3: 'pending' }));
      setStepProgress('');
    }
  };

  // Generate master outlines from fused responses using hierarchical structure
  const generateMasterOutlinesFromResponses = () => {
    const masterOutlines = [];
    
    outlineData.forEach((section, sectionIndex) => {
      const sectionOutline = {
        section_title: section.section_title,
        section_context: section.section_context,
        master_subsections: []
      };
      
      if (section.subsections) {
        section.subsections.forEach((subsection, subsectionIndex) => {
          const masterSubsection = generateSubsectionMasterOutline(
            subsection, 
            section, 
            sectionIndex, 
            subsectionIndex
          );
          sectionOutline.master_subsections.push(masterSubsection);
        });
      }
      
      masterOutlines.push(sectionOutline);
    });
    
    return masterOutlines;
  };

  // Generate detailed master outline for a subsection
  const generateSubsectionMasterOutline = (subsection, section, sectionIndex, subsectionIndex) => {
    const masterOutline = [];
    let pointCounter = 1;
    
    if (subsection.questions) {
      subsection.questions.forEach((question, questionIndex) => {
        const questionKey = `${sectionIndex}-${subsectionIndex}-${questionIndex}`;
        const questionResponses = responses[questionKey];
        
        if (questionResponses && questionResponses.length > 0) {
          // Use the fused response (last item in array) for outline content
          const fusedResponse = questionResponses[questionResponses.length - 1];
          const citations = question.citations || [];
          
          // Create main point from fused response
          const mainPoint = {
            level: `${pointCounter}`,
            type: 'number',
            content: extractMainContentFromResponse(fusedResponse, question.question),
            citations: extractCitationNumbers(fusedResponse),
            reference: `Research Question ${questionIndex + 1}: ${question.question}`,
            editable: true,
            subPoints: generateSubPointsFromResponse(fusedResponse, citations)
          };
          
          masterOutline.push(mainPoint);
          pointCounter++;
        }
      });
    }
    
    return {
      subsection_title: subsection.subsection_title,
      subsection_context: subsection.subsection_context,
      master_outline: masterOutline,
      question_count: subsection.questions?.length || 0,
      citation_count: subsection.questions?.reduce((acc, q) => acc + (q.citations?.length || 0), 0) || 0,
      reference_path: `Section ${section.section_title} → Subsection ${subsection.subsection_title}`,
      thematic_basis: 'Generated from fused literature review responses'
    };
  };

  // Extract main content from fused response
  const extractMainContentFromResponse = (response, question) => {
    if (!response) return `Analysis of: ${question}`;
    
    // Extract the first substantial paragraph as main content
    const paragraphs = response.split('\n\n').filter(p => p.trim().length > 50);
    if (paragraphs.length > 0) {
      return paragraphs[0].trim().substring(0, 200) + (paragraphs[0].length > 200 ? '...' : '');
    }
    
    return response.substring(0, 150) + (response.length > 150 ? '...' : '');
  };

  // Extract citation numbers from response text
  const extractCitationNumbers = (text) => {
    if (!text) return [];
    const citationMatches = text.match(/\[(\d+(?:,\s*\d+)*)\]/g) || [];
    const numbers = [];
    citationMatches.forEach(match => {
      const nums = match.replace(/[\[\]]/g, '').split(',').map(n => parseInt(n.trim()));
      numbers.push(...nums);
    });
    return [...new Set(numbers)]; // Remove duplicates
  };

  // Generate sub-points from response content
  const generateSubPointsFromResponse = (response, citations) => {
    if (!response) return [];
    
    const paragraphs = response.split('\n\n').filter(p => p.trim().length > 30);
    const subPoints = [];
    
    // Create sub-points from subsequent paragraphs (skip first which is main content)
    paragraphs.slice(1, 4).forEach((paragraph, index) => {
      const subPoint = {
        level: String.fromCharCode(97 + index), // a, b, c
        type: 'lowercase',
        content: paragraph.trim().substring(0, 180) + (paragraph.length > 180 ? '...' : ''),
        citations: extractCitationNumbers(paragraph),
        reference: `Supporting analysis from literature review`,
        editable: true,
        deeperPoints: []
      };
      subPoints.push(subPoint);
    });
    
    return subPoints;
  };

  // Toggle context map visibility
  const toggleContextMap = () => {
    setShowContextMap(!showContextMap);
  };

  // Toggle Step 2 interface visibility
  const toggleStep2Interface = () => {
    setShowStep2Interface(!showStep2Interface);
  };

  // Toggle Step 3 interface visibility
  const toggleStep3Interface = () => {
    setShowStep3Interface(!showStep3Interface);
  };

  // Toggle outline expansion
  const toggleOutlineExpansion = (sectionIndex, subsectionIndex) => {
    const key = `${sectionIndex}-${subsectionIndex}`;
    setExpandedOutlines(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Function to generate complete hierarchical outline
  const generateCompleteOutline = () => {
    const completeOutline = [];
    
    outlineData.forEach((section, sectionIndex) => {
      // Level 1: Section (I, II, III, IV...)
      const sectionLevel1 = {
        level: 1,
        number: toRomanNumeral(sectionIndex + 1),
        title: section.section_title,
        content: section.section_context,
        children: [],
        // Preserve data section metadata from outline framework
        section_title: section.section_title,
        section_context: section.section_context,
        is_data_section: section.is_data_section || false,
        section_type: section.section_type || 'content',
        category: section.category || 'content_section',
        is_administrative: section.is_administrative || false,
        subsections: section.subsections || []
      };
      
      if (section.subsections) {
        section.subsections.forEach((subsection, subsectionIndex) => {
          // Level 2: Subsection (A, B, C, D...)
          const subsectionLevel2 = {
            level: 2,
            number: toLetter(subsectionIndex),
            title: subsection.subsection_title,
            content: subsection.subsection_context,
            children: []
          };
          
          if (subsection.questions) {
            subsection.questions.forEach((questionObj, questionIndex) => {
              const questionKey = `${sectionIndex}-${subsectionIndex}-${questionIndex}`;
              const responseArray = responses[questionKey];
              
              // Always use the last response (fused/master outline) if available
              if (responseArray && responseArray.length > 0) {
                const fusedResponse = responseArray[responseArray.length - 1]; // Last response is always fused
                const responseContent = {
                  level: 3,
                  question: questionObj.question,
                  content: fusedResponse,
                  responseType: 'fused'
                };
                
                subsectionLevel2.children.push(responseContent);
              }
            });
          }
          
          sectionLevel1.children.push(subsectionLevel2);
        });
      }
      
      completeOutline.push(sectionLevel1);
    });
    
    return completeOutline;
  };

  // Utility functions for numbering
  const toRomanNumeral = (num) => {
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
    return romanNumerals[num - 1] || `${num}`;
  };

  const toLetter = (num) => {
    return String.fromCharCode(65 + num); // A, B, C, D...
  };

  // Generate all responses for a question: one per citation, then fused
  const generateAllQuestionResponses = async (sectionIndex, subsectionIndex, questionIndex, questionObj) => {
    const key = `${sectionIndex}-${subsectionIndex}-${questionIndex}`;
    setLoading(prev => ({ ...prev, [key]: true }));

    try {
      const sectionContext = outlineData[sectionIndex]?.section_context;
      const subsectionContext = outlineData[sectionIndex]?.subsections[subsectionIndex]?.subsection_context;
      const citations = questionObj.citations || [];
      const questionNum = questionIndex + 1;
      const questionRefs = citationReferenceMap[key] || {};

      // 1. Generate outline for each citation
      const citationResponses = [];
      for (let i = 0; i < citations.length; i++) {
        const c = citations[i] || {};
        const safeCitation = {
          apa: typeof c.apa === "string" ? c.apa : null,
          title: typeof c.title === "string" ? c.title : null,
          source: typeof c.source === "string" ? c.source : null,
          author: typeof c.author === "string" ? c.author : null
        };
        const safeMethodology = typeof methodology === "string" ? methodology : JSON.stringify(methodology);
        const safeThesis = typeof finalThesis === "string" ? finalThesis : JSON.stringify(finalThesis);

        // Include reference ID in the request
        const referenceInfo = questionRefs[i] || {};
        const referenceNumber = referenceInfo.referenceNumber || (i + 1);

        const response = await axios.post('http://localhost:8000/generate_citation_response', {
          question: questionObj.question,
          citation: safeCitation,
          section_context: sectionContext,
          subsection_context: subsectionContext,
          thesis: safeThesis,
          methodology: safeMethodology,
          question_number: questionNum,
          citation_number: i + 1,
          reference_id: referenceNumber.toString() // Add reference number to backend call
        });
        citationResponses.push(response.data.response);
      }

      // 2. Generate fused/master outline
      let fusedResponse = '';
      if (citationResponses.length > 0) {
        const safeCitations = citations.map((c, i) => ({
          apa: typeof c.apa === "string" ? c.apa : null,
          title: typeof c.title === "string" ? c.title : null,
          source: typeof c.source === "string" ? c.source : null,
          author: typeof c.author === "string" ? c.author : null,
          reference_id: (questionRefs[i]?.referenceNumber || (i + 1)).toString()
        }));
        const fusedResp = await axios.post('http://localhost:8000/generate_fused_response', {
          question: questionObj.question,
          citation_responses: citationResponses,
          citations: safeCitations,
          section_context: sectionContext,
          subsection_context: subsectionContext,
          thesis: safeThesis,
          methodology: safeMethodology,
          question_number: questionNum,
          citation_references: Object.values(questionRefs).map(ref => ({
            reference_id: ref.referenceNumber.toString(),
            citation: ref.citation
          }))
        });
        fusedResponse = fusedResp.data.response;
      }

      // Update responses and auto-save with the latest state
      setResponses(prev => {
        const updated = {
          ...prev,
          [key]: [...citationResponses, fusedResponse]
        };
        setCurrentResponseIdx(idxPrev => ({
          ...idxPrev,
          [key]: 0
        }));
        // Auto-save with the latest responses
        if (autoSave && onAutoSaveDraft) {
          onAutoSaveDraft({
            outline: outlineData,
            questions: questions,
            responses: updated,
            thesis: finalThesis,
            methodology,
            citationReferenceMap: citationReferenceMap,
            currentStep: currentStep,
            stepStatus: stepStatus
          });
        }
        
        // Check if all questions are now answered
        setTimeout(() => checkQuestionAnsweringComplete(), 100);
        
        return updated;
      });

    } catch (error) {
      console.error('Error generating responses:', error);
      alert('Failed to generate responses. Please try again.');
    }

    setLoading(prev => ({ ...prev, [key]: false }));
  };

  // Navigation for responses
  const handlePrevResponse = (key) => {
    setCurrentResponseIdx(prev => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) - 1)
    }));
  };
  const handleNextResponse = (key) => {
    setCurrentResponseIdx(prev => ({
      ...prev,
      [key]: Math.min((responses[key]?.length || 1) - 1, (prev[key] || 0) + 1)
    }));
  };
  const handleJumpToResponse = (key, idx) => {
    setCurrentResponseIdx(prev => ({
      ...prev,
      [key]: idx
    }));
  };

  // Modal controls
  const openModal = (response, question) => {
    setSelectedResponse({ response, question });
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setSelectedResponse(null);
  };

  // Pause function
  const pauseProcessing = () => {
    isPausedRef.current = true;
    setBatchProcessing(false);
    console.log('Response generation paused by user');
  };

  // Resume/start function
  const startOrResumeProcessing = () => {
    setBatchProcessing(true); // Set immediately for UI feedback
    isPausedRef.current = false;
    generateAllResponses();
  };

  // Skip to Step 3 function for testing
  const skipToStep3 = () => {
    console.log('🚀 Skipping to Step 3 for testing purposes');
    setBatchProcessing(false);
    isPausedRef.current = false;
    setQuestionAnsweringComplete(true);
    setCurrentStep(3);
    // Force step status update
    setTimeout(() => checkQuestionAnsweringComplete(), 100);
  };

  // Batch processing with pause functionality
  const generateAllResponses = async () => {
    // batchProcessing state is set in startOrResumeProcessing for immediate UI feedback
    isPausedRef.current = false;
    
    for (const [sectionIndex, section] of outlineData.entries()) {
      // Check if paused using ref for immediate detection
      if (isPausedRef.current) {
        console.log('Response generation paused by user');
        return;
      }
      
      if (section.subsections) {
        for (const [subsectionIndex, subsection] of section.subsections.entries()) {
          // Check if paused
          if (isPausedRef.current) {
            console.log('Response generation paused by user');
            return;
          }
          
          if (subsection.questions) {
            for (const [questionIndex, questionObj] of subsection.questions.entries()) {
              // Check if paused before each question
              if (isPausedRef.current) {
                console.log('Response generation paused by user');
                return;
              }
              
              const key = `${sectionIndex}-${subsectionIndex}-${questionIndex}`;
              if (!responses[key]) {
                try {
                  await generateAllQuestionResponses(sectionIndex, subsectionIndex, questionIndex, questionObj);
                  // Check if paused after generation
                  if (isPausedRef.current) {
                    console.log('Response generation paused by user after completing question');
                    return;
                  }
                  await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                  console.error('Error generating response for question:', error);
                  // Continue to next question on error
                }
              }
            }
          }
        }
      }
    }
    
    setBatchProcessing(false);
    isPausedRef.current = false;
    
    // Check completion after batch processing
    setTimeout(() => checkQuestionAnsweringComplete(), 500);
  };

  // Completion tracking
  const getCompletedQuestions = () => Object.keys(responses).length;

  if (!outlineData || outlineData.length === 0) {
    return (
      <div className="text-center py-5">
        <h4>No outline data available</h4>
        <p className="text-muted">Please complete the Outline Framework first.</p>
      </div>
    );
  }

  return (
    <div className="literature-review">
      {/* Step-based Progress Header */}
      <div className="mb-4">
        <div className="d-flex align-items-center gap-3 mb-3">
          <h3 className="mb-0">Enhanced Literature Review Builder</h3>
          <span className="badge bg-info">
            {getCompletedQuestions()} / {getTotalQuestions()} Questions Answered
          </span>
        </div>
        
        {/* Step Progress Indicators */}
        <div className="row">
          {[1, 2, 3].map(step => {
            const isActive = stepStatus[step] === 'processing';
            const isComplete = stepStatus[step] === 'complete';
            const isReady = stepStatus[step] === 'ready';
            const isPending = stepStatus[step] === 'pending' || !stepStatus[step];
            const isAccessible = step <= currentStep || isComplete || isReady;
            
            return (
              <div key={step} className="col-md-4 mb-2">
                <div 
                  className={`card h-100 ${
                    isComplete ? 'border-success' :
                    isActive ? 'border-primary' :
                    isReady ? 'border-warning' :
                    isAccessible ? 'border-secondary' :
                    'border-light'
                  }`}
                  style={{ 
                    backgroundColor: isComplete ? '#d1e7dd' : 
                                   isActive ? '#cff4fc' : 
                                   isReady ? '#fff3cd' :
                                   isAccessible ? '#f8f9fa' : '#f1f3f5',
                    opacity: isAccessible ? 1 : 0.5,
                    transition: 'all 0.3s ease',
                    animation: isActive ? 'gentlePulse 2s ease-in-out infinite' : 
                              isReady ? 'gentlePulse 3s ease-in-out infinite' : 'none',
                    transform: (isActive || isReady) ? 'scale(1.02)' : 'scale(1)'
                  }}
                >
                  <div className="card-body p-3">
                    {/* Progress Circle Above */}
                    <div className="d-flex justify-content-center mb-2">
                      <div 
                        className={`rounded-circle d-flex align-items-center justify-content-center`}
                        style={{ 
                          width: '40px', 
                          height: '40px',
                          backgroundColor: isComplete ? '#198754' :
                                         isActive ? '#0dcaf0' : 
                                         isReady ? '#ffc107' :
                                         isAccessible ? '#6c757d' : '#adb5bd',
                          color: isReady ? '#000' : 'white',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          animation: (isActive || isReady) ? 'gentlePulse 2s ease-in-out infinite' : 'none'
                        }}
                      >
                        {isComplete ? '✓' : isReady ? '⚡' : step}
                      </div>
                    </div>
                    {/* Step Content Below Circle */}
                    <div className="text-center" style={{ opacity: isAccessible ? 1 : 0.6 }}>
                      <h6 className="mb-1" style={{ 
                        color: isComplete ? '#198754' :
                              isActive ? '#0dcaf0' :
                              isReady ? '#b8860b' :
                              isAccessible ? '#495057' : '#adb5bd'
                      }}>
                        Step {step}: {
                          step === 1 ? 'Contextual Analysis' :
                          step === 2 ? 'Answer Questions' :
                          'Detailed Outline Builder'
                        }
                      </h6>
                      <small style={{ 
                        color: isComplete ? '#198754' :
                              isActive ? '#0dcaf0' :
                              isReady ? '#b8860b' :
                              isAccessible ? '#6c757d' : '#adb5bd'
                      }}>
                        {isComplete ? 'Complete' :
                         isActive ? (stepProgress || 'Processing...') :
                         isReady ? (
                           step === 2 ? (
                             getCompletedQuestions() === 0 ? 'Ready to Start' :
                             questionAnsweringComplete ? 'Complete - Ready for Step 3' :
                             (!batchProcessing && getCompletedQuestions() > 0 && getCompletedQuestions() < getTotalQuestions()) ? 
                               `Paused (${getCompletedQuestions()}/${getTotalQuestions()})` :
                               `In Progress (${getCompletedQuestions()}/${getTotalQuestions()})`
                           ) : 'Ready to Start'
                         ) :
                         isPending ? 'Pending' : 'Waiting'}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="d-flex gap-2 mt-3">
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={toggleContextMap}
            disabled={!contextAnalysisComplete}
          >
            Context Map
          </button>
          <button
            className="btn btn-outline-secondary btn-sm ms-2"
            onClick={toggleStep2Interface}
            disabled={currentStep < 2}
          >
            Step 2 Questions
          </button>
          <button
            className="btn btn-outline-secondary btn-sm ms-2"
            onClick={toggleStep3Interface}
            disabled={currentStep < 1 || !outlineData || outlineData.length === 0}
          >
            Step 3 Outline
          </button>
          {detailedOutlineComplete && (
            <button
              className="btn btn-success btn-sm"
              onClick={() => {
                if (onLiteratureReviewComplete) {
                  onLiteratureReviewComplete({
                    responses: responses,
                    masterOutlines: masterOutlines,
                    contextMapData: contextMapData,
                    completionStatus: 'complete'
                  });
                }
              }}
            >
              Complete Literature Review
            </button>
          )}
          {/* Continue Step 2 button - only when questions started but not all completed */}
          {currentStep >= 1 && currentStep <= 2 && getCompletedQuestions() > 0 && !questionAnsweringComplete && (
            <button
              className={`btn ${currentStep === 2 && !batchProcessing ? 'btn-warning' : 'btn-primary'} btn-sm border-warning`}
              onClick={batchProcessing ? pauseProcessing : startOrResumeProcessing}
              title={batchProcessing ? "Pause response generation" : "Continue answering questions from where you left off"}
              style={{
                backgroundColor: '#fff3cd',
                borderColor: '#ffc107',
                color: '#b8860b',
                animation: currentStep === 2 && !batchProcessing ? 'gentlePulse 2s ease-in-out infinite' : 'none'
              }}
            >
              {batchProcessing ? (
                <>
                  <FaPause className="me-1" />
                  Pause Step 2
                </>
              ) : (
                <>
                  <FaPlay className="me-1" />
                  Continue Step 2
                </>
              )}
            </button>
          )}

          
          {/* Step 2 Ready button - only when Step 2 is ready but no questions started yet */}
          {stepStatus[2] === 'ready' && getCompletedQuestions() === 0 && (
            <button
              className="btn btn-sm border-warning"
              onClick={batchProcessing ? pauseProcessing : startOrResumeProcessing}
              title={batchProcessing ? "Pause response generation" : "Step 2 Ready - Start answering questions"}
              style={{
                backgroundColor: '#fff3cd',
                borderColor: '#ffc107',
                color: '#b8860b',
                animation: !batchProcessing ? 'gentlePulse 2s ease-in-out infinite' : 'none'
              }}
            >
              {batchProcessing ? (
                <>
                  <FaPause className="me-1" />
                  Pause Step 2
                </>
              ) : (
                <>
                  <FaPlay className="me-1" />
                  Step 2 Ready
                </>
              )}
            </button>
          )}
          {stepStatus[3] === 'ready' && (
            <button
              className="btn btn-outline-success btn-sm"
              onClick={startStep3DetailedOutlineBuilder}
              title="Start Step 3 - Generate detailed outlines"
            >
              <FaPlay className="me-1" />
              Start Step 3
            </button>
          )}
        </div>

        {/* Test row - Skip to Step 3 button */}
        <div className="d-flex gap-2 mt-2">
          {(currentStep >= 1 && currentStep <= 2 && !questionAnsweringComplete) && (
            <button
              className="btn btn-primary btn-sm"
              onClick={skipToStep3}
              title="Skip Step 2 and proceed directly to Step 3 (for testing)"
              style={{
                backgroundColor: '#0d6efd',
                borderColor: '#0d6efd',
                color: 'white'
              }}
            >
              Test: Skip to Step 3 Now
            </button>
          )}
        </div>
      </div>

      {/* CSS for gentle pulsing animation */}
      <style>{`
        @keyframes gentlePulse {
          0% { 
            transform: scale(1); 
            opacity: 1; 
            box-shadow: 0 0 0 0 rgba(13, 202, 240, 0.4);
          }
          50% { 
            transform: scale(1.01); 
            opacity: 0.9; 
            box-shadow: 0 0 0 10px rgba(13, 202, 240, 0.1);
          }
          100% { 
            transform: scale(1); 
            opacity: 1; 
            box-shadow: 0 0 0 0 rgba(13, 202, 240, 0);
          }
        }
      `}</style>

      {/* Context Map Section */}
      {showContextMap && (
        <div className="card mb-4" style={{ backgroundColor: '#f0f8ff', border: '2px solid #007bff' }}>
          <div className="card-header" style={{ backgroundColor: '#e3f2fd' }}>
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Context Map - Step 1 Analysis</h5>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={toggleContextMap}
              >
                Close
              </button>
            </div>
          </div>
          <div className="card-body">
            {contextMapData ? (
              <div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <h6>Overall Context</h6>
                    <ul className="list-unstyled">
                      <li><strong>Thesis Focus:</strong> {contextMapData.overallContext.thesis?.substring(0, 100)}...</li>
                      <li><strong>Methodology:</strong> {contextMapData.overallContext.methodology?.methodologyType || contextMapData.overallContext.methodology}</li>
                      <li><strong>Paper Type:</strong> {contextMapData.overallContext.paperType?.name}</li>
                      <li><strong>Literature Sections:</strong> {contextMapData.overallContext.totalSections}</li>
                      <li><strong>Research Questions:</strong> {contextMapData.overallContext.totalQuestions}</li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <h6>Literature Review Context Analysis</h6>
                    <p className="small text-muted">
                      This analysis maps each section and subsection's context from the Outline Framework, 
                      explaining how each component supports your thesis through systematic literature analysis. 
                      Each question is answered through the lens of its specific contextual purpose.
                    </p>
                  </div>
                </div>
                
                <h6>Section & Subsection Context Mappings</h6>
                {contextMapData.literatureSections.map((section, index) => (
                  <div key={index} className="card mb-3" style={{ border: '2px solid #0dcaf0' }}>
                    <div className="card-header" style={{ backgroundColor: '#e0f7fa' }}>
                      <div className="d-flex justify-content-between align-items-center">
                        <h6 className="text-primary mb-0">{section.sectionTitle}</h6>
                        <span className="badge bg-info">{section.literatureComponent}</span>
                      </div>
                    </div>
                    <div className="card-body p-3">
                      {/* Section Context */}
                      <div className="mb-3 p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <strong className="text-primary">Section Context:</strong>
                        <p className="small mt-1 mb-2">{section.sectionContext}</p>
                        
                        <div className="row mt-3">
                          <div className="col-md-6">
                            <div className="mb-2">
                              <strong className="text-success">Thesis Connection:</strong>
                              <p className="small mt-1">{section.detailedMapping.thesisConnection}</p>
                            </div>
                            <div className="mb-2">
                              <strong className="text-info">Methodology Alignment:</strong>
                              <p className="small mt-1">{section.detailedMapping.methodologyAlignment}</p>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-2">
                              <strong className="text-warning">Evidence Role:</strong>
                              <p className="small mt-1">{section.detailedMapping.evidenceRole}</p>
                            </div>
                            <div className="mb-2">
                              <strong className="text-secondary">Analytical Purpose:</strong>
                              <p className="small mt-1">{section.detailedMapping.analyticalPurpose}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Subsection Mappings */}
                      <h6 className="text-info mb-3">Subsection Context Mappings</h6>
                      {section.subsections.map((subsection, subIndex) => (
                        <div key={subIndex} className="mb-3 p-3" style={{ 
                          backgroundColor: '#fff8e7', 
                          borderRadius: '6px',
                          borderLeft: '4px solid #ffc107'
                        }}>
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className="text-dark mb-1">{subsection.title}</h6>
                            <div>
                              <span className="badge bg-secondary me-1">{subsection.questionCount} Q</span>
                              <span className="badge bg-success">{subsection.citationCount} Citations</span>
                            </div>
                          </div>
                          
                          <div className="mb-2">
                            <strong className="text-primary">Context:</strong>
                            <p className="small mt-1 mb-2">{subsection.context}</p>
                          </div>
                          
                          <div className="row mt-2">
                            <div className="col-md-6">
                              <div className="mb-2">
                                <strong className="text-success">Thesis Support:</strong>
                                <p className="small mt-1 mb-2">{subsection.detailedMapping.thesisSupport}</p>
                              </div>
                              <div className="mb-2">
                                <strong className="text-info">Methodology Role:</strong>
                                <p className="small mt-1">{subsection.detailedMapping.methodologyRole}</p>
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="mb-2">
                                <strong className="text-warning">Evidence Contribution:</strong>
                                <p className="small mt-1 mb-2">{subsection.detailedMapping.evidenceContribution}</p>
                              </div>
                              <div className="mb-2">
                                <strong className="text-primary">Analytical Function:</strong>
                                <p className="small mt-1">{subsection.detailedMapping.analyticalFunction}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3">
                <FaSpinner className="fa-spin me-2" />
                Generating context map...
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Information Alert */}
      <div className="alert alert-primary mb-4">
        <h6>Enhanced Literature Review Builder Process</h6>
        <p className="mb-2">
          This enhanced builder provides a systematic three-step approach to literature review development.
        </p>
        <div className="row">
          <div className="col-md-4">
            <strong>Step 1:</strong> Contextual Analysis
            <p className="small mb-0 text-muted">Maps outline framework context to research questions</p>
          </div>
          <div className="col-md-4">
            <strong>Step 2:</strong> Answer Questions
            <p className="small mb-0 text-muted">Answer questions through the lens of their specific context</p>
          </div>
          <div className="col-md-4">
            <strong>Step 3:</strong> Detailed Outline Builder
            <p className="small mb-0 text-muted">Generate hierarchical outlines from fused responses</p>
          </div>
        </div>
      </div>

      {/* Step 2: Answer Questions Interface - Only show if Step 2 is not yet complete */}
      {currentStep >= 2 && showStep2Interface && !questionAnsweringComplete && (
        <div className="step-2-interface mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5>Step 2: Answer Questions Through Contextual Lens</h5>
            {questionAnsweringComplete && (
              <button
                className="btn btn-success btn-sm"
                onClick={() => {
                  // Check completion and advance to Step 3 if ready
                  checkQuestionAnsweringComplete();
                }}
              >
                <FaCheckCircle className="me-1" />
                Complete Step 2
              </button>
            )}
          </div>
          
          <div className="alert alert-info">
            <strong>Context-Aware Question Answering:</strong> Each question is answered through the specific contextual lens 
            established in Step 1. The context from the Outline Framework informs how each question should be approached 
            to support your thesis and methodology.
          </div>
          
          {/* Current Step Status Box */}
          {currentStep === 0 && (
            <div className="alert alert-info">
              <strong>🏁 Starting Workflow:</strong> Step 1 (Contextual Analysis) will begin automatically once outline framework is loaded.
            </div>
          )}
          {currentStep > 0 && !detailedOutlineComplete && (
            <div className="alert alert-warning">
              <strong>Step {currentStep}:</strong> {
                currentStep === 1 ? (contextAnalysisComplete ? 'Contextual Analysis complete - Ready for Step 2' : 'Analyzing contextual relationships...') :
                currentStep === 2 ? (
                  questionAnsweringComplete ? 'Question Answering complete - Ready for Step 3' : 
                  (stepProgress || 
                    (getCompletedQuestions() === 0 ? 'Ready to start answering questions through contextual lens...' :
                     `Answering questions (${getCompletedQuestions()}/${getTotalQuestions()} complete) - Continue where left off...`)
                  )
                ) :
                currentStep === 3 ? (stepProgress || 'Generating detailed hierarchical outlines from research responses...') :
                'Processing...'
              }
            </div>
          )}
          {detailedOutlineComplete && (
            <div className="alert alert-success">
              <strong>✅ Enhanced Literature Review Complete!</strong> 
              Your research has been systematically analyzed and converted into detailed, editable hierarchical outlines.
            </div>
          )}
        </div>
      )}

      {/* Step 2 Completion Status - Show when Step 2 is complete */}
      {questionAnsweringComplete && (
        <div className="card mb-4 border-success">
          <div className="card-header bg-success text-white">
            <h5 className="mb-0">
              <FaCheckCircle className="me-2" />
              Step 2 Complete: Question Answering Through Contextual Lens
            </h5>
          </div>
          <div className="card-body">
            <div className="alert alert-success mb-0">
              <strong>✅ Question Answering Complete!</strong> All questions have been answered through the contextual framework. 
              You can now proceed to Step 3 (Detailed Outline Generation) or continue to Data and Observations.
            </div>
          </div>
        </div>
      )}

      {/* Contextual Analysis Results - Show when Step 1 is complete but Step 2 interface is not active */}
      {(() => {
        console.log('🔍 Contextual Analysis Results Check:', { 
          contextAnalysisComplete, 
          showStep2Interface, 
          questions, 
          questionsKeys: questions ? Object.keys(questions) : 'no questions' 
        });
        // Show contextual analysis results only when context map is visible/selected
        return contextAnalysisComplete && showContextMap && questions && Object.keys(questions).length > 0;
      })() && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">
              <FaCheckCircle className="text-success me-2" />
              Step 1 Results: Contextual Analysis Questions & Responses
            </h5>
            <p className="text-muted mb-0 small">Questions generated and answered during contextual analysis phase</p>
          </div>
          <div className="card-body">
            {Object.entries(questions).map(([questionKey, questionText]) => {
              const respArr = responses[questionKey] || [];
              const hasResponses = respArr.length > 0;
              
              return (
                <div key={questionKey} className="card mb-3">
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <strong>Question {questionKey}:</strong>
                        <p className="mt-2">{questionText}</p>
                      </div>
                      <div className="col-md-6">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="badge bg-secondary">
                            {hasResponses ? `${respArr.length} response(s)` : 'No responses'}
                          </span>
                          {hasResponses && (
                            <button
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => {
                                setSelectedResponse({ questionKey, responses: respArr, questionText });
                                setShowModal(true);
                              }}
                            >
                              <FaEye className="me-1" />
                              View All
                            </button>
                          )}
                        </div>
                        {hasResponses && (
                          <div className="border p-2 small" style={{maxHeight: '150px', overflowY: 'auto'}}>
                            <strong>Latest Response:</strong>
                            <div className="mt-1">
                              {respArr[respArr.length - 1]?.length > 200 
                                ? `${respArr[respArr.length - 1].substring(0, 200)}...` 
                                : respArr[respArr.length - 1]}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Question and Answer Sections - Only show when Step 2 interface is toggled on */}
      {showStep2Interface && outlineData.map((section, sectionIndex) => (
        <div key={sectionIndex} className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">
              {sectionIndex + 1}. {section.section_title}
            </h5>
            <p className="text-muted mb-0 small">{section.section_context}</p>
          </div>

          <div className="card-body">
            {section.subsections?.map((subsection, subsectionIndex) => (
              <div key={subsectionIndex} className="mb-4">
                <h6 className="text-primary mb-3">
                  {subsection.subsection_title}
                </h6>
                <p className="text-muted small mb-3">{subsection.subsection_context}</p>

                {subsection.questions?.map((questionObj, questionIndex) => {
                  const key = `${sectionIndex}-${subsectionIndex}-${questionIndex}`;
                  const respArr = responses[key] || [];
                  const idx = currentResponseIdx[key] || 0;
                  const isLoading = loading[key];
                  const citations = questionObj.citations || [];
                  const totalResponses = citations.length + (citations.length > 0 ? 1 : 0); // +1 for fused

                  // Citation numbering: questionNumber.citationNumber
                  const questionNum = questionIndex + 1;

                  return (
                    <div key={questionIndex} className="card mb-3">
                      <div className="card-body">
                        <div className="row">
                          {/* Question Side */}
                          <div className="col-md-6">
                            <div className="border-end pe-3">
                              <h6 className="text-info mb-2">
                                Question {questionNum}
                              </h6>
                              <p className="mb-3">{questionObj.question}</p>
                              {/* Render citations with numbering */}
                              {citations.length > 0 && (
                                <div className="mb-2">
                                  <strong>Citations:</strong>
                                  <div className="mb-2">
                                    {citations.map((citation, i) => {
                                      const questionRefs = citationReferenceMap[key] || {};
                                      const refInfo = questionRefs[i] || {};
                                      const referenceNumber = refInfo.referenceNumber || (i + 1);
                                      
                                      return (
                                        <div
                                          key={i}
                                          style={{
                                            fontSize: '0.95em',
                                            cursor: 'pointer',
                                            background: idx === i ? '#e7f7fb' : 'transparent', // subtle highlight for active
                                            borderRadius: '4px',
                                            padding: '2px 6px',
                                            marginBottom: '2px',
                                            textDecoration: 'none'
                                          }}
                                          onClick={() => handleJumpToResponse(key, i)}
                                        >
                                          <span
                                            style={{
                                              color: '#0dcaf0', // Bootstrap light blue for citation number only
                                              background: 'transparent',
                                              borderRadius: '3px',
                                              padding: '1px 6px',
                                              marginRight: '4px',
                                              fontWeight: 'bold'
                                            }}
                                          >
                                            [{referenceNumber}]
                                          </span>
                                          <span style={{ fontWeight: 'normal' }}>
                                            {citation.author ? `${citation.author} - ` : ''}
                                            {citation.title || citation.apa || citation.source || 'Unknown Citation'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                    {/* Fused/master outline */}
                                    {citations.length > 0 && (
                                      <div
                                        key="fused-master-outline"
                                        style={{
                                          fontSize: '0.95em',
                                          cursor: 'pointer',
                                          background: idx === citations.length ? '#e7f7fb' : 'transparent',
                                          borderRadius: '4px',
                                          padding: '2px 6px',
                                          marginBottom: '2px',
                                          textDecoration: 'none'
                                        }}
                                        onClick={() => handleJumpToResponse(key, citations.length)}
                                      >
                                        <span
                                          style={{
                                            color: '#0dcaf0',
                                            background: 'transparent',
                                            borderRadius: '3px',
                                            padding: '1px 6px',
                                            marginRight: '4px',
                                            fontWeight: 'bold'
                                          }}
                                        >
                                          Fused
                                        </span>
                                        <em>Fused/Master Outline</em>
                                        <div style={{ fontSize: '0.85em', color: '#666', marginTop: '2px' }}>
                                          References: {Object.values(citationReferenceMap[key] || {}).map(ref => `[${ref.referenceNumber}]`).join(', ')}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => generateAllQuestionResponses(sectionIndex, subsectionIndex, questionIndex, questionObj)}
                                disabled={isLoading || batchProcessing}
                              >
                                {isLoading ? (
                                  <>
                                    <FaSpinner className="fa-spin me-1" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <FaPlay className="me-1" />
                                    Generate Response
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Response Side */}
                          <div className="col-md-6">
                            <div className="ps-3">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="text-success mb-0">
                                  Response{' '}
                                  {citations.length > 0 && (
                                    <span
                                      className="badge ms-2"
                                      style={{
                                        backgroundColor: 'transparent',
                                        color: '#0dcaf0',
                                        fontWeight: 'bold',
                                        border: '1px solid #0dcaf0'
                                      }}
                                    >
                                      {idx < citations.length
                                        ? `[${(citationReferenceMap[key] || {})[idx]?.referenceNumber || (idx + 1)}]`
                                        : `Fused`}
                                    </span>
                                  )}
                                </h6>
                                <div className="d-flex gap-2">
                                  {respArr[idx] && (
                                    <button
                                      className="btn btn-sm btn-outline-secondary"
                                      onClick={() => openModal(respArr[idx], questionObj.question)}
                                    >
                                      <FaExpand className="me-1" />
                                      Expand
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="d-flex align-items-center mb-2">
                                <button
                                  className="btn btn-sm btn-outline-secondary me-2"
                                  onClick={() => handlePrevResponse(key)}
                                  disabled={idx === 0}
                                >
                                  <FaChevronLeft />
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => handleNextResponse(key)}
                                  disabled={idx >= totalResponses - 1}
                                >
                                  <FaChevronRight />
                                </button>
                              </div>
                              {respArr[idx] ? (
                                <div style={{
                                  fontFamily: 'inherit',
                                  whiteSpace: 'pre-wrap',
                                  lineHeight: '1.6',
                                  margin: 0,
                                  maxHeight: '70vh',
                                  overflowY: 'auto',
                                  paddingRight: '8px'
                                }}>
                                  {respArr[idx]}
                                </div>
                              ) : (
                                <div className="text-muted" style={{ 
                                  minHeight: 100,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontStyle: 'italic'
                                }}>
                                  No response generated yet
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Step 3: Detailed Outline Builder Interface */}
      {showStep3Interface && (
        <div className="step-3-interface mb-4">
          <div className="card" style={{ backgroundColor: masterOutlines.length > 0 ? '#f0fff0' : '#f8f9fa', border: masterOutlines.length > 0 ? '2px solid #28a745' : '2px solid #6c757d' }}>
            <div className="card-header" style={{ backgroundColor: masterOutlines.length > 0 ? '#d4edda' : '#e9ecef' }}>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className={`mb-0 ${masterOutlines.length > 0 ? 'text-success' : 'text-secondary'}`}>
                  {masterOutlines.length > 0 ? 'Step 3: Detailed Outline Builder - Complete' : 'Step 3: Detailed Outline Builder'}
                </h5>
                <span className={`badge ${masterOutlines.length > 0 ? 'bg-success' : 'bg-secondary'}`}>
                  {masterOutlines.length} Sections
                </span>
              </div>
            </div>
            <div className="card-body">
              {masterOutlines.length > 0 ? (
                <div className="alert alert-success">
                  <strong>✅ Hierarchical Outlines Generated!</strong> 
                  Your literature review has been converted into detailed, editable outlines following academic structure 
                  (I, A, 1, a, i format). Each outline point is derived from your fused research responses.
                </div>
              ) : (
                <>
                  <div className="alert alert-info">
                    <strong>📋 Step 3: Outline Builder Ready</strong>
                    <p className="mb-1">
                      This section displays the hierarchical outline structure from your Outline Framework. 
                      Complete Step 2 and run Step 3 to populate with detailed content.
                    </p>
                  </div>
                  
                  {/* Show section/subsection structure from outline data */}
                  {outlineData && outlineData.length > 0 && (
                    <div className="mt-3">
                      {outlineData.map((section, sectionIndex) => {
                        const romanNumeral = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][sectionIndex] || `${sectionIndex + 1}`;
                        
                        return (
                          <div key={sectionIndex} className="mb-4">
                            <div className="d-flex align-items-center mb-3">
                              <span className="me-3 text-primary fw-bold" style={{ fontSize: '1.5rem', minWidth: '40px' }}>
                                {romanNumeral}.
                              </span>
                              <div>
                                <h5 className="mb-1 text-primary">{section.section_title}</h5>
                                <div className="text-muted small">
                                  <strong>Context:</strong> {section.section_context || 'Framework context will be applied'}
                                </div>
                              </div>
                            </div>
                            
                            {section.subsections && section.subsections.map((subsection, subsectionIndex) => {
                              const letter = String.fromCharCode(65 + subsectionIndex); // A, B, C
                              
                              return (
                                <div key={subsectionIndex} className="ms-4 mb-3">
                                  <div className="d-flex align-items-start">
                                    <span className="me-3 text-info fw-bold" style={{ fontSize: '1.2rem', minWidth: '30px' }}>
                                      {letter}.
                                    </span>
                                    <div className="flex-grow-1">
                                      <h6 className="mb-1 text-info">{subsection.subsection_title}</h6>
                                      <div className="text-muted small mb-2">
                                        <strong>Context:</strong> {subsection.subsection_context || 'Contextual focus from framework analysis'}
                                      </div>
                                      <div className="text-muted small">
                                        <span className="badge bg-light text-dark me-2">
                                          {subsection.questions?.length || 0} questions
                                        </span>
                                        <span className="text-muted">
                                          Content will be generated from Step 2 responses
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
              
              {masterOutlines.length > 0 && masterOutlines.map((section, sectionIndex) => {
                const romanNumeral = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][sectionIndex] || `${sectionIndex + 1}`;
                
                return (
                  <div key={sectionIndex} className="mb-4">
                    <div className="d-flex align-items-center mb-3">
                      <span className="me-3 text-primary fw-bold" style={{ fontSize: '1.5rem', minWidth: '40px' }}>
                        {romanNumeral}.
                      </span>
                      <h5 className="mb-0 text-primary">{section.section_title}</h5>
                      <button
                        className="btn btn-sm btn-outline-secondary ms-auto"
                        onClick={() => toggleOutlineExpansion(sectionIndex, 'all')}
                      >
                        {expandedOutlines[`${sectionIndex}-all`] ? <FaMinus /> : <FaPlus />} Toggle All
                      </button>
                    </div>
                    
                    {section.master_subsections.map((subsection, subIndex) => {
                      const letter = String.fromCharCode(65 + subIndex);
                      const isExpanded = expandedOutlines[`${sectionIndex}-${subIndex}`];
                      
                      return (
                        <div key={subIndex} className="ms-4 mb-3">
                          <div className="d-flex align-items-center mb-2">
                            <span className="me-3 text-secondary fw-bold" style={{ fontSize: '1.2rem', minWidth: '30px' }}>
                              {letter}.
                            </span>
                            <h6 className="mb-0 text-secondary">{subsection.subsection_title}</h6>
                            <button
                              className="btn btn-sm btn-outline-secondary ms-auto"
                              onClick={() => toggleOutlineExpansion(sectionIndex, subIndex)}
                            >
                              {isExpanded ? <FaMinus /> : <FaPlus />}
                            </button>
                          </div>
                          
                          {isExpanded && (
                            <div className="ms-4">
                              <div className="small text-muted mb-3">
                                {subsection.question_count} questions • {subsection.citation_count} citations • 
                                {subsection.thematic_basis}
                              </div>
                              
                              {subsection.master_outline.map((mainPoint, pointIndex) => (
                                <div key={pointIndex} className="mb-3">
                                  {/* Main Point (1, 2, 3...) */}
                                  <div className="d-flex align-items-start mb-2">
                                    <span className="me-2 fw-bold text-dark" style={{ minWidth: '25px' }}>
                                      {mainPoint.level}.
                                    </span>
                                    <div className="flex-grow-1">
                                      <textarea
                                        className="form-control form-control-sm mb-1"
                                        rows="2"
                                        value={mainPoint.content}
                                        onChange={(e) => {
                                          // Handle outline editing
                                          const newOutlines = [...masterOutlines];
                                          newOutlines[sectionIndex].master_subsections[subIndex].master_outline[pointIndex].content = e.target.value;
                                          setMasterOutlines(newOutlines);
                                        }}
                                      />
                                      {mainPoint.citations && mainPoint.citations.length > 0 && (
                                        <div className="small text-muted">
                                          Citations: {mainPoint.citations.map(c => `[${c}]`).join(' ')}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Sub Points (a, b, c...) */}
                                  {mainPoint.subPoints && mainPoint.subPoints.map((subPoint, subPointIndex) => (
                                    <div key={subPointIndex} className="ms-4 mb-2">
                                      <div className="d-flex align-items-start">
                                        <span className="me-2 fw-bold text-secondary" style={{ minWidth: '25px' }}>
                                          {subPoint.level})
                                        </span>
                                        <div className="flex-grow-1">
                                          <textarea
                                            className="form-control form-control-sm mb-1"
                                            rows="2"
                                            value={subPoint.content}
                                            onChange={(e) => {
                                              // Handle sub-point editing
                                              const newOutlines = [...masterOutlines];
                                              newOutlines[sectionIndex].master_subsections[subIndex].master_outline[pointIndex].subPoints[subPointIndex].content = e.target.value;
                                              setMasterOutlines(newOutlines);
                                            }}
                                          />
                                          {subPoint.citations && subPoint.citations.length > 0 && (
                                            <div className="small text-muted">
                                              Citations: {subPoint.citations.map(c => `[${c}]`).join(' ')}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Deeper Points (i, ii, iii...) */}
                                      {subPoint.deeperPoints && subPoint.deeperPoints.map((deeperPoint, deeperIndex) => (
                                        <div key={deeperIndex} className="ms-4 mb-1">
                                          <div className="d-flex align-items-start">
                                            <span className="me-2 text-muted" style={{ minWidth: '25px' }}>
                                              {deeperPoint.level})
                                            </span>
                                            <textarea
                                              className="form-control form-control-sm"
                                              rows="1"
                                              value={deeperPoint.content}
                                              onChange={(e) => {
                                                // Handle deeper point editing
                                                const newOutlines = [...masterOutlines];
                                                newOutlines[sectionIndex].master_subsections[subIndex].master_outline[pointIndex].subPoints[subPointIndex].deeperPoints[deeperIndex].content = e.target.value;
                                                setMasterOutlines(newOutlines);
                                              }}
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              
              <div className="mt-4 d-flex gap-2">
                <button
                  className="btn btn-success"
                  onClick={() => {
                    if (onLiteratureReviewComplete) {
                      onLiteratureReviewComplete({
                        responses: responses,
                        masterOutlines: masterOutlines,
                        contextMapData: contextMapData,
                        completionStatus: 'complete'
                      });
                    }
                  }}
                >
                  <FaCheckCircle className="me-2" />
                  Complete Literature Review
                </button>
                <button
                  className="btn btn-outline-success"
                  onClick={() => {
                    if (onTransferToDataAndObservations) {
                      onTransferToDataAndObservations();
                    }
                  }}
                >
                  <FaChevronRight className="me-2" />
                  Transfer to Data & Observations
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Response Modal */}
      {showModal && selectedResponse && (
        <Modal
          show={showModal}
          onClose={closeModal}
          title="Question Response"
          large
          footer={
            <button
              type="button"
              className="btn btn-secondary"
              onClick={closeModal}
            >
              Close
            </button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', height: '60vh' }}>
            <h6 className="text-primary mb-3">Question:</h6>
            <p className="mb-4 bg-light p-3 rounded">{selectedResponse.question}</p>
            <h6 className="text-success mb-3">Response:</h6>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              margin: 0,
              padding: 0,
              background: 'none'
            }}>
              {selectedResponse.question === "Complete Hierarchical Outline Preview" ? (
                <div style={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6',
                  fontFamily: 'monospace',
                  fontSize: '0.9em'
                }}>
                  {selectedResponse.response}
                </div>
              ) : (
                <pre className="mb-0" style={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6',
                  background: 'none',
                  margin: 0,
                  padding: 0,
                  fontFamily: 'inherit'
                }}>
                  {selectedResponse.response}
                </pre>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default LiteratureReview;