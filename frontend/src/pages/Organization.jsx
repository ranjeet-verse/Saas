import React from 'react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';

const Organization = () => {
    const { user } = useAuth();

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Organization Settings</h1>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <Card title="Organization Details" className="shadow-xl">
                    <div className="space-y-6 py-4">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Company Name</label>
                            <p className="text-2xl font-black text-indigo-900 tracking-tight">{user.company_name}</p>
                        </div>

                        <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Organization ID</label>
                                <p className="font-mono text-gray-600">TEN-00{user.tenant_id}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Status</label>
                                <p className="text-green-500 font-bold uppercase text-xs flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                    Active Platform
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card title="Membership Info" variant="glass">
                    <div className="space-y-6 py-4">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">My Role</label>
                            <p className="inline-flex items-center px-4 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100">
                                {user.role}
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Subscription</label>
                            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                                <div>
                                    <p className="text-indigo-900 font-black">Enterprise Plan</p>
                                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mt-0.5">Renews March 2026</p>
                                </div>
                                <span className="text-indigo-600 font-black text-xl">V2</span>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="border-indigo-100 bg-indigo-50/30 overflow-hidden relative">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 py-4">
                    <div>
                        <h3 className="text-lg font-black text-indigo-900 uppercase tracking-tight">Management Access</h3>
                        <p className="text-sm text-indigo-600/70 font-medium max-w-md mt-1">
                            Administrators can manage the team, invite new members, and control billing and security settings for the entire organization.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Organization;
