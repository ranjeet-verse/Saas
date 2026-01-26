import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, CheckCircle, Users, FolderKanban, Plus, LogOut, UserPlus, 
  Trash2, Edit, Search, MoreVertical, Eye, Calendar, Clock, Target, 
  ChevronRight, Zap, Shield, BarChart3, Menu, X, Briefcase, ArrowLeft, Send 
} from 'lucide-react';

// --- API Configuration ---
const API_BASE = 'http://localhost:8000';

const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('access_token');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token && !options.skipAuth) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

    if (response.status === 401 && !options.skipAuth) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            localStorage.setItem('access_token', data.access_token);
            return api.request(endpoint, options);
          }
        } catch (e) {
          localStorage.clear();
          window.location.href = '/';
        }
      }
    }
    if (!response.ok && response.status !== 401) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'Request failed');
    }
    return response;
  },
  async get(endpoint) { 
    const r = await this.request(endpoint); 
    if (r.status === 204) return null;
    return r.json(); 
  },
  async post(endpoint, data, skipAuth = false) {
    const r = await this.request(endpoint, { 
      method: 'POST', 
      body: JSON.stringify(data), 
      skipAuth 
    });
    if (r.status === 204) return null;
    return r.json();
  },
  async put(endpoint, data) { 
    const r = await this.request(endpoint, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }); 
    if (r.status === 204) return null;
    return r.json(); 
  },
  async delete(endpoint) { 
    await this.request(endpoint, { method: 'DELETE' }); 
  },
  async login(formData) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 
        username: formData.email, 
        password: formData.password 
      }),
    });
    if (!response.ok) throw new Error('Invalid credentials');
    return response.json();
  }
};

// --- Reusable UI Components ---
const Alert = ({ type, children, onClose }) => (
  <div className={`p-4 rounded-lg mb-4 flex items-start gap-3 ${
    type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
  }`}>
    {type === 'error' ? <AlertCircle className="w-5 h-5 mt-0.5" /> : <CheckCircle className="w-5 h-5 mt-0.5" />}
    <div className="flex-1">{children}</div>
    {onClose && <button onClick={onClose} className="opacity-70 hover:opacity-100">×</button>}
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// --- Landing Page Component ---
const LandingPage = ({ onGetStarted }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden">
      <div className="md:flex">
        <div className="md:w-1/2 p-8 md:p-12">
          <div className="flex items-center gap-3 mb-6">
            <FolderKanban className="w-10 h-10 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">ProjectFlow</h1>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Streamline Your Team's Workflow</h2>
          <p className="text-gray-600 mb-8">
            A modern project management platform designed for teams to collaborate, track progress, and deliver projects on time.
          </p>
          <button
            onClick={onGetStarted}
            className="w-full md:w-auto px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            Get Started Free
          </button>
        </div>
        <div className="md:w-1/2 bg-gradient-to-br from-indigo-500 to-purple-600 p-12 flex items-center justify-center">
          <div className="text-white text-center">
            <Users className="w-20 h-20 mx-auto mb-6 opacity-90" />
            <h3 className="text-2xl font-bold mb-4">Collaborate Efficiently</h3>
            <p className="opacity-90">Invite team members, assign tasks, and track progress in real-time.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// --- Login Page Component ---
const LoginPage = ({ onLogin, onShowSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.login({ email, password });
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
            <FolderKanban className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="you@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <button 
              onClick={onShowSignup} 
              className="text-indigo-600 font-semibold hover:text-indigo-700"
            >
              Create one
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// --- Signup Page Component ---
const SignupPage = ({ onBack, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    company_name: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.post('/auth/admin', formData, true);
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-600 mt-2">Start your free trial today</p>
        </div>

        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={onBack} 
            className="text-indigo-600 font-semibold hover:text-indigo-700"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Accept Invite Page ---
const AcceptInvitePage = ({ token, onSuccess }) => {
  const [formData, setFormData] = useState({ name: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Clear any existing tokens when on accept invite page
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.post(`/invite/accept/${token}`, formData, true);
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      setIsLoggedIn(true);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // If somehow we're logged in already, show success message
  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invitation Accepted!</h2>
          <p className="text-gray-600">You can now access the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Accept Invitation</h1>
          <p className="text-gray-600 mt-2">Complete your profile to join</p>
        </div>

        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Accepting...' : 'Accept Invitation'}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- View Components ---
const ProjectsList = ({ 
  projects, 
  search, 
  setSearch, 
  onSearchChange, 
  onProjectClick, 
  onCreateProject, 
  currentUser 
}) => (
  <div className="space-y-6">
    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
      <div className="relative w-full md:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text" 
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
          onKeyUp={(e) => e.key === 'Enter' && onSearchChange()}
          placeholder="Search projects..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>
      {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
        <button 
          onClick={onCreateProject} 
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
        >
          <Plus className="w-5 h-5" /> New Project
        </button>
      )}
    </div>

    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map(project => (
        <div 
          key={project.id} 
          onClick={() => onProjectClick(project)} 
          className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition">
              <Briefcase className="w-6 h-6" />
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded uppercase">
              {project.status || 'Active'}
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{project.name}</h3>
          <p className="text-gray-600 text-sm line-clamp-2 mb-4">{project.description}</p>
          <div className="flex items-center gap-2 text-indigo-600 text-sm font-semibold">
            View Details <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ProjectDetail = ({ project, tasks, members, currentUser, onBack, onRefresh, setAlert }) => {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', status: 'todo' });

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/projects/${project.id}/task`, newTask);
      setNewTask({ title: '', description: '', status: 'todo' });
      setShowTaskModal(false);
      onRefresh();
    } catch (err) { 
      setAlert({ type: 'error', message: err.message }); 
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      onRefresh();
    } catch (err) { 
      setAlert({ type: 'error', message: err.message }); 
    }
  };

  return (
    <div className="space-y-6">
      <button 
        onClick={onBack} 
        className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </button>

      <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">{project.name}</h2>
            <p className="text-gray-600 mt-2">{project.description}</p>
          </div>
          <button 
            onClick={() => setShowTaskModal(true)} 
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {['todo', 'in-progress', 'completed'].map(status => (
            <div key={status} className="bg-gray-50 p-4 rounded-xl">
              <h4 className="text-sm font-bold text-gray-500 uppercase mb-4 px-2">
                {status.replace('-', ' ')}
              </h4>
              <div className="space-y-3">
                {tasks.filter(t => t.status === status).map(task => (
                  <div key={task.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <h5 className="font-semibold text-gray-900">{task.title}</h5>
                    <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                    <select 
                      value={task.status} 
                      onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                      className="mt-3 w-full text-xs border-none bg-gray-50 rounded p-1"
                    >
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} title="Create New Task">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <input 
            className="w-full p-2 border rounded" 
            placeholder="Task Title" 
            required
            value={newTask.title} 
            onChange={e => setNewTask({...newTask, title: e.target.value})}
          />
          <textarea 
            className="w-full p-2 border rounded" 
            placeholder="Description"
            value={newTask.description} 
            onChange={e => setNewTask({...newTask, description: e.target.value})}
          />
          <button className="w-full bg-indigo-600 text-white py-2 rounded font-bold">
            Create Task
          </button>
        </form>
      </Modal>
    </div>
  );
};

// --- Create Project Modal ---
const CreateProjectModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/projects/', formData);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create New Project">
      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            rows="3"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// --- Invite Users Component ---
const InviteUsers = ({ setAlert }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/invite/', { email, role });
      setAlert({ type: 'success', message: `Invitation sent to ${email}` });
      setEmail('');
    } catch (err) { 
      setAlert({ type: 'error', message: err.message }); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Send className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold">Invite Team Member</h2>
        <p className="text-gray-600">They will receive an email with a setup link.</p>
      </div>
      <form onSubmit={handleInvite} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email Address</label>
          <input 
            type="email" 
            required 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <select 
            value={role} 
            onChange={e => setRole(e.target.value)} 
            className="w-full p-3 border rounded-lg"
          >
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button 
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Invitation'}
        </button>
      </form>
    </div>
  );
};

// --- Main Dashboard ---
const Dashboard = () => {
  const [view, setView] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [search, setSearch] = useState('');
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    loadCurrentUser();
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadTasks();
      loadMembers();
    }
  }, [selectedProject]);

  const loadCurrentUser = async () => {
    try {
      const user = await api.post('/me', {});
      setCurrentUser(user);
    } catch (err) {
      console.error('Failed to load user:', err);
    }
  };

  const loadProjects = async () => {
    try {
      const data = await api.get(`/projects?search=${search}`);
      setProjects(data || []);
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const loadTasks = async () => {
    try {
      const data = await api.get(`/projects/${selectedProject.id}/task`);
      setTasks(data || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  };

  const loadMembers = async () => {
    try {
      const data = await api.get(`/projects/${selectedProject.id}/members`);
      setMembers(data || []);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      await api.post('/auth/logout', { refresh_token: refreshToken });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleSearchChange = () => {
    loadProjects();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <FolderKanban className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Project Manager</h1>
          </div>

          <div className="flex items-center gap-4">
            {currentUser && (
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{currentUser.name}</p>
                <p className="text-xs text-gray-500 capitalize">{currentUser.role}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {alert && (
          <Alert type={alert.type} onClose={() => setAlert(null)}>
            {alert.message}
          </Alert>
        )}

        {/* Navigation */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => { setView('projects'); setSelectedProject(null); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
              view === 'projects' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FolderKanban className="w-5 h-5" />
            Projects
          </button>
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setView('invites')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
                view === 'invites' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <UserPlus className="w-5 h-5" />
              Invite Users
            </button>
          )}
        </div>

        {/* Content */}
        {view === 'projects' && !selectedProject && (
          <ProjectsList
            projects={projects}
            search={search}
            setSearch={setSearch}
            onSearchChange={handleSearchChange}
            onProjectClick={setSelectedProject}
            onCreateProject={() => setShowModal('createProject')}
            currentUser={currentUser}
          />
        )}

        {view === 'projects' && selectedProject && (
          <ProjectDetail
            project={selectedProject}
            tasks={tasks}
            members={members}
            currentUser={currentUser}
            onBack={() => { setSelectedProject(null); loadProjects(); }}
            onRefresh={() => { loadTasks(); loadMembers(); }}
            setAlert={setAlert}
          />
        )}

        {view === 'invites' && (
          <InviteUsers setAlert={setAlert} />
        )}
      </div>

      {/* Modals */}
      {showModal === 'createProject' && (
        <CreateProjectModal
          onClose={() => setShowModal(null)}
          onSuccess={() => {
            setShowModal(null);
            loadProjects();
            setAlert({ type: 'success', message: 'Project created successfully!' });
          }}
        />
      )}
    </div>
  );
};

// --- App Entry Point ---
export default function App() {
  const [screen, setScreen] = useState('landing');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);

  // Check for authentication and invite token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite_token') || params.get('token');
    
    if (token) {
      // Clear any existing tokens when arriving via invite link
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setInviteToken(token);
      setScreen('accept-invite');
      setIsLoggedIn(false);
    } else {
      // Normal authentication check
      const hasToken = !!localStorage.getItem('access_token');
      setIsLoggedIn(hasToken);
    }
  }, []);

  // Check if user has token but hasn't accepted invite
  useEffect(() => {
    if (isLoggedIn && inviteToken) {
      // Clear invite token from URL if user is logged in
      window.history.replaceState({}, '', window.location.pathname);
      setInviteToken(null);
    }
  }, [isLoggedIn, inviteToken]);

  // Show accept invite page if we have an invite token and user is not logged in
  if (inviteToken && !isLoggedIn) {
    return <AcceptInvitePage token={inviteToken} onSuccess={() => {
      setIsLoggedIn(true);
      // Clear the token from URL after successful acceptance
      window.history.replaceState({}, '', '/');
      setInviteToken(null);
    }} />;
  }

  // Show dashboard if user is logged in
  if (isLoggedIn) {
    return <Dashboard />;
  }

  // Show authentication screens
  switch (screen) {
    case 'landing': 
      return <LandingPage onGetStarted={() => setScreen('login')} />;
    case 'login': 
      return <LoginPage onLogin={() => setIsLoggedIn(true)} onShowSignup={() => setScreen('signup')} />;
    case 'signup': 
      return <SignupPage onBack={() => setScreen('login')} onSuccess={() => setIsLoggedIn(true)} />;
    case 'accept-invite':
      // This should be handled above, but as a fallback
      return <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Invalid Invitation</h2>
          <p className="text-gray-600 mt-2">Please check your invitation link.</p>
        </div>
      </div>;
    default: 
      return <LandingPage onGetStarted={() => setScreen('login')} />;
  }
}