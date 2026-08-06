import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Privacy() {
  const handleNavigate = (to: string) => {
    window.history.pushState(null, '', to);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  useEffect(() => {
    document.title = 'سياسة الخصوصية | السوق المفتوح اليمن';
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 text-right" dir="rtl" id="privacy_page">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl border border-gray-200 shadow-sm space-y-6">
        <h1 className="text-3xl font-black text-blue-950 border-b pb-4">سياسة الخصوصية 🛡️</h1>
        
        <p className="text-gray-700 leading-relaxed font-semibold">
          نحن في <strong className="text-blue-600">السوق المفتوح اليمن</strong> نولي خصوصيتك وحماية بياناتك الشخصية أهمية بالغة. نوضح في هذه الصفحة كيفية جمع واستخدام وحماية البيانات الشخصية التي تزودنا بها عند استخدام المنصة.
        </p>

        <h2 className="text-xl font-bold text-blue-950">1. البيانات التي نجمعها</h2>
        <p className="text-gray-600 leading-relaxed font-medium">
          عند إنشاء حساب موثق في منصتنا، قد نطلب منك تقديم بعض المعلومات الشخصية الأساسية مثل: رقم الهاتف الجوال، والاسم، والبريد الإلكتروني، وتفاصيل الإعلان المنشور بما في ذلك الصور والموقع الجغرافي الاختياري لتسهيل البيع.
        </p>

        <h2 className="text-xl font-bold text-blue-950">2. استخدام البيانات</h2>
        <p className="text-gray-600 leading-relaxed font-medium">
          نستخدم معلوماتك الشخصية للأغراض التالية:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 font-medium pr-4">
          <li>تمكين المشترين من التواصل معك بخصوص السلع المعروضة عبر الاتصال أو الدردشة السحابية.</li>
          <li>تحسين جودة المنصة وتقديم خدمات إعلانية مخصصة تتلاءم مع احتياجاتك.</li>
          <li>التحقق من صحة وموثوقية الحسابات لمنع عمليات الاحتيال والتلاعب في السوق.</li>
        </ul>

        <h2 className="text-xl font-bold text-blue-950">3. حماية ومشاركة البيانات</h2>
        <p className="text-gray-600 leading-relaxed font-medium">
          نلتزم بعدم بيع أو تأجير أو مشاركة بياناتك الشخصية مع أي جهات خارجية لأغراض ترويجية أو تجارية دون موافقتك الصريحة، إلا في حالات الامتثال التام للقوانين والأنظمة المعمول بها في الجمهورية اليمنية.
        </p>

        <div className="pt-6 border-t">
          <Link 
            to="/" 
            onClick={(e) => { e.preventDefault(); handleNavigate('/'); }} 
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-2xl transition-all inline-block shadow-md"
          >
            الرجوع للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
