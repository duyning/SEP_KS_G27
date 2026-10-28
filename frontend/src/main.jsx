import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import App from './App.jsx';
import { AppMotionProvider } from './components/motion/MotionUI.jsx';
import './styles/styles.css';
import './styles/auth.css';
import './styles/portal.css';
import './styles/host-dashboard.css';
import './styles/motion.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode><AppMotionProvider><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></AppMotionProvider></React.StrictMode>
);
