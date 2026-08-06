import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function About() {
  const handleNavigate = (to: string) => {
    window.history.pushState(null, '', to);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  useEffect(() => {
    document.title = 'من نحن | السوق المفتوح اليمن';
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 text-right" dir="rtl" id="about_page">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl border border-gray-200 shadow-sm space-y-6">
        <h1 className="text-3xl font-black text-blue-950 border-b pb-4">من نحن - السوق المفتوح اليمن 🇾🇪</h1>
        
        <p className="text-gray-700 leading-relaxed font-semibold">
          مرحباً بكم في <strong className="text-blue-600">السوق المفتوح اليمن</strong>، المنصة الأولى الرائدة للإعلانات المبوبة المجانية في الجمهورية اليمنية.
        </p>

        <h2 className="text-xl font-bold text-blue-950">رؤيتنا</h2>
        <p className="text-gray-600 leading-relaxed font-medium">
          نهدف إلى تمكين وتسهيل التجارة بين أفراد المجتمع اليمني في كافة المحافظات (صنعاء، عدن، تعز، حضرموت، إب، الحديدة، وبقية المناطق) لتمكين أي شخص من بيع وشراء السلع والخدمات والعقارات والسيارات مباشرة وبسهولة تامة بدون الحاجة لأي وسيط أو دفع عمولات باهظة.
        </p>

        <h2 className="text-xl font-bold text-blue-950">لماذا نحن؟</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-600 font-medium pr-4">
          <li><strong>أمان كامل:</strong> نعتمد على نظام توثيق ومراقبة صارم مع توفير شارات الحسابات الموثقة لتعزيز الثقة المتبادلة.</li>
          <li><strong>مجاني بنسبة 100%:</strong> نشر وتصفح الإعلانات مجاني بالكامل بدون أي عمولات خفية.</li>
          <li><strong>تواصل مباشر وفوري:</strong> نوفر خيارات الاتصال الهاتفي الفوري والدردشة المباشرة المتكاملة والموثقة لتسريع الصفقات.</li>
        </ul>

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
