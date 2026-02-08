import React, { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import Card from '../common/Card';

const CreateTaskModal = ({ isOpen, onClose, onTaskCreated, initialStatus = 'todo' }) => {
    const [task, setTask] = useState({
        title: '',
        description: '',
        priority: 'medium',
        status: initialStatus
    });
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!task.title.trim()) return;

        setLoading(true);
        try {
            await onTaskCreated(task);
            setTask({ title: '', description: '', priority: 'medium', status: initialStatus });
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <Card className="w-full max-w-md shadow-2xl animate-scale-in">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Create New Task</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-2xl">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <Input
                        label="Task Title"
                        placeholder="What needs to be done?"
                        required
                        value={task.title}
                        onChange={(e) => setTask({ ...task, title: e.target.value })}
                    />

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Description</label>
                        <textarea
                            className="w-full text-sm px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all h-28 resize-none bg-gray-50"
                            placeholder="Add more details about this task..."
                            value={task.description}
                            onChange={(e) => setTask({ ...task, description: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Priority</label>
                            <select
                                className="w-full text-sm px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                value={task.priority}
                                onChange={(e) => setTask({ ...task, priority: e.target.value })}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Status</label>
                            <select
                                className="w-full text-sm px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-indigo-600"
                                value={task.status}
                                onChange={(e) => setTask({ ...task, status: e.target.value })}
                            >
                                <option value="todo">To Do</option>
                                <option value="in-progress">In Progress</option>
                                <option value="done">Done</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8 pt-4 border-t border-gray-100">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={loading || !task.title.trim()}
                        >
                            {loading ? 'Creating...' : 'Create Task'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default CreateTaskModal;
