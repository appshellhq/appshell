import React from 'react';
import ReactDOM from 'react-dom/client';
import Ping from './Ping';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <Ping />
  </React.StrictMode>,
);
