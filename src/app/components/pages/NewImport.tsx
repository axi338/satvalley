import { useState, useEffect } from 'react';
import { Upload, X, ArrowLeft, Loader2, CheckCircle2, AlertCircle, FileText, Clock, Zap, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface NewImportProps {
    onNavigate: (page: string) => void;
}

export const NewImport = ({ onNavigate }: NewImportProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [testType, setTestType] = useState('sat-math');
    const [subject, setSubject] = useState<'math' | 'rw'>('math');
    const [module, setModule] = useState<'m1' | 'm2'>('m1');
    const [destinationTestId, setDestinationTestId] = useState('');
    const [tests, setTests] = useState<any[]>([]);
    const [moduleCounts, setModuleCounts] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        fetchTests();
    }, []);

    useEffect(() => {
        if (destinationTestId) {
            fetchModuleCounts(destinationTestId);
        } else {
            setModuleCounts(null);
        }
    }, [destinationTestId]);

    const fetchTests = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/tests', {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            const data = await res.json();
            setTests(data.tests || []);
        } catch (err) {
            console.error('Failed to fetch tests:', err);
        }
    };

    const fetchModuleCounts = async (testId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`/api/admin/tests/${testId}/module-counts`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            const result = await response.json();
            if (response.ok) {
                setModuleCounts(result.counts);
            }
        } catch (err) {
            console.error('Failed to fetch module counts:', err);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleStartImport = async () => {
        if (!file) return;

        // Validate module selection if uploading to a test
        if (destinationTestId && (!subject || !module)) {
            toast.error('Please select both subject and module');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('testType', testType);
        if (destinationTestId) {
            formData.append('testId', destinationTestId);
            formData.append('subject', subject);
            formData.append('module', module);
        }

        try {
            // Get session for auth
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch('/api/admin/import/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: formData,
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Import failed');

            toast.success('Import started successfully!');
            onNavigate('admin-import');
        } catch (err: any) {
            toast.error(err.message);
            console.error('Import Error:', err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-8 max-w-3xl mx-auto min-h-screen">
            <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => onNavigate('admin-import')}
                className="flex items-center gap-2 text-indigo-200/40 hover:text-indigo-400 transition-colors mb-8 font-black uppercase tracking-widest text-[10px]"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
            </motion.button>

            <div className="mb-12">
                <h1 className="text-4xl font-black text-white mb-2 tracking-tight">New Import</h1>
                <p className="text-indigo-200/60 font-medium">Upload docs or PDFs and AI will extract questions</p>
            </div>

            <div className="space-y-8">
                {/* Upload Area */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative p-12 rounded-[2.5rem] border-2 border-dashed transition-all cursor-pointer group ${dragActive
                        ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]'
                        : file
                            ? 'border-emerald-500/50 bg-emerald-500/5'
                            : 'border-white/10 bg-white/5 hover:bg-white/[0.08] hover:border-white/20'
                        }`}
                    onClick={() => !file && document.getElementById('file-upload')?.click()}
                >
                    <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx,.txt"
                        onChange={handleFileSelect}
                    />

                    <div className="flex flex-col items-center text-center">
                        <AnimatePresence mode="wait">
                            {file ? (
                                <motion.div
                                    key="file-selected"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="flex flex-col items-center"
                                >
                                    <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform duration-500">
                                        <CheckCircle2 className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2 truncate max-w-xs">{file.name}</h3>
                                    <p className="text-emerald-400/60 font-medium mb-6">{(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to import</p>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFile(null);
                                        }}
                                        className="flex items-center gap-2 text-rose-400 font-bold hover:text-rose-300 transition-colors py-2 px-4 rounded-xl hover:bg-rose-500/10"
                                    >
                                        <X className="w-4 h-4" />
                                        Remove File
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="no-file"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="flex flex-col items-center"
                                >
                                    <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center text-white mb-6 shadow-[0_0_30px_rgba(79,70,223,0.3)] group-hover:scale-110 transition-transform duration-500">
                                        <Upload className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Drop your file here</h3>
                                    <p className="text-indigo-200/40 text-sm font-medium">Or click to browse (PDF, DOCX, TXT)</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Form Options */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-6"
                >
                    {/* Content Type */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-indigo-200/40 uppercase tracking-[0.2em] ml-2">Content Type</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['sat-math', 'sat-rw', 'sat-mixed'].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setTestType(type)}
                                    className={`px-4 py-3 rounded-2xl font-bold text-sm transition-all border ${testType === type
                                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_20px_rgba(79,70,223,0.2)]'
                                        : 'bg-white/5 text-indigo-100/40 border-white/10 hover:bg-white/10 hover:border-white/20'
                                        }`}
                                >
                                    {type === 'sat-math' ? 'Math' : type === 'sat-rw' ? 'Reading & Writing' : 'Full Test'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Subject & Module Selection (only show if test is selected) */}
                    {destinationTestId && (
                        <div className="grid md:grid-cols-2 gap-6 p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10">
                            {/* Subject */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-indigo-200/40 uppercase tracking-[0.2em] ml-2">Subject</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { value: 'math', label: 'Math' },
                                        { value: 'rw', label: 'Reading & Writing' }
                                    ].map((s) => (
                                        <button
                                            key={s.value}
                                            onClick={() => setSubject(s.value as 'math' | 'rw')}
                                            className={`px-4 py-3 rounded-2xl font-bold text-sm transition-all border ${subject === s.value
                                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_20px_rgba(79,70,223,0.2)]'
                                                : 'bg-white/5 text-indigo-100/40 border-white/10 hover:bg-white/10 hover:border-white/20'
                                                }`}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Module */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-indigo-200/40 uppercase tracking-[0.2em] ml-2">Module</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { value: 'm1', label: 'Module 1' },
                                        { value: 'm2', label: 'Module 2' }
                                    ].map((m) => {
                                        const key = `${m.value}_${subject}`;
                                        const currentCount = moduleCounts?.[key] || 0;
                                        const limit = subject === 'math' ? 22 : 27;
                                        const isFull = currentCount >= limit;

                                        return (
                                            <button
                                                key={m.value}
                                                onClick={() => setModule(m.value as 'm1' | 'm2')}
                                                className={`px-4 py-3 rounded-2xl font-bold text-sm transition-all border relative ${module === m.value
                                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_20px_rgba(79,70,223,0.2)]'
                                                    : isFull
                                                        ? 'bg-rose-500/5 text-rose-400 border-rose-500/20 hover:bg-rose-500/10'
                                                        : 'bg-white/5 text-indigo-100/40 border-white/10 hover:bg-white/10 hover:border-white/20'
                                                    }`}
                                            >
                                                <div>{m.label}</div>
                                                {moduleCounts && (
                                                    <div className={`text-[9px] font-black uppercase tracking-widest mt-1 ${isFull ? 'text-rose-400' : module === m.value ? 'text-white/60' : 'text-indigo-200/40'
                                                        }`}>
                                                        {currentCount}/{limit} {isFull && '(FULL)'}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Destination */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-indigo-200/40 uppercase tracking-[0.2em] ml-2">Destination (Optional)</label>
                        <select
                            value={destinationTestId}
                            onChange={(e) => setDestinationTestId(e.target.value)}
                            className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm outline-none focus:border-indigo-500 transition-colors"
                        >
                            <option value="" className="bg-[#020617]">Add to question bank only</option>
                            {tests.map(test => (
                                <option key={test.id} value={test.id} className="bg-[#020617]">{test.title}</option>
                            ))}
                        </select>
                    </div>
                </motion.div>

                {/* Action Button */}
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    disabled={!file || uploading}
                    onClick={handleStartImport}
                    className={`w-full py-5 rounded-[2rem] font-black text-lg uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${file && !uploading
                        ? 'bg-indigo-600 text-white shadow-[0_20px_50px_rgba(79,70,223,0.3)] hover:scale-[1.02] active:scale-95'
                        : 'bg-white/5 text-white/20 cursor-not-allowed'
                        }`}
                >
                    {uploading ? (
                        <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        'Start Import Pipeline'
                    )}
                </motion.button>

                <div className="flex items-start gap-3 p-4 rounded-3xl bg-indigo-500/5 border border-indigo-500/10">
                    <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0" />
                    <p className="text-xs text-indigo-200/40 leading-relaxed font-medium">
                        AI will automatically detect and extract each question. You will have a chance to review, edit, and approve each one before they go live.
                    </p>
                </div>

                {/* AI Pipeline Visualization */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-12 p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10"
                >
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-8 text-center">Standard AI Processing Protocol</h4>

                    <div className="grid grid-cols-5 gap-4 relative">
                        {/* Connecting Line */}
                        <div className="absolute top-8 left-[10%] right-[10%] h-px bg-indigo-500/20" />

                        {[
                            { icon: FileText, label: 'Upload' },
                            { icon: Clock, label: 'Extract' },
                            { icon: Zap, label: 'Split' },
                            { icon: Sparkles, label: 'Normalize' },
                            { icon: CheckCircle2, label: 'Review' }
                        ].map((step, i) => (
                            <div key={i} className="flex flex-col items-center gap-4 relative z-10">
                                <motion.div
                                    whileHover={{ scale: 1.1 }}
                                    className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${i === 0 ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,223,0.3)]' : 'bg-white/5 text-indigo-200/20'
                                        }`}
                                >
                                    <step.icon className="w-7 h-7" />
                                </motion.div>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${i === 0 ? 'text-indigo-400' : 'text-indigo-200/20'
                                    }`}>
                                    {step.label}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 flex justify-center">
                        <div className="px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">Awaiting File Signal...</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
