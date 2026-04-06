import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchAssignments } from '../../store/classSlice';
import { setPerformance, setTodos } from '../../store/performanceSlice';
import { io } from 'socket.io-client';
import {
    ClipboardList,
    Trophy,
    MessageSquare,
    BarChart3,
    CheckCircle2,
    Clock,
    Plus,
    Loader2,
    Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { ClassChat } from '../ClassChat';
import { ClassLeaderboard } from '../ClassLeaderboard';
import { ClassPerformance } from '../ClassPerformance';
import { TeacherDashboard } from '../TeacherDashboard';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000');

interface ClassDashboardPageProps {
    user: any;
    profile: any;
    onNavigate: (page: string, params?: any) => void;
    onProfileUpdate?: () => void;
}

export function ClassDashboardPage({ user, profile, onNavigate, onProfileUpdate }: ClassDashboardPageProps) {
    const [activeTab, setActiveTab] = useState<'homework' | 'leaderboard' | 'messages' | 'stats'>('homework');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDueDate, setNewDueDate] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [joinClassId, setJoinClassId] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

    const dispatch = useAppDispatch();
    const { assignments, loading } = useAppSelector(state => state.class);
    const { todos } = useAppSelector(state => state.performance);

    const isAdmin = profile?.is_admin === true ||
        profile?.raw_app_metadata?.admin === true ||
        profile?.email?.includes('admin') ||
        profile?.email === 'ibrohim@example.com' ||
        profile?.is_teacher === true;

    useEffect(() => {
        dispatch(fetchAssignments());

        const fetchStats = async () => {
            try {
                const token = (await (window as any).supabase.auth.getSession()).data.session?.access_token;
                const headers = { 'Authorization': `Bearer ${token}` };

                const [perfResp, todoResp] = await Promise.all([
                    fetch(`/api/performance/${user.id}`, { headers }),
                    fetch(`/api/todo/${user.id}`, { headers })
                ]);

                if (perfResp.ok) {
                    const perfData = await perfResp.json();
                    if (perfData.performance) dispatch(setPerformance(perfData.performance));
                }
                if (todoResp.ok) {
                    const todoData = await todoResp.json();
                    dispatch(setTodos(todoData.todos || []));
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchStats();

        socket.emit('join', user.id);

        socket.on('new_assignment', (data) => {
            toast.success(`New Assignment: ${data.title}`);
            dispatch(fetchAssignments());
        });

        socket.on('assignment_graded', (data) => {
            toast.info(`Assignment Graded! Your score: ${data.score}`);
        });

        return () => {
            socket.off('new_assignment');
            socket.off('assignment_graded');
        };
    }, [dispatch, user.id]);

    const handleCreateAssignment = async () => {
        if (!newTitle || !newDueDate) return;
        try {
            const token = (await (window as any).supabase.auth.getSession()).data.session?.access_token;
            const resp = await fetch('/api/assignments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: newTitle,
                    due_date: newDueDate,
                    total_marks: 100
                })
            });
            if (resp.ok) {
                toast.success("Assignment created!");
                setShowCreateModal(false);
                dispatch(fetchAssignments());
            }
        } catch (err) {
            toast.error("Failed to create assignment");
        }
    };

    const handleJoinClass = async () => {
        if (!joinClassId.trim()) return;
        try {
            setIsJoining(true);
            const token = (await (window as any).supabase.auth.getSession()).data.session?.access_token;
            const resp = await fetch('/api/student/join-class', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ class_id: joinClassId })
            });
            const data = await resp.json();
            if (resp.ok) {
                toast.success('Successfully joined class!');
                if (onProfileUpdate) onProfileUpdate();
            } else {
                toast.error(data.error || 'Failed to join class');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsJoining(false);
        }
    };



    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center bg-[#0a0f1d]/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl">
                <div>
                    <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                        Premium Class Section
                    </h1>
                    <p className="text-indigo-200/60 mt-2 font-medium">Welcome back, {profile?.full_name || 'Student'}</p>
                </div>
                <div className="flex gap-4">
                    {isAdmin && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center gap-2"
                        >
                            <Plus size={18} />
                            Assign Homework
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1.5 bg-[#0a0f1d]/40 backdrop-blur-md border border-white/5 rounded-2xl w-fit">
                {[
                    { id: 'homework', icon: ClipboardList, label: 'Homework' },
                    { id: 'stats', icon: BarChart3, label: 'Performance' },
                    { id: 'leaderboard', icon: Trophy, label: 'Rankings' },
                    { id: 'messages', icon: MessageSquare, label: 'Chat' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === tab.id
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                            : 'text-indigo-200/40 hover:text-indigo-200/60 hover:bg-white/5'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {activeTab === 'homework' && (
                        <div className="bg-[#0a0f1d]/40 border border-white/10 rounded-3xl p-8 min-h-[400px]">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                <ClipboardList className="text-indigo-400" />
                                Active Assignments
                            </h2>
                            {loading ? (
                                <div className="animate-pulse space-y-4">
                                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white/5 rounded-2xl" />)}
                                </div>
                            ) : assignments.length > 0 ? (
                                <div className="space-y-4">
                                    {assignments.map((assignment) => (
                                        <div key={assignment.id} className="p-6 bg-white/5 border border-white/5 rounded-2xl hover:border-indigo-500/30 transition-all group">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors uppercase tracking-wider">{assignment.title}</h3>
                                                    <div className="flex items-center gap-4 mt-2 text-sm text-indigo-200/40">
                                                        <span className="flex items-center gap-1.5 font-bold"><Clock size={14} /> Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                                                        <span className="flex items-center gap-1.5 font-bold"><CheckCircle2 size={14} /> {assignment.total_marks} Marks</span>
                                                    </div>
                                                </div>
                                                <button className="px-5 py-2 bg-white/5 hover:bg-indigo-600 text-white rounded-xl text-sm font-black transition-all border border-white/10 active:scale-95">
                                                    {isAdmin ? 'View Submissions' : 'Submit Task'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-indigo-200/20">
                                    <ClipboardList size={64} strokeWidth={1} />
                                    <p className="mt-4 font-bold uppercase tracking-widest text-xs">No active assignments</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'stats' && (isAdmin ? (
                        <TeacherDashboard onMessageStudent={(id) => {
                            setSelectedStudentId(id);
                            setActiveTab('messages');
                        }} />
                    ) : <ClassPerformance />)}
                    {activeTab === 'leaderboard' && <ClassLeaderboard />}
                    {activeTab === 'messages' && <ClassChat user={user} profile={profile} initialSelectedUserId={selectedStudentId} />}
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    {/* Exam Countdown */}
                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                            <Clock size={120} strokeWidth={1} />
                        </div>
                        <h3 className="text-indigo-100/60 font-black uppercase tracking-widest text-xs mb-2">Next Exam Countdown</h3>
                        <div className="text-5xl font-black text-white mb-2 tabular-nums">14:02:45</div>
                        <p className="text-indigo-100/80 font-bold uppercase tracking-wider text-xs">Subject: Digital SAT 2026</p>
                    </div>

                    {/* Student To-Do List */}
                    <div className="bg-[#0a0f1d]/40 border border-white/10 p-8 rounded-3xl">
                        <h3 className="text-white font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                            <ClipboardList size={16} className="text-indigo-400" /> My Tasks
                        </h3>
                        <div className="space-y-3">
                            {todos.length > 0 ? todos.map(todo => (
                                <div key={todo.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                    <div className={`w-2 h-2 rounded-full ${todo.completed ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    <span className={`text-xs font-bold ${todo.completed ? 'text-indigo-200/40 line-through' : 'text-indigo-100'}`}>
                                        {todo.task}
                                    </span>
                                </div>
                            )) : (
                                <p className="text-[10px] text-indigo-200/20 font-bold uppercase tracking-widest text-center py-4">All caught up!</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Assignment Modal (Quick & Dirty Implementation) */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-md" onClick={() => setShowCreateModal(false)} />
                    <div className="relative bg-[#0a0f1d] border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl">
                        <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-wider">New Homework</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 block">Title</label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="e.g. Algebra Module 2"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 block">Due Date</label>
                                <input
                                    type="date"
                                    value={newDueDate}
                                    onChange={(e) => setNewDueDate(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-bold"
                                />
                            </div>
                            <div className="pt-4 flex gap-4">
                                <button
                                    onClick={handleCreateAssignment}
                                    className="flex-1 px-6 py-3 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                                >
                                    Create Task
                                </button>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-6 py-3 bg-white/5 text-white/60 font-black uppercase tracking-widest text-xs rounded-xl hover:bg-white/10 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
