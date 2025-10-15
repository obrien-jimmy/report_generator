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
  
  // Step 3: Fused Outline to Full Prose Builder
  const [detailedOutlineComplete, setDetailedOutlineComplete] = useState(false);
  const [masterOutlines, setMasterOutlines] = useState([]);
  const [expandedOutlines, setExpandedOutlines] = useState({});
  const [editingOutline, setEditingOutline] = useState(null);
  
  // General state
  const [stepProgress, setStepProgress] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [citationReferenceMap, setCitationReferenceMap] = useState({}); // Global citation reference mapping
  
  // Manual save functionality
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

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
      
      // Load questions - first try from saved questions, then extract from saved outline if needed
      if (literatureReviewData.questions && Object.keys(literatureReviewData.questions).length > 0) {
        console.log('📝 Loading questions from literatureReviewData.questions:', literatureReviewData.questions);
        setQuestions(literatureReviewData.questions);
      } else if (literatureReviewData.outline && literatureReviewData.outline.length > 0) {
        console.log('📝 Extracting questions from saved outline in literatureReviewData:', literatureReviewData.outline);
        const extractedQuestions = {};
        
        literatureReviewData.outline.forEach((section, sectionIndex) => {
          if (section.subsections) {
            section.subsections.forEach((subsection, subsectionIndex) => {
              if (subsection.questions) {
                subsection.questions.forEach((question, questionIndex) => {
                  const questionKey = `${sectionIndex}-${subsectionIndex}-${questionIndex}`;
                  extractedQuestions[questionKey] = question.question;
                });
              }
            });
          }
        });
        
        console.log('📝 Extracted questions from saved outline:', extractedQuestions);
        setQuestions(extractedQuestions);
      }
      
      if (literatureReviewData.responses) {
        console.log('📄 Loading responses from literatureReviewData:', literatureReviewData.responses);
        setResponses(literatureReviewData.responses);
      }
      if (literatureReviewData.masterOutlines) {
        console.log('📚 Loading masterOutlines from saved data:', literatureReviewData.masterOutlines);
        setMasterOutlines(literatureReviewData.masterOutlines);
      }
      
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
      
      // Check question completion status after loading data
      setTimeout(() => {
        console.log('🔍 Checking question completion after data load...');
        checkQuestionAnsweringComplete();
      }, 100);
    } else if (literatureReviewData === null || literatureReviewData === undefined || Object.keys(literatureReviewData || {}).length === 0) {
      console.log('⚠️ LiteratureReview: Received null/empty literatureReviewData, keeping existing state');
    }
  }, [literatureReviewData]);

  // Initialize questions from outlineData when it loads (only if we don't already have questions)
  useEffect(() => {
    console.log('🔍 Questions extraction useEffect triggered');
    console.log('🔍 outlineData:', outlineData);
    console.log('🔍 questions:', questions);
    console.log('🔍 Object.keys(questions).length:', Object.keys(questions || {}).length);
    
    // Only extract questions if we have outline data but no questions yet
    if (outlineData && outlineData.length > 0 && (!questions || Object.keys(questions).length === 0)) {
      console.log('🔍 Initializing questions from outlineData...');
      const extractedQuestions = {};
      
      outlineData.forEach((section, sectionIndex) => {
        console.log(`🔍 Processing section ${sectionIndex}:`, section.section_title);
        if (section.subsections) {
          section.subsections.forEach((subsection, subsectionIndex) => {
            console.log(`🔍 Processing subsection ${sectionIndex}-${subsectionIndex}:`, subsection.subsection_title);
            if (subsection.questions) {
              subsection.questions.forEach((question, questionIndex) => {
                const questionKey = `${sectionIndex}-${subsectionIndex}-${questionIndex}`;
                extractedQuestions[questionKey] = question.question;
                console.log(`🔍 Extracted question ${questionKey}:`, question.question);
              });
            }
          });
        }
      });
      
      console.log('📝 Extracted questions from outline:', extractedQuestions);
      setQuestions(extractedQuestions);
      
      // After setting questions, check completion
      setTimeout(() => {
        console.log('🔍 Checking completion after question extraction...');
        checkQuestionAnsweringComplete();
      }, 200);
    } else {
      console.log('🔍 Skipping question extraction - conditions not met');
      console.log('🔍 outlineData exists:', !!outlineData);
      console.log('🔍 outlineData length:', outlineData?.length);
      console.log('🔍 questions is empty:', !questions || Object.keys(questions).length === 0);
    }
  }, [outlineData]); // Removed questions dependency to prevent resetting

  // Check question completion when questions or responses change
  useEffect(() => {
    if (questions && Object.keys(questions).length > 0 && responses && Object.keys(responses).length > 0) {
      console.log('🔍 Questions or responses changed, checking completion...');
      setTimeout(() => checkQuestionAnsweringComplete(), 200);
    }
  }, [questions, responses]);

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

  // Manual save function
  const handleManualSave = () => {
    setSaving(true);
    try {
      if (onAutoSaveDraft) {
        onAutoSaveDraft(drafts);
        setLastSaved(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Manual save failed:', error);
    } finally {
      setSaving(false);
    }
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
    
    console.log('🔍 checkQuestionAnsweringComplete - totalQuestions:', totalQuestions);
    console.log('🔍 checkQuestionAnsweringComplete - answeredQuestions:', answeredQuestions);
    console.log('🔍 checkQuestionAnsweringComplete - responses keys:', Object.keys(responses));
    console.log('🔍 checkQuestionAnsweringComplete - questions keys:', Object.keys(questions));
    
    const isComplete = totalQuestions > 0 && answeredQuestions === totalQuestions;
    
    console.log('🔍 checkQuestionAnsweringComplete - isComplete:', isComplete);
    console.log('🔍 checkQuestionAnsweringComplete - questionAnsweringComplete:', questionAnsweringComplete);
    
    if (isComplete && !questionAnsweringComplete) {
      console.log('✅ Setting question answering complete!');
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

  // Step 3: Fused Outline to Full Prose Builder
  const startStep3ProseBuilder = async () => {
    console.log('📝 Starting Step 3: Fused Outline to Full Prose Builder');
    setCurrentStep(3);
    setStepStatus(prev => ({ ...prev, 3: 'processing' }));
    setErrorMessage('');
    setStepProgress('Converting fused outlines to academic prose...');
    
    try {
      // Generate prose from the fused responses for each section/subsection
      const generatedProse = await generateProseFromResponses();
      console.log('🔍 Generated prose data:', generatedProse);
      setMasterOutlines(generatedProse); // Reusing state but now contains prose
      console.log('🔍 Set masterOutlines to:', generatedProse);
      setDetailedOutlineComplete(true);
      setStepStatus(prev => ({ ...prev, 3: 'complete' }));
      
      // Force a small delay to ensure UI update
      setTimeout(() => {
        console.log('🔍 After timeout - masterOutlines should be updated');
      }, 500);
      
      setStepProgress('Step 3: Prose generation completed! Check results below ⬇️');
      
      console.log('✅ Step 3: Prose Builder complete');
      
      // Auto-save progress with complete state
      if (autoSave && onAutoSaveDraft) {
        const completeState = {
          currentStep: 3,
          stepStatus: { 1: 'complete', 2: 'complete', 3: 'complete' },
          contextAnalysisComplete: true,
          questionAnsweringComplete: true,
          detailedOutlineComplete: true,
          questions: questions,
          responses: responses,
          masterOutlines: generatedProse, // This contains the prose data
          contextMapData: contextMapData,
          showContextMap: showContextMap,
          showStep2Interface: showStep2Interface,
          showStep3Interface: true
        };
        console.log('💾 Auto-saving complete literature review state:', completeState);
        onAutoSaveDraft(completeState);
      }
      
      // Notify parent component of completion
      if (onLiteratureReviewComplete) {
        onLiteratureReviewComplete({
          responses: responses,
          masterOutlines: generatedProse,
          contextMapData: contextMapData,
          completionStatus: 'complete'
        });
      }
    } catch (error) {
      console.error('❌ Error in Step 3:', error);
      setErrorMessage(`Failed to generate prose: ${error.message}`);
      setStepStatus(prev => ({ ...prev, 3: 'pending' }));
      setStepProgress('');
    }
  };

  // Generate prose from fused responses using AI - Only for Data sections
  const generateProseFromResponses = async () => {
    const proseResults = [];
    
    // Filter to only process Data sections (sections with questions/responses)
    const dataSections = outlineData.filter(section => 
      section.subsections && section.subsections.some(sub => 
        sub.questions && sub.questions.length > 0
      )
    );
    
    console.log(`📚 Processing ${dataSections.length} data sections for prose generation`);
    setStepProgress(`Identified ${dataSections.length} data sections for prose generation...`);
    
    for (const [dataIndex, section] of dataSections.entries()) {
      const sectionIndex = outlineData.findIndex(s => s.section_title === section.section_title);
      
      setStepProgress(`Building prose for Section ${dataIndex + 1}/${dataSections.length}: "${section.section_title}"`);
      console.log(`🏗️ Processing section: ${section.section_title}`);
      
      const sectionProse = {
        section_title: section.section_title,
        section_context: section.section_context,
        prose_subsections: [],
        section_index: sectionIndex,
        is_data_section: true
      };
      
      if (section.subsections) {
        const dataSubsections = section.subsections.filter(sub => 
          sub.questions && sub.questions.length > 0
        );
        
        console.log(`  📝 Found ${dataSubsections.length} subsections with questions`);
        
        for (const [subIndex, subsection] of dataSubsections.entries()) {
          const subsectionIndex = section.subsections.findIndex(s => s.subsection_title === subsection.subsection_title);
          
          setStepProgress(`Building prose for "${subsection.subsection_title}" (${subIndex + 1}/${dataSubsections.length} subsections)`);
          console.log(`    📄 Processing subsection: ${subsection.subsection_title}`);
          
          const proseParagraphs = await generateSubsectionProse(
            subsection, 
            section, 
            sectionIndex, 
            subsectionIndex
          );
          sectionProse.prose_subsections.push(proseParagraphs);
          console.log(`    ✅ Added subsection prose for: ${subsection.subsection_title}`);
        }
      }
      
      proseResults.push(sectionProse);
      console.log(`✅ Completed section: ${section.section_title} (${sectionProse.prose_subsections.length} subsections)`);
    }
    
    setStepProgress(`Completed prose generation for all ${dataSections.length} data sections`);
    console.log('🔍 Final proseResults:', proseResults);
    return proseResults;
  };

  // Generate prose for a specific subsection from its fused responses
  const generateSubsectionProse = async (subsection, section, sectionIndex, subsectionIndex) => {
    const subsectionProse = {
      subsection_title: subsection.subsection_title,
      subsection_context: subsection.subsection_context,
      prose_content: '',
      question_count: subsection.questions?.length || 0,
      citation_count: subsection.questions?.reduce((acc, q) => acc + (q.citations?.length || 0), 0) || 0,
      reference_path: `Section ${section.section_title} → Subsection ${subsection.subsection_title}`
    };

    // Only generate prose if there are answered questions
    if (!subsection.questions || subsection.questions.length === 0) {
      subsectionProse.prose_content = `<p><em>No questions available for this subsection.</em></p>`;
      return subsectionProse;
    }

    // Check if any questions have responses
    const answeredQuestions = subsection.questions.filter((question, questionIndex) => {
      const questionKey = `${sectionIndex}-${subsectionIndex}-${questionIndex}`;
      return responses[questionKey] && responses[questionKey].length > 0;
    });

    if (answeredQuestions.length === 0) {
      subsectionProse.prose_content = `<p><em>No responses available for questions in this subsection.</em></p>`;
      return subsectionProse;
    }

    try {
      // For each answered question, generate prose from its fused response
      let combinedProse = '';
      
      for (const [questionIndex, question] of answeredQuestions.entries()) {
        const originalQuestionIndex = subsection.questions.indexOf(question);
        const questionKey = `${sectionIndex}-${subsectionIndex}-${originalQuestionIndex}`;
        const questionResponses = responses[questionKey];
        
        if (questionResponses && questionResponses.length > 0) {
          // Use the latest (fused) response
          const fusedResponse = questionResponses[questionResponses.length - 1];
          
          // Prepare citation references
          const citationReferences = question.citations?.map((citation, index) => ({
            reference_id: `${questionIndex + 1}_${index + 1}`,
            citation: {
              apa: citation.apa || citation.source || citation.title,
              title: citation.title,
              source: citation.source
            }
          })) || [];

          // Call the new prose generation endpoint with timeout
          console.log(`      🔄 Generating prose for question: ${question.question.substring(0, 50)}...`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
          
          try {
            const proseResponse = await fetch('http://localhost:8000/generate_prose_from_outline', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                thesis: finalThesis || '',
                methodology: safeMethodology || '',
                section_context: section.section_context || '',
                subsection_context: subsection.subsection_context || '',
                question: question.question,
                citation_responses: [fusedResponse],
                citations: question.citations || [],
                question_number: originalQuestionIndex + 1,
                citation_references: citationReferences
              }),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!proseResponse.ok) {
              throw new Error(`HTTP error! status: ${proseResponse.status}`);
            }

            const proseData = await proseResponse.json();
            console.log(`      🔍 Prose response for question ${originalQuestionIndex + 1}:`, proseData);
            
            if (proseData && proseData.response) {
              combinedProse += proseData.response + '\n\n';
              console.log(`      ✅ Prose generated for question ${originalQuestionIndex + 1}`);
            } else {
              console.error(`      ❌ No prose response for question ${originalQuestionIndex + 1}:`, proseData);
              combinedProse += `<p><em>Error: No prose generated for this question.</em></p>\n\n`;
            }
          } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
              console.error(`      ⏱️ Timeout generating prose for question ${originalQuestionIndex + 1}`);
              combinedProse += `<p><em>Timeout: Prose generation took too long for this question.</em></p>\n\n`;
            } else {
              console.error(`      ❌ Fetch error for question ${originalQuestionIndex + 1}:`, fetchError);
              combinedProse += `<p><em>Error: ${fetchError.message}</em></p>\n\n`;
            }
          }
        }
      }

      subsectionProse.prose_content = combinedProse.trim();
      console.log(`    🔍 Final prose content for "${subsection.subsection_title}":`, subsectionProse.prose_content);
      
    } catch (error) {
      console.error('❌ Error generating prose for subsection:', subsection.subsection_title, error);
      subsectionProse.prose_content = `<p><em>Error generating prose: ${error.message}</em></p>`;
    }

    return subsectionProse;
  };

  // Generate master outlines from fused responses using hierarchical structure (legacy function - keep for compatibility)
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
          
          console.log(`🔍 Processing fused response for Q${questionIndex + 1}:`, fusedResponse.substring(0, 100) + '...');
          
          // Try to parse as structured outline first
          const structuredPoints = parseStructuredOutline(fusedResponse);
          
          if (structuredPoints.length > 0) {
            console.log(`✅ Found ${structuredPoints.length} structured points for Q${questionIndex + 1}`);
            // Use structured outline points directly
            structuredPoints.forEach((point, index) => {
              const adjustedPoint = {
                ...point,
                level: `${pointCounter}`,
                reference: `Research Question ${questionIndex + 1}: ${question.question}`
              };
              masterOutline.push(adjustedPoint);
              pointCounter++;
            });
          } else {
            console.log(`📄 No structured outline found for Q${questionIndex + 1}, using fallback approach`);
            // Fallback to original approach
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

  // Parse structured outline from fused response, filtering out non-outline content
  const parseStructuredOutline = (response) => {
    if (!response) return [];
    
    console.log('🔍 Parsing structured outline from response:', response.substring(0, 200) + '...');
    
    // Split response into lines
    const lines = response.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const outlinePoints = [];
    let currentLevel1 = null;
    let currentLevel2 = null;
    let currentLevel3 = null;
    let currentLevel4 = null;
    let currentLevel5 = null;
    
    for (const line of lines) {
      // Skip introductory text, explanations, and non-outline content
      if (isNonOutlineContent(line)) {
        console.log('⏭️ Skipping non-outline content:', line.substring(0, 50) + '...');
        continue;
      }
      
      // Parse different outline levels
      const outlineLevel = detectOutlineLevel(line);
      
      if (outlineLevel) {
        const { level, type, number, content, citations } = outlineLevel;
        
        switch (type) {
          case 'level1': // 1., 2., 3.
            currentLevel1 = {
              level: number,
              type: 'number',
              content: content,
              citations: citations,
              reference: 'From fused literature analysis',
              editable: true,
              subPoints: []
            };
            outlinePoints.push(currentLevel1);
            currentLevel2 = currentLevel3 = currentLevel4 = currentLevel5 = null;
            break;
            
          case 'level2': // a., b., c.
            if (currentLevel1) {
              currentLevel2 = {
                level: number,
                type: 'lowercase',
                content: content,
                citations: citations,
                reference: 'Supporting evidence from literature',
                editable: true,
                deeperPoints: []
              };
              currentLevel1.subPoints.push(currentLevel2);
              currentLevel3 = currentLevel4 = currentLevel5 = null;
            }
            break;
            
          case 'level3': // i., ii., iii.
            if (currentLevel2) {
              currentLevel3 = {
                level: number,
                type: 'roman',
                content: content,
                citations: citations,
                reference: 'Detailed evidence',
                editable: true,
                level6Points: []
              };
              currentLevel2.deeperPoints.push(currentLevel3);
              currentLevel4 = currentLevel5 = null;
            }
            break;
            
          case 'level4': // 1), 2), 3)
            if (currentLevel3) {
              currentLevel4 = {
                level: `${number})`,
                type: 'number_paren',
                content: content,
                citations: citations,
                reference: 'Specific detail',
                editable: true,
                subPoints: []
              };
              currentLevel3.level6Points.push(currentLevel4);
              currentLevel5 = null;
            }
            break;
            
          case 'level5': // a), b), c)
            if (currentLevel4) {
              currentLevel5 = {
                level: `${number})`,
                type: 'letter_paren',
                content: content,
                citations: citations,
                reference: 'Supporting detail',
                editable: true
              };
              currentLevel4.subPoints.push(currentLevel5);
            }
            break;
        }
      }
    }
    
    console.log(`✅ Parsed ${outlinePoints.length} main outline points from structured response`);
    return outlinePoints;
  };

  // Detect if content is non-outline (introductory text, explanations, etc.)
  const isNonOutlineContent = (line) => {
    const nonOutlinePatterns = [
      /^Here is.*outline/i,
      /^Below is.*outline/i,
      /^This.*outline/i,
      /^The.*outline/i,
      /captures.*key points/i,
      /master outline/i,
      /combining.*arguments/i,
      /grouped by/i,
      /with contradictions/i,
      /using.*format/i,
      /^Contradictions?:/i,
      /^None detected/i,
      /across.*citations/i,
      /without.*contradictions/i,
      /highlighting.*rise/i,
      /between sources/i,
      /^Note:/i,
      /^Summary:/i,
      /^Conclusion:/i
    ];
    
    return nonOutlinePatterns.some(pattern => pattern.test(line));
  };

  // Detect outline level and extract content (with indentation support)
  const detectOutlineLevel = (line) => {
    // Remove leading whitespace but preserve the pattern
    const trimmedLine = line.trim();
    
    // Level 1: 1., 2., 3., etc.
    const level1Match = trimmedLine.match(/^(\d+)\.\s+(.+)/);
    if (level1Match) {
      return {
        level: level1Match[1],
        type: 'level1',
        number: level1Match[1] + '.',
        content: level1Match[2],
        citations: extractCitationNumbers(line)
      };
    }
    
    // Level 2: a., b., c., etc. (with optional indentation)
    const level2Match = trimmedLine.match(/^([a-z])\.\s+(.+)/);
    if (level2Match) {
      return {
        level: level2Match[1],
        type: 'level2', 
        number: level2Match[1] + ')',
        content: level2Match[2],
        citations: extractCitationNumbers(line)
      };
    }
    
    // Level 3: i., ii., iii., etc. (with optional indentation)
    const level3Match = trimmedLine.match(/^(i{1,3}v?|iv|v|vi{1,3}|ix|x|xi{1,3})\.\s+(.+)/);
    if (level3Match) {
      return {
        level: level3Match[1],
        type: 'level3',
        number: level3Match[1] + ')',
        content: level3Match[2], 
        citations: extractCitationNumbers(line)
      };
    }
    
    // Level 4: 1), 2), 3), etc. (with optional indentation)
    const level4Match = trimmedLine.match(/^(\d+)\)\s+(.+)/);
    if (level4Match) {
      return {
        level: level4Match[1],
        type: 'level4',
        number: level4Match[1],
        content: level4Match[2],
        citations: extractCitationNumbers(line)
      };
    }
    
    // Level 5: a), b), c), etc. (with optional indentation)
    const level5Match = trimmedLine.match(/^([a-z])\)\s+(.+)/);
    if (level5Match) {
      return {
        level: level5Match[1],
        type: 'level5',
        number: level5Match[1],
        content: level5Match[2],
        citations: extractCitationNumbers(line)
      };
    }
    
    return null;
  };

  // Generate sub-points from response content with full 6-level hierarchy
  const generateSubPointsFromResponse = (response, citations) => {
    if (!response) return [];
    
    console.log('📝 Processing response for sub-points generation');
    
    // First try to parse as structured outline
    const structuredOutline = parseStructuredOutline(response);
    if (structuredOutline.length > 0) {
      console.log('✅ Using structured outline parsing');
      return structuredOutline;
    }
    
    console.log('📄 Falling back to paragraph-based parsing');
    
    // Fallback to original paragraph-based approach if no structured outline found
    const paragraphs = response.split('\n\n').filter(p => p.trim().length > 30);
    const subPoints = [];
    
    // Create Level 4 sub-points (a), b), c)...) from response paragraphs
    paragraphs.slice(1, 4).forEach((paragraph, index) => {
      const sentences = paragraph.split('.').filter(s => s.trim().length > 20);
      
      const subPoint = {
        level: String.fromCharCode(97 + index), // a, b, c
        type: 'lowercase',
        content: paragraph.trim().substring(0, 180) + (paragraph.length > 180 ? '...' : ''),
        citations: extractCitationNumbers(paragraph),
        reference: `Supporting analysis from literature review`,
        editable: true,
        deeperPoints: generateLevel5Points(sentences, paragraph) // Level 5: i), ii), iii)
      };
      subPoints.push(subPoint);
    });
    
    return subPoints;
  };

  // Generate Level 5 points (i), ii), iii)...)
  const generateLevel5Points = (sentences, parentText) => {
    const level5Points = [];
    const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi'];
    
    // Create up to 3 Level 5 points from sentences
    sentences.slice(0, 3).forEach((sentence, index) => {
      if (sentence.trim().length > 15) {
        const level5Point = {
          level: romanNumerals[index] || `${index + 1}`,
          type: 'roman',
          content: sentence.trim() + (sentence.includes('.') ? '' : '.'),
          citations: extractCitationNumbers(sentence),
          reference: 'Supporting evidence from analysis',
          editable: true,
          level6Points: generateLevel6Points(sentence) // Level 6: (1), (2), (3)
        };
        level5Points.push(level5Point);
      }
    });
    
    return level5Points;
  };

  // Generate Level 6 points (1), (2), (3)...)
  const generateLevel6Points = (sentence) => {
    const level6Points = [];
    
    // Split sentence into clauses for Level 6 details
    const clauses = sentence.split(/[,;]/).filter(c => c.trim().length > 10);
    
    clauses.slice(0, 2).forEach((clause, index) => {
      if (clause.trim().length > 8) {
        const level6Point = {
          level: `(${index + 1})`,
          type: 'number-paren',
          content: clause.trim(),
          citations: extractCitationNumbers(clause),
          reference: 'Further detail',
          editable: true
        };
        level6Points.push(level6Point);
      }
    });
    
    return level6Points;
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

  // Extract main content from response, filtering out introductory text
  const extractMainContentFromResponse = (response, questionText) => {
    if (!response) return questionText || 'Analysis point';
    
    // Split into sentences and find the first substantial content
    const sentences = response.split(/[.!?]/).filter(s => s.trim().length > 20);
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      
      // Skip introductory phrases
      if (isNonOutlineContent(trimmed)) continue;
      
      // Return first substantial content sentence
      if (trimmed.length > 30) {
        return trimmed.length > 150 ? trimmed.substring(0, 150) + '...' : trimmed;
      }
    }
    
    // Fallback to question text or generic content
    return questionText || 'Analysis of research findings';
  };

  // Utility functions for numbering
  const toRomanNumeral = (num) => {
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
    return romanNumerals[num - 1] || `${num}`;
  };

  const toLetter = (num) => {
    return String.fromCharCode(65 + num); // A, B, C, D...
  };

  const toLowercaseLetter = (num) => {
    return String.fromCharCode(97 + num); // a, b, c, d...
  };

  const toLowercaseRoman = (num) => {
    const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv'];
    return romanNumerals[num - 1] || `${num}`;
  };

  const toParentheticalNumber = (num) => {
    return `(${num})`;
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
  const getCompletedQuestions = () => {
    return Object.keys(responses).filter(key => 
      responses[key] && responses[key].length > 0
    ).length;
  };

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
          <div className="ms-auto d-flex gap-2">
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={handleManualSave}
              disabled={saving || !onAutoSaveDraft}
              title="Save current progress manually"
            >
              {saving ? 'Saving...' : 'Save Progress'}
            </button>
            {lastSaved && (
              <small className="text-muted align-self-center">
                Last saved: {lastSaved}
              </small>
            )}
          </div>
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
            Step 3 Prose
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
              onClick={startStep3ProseBuilder}
              title="Start Step 3 - Convert outlines to academic prose"
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
            <strong>Step 3:</strong> Prose Builder
            <p className="small mb-0 text-muted">Convert fused outlines to research-quality prose</p>
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
      {contextAnalysisComplete && showContextMap && questions && Object.keys(questions).length > 0 && (
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

      {/* Step 3: Fused Outline to Full Prose Builder Interface */}
      {showStep3Interface && (
        <div className="step-3-interface mb-4">
          <div className="card" style={{ backgroundColor: masterOutlines.length > 0 ? '#f0fff0' : '#f8f9fa', border: masterOutlines.length > 0 ? '2px solid #28a745' : '2px solid #6c757d' }}>
            <div className="card-header" style={{ backgroundColor: masterOutlines.length > 0 ? '#d4edda' : '#e9ecef' }}>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className={`mb-0 ${masterOutlines.length > 0 ? 'text-success' : 'text-secondary'}`}>
                  {masterOutlines.length > 0 ? 'Step 3: Prose Builder - Complete' : 'Step 3: Fused Outline to Full Prose Builder'}
                </h5>
                <span className={`badge ${masterOutlines.length > 0 ? 'bg-success' : 'bg-secondary'}`}>
                  {masterOutlines.length} Sections
                </span>
              </div>
            </div>
            <div className="card-body">
              {masterOutlines.length > 0 ? (
                <div className="alert alert-success">
                  <strong>✅ Academic Prose Generated!</strong> 
                  Your data sections have been converted into research-paper-quality prose with proper citations and academic flow. 
                  Each subsection maintains contextual coherence while integrating all your research responses.
                  <div className="mt-2">
                    <strong>Generated:</strong> {masterOutlines.length} data sections with prose content
                  </div>
                </div>
              ) : stepStatus[3] === 'processing' ? (
                <div className="alert alert-warning">
                  <strong>🔄 Building Academic Prose...</strong>
                  <p className="mb-2">Converting fused outlines to publication-ready prose for data sections only.</p>
                  {stepProgress && (
                    <div className="mt-2">
                      <div className="small text-muted">Current Progress:</div>
                      <div className="fw-bold">{stepProgress}</div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="alert alert-info">
                    <strong>� Step 3: Prose Builder Ready</strong>
                    <p className="mb-1">
                      Convert your fused outlines into research-paper-quality prose with proper citations and academic flow. 
                      This will process <strong>only data sections</strong> that have answered questions and generate full academic paragraphs.
                    </p>
                    <div className="small text-muted mt-2">
                      <strong>Process:</strong> Identify data sections → Build prose for each subsection → Display formatted results
                    </div>
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
                      <h4 className="mb-0 text-primary">{section.section_title}</h4>
                      <button
                        className="btn btn-sm btn-outline-secondary ms-auto"
                        onClick={() => toggleOutlineExpansion(sectionIndex, 'all')}
                      >
                        {expandedOutlines[`${sectionIndex}-all`] ? <FaMinus /> : <FaPlus />} Toggle All
                      </button>
                    </div>
                    
                    {/* Check if this is the new prose format or old outline format */}
                    {section.prose_subsections ? (
                      // New prose format
                      section.prose_subsections.map((subsection, subIndex) => {
                        const letter = String.fromCharCode(65 + subIndex);
                        const isExpanded = expandedOutlines[`${sectionIndex}-${subIndex}`];
                        
                        return (
                          <div key={subIndex} className="ms-4 mb-4">
                            <div className="d-flex align-items-center mb-3">
                              <span className="me-3 text-secondary fw-bold" style={{ fontSize: '1.2rem', minWidth: '30px' }}>
                                {letter}.
                              </span>
                              <h5 className="mb-0 text-secondary">{subsection.subsection_title}</h5>
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
                                  {subsection.reference_path}
                                </div>
                                
                                <div className="prose-content border rounded p-4" style={{ backgroundColor: '#f8f9fa' }}>
                                  <div 
                                    dangerouslySetInnerHTML={{ __html: subsection.prose_content }}
                                    style={{ 
                                      lineHeight: '1.8',
                                      fontSize: '1rem'
                                    }}
                                  />
                                </div>
                                
                                <div className="mt-3">
                                  <button 
                                    className="btn btn-sm btn-outline-primary me-2"
                                    onClick={() => {
                                      // Copy prose to clipboard
                                      navigator.clipboard.writeText(subsection.prose_content.replace(/<[^>]*>/g, ''));
                                    }}
                                  >
                                    📋 Copy Text
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => {
                                      // Regenerate prose for this subsection
                                      console.log('Regenerate prose for:', subsection.subsection_title);
                                    }}
                                  >
                                    🔄 Regenerate
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      // Legacy outline format (fallback)
                      section.master_subsections?.map((subsection, subIndex) => {
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
                              <div className="ms-4 alert alert-warning">
                                <strong>Legacy Outline Format:</strong> This section uses the old outline format. 
                                Please regenerate with Step 3 to convert to prose format.
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
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

      {/* Prose Generation Status & Results */}
      {stepStatus[3] === 'processing' && (
        <div className="prose-status-section mt-4">
          <div className="alert alert-info">
            <div className="d-flex align-items-center">
              <FaSpinner className="fa-spin me-2" />
              <strong>Generating Academic Prose...</strong>
            </div>
            <p className="mb-0 mt-1 small">{stepProgress}</p>
          </div>
        </div>
      )}

      {/* Generated Prose Results - Display outside Step 3 box */}
      {masterOutlines && masterOutlines.length > 0 && (
        <div className="prose-results-section mt-4">
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className="text-primary mb-0">📚 Generated Academic Prose</h3>
              <div className="d-flex gap-2">
                <button 
                  className="btn btn-outline-success btn-sm"
                  onClick={() => {
                    if (onAutoSaveDraft) {
                      const currentState = {
                        currentStep: currentStep,
                        stepStatus: stepStatus,
                        contextAnalysisComplete,
                        questionAnsweringComplete,
                        detailedOutlineComplete,
                        questions,
                        responses,
                        masterOutlines,
                        contextMapData,
                        showContextMap,
                        showStep2Interface,
                        showStep3Interface
                      };
                      onAutoSaveDraft(currentState);
                      alert('Prose results saved successfully!');
                    }
                  }}
                  title="Manually save current prose results"
                >
                  💾 Save Prose Results
                </button>
                <button 
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => {
                    const allProseText = masterOutlines.map(section => {
                      let text = `${section.section_title}\n${'='.repeat(section.section_title.length)}\n\n`;
                      if (section.prose_subsections) {
                        section.prose_subsections.forEach(subsection => {
                          text += `${subsection.subsection_title}\n${'-'.repeat(subsection.subsection_title.length)}\n`;
                          text += subsection.prose_content.replace(/<[^>]*>/g, '') + '\n\n';
                        });
                      }
                      return text;
                    }).join('\n\n');
                    
                    navigator.clipboard.writeText(allProseText);
                    alert('All prose content copied to clipboard!');
                  }}
                  title="Copy all prose content to clipboard"
                >
                  📋 Copy All Prose
                </button>
              </div>
            </div>
            <div className="alert alert-info">
              <strong>Publication-Ready Content:</strong> The following sections have been converted from your research responses into academic prose suitable for research papers.
            </div>
          </div>

          {masterOutlines.map((section, sectionIndex) => {
            const romanNumeral = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][sectionIndex] || `${sectionIndex + 1}`;
            
            return (
              <div key={sectionIndex} className="prose-section mb-5">
                <div className="section-header mb-4 p-3 bg-light border-start border-primary border-4">
                  <h4 className="text-primary mb-2">
                    <span className="me-3">{romanNumeral}.</span>
                    {section.section_title}
                  </h4>
                  <p className="text-muted mb-0 small">
                    <strong>Context:</strong> {section.section_context}
                  </p>
                </div>

                {/* Check if this is the new prose format or old outline format */}
                {section.prose_subsections && section.prose_subsections.length > 0 ? (
                  // New prose format
                  section.prose_subsections.map((subsection, subIndex) => {
                    const letter = String.fromCharCode(65 + subIndex);
                    
                    return (
                      <div key={subIndex} className="prose-subsection mb-4 ms-4">
                        <div className="subsection-header mb-3 p-2 bg-light border rounded">
                          <h5 className="text-secondary mb-1">
                            <span className="me-2">{letter}.</span>
                            {subsection.subsection_title}
                          </h5>
                          <div className="small text-muted">
                            {subsection.question_count} questions • {subsection.citation_count} citations
                          </div>
                        </div>
                        
                        <div className="prose-content border rounded p-4 bg-white shadow-sm">
                          {subsection.prose_content ? (
                            <div 
                              dangerouslySetInnerHTML={{ __html: subsection.prose_content }}
                              style={{ 
                                lineHeight: '1.8',
                                fontSize: '1rem',
                                fontFamily: 'Georgia, serif'
                              }}
                            />
                          ) : (
                            <div className="text-muted fst-italic">
                              <p>No prose content generated for this subsection.</p>
                              <p className="small">Subsection data: {JSON.stringify(subsection, null, 2)}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="prose-actions mt-2 d-flex gap-2">
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => {
                              navigator.clipboard.writeText(subsection.prose_content.replace(/<[^>]*>/g, ''));
                            }}
                            title="Copy prose text to clipboard"
                          >
                            📋 Copy Text
                          </button>
                          <button 
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => {
                              console.log('Regenerate prose for:', subsection.subsection_title);
                              // TODO: Implement regeneration
                            }}
                            title="Regenerate prose for this subsection"
                          >
                            🔄 Regenerate
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // Legacy outline format or missing prose data
                  <div className="alert alert-warning ms-4">
                    <strong>No Prose Content:</strong> This section doesn't have prose content yet. 
                    {section.master_subsections ? 'Uses old outline format - ' : ''}Please run Step 3 to generate prose format.
                    <div className="mt-2 small text-muted">
                      Section structure: {JSON.stringify(Object.keys(section), null, 2)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Debug Section - Show raw data structure (remove in production) */}
          <div className="mt-4">
            <details className="mb-3">
              <summary className="btn btn-outline-secondary btn-sm">🔍 Debug: View Raw Prose Data</summary>
              <div className="mt-2 p-3 bg-light border rounded">
                <pre className="small text-muted mb-0" style={{ maxHeight: '300px', overflow: 'auto' }}>
                  {JSON.stringify(masterOutlines, null, 2)}
                </pre>
              </div>
            </details>
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