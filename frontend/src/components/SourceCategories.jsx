import { useState, useEffect } from 'react';
import axios from 'axios';

const SourceCategories = ({ finalThesis, paperLength, onCategoriesSelected }) => {
  const [categories, setCategories] = useState([]);
  const [customCategory, setCustomCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [finalized, setFinalized] = useState(false);

  useEffect(() => {
    const recommendSources = async () => {
      setLoading(true);
      try {
        const res = await axios.post('http://localhost:8000/recommend_sources', {
          final_thesis: finalThesis,
          paper_length_pages: paperLength,
        });

        const cats = res.data.recommended_categories.map((name) => ({ name, selected: true }));
        setCategories(cats);
      } catch {
        alert('Failed to recommend sources.');
      }
      setLoading(false);
    };

    recommendSources();
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
    onCategoriesSelected(categories.filter(cat => cat.selected).map(cat => cat.name));
  };

  const handleEditCategories = () => {
    if (finalized) {
      alert("Warning: Any changes made to the Source Categories at this point will NOT modify any research outputs already generated.");
    }
    setFinalized(false);
  };

  return (
    <div className="">
      <h3>Source Categories</h3>

      {loading ? (
        <p>Loading recommended sources...</p>
      ) : (
        categories.map((cat, idx) => (
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
        ))
      )}

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
    </div>
  );
};

export default SourceCategories;
