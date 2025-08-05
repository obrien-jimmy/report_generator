import { useState } from 'react';
import { FaChevronDown, FaChevronUp, FaExternalLinkAlt, FaSearch, FaTrash, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import './CitationViewer.css';

const CitationViewer = ({ citations, onAddCitation, onRemoveCitation, finalThesis, methodology, paperLength, sourceCategories }) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddMoreForm, setShowAddMoreForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    source: '',
    year: '',
    author: ''
  });
  const [addMoreData, setAddMoreData] = useState({
    count: 3,
    context: ''
  });
  const [isSearching, setIsSearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleExpanded = () => setExpanded(!expanded);

  const openCitationDetails = (citation, index) => {
    setSelectedCitation({ ...citation, index });
  };

  const closeCitationDetails = () => {
    setSelectedCitation(null);
  };

  const handleRemoveCitation = (index) => {
    if (onRemoveCitation) {
      onRemoveCitation(index);
    }
    closeCitationDetails();
  };

  const handleAddCitation = () => {
    setShowAddForm(true);
  };

  const handleAddMore = () => {
    setShowAddMoreForm(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddMoreChange = (e) => {
    const { name, value } = e.target;
    setAddMoreData(prev => ({
      ...prev,
      [name]: name === 'count' ? parseInt(value) || 1 : value
    }));
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setIsSearching(true);

    try {
      const response = await axios.post('http://localhost:8000/identify_citation', formData);
      
      const identifiedCitation = response.data.citation;
      const newCitation = {
        apa: identifiedCitation.apa,
        categories: identifiedCitation.categories,
        methodologyPoints: identifiedCitation.methodologyPoints,
        description: identifiedCitation.description,
      };

      // Add the new citation using the parent's callback
      if (onAddCitation) {
        onAddCitation(newCitation);
      }

      // Reset form and close modal
      setFormData({ title: '', source: '', year: '', author: '' });
      setShowAddForm(false);
    } catch (err) {
      console.error('Error identifying citation:', err);
      alert(err.response?.data?.detail || err.message || 'Failed to identify citation.');
    }
    setIsSearching(false);
  };

  const submitAddMore = async (e) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const response = await axios.post('http://localhost:8000/generate_citations', {
        final_thesis: finalThesis,
        methodology: methodology,
        paper_length: paperLength,
        source_categories: sourceCategories,
        count: addMoreData.count,
        context: addMoreData.context,
        existing_citations: citations.map(c => c.apa) // Avoid duplicates
      });

      const newCitations = response.data.citations;
      
      // Add all new citations using the parent's callback
      if (onAddCitation && newCitations) {
        newCitations.forEach(citation => {
          onAddCitation(citation);
        });
      }

      // Reset form and close modal
      setAddMoreData({ count: 3, context: '' });
      setShowAddMoreForm(false);
    } catch (err) {
      console.error('Error generating citations:', err);
      alert(err.response?.data?.detail || err.message || 'Failed to generate additional citations.');
    }
    setIsGenerating(false);
  };

  const closeAddForm = () => {
    setShowAddForm(false);
    setFormData({ title: '', source: '', year: '', author: '' });
  };

  const closeAddMoreForm = () => {
    setShowAddMoreForm(false);
    setAddMoreData({ count: 3, context: '' });
  };

  if (!citations || citations.length === 0) {
    return (
      <div className="citation-viewer">
        <div className="citation-summary d-flex justify-content-between align-items-center p-2 bg-light rounded">
          <div className="text-muted small">No citations generated yet</div>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-sm btn-outline-primary"
              onClick={handleAddMore}
              title="Add more citations"
            >
              Add More
            </button>
            <button 
              className="btn btn-sm btn-outline-primary"
              onClick={handleAddCitation}
              title="Search for citation"
            >
              <FaSearch />
            </button>
          </div>
        </div>

        {/* Add More Citations Modal */}
        {showAddMoreForm && (
          <div className="modal-overlay" onClick={closeAddMoreForm}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Add More Citations</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeAddMoreForm}
                  aria-label="Close"
                >
                  <FaTimes />
                </button>
              </div>
              
              <form onSubmit={submitAddMore}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Number of Citations</label>
                    <select 
                      className="form-select"
                      name="count"
                      value={addMoreData.count}
                      onChange={handleAddMoreChange}
                      required
                    >
                      <option value={1}>1 citation</option>
                      <option value={2}>2 citations</option>
                      <option value={3}>3 citations</option>
                      <option value={4}>4 citations</option>
                      <option value={5}>5 citations</option>
                      <option value={6}>6 citations</option>
                      <option value={7}>7 citations</option>
                      <option value={8}>8 citations</option>
                      <option value={9}>9 citations</option>
                      <option value={10}>10 citations</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Additional Context (Optional)</label>
                    <textarea 
                      className="form-control"
                      name="context"
                      value={addMoreData.context}
                      onChange={handleAddMoreChange}
                      placeholder="e.g., 'All sources must be newer than 2015 and from government agencies' or 'Focus on peer-reviewed journal articles about methodology'"
                      rows="3"
                    />
                    <small className="form-text text-muted">
                      Provide specific criteria or focus areas for the new citations.
                    </small>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeAddMoreForm}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="btn btn-primary"
                    disabled={isGenerating}
                  >
                    {isGenerating ? 'Generating...' : `Generate ${addMoreData.count} Citations`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Search Citation Form Modal */}
        {showAddForm && (
          <div className="modal-overlay" onClick={closeAddForm}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Search for Citation</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeAddForm}
                  aria-label="Close"
                >
                  <FaTimes />
                </button>
              </div>
              
              <form onSubmit={submitForm}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Title</label>
                    <input 
                      type="text"
                      className="form-control" 
                      name="title" 
                      value={formData.title} 
                      onChange={handleFormChange}
                      placeholder="Enter the title of the work"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Source/Publication</label>
                    <input 
                      type="text"
                      className="form-control" 
                      name="source" 
                      value={formData.source} 
                      onChange={handleFormChange}
                      placeholder="Journal, book, website, etc."
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Year</label>
                    <input 
                      type="text"
                      className="form-control" 
                      name="year" 
                      value={formData.year} 
                      onChange={handleFormChange}
                      placeholder="Publication year"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Author</label>
                    <input 
                      type="text"
                      className="form-control" 
                      name="author" 
                      value={formData.author} 
                      onChange={handleFormChange}
                      placeholder="Author name(s)"
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeAddForm}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSearching}
                  >
                    {isSearching ? 'Searching...' : 'Search for Citation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="citation-viewer">
      {/* Citation Summary Bar */}
      <div className="citation-summary d-flex justify-content-between align-items-center p-2 bg-light rounded">
        <div className="d-flex align-items-center">
          <span className="badge bg-info me-2">{citations.length}</span>
          <span className="small text-muted">
            {citations.length === 1 ? 'Citation' : 'Citations'} Available
          </span>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-sm btn-outline-primary"
            onClick={handleAddMore}
            title="Add more citations"
          >
            Add More
          </button>
          <button 
            className="btn btn-sm btn-outline-primary"
            onClick={handleAddCitation}
            title="Search for citation"
          >
            <FaSearch />
          </button>
          <button 
            className="btn btn-sm btn-outline-secondary"
            onClick={toggleExpanded}
            title={expanded ? 'Hide citations' : 'Show citations'}
          >
            {expanded ? <FaChevronUp /> : <FaChevronDown />}
          </button>
        </div>
      </div>

      {/* Expanded Citation List */}
      {expanded && (
        <div className="citation-list mt-2">
          {citations.map((citation, index) => (
            <div key={index} className="citation-item mb-2">
              <div className="citation-preview p-2 border rounded">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="citation-text flex-grow-1 me-2">
                    <div className="citation-apa small">
                      {citation.apa}
                    </div>
                  </div>
                  <div className="citation-actions">
                    <button
                      className="btn btn-sm btn-outline-info"
                      onClick={() => openCitationDetails(citation, index)}
                      title="View details"
                    >
                      <FaExternalLinkAlt />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Citation Details Modal */}
      {selectedCitation && (
        <div className="modal-overlay" onClick={closeCitationDetails}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Citation Details</h5>
              <button
                type="button"
                className="btn-close"
                onClick={closeCitationDetails}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="modal-body">
              {/* APA Citation */}
              <div className="mb-3">
                <h6 className="text-primary">APA Citation</h6>
                <div className="p-2 bg-light rounded">
                  <small>{selectedCitation.apa}</small>
                </div>
              </div>

              {/* Categories */}
              {selectedCitation.categories && selectedCitation.categories.length > 0 && (
                <div className="mb-3">
                  <h6 className="text-primary">Source Categories</h6>
                  <div className="p-2 bg-light rounded">
                    <small>{selectedCitation.categories.join(', ')}</small>
                  </div>
                </div>
              )}

              {/* Methodology Points */}
              {selectedCitation.methodologyPoints && selectedCitation.methodologyPoints.length > 0 && (
                <div className="mb-3">
                  <h6 className="text-primary">Methodology Points</h6>
                  <div className="p-2 bg-light rounded">
                    <small>{selectedCitation.methodologyPoints.join(', ')}</small>
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedCitation.description && (
                <div className="mb-3">
                  <h6 className="text-primary">Description</h6>
                  <div className="p-2 bg-light rounded">
                    <small>{selectedCitation.description}</small>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeCitationDetails}
              >
                Close
              </button>
              {onRemoveCitation && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleRemoveCitation(selectedCitation.index)}
                >
                  <FaTrash className="me-1" />
                  Remove Citation
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add More Citations Modal */}
      {showAddMoreForm && (
        <div className="modal-overlay" onClick={closeAddMoreForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Add More Citations</h5>
              <button
                type="button"
                className="btn-close"
                onClick={closeAddMoreForm}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={submitAddMore}>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Number of Citations</label>
                  <select 
                    className="form-select"
                    name="count"
                    value={addMoreData.count}
                    onChange={handleAddMoreChange}
                    required
                  >
                    <option value={1}>1 citation</option>
                    <option value={2}>2 citations</option>
                    <option value={3}>3 citations</option>
                    <option value={4}>4 citations</option>
                    <option value={5}>5 citations</option>
                    <option value={6}>6 citations</option>
                    <option value={7}>7 citations</option>
                    <option value={8}>8 citations</option>
                    <option value={9}>9 citations</option>
                    <option value={10}>10 citations</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Additional Context (Optional)</label>
                  <textarea 
                    className="form-control"
                    name="context"
                    value={addMoreData.context}
                    onChange={handleAddMoreChange}
                    placeholder="e.g., 'All sources must be newer than 2015 and from government agencies' or 'Focus on peer-reviewed journal articles about methodology'"
                    rows="3"
                  />
                  <small className="form-text text-muted">
                    Provide specific criteria or focus areas for the new citations.
                  </small>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeAddMoreForm}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Generating...' : `Generate ${addMoreData.count} Citations`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search Citation Form Modal */}
      {showAddForm && (
        <div className="modal-overlay" onClick={closeAddForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Search for Citation</h5>
              <button
                type="button"
                className="btn-close"
                onClick={closeAddForm}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={submitForm}>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Title</label>
                  <input 
                    type="text"
                    className="form-control" 
                    name="title" 
                    value={formData.title} 
                    onChange={handleFormChange}
                    placeholder="Enter the title of the work"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Source/Publication</label>
                  <input 
                    type="text"
                    className="form-control" 
                    name="source" 
                    value={formData.source} 
                    onChange={handleFormChange}
                    placeholder="Journal, book, website, etc."
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Year</label>
                  <input 
                    type="text"
                    className="form-control" 
                    name="year" 
                    value={formData.year} 
                    onChange={handleFormChange}
                    placeholder="Publication year"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Author</label>
                  <input 
                    type="text"
                    className="form-control" 
                    name="author" 
                    value={formData.author} 
                    onChange={handleFormChange}
                    placeholder="Author name(s)"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeAddForm}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSearching}
                >
                  {isSearching ? 'Searching...' : 'Search for Citation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitationViewer;