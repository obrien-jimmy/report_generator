import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaChevronRight, FaChevronDown } from 'react-icons/fa';

const SourceCategories = ({ finalThesis, paperLength, onCategoriesSelected }) => {
  const [categories, setCategories] = useState([]);
  const [customCategory, setCustomCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState(null); // Add error state

  useEffect(() => {
    const recommendSources = async () => {
      setLoading(true);
      setError(null); // Clear previous errors
      
      // Add delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const res = await axios.post('http://localhost:8000/recommend_sources', {
          final_thesis: finalThesis,
          paper_length_pages: paperLength,
        });

        const cats = res.data.recommended_categories.map((name) => ({ name, selected: true }));
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
        const cats = defaultCategories.map((name) => ({ name, selected: true }));
        setCategories(cats);
      }
      setLoading(false);
    };

    if (finalThesis && paperLength !== null) {
      recommendSources();
    }
  }, [finalThesis, paperLength]);

  const toggleCategory = (index) => {
    setCategories(prev =>
      prev.map((cat, idx) =>
        idx === index ? { ...cat, selected: !cat.selected } : cat
      )
    );
  };

  const addCustomCategory = () => {
    if (customCategory.trim()) {
      setCategories(prev => [...prev, { name: customCategory, selected: true }]);
      setCustomCategory('');
    }
  };

  const handleFinalizeCategories = () => {
    setFinalized(true);
    setCollapsed(true);  // Auto-collapse after finalizing
    onCategoriesSelected(categories.filter(cat => cat.selected).map(cat => cat.name));
  };

  const handleEditCategories = () => {
    if (finalized) {
      alert("Warning: Any changes made to the Source Categories at this point will NOT modify any research outputs already generated.");
    }
    setFinalized(false);
    setCollapsed(false);
  };

  const toggleCollapse = () => setCollapsed(prev => !prev);

  return (
    <div className="position-relative">
      <div
        style={{ position: 'absolute', top: -5, right: 10, cursor: 'pointer', color: '#aaa' }}
        onClick={toggleCollapse}
      >
        {collapsed ? <FaChevronRight /> : <FaChevronDown />}
      </div>

      <h3>Source Categories</h3>

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
            <div key={idx} className="form-check">
              {!finalized && (
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={cat.selected}
                  onChange={() => toggleCategory(idx)}
                />
              )}
              <label className="form-check-label">
                {cat.name}
              </label>
            </div>
          ))}

          {!finalized && (
            <>
              <input
                className="form-control mt-2"
                placeholder="Add custom category"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />

              <div className="mt-3 d-flex gap-2">
                <button
                  className="btn btn-secondary"
                  onClick={addCustomCategory}
                >
                  Add Category
                </button>

                <button
                  className="btn btn-primary"
                  onClick={handleFinalizeCategories}
                >
                  Proceed to Methodology
                </button>
              </div>
            </>
          )}

          {finalized && (
            <button
              className="btn btn-secondary mt-3"
              onClick={handleEditCategories}
            >
              Edit Source Categories
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default SourceCategories;
