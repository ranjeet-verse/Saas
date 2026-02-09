import React, { useEffect, useState, useMemo } from 'react';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import api from '../api/axios';
import { useNotification } from '../context/NotificationContext';
import { exportToCSV } from '../utils/helpers';

const Analytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { addNotification } = useNotification();

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                // Fetch basic metrics
                const dashboardRes = await api.get('/analytics/dashboard');
                const dashboard = dashboardRes.data;

                // Fetch details in parallel
                const [projectsRes, productivityRes, statusRes, priorityRes, timelineRes] = await Promise.all([
                    api.get('/analytics/projects'),
                    api.get('/analytics/users/productivity'),
                    api.get('/analytics/tasks/status-distribution'),
                    api.get('/analytics/tasks/priority-distribution'),
                    api.get('/analytics/tasks/completion-timeline')
                ]);

                setData({
                    metrics: dashboard,
                    projects: projectsRes.data,
                    productivity: productivityRes.data,
                    statusDistribution: statusRes.data,
                    priorityDistribution: priorityRes.data,
                    timeline: timelineRes.data
                });
            } catch (err) {
                addNotification('Failed to load analytics', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [addNotification]);

    const handleExport = () => {
        if (!data) return;
        const exportData = [
            { Metric: 'Total Projects', Value: data.metrics.total_projects },
            { Metric: 'Completion Rate', Value: `${data.metrics.completion_rate}%` },
            { Metric: 'Total Tasks', Value: data.metrics.total_tasks },
            { Metric: 'Team Members', Value: data.metrics.total_team_members }
        ];
        exportToCSV(exportData, 'analytics_summary.csv');
        addNotification('Analytics exported to CSV', 'success');
    };

    if (loading) return <LoadingSpinner className="mt-20" />;

    if (!data) return (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 m-8">
            <p className="text-gray-500 font-medium">Failed to load analytics data. Please try again later.</p>
            <Button variant="primary" onClick={() => window.location.reload()} className="mt-6">
                🔄 Retry Loading
            </Button>
        </div>
    );

    const { metrics, projects, productivity, statusDistribution, timeline } = data;

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
                <Button variant="secondary" onClick={handleExport}>📥 Export Summary</Button>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Projects</p>
                    <p className="text-3xl font-black text-indigo-600 mt-1">{metrics.total_projects}</p>
                    <p className="text-xs text-indigo-400 font-bold mt-2">{metrics.active_projects} Active / {metrics.completed_projects} Done</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Completion Rate</p>
                    <p className="text-3xl font-black text-green-600 mt-1">{metrics.completion_rate}%</p>
                    <div className="w-full bg-gray-50 h-1 mt-3 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full" style={{ width: `${metrics.completion_rate}%` }}></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Tasks</p>
                    <p className="text-3xl font-black text-purple-600 mt-1">{metrics.total_tasks}</p>
                    <p className="text-xs text-red-500 font-bold mt-2">{metrics.overdue_tasks} Overdue tasks</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Avg. Progress</p>
                    <p className="text-3xl font-black text-blue-600 mt-1">{metrics.average_project_progress}%</p>
                    <p className="text-xs text-blue-400 font-bold mt-2">{metrics.total_team_members} Team members</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Task Status Distribution */}
                <Card title="Task Distribution by Status">
                    <div className="space-y-4 mt-4">
                        {statusDistribution.map((s, i) => (
                            <div key={s.status} className="space-y-1">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                                    <span className="text-gray-500">{s.status.replace('_', ' ')}</span>
                                    <span className="text-gray-900">{s.count} ({s.percentage}%)</span>
                                </div>
                                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-1000 ${s.status === 'done' ? 'bg-green-500' :
                                            s.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400'
                                            }`}
                                        style={{ width: `${s.percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Team Productivity */}
                <Card title="Team Productivity (Top 5)">
                    <div className="space-y-4 mt-4">
                        {productivity.slice(0, 5).map((u, i) => (
                            <div key={u.user_id} className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs">
                                    {u.user_name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-bold text-gray-700">{u.user_name}</span>
                                        <span className="text-[10px] font-black text-indigo-600">{u.completion_rate}% rate</span>
                                    </div>
                                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-indigo-500 h-full" style={{ width: `${u.completion_rate}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Task Completion Timeline */}
                <Card title="Completion Activity (Last 30 Days)">
                    <div className="mt-8 flex items-end justify-between h-40 gap-1 overflow-hidden">
                        {timeline.filter((_, i) => i % 2 === 0).map((item, i) => (
                            <div key={item.date} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                <div
                                    className="w-full bg-indigo-500 rounded-t-sm transition-all duration-1000 group-hover:bg-indigo-400 relative"
                                    style={{ height: `${Math.min(100, (item.value / 10) * 100)}%`, minHeight: '2px' }}
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[8px] py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                        {item.date}: {item.value} tasks
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-[8px] font-black text-gray-400 uppercase tracking-widest">
                        <span>{timeline[0]?.date}</span>
                        <span>Activity Trend</span>
                        <span>{timeline[timeline.length - 1]?.date}</span>
                    </div>
                </Card>

                <Card title="Project Health (Top 5)">
                    <div className="space-y-4 mt-4">
                        {projects.slice(0, 5).map((p) => (
                            <div key={p.project_id} className="space-y-1">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                                    <span className="text-gray-700">{p.project_name}</span>
                                    <span className="text-indigo-600">{p.completion_rate}%</span>
                                </div>
                                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                    <div className="bg-indigo-500 h-full" style={{ width: `${p.completion_rate}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Project Performance Breakdown */}
            <Card title="Project Performance Breakdown">
                <div className="overflow-x-auto mt-4">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Project</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tasks (Done/Total)</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Overdue</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Completion</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {projects.map((p) => (
                                <tr key={p.project_id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{p.project_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{p.completed_tasks}/{p.total_tasks}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`font-bold ${p.overdue_tasks > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                            {p.overdue_tasks}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 w-20 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-green-500 h-full" style={{ width: `${p.completion_rate}%` }}></div>
                                            </div>
                                            <span className="text-[10px] font-black text-gray-600">{p.completion_rate}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${p.progress === 100 ? 'bg-green-50 text-green-600' :
                                            p.progress > 0 ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'
                                            }`}>
                                            {p.progress === 100 ? 'Finished' : p.progress > 0 ? 'In Progress' : 'Pending'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default Analytics;
