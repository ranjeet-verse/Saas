import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Chat from './pages/Chat';
import LoadingSpinner from './components/common/LoadingSpinner';
import Invite from './pages/Invite';
import Files from './pages/Files';
import Analytics from './pages/Analytics';
import Organization from './pages/Organization';
import AcceptInvite from './pages/AcceptInvite';
import Users from './pages/Users';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
    return <Navigate to="/" replace />;
  }

  return children;
};



function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />

      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="files" element={<Files />} />
        <Route path="chat" element={<Chat />} />
        <Route path="users" element={
          <AdminRoute>
            <Users />
          </AdminRoute>
        } />
        <Route path="organization" element={
          <AdminRoute>
            <Organization />
          </AdminRoute>
        } />
      </Route>
    </Routes>
  );
}

export default App;
