import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Phone, Lock, User, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';

const LoginModal = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const identifier = formData.mobile || formData.email;
        if (!identifier) throw new Error(language === 'bn' ? 'মোবাইল বা ইমেইল দিন' : 'Enter mobile or email');
        
        const { error: signInError } = await supabase.auth.signInWithPassword({
          mobile: formData.mobile,
          email: formData.email,
          password: formData.password
        });
        if (signInError) throw signInError;
      } else {
        if (!formData.mobile) throw new Error(language === 'bn' ? 'মোবাইল নম্বর প্রয়োজন' : 'Mobile number required');
        const { error: signUpError } = await supabase.auth.signUp(formData);
        if (signUpError) throw signUpError;
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        window.location.reload(); // Refresh to update auth state across app
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-[40px] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-8 pb-4 flex items-center justify-between">
            <h1 className="text-3xl font-black italic tracking-tighter">
              <span className="text-zinc-900">BIG</span>
              <span className="text-[#ce112d]">BAZAR</span>
            </h1>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-8 pt-0 space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-zinc-900">
                {isLogin 
                  ? (language === 'bn' ? 'ফিরে আসায় স্বাগতম' : 'Welcome Back')
                  : (language === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account')}
              </h2>
              <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
                {isLogin
                  ? (language === 'bn' ? 'আপনার অ্যাকাউন্টে লগইন করুন' : 'Login to your selective account')
                  : (language === 'bn' ? 'সেরা কালেকশন পেতে জয়েন করুন' : 'Join for selective premium drops')}
              </p>
            </div>

            {success ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-12 flex flex-col items-center justify-center text-center space-y-4"
              >
                <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                  <CheckCircle2 size={40} />
                </div>
                <div className="space-y-1">
                   <p className="text-lg font-black text-zinc-900">{language === 'bn' ? 'সফল হয়েছে!' : 'Success!'}</p>
                   <p className="text-xs font-bold text-zinc-400 uppercase">{language === 'bn' ? 'রিডাইরেক্ট করা হচ্ছে...' : 'Redirecting to your profile...'}</p>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 bg-red-50 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold"
                  >
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </motion.div>
                )}

                <div className="space-y-4">
                  {!isLogin && (
                    <div className="relative group">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-[#ce112d] transition-colors" size={18} />
                      <input
                        type="text"
                        placeholder={language === 'bn' ? 'পূর্ণ নাম' : 'Full Name'}
                        className="w-full bg-zinc-50 border-2 border-transparent focus:border-[#ce112d]/10 focus:bg-white rounded-2xl py-4 pl-14 pr-6 text-sm font-bold outline-none transition-all"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                  )}

                  <div className="relative group">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-[#ce112d] transition-colors" size={18} />
                    <input
                      type="tel"
                      placeholder={language === 'bn' ? 'মোবাইল নম্বর' : 'Mobile Number'}
                      className="w-full bg-zinc-50 border-2 border-transparent focus:border-[#ce112d]/10 focus:bg-white rounded-2xl py-4 pl-14 pr-6 text-sm font-bold outline-none transition-all"
                      value={formData.mobile}
                      onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                    />
                  </div>

                  {!isLogin && (
                    <div className="relative group">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-[#ce112d] transition-colors" size={18} />
                      <input
                        type="email"
                        placeholder={language === 'bn' ? 'ইমেইল (ঐচ্ছিক)' : 'Email (Optional)'}
                        className="w-full bg-zinc-50 border-2 border-transparent focus:border-[#ce112d]/10 focus:bg-white rounded-2xl py-4 pl-14 pr-6 text-sm font-bold outline-none transition-all"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  )}

                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-[#ce112d] transition-colors" size={18} />
                    <input
                      type="password"
                      placeholder={language === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                      className="w-full bg-zinc-50 border-2 border-transparent focus:border-[#ce112d]/10 focus:bg-white rounded-2xl py-4 pl-14 pr-6 text-sm font-bold outline-none transition-all"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-[#ce112d] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-red-500/20 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : (
                    <>
                      <span>{isLogin ? (language === 'bn' ? 'লগইন করুন' : 'Login Now') : (language === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন' : 'Register Now')}</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Footer switcher */}
            <div className="text-center">
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-900 transition-colors"
              >
                {isLogin 
                  ? (language === 'bn' ? 'অ্যাকাউন্ট নেই? এখানে সাইন আপ করুন' : 'New here? Create an account')
                  : (language === 'bn' ? 'অ্যাকাউন্ট আছে? লগইন করুন' : 'Already high-life? Login here')}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LoginModal;
