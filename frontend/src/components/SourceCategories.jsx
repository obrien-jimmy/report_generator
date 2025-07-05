import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaChevronRight, FaChevronDown, FaSyncAlt } from 'react-icons/fa';

const SourceCategories = ({ finalThesis, paperLength, onCategoriesSelected }) => {
  const [categories, setCategories] = useState([]);
  const [customCategory, setCustomCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const recommendSources = async () => {
    setLoading(true);
    setError(null);
    
    // Add delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const res = await axios.post('http://localhost:8000/recommend_sources', {
        final_thesis: finalThesis,
        paper_length_pages: paperLength,
      });

      // Parse numbered categories and clean them
      const cats = res.data.recommended_categories.map((name, index) => {
        // Remove existing numbering (e.g., "1. ", "2. ", etc.) if present
        const cleanName = name.replace(/^\d+\.\s*/, '').trim();
        return { 
          name: cleanName, 
          selected: true,
          number: index + 1
        };
      });
      setCategories(cats);
    } catch (err) {
      console.error('Source recommendation error:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to recommend sources.';
      setError(errorMsg);
      
      // Set some default categories if the API fails
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
    }
    setLoading(false);
  };

  useEffect(() => {
    // Only run once when component first mounts with valid data
    if (finalThesis && paperLength !== null && !hasInitialized) {
      recommendSources();
      setHasInitialized(true);
    }
  }, [finalThesis, paperLength, hasInitialized]);

  const handleRegenerate = () => {
    if (finalized) {
      const confirmRegenerate = window.confirm(
        "This will reset all source categories and any customizations. Are you sure you want to regenerate?"
      );
      if (!confirmRegenerate) return;
      
      setFinalized(false);
      setCollapsed(false);
    }
    
    // Clear existing categories and regenerate
    setCategories([]);
    setCustomCategory('');
    recommendSources();
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
    // Only pass selected categories to the parent component (without numbers)
    const selectedCategories = categories.filter(cat => cat.selected).map(cat => cat.name);
    
    if (selectedCategories.length === 0) {
      alert("Please select at least one source category before proceeding.");
      return;
    }
    
    setFinalized(true);
    setCollapsed(true);  // Auto-collapse after finalizing
    onCategoriesSelected(selectedCategories);
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
      <div className="d-flex" style={{ position: 'absolute', top: -5, right: 10 }}>
        <FaSyncAlt 
          style={{ 
            cursor: 'pointer', 
            color: '#aaa', 
            marginRight: '8px',
            fontSize: '0.9em'
          }}
          onClick={handleRegenerate}
          title="Regenerate source categories"
        />
        <div
          style={{ cursor: 'pointer', color: '#aaa' }}
          onClick={toggleCollapse}
        >
          {collapsed ? <FaChevronRight /> : <FaChevronDown />}
        </div>
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
          {loading ? (
            <p>Loading recommended sources...</p>
          ) : error ? (
            <div className="alert alert-warning">
              <p>{error}</p>
              <p><small>Default categories have been loaded. You can modify them below.</small></p>
            </div>
          ) : null}
          
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

          {!finalized && (
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
