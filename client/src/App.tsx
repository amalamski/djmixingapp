import React from 'react';
import Home from './pages/Home';

/**
 * Main App Component
 * Top-level routing and theme provider
 */
const App: React.FC = () => {
  return (
    <div className="app">
      <Home />
    </div>
  );
};

export default App;
