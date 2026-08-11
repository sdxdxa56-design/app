import React, { useState, useEffect } from 'react';
import { UploadCloud, Github, Check, AlertCircle, RefreshCw, X, Code, FileCode, ExternalLink, Terminal, ShieldCheck } from 'lucide-react';

interface CodePushModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: string;
}

export default function CodePushModal({ isOpen, onClose, lang = 'ar' }: CodePushModalProps) {
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('github_token') || '');
  const [repoName, setRepoName] = useState(() => localStorage.getItem('github_repo_name') || 'app');
  const [isPushing, setIsPushing] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);
  const [hasSavedToken, setHasSavedToken] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [logs, setLogs] = useState<string[]>([
    '⚡ محرك دفع وتحديث أكواد التطبيق جاهز.',
    '📋 سيتم رفع وتحديث كافة ملفات المكونات (src/*)، الخادم (server.ts)، والأيقونات والصور الجديدة مباشرة إلى GitHub.'
  ]);

  useEffect(() => {
    fetch('/api/github/config')
      .then(res => res.json())
      .then(data => {
        if (data.repoName) setRepoName(data.repoName);
        if (data.hasToken) setHasSavedToken(true);
      })
      .catch(() => {});
  }, []);

  if (!isOpen) return null;

  const handlePushCode = async () => {
    const tokenToUse = githubToken.trim();
    if (!tokenToUse && !hasSavedToken) {
      alert(lang === 'ar' ? '⚠️ يرجى تزويد رمز الوصول الشخصي (Personal Access Token) من جيت هاب لدفعه مباشرة!' : 'Please enter your GitHub Token!');
      return;
    }

    if (tokenToUse) {
      localStorage.setItem('github_token', tokenToUse);
    }
    localStorage.setItem('github_repo_name', repoName.trim());

    setIsPushing(true);
    setPushSuccess(false);
    setLogs([
      '🚀 بدء عملية جمع ودفع كافة أكواد وتحديثات التطبيق...',
      `📦 المستودع المستهدف: ${repoName.trim()}`,
      '🔍 فحص وصناعة الحزم المصدرية...'
    ]);

    try {
      const response = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenToUse,
          repoName: repoName.trim() || 'app'
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPushSuccess(true);
        setRepoUrl(data.repoUrl || `https://github.com/${data.owner || ''}/${repoName.trim()}`);
        setLogs(prev => [
          ...prev,
          '✅ تم مسح وحزم جميع الملفات بنجاح.',
          `📁 تم رفع تحديثات الأكواد والملفات التابعة (${data.results?.length || 0} ملفات).`,
          `🎉 اكتمل رفع كود التطبيق بنجاح على GitHub!`,
          `🔗 رابط المستودع: ${data.repoUrl || `https://github.com/${data.owner || ''}/${repoName.trim()}`}`
        ]);
      } else {
        setLogs(prev => [
          ...prev,
          `❌ فشلت عملية الدفع: ${data.message || 'خطأ أثناء الاتصال بالخادم'}`
        ]);
        alert(data.message || 'فشلت عملية الدفع، يرجى التحقق من المفتاح أو إعدادات المستودع.');
      }
    } catch (err: any) {
      setLogs(prev => [
        ...prev,
        `❌ خطأ غير متوقع: ${err?.message || 'تعذر الاتصال بالخادم'}`
      ]);
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/65 transition-opacity" onClick={onClose} aria-hidden="true" />

      {/* Main Dialog */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-right z-10 flex flex-col my-auto">
        
        {/* Dialog Header */}
        <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 p-5 text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center shrink-0">
              <UploadCloud className="w-7 h-7 text-amber-400 animate-bounce" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black flex items-center gap-2">
                <span>{lang === 'ar' ? 'دفع وتحديث أكواد التطبيق المباشرة' : 'Direct App Code Push'}</span>
                <span className="bg-amber-400 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-black">
                  LIVE PUSH
                </span>
              </h3>
              <p className="text-xs text-blue-200 font-medium mt-0.5">
                {lang === 'ar' ? 'زر سريع ومباشر لدفع كافة تعديلات كود التطبيق والأيقونات إلى GitHub' : 'Direct one-click code sync to GitHub'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all border-none cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dialog Content */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Information Notice */}
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 space-y-2">
            <div className="flex items-center gap-2 font-black text-sm text-blue-950 dark:text-white">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>{lang === 'ar' ? 'كيف يعمل زر دفع وتحديث أكواد التطبيق؟' : 'How Direct App Code Push Works'}</span>
            </div>
            <p className="leading-relaxed font-bold">
              {lang === 'ar' 
                ? 'عند الضغط على الزر أدناه، يقراء النظام جميع مكونات التطبيق والتحديثات الجديدة (App.tsx, header, CSS, icons, server.ts) ويدفعها فوراً إلى المستودع الخاص بك على GitHub بنفس اللحظة!'
                : 'Pushes all active application component files, assets, icons, and backend scripts directly to your GitHub repository in real time.'}
            </p>
          </div>

          {/* GitHub Token / Config Input */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'ar' ? 'رمز الوصول الشخصي من جيت هاب (GitHub Personal Access Token):' : 'GitHub Token:'}
              </label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder={hasSavedToken ? '🔒 مسجل ومحفوظ تلقائياً على الخادم' : 'ghp_xxxxxxxxxxxxxxxxxxxx'}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'ar' ? 'اسم مستودع GitHub (Repository Name):' : 'Repository Name:'}
              </label>
              <input
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="app"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Execution Terminal Output */}
          <div className="bg-slate-950 text-slate-100 rounded-2xl p-4 font-mono text-[11px] space-y-1.5 max-h-48 overflow-y-auto border border-slate-800 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-slate-400 font-bold">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>{lang === 'ar' ? 'سجل عمليات دفع الأكواد (Push Output)' : 'Push Log'}</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">LIVE LOG</span>
            </div>
            {logs.map((log, idx) => (
              <p key={idx} className="leading-relaxed font-sans">{log}</p>
            ))}
          </div>

          {/* Success Link Banner */}
          {pushSuccess && repoUrl && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-black">
                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{lang === 'ar' ? 'تم دفع كافة أكواد التطبيق بنجاح إلى المستودع!' : 'All application code pushed successfully!'}</span>
              </div>
              <a
                href={repoUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 transition-all no-underline shrink-0 shadow-md"
              >
                <span>{lang === 'ar' ? 'فتح المستودع على GitHub ↗' : 'Open Repo ↗'}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Main Direct Push Button */}
          <button
            type="button"
            disabled={isPushing}
            onClick={handlePushCode}
            className="w-full py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-800 hover:to-indigo-900 text-white font-black text-sm sm:text-base rounded-2xl shadow-xl hover:shadow-2xl transition-all cursor-pointer border-none flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            {isPushing ? (
              <>
                <RefreshCw className="w-6 h-6 animate-spin text-amber-300" />
                <span>{lang === 'ar' ? 'جاري دفع كافة أكواد وملفات التطبيق إلى GitHub...' : 'Pushing application code...'}</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-6 h-6 text-amber-300 group-hover:scale-110 transition-transform" />
                <span>{lang === 'ar' ? '🚀 دفع كافة أكواد وتغييرات التطبيق الآن إلى GitHub' : '🚀 Push Application Code Now to GitHub'}</span>
              </>
            )}
          </button>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 font-bold">
          <span>Yemen Souq Code Pusher</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-white rounded-xl transition-all border-none cursor-pointer"
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
}
