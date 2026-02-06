import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const API_URL = 'http://localhost:8000';

// ======================== UTILITY FUNCTIONS ========================

const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('access_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            localStorage.setItem('access_token', data.access_token);
            return api.request(endpoint, options);
          }
        }
        localStorage.clear();
        window.location.href = '/';
        return null;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Request failed');
      }

      return response.status === 204 ? null : await response.json();
    } catch (error) {
      throw error;
    }
  },

  get(endpoint) {
    return this.request(endpoint);
  },

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },
};

// ======================== MAIN APP COMPONENT ========================

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [acceptInviteToken, setAcceptInviteToken] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Check for invite token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      setAcceptInviteToken(token);
    }
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const userData = await api.post('/me');
        setUser(userData);
      } catch (error) {
        localStorage.clear();
      }
    }
    setLoading(false);
  };

  const fetchUnreadCount = async () => {
    try {
      const data = await api.get('/messages/unread_count');
      if (data && typeof data.unread_count === 'number') {
        setUnreadCount(data.unread_count);
      } else {
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error loading unread messages count:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [user]);

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    localStorage.clear();
    setUser(null);
    setCurrentView('dashboard');
    setUnreadCount(0);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen 
        onLogin={setUser} 
        acceptInviteToken={acceptInviteToken}
        setAcceptInviteToken={setAcceptInviteToken}
      />
    );
  }

  return (
    <div className="app">
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        user={user}
        logout={logout}
        unreadCount={unreadCount}
      />
      <main className="main-content">
        {currentView === 'dashboard' && <DashboardView user={user} />}
        {currentView === 'projects' && <ProjectsView user={user} />}
        {currentView === 'messages' && (
          <MessagesView user={user} refreshUnreadCount={fetchUnreadCount} />
        )}
        {currentView === 'users' && user.role === 'admin' && <UsersView user={user} />}
        {currentView === 'invites' && user.role === 'admin' && <InvitesView user={user} />}
      </main>
    </div>
  );
}

// ======================== AUTH SCREEN ========================

function AuthScreen({ onLogin, acceptInviteToken, setAcceptInviteToken }) {
  const [isLogin, setIsLogin] = useState(!acceptInviteToken);
  const [isAcceptingInvite, setIsAcceptingInvite] = useState(!!acceptInviteToken);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    company_name: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (acceptInviteToken) {
      setIsAcceptingInvite(true);
      setIsLogin(false);
    }
  }, [acceptInviteToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const formBody = new URLSearchParams();
        formBody.append('username', formData.email);
        formBody.append('password', formData.password);

        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formBody,
        });

        if (!response.ok) throw new Error('Invalid credentials');

        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);

        const userData = await api.post('/me');
        onLogin(userData);
      } else if (isAcceptingInvite && acceptInviteToken) {
        // Accept Invite
        if (!formData.name || !formData.password) {
          throw new Error('Please fill in all fields');
        }

        if (formData.password.length < 8) {
          throw new Error('Password must be at least 8 characters long');
        }

        const data = await api.post(`/invite/accept/${acceptInviteToken}`, {
          name: formData.name,
          password: formData.password,
        });

        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        
        // Clear the invite token and URL
        setAcceptInviteToken(null);
        window.history.replaceState({}, document.title, '/');
        
        onLogin(data.user);
      } else {
        // Signup (Admin)
        const data = await api.post('/auth/admin', {
          company_name: formData.company_name,
          name: formData.name,
          email: formData.email,
          password: formData.password,
        });

        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);

        const userData = await api.post('/me');
        onLogin(userData);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo">🚀 SaaS Manager</div>
          <h1>
            {isAcceptingInvite
              ? 'Accept Your Invitation'
              : isLogin
              ? 'Welcome Back'
              : 'Get Started'}
          </h1>
          <p>
            {isAcceptingInvite
              ? 'Complete your profile to join the team'
              : isLogin
              ? 'Sign in to your account'
              : 'Create your company account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && !isAcceptingInvite && (
            <div className="form-group">
              <label>Company Name</label>
              <input
                type="text"
                placeholder="Acme Inc."
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                required
              />
            </div>
          )}
          {(isAcceptingInvite || (!isLogin && !isAcceptingInvite)) && (
            <div className="form-group">
              <label>Your Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
          )}
          {!isAcceptingInvite && (
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          )}
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={8}
            />
            {!isLogin && (
              <small className="form-hint">Minimum 8 characters</small>
            )}
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? (
              <span className="btn-loading">
                <span className="spinner-small"></span> Loading...
              </span>
            ) : isAcceptingInvite ? (
              'Accept Invitation & Join'
            ) : isLogin ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {!isAcceptingInvite && (
          <div className="auth-footer">
            <p>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button className="link-button" onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? 'Create one now' : 'Sign in here'}
              </button>
            </p>
          </div>
        )}

        {isAcceptingInvite && (
          <div className="auth-footer">
            <p className="text-muted">
              By accepting this invitation, you agree to join the organization.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ======================== SIDEBAR ========================

function Sidebar({ currentView, setCurrentView, user, logout, unreadCount }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'projects', label: 'Projects', icon: '📁' },
    { id: 'messages', label: 'Messages', icon: '💬' },
  ];

  if (user.role === 'admin') {
    menuItems.push(
      { id: 'users', label: 'Team', icon: '👥' },
      { id: 'invites', label: 'Invites', icon: '✉️' }
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="company-logo">SM</div>
        <div className="company-info">
          <h3>SaaS Manager</h3>
          <span className="company-badge">PRO</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <span className="nav-section-label">MAIN NAVIGATION</span>
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => setCurrentView(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.id === 'messages' && unreadCount > 0 && (
                <span className="unread-badge nav-unread-badge">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
          <div className="user-info">
            <strong>{user.name}</strong>
            <span className="user-role">{user.role}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={logout}>
          <span className="logout-icon">🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

// ======================== DASHBOARD VIEW ========================

function DashboardView({ user }) {
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeTasks: 0,
    teamMembers: 0,
    completionRate: 0,
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const projects = await api.get('/projects/');
      setStats((prev) => ({ ...prev, totalProjects: projects.length }));
      setRecentProjects(projects.slice(0, 3));

      let totalTasks = 0;
      let completedTasks = 0;
      for (const project of projects) {
        const tasks = await api.get(`/projects/${project.id}/task`);
        totalTasks += tasks.length;
        completedTasks += tasks.filter((t) => t.status === 'done').length;
      }
      setStats((prev) => ({
        ...prev,
        activeTasks: totalTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      }));

      const users = await api.get('/user/');
      setStats((prev) => ({ ...prev, teamMembers: users.length }));
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="view-loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="dashboard-view">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {user.name}! Here's your overview.</p>
      </div>

      <div className="stats-grid">
        <StatCard title="Active Projects" value={stats.totalProjects} icon="📁" color="#4A6FA5" />
        <StatCard title="Total Tasks" value={stats.activeTasks} icon="✅" color="#66BB6A" />
        <StatCard title="Team Members" value={stats.teamMembers} icon="👥" color="#FFA726" />
        <StatCard
          title="Completion Rate"
          value={`${stats.completionRate}%`}
          icon="📈"
          color="#AB47BC"
        />
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Recent Projects</h2>
          </div>
          {recentProjects.length > 0 ? (
            <div className="projects-mini-list">
              {recentProjects.map((project) => (
                <div key={project.id} className="project-mini-card">
                  <div className="project-mini-header">
                    <h4>{project.name}</h4>
                    <span className="progress-badge">{project.progress}%</span>
                  </div>
                  <p>{project.description}</p>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${project.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-text">No projects yet. Create your first project!</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: color }}>
        {icon}
      </div>
      <div className="stat-content">
        <h3>{value}</h3>
        <p>{title}</p>
      </div>
    </div>
  );
}

// ======================== PROJECTS VIEW ========================

function ProjectsView({ user }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, [searchTerm]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/projects/?search=${searchTerm}`);
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (projectData) => {
    try {
      await api.post('/projects/', projectData);
      loadProjects();
      setShowCreateModal(false);
    } catch (error) {
      alert('Error creating project: ' + error.message);
    }
  };

  const deleteProject = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await api.delete(`/projects/${projectId}`);
        loadProjects();
        setSelectedProject(null);
      } catch (error) {
        alert('Error deleting project: ' + error.message);
      }
    }
  };

  return (
    <div className="projects-view">
      <div className="view-header">
        <div className="header-content">
          <h1>Projects</h1>
          <p>Manage and track your team's projects</p>
        </div>
        <div className="header-actions">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <span className="btn-icon">+</span>
            Create Project
          </button>
        </div>
      </div>

      {loading ? (
        <div className="view-loading"><div className="spinner"></div></div>
      ) : (
        <div className="projects-layout">
          <div className="projects-grid">
            {projects.length > 0 ? (
              projects.map((project) => (
                <div
                  key={project.id}
                  className="project-card"
                  onClick={() => setSelectedProject(project)}
                >
                  <div className="project-card-header">
                    <div className="project-icon">📁</div>
                    <div className="project-title">
                      <h3>{project.name}</h3>
                      <span className="project-status">Active</span>
                    </div>
                  </div>
                  <p className="project-description">{project.description}</p>
                  <div className="project-progress">
                    <div className="progress-info">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="project-footer">
                    <span className="project-date">
                      {new Date(project.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📁</div>
                <h3>No projects found</h3>
                <p>Create your first project to get started</p>
                <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                  Create Project
                </button>
              </div>
            )}
          </div>

          {selectedProject && (
            <ProjectDetails
              project={selectedProject}
              onClose={() => setSelectedProject(null)}
              onUpdate={loadProjects}
              onDelete={deleteProject}
              user={user}
            />
          )}
        </div>
      )}

      {showCreateModal && (
        <CreateProjectModal onClose={() => setShowCreateModal(false)} onCreate={createProject} />
      )}
    </div>
  );
}

// ======================== PROJECT DETAILS ========================

function ProjectDetails({ project, onClose, onUpdate, onDelete, user }) {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');
  const [loading, setLoading] = useState(true);
  const [projectInfo, setProjectInfo] = useState(project);

  useEffect(() => {
    loadData();
  }, [project.id]);

  useEffect(() => {
    setProjectInfo(project);
  }, [project]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadTasks(), loadMembers()]);
    setLoading(false);
  };

  const loadTasks = async () => {
    try {
      const data = await api.get(`/projects/${project.id}/task`);
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadMembers = async () => {
    try {
      const data = await api.get(`/projects/${project.id}/members`);
      setMembers(data);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const handleProjectUpdate = async (updates) => {
    try {
      const updated = await api.put(`/projects/${project.id}`, updates);
      setProjectInfo(updated);
      onUpdate();
      setShowEditModal(false);
    } catch (error) {
      alert('Error updating project: ' + error.message);
    }
  };

  const createTask = async (taskData) => {
    try {
      await api.post(`/projects/${project.id}/task`, taskData);
      loadTasks();
      onUpdate();
      setShowTaskModal(false);
    } catch (error) {
      alert('Error creating task: ' + error.message);
    }
  };

  const updateTask = async (taskId, updates) => {
    try {
      await api.put(`/projects/${project.id}/task/${taskId}`, updates);
      loadTasks();
      onUpdate();
    } catch (error) {
      alert('Error updating task: ' + error.message);
    }
  };

  const deleteTask = async (taskId) => {
    if (window.confirm('Delete this task?')) {
      try {
        await api.delete(`/projects/${project.id}/task/${taskId}`);
        loadTasks();
        onUpdate();
      } catch (error) {
        alert('Error deleting task: ' + error.message);
      }
    }
  };

  const addMember = async (memberData) => {
    try {
      await api.post(`/projects/${project.id}/members`, memberData);
      loadMembers();
      setShowMemberModal(false);
    } catch (error) {
      alert('Error adding member: ' + error.message);
    }
  };

  const removeMember = async (memberId) => {
    if (window.confirm('Remove this member?')) {
      try {
        await api.delete(`/projects/${project.id}/members/${memberId}`);
        loadMembers();
      } catch (error) {
        alert('Error removing member: ' + error.message);
      }
    }
  };

  return (
    <div className="project-details-panel">
      <div className="panel-header">
        <button className="panel-close" onClick={onClose}>
          ×
        </button>
        <h2>{projectInfo?.name || project.name}</h2>
        <div className="panel-actions">
          <button onClick={() => setShowTaskModal(true)} className="btn-primary">
            + Add Task
          </button>
          <button onClick={() => setShowEditModal(true)} className="btn-secondary">
            Edit Project
          </button>
          <button onClick={() => onDelete(project.id)} className="btn-danger">
            Delete Project
          </button>
        </div>
      </div>

      <div className="panel-content">
        <div className="project-info">
          <p>{projectInfo?.description || project.description}</p>
          <div className="project-meta">
            <span className="meta-item">
              <strong>Progress:</strong> {project.progress}%
            </span>
            <span className="meta-item">
              <strong>Tasks:</strong> {tasks.length}
            </span>
            <span className="meta-item">
              <strong>Members:</strong> {members.length}
            </span>
          </div>
        </div>

        <div className="panel-tabs">
          {['tasks', 'members'].map((tab) => (
            <button
              key={tab}
              className={`tab-button ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="panel-loading"><div className="spinner"></div></div>
        ) : (
          <>
            {activeTab === 'tasks' && (
              <div className="tasks-board">
                {['todo', 'in_progress', 'done'].map((status) => (
                  <div key={status} className="task-column">
                    <div className="column-header">
                      <h3>{status.replace('_', ' ').toUpperCase()}</h3>
                      <span className="task-count">
                        {tasks.filter((t) => t.status === status).length}
                      </span>
                    </div>
                    <div className="task-list">
                      {tasks
                        .filter((task) => task.status === status)
                        .map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onUpdate={updateTask}
                            onDelete={deleteTask}
                          />
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'members' && (
              <div className="members-grid">
                {members.map((member) => (
                  <div key={member.id} className="member-card">
                    <div className="member-avatar">
                      {member.user_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="member-info">
                      <strong>{member.user_name}</strong>
                      <span>{member.user_email}</span>
                      <span className="member-role">{member.role}</span>
                    </div>
                    <button onClick={() => removeMember(member.id)} className="btn-icon-danger">
                      🗑️
                    </button>
                  </div>
                ))}
                <button onClick={() => setShowMemberModal(true)} className="add-member-card">
                  <span className="add-icon">+</span>
                  <span>Add Member</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showTaskModal && (
        <CreateTaskModal onClose={() => setShowTaskModal(false)} onCreate={createTask} />
      )}

      {showMemberModal && (
        <AddMemberModal
          projectId={project.id}
          onClose={() => setShowMemberModal(false)}
          onAdd={addMember}
        />
      )}

      {showEditModal && (
        <EditProjectModal
          onClose={() => setShowEditModal(false)}
          onSave={handleProjectUpdate}
          initialData={{
            name: projectInfo?.name || project.name || '',
            description: projectInfo?.description || project.description || '',
          }}
        />
      )}
    </div>
  );
}

// ======================== TASK CARD ========================

function TaskCard({ task, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
  });

  const handleSave = () => {
    onUpdate(task.id, editData);
    setIsEditing(false);
  };

  const priorityColors = {
    low: '#66BB6A',
    medium: '#FFA726',
    high: '#EF5350',
  };

  if (isEditing) {
    return (
      <div className="task-card editing">
        <input
          type="text"
          value={editData.title}
          onChange={(e) => setEditData({ ...editData, title: e.target.value })}
          placeholder="Task title"
        />
        <textarea
          value={editData.description}
          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
          placeholder="Description"
          rows="2"
        />
        <select
          value={editData.priority}
          onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <select
          value={editData.status}
          onChange={(e) => setEditData({ ...editData, status: e.target.value })}
        >
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <div className="edit-actions">
          <button onClick={handleSave} className="btn-primary btn-sm">
            Save
          </button>
          <button onClick={() => setIsEditing(false)} className="btn-text btn-sm">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="task-card" style={{ borderLeft: `4px solid ${priorityColors[task.priority]}` }}>
      <div className="task-header">
        <h4>{task.title}</h4>
        <div className="task-actions">
          <button onClick={() => setIsEditing(true)} className="btn-icon" title="Edit">
            ✏️
          </button>
          <button onClick={() => onDelete(task.id)} className="btn-icon" title="Delete">
            🗑️
          </button>
        </div>
      </div>
      {task.description && <p className="task-description">{task.description}</p>}
      <div className="task-footer">
        <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>
        <span className="task-date">{new Date(task.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

// ======================== USERS VIEW ========================

function UsersView({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.get('/user/');
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    if (userId === user.id) {
      alert('You cannot delete yourself');
      return;
    }

    if (window.confirm('Are you sure you want to remove this user?')) {
      try {
        await api.delete(`/user/delete/${userId}`);
        loadUsers();
      } catch (error) {
        alert('Error deleting user: ' + error.message);
      }
    }
  };

  if (loading) {
    return <div className="view-loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="users-view">
      <div className="view-header">
        <div className="header-content">
          <h1>Team Management</h1>
          <p>Manage your team members and their roles</p>
        </div>
      </div>

      <div className="users-table">
        <div className="table-header">
          <div className="table-cell">User</div>
          <div className="table-cell">Role</div>
          <div className="table-cell">Status</div>
          <div className="table-cell">Joined</div>
          <div className="table-cell">Actions</div>
        </div>
        {users.map((u) => (
          <div key={u.id} className="table-row">
            <div className="table-cell user-info">
              <div className="user-avatar">{u.name.charAt(0).toUpperCase()}</div>
              <div>
                <strong>{u.name}</strong>
                <p>{u.email}</p>
              </div>
            </div>
            <div className="table-cell">
              <span className={`role-badge role-${u.role}`}>{u.role}</span>
            </div>
            <div className="table-cell">
              <span className={`status-badge ${u.is_active ? 'active' : 'inactive'}`}>
                {u.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="table-cell">{new Date(u.created_at).toLocaleDateString()}</div>
            <div className="table-cell">
              {u.id !== user.id && (
                <button onClick={() => deleteUser(u.id)} className="btn-danger btn-sm">
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ======================== INVITES VIEW ========================

function InvitesView({ user }) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendInvite = async (inviteData) => {
    setLoading(true);
    try {
      await api.post('/invite/', {
        email: inviteData.email,
        role: inviteData.role,
      });
      alert('✅ Invitation sent successfully!');
      setShowInviteModal(false);
    } catch (error) {
      alert('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="invites-view">
      <div className="view-header">
        <div className="header-content">
          <h1>Invite Users</h1>
          <p>Send invitations to new team members</p>
        </div>
        <button onClick={() => setShowInviteModal(true)} className="btn-primary">
          <span className="btn-icon">+</span>
          Send Invite
        </button>
      </div>

      <div className="invites-content">
        <div className="info-card">
          <h3>📧 How Invitations Work</h3>
          <ul>
            <li>
              <strong>7-day validity:</strong> Invitations expire after 7 days
            </li>
            <li>
              <strong>Secure onboarding:</strong> Recipients set their own password
            </li>
            <li>
              <strong>Role-based access:</strong> Assign Admin, Editor, Viewer, or Member roles
            </li>
            <li>
              <strong>Single use:</strong> Each invitation can only be used once
            </li>
          </ul>
        </div>

        <div className="empty-state">
          <div className="empty-icon">✉️</div>
          <h3>Invite team members</h3>
          <p>Send email invitations to collaborate on your projects</p>
          <button onClick={() => setShowInviteModal(true)} className="btn-primary">
            Send Your First Invite
          </button>
        </div>
      </div>

      {showInviteModal && (
        <SendInviteModal
          onClose={() => setShowInviteModal(false)}
          onSend={sendInvite}
          loading={loading}
        />
      )}
    </div>
  );
}

// ======================== MESSAGES VIEW ========================

function MessagesView({ user, refreshUnreadCount }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    loadConversations();
    loadUsers();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const connectWebSocket = () => {
    const token = localStorage.getItem('access_token');
    // Note: WebSocket connection would require authentication
    // For now, we'll poll for new messages
  };

  const loadConversations = async () => {
    setLoading(true);
    try {
      const data = await api.get('/messages/conversations');
      setConversations(data);
      if (refreshUnreadCount) {
        refreshUnreadCount();
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await api.get('/user/');
      setUsers(data.filter((u) => u.id !== user.id));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const data = await api.get(`/messages/conversations/${conversationId}/messages`);
      setMessages(data);
      if (refreshUnreadCount) {
        refreshUnreadCount();
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const startConversation = async (userId) => {
    try {
      const conversation = await api.post('/messages/conversations', { user_id: userId });
      setSelectedConversation(conversation);
      loadConversations();
      setShowNewChat(false);
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Error starting conversation: ' + error.message);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      await api.post(`/messages/conversations/${selectedConversation.id}/messages`, {
        content: newMessage,
      });
      setNewMessage('');
      loadMessages(selectedConversation.id);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message');
    }
  };

  const getOtherUser = (conversation) => {
    return conversation.participants?.find((p) => p.user_id !== user.id)?.user;
  };

  if (loading) {
    return <div className="view-loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="messages-view">
      <div className="conversations-sidebar">
        <div className="sidebar-header">
          <h2>Messages</h2>
          <button onClick={() => setShowNewChat(true)} className="btn-primary btn-sm">
            + New
          </button>
        </div>
        <div className="conversations-list">
          {conversations.length > 0 ? (
            conversations.map((conv) => {
              const otherUser = getOtherUser(conv);
              return (
                <div
                  key={conv.id}
                  className={`conversation-item ${
                    selectedConversation?.id === conv.id ? 'active' : ''
                  }`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <div className="conversation-avatar">
                    {otherUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="conversation-info">
                    <strong>{otherUser?.name || 'Unknown User'}</strong>
                    <p className="last-message">
                      {conv.messages?.[conv.messages.length - 1]?.content || 'No messages yet'}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-conversations">
              <p>No conversations yet</p>
              <button onClick={() => setShowNewChat(true)} className="btn-primary btn-sm">
                Start a chat
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="messages-container">
        {selectedConversation ? (
          <>
            <div className="messages-header">
              <div className="message-user">
                <div className="user-avatar">
                  {getOtherUser(selectedConversation)?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h3>{getOtherUser(selectedConversation)?.name || 'Unknown User'}</h3>
                  <p className="user-status">Active</p>
                </div>
              </div>
            </div>
            <div className="messages-list">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message ${msg.sender_id === user.id ? 'sent' : 'received'}`}
                >
                  <div className="message-content">{msg.content}</div>
                  <div className="message-time">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="message-input">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
              />
              <button type="submit" className="btn-primary">
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="empty-messages">
            <div className="empty-icon">💬</div>
            <h3>Select a conversation</h3>
            <p>Choose from existing conversations or start a new one</p>
          </div>
        )}
      </div>

      {showNewChat && (
        <Modal onClose={() => setShowNewChat(false)}>
          <h2>Start New Conversation</h2>
          <div className="users-select">
            {users.map((u) => (
              <div
                key={u.id}
                className="user-select-item"
                onClick={() => startConversation(u.id)}
              >
                <div className="user-avatar">{u.name.charAt(0).toUpperCase()}</div>
                <div className="user-details">
                  <strong>{u.name}</strong>
                  <p>{u.email}</p>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ======================== MODAL COMPONENTS ========================

function Modal({ children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

function CreateProjectModal({ onClose, onCreate }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <Modal onClose={onClose}>
      <h2>Create New Project</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Project Name</label>
          <input
            type="text"
            placeholder="Website Redesign"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            minLength={3}
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            placeholder="Describe your project..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            rows="3"
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-text" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Create Project
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditProjectModal({ onClose, onSave, initialData }) {
  const [formData, setFormData] = useState(initialData);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  return (
    <Modal onClose={onClose}>
      <h2>Edit Project</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Project Name</label>
          <input
            type="text"
            placeholder="Project name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            minLength={3}
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            placeholder="Describe your project..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            rows="3"
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-text" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CreateTaskModal({ onClose, onCreate }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <Modal onClose={onClose}>
      <h2>Create New Task</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Task Title</label>
          <input
            type="text"
            placeholder="Design homepage"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            minLength={3}
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            placeholder="Task details..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows="3"
          />
        </div>
        <div className="form-group">
          <label>Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-text" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Create Task
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AddMemberModal({ projectId, onClose, onAdd }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [role, setRole] = useState('viewer');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.get('/user/');
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({ user_id: parseInt(selectedUser), role });
  };

  return (
    <Modal onClose={onClose}>
      <h2>Add Team Member</h2>
      {loading ? (
        <div className="modal-loading"><div className="spinner"></div></div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Select User</label>
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} required>
              <option value="">Choose a user...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-text" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add Member
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function SendInviteModal({ onClose, onSend, loading }) {
  const [formData, setFormData] = useState({
    email: '',
    role: 'member',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSend(formData);
  };

  return (
    <Modal onClose={onClose}>
      <h2>Send Invitation</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email Address</label>
          <input
            type="email"
            placeholder="colleague@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label>Role</label>
          <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-text" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default App;