import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const SourceCategories = ({ finalThesis, paperLength, onCategoriesSelected, savedCategories }) => {
  const [categories, setCategories] = useState(savedCategories && savedCategories.length > 0
    ? savedCategories.map((name, idx) => ({
        name,
        selected: true,
        number: idx + 1
      }))
    : []);
  const [customCategory, setCustomCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingRef = useRef(false); // Prevent double loading

  // Hydrate from savedCategories on mount or when it changes
  useEffect(() => {
    if (savedCategories && savedCategories.length > 0) {
      setCategories(savedCategories.map((name, idx) => ({
        name,
        selected: true,
        number: idx + 1
      })));
      setHasLoaded(true);
      setFinalized(true);
      setCollapsed(true);
    } else {
      setFinalized(false);
      setCollapsed(false);
    }
  }, [savedCategories]);

  const recommendSources = async () => {
    // Prevent multiple simultaneous loads
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    setLoading(true);
    setError(null);
    
    // Add delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const res = await axios.post('http://localhost:8000/recommend_sources', {
        final_thesis: finalThesis,
        paper_length_pages: paperLength,
      });

      const cats = res.data.recommended_categories.map((name, index) => {
        const cleanName = name.replace(/^\d+\.\s*/, '').trim();
        return { 
          name: cleanName, 
          selected: true,
          number: index + 1
        };
      });
      setCategories(cats);
      setHasLoaded(true);
    } catch (err) {
      console.error('Source recommendation error:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to recommend sources.';
      setError(errorMsg);
      
      const defaultCategories = [
        'Academic Journal Articles',
        'Government Reports',
        'Books and Monographs',
        'News Articles',
        'Expert Interviews'
      ];
      const cats = defaultCategories.map((name, index) => ({ 
        name, 
        selected: true,
        number: index + 1
      }));
      setCategories(cats);
      setHasLoaded(true);
    }
    setLoading(false);
    loadingRef.current = false;
  };

  const generateMoreSources = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    setLoadingMore(true);
    setError(null);
    
    // Add delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const existingCategories = categories.map(cat => cat.name);
      
      const res = await axios.post('http://localhost:8000/recommend_sources', {
        final_thesis: finalThesis,
        paper_length_pages: paperLength,
        exclude_categories: existingCategories, // Pass existing categories to avoid duplicates
      });

      const newCats = res.data.recommended_categories.map((name, index) => {
        const cleanName = name.replace(/^\d+\.\s*/, '').trim();
        return { 
          name: cleanName, 
          selected: true,
          number: categories.length + index + 1
        };
      });

      // Filter out any duplicates that might still exist
      const uniqueNewCats = newCats.filter(newCat => 
        !categories.some(existingCat => existingCat.name.toLowerCase() === newCat.name.toLowerCase())
      );

      // Renumber the new categories
      const numberedNewCats = uniqueNewCats.map((cat, index) => ({
        ...cat,
        number: categories.length + index + 1
      }));

      setCategories(prev => [...prev, ...numberedNewCats]);
    } catch (err) {
      console.error('Additional source recommendation error:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to generate additional sources.';
      setError(errorMsg);
      
      // Add some default additional categories if API fails
      const additionalDefaults = [
        'Case Studies',
        'Statistical Data',
        'Industry Reports',
        'Conference Papers',
        'White Papers'
      ];
      
      const newCats = additionalDefaults
        .filter(name => !categories.some(cat => cat.name.toLowerCase() === name.toLowerCase()))
        .map((name, index) => ({ 
          name, 
          selected: true,
          number: categories.length + index + 1
        }));
      
      setCategories(prev => [...prev, ...newCats]);
    }
    setLoadingMore(false);
    loadingRef.current = false;
  };

  // Only auto-load if there are no saved categories and we haven't loaded yet
  useEffect(() => {
    if (
      (!savedCategories || savedCategories.length === 0) &&
      finalThesis &&
      paperLength !== null &&
      !hasLoaded &&
      !loading
    ) {
      recommendSources();
    }
    // eslint-disable-next-line
  }, [savedCategories, finalThesis, paperLength, hasLoaded, loading]);

  const handleManualLoad = () => {
    if (!finalThesis || paperLength === null) {
      alert('Please ensure thesis and paper length are set before generating categories.');
      return;
    }
    // Call directly instead of relying on useEffect
    recommendSources();
  };

  const handleRegenerate = () => {
    if (finalized) {
      const confirmRegenerate = window.confirm(
        "This will reset all source categories and any customizations. Are you sure you want to regenerate?"
      );
      if (!confirmRegenerate) return;
      
      setFinalized(false);
      setCollapsed(false);
    }
    
    // Reset state and call directly
    setCategories([]);
    setCustomCategory('');
    setHasLoaded(false);
    recommendSources();
  };

  const handleAddMore = () => {
    if (!finalThesis || paperLength === null) {
      alert('Please ensure thesis and paper length are set before generating additional categories.');
      return;
    }
    
    if (finalized) {
      alert('Cannot add more categories after finalizing. Please edit the categories first.');
      return;
    }
    
    generateMoreSources();
  };

  const toggleCategory = (index) => {
    if (!finalized) {
      setCategories(prev =>
        prev.map((cat, idx) =>
          idx === index ? { ...cat, selected: !cat.selected } : cat
        )
      );
    }
  };

  const addCustomCategory = () => {
    if (customCategory.trim() && !finalized) {
      const nextNumber = categories.length + 1;
      setCategories(prev => [...prev, { 
        name: customCategory.trim(), 
        selected: true,
        number: nextNumber
      }]);
      setCustomCategory('');
    }
  };

  const handleFinalizeCategories = () => {
    const selectedCategories = categories.filter(cat => cat.selected).map(cat => cat.name);
    
    if (selectedCategories.length === 0) {
      alert("Please select at least one source category before proceeding.");
      return;
    }
    
    setFinalized(true);
    setCollapsed(true);
    onCategoriesSelected(selectedCategories, true);
  };

  const handleEditCategories = () => {
    if (finalized) {
      alert("Warning: Any changes made to the Source Categories at this point will NOT modify any research outputs already generated.");
    }
    setFinalized(false);
    setCollapsed(false);
  };

  const toggleCollapse = () => setCollapsed(prev => !prev);

  const selectedCount = categories.filter(cat => cat.selected).length;
  const totalCount = categories.length;

  return (
    <div className="mb-4 position-relative w-100">
      <div className="d-flex" style={{ position: 'absolute', top: 0, right: 0 }}>
        <button
          className="btn btn-sm btn-outline-primary me-2"
          onClick={handleAddMore}
          disabled={!hasLoaded || finalized || loadingMore}
          title="Generate additional source categories"
        >
          {loadingMore ? 'Adding...' : 'Add More'}
        </button>
        <button
          className="btn btn-sm btn-outline-secondary me-2"
          onClick={handleRegenerate}
          title="Regenerate source categories"
        >
          Refresh
        </button>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={toggleCollapse}
        >
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
        
      </div>

      <h3>
        Source Categories
        {finalized && (
          <small className="text-muted ms-2">
            ({selectedCount} of {totalCount} selected)
          </small>
        )}
      </h3>

      {!collapsed && (
        <>
          {/* Show manual load button if not loaded yet */}
          {!hasLoaded && !loading && (
            <div className="mb-3">
              <button
                className="btn btn-primary"
                onClick={handleManualLoad}
                disabled={!finalThesis || paperLength === null}
              >
                Generate Source Categories
              </button>
            </div>
          )}

          {(loading || loadingMore) && (
            <div className="d-flex align-items-center mb-3">
              <div className="spinner-border spinner-border-sm me-2" role="status" />
              <span>
                {loading ? 'Loading recommended sources...' : 'Generating additional sources...'}
              </span>
            </div>
          )}
          
          {error && (
            <div className="alert alert-warning">
              <p>{error}</p>
              <p><small>Default categories have been loaded. You can modify them below.</small></p>
            </div>
          )}
          
          {categories.map((cat, idx) => (
            <div 
              key={idx} 
              className={`form-check ${finalized && !cat.selected ? 'text-muted' : ''}`}
              style={{
                opacity: finalized && !cat.selected ? 0.5 : 1,
                textDecoration: finalized && !cat.selected ? 'line-through' : 'none'
              }}
            >
              {!finalized ? (
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={cat.selected}
                  onChange={() => toggleCategory(idx)}
                />
              ) : (
                <span 
                  className={`badge me-2 ${cat.selected ? 'bg-success' : 'bg-secondary'}`}
                  style={{ fontSize: '0.7em' }}
                >
                  {cat.selected ? '✓' : '✗'}
                </span>
              )}
              <label 
                className={`form-check-label ${finalized && !cat.selected ? 'text-muted' : ''}`}
                style={{ 
                  cursor: finalized ? 'default' : 'pointer'
                }}
                onClick={() => !finalized && toggleCategory(idx)}
              >
                <span className="text-muted me-2">{cat.number}.</span>
                {cat.name}
                {finalized && !cat.selected && (
                  <small className="text-muted ms-2">(excluded)</small>
                )}
              </label>
            </div>
          ))}

          {!finalized && hasLoaded && (
            <>
              <input
                className="form-control mt-2"
                placeholder={`Add custom category (will be #${categories.length + 1})`}
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCustomCategory()}
              />

              <div className="mt-3 d-flex gap-2">
                <button
                  className="btn btn-secondary"
                  onClick={addCustomCategory}
                  disabled={!customCategory.trim()}
                >
                  Add Category #{categories.length + 1}
                </button>

                <button
                  className="btn btn-primary"
                  onClick={handleFinalizeCategories}
                  disabled={selectedCount === 0}
                >
                  Proceed to Methodology ({selectedCount} selected)
                </button>
              </div>
            </>
          )}

          {finalized && (
            <div className="mt-3">
              <div className="alert alert-info">
                <strong>Finalized Selection:</strong> {selectedCount} source categories will be used for research analysis.
                {totalCount - selectedCount > 0 && (
                  <div><small>{totalCount - selectedCount} categories have been excluded from analysis.</small></div>
                )}
              </div>
              <button
                className="btn btn-secondary"
                onClick={handleEditCategories}
              >
                Edit Source Categories
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SourceCategories;
