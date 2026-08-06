import React from 'react';
import { Link } from 'react-router-dom';

export default function SEoFooter() {
  const cities = ['صنعاء', 'عدن', 'تعز', 'إب', 'الحديدة', 'حضرموت'];
  const categories = [
    { name: 'سيارات', sub: ['تويوتا', 'هيونداي', 'كيا', 'نيسان'] },
    { name: 'عقارات', sub: ['شقق للبيع', 'شقق للإيجار', 'فلل', 'أراضي'] },
    { name: 'جوالات', sub: ['ايفون', 'سامسونج', 'شاومي', 'هواوي'] },
    { name: 'وظائف', sub: ['مندوب مبيعات', 'سائق', 'محاسب', 'معلم'] }
  ];

  // Helper to handle client-side routing with window history as fallback/trigger
  const handleLinkClick = (to: string) => {
    window.history.pushState(null, '', to);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <footer className="bg-gray-100 border-t mt-16 py-8 px-4 rounded-3xl" dir="rtl" id="seo_footer_container">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-sm text-right">
        {categories.map(cat => (
          <div key={cat.name} className="space-y-3">
            <h3 className="font-extrabold text-blue-950 text-base">{cat.name}</h3>
            <ul className="space-y-2">
              {cat.sub.map(sub => {
                const linkPath = `/category/${cat.name}/${sub}`;
                return (
                  <li key={sub}>
                    <Link 
                      to={linkPath} 
                      onClick={() => handleLinkClick(linkPath)}
                      className="text-gray-600 hover:text-blue-600 text-xs font-bold transition-colors"
                    >
                      {sub} في اليمن
                    </Link>
                  </li>
                );
              })}
              {cities.slice(0, 3).map(city => {
                const linkPath = `/city/${city}/${cat.name}`;
                return (
                  <li key={city}>
                    <Link 
                      to={linkPath} 
                      onClick={() => handleLinkClick(linkPath)}
                      className="text-slate-700 hover:text-blue-700 text-xs font-bold transition-colors"
                    >
                      {cat.name} في {city}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-8 border-t border-gray-200 pt-6 flex flex-wrap justify-center gap-6 text-xs font-black text-slate-700">
        <Link to="/about" onClick={() => handleLinkClick('/about')} className="hover:text-blue-700">من نحن</Link>
        <Link to="/privacy" onClick={() => handleLinkClick('/privacy')} className="hover:text-blue-700">سياسة الخصوصية</Link>
        <Link to="/terms" onClick={() => handleLinkClick('/terms')} className="hover:text-blue-700">شروط الاستخدام</Link>
      </div>
      <p className="text-center text-xs text-slate-600 mt-6 font-bold">© 2026 السوق المفتوح اليمن - جميع الحقوق محفوظة</p>
    </footer>
  );
}
