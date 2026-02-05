import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Welcome } from './pages/Welcome';
import { AgentsList, AgentEditor } from './pages/Agents';
import { Runs } from './pages/Runs';
import { Knowledge } from './pages/Knowledge';
import { Api } from './pages/Api';
import { Chat } from './pages/Chat';
import { Preview } from './pages/Preview';

const SettingsPlaceholder = () => <div className="text-white">Página de Configurações (Mock)</div>;

const App = () => {
  return (
    <AppProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/" element={<Dashboard />} />

            <Route path="/chat" element={<Chat />} />

            <Route path="/agents" element={<AgentsList />} />
            <Route path="/agents/new" element={<AgentEditor />} />
            <Route path="/agents/:id" element={<AgentEditor />} />

            <Route path="/runs" element={<Runs />} />
            <Route path="/preview" element={<Preview />} />
            <Route path="/knowledge" element={<Knowledge />} />
            <Route path="/api" element={<Api />} />
            <Route path="/settings" element={<SettingsPlaceholder />} />

            <Route path="*" element={<Navigate to="/welcome" replace />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  );
};

export default App;
