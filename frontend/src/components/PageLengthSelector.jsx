import { useState } from 'react';

const PageLengthSelector = ({ onPageCountSelected }) => {
  const [pageCount, setPageCount] = useState('Adjusted Based on Thesis');
  const [isFinalized, setIsFinalized] = useState(false);
  const [hasFinalizedOnce, setHasFinalizedOnce] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleSubmit = () => {
    const pageLengthValue = {
      "Maximum Detail": -2,
      "Adjusted Based on Thesis": -1,
    }[pageCount] || parseInt(pageCount, 10);

    // Pass both the value and a flag to trigger source categories loading
    onPageCountSelected(pageLengthValue, true); // Second parameter triggers loading
    setIsFinalized(true);
    setHasFinalizedOnce(true);
    setCollapsed(true);
  };

  const handleEdit = () => {
    if (hasFinalizedOnce) {
      alert("Warning: Any changes made now won't affect existing research outputs below unless you rerun those sections.");
    }
    setIsFinalized(false);
    setCollapsed(false);
  };

  const toggleCollapse = () => setCollapsed(prev => !prev);

  return (
    <div className="card p-3 mb-4 position-relative w-100">
      <div className="d-flex" style={{ position: 'absolute', top: 14, right: 14 }}>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={toggleCollapse}
        >
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>

      <h3>Select Paper Length</h3>

      {!collapsed && (
        <>
          <select
            className="form-select my-3"
            value={pageCount}
            onChange={(e) => setPageCount(e.target.value)}
            disabled={isFinalized}
          >
            <option value="Adjusted Based on Thesis">Adjusted Based on Thesis</option>
            <option value="5">5 pages</option>
            <option value="10">10 pages</option>
            <option value="15">15 pages</option>
            <option value="20">20 pages</option>
            <option value="Maximum Detail">Maximum Detail</option>
          </select>

          <div className="mt-2">
            {isFinalized ? (
              <button className="btn btn-secondary" onClick={handleEdit}>
                Edit Length
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleSubmit}>
                {hasFinalizedOnce ? 'Rerun Source Categories' : 'Proceed to Source Categories'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PageLengthSelector;
