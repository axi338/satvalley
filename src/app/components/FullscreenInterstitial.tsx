import { useState, useEffect } from 'react';
import { Maximize, Shield, AlertTriangle, ArrowRight, Monitor, Camera } from 'lucide-react';

interface FullscreenInterstitialProps {
    onStart: () => void;
    testTitle?: string;
}

export function FullscreenInterstitial({ onStart, testTitle }: FullscreenInterstitialProps) {
    const [step, setStep] = useState<'camera' | 'fullscreen'>('camera');
    const [cameraGranted, setCameraGranted] = useState(false);

    useEffect(() => {
        const handleChange = () => {
            // Just tracking, not strictly enforcing here as logic is in TestSessionPage
        };
        document.addEventListener('fullscreenchange', handleChange);
        return () => document.removeEventListener('fullscreenchange', handleChange);
    }, []);

    const requestCamera = async () => {
        try {
            await navigator.mediaDevices.getUserMedia({ video: true });
            setCameraGranted(true);
            setStep('fullscreen');
        } catch (e) {
            alert("Camera access is strictly required for proctoring. Please allow access to continue.");
        }
    };

    const requestFullscreen = async () => {
        try {
            await document.documentElement.requestFullscreen();
            onStart();
        } catch (e) {
            console.error("Fullscreen denied", e);
            onStart();
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-white font-sans selection:bg-indigo-500/30">
            <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="mx-auto w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 mb-6">
                    {step === 'camera' ? <Camera className="w-10 h-10 text-white" /> : <Monitor className="w-10 h-10 text-white" />}
                </div>

                <div className="space-y-4">
                    <h1 className="text-3xl font-black tracking-tight">{step === 'camera' ? 'Camera Access' : 'Test Environment'}</h1>
                    <p className="text-zinc-400 text-lg leading-relaxed">
                        {step === 'camera'
                            ? "This Olympiad event requires video proctoring to ensure integrity."
                            : (testTitle ? `You are about to begin "${testTitle}".` : "You are about to begin a secure test.")}
                    </p>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-start gap-4 text-left">
                    <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="font-bold text-sm text-zinc-200">{step === 'camera' ? 'Video Proctoring' : 'device Compliance'}</p>
                        <p className="text-xs text-zinc-500">
                            {step === 'camera'
                                ? "Your webcam will be active during the session. Data is processed securely."
                                : "Close all other applications and tabs. Focus is required."}
                        </p>
                    </div>
                </div>

                {step === 'camera' ? (
                    <button
                        onClick={requestCamera}
                        className="w-full h-16 bg-white text-black hover:bg-indigo-500 hover:text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center gap-3 group"
                    >
                        Enable Camera
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                ) : (
                    <button
                        onClick={requestFullscreen}
                        className="w-full h-16 bg-white text-black hover:bg-indigo-500 hover:text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center gap-3 group"
                    >
                        Enter Fullscreen
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                )}

                <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">
                    Official SatValley Protocol
                </p>
            </div>
        </div>
    );
}
