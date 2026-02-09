import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useNotification } from '../context/NotificationContext';
import { formatDate } from '../utils/helpers';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteData, setInviteData] = useState({ email: '', role: 'member' });
    const [inviteLoading, setInviteLoading] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, userId: null, userName: '' });
    const { addNotification } = useNotification();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/user/');
            setUsers(res.data);
        } catch (err) {
            addNotification('Failed to fetch users', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        setInviteLoading(true);
        try {
            await api.post('/invite/', inviteData);
            addNotification('Invitation sent successfully!', 'success');
            setIsInviteModalOpen(false);
            setInviteData({ email: '', role: 'member' });
        } catch (err) {
            addNotification(err.response?.data?.detail || 'Failed to send invitation', 'error');
        } finally {
            setInviteLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        try {
            await api.delete(`/user/delete/${deleteModal.userId}`);
            addNotification('User removed from organization', 'success');
            setUsers(users.filter(u => u.id !== deleteModal.userId));
        } catch (err) {
            addNotification(err.response?.data?.detail || 'Failed to delete user', 'error');
        } finally {
            setDeleteModal({ isOpen: false, userId: null, userName: '' });
        }
    };

    const handleRoleUpdate = async (userId, newRole) => {
        try {
            await api.patch(`/user/${userId}/role`, { role: newRole });
            addNotification('User role updated', 'success');
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (err) {
            addNotification(err.response?.data?.detail || 'Failed to update role', 'error');
        }
    };

    if (loading) return <LoadingSpinner className="mt-20" />;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                <Button onClick={() => setIsInviteModalOpen(true)}>+ Invite User</Button>
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">User</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Role</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Joined</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm uppercase">
                                                {user.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900">{user.name}</div>
                                                <div className="text-xs text-gray-400">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <select
                                            className="bg-gray-50 border border-transparent hover:border-indigo-200 text-gray-700 text-xs font-bold uppercase py-1 px-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                            value={user.role}
                                            onChange={(e) => handleRoleUpdate(user.id, e.target.value)}
                                            disabled={user.role === 'owner'}
                                        >
                                            <option value="member">Member</option>
                                            <option value="admin">Admin</option>
                                            {user.role === 'owner' && <option value="owner">Owner</option>}
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-medium">
                                        {formatDate(user.created_at)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        {user.role !== 'owner' && (
                                            <button
                                                onClick={() => setDeleteModal({ isOpen: true, userId: user.id, userName: user.name })}
                                                className="text-gray-300 hover:text-red-500 transition-colors"
                                                title="Delete User"
                                            >
                                                <span className="text-xl">🗑️</span>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Invite Modal */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card title="Invite New Member" className="w-full max-w-md shadow-2xl animate-scale-in">
                        <form onSubmit={handleInvite} className="space-y-4">
                            <Input
                                label="Email Address"
                                type="email"
                                required
                                value={inviteData.email}
                                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                                placeholder="name@company.com"
                            />
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Organization Role</label>
                                <select
                                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    value={inviteData.role}
                                    onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                                >
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <Button variant="secondary" onClick={() => setIsInviteModalOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={inviteLoading}>
                                    {inviteLoading ? 'Sending...' : 'Send Invitation'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            <ConfirmDialog
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={handleDeleteUser}
                title="Remove User"
                message={`Are you sure you want to remove ${deleteModal.userName} from the organization? This will revoke all their access.`}
                danger
            />
        </div>
    );
};

export default Users;
