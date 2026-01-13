import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center">
                    <h1 className="text-6xl font-black italic mb-4 text-[#ce112d]">OODS!</h1>
                    <p className="text-neutral-400 mb-8 max-w-md">Something went wrong. Don't worry, even the greatest machines need a reboot sometimes.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-8 py-4 bg-[#ce112d] text-white font-black uppercase tracking-widest rounded-3xl shadow-2xl shadow-red-900/40 hover:scale-105 transition-transform"
                    >
                        Refresh Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
