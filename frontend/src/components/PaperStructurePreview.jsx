import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaFileAlt, FaList, FaEye, FaEyeSlash } from 'react-icons/fa';

const PaperStructurePreview = ({ paperType, methodology, subMethodology }) => {
  const [structureData, setStructureData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (paperType?.id && methodology) {
      fetchStructure();
    }
  }, [paperType, methodology, subMethodology]);

  const fetchStructure = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('http://localhost:8000/paper_structure', {
        paper_type: paperType.id,
        methodology_id: methodology,
        sub_methodology_id: subMethodology
      });
      
      setStructureData(response.data);
    } catch (err) {
      setError('Failed to load paper structure');
      console.error('Structure fetch error:', err);
    }
    setLoading(false);
  };

  const toggleCollapse = () => setCollapsed(prev => !prev);

  if (loading) {
    return (
      <div className="alert alert-info">
        <FaFileAlt className="me-2" />
        Loading paper structure...
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-warning">
        <strong>Structure Preview:</strong> {error}
      </div>
    );
  }

  if (!structureData) {
    return null;
  }

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <FaFileAlt className="me-2 text-primary" />
          <h6 className="mb-0">Paper Structure Preview</h6>
          <span className="badge bg-info ms-2">
            {structureData.total_sections} sections
          </span>
        </div>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={toggleCollapse}
        >
          {collapsed ? <FaEye /> : <FaEyeSlash />}
          {collapsed ? ' Show' : ' Hide'}
        </button>
      </div>
      
      {!collapsed && (
        <div className="card-body">
          {/* Structure Info */}
          <div className="row mb-3">
            <div className="col-md-4">
              <small className="text-muted">
                <strong>Paper Type:</strong> {structureData.paper_type}
              </small>
            </div>
            <div className="col-md-4">
              <small className="text-muted">
                <strong>Methodology:</strong> {structureData.methodology || 'Base structure'}
              </small>
            </div>
            <div className="col-md-4">
              <small className="text-muted">
                <strong>Enhanced:</strong> {structureData.has_methodology_sections ? 'Yes' : 'No'}
              </small>
            </div>
          </div>

          {/* Structure List */}
          <div className="mb-3">
            <h6 className="text-primary mb-2">
              <FaList className="me-2" />
              Recommended Structure
            </h6>
            <div className="list-group">
              {structureData.structure.map((section, index) => (
                <div key={index} className="list-group-item d-flex align-items-center">
                  <span className="badge bg-secondary me-2">{index + 1}</span>
                  <span className="flex-grow-1">{section}</span>
                  {/* Highlight methodology-specific sections */}
                  {structureData.has_methodology_sections && 
                   !['Title Page', 'Abstract', 'References (APA 7th)'].includes(section) && 
                   !section.includes('Introduction') && 
                   !section.includes('Conclusion') && (
                    <span className="badge bg-primary ms-2">Method</span>
                   )}
                </div>
              ))}
            </div>
          </div>

          {/* Methodology Integration Notice */}
          {structureData.has_methodology_sections && (
            <div className="alert alert-success">
              <small>
                <strong>📋 Structure Enhanced:</strong> Your selected methodology has been integrated into the paper structure. 
                Methodology-specific sections have been added to support your research approach.
              </small>
            </div>
          )}

          {/* Paper Type Info */}
          <div className="mt-3">
            <details className="text-muted">
              <summary className="cursor-pointer">
                <small><strong>About this structure</strong></small>
              </summary>
              <small className="mt-2 d-block">
                This structure is specifically designed for <strong>{paperType.name}</strong> papers. 
                {structureData.has_methodology_sections && (
                  <span> The methodology sections have been integrated to support your <strong>{methodology}</strong> approach.</span>
                )}
                The outline generator will use this structure as a foundation for creating your detailed research outline.
              </small>
            </details>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaperStructurePreview;