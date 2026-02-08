import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { getInitials, getAvatarColor } from '../../utils/helpers';

const Layout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    if (!user) return <Outlet />;

    const navItems = [
        { label: 'Dashboard', path: '/' },
        { label: 'Analytics', path: '/analytics' },
        { label: 'Projects', path: '/projects' },
        { label: 'Files', path: '/files' },
        { label: 'Chat', path: '/chat' },
        { label: 'Organization', path: '/organization' },
        { label: 'Invite', path: '/invite' },
    ];

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <div className={`bg-indigo-900 text-white transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} flex flex-col`}>
                <div className="p-4 flex items-center justify-between border-b border-indigo-800">
                    <h1 className={`font-black text-xl tracking-tighter ${!sidebarOpen && 'hidden'}`}>
                        ANTIGRAVITY <span className="text-indigo-400 text-xs">V2</span>
                    </h1>
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-indigo-800 rounded">
                        {sidebarOpen ? '«' : '»'}
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm hover:bg-indigo-800/50 ${location.pathname === item.path ? 'bg-indigo-800 shadow-lg text-white' : 'text-indigo-300'
                                }`}
                        >
                            <span className="text-lg opacity-50">●</span>
                            <span className={`ml-3 ${!sidebarOpen && 'hidden'} uppercase tracking-widest`}>{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-indigo-800">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-white shadow-lg ${getAvatarColor(user.name || 'User')}`}>
                            {getInitials(user.name || 'User')}
                        </div>
                        <div className={`${!sidebarOpen && 'hidden'} overflow-hidden`}>
                            <p className="text-sm font-bold truncate">{user.name}</p>
                            <p className="text-[10px] text-indigo-400 font-bold uppercase truncate">Administrator</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className={`w-full flex items-center px-4 py-3 rounded-xl bg-indigo-800 hover:bg-red-500/20 hover:text-red-400 transition-all text-xs font-bold uppercase tracking-widest ${!sidebarOpen ? 'justify-center' : ''}`}
                    >
                        <span>Logout</span>
                    </button>
                </div>
            </div>


            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 z-10">
                    <h2 className="text-xl font-semibold text-gray-800">
                        {navItems.find(i => i.path === location.pathname)?.label || 'Overview'}
                    </h2>
                    <div className="flex items-center space-x-4">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                            Organization: <span className="text-indigo-600">{user.company_name}</span>
                        </span>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
