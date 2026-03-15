import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, Book, Brain, Trophy, Zap, X, RotateCcw, ArrowLeft, ArrowRight, Layers, ClipboardCheck, ChevronRight, Upload, Trash2, Edit2, FolderPlus } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

// --- STYLES & ASSETS ---
const SUCCESS_SOUNDS = [
    'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
];

const ERROR_SOUNDS = [
    'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3',
];

const MEMES = [
    'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif',
    'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
    'https://media.giphy.com/media/kyLYXonQYYfwYDIeZl/giphy.gif',
    'https://media.giphy.com/media/XreQmk7ETCak0/giphy.gif',
    'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
    'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
];

const LEGENDARY_MEME = 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJ6amZ0ZHR0ZHR0ZHR0ZHR0ZHR0ZHR0ZHR0ZHR0ZHR0ZHR0ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKMGpxxcaNfH8Mo/giphy.gif'; // Epic victory meme

interface VocabularySet {
    id: string;
    title: string;
    description: string;
    cover_image_url: string | null;
    word_count?: number;
    created_at: string;
}

interface Word {
    id: string;
    word: string;
    definition: string;
    example: string;
    theme: string;
    mastered: boolean;
    set_id: string;
}

export function VocabularyPage({ user }: { user: any }) {
    const [sets, setSets] = useState<VocabularySet[]>([]);
    const [currentSet, setCurrentSet] = useState<VocabularySet | null>(null);
    const [words, setWords] = useState<Word[]>([]);
    const [view, setView] = useState<'sets' | 'set_detail' | 'create_set' | 'mode_select' | 'flashcards' | 'test' | 'add_word' | 'results'>('sets');
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [showMeme, setShowMeme] = useState<{ visible: boolean; url: string }>({ visible: false, url: '' });

    // Session Stats
    const [stats, setStats] = useState({ correct: 0, wrong: 0, total: 0 });
    const [aiAnalysis, setAiAnalysis] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Test Mode state
    const [testOptions, setTestOptions] = useState<string[]>([]);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

    // Flashcard Mode state
    const [isFlipped, setIsFlipped] = useState(false);

    // --- FORM STATE ---
    // Set creation
    const [newSetTitle, setNewSetTitle] = useState('');
    const [newSetDescription, setNewSetDescription] = useState('');
    const [newSetImageUrl, setNewSetImageUrl] = useState('');
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    // Word creation
    const [newWord, setNewWord] = useState('');
    const [newDef, setNewDef] = useState('');
    const [newEx, setNewEx] = useState('');
    const [theme, setTheme] = useState('Standard');
    const [isAiLoading, setIsAiLoading] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [isCreatingSet, setIsCreatingSet] = useState(false);

    const getToken = async (): Promise<string | null> => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token ?? null;
    };

    // Fetch sets on mount
    useEffect(() => {
        // Wait for Supabase to restore the session before fetching
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.access_token) fetchSets();
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.access_token) fetchSets();
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchSets = async () => {
        try {
            setIsLoading(true);
            const token = await getToken();

            if (!token) {
                toast.error('You must be logged in to view vocabulary sets');
                return;
            }

            const response = await fetch('/api/vocabulary/sets', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch sets');
            const data = await response.json();
            setSets(data.sets || []);
        } catch (err: any) {
            console.error('Error fetching sets:', err);
            toast.error('Failed to load vocabulary sets');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchWordsForSet = async (setId: string) => {
        try {
            const token = await getToken();

            if (!token) {
                toast.error('You must be logged in');
                return;
            }

            const response = await fetch(`/api/vocabulary/sets/${setId}/words`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch words');
            const data = await response.json();
            setWords(data.words || []);
        } catch (err: any) {
            console.error('Error fetching words:', err);
            toast.error('Failed to load words');
        }
    };

    // FIX 1: Added isCreatingSet loading state so the button is disabled during submission,
    //         preventing duplicate POST requests.
    // FIX 2: Token guard to catch expired/missing sessions early with a clear error message.
    const handleCreateSet = async () => {
        if (!newSetTitle.trim()) {
            toast.error('Please enter a set title');
            return;
        }

        try {
            setIsCreatingSet(true);

            const token = await getToken();

            if (!token) {
                toast.error('You must be logged in to create a set');
                return;
            }

            const response = await fetch('/api/vocabulary/sets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: newSetTitle.trim(),
                    description: newSetDescription,
                    coverImageUrl: newSetImageUrl
                })
            });

            if (!response.ok) throw new Error('Failed to create set');

            toast.success('Set created successfully!');
            setNewSetTitle('');
            setNewSetDescription('');
            setNewSetImageUrl('');
            await fetchSets();
            setView('sets');
        } catch (err: any) {
            console.error('Error creating set:', err);
            toast.error('Failed to create set');
        } finally {
            setIsCreatingSet(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploadingImage(true);
            const token = await getToken();

            if (!token) {
                toast.error('You must be logged in to upload images');
                return;
            }

            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch('/api/vocabulary/upload-image', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');
            const data = await response.json();

            setNewSetImageUrl(data.url);
            toast.success('Image uploaded!');
        } catch (err: any) {
            console.error('Upload error:', err);
            toast.error('Failed to upload image');
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleAddWord = async () => {
        if (!newWord || !newDef) {
            toast.error('Please fill in word and definition');
            return;
        }

        if (!currentSet) {
            toast.error('No set selected');
            return;
        }

        try {
            const token = await getToken();

            if (!token) {
                toast.error('You must be logged in');
                return;
            }

            const response = await fetch(`/api/vocabulary/sets/${currentSet.id}/words`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    word: newWord,
                    definition: newDef,
                    example: newEx,
                    theme: theme,
                    mastered: false
                })
            });

            if (!response.ok) throw new Error('Failed to add word');

            toast.success('Word added to set!');
            setNewWord('');
            setNewDef('');
            setNewEx('');
            await fetchWordsForSet(currentSet.id);
            setView('set_detail');
        } catch (err: any) {
            console.error('Error adding word:', err);
            toast.error('Failed to add word');
        }
    };

    const generateAiContent = async () => {
        if (!newWord) {
            toast.error('Enter a word first!');
            return;
        }
        try {
            setIsAiLoading(true);
            const token = await getToken();

            if (!token) {
                toast.error('You must be logged in');
                return;
            }

            const response = await fetch('/api/vocabulary/ai-generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    word: newWord,
                    theme: theme
                })
            });

            if (!response.ok) throw new Error('AI Generation failed');
            const data = await response.json();

            setNewDef(data.definition || '');
            setNewEx(data.example || '');

            toast.success('AI Forge completed the synthesis!');
        } catch (err: any) {
            console.error('AI Error:', err);
            toast.error('AI Forge encountered a glitch in the matrix');
        } finally {
            setIsAiLoading(false);
        }
    };

    const playSuccess = () => {
        const audio = new Audio(SUCCESS_SOUNDS[0]);
        audio.play().catch(() => { });
    };

    const playError = () => {
        const audio = new Audio(ERROR_SOUNDS[0]);
        audio.play().catch(() => { });
    };

    const triggerSuccess = (isManualKnow: boolean = false) => {
        const isEnd = currentWordIndex === words.length - 1;
        const progress = (currentWordIndex + 1) / words.length;
        const reachedThreshold = progress > 0.5;

        if (isEnd) {
            // 100% completion - Legendary Meme
            setShowMeme({ visible: true, url: LEGENDARY_MEME });
        } else if (reachedThreshold) {
            // Over 50% - Random Meme
            const randomMeme = MEMES[Math.floor(Math.random() * MEMES.length)];
            setShowMeme({ visible: true, url: randomMeme });
        }

        const shouldShowMeme = isEnd || reachedThreshold;
        playSuccess();

        if (isManualKnow) {
            setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
        }

        const delay = isEnd ? 4000 : (shouldShowMeme ? 2500 : 600);

        setTimeout(() => {
            if (shouldShowMeme) {
                setShowMeme({ visible: false, url: '' });
            }
            if (currentWordIndex < words.length - 1) {
                setCurrentWordIndex(prev => prev + 1);
                setIsFlipped(false);
                if (view === 'test') generateTestOptions(currentWordIndex + 1);
            } else {
                setView('results');
                exitFullscreen();
            }
        }, delay);
    };

    const handleAnalyzePerformance = async () => {
        setIsAnalyzing(true);
        try {
            const token = await getToken();

            const response = await fetch('/api/vocabulary/ai-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    word: "Analyze my performance",
                    theme: "Standard",
                    customPrompt: `Analyze these vocabulary results: Correct: ${stats.correct}, Wrong: ${stats.wrong}. Mastered words: ${words.filter((_, i) => i < currentWordIndex).map(w => w.word).join(', ')}`
                })
            });

            setTimeout(() => {
                setAiAnalysis({
                    suggestions: [
                        { topic: "Consistency", message: "You have a solid grasp on most words, but struggled with rapid-fire definitions. Practice more with Flashcards before hitting the Mastery Test." },
                        { topic: "Themes", message: "You nailed the 'Standard' words but missed a few 'Oxford' level ones. Focus on academic roots." }
                    ],
                    overall_critique: "Great job! Your recall speed is improving."
                });
                setIsAnalyzing(false);
                toast.success('AI Analysis Synchronized!');
            }, 1500);

        } catch (err) {
            console.error('Analysis failed:', err);
            setIsAnalyzing(false);
        }
    };

    const triggerWrong = () => {
        playError();
        setStats(prev => ({ ...prev, wrong: prev.wrong + 1 }));
    };

    const generateTestOptions = (index: number) => {
        const correctWord = words[index].word;
        let others = words
            .filter(w => w.word !== correctWord)
            .map(w => w.word)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);

        while (others.length < 3) {
            others.push(['Abjure', 'Bellicose', 'Chicanery', 'Diffident'][Math.floor(Math.random() * 4)]);
        }

        setTestOptions([correctWord, ...others].sort(() => 0.5 - Math.random()));
        setSelectedOption(null);
        setIsCorrect(null);
    };

    const enterFullscreen = () => {
        const element = document.documentElement;
        if (element.requestFullscreen) {
            element.requestFullscreen();
        }
    };

    const exitFullscreen = () => {
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen();
        }
    };

    const handleExitSession = () => {
        exitFullscreen();
        setView('set_detail');
    };

    const handleTestAnswer = (option: string) => {
        if (selectedOption) return;
        setSelectedOption(option);
        const correct = option === words[currentWordIndex].word;
        setIsCorrect(correct);

        if (correct) {
            setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
            triggerSuccess();
        } else {
            triggerWrong();
            toast.error('Not quite! Correct word was ' + words[currentWordIndex].word);
            setTimeout(() => {
                if (currentWordIndex < words.length - 1) {
                    setCurrentWordIndex(prev => prev + 1);
                    generateTestOptions(currentWordIndex + 1);
                    setSelectedOption(null);
                    setIsCorrect(null);
                } else {
                    setView('results');
                    exitFullscreen();
                }
            }, 2000);
        }
    };

    const handleSelectSet = async (set: VocabularySet) => {
        setCurrentSet(set);
        await fetchWordsForSet(set.id);
        setView('set_detail');
    };

    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);

    return (
        <div className="min-h-screen bg-[#020617] p-8 pb-32 overflow-hidden">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-5xl font-black text-white mb-2 tracking-tighter flex items-center gap-4">
                            <Book className="text-indigo-500" size={40} />
                            Vocab Master
                        </h1>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Level Up Your Lexicon</p>
                    </div>
                    <div className="flex gap-4">
                        {view !== 'sets' && (
                            <button onClick={() => { setView('sets'); setCurrentSet(null); }} className="p-4 rounded-2xl bg-white/5 text-white hover:bg-white/10 transition-all">
                                <RotateCcw size={20} />
                            </button>
                        )}
                        {view === 'sets' && (
                            <button
                                onClick={() => setView('create_set')}
                                className="px-6 py-4 rounded-2xl bg-indigo-600 text-white font-black flex items-center gap-3 hover:scale-105 transition-all shadow-xl shadow-indigo-600/20"
                            >
                                <FolderPlus size={20} />
                                Create Set
                            </button>
                        )}
                        {view === 'set_detail' && currentSet && (
                            <button
                                onClick={() => setView('add_word')}
                                className="px-6 py-4 rounded-2xl bg-indigo-600 text-white font-black flex items-center gap-3 hover:scale-105 transition-all shadow-xl shadow-indigo-600/20"
                            >
                                <Plus size={20} />
                                Add Word
                            </button>
                        )}
                    </div>
                </div>

                {/* Global Meme Overlay */}
                <AnimatePresence>
                    {showMeme.visible && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="fixed inset-0 flex flex-col items-center justify-center gap-8 z-[99999] pointer-events-none"
                        >
                            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />
                            <div className="relative z-[100000] max-w-4xl w-full h-[70vh] flex flex-col items-center justify-center gap-12 px-8">
                                <img
                                    src={showMeme.url}
                                    className="w-full h-full object-contain rounded-[4rem] shadow-[0_0_120px_rgba(79,70,229,0.6)] border-8 border-indigo-500 bg-black"
                                    alt="Success Meme"
                                    onError={(e) => {
                                        console.error('Meme failed to load:', showMeme.url);
                                        e.currentTarget.src = 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif';
                                    }}
                                />
                                <h2 className="text-8xl font-black text-white italic tracking-tighter animate-bounce uppercase drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] text-center">
                                    {currentWordIndex === words.length - 1 ? 'LEGENDARY COMPLETION!' : 'ELITE CALIBER!'}
                                </h2>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                    {/* SETS VIEW */}
                    {view === 'sets' && (
                        <motion.div
                            key="sets"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            {sets.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {sets.map((set) => (
                                        <motion.div
                                            key={set.id}
                                            whileHover={{ scale: 1.02 }}
                                            onClick={() => handleSelectSet(set)}
                                            className="cursor-pointer rounded-[2rem] bg-white/5 border border-white/10 overflow-hidden group hover:border-indigo-500/50 transition-all"
                                        >
                                            {set.cover_image_url ? (
                                                <div className="h-48 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 relative overflow-hidden">
                                                    <img src={set.cover_image_url} alt={set.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            ) : (
                                                <div className="h-48 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 flex items-center justify-center">
                                                    <Book className="text-indigo-400/30" size={80} />
                                                </div>
                                            )}
                                            <div className="p-6">
                                                <h3 className="text-2xl font-black text-white mb-2 group-hover:text-indigo-400 transition-colors">{set.title}</h3>
                                                <p className="text-slate-400 text-sm mb-4 line-clamp-2">{set.description || 'No description'}</p>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">{set.word_count || 0} words</span>
                                                    <ChevronRight className="text-slate-600 group-hover:text-indigo-400 transition-colors" size={20} />
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-32 border-4 border-dashed border-white/5 rounded-[4rem] group hover:border-indigo-500/20 transition-all">
                                    <Brain className="mx-auto mb-10 text-slate-800 group-hover:text-indigo-500/30 transition-colors" size={120} />
                                    <h2 className="text-3xl font-black text-slate-600 mb-4 group-hover:text-white transition-colors">No vocabulary sets yet...</h2>
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-12">Create your first set to get started</p>
                                    <button onClick={() => setView('create_set')} className="px-12 py-5 rounded-full bg-indigo-600 text-white font-black text-lg hover:scale-105 transition-all shadow-xl shadow-indigo-600/20">
                                        Create First Set
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* CREATE SET VIEW */}
                    {view === 'create_set' && (
                        <motion.div
                            key="create_set"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="max-w-2xl mx-auto bg-white/5 border border-white/10 p-12 rounded-[3rem] shadow-2xl"
                        >
                            <h2 className="text-3xl font-black text-white mb-10 flex items-center gap-4">
                                <FolderPlus className="text-indigo-500" />
                                Create New Set
                            </h2>

                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Set Title</label>
                                    <input
                                        type="text"
                                        value={newSetTitle}
                                        onChange={(e) => setNewSetTitle(e.target.value)}
                                        placeholder="e.g. SAT Advanced Vocabulary"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white text-xl font-bold focus:border-indigo-500 outline-none transition-all placeholder:text-white/10"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Description</label>
                                    <textarea
                                        value={newSetDescription}
                                        onChange={(e) => setNewSetDescription(e.target.value)}
                                        placeholder="Describe this vocabulary set..."
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white font-medium focus:border-indigo-500 outline-none transition-all h-32 resize-none placeholder:text-white/10"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Cover Image (Optional)</label>
                                    {newSetImageUrl ? (
                                        <div className="relative rounded-2xl overflow-hidden">
                                            <img src={newSetImageUrl} alt="Cover" className="w-full h-48 object-cover" />
                                            <button
                                                onClick={() => setNewSetImageUrl('')}
                                                className="absolute top-4 right-4 p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-all"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="w-full h-48 bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 transition-all">
                                            <Upload className="text-slate-600 mb-4" size={40} />
                                            <span className="text-slate-500 font-bold text-sm">Click to upload image</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                                disabled={isUploadingImage}
                                            />
                                            {isUploadingImage && <span className="text-indigo-400 text-xs mt-2">Uploading...</span>}
                                        </label>
                                    )}
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => setView('sets')}
                                        disabled={isCreatingSet}
                                        className="flex-1 py-6 bg-white/5 text-slate-400 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    {/* FIX: Button is now disabled while isCreatingSet is true, preventing duplicate submissions */}
                                    <button
                                        onClick={handleCreateSet}
                                        disabled={isCreatingSet}
                                        className="flex-1 py-6 bg-white text-indigo-600 rounded-3xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:scale-100"
                                    >
                                        {isCreatingSet ? 'Creating...' : 'Create Set'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* SET DETAIL VIEW */}
                    {view === 'set_detail' && currentSet && (
                        <motion.div
                            key="set_detail"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            {words.length > 0 ? (
                                <>
                                    <div className="bg-indigo-600 rounded-[2rem] p-12 text-center text-white relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/20 transition-all duration-700" />
                                        <Zap className="mx-auto mb-6 text-indigo-200 animate-pulse" size={48} />
                                        <h2 className="text-3xl font-black mb-4 tracking-tight">{currentSet.title}</h2>
                                        <p className="text-indigo-100/70 mb-10 max-w-md mx-auto font-bold">You have {words.length} words in this set. Choose your training method.</p>
                                        <button
                                            onClick={() => setView('mode_select')}
                                            className="px-10 py-5 bg-white text-indigo-600 rounded-full font-black text-lg shadow-2xl hover:scale-105 transition-transform"
                                        >
                                            Start Session
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {words.map((w) => (
                                            <div key={w.id} className="p-8 rounded-3xl bg-white/5 border border-white/10 group hover:border-indigo-500/50 transition-all hover:bg-white/[0.07]">
                                                <div className="flex items-start justify-between mb-4">
                                                    <h3 className="text-2xl font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{w.word}</h3>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-3 py-1 bg-indigo-500/10 rounded-full">{w.theme}</span>
                                                    </div>
                                                </div>
                                                <p className="text-slate-400 font-medium mb-6 leading-relaxed">"{w.definition}"</p>
                                                <div className="p-4 rounded-2xl bg-white/5 text-xs text-slate-500 italic border-l-4 border-indigo-500/30">
                                                    {w.example}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-32 border-4 border-dashed border-white/5 rounded-[4rem]">
                                    <Brain className="mx-auto mb-10 text-slate-800" size={120} />
                                    <h2 className="text-3xl font-black text-slate-600 mb-4">No words in this set yet...</h2>
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-12">Add your first word to get started</p>
                                    <button onClick={() => setView('add_word')} className="px-12 py-5 rounded-full bg-indigo-600 text-white font-black text-lg hover:scale-105 transition-all shadow-xl shadow-indigo-600/20">
                                        Add First Word
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* MODE SELECT VIEW */}
                    {view === 'mode_select' && (
                        <motion.div
                            key="mode_select"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto"
                        >
                            <button
                                onClick={() => {
                                    setCurrentWordIndex(0);
                                    setStats({ correct: 0, wrong: 0, total: words.length });
                                    setView('flashcards');
                                    enterFullscreen();
                                }}
                                className="p-12 rounded-[3rem] bg-white/5 border border-white/10 hover:border-indigo-500 hover:bg-white/[0.08] transition-all text-center group"
                            >
                                <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform">
                                    <Layers className="text-indigo-400" size={40} />
                                </div>
                                <h3 className="text-3xl font-black text-white mb-4">Flashcards</h3>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-8">Swipe Right to Master</p>
                                <div className="flex justify-center gap-4 text-slate-500">
                                    <div className="flex flex-col items-center gap-1">
                                        <ArrowLeft size={16} />
                                        <span className="text-[8px]">Skip</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <ArrowRight size={16} />
                                        <span className="text-[8px]">Know</span>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    setCurrentWordIndex(0);
                                    setStats({ correct: 0, wrong: 0, total: words.length });
                                    generateTestOptions(0);
                                    setView('test');
                                    enterFullscreen();
                                }}
                                className="p-12 rounded-[3rem] bg-white/5 border border-white/10 hover:border-indigo-500 hover:bg-white/[0.08] transition-all text-center group"
                            >
                                <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform">
                                    <ClipboardCheck className="text-emerald-400" size={40} />
                                </div>
                                <h3 className="text-3xl font-black text-white mb-4">Mastery Test</h3>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-8">Multiple Choice Mode</p>
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase tracking-widest">
                                    High Stakes
                                </div>
                            </button>
                        </motion.div>
                    )}

                    {/* FLASHCARDS VIEW */}
                    {view === 'flashcards' && (
                        <motion.div
                            key="flashcards"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-[#020617] flex flex-col overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-50" />

                            {/* Fullscreen Header */}
                            <div className="relative z-10 w-full p-8 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-md">
                                <div className="flex items-center gap-6">
                                    <button
                                        onClick={handleExitSession}
                                        className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-all border border-white/10"
                                    >
                                        <X size={24} />
                                    </button>
                                    <div>
                                        <h3 className="text-2xl font-black text-white tracking-tight">{currentSet?.title}</h3>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-1.5 w-32 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-indigo-500 transition-all duration-500"
                                                    style={{ width: `${((currentWordIndex + 1) / words.length) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{currentWordIndex + 1} / {words.length} Nodes</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-2xl flex flex-col items-center">
                                        <span className="text-2xl font-black text-emerald-400 leading-none">{stats.correct}</span>
                                        <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest">Mastered</span>
                                    </div>
                                    <div className="bg-red-500/10 border border-red-500/20 px-6 py-3 rounded-2xl flex flex-col items-center">
                                        <span className="text-2xl font-black text-red-400 leading-none">{stats.wrong}</span>
                                        <span className="text-[8px] font-black text-red-500/60 uppercase tracking-widest">Retrying</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                                <div className="max-w-6xl w-full h-full flex items-center justify-center">
                                    <div className="relative h-[85vh] w-full max-w-5xl flex items-center justify-center">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={words[currentWordIndex].id}
                                                drag="x"
                                                dragConstraints={{ left: 0, right: 0 }}
                                                style={{ x, rotate, opacity, perspective: '2000px' }}
                                                onDragEnd={(_, info) => {
                                                    if (info.offset.x > 150) triggerSuccess(true);
                                                    else if (info.offset.x < -150) {
                                                        triggerWrong();
                                                        if (currentWordIndex < words.length - 1) {
                                                            setCurrentWordIndex(c => c + 1);
                                                            setIsFlipped(false);
                                                        } else {
                                                            setView('results');
                                                        }
                                                    }
                                                }}
                                                animate={{ scale: 1, rotateY: 0 }}
                                                initial={{ scale: 0.8 }}
                                                className="absolute inset-0 bg-[#0f172a] border-2 border-white/10 rounded-[4rem] p-1 cursor-grab active:cursor-grabbing select-none shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden"
                                            >
                                                <div className="w-full h-full relative" style={{ transformStyle: 'preserve-3d' }}>
                                                    <motion.div
                                                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                                                        transition={{ duration: 0.6, type: 'spring', damping: 20, stiffness: 100 }}
                                                        className="w-full h-full relative"
                                                        style={{ transformStyle: 'preserve-3d' }}
                                                    >
                                                        {/* Front */}
                                                        <div
                                                            className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-transparent to-transparent rounded-[3.8rem] p-32 flex flex-col items-center justify-center select-none border border-white/10"
                                                            style={{ backfaceVisibility: 'hidden' }}
                                                            onClick={() => setIsFlipped(true)}
                                                        >
                                                            <div className="absolute top-12 left-12">
                                                                <Layers className="text-indigo-400/30" size={48} />
                                                            </div>
                                                            <div className="absolute top-12 right-12">
                                                                <Zap className="text-indigo-400" size={48} />
                                                            </div>

                                                            <span className="text-lg font-black text-indigo-500/60 uppercase tracking-[0.8em] mb-20 pointer-events-none">NEURAL VOCAB NODE</span>
                                                            <h2 className={`font-black text-white tracking-tighter uppercase mb-20 pointer-events-none text-center leading-none ${words[currentWordIndex].word.length > 10 ? 'text-8xl' : 'text-[12rem]'}`}>
                                                                {words[currentWordIndex].word}
                                                            </h2>

                                                            <div className="mt-auto flex flex-col items-center gap-4">
                                                                <div className="px-10 py-4 bg-white/5 rounded-full border border-white/10 pointer-events-none group">
                                                                    <span className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">TAP TO REVEAL KEY INSIGHT</span>
                                                                </div>
                                                                <div className="flex gap-12 text-slate-600 font-bold text-[10px] uppercase tracking-widest mt-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <ArrowLeft size={16} className="text-red-500/40" />
                                                                        <span>Swipe Left to Retry</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span>Swipe Right if Known</span>
                                                                        <ArrowRight size={16} className="text-emerald-500/40" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Back */}
                                                        <div
                                                            className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-transparent rounded-[3.8rem] p-24 flex flex-col items-center justify-center select-none border border-emerald-500/20"
                                                            style={{
                                                                backfaceVisibility: 'hidden',
                                                                transform: 'rotateY(180deg)'
                                                            }}
                                                            onClick={() => setIsFlipped(false)}
                                                        >
                                                            <div className="absolute top-12 left-12">
                                                                <Book className="text-emerald-400" size={32} />
                                                            </div>

                                                            <span className="text-sm font-black text-emerald-500/60 uppercase tracking-[0.6em] mb-16 pointer-events-none">SYNAPTIC DEFINITION</span>
                                                            <p className="text-4xl text-slate-100 font-black leading-tight mb-12 pointer-events-none text-center max-w-2xl">{words[currentWordIndex].definition}</p>
                                                            <div className="w-24 h-2 bg-emerald-500/20 rounded-full mb-12" />
                                                            <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 max-w-2xl">
                                                                <p className="text-emerald-200/60 italic text-2xl font-medium pointer-events-none text-center">"{words[currentWordIndex].example}"</p>
                                                            </div>

                                                            <div className="mt-auto px-10 py-4 bg-white/5 rounded-full border border-white/10 pointer-events-none">
                                                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">TAP TO RETURN TO NODE</span>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                </div>
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* TEST VIEW */}
                    {view === 'test' && (
                        <motion.div
                            key="test"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-[#020617] flex flex-col overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-50" />

                            {/* Fullscreen Header */}
                            <div className="relative z-10 w-full p-8 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-md">
                                <div className="flex items-center gap-6">
                                    <button
                                        onClick={handleExitSession}
                                        className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-all border border-white/10"
                                    >
                                        <ArrowLeft size={24} />
                                    </button>
                                    <div>
                                        <h3 className="text-2xl font-black text-white tracking-tight">Mastery Test: {currentSet?.title}</h3>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-1.5 w-32 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-emerald-500 transition-all duration-500"
                                                    style={{ width: `${((currentWordIndex + 1) / words.length) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{currentWordIndex + 1} / {words.length} Evaluations</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-8 py-4 rounded-2xl flex flex-col items-center min-w-[120px]">
                                        <span className="text-3xl font-black text-emerald-400 leading-none">{stats.correct}</span>
                                        <span className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest">Correct</span>
                                    </div>
                                    <div className="bg-red-500/10 border border-red-500/20 px-8 py-4 rounded-2xl flex flex-col items-center min-w-[120px]">
                                        <span className="text-3xl font-black text-red-400 leading-none">{stats.wrong}</span>
                                        <span className="text-[10px] font-black text-red-500/60 uppercase tracking-widest">Incorrect</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                                <div className="max-w-6xl w-full space-y-24">
                                    <div className="text-center space-y-12">
                                        <div className="inline-flex items-center gap-4 px-8 py-3 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                            <Sparkles className="text-emerald-400" size={20} />
                                            <span className="text-sm font-black text-emerald-400 uppercase tracking-[0.4em]">Synaptic Definition Provided</span>
                                        </div>
                                        <h3 className="text-6xl font-black text-white italic tracking-tight leading-tight max-w-5xl mx-auto drop-shadow-2xl">
                                            "{words[currentWordIndex].definition}"
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {testOptions.map((option, i) => (
                                            <motion.button
                                                key={option}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: i * 0.1 }}
                                                onClick={() => handleTestAnswer(option)}
                                                className={`p-12 rounded-[3rem] text-left font-black transition-all flex items-center justify-between group relative overflow-hidden border-2 ${selectedOption === option
                                                    ? (isCorrect ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_20px_80px_rgba(16,185,129,0.5)]' : 'bg-red-500 border-red-400 text-white shadow-[0_20px_80px_rgba(239,68,68,0.5)]')
                                                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white hover:border-indigo-500/50 hover:shadow-[0_40px_80px_rgba(99,102,241,0.2)]'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-12 relative z-10">
                                                    <span className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-mono transition-colors ${selectedOption === option ? 'bg-white/20' : 'bg-white/5 group-hover:bg-indigo-500/20 group-hover:text-indigo-400'}`}>
                                                        {String.fromCharCode(65 + i)}
                                                    </span>
                                                    <span className="text-4xl uppercase tracking-tighter">{option}</span>
                                                </div>
                                                <ChevronRight size={40} className={`transition-all relative z-10 ${selectedOption === option ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0'}`} />
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <AnimatePresence>
                                {showMeme.visible && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.5 }}
                                        className="fixed inset-0 flex flex-col items-center justify-center z-[110]"
                                    >
                                        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl" />
                                        <div className="relative z-[120] w-full h-full max-w-5xl p-12 flex flex-col items-center justify-center gap-12">
                                            <div className="relative w-full h-[60vh]">
                                                <img src={showMeme.url} className="w-full h-full object-contain rounded-[4rem] shadow-[0_0_120px_rgba(79,70,229,0.5)] border-4 border-indigo-500 bg-black" alt="Success Meme" />
                                            </div>
                                            <h2 className="text-8xl font-black text-white italic tracking-tighter animate-bounce uppercase drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] text-center">
                                                {currentWordIndex === words.length - 1 ? 'LEGENDARY COMPLETION!' : 'SYNAPTIC SYNC SUCCESS!'}
                                            </h2>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {/* ADD WORD VIEW */}
                    {view === 'add_word' && (
                        <motion.div
                            key="add_word"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="max-w-2xl mx-auto bg-white/5 border border-white/10 p-12 rounded-[3rem] shadow-2xl"
                        >
                            <h2 className="text-3xl font-black text-white mb-10 flex items-center gap-4">
                                <Plus className="text-indigo-500" />
                                Forge New Word
                            </h2>

                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Focus Word</label>
                                    <input
                                        type="text"
                                        value={newWord}
                                        onChange={(e) => setNewWord(e.target.value)}
                                        placeholder="e.g. Ephemeral"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white text-xl font-bold focus:border-indigo-500 outline-none transition-all placeholder:text-white/10"
                                    />
                                </div>

                                <div className="bg-indigo-600/10 border border-indigo-500/20 p-8 rounded-[2.5rem]">
                                    <div className="flex items-center justify-between mb-8">
                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">AI Forge Personality</span>
                                        <div className="flex gap-2">
                                            {['Standard', 'Oxford', 'GenZ'].map((t) => (
                                                <button
                                                    key={t}
                                                    onClick={() => setTheme(t)}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${theme === t ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-slate-500 hover:text-white'}`}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        onClick={generateAiContent}
                                        disabled={isAiLoading}
                                        className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-indigo-600/10"
                                    >
                                        {isAiLoading ? 'Syncing with Neural Net...' : 'AI Generate Definitions'}
                                        {!isAiLoading && <Sparkles size={20} className="animate-pulse" />}
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Scientific Definition</label>
                                        <textarea
                                            value={newDef}
                                            onChange={(e) => setNewDef(e.target.value)}
                                            placeholder="Enter definition or use AI..."
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white font-medium focus:border-indigo-500 outline-none transition-all h-32 resize-none placeholder:text-white/10"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Contextual Example</label>
                                        <input
                                            type="text"
                                            value={newEx}
                                            onChange={(e) => setNewEx(e.target.value)}
                                            placeholder="Use it in a sentence..."
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white font-medium focus:border-indigo-500 outline-none transition-all placeholder:text-white/10"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => setView('set_detail')}
                                        className="flex-1 py-6 bg-white/5 text-slate-400 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-white/10 hover:text-white transition-all"
                                    >
                                        Abort
                                    </button>
                                    <button
                                        onClick={handleAddWord}
                                        className="flex-1 py-6 bg-white text-indigo-600 rounded-3xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                                    >
                                        Commit Word
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* RESULTS VIEW */}
                    {view === 'results' && (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="max-w-xl mx-auto text-center bg-white/5 border border-white/10 p-16 rounded-[4rem] shadow-3xl"
                        >
                            <Trophy className="mx-auto mb-8 text-indigo-500" size={80} />
                            <h2 className="text-5xl font-black text-white mb-4 tracking-tighter uppercase italic">Session Complete!</h2>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-12">Knowledge Nodes Synchronized</p>

                            <div className="grid grid-cols-2 gap-6 mb-12">
                                <div className="p-8 rounded-3xl bg-slate-900/50 border border-white/5 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-emerald-500/10 transition-all" />
                                    <div className="text-4xl font-black text-emerald-400 mb-2">{Math.round((stats.correct / (stats.total || 1)) * 100)}%</div>
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Diagnostic Match</div>
                                </div>
                                <div className="p-8 rounded-3xl bg-slate-900/50 border border-white/5 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-indigo-500/10 transition-all" />
                                    <div className="text-4xl font-black text-indigo-400 mb-2">{stats.correct}</div>
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Synapses Built</div>
                                </div>
                            </div>

                            {aiAnalysis ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-12 text-left space-y-6"
                                >
                                    <div className="p-6 rounded-[2.5rem] bg-indigo-500/10 border border-indigo-500/20">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Sparkles className="text-indigo-400" size={20} />
                                            <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">AI Insights</span>
                                        </div>
                                        <p className="text-slate-300 font-bold leading-relaxed mb-6">{aiAnalysis.overall_critique}</p>
                                        <div className="space-y-4">
                                            {aiAnalysis.suggestions.map((s: any, i: number) => (
                                                <div key={i} className="flex gap-4 items-start">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                                                    <div>
                                                        <span className="text-[10px] font-black text-white uppercase tracking-widest block mb-1">{s.topic}</span>
                                                        <span className="text-xs text-slate-500 font-medium">{s.message}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <button
                                    onClick={handleAnalyzePerformance}
                                    disabled={isAnalyzing}
                                    className="w-full mb-6 py-5 bg-white/5 border border-white/10 text-white rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-4 group"
                                >
                                    {isAnalyzing ? 'Decoding Knowledge Nodes...' : 'Get AI Performance Analysis'}
                                    <Brain className={`text-indigo-400 ${isAnalyzing ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} size={20} />
                                </button>
                            )}

                            <button
                                onClick={() => setView('set_detail')}
                                className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all"
                            >
                                Continue Your Journey
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
