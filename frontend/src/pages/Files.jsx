import React, { useState, useCallback, useMemo, useEffect } from 'react';
import api from '../api/axios';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import SearchBar from '../components/common/SearchBar';
import { useLocalStorage, formatDate } from '../utils/helpers';
import { useNotification } from '../context/NotificationContext';

const FileIcon = ({ name }) => {
    const ext = name.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return <span className="text-red-500 text-2xl">📄</span>;
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return <span className="text-blue-500 text-2xl">🖼️</span>;
    if (['doc', 'docx', 'txt'].includes(ext)) return <span className="text-indigo-500 text-2xl">📝</span>;
    return <span className="text-gray-500 text-2xl">📁</span>;
};

const Files = () => {
    const { addNotification } = useNotification();
    const [viewMode, setViewMode] = useLocalStorage('files_view_mode', 'grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);

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

    const onDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('bg-indigo-50', 'border-indigo-400');
    };

    const onDragLeave = (e) => {
        e.currentTarget.classList.remove('bg-indigo-50', 'border-indigo-400');
    };

    const handleUpload = async (newFiles) => {
        setUploading(true);
        setUploadProgress(10);

        try {
            for (let i = 0; i < newFiles.length; i++) {
                const formData = new FormData();
                formData.append('file', newFiles[i]);

                await api.post('/files/upload', formData, {
                    onUploadProgress: (progressEvent) => {
                        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(progress);
                    }
                });
            }
            addNotification(`${newFiles.length} file(s) uploaded successfully`, 'success');
            fetchFiles();
        } catch (err) {
            addNotification('Failed to upload file', 'error');
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

    const onDrop = (e) => {
        e.preventDefault();
        onDragLeave(e);
        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles.length > 0) {
            handleUpload(droppedFiles);
        }
    };

    const filteredFiles = useMemo(() => {
        return files.filter(f => f.filename.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [files, searchTerm]);

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
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 cursor-pointer shadow-sm transition-all"
                    >
                        📤 Upload Files
                    </label>
                </div>
            </div>

            {/* Drop Zone */}
            <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center transition-all animate-slide-down bg-white shadow-sm"
            >
                <div className="text-5xl mb-4">☁️</div>
                <h3 className="text-lg font-bold text-gray-700">Drag & Drop files here</h3>
                <p className="text-gray-400 text-sm mt-1">Files up to 50MB are supported</p>

                {uploading && (
                    <div className="mt-8 max-w-md mx-auto">
                        <div className="flex justify-between text-xs font-bold text-indigo-600 mb-2 uppercase tracking-widest">
                            <span>Uploading...</span>
                            <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                            <div
                                className="bg-indigo-500 h-full transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Control Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search files..." />

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
                        <div key={file.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-center group animate-scale-in cursor-pointer">
                            <div className="relative mb-3 flex justify-center py-4">
                                <FileIcon name={file.filename} />
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                                    className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                                >×</button>
                            </div>
                            <p className="text-sm font-bold text-gray-700 truncate w-full px-1" title={file.filename}>{file.filename}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-tighter">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">File Name</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Size</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date Uploaded</th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {filteredFiles.map(file => (
                                <tr key={file.id} className="hover:bg-indigo-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <FileIcon name={file.filename} />
                                            <span className="text-sm font-bold text-gray-900">{file.filename}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{(file.size / (1024 * 1024)).toFixed(1)} MB</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-bold uppercase">{formatDate(file.uploaded_at)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(file.id)}
                                            className="text-gray-400 hover:text-red-500 font-bold"
                                        >Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {filteredFiles.length === 0 && (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <p className="text-gray-500 font-medium">No files found matching your criteria</p>
                </div>
            )}
        </div>
    );
};

export default Files;
