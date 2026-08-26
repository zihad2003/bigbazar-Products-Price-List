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
                <div className="min-h-screen bg-[#f8fafc] text-zinc-900 flex flex-col items-center justify-center p-6 text-center font-sans">
                    <div className="max-w-md w-full bg-white border border-zinc-200/80 p-8 md:p-10 rounded-[32px] shadow-xl shadow-zinc-200/60 space-y-6">
                        <div className="w-16 h-16 bg-[#ce112d]/10 border border-[#ce112d]/20 rounded-3xl flex items-center justify-center mx-auto text-[#ce112d] shadow-md shadow-red-500/10">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>

                        <div className="space-y-2.5">
                            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-zinc-900 italic">
                                সাময়িক <span className="text-[#ce112d]">ত্রুটি হয়েছে</span>
                            </h1>
                            <p className="text-xs text-zinc-500 font-medium leading-relaxed">
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
                                className="w-full py-3.5 bg-[#ce112d] hover:bg-[#b00e26] text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-red-600/20 active:scale-95 transition-all cursor-pointer"
                            >
                                পেজ রিফ্রেশ করুন (Refresh Page)
                            </button>
                            <button
                                onClick={() => {
                                    try {
                                        localStorage.removeItem('bb_site_settings_cache');
                                        sessionStorage.clear();
                                    } catch (e) {}
                                    window.location.href = '/';
                                }}
                                className="w-full py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold uppercase tracking-wider rounded-2xl transition-all border border-zinc-200 cursor-pointer"
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
