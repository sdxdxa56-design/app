import React, { useState } from 'react';
import { X, Mail, Lock, User, LogIn, Sparkles, Phone } from 'lucide-react';
import { sendPasswordResetEmail } from "firebase/auth";
import { loginWithEmail, registerWithEmail, loginWithGoogle, sendVerificationEmail, auth } from '../firebase';
import { Language } from '../data/translations';

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (user: { name: string; phone: string; email?: string }) => void;
  lang: Language;
}

export default function AuthModal({ onClose, onLoginSuccess, lang }: AuthModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handlePasswordReset = async () => {
    if (!email || !email.includes('@')) {
      setError(lang === 'ar' ? '❌ يرجى كتابة بريد إلكتروني صحيح أولاً في حقل البريد الإلكتروني' : '❌ Please enter a valid email address first in the email field');
      return;
    }
    setIsResetting(true);
    setError('');
    setResetSent(false);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch (err: any) {
      setError(`❌ ${err.message || (lang === 'ar' ? 'فشل إرسال رابط استعادة كلمة المرور' : 'Failed to send password reset link')}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.includes('@') || !email.includes('.')) {
      setError(lang === 'ar' ? '❌ يرجى كتابة بريد إلكتروني صحيح' : '❌ Please enter a valid email');
      return;
    }
    if (isRegistering && (!firstName.trim() || !lastName.trim())) {
      setError(lang === 'ar' ? '❌ يرجى كتابة الاسم الأول والثاني' : '❌ Please enter first and last name');
      return;
    }
    if (password.length < 6) {
      setError(lang === 'ar' ? '❌ كلمة المرور 6 أحرف على الأقل' : '❌ Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      let user: { name: string; email: string; phone: string };
      if (isRegistering) {
        user = await registerWithEmail(firstName.trim(), lastName.trim(), email.trim(), password);
        try {
          await sendVerificationEmail();
        } catch (e) {
          console.warn("Verification email sending background issue:", e);
        }
        alert(lang === 'ar' 
          ? 'تم إرسال رسالة تحقق إلى بريدك الإلكتروني. يرجى التحقق منه لتفعيل كامل الميزات.' 
          : 'Verification email sent. Please verify your email.');
      } else {
        user = await loginWithEmail(email.trim(), password);
      }
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      setError(`❌ ${err.message || (lang === 'ar' ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred')}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const user = await loginWithGoogle();
      if (user && user.email) {
        onLoginSuccess(user);
        onClose();
      }
    } catch (err: any) {
      setError(`❌ ${err.message || (lang === 'ar' ? 'فشل تسجيل الدخول عبر جوجل' : 'Google sign-in failed')}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto" dir="rtl" id="auth_modal">
      <div className="fixed inset-0 bg-black/65 transition-opacity" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl font-sans z-10 my-auto">
        
        <button onClick={onClose} className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full cursor-pointer transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 bg-gradient-to-r from-blue-700 to-blue-600 text-white text-center">
          <div className="inline-flex p-2 bg-white rounded-2xl mb-3 shadow-md border border-white/20 animate-bounce">
            <img src="/app-logo.png" alt="Yemen Souq Logo" className="w-8 h-8 object-contain rounded-xl" referrerPolicy="no-referrer" />
          </div>
          <h3 className="text-lg font-black tracking-tight">
            {lang === 'ar' ? (isRegistering ? 'إنشاء حساب جديد ✉️' : 'تسجيل الدخول ✉️') : (isRegistering ? 'Create Account ✉️' : 'Sign In ✉️')}
          </h3>
          <p className="text-xs text-blue-100 mt-1 font-medium">
            {lang === 'ar' ? 'بالبريد الإلكتروني أو حساب جوجل' : 'With email or Google account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-150 text-red-700 text-xs font-bold rounded-xl animate-shake">
              {error}
            </div>
          )}

          {/* تبويب تسجيل الدخول / إنشاء حساب */}
          <div className="flex bg-gray-50 p-1.5 rounded-xl border border-gray-150">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(false);
                setError('');
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${!isRegistering ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(true);
                setError('');
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${isRegistering ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {lang === 'ar' ? 'إنشاء حساب' : 'Create Account'}
            </button>
          </div>

          {/* حقول الاسم (عند إنشاء حساب فقط) */}
          {isRegistering && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  {lang === 'ar' ? 'الاسم الأول' : 'First Name'}
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={lang === 'ar' ? 'محمد' : 'Mohammed'}
                    className="w-full bg-slate-50 border border-slate-200 py-2.5 pr-8 pl-3 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white transition-colors text-right" 
                    required 
                  />
                  <User className="absolute right-2.5 top-3 h-4 w-4 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  {lang === 'ar' ? 'الاسم الثاني' : 'Last Name'}
                </label>
                <input 
                  type="text" 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={lang === 'ar' ? 'اليمني' : 'Alyemeni'}
                  className="w-full bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white transition-colors text-right" 
                  required 
                />
              </div>
            </div>
          )}

          {/* البريد الإلكتروني */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">
              {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
            </label>
            <div className="relative">
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full bg-slate-50 border border-slate-200 py-2.5 pr-8 pl-3 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white transition-colors text-left" 
                dir="ltr" 
                required 
              />
              <Mail className="absolute right-2.5 top-3 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* كلمة المرور */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">
              {lang === 'ar' ? 'كلمة المرور' : 'Password'}
            </label>
            <div className="relative">
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 py-2.5 pr-8 pl-3 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white transition-colors text-left" 
                dir="ltr" 
                required={!isResetting} 
              />
              <Lock className="absolute right-2.5 top-3 h-4 w-4 text-gray-400" />
            </div>
            {!isRegistering && (
              <div className="text-left mt-2">
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={isResetting}
                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-bold cursor-pointer bg-transparent border-none p-0 focus:outline-none"
                >
                  {isResetting
                    ? (lang === 'ar' ? 'جاري الإرسال...' : 'Sending...')
                    : (lang === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot Password?')}
                </button>
              </div>
            )}
          </div>

          {resetSent && (
            <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-700 text-xs font-black rounded-xl leading-relaxed">
              {lang === 'ar'
                ? '✅ تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح.'
                : '✅ Password reset link has been successfully sent to your email.'}
            </div>
          )}

          {/* زر تقديم الطلب */}
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl transition-all shadow-md text-xs flex items-center justify-center gap-2 cursor-pointer border-none disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full h-4 w-4"></span>
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            <span>
              {isSubmitting 
                ? (lang === 'ar' ? 'يرجى الانتظار...' : 'Please wait...')
                : isRegistering 
                  ? (lang === 'ar' ? 'إنشاء حساب جديد 🚀' : 'Create Account') 
                  : (lang === 'ar' ? 'تسجيل الدخول 🔓' : 'Sign In')}
            </span>
          </button>

          {/* فاصل أو */}
          <div className="flex items-center gap-3 text-xs text-gray-400 font-bold">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span>{lang === 'ar' ? 'أو' : 'or'}</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* زر تسجيل الدخول بجوجل */}
          <div className="space-y-2">
            <button 
              type="button" 
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="w-full bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-black py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>{lang === 'ar' ? 'متابعة باستخدام حساب جوجل' : 'Continue with Google Account'}</span>
            </button>
            <p className="text-[10px] text-gray-400 font-semibold text-center leading-relaxed">
              {lang === 'ar'
                ? '💡 عند الفتح داخل التطبيق أو متصفح الجوال: يرجى إدخال بريدك (Gmail) في صفحة جوجل الآمنة ليتم ربطه فوراً وحفظ بياناتك.'
                : '💡 Inside mobile web/app: please enter your Gmail address on Google’s secure page to sign in immediately.'}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
