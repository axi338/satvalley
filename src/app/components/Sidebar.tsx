import { LayoutDashboard, Compass, Radio, PenTool, BookOpen, GraduationCap, SpellCheck, History, User, LogOut, ChevronLeft, ChevronRight, Award, Home } from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
    onNavigate: (page: string) => void;
    currentPage: string;
    user: any;
    onLogout: () => void;
    isVisible: boolean;
    isCollapsed: boolean;
    onToggleVisibility: () => void;
    onToggleCollapse: () => void;
}

export function Sidebar({
    onNavigate,
    currentPage,
    user,
    onLogout,
    isVisible,
    isCollapsed,
    onToggleVisibility,
    onToggleCollapse
}: SidebarProps) {

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'practice', label: 'DSAT Tests', icon: PenTool },
        { id: 'vocabulary', label: 'Vocabulary', icon: BookOpen },
        { id: 'history', label: 'My Scores', icon: History },
        // { id: 'results', label: 'Hall of Fame', icon: Award },
        // { id: 'calculator', label: 'SAT Calculator', icon: Radio },
        // { id: 'olympiad', label: 'SAT Olympiad', icon: GraduationCap },
    ];

    if (!isVisible) return null;

    return (
        <div className={`fixed left-0 top-0 h-screen bg-[#020617] text-slate-400 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col z-[100] border-r border-white/5 ${isCollapsed ? 'w-20' : 'w-64'}`}>
            {/* User Bar */}
            <div className="p-6 flex items-center justify-between">
                {!isCollapsed ? (
                    <div className="flex items-center gap-4 group">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg rotate-3 group-hover:rotate-0 transition-transform duration-300">
                                {user?.email?.[0].toUpperCase() || 'S'}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-indigo-400 border-2 border-[#020617]" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-black text-sm tracking-tight truncate max-w-[120px]">
                                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Scholar'}
                            </span>
                            <span className="text-[9px] text-indigo-400 font-black uppercase tracking-[0.2em] opacity-60">SatValley</span>
                        </div>
                    </div>
                ) : (
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl mx-auto">
                        {user?.email?.[0].toUpperCase() || 'S'}
                    </div>
                )}
            </div>

            <div className="px-4 mb-4">
                <div className="flex items-center justify-between p-2 rounded-2xl bg-white/5 border border-white/5">
                    <button
                        onClick={onToggleCollapse}
                        className="p-2 rounded-xl hover:bg-indigo-500/10 text-indigo-400 transition-all"
                        title={isCollapsed ? "Expand" : "Collapse"}
                    >
                        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                    {!isCollapsed && (
                        <button
                            onClick={onToggleVisibility}
                            className="px-3 py-1.5 rounded-xl hover:bg-red-500/10 text-xs font-bold text-red-400/60 hover:text-red-400 transition-all"
                        >
                            Hide panel
                        </button>
                    )}
                </div>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto no-scrollbar">
                {navItems.map((item) => {
                    const isActive = currentPage === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={`w-full relative flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${isActive
                                ? 'bg-indigo-600 text-white shadow-[0_8px_20px_rgba(79,70,229,0.25)] scale-[1.02]'
                                : 'hover:bg-white/5 text-slate-400 hover:text-white'
                                }`}
                        >
                            <item.icon size={22} className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'} transition-colors duration-300`} />
                            {!isCollapsed && (
                                <span className="flex-1 text-left font-bold text-sm tracking-wide">{item.label}</span>
                            )}
                            {isActive && !isCollapsed && (
                                <div className="w-1.5 h-1.5 rounded-full bg-white absolute right-4" />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Logout & Home */}
            <div className="p-4 mt-auto space-y-2">
                <button
                    onClick={() => onNavigate('home')}
                    className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all group border border-transparent hover:border-emerald-500/20"
                >
                    <Home size={20} className="group-hover:-translate-x-1 transition-transform" />
                    {!isCollapsed && <span className="font-black text-sm uppercase tracking-widest">Home</span>}
                </button>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all group border border-transparent hover:border-red-500/20"
                >
                    <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                    {!isCollapsed && <span className="font-black text-sm uppercase tracking-widest">Sign Out</span>}
                </button>
            </div>
        </div>
    );
}
