import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Quote, Star } from 'lucide-react';

interface Result {
    id: string;
    name: string;
    score: number;
    note: string; // Used for quote
    photoUrl: string;
}

export function ResultsMarquee() {
    const [results, setResults] = useState<Result[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const apiBase = (import.meta as any).env.VITE_BACKEND_URL || '';

    useEffect(() => {
        fetch(`${apiBase}/api/results`)
            .then(r => r.json())
            .then(data => {
                setResults(data.results || []);
            })
            .catch(err => console.error("Failed to load results for marquee", err));
    }, [apiBase]);

    useEffect(() => {
        if (results.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % results.length);
        }, 5000); // Slide every 5 seconds
        return () => clearInterval(interval);
    }, [results]);

    if (results.length === 0) return null;

    return (
        <div className="relative py-24 bg-[#020617] overflow-hidden border-t border-white/5 mt-24">
            {/* Background Decor */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] -z-10" />

            <div className="max-w-7xl mx-auto px-6 mb-16 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6">
                    <Star className="w-4 h-4 text-indigo-400 fill-indigo-400" />
                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em]">Success Stories</span>
                </div>
                <h2 className="text-4xl lg:text-6xl font-black text-white tracking-tight">
                    Real Results from <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-200">Real Students.</span>
                </h2>
            </div>

            <div className="relative max-w-5xl mx-auto px-6 overflow-hidden">
                <motion.div
                    className="flex gap-8"
                    animate={{
                        x: `calc(-${currentIndex * 100}% - ${currentIndex * 32}px)`
                    }}
                    transition={{
                        duration: 1.2,
                        type: "spring",
                        bounce: 0.2
                    }}
                >
                    {results.map((r) => (
                        <div
                            key={r.id}
                            className="flex-shrink-0 w-full p-8 lg:p-12 rounded-[2.5rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 group"
                        >
                            <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">
                                {/* Photo */}
                                <div className="relative flex-shrink-0">
                                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-indigo-500/20 shadow-xl group-hover:scale-105 transition-transform duration-300">
                                        <img
                                            src={r.photoUrl || '/avatar-placeholder.jpg'}
                                            alt={r.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=6366f1&color=fff&size=256`;
                                            }}
                                        />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 px-3 py-1 bg-indigo-500 rounded-lg text-white font-black text-xs shadow-lg">
                                        {r.score}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-black text-white tracking-tight">{r.name}</span>
                                        <Quote className="w-5 h-5 text-indigo-500/30" />
                                    </div>
                                    <p className="text-slate-400 leading-relaxed text-sm italic font-medium">
                                        "{r.note || "This platform helped me achieve my dream score and gain confidence for the Digital SAT."}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </motion.div>

                {/* Navigation Dots */}
                <div className="flex justify-center gap-2 mt-8">
                    {results.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${currentIndex === idx ? 'bg-indigo-500 w-8' : 'bg-white/20 hover:bg-white/40'
                                }`}
                        />
                    ))}
                </div>
            </div>

            {/* Footer-like info below marquee */}
            <div className="max-w-7xl mx-auto px-6 mt-24 pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10">
                        <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-lg font-black text-white tracking-widest leading-none">SAT VALLEY</span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-1">Premium Prep</span>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">© {new Date().getFullYear()}</div>
                    <div className="flex items-center gap-1.5 text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_#6366f1] animate-pulse" />
                        Verified Excellence
                    </div>
                </div>
            </div>
        </div>
    );
}
