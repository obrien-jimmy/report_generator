import React, { useState } from 'react';
import axios from 'axios';

const QueryKB = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get('http://localhost:8000/api/query_kb', {
        params: { query },
      });

      setResults(response.data.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Amazon Bedrock Knowledge Base Query</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          className="form-control"
          placeholder="Enter your query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary mt-2" disabled={loading}>
          {loading ? 'Loading...' : 'Submit'}
        </button>
      </form>

      {error && <div className="alert alert-danger mt-2">Error: {error}</div>}

      <ul className="list-group mt-3">
        {results.map((result, idx) => (
          <li key={idx} className="list-group-item">
            <strong>Score: {result.score.toFixed(2)}</strong>
            <p>{result.content.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default QueryKB;
