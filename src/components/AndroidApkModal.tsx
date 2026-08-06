import React, { useState } from 'react';
import { Smartphone, ExternalLink, Copy, X, Sparkles, CheckCircle2, Play, ArrowRight, ShieldCheck } from 'lucide-react';
import { Language } from '../data/translations';

interface AndroidApkModalProps {
  onClose: () => void;
  lang: Language;
}

export default function AndroidApkModal({ onClose, lang }: AndroidApkModalProps) {
  // Fixed target repo for the user with zero typing
  const ownerRepo = 'sdxdxa56-design/app';
  const [copied, setCopied] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const workflowYamlContent = `name: Build Android APK

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  workflow_dispatch:

concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: false

jobs:
  build:
    name: Build Android APK
    runs-on: ubuntu-latest
    timeout-minutes: 30

    env:
      ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION: "true"

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Set up Java JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Setup Gradle
        uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: '8.5'
          build-root-directory: 'android'

      - name: Build Android APK
        run: |
          cd android
          echo "sdk.dir=$ANDROID_HOME" > local.properties
          if [ ! -f "gradlew" ]; then
            gradle wrapper --gradle-version 8.5
          fi
          chmod +x gradlew
          ./gradlew assembleDebug --stacktrace

      - name: Upload Android APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: YemenOpenSooq-Android-APK
          path: |
            android/app/build/outputs/apk/debug/*.apk
            android/app/build/outputs/apk/**/*.apk
          retention-days: 30
`;

  // Direct URLs for both creating a new workflow file or editing an existing one
  const createWorkflowFileUrl = `https://github.com/${ownerRepo}/new/main?filename=.github/workflows/build-apk.yml&value=${encodeURIComponent(workflowYamlContent)}&message=${encodeURIComponent('Add Android APK workflow')}`;
  const editWorkflowFileUrl = `https://github.com/${ownerRepo}/edit/main/.github/workflows/build-apk.yml?value=${encodeURIComponent(workflowYamlContent)}`;
  const directActionsUrl = `https://github.com/${ownerRepo}/actions`;
  const directWorkflowUrl = `https://github.com/${ownerRepo}/actions/workflows/build-apk.yml`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(workflowYamlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleAutoPushToGitHub = async () => {
    setIsSyncing(true);
    setSyncStatus('جاري رفع الكود وملف البناء تلقائياً إلى مستودع app...');
    try {
      const storedToken = localStorage.getItem('github_token') || '';
      const response = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: storedToken,
          repoName: 'app'
        })
      });
      const data = await response.json();
      if (data.success) {
        setSyncStatus('✅ تم رفع جميع ملفات المشروع وملف البناء تلقائياً إلى sdxdxa56-design/app! تم بدء عملية البناء في GitHub Actions.');
        setTimeout(() => {
          window.open(directActionsUrl, '_blank');
        }, 1500);
      } else {
        setSyncStatus(`⚠️ ${data.message || 'فشل المزامنة المباشرة'}`);
      }
    } catch (e: any) {
      setSyncStatus(`❌ حدث خطأ أثناء المزامنة: ${e?.message || 'تعذر الاتصال بالخادم'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateNewWorkflow = () => {
    navigator.clipboard.writeText(workflowYamlContent);
    setCopied(true);
    window.open(createWorkflowFileUrl, '_blank');
  };

  const handleEditWorkflow = () => {
    navigator.clipboard.writeText(workflowYamlContent);
    setCopied(true);
    window.open(editWorkflowFileUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="fixed inset-0 bg-slate-950/80 transition-opacity" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden my-auto flex flex-col z-10">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all cursor-pointer border-none"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white p-1 flex items-center justify-center border border-white/40 shadow-lg shrink-0">
              <img src="/app-logo.png" alt="Yemen Souq App Logo" className="w-full h-full object-contain rounded-xl" referrerPolicy="no-referrer" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                زر البناء التلقائي بضغطة واحدة 🚀
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100 font-bold mt-0.5">
                مستودعك جاهز ومحدد تلقائياً: <code className="bg-white/20 px-2 py-0.5 rounded text-white font-mono">{ownerRepo}</code>
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">

          {/* Explanation for 404 on New Repositories */}
          <div className="bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-800 p-4 rounded-2xl space-y-2 text-xs text-amber-950 dark:text-amber-100">
            <h3 className="font-black text-amber-900 dark:text-amber-300 text-sm flex items-center gap-1.5">
              💡 سبب ظهور خطأ 404 (Page Not Found):
            </h3>
            <p className="font-semibold leading-relaxed">
              عند تحويل المستودع إلى <code className="bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 rounded font-mono font-bold">sdxdxa56-design/app</code> الجديد، فإن الملف غير موجود حتى الآن على GitHub! يمكنك استخدام الخيار الأول بالأسفل لإنشاء الملف بضغطة واحدة تلقائياً.
            </p>
          </div>

          {/* THE PRIMARY BUTTONS FOR BOTH CASES */}
          <div className="space-y-3">
            <button
              onClick={handleAutoPushToGitHub}
              disabled={isSyncing}
              className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black py-4 px-6 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-base cursor-pointer border-2 border-blue-400 disabled:opacity-60"
            >
              <Sparkles className="w-6 h-6 text-amber-300 animate-spin shrink-0" />
              <span>{isSyncing ? 'جاري رفع الكود وملف البناء الان...' : '⚡ رفع كامل الكود وملف البناء تلقائياً إلى مستودع app المباشر 🚀'}</span>
            </button>

            {syncStatus && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-800 rounded-xl text-xs font-bold leading-relaxed text-center">
                {syncStatus}
              </div>
            )}

            <button
              onClick={handleCreateNewWorkflow}
              className="w-full bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black py-3.5 px-5 rounded-2xl shadow-md hover:scale-[1.01] transition-all flex items-center justify-center gap-2.5 text-sm cursor-pointer border border-emerald-300"
            >
              <ExternalLink className="w-5 h-5 text-amber-300 shrink-0" />
              <span>➕ إنشاء ملف البناء الجديد يدوياً على مستودع app ↗️</span>
            </button>

            <button
              onClick={handleEditWorkflow}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-3.5 px-5 rounded-xl shadow-md flex items-center justify-center gap-2 text-sm cursor-pointer transition-all border border-slate-700"
            >
              <ExternalLink className="w-5 h-5 text-emerald-400" />
              <span>✏️ تعديل وتحديث الملف (إذا كان الملف موجوداً سابقاً) ↗️</span>
            </button>

            <a
              href={directWorkflowUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 font-extrabold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs no-underline transition-all border border-slate-700"
            >
              <Play className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>🚀 تشغيل البناء مباشرة من GitHub Actions ↗️</span>
            </a>
            
            {copied && (
              <div className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 p-2.5 rounded-xl text-center text-xs font-black flex items-center justify-center gap-1.5 border border-emerald-300 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>تم نسخ كود البناء الجديد تلقائياً إلى حافظتك!</span>
              </div>
            )}
          </div>

          {/* SIMPLE 3-STEP EXPLANATION */}
          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl space-y-2.5">
            <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              خطوات الحل السريعة:
            </h3>
            
            <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
              <div className="flex items-start gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>اضغط زر <span className="font-extrabold text-emerald-600 dark:text-emerald-400">"تعديل وتحديث الملف الموجود"</span> الأخضر أعلاه.</span>
              </div>

              <div className="flex items-start gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>استبدل محتوى الملف بالكود الجديد (تم نسخه للحافظة تلقائياً) واضغط <span className="font-extrabold text-emerald-600 dark:text-emerald-400">"Commit changes"</span>.</span>
              </div>

              <div className="flex items-start gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span>أو اضغط زر <span className="font-bold text-amber-400">Run Workflow</span> في شاشة التوليد ليبدأ بناء الـ APK مباشرة.</span>
              </div>
            </div>
          </div>

          {/* DIRECT SECONDARY BUTTONS FOR QUICK ACCESS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <a
              href={directActionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800 hover:bg-slate-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 no-underline transition-all border border-slate-700"
            >
              <Play className="w-4 h-4 text-emerald-400" />
              <span>رؤية الشاشة والعملية المباشرة (Actions) ↗️</span>
            </a>

            <button
              onClick={handleCopyCode}
              className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold py-3 px-4 rounded-xl text-xs border-none cursor-pointer flex items-center justify-center gap-2 transition-all"
            >
              <Copy className="w-4 h-4 text-amber-500" />
              <span>{copied ? 'تم نسخ الكود!' : 'نسخ كود البناء فقط'}</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>المستودع: <code className="font-mono text-emerald-600 dark:text-emerald-400">{ownerRepo}</code></span>
          </div>

          <button
            onClick={onClose}
            className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white font-extrabold px-6 py-2 rounded-xl text-xs border-none cursor-pointer transition-all"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
}
