import { useState, useEffect } from 'react';
import axios from 'axios';

const MethodologyGenerator = ({ finalThesis, sourceCategories, setMethodology, proceedToOutline }) => {
  const [methodologyText, setMethodologyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // default isEditing to false after generation

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
        setIsEditing(false); // explicitly saved state
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    generateMethodology();
  }, []);

  const handleSave = () => {
    setMethodology(methodologyText);
    setIsEditing(false);
  };

  return (
    <div className="my-5">
      <h3>Research Methodology</h3>

      {loading && <p>Generating Methodology...</p>}
      {error && <div className="alert alert-danger">Error: {error}</div>}

      {!loading && !error && (
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
              <button className="btn btn-success" onClick={handleSave}>
                Save Methodology
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>
                Edit Methodology
              </button>
            )}

            {!isEditing && (
              <button className="btn btn-primary ms-2" onClick={proceedToOutline}>
                Proceed to Outline
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MethodologyGenerator;
