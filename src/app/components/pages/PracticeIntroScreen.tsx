import React from 'react';
import { Unlock } from 'lucide-react';

interface PracticeIntroScreenProps {
    onBack: () => void;
    onNext: () => void;
}

export function PracticeIntroScreen({ onBack, onNext }: PracticeIntroScreenProps) {
    return (
        <div className="fixed inset-0 bg-[#F2F4F8] flex flex-col z-50 font-sans selection:bg-indigo-500/30 overflow-hidden">
            {/* Main content area (scrollable) */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-[700px] mx-auto px-6 py-12 md:py-20">
                    <h1 className="text-[32px] md:text-[40px] font-medium text-center text-slate-800 mb-10 tracking-tight">
                        Practice Test
                    </h1>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-8 md:p-12 space-y-10">
                        {/* Timing */}
                        <div className="space-y-2">
                            <h2 className="text-[19px] font-bold text-slate-900">Timing</h2>
                            <p className="text-[15px] text-slate-700 leading-relaxed font-medium">
                                Practice tests are timed, but you can pause them. To continue on another device, you have to start over. We delete incomplete practice tests after 90 days.
                            </p>
                        </div>

                        {/* Scores */}
                        <div className="space-y-2">
                            <h2 className="text-[19px] font-bold text-slate-900">Scores</h2>
                            <p className="text-[15px] text-slate-700 leading-relaxed font-medium">
                                When you finish the practice test, go to <span className="font-bold text-slate-900">My Practice</span> to see your scores and get personalized study tips.
                            </p>
                        </div>

                        {/* Assistive Technology (AT) */}
                        <div className="space-y-2">
                            <h2 className="text-[19px] font-bold text-slate-900">Assistive Technology (AT)</h2>
                            <p className="text-[15px] text-slate-700 leading-relaxed font-medium">
                                Be sure to practice with any AT you use for testing. If you configure your AT settings here, you may need to repeat this step on test day.
                            </p>
                        </div>

                        {/* No Device Lock */}
                        <div className="flex items-start gap-4">
                            <div className="bg-slate-100 p-2.5 rounded-lg shrink-0 mt-1">
                                <Unlock className="w-5 h-5 text-slate-600" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-[19px] font-bold text-slate-900">No Device Lock</h2>
                                <p className="text-[15px] text-slate-700 leading-relaxed font-medium">
                                    We don't lock your device during practice. On test day, you'll be blocked from using other programs or apps.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="h-20 bg-white border-t border-slate-200 px-8 flex items-center justify-end gap-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative z-10">
                <button
                    onClick={onBack}
                    className="h-11 px-8 rounded-full bg-[#3B5998] hover:bg-[#2d4373] text-white font-bold text-[15px] transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={onNext}
                    className="h-11 px-8 rounded-full bg-[#3B5998] hover:bg-[#2d4373] text-white font-bold text-[15px] transition-colors"
                >
                    Next
                </button>
            </div>
        </div>
    );
}
