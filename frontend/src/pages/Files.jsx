import React, { useState, useCallback, useMemo, useEffect } from 'react';
import api from '../api/axios';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import SearchBar from '../components/common/SearchBar';
import { useLocalStorage, formatDate } from '../utils/helpers';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const FileIcon = ({ name }) => {
    const ext = name.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return <span className="text-red-500 text-2xl">📄</span>;
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return <span className="text-blue-500 text-2xl">🖼️</span>;
    if (['doc', 'docx'].includes(ext)) return <span className="text-indigo-500 text-2xl">📝</span>;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <span className="text-green-500 text-2xl">📊</span>;
    if (['txt'].includes(ext)) return <span className="text-gray-600 text-2xl">📄</span>;
    return <span className="text-gray-500 text-2xl">📁</span>;
};

const Files = () => {
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const [viewMode, setViewMode] = useLocalStorage('files_view_mode', 'grid');
    const [filterMode, setFilterMode] = useState('all'); // 'all', 'mine', 'shared'
    const [searchTerm, setSearchTerm] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDraggingExisting, setIsDraggingExisting] = useState(null);

    const fetchFiles = useCallback(async () => {
        try {
            const res = await api.get('/files');
            setFiles(res.data);
        } catch (err) {
            addNotification('Failed to load files', 'error');
        } finally {
            setLoading(false);
        }
    }, [addNotification]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    const handleDownload = async (fileId) => {
        try {
            const res = await api.get(`/files/${fileId}/download`);
            window.open(res.data.download_url, '_blank');
        } catch (err) {
            const errorMsg = err.response?.data?.detail || 'Failed to get download link';
            addNotification(errorMsg, 'error');
        }
    };

    const handleToggleShare = async (file, forceState = null) => {
        const shouldShare = forceState !== null ? forceState : !file.is_shared;
        const action = shouldShare ? 'share' : 'unshare';

        // If already in target state, skip
        if (file.is_shared === shouldShare) return;

        try {
            await api.put(`/files/${file.id}/${action}`);
            addNotification(shouldShare ? 'File shared with organization' : 'File is now private', 'success');
            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, is_shared: shouldShare } : f));
        } catch (err) {
            addNotification(`Failed to ${action} file`, 'error');
        }
    };

    const onDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('bg-gray-50', 'border-indigo-400', 'scale-[1.01]');
    };

    const onDragLeave = (e) => {
        e.currentTarget.classList.remove('bg-gray-50', 'border-indigo-400', 'scale-[1.01]');
    };

    const handleUpload = async (newFiles, isShared = false) => {
        setUploading(true);
        setUploadProgress(10);

        try {
            for (let i = 0; i < newFiles.length; i++) {
                const formData = new FormData();
                formData.append('file', newFiles[i]);

                await api.post(`/files/upload?is_shared=${isShared}`, formData, {
                    onUploadProgress: (progressEvent) => {
                        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(progress);
                    }
                });
            }
            addNotification(`${newFiles.length} file(s) uploaded ${isShared ? 'and shared ' : ''}successfully`, 'success');
            fetchFiles();
        } catch (err) {
            const errorMsg = err.response?.data?.detail || 'Failed to upload file';
            addNotification(errorMsg, 'error');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDelete = async (fileId) => {
        if (!window.confirm('Are you sure you want to delete this file?')) return;

        try {
            await api.delete(`/files/${fileId}`);
            addNotification('File deleted successfully', 'success');
            setFiles(prev => prev.filter(f => f.id !== fileId));
        } catch (err) {
            addNotification('Failed to delete file', 'error');
        }
    };

    const onDrop = (e, isShared = false) => {
        e.preventDefault();
        onDragLeave(e);

        // Handle dragging existing file from UI
        if (isDraggingExisting) {
            if (isShared) {
                handleToggleShare(isDraggingExisting, true);
            }
            setIsDraggingExisting(null);
            return;
        }

        // Handle local file drop
        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles.length > 0) {
            handleUpload(droppedFiles, isShared);
        }
    };

    const filteredFiles = useMemo(() => {
        return files.filter(f => {
            const matchesSearch = f.filename.toLowerCase().includes(searchTerm.toLowerCase());
            if (filterMode === 'mine') return matchesSearch && f.user_id === user.id;
            if (filterMode === 'shared') return matchesSearch && f.is_shared;
            return matchesSearch;
        });
    }, [files, searchTerm, filterMode, user.id]);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Files</h1>
                <div className="flex gap-3">
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        multiple
                        onChange={(e) => handleUpload(e.target.files)}
                    />
                    <label
                        htmlFor="file-upload"
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 cursor-pointer shadow-sm transition-all flex items-center gap-2"
                    >
                        <span>📤</span> Upload Files
                    </label>
                </div>
            </div>

            {/* Header Drop Zones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Private Drop Zone */}
                <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => onDrop(e, false)}
                    className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center transition-all animate-slide-down bg-white shadow-sm hover:border-indigo-400 group relative overflow-hidden"
                >
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🔒</div>
                    <h3 className="text-base font-bold text-gray-700">Drop to Keep Private</h3>
                    <p className="text-gray-400 text-xs mt-1 italic">Only visible to you</p>
                </div>

                {/* Shared Drop Zone */}
                <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => onDrop(e, true)}
                    className="border-2 border-dashed border-green-200 rounded-2xl p-10 text-center transition-all animate-slide-down bg-green-50/20 shadow-sm hover:border-green-400 hover:bg-green-50/50 group relative overflow-hidden"
                >
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🌍</div>
                    <h3 className="text-base font-bold text-green-700">Drop to Share</h3>
                    <p className="text-green-600/60 text-xs mt-1 font-medium">Visible to everyone in organization</p>
                    {isDraggingExisting && (
                        <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center animate-pulse">
                            <span className="text-green-600 font-black uppercase tracking-widest text-xs">Share this file</span>
                        </div>
                    )}
                </div>
            </div>

            {uploading && (
                <div className="max-w-md mx-auto bg-white p-4 rounded-xl shadow-lg border border-indigo-100 animate-slide-up">
                    <div className="flex justify-between text-xs font-bold text-indigo-600 mb-2 uppercase tracking-widest">
                        <span>Uploading Files...</span>
                        <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner">
                        <div
                            className="bg-indigo-500 h-full transition-all duration-300 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                            style={{ width: `${uploadProgress}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Control Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-6">
                    <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search files..." />

                    <div className="h-8 w-px bg-gray-100 hidden md:block"></div>

                    <div className="flex gap-1 bg-gray-50 p-1 rounded-lg">
                        {['all', 'mine', 'shared'].map(mode => (
                            <button
                                key={mode}
                                onClick={() => setFilterMode(mode)}
                                className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${filterMode === mode
                                    ? 'bg-white shadow-sm text-indigo-600'
                                    : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>

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
            </div>

            {/* File List */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {filteredFiles.map(file => (
                        <div
                            key={file.id}
                            draggable={file.user_id === user.id}
                            onDragStart={() => setIsDraggingExisting(file)}
                            onDragEnd={() => setIsDraggingExisting(null)}
                            className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-all text-center group animate-scale-in relative ${isDraggingExisting?.id === file.id ? 'opacity-50 scale-95 border-indigo-400 bg-indigo-50/30' : 'cursor-grab active:cursor-grabbing'}`}
                        >
                            {file.is_shared && (
                                <div className="absolute top-2 left-2 text-[8px] font-black uppercase tracking-tighter bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full z-10">
                                    Shared
                                </div>
                            )}
                            <div className="relative mb-3 flex justify-center py-4 pointer-events-none">
                                <FileIcon name={file.filename} />
                                <div className="absolute top-0 right-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                                    {(file.user_id === user.id || user.role === 'admin') && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                                            className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                            title="Delete"
                                        >🗑️</button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDownload(file.id); }}
                                        className="text-gray-300 hover:text-indigo-600 transition-colors p-1"
                                        title="Download"
                                    >⬇️</button>
                                    {file.user_id === user.id && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleToggleShare(file); }}
                                            className={`transition-colors p-1 ${file.is_shared ? 'text-green-500' : 'text-gray-300 hover:text-green-500'}`}
                                            title={file.is_shared ? "Make Private" : "Share"}
                                        >🔗</button>
                                    )}
                                </div>
                            </div>
                            <p className="text-sm font-bold text-gray-700 truncate w-full px-1 pointer-events-none" title={file.filename}>{file.filename}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-tighter pointer-events-none">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">File Name</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Size</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {filteredFiles.map(file => (
                                <tr
                                    key={file.id}
                                    draggable={file.user_id === user.id}
                                    onDragStart={() => setIsDraggingExisting(file)}
                                    onDragEnd={() => setIsDraggingExisting(null)}
                                    className={`hover:bg-indigo-50/50 transition-colors group ${isDraggingExisting?.id === file.id ? 'bg-indigo-50/80' : 'cursor-grab active:cursor-grabbing'}`}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3 pointer-events-none">
                                            <FileIcon name={file.filename} />
                                            <span className="text-sm font-bold text-gray-900">{file.filename}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap pointer-events-none">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${file.is_shared ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                                            {file.is_shared ? 'Shared' : 'Private'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium pointer-events-none">{(file.size / (1024 * 1024)).toFixed(1)} MB</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-bold uppercase pointer-events-none">{formatDate(file.uploaded_at)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleDownload(file.id)}
                                                className="text-indigo-600 font-bold text-xs uppercase tracking-widest hover:underline"
                                            >Download</button>
                                            {file.user_id === user.id && (
                                                <button
                                                    onClick={() => handleToggleShare(file)}
                                                    className="text-green-600 font-bold text-xs uppercase tracking-widest hover:underline"
                                                >{file.is_shared ? 'Unshare' : 'Share'}</button>
                                            )}
                                            {(file.user_id === user.id || user.role === 'admin') && (
                                                <button
                                                    onClick={() => handleDelete(file.id)}
                                                    className="text-red-500 font-bold text-xs uppercase tracking-widest hover:underline"
                                                >Delete</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {filteredFiles.length === 0 && (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <p className="text-gray-500 font-medium uppercase text-xs tracking-widest font-black">No files found</p>
                </div>
            )}
        </div>
    );
};

export default Files;
