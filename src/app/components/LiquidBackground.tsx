export function LiquidBackground() {
    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-background">
            {/* Liquid Blobs */}
            <div
                className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-20 mix-blend-screen filter blur-[120px] animate-blob"
                style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
            />
            <div
                className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-10 mix-blend-screen filter blur-[120px] animate-blob animation-delay-2000"
                style={{ background: 'radial-gradient(circle, #fbbf24 0%, transparent 70%)' }}
            />
            <div
                className="absolute bottom-[-10%] left-[20%] w-[55%] h-[55%] rounded-full opacity-15 mix-blend-screen filter blur-[120px] animate-blob animation-delay-4000"
                style={{ background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)' }}
            />

            {/* Mesh Overlay */}
            <div className="absolute inset-0 opacity-[0.05]" style={{
                backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
                backgroundSize: '32px 32px'
            }} />
        </div>
    );
}
