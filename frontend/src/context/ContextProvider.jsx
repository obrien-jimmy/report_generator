import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

// Create the context
const ContextContext = createContext();

// Custom hook to use the context
export const useContextData = () => {
  const context = useContext(ContextContext);
  if (!context) {
    throw new Error('useContextData must be used within a ContextProvider');
  }
  return context;
};

// Context Provider Component
export const ContextProvider = ({ children }) => {
  // Core context state
  const [finalThesis, setFinalThesis] = useState('');
  const [sourceCategories, setSourceCategories] = useState([]);
  const [methodology, setMethodology] = useState('');
  const [selectedPaperType, setSelectedPaperType] = useState(null);
  const [outlineData, setOutlineData] = useState(null);
  const [dataObservationData, setDataObservationData] = useState(null);

  // Workflow state
  const [activeTab, setActiveTab] = useState('framework');
  const [frameworkComplete, setFrameworkComplete] = useState(false);
  const [thesisFinalized, setThesisFinalized] = useState(false);
  const [categoriesFinalized, setCategoriesFinalized] = useState(false);
  const [sourceCategoriesActivated, setSourceCategoriesActivated] = useState(false);

  // Project management
  const [currentProject, setCurrentProject] = useState(null);
  const [autoSave, setAutoSave] = useState(true);

  // Refs for project management
  const projectManagerRef = useRef(null);

  // Debounced auto-save
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

  // Context update methods
  const updateFinalThesis = (thesis) => {
    setFinalThesis(thesis);
    triggerAutoSave();
  };

  const updateSourceCategories = (categories) => {
    setSourceCategories(categories);
    triggerAutoSave();
  };

  const updateMethodology = (methodologyData) => {
    setMethodology(methodologyData);
    triggerAutoSave();
  };

  const updateSelectedPaperType = (paperType) => {
    setSelectedPaperType(paperType);
    triggerAutoSave();
  };

  const updateOutlineData = (outline) => {
    setOutlineData(outline);
    triggerAutoSave();
  };

  const updateDataObservationData = (data) => {
    setDataObservationData(data);
    triggerAutoSave();
  };

  const updateActiveTab = (tab) => {
    setActiveTab(tab);
    // Don't auto-save on tab changes - this is just UI state
  };

  // Load project data
  const loadProjectData = (project) => {
    const data = project.data;

    // Restore all state
    setFinalThesis(data.finalThesis || '');
    setSourceCategories(data.sourceCategories || []);
    setMethodology(data.methodology || '');
    setSelectedPaperType(data.selectedPaperType || null);
  setOutlineData(data.outlineData || null);
  // Prefer new key `dataObservationData` but fall back to older `literatureReviewData` if present
  setDataObservationData(data.dataObservationData || data.literatureReviewData || null);

    // Restore workflow state
    setFrameworkComplete(data.frameworkComplete || false);
    setThesisFinalized(data.thesisFinalized || false);
    setCategoriesFinalized(data.categoriesFinalized || false);
    setSourceCategoriesActivated(data.sourceCategoriesActivated || false);
    setActiveTab(data.activeTab || 'framework');
  };

  // Get current step for context display
  const getCurrentStep = () => {
    switch (activeTab) {
      case 'framework':
        return 'Framework Setup';
      case 'outline':
        return 'Outline Generation';
      case 'dataobs':
        return 'Data & Observation';
      default:
        return 'Unknown Step';
    }
  };

  // Context value object
  const value = {
    // State
    finalThesis,
    sourceCategories,
    methodology,
    selectedPaperType,
  outlineData,
  dataObservationData,
    activeTab,
    frameworkComplete,
    thesisFinalized,
    categoriesFinalized,
    sourceCategoriesActivated,
    currentProject,
    autoSave,

    // Refs
    projectManagerRef,

    // Methods
    updateFinalThesis,
    updateSourceCategories,
    updateMethodology,
    updateSelectedPaperType,
  updateOutlineData,
  updateDataObservationData,
    updateActiveTab,
    setFrameworkComplete,
    setThesisFinalized,
    setCategoriesFinalized,
    setSourceCategoriesActivated,
    setCurrentProject,
    setAutoSave,
    loadProjectData,
    getCurrentStep,
    triggerAutoSave
  };

  return (
    <ContextContext.Provider value={value}>
      {children}
    </ContextContext.Provider>
  );
};