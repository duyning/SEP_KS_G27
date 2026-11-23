import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { FavoritesProvider } from './context/FavoritesContext.jsx';
import { LoadingProvider } from './context/LoadingContext.jsx';
import App from './App.jsx';
import { AppMotionProvider } from './components/motion/MotionUI.jsx';
import './styles/styles.css';
import './styles/auth.css';
import './styles/portal.css';
import './styles/host-dashboard.css';
import './styles/motion.css';
import './styles/loading.css';
import './styles/design-system.css';
import './styles/workspace-header.css';
import './styles/workspace-content.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode><AppMotionProvider><LoadingProvider><BrowserRouter><AuthProvider><FavoritesProvider><App /></FavoritesProvider></AuthProvider></BrowserRouter></LoadingProvider></AppMotionProvider></React.StrictMode>
);
