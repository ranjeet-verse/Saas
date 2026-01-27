import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, CheckCircle, Users, FolderKanban, Plus, LogOut, UserPlus, 
  Trash2, Edit, Search, MoreVertical, Eye, Calendar, Clock, Target, 
  ChevronRight, Zap, Shield, BarChart3, Menu, X, Briefcase, ArrowLeft, Send,
  Loader2, Mail, User, Settings, LogIn, Home, Play, Grid, List
} from 'lucide-react';

// --- API Configuration ---
const API_BASE = 'http://localhost:8000';

const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('access_token');
    const headers = { 
      'Content-Type': 'application/json', 
      ...options.headers 
    };
    
    if (token && !options.skipAuth) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, { 
        ...options, 
        headers 
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
            console.error('Refresh token error:', e);
          }
        }
        localStorage.clear();
        window.location.href = '/';
        return null;
      }
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || `Request failed with status ${response.status}`);
      }
      
      return response;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  },

  async get(endpoint) { 
    try {
      const r = await this.request(endpoint); 
      if (r.status === 204) return null;
      const data = await r.json();
      return data || [];
    } catch (error) {
      console.error('GET Error:', error);
      throw error;
    }
  },

  async post(endpoint, data, skipAuth = false) {
    try {
      const r = await this.request(endpoint, { 
        method: 'POST', 
        body: JSON.stringify(data), 
        skipAuth 
      });
      if (r.status === 204) return null;
      return r.json();
    } catch (error) {
      console.error('POST Error:', error);
      throw error;
    }
  },

  async put(endpoint, data) { 
    try {
      const r = await this.request(endpoint, { 
        method: 'PUT', 
        body: JSON.stringify(data) 
      }); 
      if (r.status === 204) return null;
      return r.json();
    } catch (error) {
      console.error('PUT Error:', error);
      throw error;
    }
  },

  async delete(endpoint) { 
    try {
      await this.request(endpoint, { method: 'DELETE' });
    } catch (error) {
      console.error('DELETE Error:', error);
      throw error;
    }
  },

  async login(formData) {
    try {
      const form = new URLSearchParams();
      form.append('username', formData.email);
      form.append('password', formData.password);
      
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Invalid credentials');
      }
      
      return response.json();
    } catch (error) {
      console.error('Login Error:', error);
      throw error;
    }
  }
};

// --- Reusable UI Components ---
const Alert = ({ type, children, onClose }) => (
  <div className={`p-4 rounded-lg mb-4 flex items-start gap-3 ${
    type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 
    type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 
    'bg-blue-50 text-blue-800 border border-blue-200'
  }`}>
    {type === 'error' ? <AlertCircle className="w-5 h-5 mt-0.5" /> : 
     type === 'success' ? <CheckCircle className="w-5 h-5 mt-0.5" /> : 
     <AlertCircle className="w-5 h-5 mt-0.5" />}
    <div className="flex-1">{children}</div>
    {onClose && (
      <button 
        onClick={onClose} 
        className="opacity-70 hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
);

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${sizeClasses[size]} overflow-hidden animate-slideUp`}>
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const Button = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const baseClasses = 'font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
  };
  
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5',
    lg: 'px-6 py-3 text-lg',
  };
  
  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '', ...props }) => (
  <div 
    className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}
    {...props}
  >
    {children}
  </div>
);

// --- Loading Components ---
const LoadingSpinner = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };
  
  return (
    <Loader2 className={`${sizeClasses[size]} animate-spin text-indigo-600`} />
  );
};

const LoadingOverlay = () => (
  <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-3 text-gray-600">Loading...</p>
    </div>
  </div>
);

// --- Landing Page ---
const LandingPage = ({ onGetStarted }) => (
  <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
    {/* Navigation */}
    <nav className="px-6 py-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderKanban className="w-8 h-8 text-indigo-600" />
          <span className="text-xl font-bold text-gray-900">ProjectFlow</span>
        </div>
        <Button onClick={onGetStarted} variant="primary">
          Get Started
        </Button>
      </div>
    </nav>

    {/* Hero Section */}
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Streamline Your Team's
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            Project Workflow
          </span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
          A modern project management platform designed for teams to collaborate, 
          track progress, and deliver projects on time with ease.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={onGetStarted} 
            variant="primary" 
            size="lg"
            className="px-8"
          >
            Start Free Trial
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            className="px-8"
          >
            <Play className="w-5 h-5 mr-2" />
            Watch Demo
          </Button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="mt-20 grid md:grid-cols-3 gap-8">
        {[
          { icon: Users, title: 'Team Collaboration', desc: 'Invite team members and work together seamlessly' },
          { icon: FolderKanban, title: 'Project Tracking', desc: 'Visualize progress with interactive boards' },
          { icon: BarChart3, title: 'Analytics', desc: 'Get insights into team performance and project health' },
        ].map((feature, idx) => (
          <Card key={idx} className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <feature.icon className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
            <p className="text-gray-600">{feature.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

// --- Login Page ---
const LoginPage = ({ onLogin, onShowSignup }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.login(formData);
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      onLogin();
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
            <LogIn className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600 mt-2">Sign in to continue to ProjectFlow</p>
        </div>

        {error && (
          <Alert type="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="you@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="••••••••"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            className="w-full"
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <button
              onClick={onShowSignup}
              className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
            >
              Create one
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
};

// --- Signup Page ---
const SignupPage = ({ onBack, onSuccess }) => {
  const [formData, setFormData] = useState({
    company_name: '',
    name: '',
    email: '',
    password: ''
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
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-600 mt-2">Start your free trial today</p>
        </div>

        {error && (
          <Alert type="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="Your Company"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="you@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="••••••••"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            className="w-full"
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onBack}
            className="flex items-center justify-center gap-2 text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </button>
        </div>
      </Card>
    </div>
  );
};

// --- Accept Invite Page ---
const AcceptInvitePage = ({ token, onSuccess }) => {
  const [formData, setFormData] = useState({ 
    name: '', 
    password: '' 
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteData, setInviteData] = useState(null);
  const [loadingInvite, setLoadingInvite] = useState(true);

  useEffect(() => {
    // Clear any existing tokens when on accept invite page
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // Verify the invitation token is valid
    verifyInvitationToken();
  }, [token]);

  const verifyInvitationToken = async () => {
    try {
      // Since there's no endpoint to verify token, we'll try to accept it with dummy data
      // to see if it's valid. In a real app, you'd have a GET endpoint like /invite/verify/{token}
      setLoadingInvite(true);
      
      // For now, we'll just set the invite data
      setInviteData({
        email: 'pending@example.com',
        company: 'Your Company'
      });
    } catch (err) {
      console.error('Failed to verify invitation:', err);
      setError('Invalid or expired invitation token');
    } finally {
      setLoadingInvite(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.post(`/invite/accept/${token}`, formData, true);
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      
      // Show success message for 2 seconds before redirecting
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to accept invitation. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingInvite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Verifying your invitation...</p>
        </Card>
      </div>
    );
  }

  if (error && error.includes('Invalid')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h2>
          <p className="text-gray-600 mb-4">This invitation link is invalid or has expired.</p>
          <Button
            onClick={() => window.location.href = '/'}
            variant="primary"
          >
            Return to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
            <UserPlus className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Join the Team</h1>
          <p className="text-gray-600 mt-2">You've been invited! Complete your profile to get started</p>
        </div>

        {error && (
          <Alert type="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="Enter your name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="Create a password"
              required
              minLength={8}
            />
            <p className="text-xs text-gray-500 mt-1">Password must be at least 8 characters long</p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            className="w-full"
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Accept Invitation & Join'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            By accepting, you agree to join the organization
          </p>
        </div>
      </Card>
    </div>
  );
};

// --- Projects List Component ---
const ProjectsList = ({ 
  projects, 
  search, 
  setSearch, 
  onSearch, 
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
          onKeyUp={(e) => e.key === 'Enter' && onSearch()}
          placeholder="Search projects by name or description..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition outline-none"
        />
      </div>
      
      {(currentUser?.role === 'admin' || currentUser?.role === 'owner') && (
        <Button 
          onClick={onCreateProject} 
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      )}
    </div>

    {!projects || projects.length === 0 ? (
      <Card className="p-8 text-center">
        <FolderKanban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">No projects found</h3>
        <p className="text-gray-600 mb-4">
          {search ? 'Try a different search term' : 'Get started by creating your first project'}
        </p>
        {(currentUser?.role === 'admin' || currentUser?.role === 'owner') && (
          <Button onClick={onCreateProject} variant="primary">
            Create Project
          </Button>
        )}
      </Card>
    ) : (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => (
          <Card 
            key={project.id} 
            className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-indigo-100"
            onClick={() => onProjectClick(project)}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                <Briefcase className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  project.progress === 100 ? 'bg-green-500' : 
                  project.progress > 50 ? 'bg-blue-500' : 
                  'bg-yellow-500'
                }`} />
                <span className="text-xs font-medium text-gray-500">
                  {project.progress || 0}% complete
                </span>
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2 truncate">
              {project.name}
            </h3>
            <p className="text-gray-600 text-sm line-clamp-2 mb-4">
              {project.description}
            </p>
            
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-indigo-600 text-sm font-semibold group">
                View Details
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    )}
  </div>
);

// --- Project Detail Component ---
const ProjectDetail = ({ 
  project, 
  tasks = [], 
  members = [], 
  currentUser, 
  onBack, 
  onRefresh, 
  setAlert 
}) => {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newTask, setNewTask] = useState({ 
    title: '', 
    description: '', 
    status: 'todo',
    priority: 'medium'
  });
  const [newMember, setNewMember] = useState({ user_id: '', role: 'viewer' });
  const [loading, setLoading] = useState(false);

  // Load available users when member modal opens
  useEffect(() => {
    if (showMemberModal && currentUser?.role === 'admin') {
      loadAvailableUsers();
    }
  }, [showMemberModal, currentUser]);

const loadAvailableUsers = async () => {
  setLoadingUsers(true);
  try {
    // Use the new endpoint to get all users in the tenant
    const users = await api.get('/user');
    
    // Filter out current user and users already in the project
    const available = users.filter(user => 
      user.id !== currentUser.id && 
      !currentMemberIds.includes(user.id)
    );
    
    setAvailableUsers(available);
    
  } catch (err) {
    console.error('Failed to load users:', err);
    setAlert({ type: 'error', message: 'Failed to load available users' });
  } finally {
    setLoadingUsers(false);
  }
};

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await api.post(`/projects/${project.id}/task`, newTask);
      setAlert({ 
        type: 'success', 
        message: 'Task created successfully!' 
      });
      setNewTask({ title: '', description: '', status: 'todo', priority: 'medium' });
      setShowTaskModal(false);
      await onRefresh(); // Refresh project data to update progress
    } catch (err) { 
      setAlert({ type: 'error', message: err.message }); 
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    
    if (!newMember.user_id) {
      setAlert({ type: 'error', message: 'Please select a user' });
      return;
    }
    
    setLoading(true);
    
    try {
      await api.post(`/projects/${project.id}/members`, newMember);
      setAlert({ 
        type: 'success', 
        message: 'Member added successfully!' 
      });
      setNewMember({ user_id: '', role: 'viewer' });
      setShowMemberModal(false);
      onRefresh();
    } catch (err) { 
      if (err.message.includes('409') || err.message.includes('Conflict')) {
        setAlert({ 
          type: 'error', 
          message: 'This user is already a member of this project' 
        });
      } else {
        setAlert({ type: 'error', message: err.message }); 
      }
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      // Get the specific task first
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (!taskToUpdate) {
        throw new Error('Task not found');
      }

      // Update the task status
      await api.put(`/projects/${project.id}/task/${taskId}`, {
        title: taskToUpdate.title,
        description: taskToUpdate.description,
        status: newStatus,
        priority: taskToUpdate.priority
      });
      
      setAlert({ 
        type: 'success', 
        message: 'Task status updated!' 
      });
      
      // After updating task status, refresh project data to update progress
      await onRefresh();
      
    } catch (err) { 
      setAlert({ type: 'error', message: err.message }); 
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await api.delete(`/projects/${project.id}/task/${taskId}`);
      setAlert({ type: 'success', message: 'Task deleted successfully!' });
      await onRefresh(); // Refresh project data to update progress
    } catch (err) { 
      setAlert({ type: 'error', message: err.message }); 
    }
  };

  const removeMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member from the project?')) return;
    
    try {
      // Note: You need to create a DELETE endpoint for project members in your backend
      // Example: DELETE /projects/{project_id}/members/{member_id}
      console.log('Need to create DELETE endpoint for project members');
      setAlert({ 
        type: 'error', 
        message: 'Member removal not implemented in backend yet' 
      });
    } catch (err) { 
      setAlert({ type: 'error', message: err.message }); 
    }
  };

  const columns = {
    todo: { title: 'To Do', color: 'bg-gray-50', text: 'text-gray-700' },
    'in-progress': { title: 'In Progress', color: 'bg-blue-50', text: 'text-blue-700' },
    done: { title: 'Done', color: 'bg-green-50', text: 'text-green-700' }
  };

  // Ensure tasks is always an array
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  
  // Get current member IDs to filter them out from available users
  const currentMemberIds = members.map(m => m.user_id);

  return (
    <div className="space-y-6">
      <Button 
        onClick={onBack} 
        variant="outline"
        className="flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </Button>

      {/* Project Header */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{project.name}</h2>
            <p className="text-gray-600">{project.description}</p>
          </div>
          
          <div className="flex gap-3">
            {currentUser?.role === 'admin' && (
              <Button 
                onClick={() => setShowMemberModal(true)}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add Member
              </Button>
            )}
            
            {(currentUser?.role === 'admin' || currentUser?.role === 'owner' || currentUser?.role === 'editor') && (
              <Button 
                onClick={() => setShowTaskModal(true)}
                variant="primary"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-bold text-indigo-600">{project.progress || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${project.progress || 0}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Progress updates automatically when tasks are marked as done
          </p>
        </div>
      </Card>

      {/* Task Board */}
      <div className="grid md:grid-cols-3 gap-6">
        {Object.entries(columns).map(([status, config]) => {
          const statusTasks = safeTasks.filter(task => task.status === status);
          
          return (
            <div key={status} className={`${config.color} p-4 rounded-xl`}>
              <div className={`${config.text} text-sm font-bold uppercase mb-4 px-2`}>
                {config.title} ({statusTasks.length})
              </div>
              <div className="space-y-3">
                {statusTasks.map(task => (
                  <Card key={task.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-semibold text-gray-900">{task.title}</h5>
                      <div className="flex gap-1">
                        {(currentUser?.role === 'admin' || currentUser?.role === 'owner') && (
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-1 hover:bg-red-50 rounded text-red-600 transition-colors"
                            title="Delete task"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        task.priority === 'high' ? 'bg-red-100 text-red-800' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {task.priority || 'medium'}
                      </span>
                      
                      <select 
                        value={task.status} 
                        onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                        disabled={!(currentUser?.role === 'admin' || currentUser?.role === 'owner' || currentUser?.role === 'editor')}
                      >
                        <option value="todo">To Do</option>
                        <option value="in-progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                  </Card>
                ))}
                
                {statusTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-sm">No tasks here yet</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Statistics */}
      {safeTasks.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Task Statistics</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{safeTasks.filter(t => t.status === 'todo').length}</div>
              <div className="text-sm text-gray-600">To Do</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-900">{safeTasks.filter(t => t.status === 'in-progress').length}</div>
              <div className="text-sm text-blue-600">In Progress</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-900">{safeTasks.filter(t => t.status === 'done').length}</div>
              <div className="text-sm text-green-600">Done</div>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            <p>Project progress is calculated based on completed tasks. Mark tasks as "done" to increase progress.</p>
          </div>
        </Card>
      )}

      {/* Project Members */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">Team Members ({members.length})</h3>
          {currentUser?.role === 'admin' && members.length > 0 && (
            <button
              onClick={() => setShowMemberModal(true)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              + Add Member
            </button>
          )}
        </div>
        
        {members && members.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map(member => (
              <div key={member.id || member.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{member.user?.name || 'Team Member'}</div>
                    <div className="text-sm text-gray-500 capitalize">{member.role}</div>
                  </div>
                </div>
                
                {currentUser?.role === 'admin' && member.user_id !== currentUser.id && (
                  <button
                    onClick={() => removeMember(member.id)}
                    className="p-1 hover:bg-red-50 rounded text-red-600 transition-colors"
                    title="Remove member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No team members yet</p>
            <p className="text-sm mt-1">Add team members to collaborate on this project</p>
            {currentUser?.role === 'admin' && (
              <Button
                onClick={() => setShowMemberModal(true)}
                variant="primary"
                size="sm"
                className="mt-3"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add First Member
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Modals */}
      <Modal 
        isOpen={showTaskModal} 
        onClose={() => setShowTaskModal(false)} 
        title="Create New Task"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Title
            </label>
            <input
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask({...newTask, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter task title"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={newTask.description}
              onChange={(e) => setNewTask({...newTask, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows="3"
              placeholder="Enter task description"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={newTask.status}
                onChange={(e) => setNewTask({...newTask, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowTaskModal(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              className="flex-1"
              disabled={loading}
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Create Task'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={showMemberModal} 
        onClose={() => {
          setShowMemberModal(false);
          setNewMember({ user_id: '', role: 'viewer' });
        }} 
        title="Add Team Member"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Users must already be members of your organization before you can add them to projects.
                  Invite users first from the "Invite" tab if they're not already in your organization.
                </p>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select User
              </label>
              {loadingUsers ? (
                <div className="flex items-center justify-center p-4">
                  <LoadingSpinner />
                  <span className="ml-2 text-gray-600">Loading available users...</span>
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="p-4 border border-gray-300 rounded-lg text-center">
                  <p className="text-gray-600">No users available to add</p>
                  <p className="text-sm text-gray-500 mt-1">
                    All organization members are already in this project or you need to invite more users.
                  </p>
                </div>
              ) : (
                <select
                  value={newMember.user_id}
                  onChange={(e) => setNewMember({...newMember, user_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a user...</option>
                  {availableUsers
                    .filter(user => !currentMemberIds.includes(user.id))
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email}) - {user.role}
                      </option>
                    ))
                  }
                </select>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Only shows users who are not already members of this project
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role in Project
              </label>
              <select
                value={newMember.role}
                onChange={(e) => setNewMember({...newMember, role: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="viewer">Viewer (can only view)</option>
                <option value="editor">Editor (can edit tasks)</option>
                <option value="owner">Owner (full control)</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">
                <strong>Viewer:</strong> Can only view tasks<br />
                <strong>Editor:</strong> Can create and edit tasks<br />
                <strong>Owner:</strong> Full access including adding/removing members
              </p>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowMemberModal(false);
                  setNewMember({ user_id: '', role: 'viewer' });
                }}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="primary"
                className="flex-1"
                disabled={loading || !newMember.user_id}
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Add to Project'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

// --- Create Project Modal ---
const CreateProjectModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
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
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create New Project">
      {error && (
        <Alert type="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            placeholder="Enter project name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            rows="4"
            placeholder="Describe your project"
            required
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            className="flex-1"
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// --- Invite Users Component ---
const InviteUsers = ({ setAlert, onClose }) => {
  const [formData, setFormData] = useState({
    email: '',
    role: 'member'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await api.post('/invite/', formData);
      setAlert({ 
        type: 'success', 
        message: `Invitation sent to ${formData.email}` 
      });
      setFormData({ email: '', role: 'member' });
      if (onClose) onClose();
    } catch (err) { 
      setAlert({ type: 'error', message: err.message }); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Send className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Invite Team Member</h2>
        <p className="text-gray-600">They'll receive an email with a setup link</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input 
            type="email" 
            required 
            value={formData.email} 
            onChange={e => setFormData({...formData, email: e.target.value})} 
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            placeholder="colleague@company.com"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role
          </label>
          <select 
            value={formData.role} 
            onChange={e => setFormData({...formData, role: e.target.value})} 
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          >
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
          <p className="text-xs text-gray-500 mt-2">
            <strong>Admin:</strong> Full access including inviting users<br />
            <strong>Editor:</strong> Can create/edit projects and tasks<br />
            <strong>Viewer:</strong> Can only view content<br />
            <strong>Member:</strong> Basic access level
          </p>
        </div>
        
        <Button 
          type="submit"
          disabled={loading}
          variant="primary"
          className="w-full"
        >
          {loading ? <LoadingSpinner size="sm" /> : 'Send Invitation'}
        </Button>
      </form>
    </div>
  );
};

// --- Settings Page ---
const SettingsPage = ({ currentUser, setAlert }) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadUsers();
    }
  }, [currentUser]);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      // Note: You need to create a GET /users endpoint in your backend
      // For now, we'll show a placeholder
      setUsers([]);
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to load users' });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    setLoading(true);
    try {
      await api.delete(`/user/delete/${userId}`);
      setAlert({ type: 'success', message: 'User deleted successfully' });
      // Refresh users list
      setUsers(users.filter(user => user.id !== userId));
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <Card className="p-8 text-center">
        <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">You need admin privileges to access settings</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">User Management</h3>
        
        {isLoadingUsers ? (
          <div className="text-center py-8">
            <LoadingSpinner />
            <p className="mt-2 text-gray-600">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No users found</p>
            <p className="text-sm mt-1">Users will appear here once they join your organization</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email} • {user.role}</div>
                  </div>
                </div>
                
                {user.id !== currentUser.id && (
                  <Button
                    onClick={() => handleDeleteUser(user.id)}
                    variant="danger"
                    size="sm"
                    disabled={loading}
                  >
                    {loading ? <LoadingSpinner size="sm" /> : 'Remove'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

// --- Dashboard ---
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
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectData();
    }
  }, [selectedProject]);

  const initializeApp = async () => {
    try {
      await loadCurrentUser();
      await loadProjects();
    } catch (err) {
      console.error('Initialize App Error:', err);
      setAlert({ type: 'error', message: 'Failed to load data. Please refresh the page.' });
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const user = await api.post('/me', {});
      setCurrentUser(user);
    } catch (err) {
      console.error('Failed to load user:', err);
      setAlert({ type: 'error', message: 'Failed to load user data' });
      localStorage.clear();
      window.location.href = '/';
    }
  };

  const loadProjects = async () => {
    setIsLoadingData(true);
    try {
      const data = await api.get(`/projects?search=${search}`);
      setProjects(data || []);
    } catch (err) {
      console.error('Load Projects Error:', err);
      setAlert({ type: 'error', message: err.message || 'Failed to load projects' });
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadProjectData = async () => {
    if (!selectedProject) return;
    
    setIsLoadingData(true);
    try {
      const [tasksData, membersData] = await Promise.all([
        api.get(`/projects/${selectedProject.id}/task`).catch(() => []),
        api.get(`/projects/${selectedProject.id}/members`).catch(() => []),
      ]);
      
      // Ensure we always get arrays
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setMembers(Array.isArray(membersData) ? membersData : []);
    } catch (err) {
      console.error('Failed to load project data:', err);
      setAlert({ type: 'error', message: 'Failed to load project data' });
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleSearch = () => {
    loadProjects();
  };

  if (loading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Mobile Menu Button */}
            <div className="flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              
              <div className="flex items-center gap-3 ml-4">
                <FolderKanban className="w-8 h-8 text-indigo-600" />
                <h1 className="text-xl font-bold text-gray-900 hidden sm:block">
                  ProjectFlow
                </h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => { setView('projects'); setSelectedProject(null); }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  view === 'projects' && !selectedProject
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4" />
                  Projects
                </div>
              </button>
              
              {currentUser?.role === 'admin' && (
                <>
                  <button
                    onClick={() => setView('invites')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      view === 'invites'
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Invite
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setView('settings')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      view === 'settings'
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Settings
                    </div>
                  </button>
                </>
              )}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              {currentUser && (
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-semibold text-gray-900">{currentUser.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{currentUser.role}</p>
                </div>
              )}
              
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <button
                onClick={() => { 
                  setView('projects'); 
                  setSelectedProject(null); 
                  setMobileMenuOpen(false); 
                }}
                className={`w-full text-left px-3 py-2 rounded-md font-medium transition-colors ${
                  view === 'projects' && !selectedProject
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4" />
                  Projects
                </div>
              </button>
              
              {currentUser?.role === 'admin' && (
                <>
                  <button
                    onClick={() => { setView('invites'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-md font-medium transition-colors ${
                      view === 'invites'
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Invite Users
                    </div>
                  </button>
                  
                  <button
                    onClick={() => { setView('settings'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-md font-medium transition-colors ${
                      view === 'settings'
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Settings
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alert */}
        {alert && (
          <Alert type={alert.type} onClose={() => setAlert(null)}>
            {alert.message}
          </Alert>
        )}

        {/* Loading indicator for data */}
        {isLoadingData && (
          <div className="flex items-center justify-center p-4">
            <LoadingSpinner />
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        )}

        {/* Breadcrumb */}
        {selectedProject && (
          <div className="mb-6">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3">
                <li>
                  <button
                    onClick={() => { setSelectedProject(null); setView('projects'); }}
                    className="text-sm text-gray-700 hover:text-indigo-600 transition-colors"
                  >
                    Projects
                  </button>
                </li>
                <li>
                  <div className="flex items-center">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <span className="ml-1 text-sm font-medium text-gray-900">
                      {selectedProject.name}
                    </span>
                  </div>
                </li>
              </ol>
            </nav>
          </div>
        )}

        {/* Content */}
        {view === 'projects' && !selectedProject && (
          <ProjectsList
            projects={projects}
            search={search}
            setSearch={setSearch}
            onSearch={handleSearch}
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
            onBack={() => { 
              setSelectedProject(null); 
              loadProjects(); 
            }}
            onRefresh={async () => {
              await loadProjectData();
              // Also refresh projects list to update progress
              await loadProjects();
            }}
            setAlert={setAlert}
          />
        )}

        {view === 'invites' && (
          <Card className="p-6">
            <InviteUsers 
              setAlert={setAlert} 
              onClose={() => setView('projects')} 
            />
          </Card>
        )}

        {view === 'settings' && (
          <SettingsPage 
            currentUser={currentUser} 
            setAlert={setAlert} 
          />
        )}
      </main>

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

// --- Main App Component ---
export default function App() {
  const [screen, setScreen] = useState('landing');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    // Check for invite token in URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (token) {
      // Clear any existing tokens when we have an invite token
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setIsLoggedIn(false);
      setInviteToken(token);
      setIsLoading(false);
      
      // Clean URL but keep token for invitation acceptance
      const newUrl = window.location.pathname + '?token=' + token;
      window.history.replaceState({}, '', newUrl);
      return;
    }

    // Check for existing auth
    const hasToken = !!localStorage.getItem('access_token');
    setIsLoggedIn(hasToken);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show invite acceptance if token exists and user is not logged in
  if (inviteToken && !isLoggedIn) {
    return (
      <AcceptInvitePage 
        token={inviteToken} 
        onSuccess={() => {
          setIsLoggedIn(true);
          setInviteToken(null);
          // Clean URL after successful acceptance
          window.history.replaceState({}, '', '/');
        }} 
      />
    );
  }

  // Show dashboard if logged in
  if (isLoggedIn) {
    return <Dashboard />;
  }

  // Show authentication screens
  switch (screen) {
    case 'landing':
      return <LandingPage onGetStarted={() => setScreen('login')} />;
    case 'login':
      return (
        <LoginPage 
          onLogin={() => setIsLoggedIn(true)} 
          onShowSignup={() => setScreen('signup')} 
        />
      );
    case 'signup':
      return (
        <SignupPage 
          onBack={() => setScreen('login')} 
          onSuccess={() => setIsLoggedIn(true)} 
        />
      );
    default:
      return <LandingPage onGetStarted={() => setScreen('login')} />;
  }
}