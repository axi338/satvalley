import { useState, useEffect } from 'react';
import { Trophy, Calendar, Plus, Users, Layout, Search, ArrowRight, ArrowLeft, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function OlympiadAdminPage({ embedded = false }: { embedded?: boolean }) {
    const [activeTab, setActiveTab] = useState('overview');
    const [tests, setTests] = useState<any[]>([]);
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [siteContent, setSiteContent] = useState<any>({
        home_olympiad_title: '',
        home_olympiad_subtitle: '',
        home_olympiad_desc: ''
    });

    // Test Creation
    const [newOlympiad, setNewOlympiad] = useState({
        title: '',
        description: '',
        start_date: '',
        end_date: ''
    });

    // Question Manager
    const [selectedTestForQuestions, setSelectedTestForQuestions] = useState<string | null>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [qLoading, setQLoading] = useState(false);

    // Edit Mode
    const [editingTestId, setEditingTestId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<any>({});

    const apiBase = (import.meta as any).env?.VITE_BACKEND_URL || '';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch Olympiad Tests
            const testsRes = await fetch(`${apiBase}/api/tests?isOlympiad=true`).then(r => r.json());
            setTests(testsRes.tests || []);

            // TODO: Add endpoint to fetch all registrations if needed, or fetch per test
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const loadSiteContent = async () => {
        try {
            const res = await fetch(`${apiBase}/api/content`).then(r => r.json());
            setSiteContent(res.content || {});
        } catch (e) {
            console.error("Failed to load content", e);
        }
    };

    const saveSiteContent = async () => {
        if (!confirm("Save changes to live site?")) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) return;

            const res = await fetch(`${apiBase}/api/content`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(siteContent)
            });

            if (res.ok) alert("Site Content Updated");
            else alert("Failed to update");
        } catch (e) {
            alert("Error updating content");
        }
    };

    const loadQuestions = async (testId: string) => {
        setQLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) return;

            // Fetch questions for this test
            // Note: ensure backend supports filtering by testId for admin
            const res = await fetch(`${apiBase}/api/questions?testId=${testId}`, {
                headers: { Authorization: `Bearer ${token}` }
            }).then(r => r.json());

            // Backend might return object with questions or just array
            setQuestions(res.questions || []);
        } catch (e) {
            console.error(e);
        } finally {
            setQLoading(false);
        }
    };

    const loadRegistrations = async (testId?: string) => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) return;

            const url = `${apiBase}/api/olympiad/registrations${testId ? `?testId=${testId}` : ''}`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            }).then(r => r.json());

            setRegistrations(res.registrations || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOlympiad = async () => {
        if (!newOlympiad.title || !newOlympiad.end_date) {
            alert("Title and End Date are required");
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) return;

            const res = await fetch(`${apiBase}/api/tests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: newOlympiad.title,
                    description: newOlympiad.description,
                    is_olympiad: true,
                    olympiad_end_date: new Date(newOlympiad.end_date).toISOString(),
                    olympiad_start_date: newOlympiad.start_date ? new Date(newOlympiad.start_date).toISOString() : new Date().toISOString(),
                    status: 'draft',
                    difficulty: 'Hard', // Olympiads are hard by default
                    sections: ['Math: 22Q'] // STRICTLY MATH ONLY FOR OLYMPIAD
                })
            });

            if (res.ok) {
                alert("Olympiad Created Successfully");
                setNewOlympiad({ title: '', description: '', start_date: '', end_date: '' });
                loadData();
            } else {
                const errData = await res.json();
                throw new Error(errData.message || "Failed to create");
            }
        } catch (e: any) {
            alert(`Error creating Olympiad: ${e.message}`);
        }
    };

    const handleUpdateOlympiad = async (testId: string) => {
        if (!editForm.title || !editForm.olympiad_end_date) {
            alert("Title and End Date are required");
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) return;

            const res = await fetch(`${apiBase}/api/tests/${testId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: editForm.title,
                    description: editForm.description,
                    olympiad_start_date: editForm.olympiad_start_date ? new Date(editForm.olympiad_start_date).toISOString() : undefined,
                    olympiad_end_date: new Date(editForm.olympiad_end_date).toISOString()
                })
            });

            if (res.ok) {
                alert("Olympiad Updated Successfully");
                setEditingTestId(null);
                setEditForm({});
                loadData();
            } else {
                const errData = await res.json();
                throw new Error(errData.message || "Failed to update");
            }
        } catch (e: any) {
            alert(`Error updating Olympiad: ${e.message}`);
        }
    };


    return (
        <div className={embedded ? "w-full min-h-[600px]" : "min-h-screen bg-black text-white selection:bg-indigo-500/30 font-sans"}>
            <div className={embedded ? "flex flex-col lg:flex-row gap-8" : "flex h-screen overflow-hidden"}>
                {/* Sidebar / Navigation */}
                <div className={embedded ? "w-full lg:w-64 flex-shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto" : "w-64 bg-zinc-900/50 border-r border-white/5 flex flex-col p-6 gap-2"}>
                    {!embedded && (
                        <div className="flex items-center gap-3 px-2 mb-8">
                            <div className="w-8 h-8 rounded bg-indigo-500 flex items-center justify-center">
                                <Trophy className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-bold tracking-tight">Olympiad<span className="text-zinc-500">Admin</span></span>
                        </div>
                    )}

                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Layout className="w-4 h-4" /> Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'create' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Plus className="w-4 h-4" /> Create Event
                    </button>
                    <button
                        onClick={() => setActiveTab('questions')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'questions' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Layout className="w-4 h-4" /> Manage Items
                    </button>
                    <button
                        onClick={() => setActiveTab('registrations')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'registrations' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Users className="w-4 h-4" /> Registrations
                    </button>
                    <button
                        onClick={() => { setActiveTab('content'); loadSiteContent(); }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'content' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Layout className="w-4 h-4" /> Site Content
                    </button>

                    {!embedded && (
                        <div className="mt-auto">
                            <a href="/" className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-500 hover:text-white transition-colors">
                                <ArrowLeft className="w-4 h-4" /> Return to App
                            </a>
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className={embedded ? "flex-1" : "flex-1 overflow-y-auto p-12"}>
                    {activeTab === 'overview' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-3xl font-black tracking-tighter mb-2">Event Overview</h1>
                                    <p className="text-zinc-400">Manage your active Olympiad nodes.</p>
                                </div>
                                <button onClick={() => setActiveTab('create')} className="px-6 py-3 bg-white text-black hover:bg-indigo-500 hover:text-white rounded-full text-xs font-black uppercase tracking-widest transition-all">
                                    + New Node
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {tests.map(test => {
                                    const isEditing = editingTestId === test.id;

                                    return (
                                        <div key={test.id} className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-indigo-500/30 transition-all group">
                                            <div className="flex items-start justify-between mb-6">
                                                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                                    <Trophy className="w-6 h-6" />
                                                </div>
                                                <span className="px-2 py-1 rounded-md bg-white/5 text-[10px] font-mono text-zinc-400 border border-white/5">
                                                    {test.id.slice(0, 6)}
                                                </span>
                                            </div>

                                            {isEditing ? (
                                                <div className="space-y-4 mb-6">
                                                    <input
                                                        value={editForm.title || ''}
                                                        onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                                                        placeholder="Title"
                                                    />
                                                    <textarea
                                                        value={editForm.description || ''}
                                                        onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 h-20 resize-none"
                                                        placeholder="Description"
                                                    />
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Start Date</label>
                                                        <input
                                                            type="datetime-local"
                                                            value={editForm.olympiad_start_date || ''}
                                                            onChange={e => setEditForm({ ...editForm, olympiad_start_date: e.target.value })}
                                                            className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">End Date</label>
                                                        <input
                                                            type="datetime-local"
                                                            value={editForm.olympiad_end_date || ''}
                                                            onChange={e => setEditForm({ ...editForm, olympiad_end_date: e.target.value })}
                                                            className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2 pt-2">
                                                        <button
                                                            onClick={() => handleUpdateOlympiad(test.id)}
                                                            className="flex-1 py-2 bg-indigo-500 text-white hover:bg-indigo-400 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingTestId(null);
                                                                setEditForm({});
                                                            }}
                                                            className="flex-1 py-2 bg-white/5 text-white hover:bg-white/10 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <h3 className="text-xl font-bold mb-2">{test.title}</h3>
                                                    <p className="text-sm text-zinc-500 mb-6 line-clamp-2">{test.description || "No description provided."}</p>
                                                </>
                                            )}

                                            <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 border-t border-white/5 pt-4">
                                                {!isEditing && (
                                                    <>
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="w-3 h-3" />
                                                            <span>Ends: {new Date(test.olympiad_end_date).toLocaleDateString()}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setEditingTestId(test.id);
                                                                setEditForm({
                                                                    title: test.title,
                                                                    description: test.description,
                                                                    olympiad_start_date: test.olympiad_start_date ? new Date(test.olympiad_start_date).toISOString().slice(0, 16) : '',
                                                                    olympiad_end_date: new Date(test.olympiad_end_date).toISOString().slice(0, 16)
                                                                });
                                                            }}
                                                            className="ml-auto px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                                                        >
                                                            Edit
                                                        </button>
                                                    </>
                                                )}
                                                <div className="flex items-center gap-2 ml-auto">
                                                    <select
                                                        value={test.status || 'draft'}
                                                        onChange={async (e) => {
                                                            const newStatus = e.target.value;
                                                            if (!confirm(`Change status to ${newStatus}?`)) return;
                                                            try {
                                                                const { data: { session } } = await supabase.auth.getSession();
                                                                const token = session?.access_token;
                                                                await fetch(`${apiBase}/api/tests/${test.id}`, {
                                                                    method: 'PUT',
                                                                    headers: {
                                                                        'Content-Type': 'application/json',
                                                                        'Authorization': `Bearer ${token}`
                                                                    },
                                                                    body: JSON.stringify({ status: newStatus })
                                                                });
                                                                loadData();
                                                            } catch (err) {
                                                                alert("Failed to update status");
                                                            }
                                                        }}
                                                        className={`text-[10px] uppercase font-bold px-2 py-1 rounded border bg-black ${test.status === 'published' ? 'text-emerald-400 border-emerald-500/50' :
                                                            test.status === 'archived' ? 'text-red-400 border-red-500/50' :
                                                                'text-zinc-400 border-zinc-700'
                                                            }`}
                                                    >
                                                        <option value="draft">Draft</option>
                                                        <option value="published">Published</option>
                                                        <option value="archived">Archived</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'create' && (
                        <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <h1 className="text-3xl font-black tracking-tighter mb-2">Create Olympiad Node</h1>
                                <p className="text-zinc-400">Initialize a new competitive event.</p>
                            </div>

                            <div className="space-y-6 p-8 rounded-3xl bg-zinc-900/30 border border-white/5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Event Title</label>
                                    <input
                                        type="text"
                                        value={newOlympiad.title}
                                        onChange={e => setNewOlympiad({ ...newOlympiad, title: e.target.value })}
                                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500/50 transition-colors"
                                        placeholder="e.g. Winter Solstice Championship"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Description</label>
                                    <textarea
                                        value={newOlympiad.description}
                                        onChange={e => setNewOlympiad({ ...newOlympiad, description: e.target.value })}
                                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 h-32 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                                        placeholder="Brief description of the event..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Termination Date</label>
                                    <input
                                        type="datetime-local"
                                        value={newOlympiad.end_date}
                                        onChange={e => setNewOlympiad({ ...newOlympiad, end_date: e.target.value })}
                                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500/50 transition-colors text-white"
                                    />
                                </div>

                                <div className="pt-4">
                                    <button
                                        onClick={handleCreateOlympiad}
                                        className="w-full py-4 bg-white text-black hover:bg-indigo-500 hover:text-white rounded-xl font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" /> Initialize Node
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'questions' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <h1 className="text-3xl font-black tracking-tighter mb-2">Item Manager</h1>
                                <p className="text-zinc-400">Add questions strictly for Math modules.</p>
                            </div>

                            <div className="space-y-6">
                                {/* Node Selector */}
                                <div className="p-8 rounded-3xl bg-zinc-900/30 border border-white/5">
                                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-4">Select Active Node</p>
                                    <div className="flex gap-4 overflow-x-auto pb-4">
                                        {tests.map(t => (
                                            <button
                                                key={t.id}
                                                className={`px-6 py-4 rounded-xl border text-left min-w-[200px] transition-all group ${selectedTestForQuestions === t.id ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                                onClick={() => {
                                                    setSelectedTestForQuestions(t.id);
                                                    loadQuestions(t.id);
                                                }}
                                            >
                                                <span className={`block text-xs font-bold mb-1 transition-colors ${selectedTestForQuestions === t.id ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-white'}`}>Node ID: {t.id.slice(0, 6)}</span>
                                                <span className="block font-bold text-white">{t.title}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Editor */}
                                {selectedTestForQuestions && (
                                    <QuestionEditor
                                        testId={selectedTestForQuestions}
                                        apiBase={apiBase}
                                        onUpdate={() => loadQuestions(selectedTestForQuestions)}
                                        questions={questions}
                                        loading={qLoading}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'content' && (
                        <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <h1 className="text-3xl font-black tracking-tighter mb-2">Site Content Editor</h1>
                                <p className="text-zinc-400">Manage dynamic text on public pages.</p>
                            </div>

                            <div className="space-y-6 p-8 rounded-3xl bg-zinc-900/30 border border-white/5">
                                <h3 className="font-bold text-white mb-4">HomePage Olympiad Promo</h3>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Title</label>
                                    <input
                                        value={siteContent.home_olympiad_title || ''}
                                        onChange={e => setSiteContent({ ...siteContent, home_olympiad_title: e.target.value })}
                                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50"
                                        placeholder="SAT Olympiad"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Subtitle</label>
                                    <input
                                        value={siteContent.home_olympiad_subtitle || ''}
                                        onChange={e => setSiteContent({ ...siteContent, home_olympiad_subtitle: e.target.value })}
                                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50"
                                        placeholder="Season One."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Description</label>
                                    <textarea
                                        value={siteContent.home_olympiad_desc || ''}
                                        onChange={e => setSiteContent({ ...siteContent, home_olympiad_desc: e.target.value })}
                                        className="w-full h-32 bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 resize-none"
                                        placeholder="Compete against..."
                                    />
                                </div>

                                <button
                                    onClick={saveSiteContent}
                                    className="w-full py-4 bg-white text-black hover:bg-indigo-500 hover:text-white rounded-xl font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'registrations' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <h1 className="text-3xl font-black tracking-tighter mb-2">Registrations</h1>
                                <p className="text-zinc-400">Global participant tracking.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="p-6 rounded-2xl bg-zinc-900/30 border border-white/5">
                                    <div className="flex gap-4 mb-4 overflow-x-auto pb-2">
                                        <button
                                            onClick={() => loadRegistrations()}
                                            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap"
                                        >
                                            <RefreshCw className="w-3 h-3" /> Refresh All
                                        </button>
                                        {tests.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => loadRegistrations(t.id)}
                                                className="px-4 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider whitespace-nowrap border border-indigo-500/20"
                                            >
                                                {t.title}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="overflow-hidden rounded-xl border border-white/5">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-white/5 text-zinc-400 font-bold uppercase text-xs tracking-wider">
                                                <tr>
                                                    <th className="p-4">Competitor</th>
                                                    <th className="p-4">Contact</th>
                                                    <th className="p-4">Event ID</th>
                                                    <th className="p-4">Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {registrations.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="p-8 text-center text-zinc-500">No registrations found.</td>
                                                    </tr>
                                                ) : (
                                                    registrations.map((reg) => (
                                                        <tr key={reg.id} className="hover:bg-white/5 transition-colors">
                                                            <td className="p-4">
                                                                <div className="font-medium text-white">{reg.full_name || "Name Missing"}</div>
                                                                <div className="text-[10px] text-zinc-500 font-mono">{reg.user_email}</div>
                                                            </td>
                                                            <td className="p-4 text-zinc-400 text-xs">{reg.phone || "No Phone"}</td>
                                                            <td className="p-4 text-zinc-400 font-mono text-xs">{reg.test_id.slice(0, 8)}</td>
                                                            <td className="p-4 text-zinc-500 text-xs">{new Date(reg.registered_at).toLocaleDateString()}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function QuestionEditor({ testId, apiBase, onUpdate, questions, loading }: { testId: string, apiBase: string, onUpdate: () => void, questions: any[], loading: boolean }) {
    const [qText, setQText] = useState('');
    const [optionA, setOptionA] = useState('');
    const [optionB, setOptionB] = useState('');
    const [optionC, setOptionC] = useState('');
    const [optionD, setOptionD] = useState('');
    const [correctAnswer, setCorrectAnswer] = useState('A');
    const [module, setModule] = useState('math-m1');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!qText || !optionA || !optionB || !optionC || !optionD) return alert("Fill all fields");

        setSubmitting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) return;

            const res = await fetch(`${apiBase}/api/questions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    test_id: testId,
                    question_text: qText,
                    option_a: optionA,
                    option_b: optionB,
                    option_c: optionC,
                    option_d: optionD,
                    correct_answer: correctAnswer,
                    section: 'math',
                    module: module,
                    difficulty: 'hard' // Olympiad default
                })
            });

            if (res.ok) {
                alert("Saved!");
                setQText('');
                setOptionA('');
                setOptionB('');
                setOptionC('');
                setOptionD('');
                onUpdate();
            } else {
                alert("Failed");
            }
        } catch (e) {
            console.error(e);
            alert("Error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6 p-8 rounded-3xl bg-zinc-900/30 border border-white/5 h-fit">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white">Add New Item</h3>
                    <div className="flex gap-2">
                        <select value={module} onChange={e => setModule(e.target.value)} className="bg-black border border-white/10 rounded-lg px-3 py-1 text-xs text-white focus:outline-none">
                            <option value="math-m1">Math Module 1</option>
                            <option value="math-m2">Math Module 2</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Question Stem</label>
                        <textarea value={qText} onChange={e => setQText(e.target.value)} className="w-full h-32 bg-black border border-white/10 rounded-xl p-4 text-sm focus:border-indigo-500/50 focus:outline-none transition-colors" placeholder="Enter LaTeX or plain text..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {['A', 'B', 'C', 'D'].map(opt => (
                            <div key={opt}>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Option {opt}</label>
                                    <button
                                        onClick={() => setCorrectAnswer(opt)}
                                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${correctAnswer === opt ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-700 hover:border-zinc-500'}`}
                                    >
                                        {correctAnswer === opt && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                    </button>
                                </div>
                                <input
                                    value={opt === 'A' ? optionA : opt === 'B' ? optionB : opt === 'C' ? optionC : optionD}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (opt === 'A') setOptionA(val);
                                        if (opt === 'B') setOptionB(val);
                                        if (opt === 'C') setOptionC(val);
                                        if (opt === 'D') setOptionD(val);
                                    }}
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500/50 focus:outline-none transition-colors"
                                />
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full py-4 bg-white text-black hover:bg-indigo-500 hover:text-white rounded-xl font-bold uppercase tracking-widest transition-all mt-4 flex items-center justify-center gap-2"
                    >
                        {submitting ? <span className="animate-spin w-4 h-4 border-2 border-zinc-300 border-t-zinc-900 rounded-full" /> : <Plus className="w-4 h-4" />}
                        Add Item to Database
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                <h3 className="font-bold text-white px-2">Existing Items ({questions.length})</h3>
                {loading ? (
                    <div className="p-8 text-center text-zinc-500 animate-pulse">Loading node data...</div>
                ) : questions.length === 0 ? (
                    <div className="p-12 rounded-3xl border border-dashed border-white/10 text-center text-zinc-600">
                        No items in this node yet.
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                        {questions.map((q, i) => (
                            <div key={q.id || i} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                                <div className="flex justify-between items-start gap-4 mb-2">
                                    <span className="px-2 py-1 rounded bg-black/50 text-[10px] font-mono text-zinc-400 border border-white/5">{q.module || 'MATH'}</span>
                                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Ans: {q.correct_answer}</span>
                                </div>
                                <p className="text-sm text-zinc-300 line-clamp-2">{q.question_text}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
