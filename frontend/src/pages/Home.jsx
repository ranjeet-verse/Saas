import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    RocketLaunchIcon,
    ShieldCheckIcon,
    BoltIcon,
    ChatBubbleLeftRightIcon,
    ArrowRightIcon,
    CubeIcon,
    CircleStackIcon,
    CommandLineIcon,
    ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/outline';

const Home = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        const handleMouseMove = (e) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('scroll', handleScroll);
        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const features = [
        {
            title: "Real-time Collaboration",
            description: "Chat and work together with your team in real-time with zero latency.",
            icon: <ChatBubbleLeftRightIcon className="w-8 h-8 text-blue-600" />,
        },
        {
            title: "Advanced Analytics",
            description: "Get deep insights into your projects with our powerful analytics engine.",
            icon: <CircleStackIcon className="w-8 h-8 text-purple-600" />,
        },
        {
            title: "Secure by Design",
            description: "Enterprise-grade security to keep your data safe and compliant.",
            icon: <ShieldCheckIcon className="w-8 h-8 text-pink-600" />,
        },
        {
            title: "Ultra Fast",
            description: "Built with the latest technology for a lightning-fast user experience.",
            icon: <BoltIcon className="w-8 h-8 text-amber-500" />,
        },
        {
            title: "Project Management",
            description: "Streamline your workflow with intuitive project tracking tools.",
            icon: <RocketLaunchIcon className="w-8 h-8 text-green-600" />,
        },
        {
            title: "API Support",
            description: "Integrate with your favorite tools using our robust API.",
            icon: <CommandLineIcon className="w-8 h-8 text-indigo-600" />,
        },
    ];

    return (
        <div className="min-h-screen bg-vibrant-light text-slate-900 selection:bg-indigo-100 overflow-hidden font-outfit">
            {/* Interactive Background Blobs */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div
                    className="blob animate-float opacity-40"
                    style={{
                        left: '10%',
                        top: '20%',
                        transform: `translate(${(mousePos.x - window.innerWidth / 2) * 0.05}px, ${(mousePos.y - window.innerHeight / 2) * 0.05}px)`
                    }}
                ></div>
                <div
                    className="blob animate-float opacity-30"
                    style={{
                        right: '10%',
                        bottom: '20%',
                        background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(139, 92, 246, 0.2))',
                        animationDelay: '-2s',
                        transform: `translate(${(mousePos.x - window.innerWidth / 2) * -0.07}px, ${(mousePos.y - window.innerHeight / 2) * -0.07}px)`
                    }}
                ></div>
                <div
                    className="blob animate-float opacity-20"
                    style={{
                        left: '50%',
                        top: '50%',
                        width: '600px',
                        height: '600px',
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.1))',
                        animationDelay: '-5s',
                        transform: `translate(${(mousePos.x - window.innerWidth / 2) * 0.03}px, ${(mousePos.y - window.innerHeight / 2) * 0.03}px)`
                    }}
                ></div>
            </div>

            {/* Navigation */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'glass-light py-3 border-b border-indigo-50/50' : 'py-6'}`}>
                <div className="container mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg transform rotate-12">
                            <CubeIcon className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold tracking-tighter text-indigo-900">ANTIGRAVITY</span>
                    </div>

                    <div className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-600">
                        <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
                        <a href="#about" className="hover:text-blue-600 transition-colors">About</a>
                        <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
                    </div>

                    <div className="flex items-center space-x-4">
                        {user ? (
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => navigate('/app')}
                                    className="btn-premium px-6 py-2"
                                >
                                    Go to App
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-red-600 transition-all"
                                    title="Logout"
                                >
                                    <ArrowLeftOnRectangleIcon className="w-6 h-6" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <Link to="/login" className="px-6 py-2 hover:text-blue-600 transition-colors font-bold text-slate-700">Login</Link>
                                <Link to="/signup" className="btn-premium px-6 py-2">Get Started</Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32">
                <div className="container mx-auto px-6 text-center relative z-10">
                    <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-bold mb-6 animate-fade-in">
                        <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
                        <span className="text-indigo-600 uppercase tracking-widest">Version 2.0 is live</span>
                    </div>

                    <h1 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter animate-scale-in leading-tight text-slate-900">
                        Transcend the <br />
                        <span className="text-gradient">Ordinary.</span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-slate-500 text-lg md:text-xl mb-10 animate-fade-in font-medium">
                        Experience the ultimate productivity engine. Built with precision and a vision to redefine team collaboration.
                    </p>

                    <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-6 animate-fade-in">
                        <Link to="/signup" className="btn-premium flex items-center group w-full md:w-auto justify-center">
                            Launch Your Work
                            <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <button className="glass px-8 py-3 rounded-xl font-bold hover:bg-white transition-all w-full md:w-auto text-slate-700 border border-indigo-100">
                            Explore Features
                        </button>
                    </div>
                </div>

            </section>

            {/* Features Section */}
            <section id="features" className="py-20 relative bg-slate-50/30">
                <div className="container mx-auto px-6 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-6xl font-black mb-4 text-slate-900 tracking-tight">Pure Performance</h2>
                        <p className="text-slate-500 max-w-2xl mx-auto text-lg font-medium">Engineered for teams that demand excellence and refuse to compromise.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="glass p-8 rounded-[2rem] border border-white hover:bg-white hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 group"
                            >
                                <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-gradient-to-br group-hover:from-indigo-600 group-hover:to-blue-600 transition-all duration-500">
                                    <div className="group-hover:text-white transition-colors duration-500">
                                        {feature.icon}
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold mb-3 text-slate-800 tracking-tight">{feature.title}</h3>
                                <p className="text-slate-500 leading-relaxed font-medium">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 relative overflow-hidden">
                <div className="container mx-auto px-6">
                    <div className="glass-light border border-white rounded-[4rem] p-12 md:p-24 text-center relative overflow-hidden shadow-[0_40px_100px_rgba(79,70,229,0.1)] mb-12">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[100px] -mr-64 -mt-64"></div>
                        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-pink-100/50 rounded-full blur-[100px] -ml-64 -mb-64"></div>

                        <h2 className="text-4xl md:text-7xl font-black mb-8 text-slate-900 tracking-tight relative z-10">Ready to start?</h2>
                        <p className="text-slate-500 text-xl mb-12 max-w-2xl mx-auto font-medium relative z-10">Join the elite wave of teams redefining industry standards with Antigravity.</p>
                        <Link to="/signup" className="btn-premium inline-flex items-center text-lg px-12 py-4 relative z-10">
                            Get Started Now
                            <ArrowRightIcon className="w-6 h-6 ml-3" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-16 border-t border-slate-100">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="flex items-center space-x-3 mb-8 md:mb-0">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <CubeIcon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-2xl font-black tracking-tighter uppercase text-indigo-900">ANTIGRAVITY</span>
                        </div>
                        <div className="flex space-x-12 text-sm font-bold text-slate-400">
                            <a href="#" className="hover:text-indigo-600 transition-colors">Privacy</a>
                            <a href="#" className="hover:text-indigo-600 transition-colors">Terms</a>
                            <a href="#" className="hover:text-white transition-colors">
                                <span className="bg-slate-900 p-2 rounded-full text-white inline-block hover:bg-blue-400 transition-colors">
                                    <RocketLaunchIcon className="w-4 h-4" />
                                </span>
                            </a>
                        </div>
                        <div className="mt-8 md:mt-0 text-slate-400 font-bold text-xs uppercase tracking-widest">
                            &copy; 2026 Antigravity Inc.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
