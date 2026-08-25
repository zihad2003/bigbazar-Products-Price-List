import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
                    <div className="max-w-md w-full bg-zinc-900/90 border border-white/10 p-8 md:p-10 rounded-[36px] shadow-2xl space-y-6 backdrop-blur-2xl">
                        <div className="w-16 h-16 bg-[#ce112d]/10 border border-[#ce112d]/30 rounded-3xl flex items-center justify-center mx-auto text-[#ce112d] shadow-lg shadow-red-900/20">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>

                        <div className="space-y-2.5">
                            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white italic">
                                সাময়িক <span className="text-[#ce112d]">ত্রুটি হয়েছে</span>
                            </h1>
                            <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                                সংযোগ বা ক্যাশের কারণে সমস্যাটি হয়েছে। নিচের বাটনে চাপ দিয়ে পেজটি রিফ্রেশ করুন।
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 pt-2">
                            <button
                                onClick={() => {
                                    try {
                                        localStorage.removeItem('bb_site_settings_cache');
                                        sessionStorage.clear();
                                    } catch (e) {}
                                    window.location.href = '/?refresh=' + Date.now();
                                }}
                                className="w-full py-3.5 bg-[#ce112d] hover:bg-[#b00e26] text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-xl shadow-red-900/40 active:scale-95 transition-all"
                            >
                                পেজ রিফ্রেশ করুন (Refresh Page)
                            </button>
                            <button
                                onClick={() => {
                                    try {
                                        localStorage.removeItem('bb_site_settings_cache');
                                    } catch (e) {}
                                    window.location.href = '/';
                                }}
                                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-wider rounded-2xl transition-all border border-white/5"
                            >
                                হোমপেজে ফিরে যান (Return Home)
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
