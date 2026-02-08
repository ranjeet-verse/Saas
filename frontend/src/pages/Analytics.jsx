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
                const res = await api.get('/projects/stats');
                const stats = res.data;

                setData({
                    totalProjects: stats.total_projects,
                    avgProgress: Math.round(stats.avg_progress),
                    activeTasks: stats.active_tasks,
                    monthlyActivity: stats.monthly_trends.map(t => ({
                        month: t.month.split('-')[1], // Just show month
                        count: t.count
                    })),
                    topPerforming: stats.top_projects.map(p => ({
                        name: p.name,
                        score: p.progress
                    }))
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
            { Metric: 'Total Projects', Value: data.totalProjects },
            { Metric: 'Average Progress', Value: `${data.avgProgress}%` },
            { Metric: 'Completed Projects', Value: data.completedProjects },
            { Metric: 'Active Projects', Value: data.activeProjects }
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

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
                <Button variant="secondary" onClick={handleExport}>📥 Export Summary</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Projects</p>
                    <p className="text-3xl font-black text-indigo-600 mt-1">{data.totalProjects}</p>
                    <p className="text-xs text-green-500 font-bold mt-2">↑ 12% from last month</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Avg. Completion</p>
                    <p className="text-3xl font-black text-blue-600 mt-1">{data.avgProgress}%</p>
                    <p className="text-xs text-green-500 font-bold mt-2">↑ 5% increase</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Active Tasks</p>
                    <p className="text-3xl font-black text-purple-600 mt-1">{data.activeTasks}</p>
                    <p className="text-xs text-gray-400 font-bold mt-2">Consistent activity</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Efficiency Score</p>
                    <p className="text-3xl font-black text-orange-600 mt-1">92/100</p>
                    <p className="text-xs text-red-500 font-bold mt-2">↓ 2% decrease</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Task Completion Activity - CSS Bar Chart */}
                <Card title="Company Activity (Last 6 Months)">
                    <div className="mt-8 flex items-end justify-between h-64 gap-2">
                        {data.monthlyActivity.map((item, i) => (
                            <div key={item.month} className="flex-1 flex flex-col items-center group relative">
                                <div
                                    className="w-full bg-indigo-500 rounded-t-lg transition-all duration-1000 group-hover:bg-indigo-400 relative"
                                    style={{ height: `${(item.count / 10) * 100}%` }}
                                >
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        {item.count} items
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-gray-500 mt-4 uppercase tracking-tighter">{item.month}</p>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Project Performance Ranking */}
                <Card title="Top Performing Projects">
                    <div className="space-y-6 mt-4">
                        {data.topPerforming.map((p, i) => (
                            <div key={p.name} className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-bold text-gray-700">{p.name}</span>
                                    <span className="text-indigo-600 font-black">{Math.round(p.score)}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 delay-${i * 100} ${i === 0 ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : 'bg-indigo-400'}`}
                                        style={{ width: `${p.score}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                        {data.topPerforming.length === 0 && (
                            <p className="text-gray-400 italic text-center py-10">Create more projects to see rankings</p>
                        )}
                    </div>
                </Card>
            </div>

            {/* Stats Summary Table */}
            <Card title="Performance Breakdown">
                <div className="overflow-x-auto mt-4">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Metrics</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Current Period</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Performance</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Trend</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {[
                                { label: 'Project Turnover', val: 'Low', perf: 'Good', trend: '↑ 5%' },
                                { label: 'Average Task Delay', val: '1.2 days', perf: 'Excellent', trend: '↓ 0.4d' },
                                { label: 'Resource Utilization', val: '84%', perf: 'Normal', trend: '↑ 2%' },
                                { label: 'Error Rate', val: '0.04%', perf: 'Outstanding', trend: '↓ 0.01%' }
                            ].map((row, i) => (
                                <tr key={row.label} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{row.label}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.val}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${row.perf === 'Excellent' || row.perf === 'Outstanding' ? 'bg-green-100 text-green-700' :
                                            row.perf === 'Good' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {row.perf}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600">{row.trend}</td>
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
