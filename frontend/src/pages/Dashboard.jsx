import React, { useEffect, useState, useMemo } from 'react';
import api from '../api/axios';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import CreateTaskModal from '../components/projects/CreateTaskModal';
import { getInitials, getAvatarColor, formatDate } from '../utils/helpers';

const Dashboard = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statsData, setStatsData] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activities, setActivities] = useState([]);
    const [taskModal, setTaskModal] = useState({ isOpen: false, projectId: null });
    const navigate = useNavigate();
    const { addNotification } = useNotification();

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const results = await Promise.allSettled([
                    api.get('/projects'),
                    api.get('/projects/stats'),
                    api.get('/messages/unread_count'),
                    api.get('/activity/recent')
                ]);

                if (results[0].status === 'fulfilled') setProjects(results[0].value.data);
                if (results[1].status === 'fulfilled') setStatsData(results[1].value.data);
                if (results[2].status === 'fulfilled') setUnreadCount(results[2].value.data.unread_count);
                if (results[3].status === 'fulfilled') setActivities(results[3].value.data);

                // If any failed, notify silently or log
                const failed = results.filter(r => r.status === 'rejected');
                if (failed.length > 0) {
                    console.warn(`${failed.length} dashboard data sources failed to load`);
                }
            } catch (err) {
                addNotification('Failed to load dashboard data', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [addNotification]);

    const handleTaskCreated = async (taskData) => {
        try {
            await api.post(`/projects/${taskModal.projectId}/task`, taskData);
            addNotification('Task added successfully!', 'success');
            // Optimistically update progress if we were showing it specifically, 
            // but Dashboard shows a snapshot.
        } catch (err) {
            addNotification('Failed to create task', 'error');
            throw err;
        }
    };

    if (loading) return <LoadingSpinner className="mt-20" />;

    const stats = [
        { title: 'Total Projects', value: statsData?.total_projects || 0, color: 'from-indigo-500 to-blue-600', icon: '📁' },
        { title: 'Active Tasks', value: statsData?.active_tasks || 0, color: 'from-purple-500 to-indigo-600', icon: '✅' },
        { title: 'Messages', value: unreadCount, trend: unreadCount > 0 ? 'New' : '', color: 'from-pink-500 to-rose-600', icon: '💬' },
        { title: 'Avg Progress', value: `${Math.round(statsData?.avg_progress || 0)}%`, color: 'from-orange-500 to-amber-600', icon: '📈' }
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header & Quick Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Overview</h1>
                    <p className="text-gray-500 mt-1">{greeting}, {user?.name || 'Ranjeet'}. Here's what's happening today.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={() => navigate('/analytics')}>View Reports</Button>
                    <Button onClick={() => navigate('/projects')}>+ New Project</Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div key={stat.title} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group relative overflow-hidden">
                        <div className={`absolute top-0 right-0 w-24 h-24 -mt-12 -mr-12 bg-gradient-to-br ${stat.color} opacity-10 rounded-full transition-transform group-hover:scale-150`}></div>
                        <div className="relative flex justify-between items-start">
                            <div>
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">{stat.title}</p>
                                <h3 className="text-3xl font-black text-gray-900 mt-1">{stat.value}</h3>
                                {stat.trend && (
                                    <p className={`text-xs font-bold mt-2 text-green-500`}>
                                        {stat.trend}
                                    </p>
                                )}
                            </div>
                            <span className="text-2xl">{stat.icon}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Projects */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-gray-800">Recent Projects</h3>
                        <button onClick={() => navigate('/projects')} className="text-indigo-600 text-sm font-bold hover:underline">View All</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {projects.slice(0, 4).map(project => (
                            <Card
                                key={project.id}
                                hover
                                onClick={() => navigate(`/projects/${project.id}`)}
                                className="group animate-scale-in border-none shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black bg-gradient-to-br from-indigo-500 to-purple-600`}>
                                        {project.name[0].toUpperCase()}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTaskModal({ isOpen: true, projectId: project.id });
                                            }}
                                            className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm group-hover:scale-110"
                                            title="Quick Add Task"
                                        >
                                            +
                                        </button>
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${project.progress === 100 ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                            {project.progress === 100 ? 'Completed' : 'Active'}
                                        </span>
                                    </div>
                                </div>
                                <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{project.name}</h4>
                                <p className="text-xs text-gray-500 mt-2 line-clamp-2 h-8">{project.description}</p>

                                <div className="mt-6">
                                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-indigo-600 h-full rounded-full transition-all duration-1000"
                                            style={{ width: `${project.progress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </Card>
                        ))}

                        {projects.length === 0 && (
                            <div className="col-span-full text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <p className="text-gray-500 font-medium">No projects yet. Boost your productivity today!</p>
                                <Button
                                    onClick={() => navigate('/projects')}
                                    className="mt-6"
                                >
                                    Start New Project
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-800">Activity Feed</h3>
                    <Card className="border-none shadow-[0_4px_20px_rgba(0,0,0,0.05)] min-h-[400px]">
                        <div className="space-y-6">
                            {activities.map((activity, i) => (
                                <div key={activity.id} className="flex gap-4 relative">
                                    {i !== activities.length - 1 && (
                                        <div className="absolute left-5 top-10 bottom-0 w-px bg-gray-100"></div>
                                    )}
                                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${getAvatarColor(activity.user_name || 'System')}`}>
                                        {getInitials(activity.user_name || 'System')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900">
                                            {activity.user_name}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {activity.message}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-2 font-medium uppercase tracking-wider">
                                            {formatDate(activity.created_at)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button variant="secondary" className="w-full mt-8 text-xs font-bold">Show More Activity</Button>
                    </Card>
                </div>
            </div>

            <CreateTaskModal
                isOpen={taskModal.isOpen}
                onClose={() => setTaskModal({ isOpen: false, projectId: null })}
                onTaskCreated={handleTaskCreated}
            />
        </div>
    );
};

export default Dashboard;

