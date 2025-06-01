import { useState } from "react";
import axios from 'axios';
import "./CitationCards.css";
import { FaUpload, FaDatabase, FaRobot } from "react-icons/fa";

const CitationCards = ({ citations }) => {
  const [cardStates, setCardStates] = useState(
    citations.map(() => ({ side: 0, source: "LLM" }))
  );
  const [allCitations, setAllCitations] = useState(citations);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    source: "",
    year: "",
    author: "",
  });

  const rotateCard = (index, e) => {
    e.preventDefault();
    e.stopPropagation();
    setCardStates((prev) =>
      prev.map((card, idx) =>
        idx === index ? { ...card, side: (card.side + 1) % 3 } : card
      )
    );
  };

  const toggleSource = (index, source) => {
    setCardStates((prev) =>
      prev.map((card, idx) => (idx === index ? { ...card, source } : card))
    );
  };

  const deleteCard = (index) => {
    setAllCitations((prev) => prev.filter((_, idx) => idx !== index));
    setCardStates((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const submitForm = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post('http://localhost:8000/identify_citation', formData);

      const identifiedCitation = res.data.citation;

      const newCitation = {
        apa: identifiedCitation.apa,
        categories: identifiedCitation.categories,
        methodologyPoints: identifiedCitation.methodologyPoints,
        description: identifiedCitation.description,
      };

      setAllCitations((prev) => [...prev, newCitation]);
      setCardStates((prev) => [...prev, { side: 0, source: "LLM" }]);
    } catch (err) {
      alert(err.message || "Failed to identify citation.");
    }

    setFormData({ title: "", source: "", year: "", author: "" });
    setShowForm(false);
  };

  return (
    <div className="citation-card-container">
      {allCitations.map((citation, idx) => (
        <div key={idx} className="citation-card">
          <div className="delete-icon" onClick={() => deleteCard(idx)}>
            &times;
          </div>
          <div className="rotate-icon" onClick={(e) => rotateCard(idx, e)}>
            <span className={cardStates[idx].side === 0 ? "active-dot" : "dot"}>●</span>
            <span className={cardStates[idx].side === 1 ? "active-dot" : "dot"}>●</span>
            <span className={cardStates[idx].side === 2 ? "active-dot" : "dot"}>●</span>
          </div>

          {cardStates[idx].side === 0 && (
            <div className="card-content">
              <h6><strong>APA Citation</strong></h6>
              <div className="content-text">{citation.apa}</div>
            </div>
          )}

          {cardStates[idx].side === 1 && (
            <div className="card-content">
              <h6><strong>Tracing Information</strong></h6>
              <div className="content-text">
                <strong>Categories:</strong> {citation.categories.join(", ")}<br/>
                <strong>Methodology Points:</strong> {citation.methodologyPoints.join(", ")}<br/>
                <strong>Description:</strong> {citation.description}
              </div>
            </div>
          )}

          {cardStates[idx].side === 2 && (
            <div className="card-content">
              <h6><strong>Sourced From</strong></h6>
              <label>
                <input
                  type="radio"
                  checked={cardStates[idx].source === "LLM"}
                  onChange={() => toggleSource(idx, "LLM")}
                /> LLM <FaRobot/>
              </label>
              <br></br>
              <label>
                <input
                  type="radio"
                  checked={cardStates[idx].source === "Database"}
                  onChange={() => toggleSource(idx, "Database")}
                /> Database <FaDatabase/>
              </label>
              {cardStates[idx].source === "Database" && (
                <div className="upload-placeholder">
                  <FaUpload/> (Upload option placeholder)
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="citation-card add-card" onClick={() => setShowForm(true)}>
        <span className="add-icon">+</span>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Search for Citation</h4>
            <form onSubmit={submitForm}>
              <input className="form-control" placeholder="Title" name="title" value={formData.title} onChange={handleFormChange}/>
              <input className="form-control" placeholder="Source/Publication" name="source" value={formData.source} onChange={handleFormChange}/>
              <input className="form-control" placeholder="Year" name="year" value={formData.year} onChange={handleFormChange}/>
              <input className="form-control" placeholder="Author" name="author" value={formData.author} onChange={handleFormChange}/>
              <button className="btn btn-primary mt-2" type="submit">Search for Citation</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitationCards;
