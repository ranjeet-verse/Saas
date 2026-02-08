import React, { useEffect, useState, useMemo } from 'react';
import api from '../api/axios';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import CreateProjectModal from '../components/projects/CreateProjectModal';
import CreateTaskModal from '../components/projects/CreateTaskModal';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/common/SearchBar';
import { useDebounce, useLocalStorage, exportToCSV } from '../utils/helpers';
import { useNotification } from '../context/NotificationContext';

const Projects = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [viewMode, setViewMode] = useLocalStorage('projects_view_mode', 'grid');
    const [taskModal, setTaskModal] = useState({ isOpen: false, projectId: null });

    const debouncedSearch = useDebounce(searchTerm, 300);
    const navigate = useNavigate();
    const { addNotification } = useNotification();

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await api.get('/projects');
            setProjects(res.data);
        } catch (err) {
            addNotification('Failed to fetch projects', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleProjectCreated = (newProject) => {
        setProjects([newProject, ...projects]);
        addNotification('Project created successfully!', 'success');
    };

    const handleTaskCreated = async (taskData) => {
        try {
            await api.post(`/projects/${taskModal.projectId}/task`, taskData);
            addNotification('Task added to project!', 'success');
            // We don't necessarily need to update the project list here unless we show task counts
        } catch (err) {
            addNotification('Failed to create task', 'error');
            throw err;
        }
    };

    const filteredProjects = useMemo(() => {
        let filtered = projects.filter(p =>
            p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            p.description.toLowerCase().includes(debouncedSearch.toLowerCase())
        );

        return filtered.sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'progress') return b.progress - a.progress;
            if (sortBy === 'date') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
            return 0;
        });
    }, [projects, debouncedSearch, sortBy]);

    const handleExport = () => {
        const dataToExport = projects.map(p => ({
            Name: p.name,
            Description: p.description,
            Progress: `${p.progress}%`,
            Status: p.progress === 100 ? 'Completed' : 'Active'
        }));
        exportToCSV(dataToExport, 'my_projects.csv');
        addNotification('Projects exported to CSV', 'success');
    };

    if (loading) return <LoadingSpinner className="mt-20" />;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="secondary" onClick={handleExport} className="flex items-center gap-2">
                        📥 Export CSV
                    </Button>
                    <Button onClick={() => setIsModalOpen(true)}>+ New Project</Button>
                </div>
            </div>

            {/* Filters & Toggles */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row justify-between items-center gap-4">
                <SearchBar value={searchTerm} onChange={setSearchTerm} />

                <div className="flex items-center gap-4 w-full lg:w-auto">
                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Grid
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            List
                        </button>
                    </div>

                    <select
                        className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 transition-all outline-none"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="name">Sort by Name</option>
                        <option value="progress">Sort by Progress</option>
                        <option value="date">Sort by Date</option>
                    </select>
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map(project => (
                        <Card
                            key={project.id}
                            hover
                            onClick={() => navigate(`/projects/${project.id}`)}
                            className="group animate-scale-in"
                        >
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight truncate flex-1 pr-4">{project.name}</h4>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setTaskModal({ isOpen: true, projectId: project.id });
                                        }}
                                        className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                        title="Add Task"
                                    >
                                        +
                                    </button>
                                    <div className={`w-3 h-3 rounded-full ${project.progress === 100 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]'}`}></div>
                                </div>
                            </div>
                            <p className="text-gray-500 mt-3 line-clamp-2 h-10 text-sm leading-relaxed">{project.description}</p>

                            <div className="mt-8">
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                                    <span>Progress</span>
                                    <span>{project.progress}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ease-out ${project.progress === 100 ? 'bg-green-500' : 'bg-indigo-600'}`}
                                        style={{ width: `${project.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Project Name</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Progress</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {filteredProjects.map(project => (
                                <tr
                                    key={project.id}
                                    onClick={() => navigate(`/projects/${project.id}`)}
                                    className="hover:bg-indigo-50 transition-colors cursor-pointer"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-gray-900">{project.name}</div>
                                    </td>
                                    <td className="px-6 py-4 max-w-[400px]">
                                        <div className="text-sm text-gray-500 truncate">{project.description}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap min-w-[150px]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${project.progress}%` }}></div>
                                            </div>
                                            <span className="text-sm text-gray-600 font-medium">{project.progress}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setTaskModal({ isOpen: true, projectId: project.id });
                                                }}
                                                className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold uppercase hover:bg-indigo-600 hover:text-white transition-all"
                                            >
                                                + Add Task
                                            </button>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${project.progress === 100 ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                {project.progress === 100 ? 'Completed' : 'Active'}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {filteredProjects.length === 0 && (
                <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-200 animate-fade-in shadow-sm">
                    <div className="text-4xl mb-4">📭</div>
                    <p className="text-gray-500 text-lg font-medium">No projects found</p>
                    <p className="text-gray-400 text-sm mb-6">Try adjusting your search or create a new project</p>
                    <Button onClick={() => setIsModalOpen(true)}>Create Project</Button>
                </div>
            )}

            <CreateProjectModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onProjectCreated={handleProjectCreated}
            />

            <CreateTaskModal
                isOpen={taskModal.isOpen}
                onClose={() => setTaskModal({ isOpen: false, projectId: null })}
                onTaskCreated={handleTaskCreated}
            />
        </div>
    );
};

export default Projects;

