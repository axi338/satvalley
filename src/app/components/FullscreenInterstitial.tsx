import { useState, useEffect } from 'react';
import { Maximize, Shield, AlertTriangle, ArrowRight, Monitor, Camera } from 'lucide-react';

interface FullscreenInterstitialProps {
    onStart: () => void;
    testTitle?: string;
}

export function FullscreenInterstitial({ onStart, testTitle }: FullscreenInterstitialProps) {
    const [isRequesting, setIsRequesting] = useState(false);

    useEffect(() => {
        const handleChange = () => {
            // Just tracking, not strictly enforcing here as logic is in TestSessionPage
        };
        document.addEventListener('fullscreenchange', handleChange);
        return () => document.removeEventListener('fullscreenchange', handleChange);
    }, []);

    const requestFullscreen = async () => {
        try {
            setIsRequesting(true);
            await document.documentElement.requestFullscreen();
            onStart();
        } catch (e) {
            console.error("Fullscreen denied", e);
            onStart();
        } finally {
            setIsRequesting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-white font-sans selection:bg-indigo-500/30">
            <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="mx-auto w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 mb-6 font-black text-2xl">
                    <Monitor className="w-10 h-10 text-white" />
                </div>

                <div className="space-y-4">
                    <h1 className="text-3xl font-black tracking-tight">Test Environment</h1>
                    <p className="text-zinc-400 text-lg leading-relaxed">
                        {testTitle ? `You are about to begin "${testTitle}".` : "You are about to begin a secure test."}
                    </p>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-start gap-4 text-left">
                    <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="font-bold text-sm text-zinc-200">Device Compliance</p>
                        <p className="text-xs text-zinc-500">
                            Close all other applications and tabs. Fullscreen mode is required to maintain the integrity of the simulator.
                        </p>
                    </div>
                </div>

                <button
                    onClick={requestFullscreen}
                    disabled={isRequesting}
                    className="w-full h-16 bg-white text-black hover:bg-indigo-500 hover:text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center gap-3 group disabled:opacity-50"
                >
                    {isRequesting ? "Initializing..." : "Enter Fullscreen"}
                    {!isRequesting && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </button>

                <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">
                    Official SatValley Protocol
                </p>
            </div>
        </div>
    );
}
