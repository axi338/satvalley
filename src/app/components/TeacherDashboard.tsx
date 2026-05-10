import { useState, useEffect } from 'react';
import {
    Users,
    BarChart3,
    TrendingUp,
    Search,
    ArrowUpRight,
    User as UserIcon,
    MessageSquare
} from 'lucide-react';
import { apiFetch } from '../lib/auth';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';

interface Student {
    id: string;
    full_name: string;
    avatar_url: string | null;
    email: string;
    class_id?: string;
    performance: {
        overall_score: number;
        improvement_percentage: number;
    };
}

interface ClassObj {
    id: string;
    name: string;
}

export function TeacherDashboard({ onMessageStudent }: { onMessageStudent?: (studentId: string) => void }) {
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<ClassObj[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreatingClass, setIsCreatingClass] = useState(false);
    const [newClassName, setNewClassName] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [growthData, setGrowthData] = useState<any[]>([]);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const resp = await apiFetch('/api/teacher/students');
                const data = await resp.json();
                setStudents(data.students || []);
                setClasses(data.classes || []);
                if (data.students?.length > 0) {
                    handleSelectStudent(data.students[0]);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, []);

    const handleCreateClass = async () => {
        if (!newClassName.trim()) return;
        try {
            setIsCreatingClass(true);
            const resp = await apiFetch('/api/teacher/create-class', {
                method: 'POST',
                body: JSON.stringify({ name: newClassName })
            });
            const data = await resp.json();
            if (data.class) {
                setClasses([...classes, data.class]);
                setNewClassName('');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsCreatingClass(false);
        }
    };

    const handleSelectStudent = async (student: Student) => {
        setSelectedStudent(student);
        try {
            const resp = await apiFetch(`/api/performance/growth/${student.id}`);
            const data = await resp.json();
            setGrowthData(data.growth || []);
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="p-8 animate-pulse space-y-8">
        <div className="h-64 bg-white/5 rounded-3xl" />
        <div className="grid grid-cols-3 gap-8">
            <div className="col-span-1 h-96 bg-white/5 rounded-3xl" />
            <div className="col-span-2 h-96 bg-white/5 rounded-3xl" />
        </div>
    </div>;

    return (
        <div className="space-y-8">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-[#0a0f1d]/60 border border-white/10 rounded-3xl backdrop-blur-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl">
                            <Users size={24} />
                        </div>
                        <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-lg">
                            +12% <ArrowUpRight size={14} />
                        </span>
                    </div>
                    <h3 className="text-indigo-200/40 font-black uppercase tracking-widest text-[10px]">Total Students</h3>
                    <div className="text-3xl font-black text-white mt-1">{students.length}</div>
                </div>

                <div className="p-6 bg-[#0a0f1d]/60 border border-white/10 rounded-3xl backdrop-blur-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl">
                            <BarChart3 size={24} />
                        </div>
                        <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-lg">
                            +5.2% <ArrowUpRight size={14} />
                        </span>
                    </div>
                    <h3 className="text-indigo-200/40 font-black uppercase tracking-widest text-[10px]">Avg Proficiency</h3>
                    <div className="text-3xl font-black text-white mt-1">
                        {students.length > 0 ? (students.reduce((acc, s) => acc + s.performance.overall_score, 0) / students.length).toFixed(1) : 0}%
                    </div>
                </div>

                <div className="p-6 bg-[#0a0f1d]/60 border border-white/10 rounded-3xl backdrop-blur-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl">
                            <TrendingUp size={24} />
                        </div>
                        <div className="flex flex-col items-end">
                            {classes.length > 0 ? (
                                <span className="text-white font-mono font-bold text-xs bg-white/5 px-2 py-1 rounded">
                                    ID: {classes[0].id}
                                </span>
                            ) : (
                                <button
                                    onClick={() => setIsCreatingClass(true)}
                                    className="text-[10px] font-black uppercase text-amber-500 hover:text-amber-400"
                                >
                                    + Create Class
                                </button>
                            )}
                        </div>
                    </div>
                    <h3 className="text-indigo-200/40 font-black uppercase tracking-widest text-[10px]">Your Class Registry</h3>
                    <div className="text-xl font-bold text-white mt-1">
                        {classes.length > 0 ? classes[0].name : "No Class Created"}
                    </div>
                </div>
            </div>

            {isCreatingClass && classes.length === 0 && (
                <div className="p-6 bg-indigo-600/10 border border-indigo-500/30 rounded-3xl flex gap-4 items-center animate-in fade-in slide-in-from-top-4">
                    <input
                        type="text"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        placeholder="Class Name (e.g. SAT Math Advanced)"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-indigo-500"
                    />
                    <button
                        onClick={handleCreateClass}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-sm"
                    >
                        Create Class ID
                    </button>
                    <button
                        onClick={() => setIsCreatingClass(false)}
                        className="text-white/40 hover:text-white"
                    >
                        Cancel
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Student List */}
                <div className="lg:col-span-1 bg-[#0a0f1d]/40 border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col h-[600px]">
                    <div className="p-6 border-b border-white/5">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400/40" size={16} />
                            <input
                                type="text"
                                placeholder="Search students..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                        {students.map(student => (
                            <button
                                key={student.id}
                                onClick={() => handleSelectStudent(student)}
                                className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all border ${selectedStudent?.id === student.id
                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20'
                                    : 'bg-white/5 text-indigo-200/60 border-transparent hover:border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                <div className="w-10 h-10 rounded-2xl bg-white/10 overflow-hidden shrink-0">
                                    {student.avatar_url ? (
                                        <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs font-black">
                                            {student.full_name[0]}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-bold text-sm truncate">{student.full_name}</p>
                                    <p className={`text-[10px] font-black uppercase tracking-tighter ${selectedStudent?.id === student.id ? 'text-white/60' : 'text-indigo-400'}`}>
                                        {student.performance.overall_score}% PROFICIENCY
                                    </p>
                                </div>
                                {selectedStudent?.id === student.id && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onMessageStudent?.(student.id);
                                        }}
                                        className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all"
                                    >
                                        <MessageSquare size={16} />
                                    </button>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Growth Analytics */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-[#0a0f1d]/40 border border-white/10 rounded-[2.5rem] p-8 h-full">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                    <TrendingUp className="text-indigo-400" />
                                    Growth Analytics: {selectedStudent?.full_name}
                                </h3>
                                <p className="text-indigo-200/40 text-xs font-bold uppercase tracking-widest mt-1">Historical score progression</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-200/60 hover:text-white transition-all">Export Report</button>
                            </div>
                        </div>

                        <div className="h-[400px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={growthData}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        stroke="#ffffff20"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        dy={10}
                                    />
                                    <YAxis
                                        stroke="#ffffff20"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        domain={[0, 100]}
                                        dx={-10}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#0a0f1d',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '16px',
                                            fontSize: '12px'
                                        }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="score"
                                        stroke="#6366f1"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorScore)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mt-8">
                            <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Predicted Target</h4>
                                <div className="text-2xl font-black text-white">1540 <span className="text-emerald-400 text-sm ml-2">+40 pts</span></div>
                            </div>
                            <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Learning Velocity</h4>
                                <div className="text-2xl font-black text-white">Aggressive</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
