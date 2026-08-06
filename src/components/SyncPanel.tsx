import React, { useState } from 'react';
import { RefreshCw, Database, Terminal, Copy, Check, Info, Github } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';

export default function SyncPanel() {
  const [activeTab, setActiveTab] = useState<'firebase' | 'github'>('firebase');
  const [firebaseStatus, setFirebaseStatus] = useState<'connected' | 'checking' | 'fallback'>('checking');
  const [copiedCode, setCopiedCode] = useState(false);
  
  // GitHub States
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('github_token') || '');
  const [repoName, setRepoName] = useState(() => localStorage.getItem('github_repo_name') || 'app');
  const [isPushing, setIsPushing] = useState(false);
  const [hasSavedToken, setHasSavedToken] = useState(false);

  React.useEffect(() => {
    // Check GitHub config if not running on a static platform like Netlify
    const isStaticDeploy = window.location.hostname.includes('netlify.app') || window.location.hostname.includes('github.io');
    
    if (!isStaticDeploy) {
      fetch('/api/github/config')
        .then(r => {
          if (!r.ok || !r.headers.get('content-type')?.includes('application/json')) {
            throw new Error('No JSON response');
          }
          return r.json();
        })
        .then(data => {
          if (data.repoName) {
            setRepoName(data.repoName);
          }
          if (data.hasToken) {
            setHasSavedToken(true);
          }
        })
        .catch(e => {
          console.log('GitHub API config is not active (standard for static sites).');
        });
    } else {
      console.log('Static deployment detected on ' + window.location.hostname + '. Bypassing node-server specific GitHub config endpoint.');
    }

    // Initial check for Firebase Firestore connection
    testFirebaseConnection();
  }, []);

  const [logs, setLogs] = useState<string[]>([
    '⚙️ تهيئة واجهة السوق المفتوح اليمني...',
    '🔌 فحص الاتصال بقواعد ومخدمات Google Firebase...',
    '⚡ تم تفعيل مستودع الحفظ المحلي بنجاح لمنع توقف تطبيق المشتري والناشر.',
    '💡 جاهز للمطابقة وعرض الإعلانات المبوبة.'
  ]);

  const isProductionSite = typeof window !== 'undefined' && (
    window.location.hostname.includes('netlify.app') || 
    window.location.hostname.includes('chipper-kringle-e44f65')
  );

  const testFirebaseConnection = async () => {
    setFirebaseStatus('checking');
    try {
      // Try to query any document from opensooq_listings with a limit of 1
      const q = query(collection(db, 'opensooq_listings'), limit(1));
      await getDocs(q);
      setFirebaseStatus('connected');
      setLogs(prev => [
        ...prev,
        '🔥 تم الاتصال بـ Firebase Firestore بنجاح وبدون أي مشاكل حجب!'
      ]);
    } catch (err: any) {
      console.warn("Firestore diagnostic check error:", err);
      setFirebaseStatus('fallback');
      setLogs(prev => [
        ...prev,
        `⚠️ تعذر جلب البيانات من Firestore. قد تحتاج لتفعيل الـ Database والـ Rules أولاً!`,
        `السبب: ${err?.message || err}`
      ]);
    }
  };

  const firebaseRulesCode = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 1. opensooq_listings rules
    match /opensooq_listings/{adId} {
      allow read: if true;
      allow write: if true;
    }

    // 2. opensooq_messages rules
    match /opensooq_messages/{messageId} {
      allow read, write: if true;
    }

    // 3. opensooq_users rules
    match /opensooq_users/{userId} {
      allow read, write: if true;
    }
  }
}`;

  const copyCode = () => {
    navigator.clipboard.writeText(firebaseRulesCode);
    setCopiedCode(true);
    setLogs(prev => [...prev, '📋 تم نسخ كود قواعد حماية Firestore للحافظة!']);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleTestConnection = () => {
    setLogs(prev => [...prev, '🔄 جاري محاولة إعادة فحص الاتصال بـ Firebase...']);
    testFirebaseConnection();
  };

  const handleGithubPush = async () => {
    if (!githubToken.trim() && !hasSavedToken) {
      alert('⚠️ يرجى تزويد رمز الوصول الشخصي GitHub Personal Access Token أولاً!');
      return;
    }

    setIsPushing(true);
    setLogs(prev => [
      ...prev,
      `----------------------------------------`,
      `📡 بدأت عملية الدفع التلقائي لـ GitHub...`,
      `🔑 مصادقة رمز الوصول الشخصي: ${githubToken ? githubToken.substring(0, 8) + '...' : 'المحفوظ مسبقاً على الخادم 🔒'}`,
    ]);

    try {
      const response = await fetch('/api/github/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: githubToken.trim(),
          repoName: repoName.trim() || 'app'
        }),
      });

      const data = await response.json();
      if (data.success) {
        setLogs(prev => [
          ...prev,
          `✅ نجاح دفع كود المصدر!`,
          `📦 اسم المستودع: ${repoName}`,
          `🔗 تم رفع كافة الملفات وتحديثها على GitHub بنجاح!`,
        ]);
        alert(`🎉 تم بنجاح دفع كامل كود المصدر للمستودع: ${repoName} على حسابك في GitHub!`);
      } else {
        setLogs(prev => [
          ...prev,
          `❌ فشلت العملية: ${data.message || 'خطأ غير معروف'}`,
        ]);
        alert(`❌ فشل رفع الملفات إلى GitHub: ${data.message || 'عرض السجل لمزيد من التفاصيل'}`);
      }
    } catch (error: any) {
      console.error(error);
      setLogs(prev => [
        ...prev,
        `❌ خطأ شبكة: فشل الاتصال بالخادم الداخلي (${error.message || error})`,
      ]);
      alert('❌ فشل الاتصال بخادم المعاينة لتأدية عملية الدفع.');
    } finally {
      setIsPushing(false);
    }
  };

  if (isProductionSite) {
    return (
      <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 rounded-3xl border border-blue-800 p-6 md:p-8 text-white text-right font-sans mt-8 shadow-lg relative overflow-hidden" dir="rtl" id="developer_rights_card">
        <div className="absolute right-0 bottom-0 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute left-0 top-0 w-32 h-32 bg-amber-400/5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🛡️</span>
              <div>
                <h4 className="text-base font-black text-amber-400">حقوق صانع ومطور الموقع محفوظة ©</h4>
                <p className="text-xs text-blue-200 mt-1 font-bold">تم تصميم وهندسة وبرمجة هذا النظام بالكامل وتكامله السحابي المباشر باحترافية وجودة عالية.</p>
              </div>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed max-w-2xl font-bold">
              يسعدنا تقديم أرقى خدمات تصميم وتطوير المواقع والمنصات السحابية، المتاجر الذكية، وتطبيقات الهواتف المخصصة مع لوحات تحكم مرنة. للاستشارات التقنية أو لطلب برمجة سستم خاص بك:
            </p>
          </div>

          <a
            href="https://wa.me/967775378369"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-gradient-to-l from-emerald-500 to-green-400 hover:from-emerald-600 hover:to-green-500 text-slate-950 font-black py-3.5 px-6 rounded-2xl shadow-xl hover:scale-102 transition-all cursor-pointer no-underline text-xs border border-emerald-300"
          >
            <span>💬</span>
            <span>تواصل مع المطور واتساب: 775378369</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm mt-8 text-right font-sans" dir="rtl" id="developer_sync_panel">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-gray-100 pb-5 gap-4">
        
        {/* Left segment */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-black text-orange-950 flex items-center gap-1.5">
              <span>لوحة مطور السوق اليمني (Firebase Integration Control Room)</span>
              <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">نشط</span>
            </h4>
            <p className="text-[10px] text-gray-500 font-bold mt-1">
              إدارة التكامل السحابي الفوري مع Google Firebase و Firestore وقواعد الحماية وتصدير GitHub.
            </p>
          </div>
        </div>

        {/* Right status */}
        <div className="flex items-center gap-2">
          {firebaseStatus === 'checking' ? (
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3.5 py-1.5 rounded-xl border border-amber-100 flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              جاري فحص اتصال Firebase...
            </span>
          ) : firebaseStatus === 'connected' ? (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-100 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse"></span>
              قواعد وبيانات Firebase متصلة بنجاح 🔥
            </span>
          ) : (
            <span className="text-xs font-bold text-amber-700 bg-amber-55 px-3.5 py-1.5 rounded-xl border border-amber-100 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              قاعدة البيانات Firebase بانتظار تفعيلك
            </span>
          )}

          <button
            onClick={handleTestConnection}
            className="p-2 text-gray-500 hover:text-orange-600 bg-gray-50 rounded-xl hover:bg-orange-50 transition-colors border border-gray-200 cursor-pointer"
            title="إعادة فحص الاتصال"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-gray-105 mt-6 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('firebase')}
          className={`pb-3 text-xs font-black px-4 border-b-2 transition-all cursor-pointer ${
            activeTab === 'firebase'
              ? 'border-orange-600 text-orange-600 font-extrabold'
              : 'border-transparent text-gray-400 hover:text-gray-650'
          }`}
        >
          🔥 تهيئة قاعدة بيانات Google Firebase
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('github')}
          className={`pb-3 text-xs font-black px-4 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'github'
              ? 'border-orange-600 text-orange-600 font-extrabold'
              : 'border-transparent text-gray-400 hover:text-gray-650'
          }`}
        >
          <Github className="w-3.5 h-3.5" />
          <span>🚀 دفع كود المصدر إلى GitHub</span>
          <span className="bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded text-[9px] font-black animate-pulse">جديد</span>
        </button>
      </div>

      {/* Setup Guide area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* Terminal/Log Window */}
        <div className="lg:col-span-1 bg-gray-950 text-white rounded-2xl p-4.5 font-mono text-[10px] space-y-2 flex flex-col justify-between min-h-[220px] max-h-[280px] overflow-y-auto">
          <div className="space-y-1.5">
            <p className="border-b border-gray-800 pb-1.5 text-gray-400 font-extrabold flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-orange-400" />
              <span>سجلات خادم Firebase</span>
            </p>
            {logs.map((log, index) => (
              <p key={index} className="leading-relaxed font-bold break-all">{log}</p>
            ))}
          </div>
          <p className="text-orange-400 text-left pt-2 border-t border-gray-800">FIREBASE_CLIENT_ACTIVE</p>
        </div>

        {/* Copy/Paste instruction container */}
        <div className="lg:col-span-2 space-y-4">
          {activeTab === 'firebase' ? (
            <>
              <div className="p-4 bg-orange-50/45 rounded-2xl border border-orange-100 text-xs text-orange-900 space-y-2.5">
                <p className="font-extrabold flex items-center gap-1.5 text-orange-950">
                  <Info className="h-4 w-4 text-orange-600 flex-shrink-0" />
                  <span>خطوات بسيطة لإتمام التفعيل في console.firebase.google.com:</span>
                </p>
                <ul className="list-inside space-y-1.5 mr-2 font-semibold text-gray-650 leading-relaxed text-[11px] text-gray-600 list-decimal">
                  <li>
                    ادخل إلى مشروعك <strong className="text-orange-950">ajsj-35a36</strong> في لوحة تحكم Firebase.
                  </li>
                  <li>
                    من القائمة الجانبية، اضغط على <strong>Firestore Database</strong> ثم اضغط على زر <strong>Create Database</strong>.
                  </li>
                  <li>
                    اختر <strong>Start in Test Mode</strong> أو الصق كود قواعد الحماية المفتوحة (المنسوخ بالأسفل) في تبويب <strong>Rules</strong> لضمان عمل كافة العمليات بلا قيود.
                  </li>
                  <li>
                    <strong>لا حاجة لإنشاء جداول يدوياً!</strong> بمجرد كتابة أول مستخدم أو إضافة أول إعلان من التطبيق، سيقوم Firebase بإنشاء المجموعات (Collections) التالية تلقائياً: 
                    <code className="bg-gray-100 text-orange-900 font-mono px-1 rounded mx-1 font-bold">opensooq_listings</code> و 
                    <code className="bg-gray-100 text-orange-900 font-mono px-1 rounded mx-1 font-bold">opensooq_users</code> و 
                    <code className="bg-gray-100 text-orange-900 font-mono px-1 rounded mx-1 font-bold">opensooq_messages</code>.
                  </li>
                </ul>
              </div>

              <div className="relative border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                <div className="bg-gray-100 p-2.5 text-xs font-bold text-gray-500 border-b border-gray-200 flex justify-between items-center flex-wrap gap-2">
                  <span>قواعد حماية Firestore المقترحة (Rules)</span>
                  <div className="flex gap-2">
                    <button
                      onClick={copyCode}
                      className="py-1.5 px-3.5 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-black rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border-none shadow-sm"
                    >
                      {copiedCode ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedCode ? 'تم النسخ!' : 'انسخ كود القواعد'}</span>
                    </button>
                    <a
                      href="https://console.firebase.google.com"
                      target="_blank"
                      rel="noreferrer"
                      className="py-1.5 px-3.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer no-underline border-none shadow-sm"
                    >
                      <span>فتح كونسول Firebase ↗</span>
                    </a>
                  </div>
                </div>
                <pre className="p-4 text-[10px] font-mono leading-relaxed text-slate-750 max-h-32 overflow-y-auto text-left whitespace-pre">
                  {firebaseRulesCode}
                </pre>
              </div>
            </>
          ) : (
            <div className="space-y-5">
              <div className="p-4.5 bg-amber-50/60 rounded-2xl border border-amber-200/75 text-xs text-amber-950 space-y-2.5">
                <p className="font-extrabold flex items-center gap-1.5 text-blue-900">
                  <span className="text-base">🚀</span>
                  <span>دفع مباشر بنقرة واحدة إلى GitHub:</span>
                </p>
                <div className="text-[11px] text-gray-750 font-bold leading-relaxed space-y-2">
                  <p>
                    مرحباً بك! تم دمج وضبط بيانات المستودع <code className="bg-amber-100 text-amber-950 px-1.5 py-0.5 rounded font-mono font-black">sdxdxa56-design/app</code> والرموز البرمجية في الخلفية تلقائياً لـ Firebase.
                  </p>
                  <p>
                    زر الدفع مهيأ وجاهز تماماً لدفعة واحدة سريعة ومبسطة تضمن خروج التطبيق كاملاً مع Firebase!
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isPushing}
                onClick={handleGithubPush}
                className="w-full py-4.5 bg-gradient-to-l from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-black text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer border-none disabled:bg-gray-400"
              >
                {isPushing ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>جاري رفع كامل الملفات وحل المشكلات إلى مستودع app الآن...</span>
                  </>
                ) : (
                  <>
                    <Github className="w-5 h-5 text-white" />
                    <span>دفع كود المصدر وحل مشكلة Vercel الآن 🚀</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
