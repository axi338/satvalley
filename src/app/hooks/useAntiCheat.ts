import { useEffect, useState, useCallback } from 'react';

interface AntiCheatOptions {
    enabled: boolean;
    onViolation: (type: string) => void;
}

export function useAntiCheat({ enabled, onViolation }: AntiCheatOptions) {
    const [isFullscreen, setIsFullscreen] = useState(true); // Default to true to avoid initial flash

    // Request fullscreen helper
    const requestFullscreen = useCallback(async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            }
        } catch (e) {
            console.error("Fullscreen request failed", e);
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                onViolation('tab_switch');
            }
        };

        const handleBlur = () => {
            // Check if focus moved to an allowed iframe (like Desmos)
            // document.activeElement will point to the iframe if it received focus
            const activeElement = document.activeElement;
            const isAhllowedIframe = activeElement && (
                activeElement.tagName === 'IFRAME' ||
                activeElement.closest('.allow-anticheat-focus') // Add this class to allowed containers
            );

            if (!isAhllowedIframe) {
                // Slight delay to allow valid focus transitions
                setTimeout(() => {
                    if (!document.hasFocus()) {
                        onViolation('window_blur');
                    }
                }, 100);
            }
        };

        const handleFullscreenChange = () => {
            const isFull = !!document.fullscreenElement;
            setIsFullscreen(isFull);
            if (!isFull) {
                onViolation('fullscreen_exit');
            }
        };

        // Initial check
        if (!document.fullscreenElement) {
            setIsFullscreen(false);
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        // Prevent context menu (right click)
        const handleContextMenu = (e: MouseEvent) => e.preventDefault();
        document.addEventListener('contextmenu', handleContextMenu);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [enabled, onViolation]);

    return {
        isFullscreen,
        requestFullscreen
    };
}
