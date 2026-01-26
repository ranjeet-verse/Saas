# ProjectHub - SaaS Project Management Platform

A modern, multi-tenant project management platform built with FastAPI and React for teams to collaborate, track projects, and manage tasks efficiently.

## 🚀 Tech Stack

**Backend:**
- FastAPI (Python web framework)
- SQLAlchemy (ORM)
- PostgreSQL/SQLite (Database)
- JWT Authentication
- Passlib (Password hashing)

**Frontend:**
- React
- Tailwind CSS
- Lucide Icons

## 📦 Setup Instructions

### Backend Setup

1. **Navigate to backend directory and create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install fastapi sqlalchemy psycopg2-binary python-jose passlib python-multipart uvicorn python-dotenv
```

3. **Create `.env` file in backend root:**
```env
DATABASE_URL=sqlite:///./app.db
SECRET_KEY=your-secret-key-here-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

4. **Run the backend:**
```bash
uvicorn app.main:app --reload
```

Backend runs on `http://localhost:8000`  
API Documentation: `http://localhost:8000/docs`


Frontend runs on `http://localhost:3000`

## ✅ Implemented Features

### Authentication & User Management
- ✅ User login with JWT authentication
- ✅ User registration (creates new organization/tenant)
- ✅ Multi-tenant architecture (complete data isolation)
- ✅ Token refresh mechanism
- ✅ Logout functionality
- ✅ User invite system (admins can invite team members via email)
- ✅ Role-based access control (Admin, Owner, Editor, Viewer)
- ✅ Secure password hashing

### Project Management
- ✅ Create projects with name and description
- ✅ View all projects with search functionality
- ✅ View single project details
- ✅ Update projects (name, description)
- ✅ Soft delete projects (keeps data, marks as deleted)
- ✅ Auto-calculated project progress tracking
- ✅ Project member management
- ✅ Permission-based project access

### Task Management
- ✅ Create tasks with title, description, and priority
- ✅ Kanban board view (To Do, In Progress, Done)
- ✅ Update task status via dropdown
- ✅ Delete tasks with confirmation modal
- ✅ Task priority levels (Low, Medium, High) with color coding
- ✅ Automatic project progress calculation based on completed tasks
- ✅ Real-time task count per column

### Team Collaboration
- ✅ Add members to projects with roles
- ✅ View all project members
- ✅ Role assignment (Owner, Editor, Viewer)
- ✅ Permission-based operations (owners can delete, editors can modify, viewers can only view)
- ✅ Tenant-based team isolation

### UI/UX
- ✅ Beautiful landing page with hero section
- ✅ Feature highlights and "How It Works" sections
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Loading states for async operations
- ✅ Error handling with user feedback
- ✅ Modern, clean interface with Tailwind CSS
- ✅ Smooth transitions and hover effects
- ✅ Modal dialogs for forms
- ✅ Empty states with helpful messages



## 🛠️ Development Notes

- Backend uses form-data for `/auth/login` (OAuth2PasswordRequestForm)
- All other endpoints use JSON
- Soft deletes via `is_deleted` flag (data retained)
- Progress auto-calculated: `(completed_tasks / total_tasks) * 100`
- Task statuses: `todo`, `in_progress`, `done`
- Priority levels: `low`, `medium`, `high`

## 🌐 Default Ports

- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs (Swagger UI)
- **ReDoc**: http://localhost:8000/redoc

## 🐛 Troubleshooting

**CORS errors:**
- Ensure backend has correct CORS settings for `http://localhost:3000`

**Login fails:**
- Check that you're sending form-data with `username` (not email) and `password`

**Tasks not showing:**
- Check browser console for API errors
- Verify task status matches: `todo`, `in_progress`, or `done`

**401 Unauthorized:**
- Token may have expired, logout and login again
- Check token is being sent in Authorization header

## 📝 License

MIT License - feel free to use for personal or commercial projects

## 🤝 Contributing

This is a development project. Feel free to:
- Add new features from the "Features You Can Add" list
- Improve existing functionality
- Fix bugs
- Enhance UI/UX
- Add tests
- Improve documentation

## 📧 Contact

For questions or suggestions, please open an issue or reach out to me.
ranjeetbohsalee@gmail.com

---

**Happy Coding! 🚀**