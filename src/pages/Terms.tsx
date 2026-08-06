import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Terms() {
  const handleNavigate = (to: string) => {
    window.history.pushState(null, '', to);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  useEffect(() => {
    document.title = 'شروط الاستخدام | السوق المفتوح اليمن';
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 text-right" dir="rtl" id="terms_page">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl border border-gray-200 shadow-sm space-y-6">
        <h1 className="text-3xl font-black text-blue-950 border-b pb-4">شروط وأحكام الاستخدام ⚖️</h1>
        
        <p className="text-gray-700 leading-relaxed font-semibold">
          باستخدامك لمنصة <strong className="text-blue-600">السوق المفتوح اليمن</strong>، فإنك توافق التزاماً كاملاً بالشروط والأحكام المبينة أدناه. يرجى قراءتها بعناية قبل البدء في تصفح أو نشر إعلاناتك السحابية.
        </p>

        <h2 className="text-xl font-bold text-blue-950">1. شروط نشر الإعلانات</h2>
        <p className="text-gray-600 leading-relaxed font-medium">
          عند نشر أي إعلان على منصتنا، يجب عليك الالتزام بما يلي:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 font-medium pr-4">
          <li>أن تكون كافة المعلومات والصور المرفقة حقيقية ودقيقة وتصف السلعة الفعلية بدقة.</li>
          <li>عدم نشر سلع أو خدمات تخالف القوانين أو الأخلاق العامة أو الشريعة الإسلامية السمحاء.</li>
          <li>أن تملك الحق الكامل لبيع السلعة المعروضة ولديك الصلاحية القانونية للتصرف بها.</li>
        </ul>

        <h2 className="text-xl font-bold text-blue-950">2. إخلاء المسؤولية</h2>
        <p className="text-gray-600 leading-relaxed font-medium">
          تعتبر منصة السوق المفتوح اليمن وسيطاً تقنياً يربط البائع بالمشتري مباشرة. نحن لا نتحمل أي مسؤولية عن جودة أو سلامة أو مشروعية السلع المعروضة، أو عن أي تعاملات مالية تتم بين الأطراف خارج المنصة. ننصح بشدة بالمعاينة والتأكد الفعلي قبل دفع أي عربون مالي.
        </p>

        <h2 className="text-xl font-bold text-blue-950">3. حظر الحسابات المخالفة</h2>
        <p className="text-gray-600 leading-relaxed font-medium">
          تحتفظ إدارة المنصة بالحق الكامل والمطلق في تعديل أو حذف أي إعلان، أو حظر وإيقاف أي حساب مستخدم يثبت تورطه في عمليات احتيال، أو تقديم معلومات مضللة، أو تكرار نشر الإعلانات غير المرغوبة.
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
