import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ThesisProvider } from './context/ThesisContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThesisProvider>
      <App />
    </ThesisProvider>
  </React.StrictMode>
);
