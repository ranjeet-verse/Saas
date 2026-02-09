import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Input from '../components/common/Input';
import { useNotification } from '../context/NotificationContext';
import ConfirmDialog from '../components/common/ConfirmDialog';
import CreateTaskModal from '../components/projects/CreateTaskModal';
import { formatDate } from '../utils/helpers';

const KanbanColumn = ({ status, title, tasks, onDrop, onDragStart, onDelete, onUpdate }) => {
    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('drag-over');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        onDrop(status);
    };

    return (
        <div
            className="flex-1 min-w-[300px] bg-gray-50 rounded-xl p-4 flex flex-col gap-4 border-2 border-transparent transition-all"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="flex justify-between items-center mb-2 px-1">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    {title}
                    <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                        {tasks.length}
                    </span>
                </h3>
                <button
                    onClick={() => onUpdate(status)}
                    className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                    title="Add task to this column"
                >
                    +
                </button>
            </div>

            <div className="flex flex-col gap-3">
                {tasks.map(task => (
                    <div
                        key={task.id}
                        draggable
                        onDragStart={() => onDragStart(task)}
                        className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group animate-scale-in"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-gray-800 line-clamp-2">{task.title}</h4>
                            <button
                                onClick={() => onDelete(task.id)}
                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                ×
                            </button>
                        </div>
                        {task.description && (
                            <p className="text-sm text-gray-500 mb-3 line-clamp-3">{task.description}</p>
                        )}
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${task.priority === 'high' ? 'bg-red-100 text-red-700' :
                                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-green-100 text-green-700'
                                }`}>
                                {task.priority}
                            </span>
                            <span className="text-[10px] text-gray-400">{formatDate(task.created_at)}</span>
                        </div>
                    </div>
                ))}
                {tasks.length === 0 && (
                    <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm">
                        No tasks here
                    </div>
                )}
            </div>
        </div>
    );
};

const ProjectDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addNotification } = useNotification();
    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' });
    const [draggedTask, setDraggedTask] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, taskId: null });
    const [taskModal, setTaskModal] = useState({ isOpen: false, status: 'todo' });
    const [members, setMembers] = useState([]);
    const [tenantUsers, setTenantUsers] = useState([]);
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [newMember, setNewMember] = useState({ userId: '', role: 'viewer' });

    const fetchData = useCallback(async () => {
        try {
            const [projRes, tasksRes, membersRes] = await Promise.all([
                api.get(`/projects/${id}`),
                api.get(`/projects/${id}/task`),
                api.get(`/projects/${id}/members`)
            ]);
            setProject(projRes.data);
            setTasks(tasksRes.data);
            setMembers(membersRes.data);
        } catch (err) {
            addNotification('Failed to load project details', 'error');
            navigate('/projects');
        } finally {
            setLoading(false);
        }
    }, [id, navigate, addNotification]);

    const fetchTenantUsers = async () => {
        try {
            const res = await api.get('/user/');
            setTenantUsers(res.data);
        } catch (err) {
            addNotification('Failed to load users', 'error');
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddTask = async (taskData) => {
        try {
            const res = await api.post(`/projects/${id}/task`, taskData);
            setTasks([...tasks, res.data]);
            setNewTask({ title: '', description: '', priority: 'medium' });
            addNotification('Task added successfully', 'success');
        } catch (err) {
            addNotification('Failed to add task', 'error');
            throw err;
        }
    };

    const handleDeleteTask = async () => {
        const taskId = deleteModal.taskId;
        try {
            await api.delete(`/projects/${id}/task/${taskId}`);
            setTasks(tasks.filter(t => t.id !== taskId));
            addNotification('Task deleted', 'success');
        } catch (err) {
            addNotification('Failed to delete task', 'error');
        }
    };

    const handleUpdateTaskStatus = async (task, newStatus) => {
        if (task.status === newStatus) return;

        try {
            // Optimistic update
            const updatedTasks = tasks.map(t =>
                t.id === task.id ? { ...t, status: newStatus } : t
            );
            setTasks(updatedTasks);

            await api.put(`/projects/${id}/task/${task.id}`, {
                title: task.title,
                description: task.description,
                status: newStatus,
                priority: task.priority
            });
        } catch (err) {
            addNotification('Failed to update task status', 'error');
            fetchData(); // Rollback
        }
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/projects/${id}/members`, {
                user_id: parseInt(newMember.userId),
                role: newMember.role
            });
            addNotification('Member added to project', 'success');
            setIsAddMemberOpen(false);
            setNewMember({ userId: '', role: 'viewer' });
            fetchData();
        } catch (err) {
            addNotification(err.response?.data?.detail || 'Failed to add member', 'error');
        }
    };

    const handleRemoveMember = async (memberId) => {
        try {
            await api.delete(`/projects/${id}/members/${memberId}`);
            setMembers(members.filter(m => m.id !== memberId));
            addNotification('Member removed', 'success');
        } catch (err) {
            addNotification(err.response?.data?.detail || 'Failed to remove member', 'error');
        }
    };

    const isAdminOrOwner = project?.my_role === 'admin' || project?.my_role === 'owner';
    const canEdit = isAdminOrOwner || project?.my_role === 'editor';

    const onDragStart = (task) => {
        setDraggedTask(task);
    };

    const onDrop = (status) => {
        if (draggedTask) {
            handleUpdateTaskStatus(draggedTask, status);
            setDraggedTask(null);
        }
    };

    if (loading) return <LoadingSpinner className="mt-20" />;
    if (!project) return null;

    const columns = [
        { status: 'todo', title: 'To Do' },
        { status: 'in-progress', title: 'In Progress' },
        { status: 'done', title: 'Done' }
    ];

    return (
        <div className="max-w-[1600px] mx-auto">
            <div className="mb-8 flex justify-between items-end animate-slide-down">
                <div>
                    <button
                        onClick={() => navigate('/projects')}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors mb-2 block"
                    >
                        ← Back to Projects
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                    <p className="text-gray-500 mt-2">{project.description}</p>
                </div>

                <div className="flex items-center gap-4 text-sm">
                    {canEdit && (
                        <Button
                            onClick={() => setTaskModal({ isOpen: true, status: 'todo' })}
                            className="shadow-md shadow-indigo-100"
                        >
                            + Create Task
                        </Button>
                    )}
                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm min-w-[120px]">
                        <p className="text-gray-400 uppercase text-[10px] font-extrabold tracking-widest mb-1">Completion</p>
                        <p className="text-2xl font-black text-indigo-600">
                            {tasks.length ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0}%
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Kanban Board */}
                <div className="lg:col-span-3">
                    <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
                        {columns.map(col => (
                            <KanbanColumn
                                key={col.status}
                                status={col.status}
                                title={col.title}
                                tasks={tasks.filter(t => t.status === col.status)}
                                onDrop={onDrop}
                                onDragStart={onDragStart}
                                onDelete={isAdminOrOwner ? (taskId) => setDeleteModal({ isOpen: true, taskId }) : null}
                                onUpdate={canEdit ? (status) => setTaskModal({ isOpen: true, status }) : null}
                            />
                        ))}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {canEdit && (
                        <Card title="Quick Add">
                            <form onSubmit={(e) => { e.preventDefault(); handleAddTask({ ...newTask, status: 'todo' }); }} className="space-y-4">
                                <Input
                                    placeholder="Task title..."
                                    value={newTask.title}
                                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                    className="mb-0"
                                />
                                <textarea
                                    placeholder="Description (optional)"
                                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24"
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                />
                                <select
                                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={newTask.priority}
                                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                                >
                                    <option value="low">Low Priority</option>
                                    <option value="medium">Medium Priority</option>
                                    <option value="high">High Priority</option>
                                </select>
                                <Button type="submit" className="w-full" disabled={!newTask.title.trim()}>
                                    Add Task
                                </Button>
                            </form>
                        </Card>
                    )}

                    <Card title="Project Team">
                        <div className="space-y-4">
                            {members.map(member => (
                                <div key={member.id} className="flex justify-between items-center group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase">
                                            {member.user_name?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{member.user_name}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{member.role}</p>
                                        </div>
                                    </div>
                                    {isAdminOrOwner && member.role !== 'owner' && (
                                        <button
                                            onClick={() => handleRemoveMember(member.id)}
                                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-lg"
                                            title="Remove Member"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                            {isAdminOrOwner && (
                                <button
                                    onClick={() => {
                                        setIsAddMemberOpen(true);
                                        fetchTenantUsers();
                                    }}
                                    className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-xs font-bold uppercase hover:border-indigo-200 hover:text-indigo-600 transition-all"
                                >
                                    + Add Member
                                </button>
                            )}
                        </div>
                    </Card>

                    <Card title="Project Stats">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Total Tasks</span>
                                <span className="font-bold">{tasks.length}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div
                                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${tasks.length ? (tasks.filter(t => t.status === 'done').length / tasks.length) * 100 : 0}%` }}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {columns.map(col => (
                                    <div key={col.status} className="bg-gray-50 p-2 rounded text-center">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">{col.title}</p>
                                        <p className="text-lg font-bold text-gray-700">
                                            {tasks.filter(t => t.status === col.status).length}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <ConfirmDialog
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, taskId: null })}
                onConfirm={handleDeleteTask}
                title="Delete Task"
                message="Are you sure you want to delete this task? This action cannot be undone."
                danger
            />

            <CreateTaskModal
                isOpen={taskModal.isOpen}
                onClose={() => setTaskModal({ ...taskModal, isOpen: false })}
                onTaskCreated={handleAddTask}
                initialStatus={taskModal.status}
            />

            {/* Add Member Modal */}
            {isAddMemberOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card title="Add Project Member" className="w-full max-w-md shadow-2xl animate-scale-in">
                        <form onSubmit={handleAddMember} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Select User</label>
                                <select
                                    required
                                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    value={newMember.userId}
                                    onChange={(e) => setNewMember({ ...newMember, userId: e.target.value })}
                                >
                                    <option value="">Choose a user...</option>
                                    {tenantUsers.filter(u => !members.some(m => m.user_id === u.id)).map(user => (
                                        <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Project Role</label>
                                <select
                                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    value={newMember.role}
                                    onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                                >
                                    <option value="viewer">Viewer</option>
                                    <option value="editor">Editor</option>
                                    <option value="owner">Owner</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <Button variant="secondary" onClick={() => setIsAddMemberOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={!newMember.userId}>Add Member</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ProjectDetail;

