import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import LoginScreen from './screens/login_screen.jsx';
import MainScreen from './screens/MainScreen.jsx';
import RegisterScreen from './screens/register_screen.jsx';
import CocineroScreen from './screens/Cocinero.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<LoginScreen />} />
        <Route path="/main" element={<MainScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/cocinero" element={<CocineroScreen/>} />
      </Routes>
    </Router>
  </React.StrictMode>
);
