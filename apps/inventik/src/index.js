import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';

// V development módu (npm start) použít prázdný basename
// V production módu (npm run build) použít PUBLIC_URL z package.json
const basename = process.env.NODE_ENV === 'development' ? '' : (process.env.PUBLIC_URL || '');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
