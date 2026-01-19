import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SONG_LIST } from './constants';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

if (window.location.pathname === '/list') {
  root.render(
    <div className="bg-gray-900 text-white min-h-screen p-4 font-mono text-sm whitespace-pre-wrap">
      {JSON.stringify(SONG_LIST, null, 2)}
    </div>
  );
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}