// src/App.jsx
import React from 'react';
import Player from './components/Player'; // ✅ Ensure this path is correct
import './App.css';

function App() {
  return (
    <div className="app-container">
      <div className="drag-handle"></div> {/* ✅ Invisible handle for dragging */}
      
      <div className="content">
        {/* ✅ ADD THE PLAYER COMPONENT HERE */}
        <Player /> 
      </div>
    </div>
  );
}

export default App;