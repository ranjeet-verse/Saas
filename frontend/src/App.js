import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Users, FolderKanban, Plus, LogOut, UserPlus, Trash2, Edit, Search, MoreVertical, Eye, Calendar, Clock, Target, ChevronRight } from 'lucide-react';

// API Configuration
const API_BASE = 'http://localhost:8000';

// Utility Functions
const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('access_token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (token && !options.skipAuth) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

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
    const response = await this.request(endpoint);
    return response.json();
  },

  async post(endpoint, data, skipAuth = false) {
    const response = await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || JSON.stringify(error));
    }
    
    return response.json();
  },

  async put(endpoint, data) {
    const response = await this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.json();
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
        password: formData.password,
      }),
    });
    
    if (!response.ok) throw new Error('Invalid credentials');
    return response.json();
  },
};

// Alert Component
const Alert = ({ type, children, onClose }) => (
  <div className={`p-4 rounded-lg mb-4 flex items-start gap-3 ${
    type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
  }`}>
    {type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
    <div className="flex-1">{children}</div>
    {onClose && (
      <button onClick={onClose} className="text-current opacity-70 hover:opacity-100">×</button>
    )}
  </div>
);

// Login Component
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
            <button onClick={onShowSignup} className="text-indigo-600 font-semibold hover:text-indigo-700">
              Create one
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// Signup Component
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
          <button onClick={onBack} className="text-indigo-600 font-semibold hover:text-indigo-700">
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

// Accept Invite Page
const AcceptInvitePage = ({ token, onSuccess }) => {
  const [formData, setFormData] = useState({ name: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.post(`/invite/accept/${token}`, formData, true);
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

// Main Dashboard
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
      console.error(err);
    }
  };

  const loadProjects = async () => {
    try {
      const data = await api.get(`/projects?search=${search}`);
      setProjects(data);
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const loadTasks = async () => {
    try {
      const data = await api.get(`/projects/${selectedProject.id}/task`);
      setTasks(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMembers = async () => {
    try {
      const data = await api.get(`/projects/${selectedProject.id}/members`);
      setMembers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      await api.post('/auth/logout', { refresh_token: refreshToken });
    } catch (err) {
      console.error(err);
    } finally {
      localStorage.clear();
      window.location.reload();
    }
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
            onSearchChange={loadProjects}
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
          <InviteUsers setAlert={setAlert} currentUser={currentUser} />
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

// Projects List Component
const ProjectsList = ({ projects, search, setSearch, onSearchChange, onProjectClick, onCreateProject, currentUser }) => (
  <div>
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-gray-900">Your Projects</h2>
      <button
        onClick={onCreateProject}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
      >
        <Plus className="w-5 h-5" />
        New Project
      </button>
    </div>

    <div className="mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyUp={(e) => e.key === 'Enter' && onSearchChange()}
          placeholder="Search projects..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <div
          key={project.id}
          onClick={() => onProjectClick(project)}
          className="bg-white rounded-xl shadow-sm hover:shadow-md transition cursor-pointer border border-gray-200 p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{project.name}</h3>
              <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-semibold text-gray-900">{project.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{ width: `${project.progress}%` }}
              />
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{new Date(project.start_date).toLocaleDateString()}</span>
              </div>
              {project.end_date && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Target className="w-4 h-4" />
                  <span>{new Date(project.end_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>

    {projects.length === 0 && (
      <div className="text-center py-12">
        <FolderKanban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">No projects found</p>
        <p className="text-gray-400 text-sm mt-2">Create your first project to get started</p>
      </div>
    )}
  </div>
);

// Project Detail Component
const ProjectDetail = ({ project, tasks, members, currentUser, onBack, onRefresh, setAlert }) => {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await api.delete(`/projects/${project.id}/task/${taskId}`);
      onRefresh();
      setAlert({ type: 'success', message: 'Task deleted successfully' });
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const tasksByStatus = {
    pending: tasks.filter(t => t.status === 'pending'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    completed: tasks.filter(t => t.status === 'completed'),
  };

  const userRole = members.find(m => m.user_id === currentUser?.id)?.role;
  const canEdit = userRole === 'owner' || userRole === 'editor';
  const canDelete = userRole === 'owner';

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
        ← Back to Projects
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{project.name}</h2>
            <p className="text-gray-600">{project.description}</p>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <button
                onClick={() => setShowTaskModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => setShowMemberModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <UserPlus className="w-4 h-4" />
                Add Member
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Progress</p>
            <p className="text-2xl font-bold text-gray-900">{project.progress}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Tasks</p>
            <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Team Members</p>
            <p className="text-2xl font-bold text-gray-900">{members.length}</p>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {Object.entries({ pending: 'To Do', in_progress: 'In Progress', completed: 'Completed' }).map(([status, label]) => (
          <div key={status} className="bg-gray-100 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center justify-between">
              {label}
              <span className="text-sm bg-white px-2 py-1 rounded-full">{tasksByStatus[status].length}</span>
            </h3>
            <div className="space-y-3">
              {tasksByStatus[status].map(task => (
                <div key={task.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{task.title}</h4>
                    {canEdit && (
                      <button onClick={() => setEditingTask(task)} className="text-gray-400 hover:text-gray-600">
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className={`px-2 py-1 rounded-full ${
                      task.priority === 'high' ? 'bg-red-100 text-red-700' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {task.priority}
                    </span>
                    {task.due_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="mt-3 w-full text-xs text-red-600 hover:text-red-700 flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Team Members */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Team Members
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(member => (
            <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-indigo-600 font-semibold">
                  {member.user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{member.user?.name || 'User'}</p>
                <p className="text-xs text-gray-500 capitalize">{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showTaskModal && (
        <TaskModal
          projectId={project.id}
          onClose={() => setShowTaskModal(false)}
          onSuccess={() => {
            setShowTaskModal(false);
            onRefresh();
            setAlert({ type: 'success', message: 'Task created successfully' });
          }}
        />
      )}

      {editingTask && (
        <TaskModal
          projectId={project.id}
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSuccess={() => {
            setEditingTask(null);
            onRefresh();
            setAlert({ type: 'success', message: 'Task updated successfully' });
          }}
        />
      )}

      {showMemberModal && (
        <AddMemberModal
          projectId={project.id}
          tenantId={currentUser.tenant_id}
          onClose={() => setShowMemberModal(false)}
          onSuccess={() => {
            setShowMemberModal(false);
            onRefresh();
            setAlert({ type: 'success', message: 'Member added successfully' });
          }}
        />
      )}
    </div>
  );
};

// Create Project Modal
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Create New Project</h3>
        
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
      </div>
    </div>
  );
};

// Task Modal
const TaskModal = ({ projectId, task, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'pending',
    priority: task?.priority || 'medium',
    due_date: task?.due_date ? task.due_date.split('T')[0] : '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (task) {
        await api.put(`/projects/${projectId}/task/${task.id}`, formData);
      } else {
        await api.post(`/projects/${projectId}/task`, formData);
      }
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {task ? 'Edit Task' : 'Create New Task'}
        </h3>
        
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows="3"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="pending">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
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
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add Member Modal
const AddMemberModal = ({ projectId, tenantId, onClose, onSuccess }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [role, setRole] = useState('viewer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // In a real app, you'd fetch users from your tenant
    // For now, we'll just show the form
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post(`/projects/${projectId}/members`, {
        user_id: parseInt(selectedUser),
        role,
      });
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Add Team Member</h3>
        
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
            <input
              type="number"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter user ID"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Enter the ID of the user you want to add</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="owner">Owner</option>
            </select>
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
              {loading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Invite Users Component
const InviteUsers = ({ setAlert, currentUser }) => {
  const [formData, setFormData] = useState({ email: '', role: 'viewer' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/invite/', formData);
      console.log('Invite response:', response);
      setAlert({ type: 'success', message: 'Invitation sent successfully! Check console for invite link.' });
      setFormData({ email: '', role: 'viewer' });
    } catch (err) {
      console.error('Invite error:', err);
      setError(err.message);
      setAlert({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Invite Team Members</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="colleague@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="viewer">Viewer - Can view projects and tasks</option>
              <option value="editor">Editor - Can create and edit projects</option>
              <option value="admin">Admin - Full access to everything</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Sending Invitation...' : 'Send Invitation'}
          </button>
        </form>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> An invitation email will be sent to the user with a link to join your organization. 
            The invitation will expire in 7 days.
          </p>
        </div>
      </div>
    </div>
  );
};

// Main App Component
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState('login');
  const [inviteToken, setInviteToken] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsAuthenticated(true);
    }

    // Check for invite token in URL
    const params = new URLSearchParams(window.location.search);
    const token_param = params.get('token');
    if (token_param) {
      setInviteToken(token_param);
      setView('accept-invite');
    }
  }, []);

  if (inviteToken && view === 'accept-invite') {
    return (
      <AcceptInvitePage
        token={inviteToken}
        onSuccess={() => {
          setIsAuthenticated(true);
          window.history.replaceState({}, '', '/');
        }}
      />
    );
  }

  if (!isAuthenticated) {
    if (view === 'signup') {
      return (
        <SignupPage
          onBack={() => setView('login')}
          onSuccess={() => setIsAuthenticated(true)}
        />
      );
    }
    return (
      <LoginPage
        onLogin={() => setIsAuthenticated(true)}
        onShowSignup={() => setView('signup')}
      />
    );
  }

  return <Dashboard />;
}