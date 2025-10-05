import React from 'react';
import ReactDOM from 'react-dom';
import 'normalize.css';
import './defaults.css';
import Shop from './Shop';
import "./i18n";

ReactDOM.render(
  <React.StrictMode>
    <Shop />
  </React.StrictMode>,
  document.getElementById('root')
);
