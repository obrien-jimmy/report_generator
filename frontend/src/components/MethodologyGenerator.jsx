import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaChevronRight, FaChevronDown } from 'react-icons/fa';

const MethodologyGenerator = ({ finalThesis, sourceCategories, setMethodology, proceedToOutline }) => {
  const [methodologyText, setMethodologyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [outlineActivated, setOutlineActivated] = useState(false);
  const [outlineNeedsRerun, setOutlineNeedsRerun] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const generateMethodology = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.post('http://localhost:8000/generate_methodology', {
          final_thesis: finalThesis,
          source_categories: sourceCategories,
        });

        const formattedMethodology = res.data.methodology
          .replace(/\s(\d+\.)/g, '\n$1')
          .trim();

        setMethodologyText(formattedMethodology);
        setMethodology(formattedMethodology);
        setIsEditing(false);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    generateMethodology();
  }, [finalThesis, sourceCategories, setMethodology]);

  const handleSave = () => {
    setMethodology(methodologyText);
    setIsEditing(false);

    if (outlineActivated) {
      setOutlineNeedsRerun(true);
    }
  };

  const handleEditClick = () => {
    if (outlineActivated) {
      alert("Warning: Editing the methodology at this point will NOT modify any research outputs already generated.");
    }
    setIsEditing(true);
  };

  const handleProceedToOutline = () => {
    proceedToOutline();
    setOutlineActivated(true);
    setCollapsed(true);
  };

  const handleRerunOutline = () => {
    proceedToOutline();
    setOutlineNeedsRerun(false);
  };

  const toggleCollapse = () => setCollapsed(prev => !prev);

  return (
    <div >
      <div
        style={{ position: 'absolute', top: 10, right: 26, cursor: 'pointer', color: '#aaa' }}
        onClick={toggleCollapse}
      >
        {collapsed ? <FaChevronRight /> : <FaChevronDown />}
      </div>

      <h3>Methodology Considerations</h3>

      {loading && <p>Generating Methodology...</p>}
      {error && <div className="alert alert-danger">Error: {error}</div>}

      {!loading && !error && !collapsed && (
        <>
          <textarea
            className="form-control"
            rows={Math.max(4, methodologyText.split('\n').length + 2)}
            value={methodologyText}
            onChange={(e) => setMethodologyText(e.target.value)}
            style={{ resize: 'vertical', whiteSpace: 'pre-wrap' }}
            readOnly={!isEditing}
          />

          <div className="mt-3">
            {isEditing ? (
              <button className="btn btn-primary" onClick={handleSave}>
                Save Methodology
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={handleEditClick}>
                Edit Methodology
              </button>
            )}

            {!isEditing && !outlineActivated && (
              <button className="btn btn-primary ms-2" onClick={handleProceedToOutline}>
                Proceed to Outline
              </button>
            )}

            {!isEditing && outlineActivated && outlineNeedsRerun && (
              <button className="btn btn-primary ms-2" onClick={handleRerunOutline}>
                Rerun Outline
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MethodologyGenerator;
