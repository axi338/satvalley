import { useEffect, useState, useCallback } from 'react';

interface AntiCheatOptions {
    onViolation: (type: string, details?: string) => void;
    enabled?: boolean;
}

export function useAntiCheat({ onViolation, enabled = true }: AntiCheatOptions) {
    const [isFullscreen, setIsFullscreen] = useState(true); // Assume true initially to avoid flicker, or check doc
    const [violations, setViolations] = useState<string[]>([]);

    const logViolation = useCallback((type: string) => {
        if (!enabled) return;
        setViolations(prev => [...prev, `${type} at ${new Date().toLocaleTimeString()}`]);
        onViolation(type);
    }, [enabled, onViolation]);

    // 1. Visibility / Tab Focus
    useEffect(() => {
        if (!enabled) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                logViolation('TAB_SWITCH_DETECTED');
            }
        };

        const handleBlur = () => {
            logViolation('WINDOW_BLUR_DETECTED');
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleBlur);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);
        };
    }, [enabled, logViolation]);

    // 2. Fullscreen Enforcement
    useEffect(() => {
        if (!enabled) return;

        const checkFullscreen = () => {
            const isFull = !!document.fullscreenElement;
            setIsFullscreen(isFull);
            if (!isFull) {
                logViolation('FULLSCREEN_EXITED');
            }
        };

        document.addEventListener('fullscreenchange', checkFullscreen);

        // Initial check
        // checkFullscreen(); // Don't log violation on mount immediately allow them to enter it manually first via UI

        return () => document.removeEventListener('fullscreenchange', checkFullscreen);
    }, [enabled, logViolation]);

    // 3. Disable Context Menu & Copy/Paste
    useEffect(() => {
        if (!enabled) return;

        const preventDefault = (e: Event) => e.preventDefault();

        const handleKeydown = (e: KeyboardEvent) => {
            // Block specific shortcuts if needed? 
            // Common: Ctrl+C, Ctrl+V, Alt+Tab (browser catches alt-tab usually)
            if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'p' || e.key === 's')) {
                e.preventDefault();
                logViolation('KEYBOARD_SHORTCUT_ATTEMPT');
            }
        };

        document.addEventListener('contextmenu', preventDefault);
        document.addEventListener('copy', preventDefault);
        document.addEventListener('paste', preventDefault);
        document.addEventListener('cut', preventDefault);
        document.addEventListener('keydown', handleKeydown);

        return () => {
            document.removeEventListener('contextmenu', preventDefault);
            document.removeEventListener('copy', preventDefault);
            document.removeEventListener('paste', preventDefault);
            document.removeEventListener('cut', preventDefault);
            document.removeEventListener('keydown', handleKeydown);
        };
    }, [enabled, logViolation]);

    const requestFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            }
        } catch (e) {
            console.error("Fullscreen blocked", e);
        }
    };

    return {
        isFullscreen,
        violations,
        requestFullscreen
    };
}
