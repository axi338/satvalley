import { useState } from 'react';
import {
    LayoutDashboard,
    BookOpen,
    GraduationCap,
    MessageSquare,
    ChevronRight,
    Search,
    Plus
} from 'lucide-react';
import { TeacherDashboard } from '../TeacherDashboard';

interface TeacherPageProps {
    user: any;
    profile: any;
    onNavigate: (page: string, params?: any) => void;
}

export function TeacherPage({ user, profile, onNavigate }: TeacherPageProps) {
    const [activeTab, setActiveTab] = useState('dashboard');

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'assignments', label: 'Assignments', icon: BookOpen },
        { id: 'classes', label: 'My Classes', icon: GraduationCap },
        { id: 'messages', label: 'Messages', icon: MessageSquare },
    ];

    return (
        <div className="min-h-screen p-8 pt-24 lg:pt-8 bg-transparent">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
                        Teacher Panel
                        <span className="text-xs font-black uppercase tracking-[0.3em] px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full border border-indigo-500/20">
                            Verified
                        </span>
                    </h1>
                    <p className="text-indigo-200/40 font-bold mt-2">Manage your classes, assignments, and track student growth.</p>
                </div>
            </div>

            {/* Sub-navigation Tabs */}
            <div className="flex flex-wrap gap-4 mb-12">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-3 px-6 py-4 rounded-3xl transition-all duration-300 font-bold ${activeTab === tab.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-105'
                                : 'bg-white/5 text-indigo-200/40 border border-white/5 hover:border-white/10 hover:text-white'
                            }`}
                    >
                        <tab.icon size={20} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'dashboard' && (
                    <TeacherDashboard onMessageStudent={(id) => {
                        setActiveTab('messages');
                        // In a real app, we'd pre-select the student in the messages tab
                    }} />
                )}

                {activeTab === 'assignments' && (
                    <div className="p-12 bg-white/5 border border-dashed border-white/10 rounded-[3rem] text-center">
                        <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <BookOpen className="text-indigo-400" size={32} />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Assignment Management</h3>
                        <p className="text-indigo-200/40 max-w-md mx-auto mb-8 font-medium">Create and grade assignments for your students. This feature is being finalized.</p>
                        <button className="bg-indigo-600 text-white px-8 py-4 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:scale-105 transition-all active:scale-95 flex items-center gap-2 mx-auto">
                            <Plus size={18} />
                            Create New Assignment
                        </button>
                    </div>
                )}

                {activeTab === 'classes' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] group hover:border-indigo-500/30 transition-all cursor-pointer">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    <GraduationCap size={24} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">Active</span>
                            </div>
                            <h4 className="text-xl font-bold text-white mb-1">SAT Math Advanced</h4>
                            <p className="text-indigo-200/40 text-xs font-bold uppercase tracking-widest mb-6">Class ID: SAT-X4J9K</p>
                            <div className="flex items-center gap-4 text-sm font-bold text-white/60 group-hover:text-white transition-all">
                                <span>12 Students</span>
                                <span>•</span>
                                <span>4 Assignments</span>
                            </div>
                        </div>

                        <button className="p-8 border-2 border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:border-indigo-500/30 group transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white group-hover:bg-indigo-600 transition-all">
                                <Plus size={24} />
                            </div>
                            <span className="text-sm font-bold text-white/40 group-hover:text-white transition-all uppercase tracking-widest">Create New Class</span>
                        </button>
                    </div>
                )}

                {activeTab === 'messages' && (
                    <div className="p-12 bg-white/5 border border-dashed border-white/10 rounded-[3rem] text-center">
                        <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <MessageSquare className="text-indigo-400" size={32} />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Message Center</h3>
                        <p className="text-indigo-200/40 max-w-md mx-auto mb-8 font-medium">Communicate directly with your students. Chat history and new messages will appear here.</p>
                        <button className="bg-indigo-600 text-white px-8 py-4 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:scale-105 transition-all">Open Global Chat</button>
                    </div>
                )}
            </div>
        </div>
    );
}
