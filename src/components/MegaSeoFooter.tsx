import React from 'react';
import { Link } from 'react-router-dom';

interface MegaSeoFooterProps {
  onOpenAndroidApk?: () => void;
}

export default function MegaSeoFooter({ onOpenAndroidApk }: MegaSeoFooterProps) {
  const handleNavigate = (to: string) => {
    window.history.pushState(null, '', to);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const cities = [
    'صنعاء', 'عدن', 'تعز', 'حضرموت', 'إب', 'الحديدة',
    'مأرب', 'ذمار', 'عمران', 'شبوة', 'صعدة', 'حجة',
    'البيضاء', 'لحج', 'أبين', 'الضالع', 'الجوف', 'المهرة',
    'سقطرى', 'المحويت', 'ريمة', 'المكلا', 'سيئون'
  ];

  const categories = [
    { name: 'سيارات للبيع في اليمن', url: '/category/سيارات' },
    { name: 'عقارات وشقق للبيع والإيجار', url: '/category/عقارات' },
    { name: 'جوالات وموبايلات', url: '/category/جوالات' },
    { name: 'وظائف شاغرة وتوظيف', url: '/category/وظائف' },
    { name: 'أثاث ومستلزمات منزلية', url: '/category/أثاث' },
    { name: 'طاقة شمسية ومولدات', url: '/category/طاقة%20شمسية' },
    { name: 'خدمات ومقاولات', url: '/category/خدمات' },
    { name: 'حيوانات ومواشي', url: '/category/حيوانات' },
  ];

  const keywordsList = [
    "السوق المفتوح", "السوق اليمني", "سوق اليمن", "اليمن", "بيع", "شراء", "إعلانات مبوبة",
    "سيارات للبيع في اليمن", "عقارات اليمن", "شقق للبيع في صنعاء", "شقق للإيجار في عدن",
    "جوالات للبيع", "وظائف اليمن", "أثاث يمني", "سوق صنعاء", "سوق عدن", "سوق تعز", "سوق حضرموت",
    "سوق إب", "سوق الحديدة", "سوق مأرب", "سوق ذمار", "سوق عمران", "سوق شبوة", "سوق لحج",
    "سوق أبين", "سوق الضالع", "سوق البيضاء", "سوق الجوف", "سوق صعدة", "سوق المحويت", "سوق حجة",
    "سوق ريمة", "سوق المكلا", "سوق سيئون", "سوق زنجبار", "بيع سيارات", "شراء عقار", "محافظات اليمن",
    "مدن اليمن", "معارض سيارات", "مكاتب عقارية", "محلات جوالات", "وظائف شاغرة", "توظيف", "خدمات اليمن",
    "مقاولات", "نقل عفش", "صيانة", "كهربائي", "سباك", "دهان", "نجار", "حداد", "مظلات", "خيام",
    "عسل يمني", "بهارات يمنية", "قات", "يمني", "يمنية", "سوق اليمن المفتوح", "منصة بيع وشراء",
    "إعلانات مجانية", "موقع إعلانات", "سوق إلكتروني", "تجارة إلكترونية", "تسوق أونلاين", "بيع أونلاين",
    "شراء أونلاين", "سيارات مستعملة", "سيارات جديدة", "عقارات للبيع", "عقارات للإيجار", "أراضي للبيع",
    "فلل للبيع", "بيوت للبيع", "محلات للبيع", "مكاتب للإيجار", "شقق مفروشة", "شقق غير مفروشة",
    "استثمار عقاري", "تمليك", "موبايلات", "تابلت", "ايفون", "سامسونج", "هواوي", "شاومي",
    "نوكيا", "اكسسوارات جوال", "قطع غيار جوال", "صيانة جوال", "لابتوب", "كمبيوتر", "شاشات",
    "تلفزيونات", "ثلاجات", "غسالات", "مكيفات", "أجهزة منزلية", "إلكترونيات", "كاميرات", "تصوير",
    "طاقة شمسية", "ألواح شمسية", "بطاريات", "انفرتر", "منظم شحن", "مولدات كهرباء", "توصيل طلبات",
    "تنظيف منازل", "فحص سيارات", "تأمين سيارات", "استشارات قانونية", "محامي", "تأشيرات", "سفر وسياحة"
  ];

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 mt-20 border-t border-slate-800" dir="rtl" id="mega_seo_footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Intro SEO text banner */}
        <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700/60 shadow-inner space-y-3">
          <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2.5">
            <img src="/app-logo.png" alt="Yemen Souq Logo" className="w-9 h-9 rounded-xl object-contain border border-slate-700 shadow-sm" referrerPolicy="no-referrer" />
            <span>منصة السوق المفتوح اليمنية - دليل البيع والشراء الشامل بدون عمولة</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300 font-semibold leading-relaxed">
            مرحباً بك في السوق المفتوح اليمني (Yemen Souq)، أكبر وأسرع موقع إعلانات مبوبة مجاني في الجمهورية اليمنية. تتيح لك المنصة نشر إعلانك مجاناً وبيع وشراء كافة المستلزمات والمنتجات مباشرة من المالك وبدون أي وسيط أو عمولة. سواء كنت تبحث عن سيارات للبيع في صنعاء وعدن، شقق وفلل وعقارات للبيع والإيجار، أجهزة جوال وموبايلات، أثاث مستعمل، طاقة شمسية وبطاريات، أو فرص عمل ووظائف شاغرة في اليمن.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Column 1: Yemeni Governorates */}
          <div className="space-y-4">
            <h3 className="text-base font-black text-blue-400 border-b border-slate-800 pb-2 flex items-center gap-2">
              <span>📍</span>
              <span>سوق المحافظات اليمنية</span>
            </h3>
            <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
              {cities.map((cityName) => (
                <Link
                  key={cityName}
                  to={`/city/${cityName}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigate(`/city/${cityName}`);
                  }}
                  className="text-slate-400 hover:text-amber-400 transition-colors py-1 flex items-center gap-1"
                >
                  <span className="text-[10px] text-slate-600">▪</span>
                  <span>سوق {cityName}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Column 2: Main Categories */}
          <div className="space-y-4">
            <h3 className="text-base font-black text-blue-400 border-b border-slate-800 pb-2 flex items-center gap-2">
              <span>🏷️</span>
              <span>الأقسام الرئيسية</span>
            </h3>
            <ul className="space-y-2 text-xs font-bold">
              {categories.map((cat) => (
                <li key={cat.name}>
                  <Link
                    to={cat.url}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavigate(cat.url);
                    }}
                    className="text-slate-400 hover:text-amber-400 transition-colors block py-0.5"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: High Priority Cities & Categories combinations */}
          <div className="space-y-4">
            <h3 className="text-base font-black text-blue-400 border-b border-slate-800 pb-2 flex items-center gap-2">
              <span>🔥</span>
              <span>الأكثر بحثاً في اليمن</span>
            </h3>
            <ul className="space-y-2 text-xs font-bold text-slate-400">
              <li>
                <Link to="/city/صنعاء/سيارات" onClick={(e) => { e.preventDefault(); handleNavigate('/city/صنعاء/سيارات'); }} className="hover:text-amber-400 transition-colors">
                  سيارات للبيع في صنعاء
                </Link>
              </li>
              <li>
                <Link to="/city/عدن/عقارات" onClick={(e) => { e.preventDefault(); handleNavigate('/city/عدن/عقارات'); }} className="hover:text-amber-400 transition-colors">
                  شقق للإيجار والبيع في عدن
                </Link>
              </li>
              <li>
                <Link to="/city/صنعاء/عقارات" onClick={(e) => { e.preventDefault(); handleNavigate('/city/صنعاء/عقارات'); }} className="hover:text-amber-400 transition-colors">
                  أراضي للبيع في صنعاء
                </Link>
              </li>
              <li>
                <Link to="/city/تعز/جوالات" onClick={(e) => { e.preventDefault(); handleNavigate('/city/تعز/جوالات'); }} className="hover:text-amber-400 transition-colors">
                  جوالات وايفون في تعز
                </Link>
              </li>
              <li>
                <Link to="/category/طاقة%20شمسية" onClick={(e) => { e.preventDefault(); handleNavigate('/category/طاقة%20شمسية'); }} className="hover:text-amber-400 transition-colors">
                  منظومات طاقة شمسية وانفرترات
                </Link>
              </li>
              <li>
                <Link to="/category/وظائف" onClick={(e) => { e.preventDefault(); handleNavigate('/category/وظائف'); }} className="hover:text-amber-400 transition-colors">
                  وظائف شاغرة وتوظيف في اليمن
                </Link>
              </li>
              <li>
                <Link to="/city/حضرموت/سيارات" onClick={(e) => { e.preventDefault(); handleNavigate('/city/حضرموت/سيارات'); }} className="hover:text-amber-400 transition-colors">
                  سيارات مستعملة في حضرموت والمكلا
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Platform Details */}
          <div className="space-y-4">
            <h3 className="text-base font-black text-blue-400 border-b border-slate-800 pb-2 flex items-center gap-2">
              <span>💬</span>
              <span>خدمة العملاء والتحسين</span>
            </h3>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed">
              تطبيق وموقع السوق المفتوح اليمني يعمل على مدار 24 ساعة لخدمة التجارة البينية والبيع المباشر بين اليمنيين في كافة المحافظات.
            </p>
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-xs font-bold space-y-2">
              <p className="text-slate-200">🛡️ برمجة وتطوير:</p>
              <p className="text-amber-400">المهندس اليمني</p>
              <a
                href="https://wa.me/967775378369"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl transition-colors shadow-sm"
              >
                <span>واتساب: 775378369 📲</span>
              </a>
            </div>
          </div>

        </div>

        {/* Android App APK Banner */}
        {onOpenAndroidApk && (
          <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 border border-emerald-500/40 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-right">
              <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase">
                تطبيق أندرويد APK مجاني
              </span>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                📱 حَمّل او ابنِ تطبيق أندرويد لموقعك عبر GitHub Actions
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                تطبيق أندرويد متوافق من Android 4.4 إلى Android 15 مع دعم الكاميرا ورفع الصور والسرعة بدون تعليق.
              </p>
            </div>

            <button
              onClick={onOpenAndroidApk}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-6 py-3 rounded-2xl shadow-lg hover:scale-102 transition-all cursor-pointer text-xs shrink-0 border border-emerald-300 flex items-center gap-2"
            >
              <span>🚀 بناء وتحميل تطبيق الأندرويد APK</span>
            </button>
          </div>
        )}

        {/* Dynamic Mega Keywords Tag Cloud for Search Crawlers */}
        <div className="pt-8 border-t border-slate-800 space-y-3">
          <h3 className="text-xs font-extrabold text-slate-400 flex items-center gap-1.5">
            <span>🔎</span>
            <span>كلمات البحث الشائعة في اليمن (SEO Tag Index):</span>
          </h3>
          <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-400 leading-relaxed max-h-48 overflow-y-auto p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
            {keywordsList.map((kw, i) => (
              <span key={i} className="bg-slate-800/90 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md cursor-default border border-slate-700/50">
                {kw}
              </span>
            ))}
          </div>
        </div>

        {/* Copyright notice */}
        <div className="pt-6 border-t border-slate-800 text-center text-xs font-bold text-slate-500 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} السوق المفتوح اليمني (Yemen Souq) - جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <Link to="/about" onClick={(e) => { e.preventDefault(); handleNavigate('/about'); }} className="hover:text-white">من نحن</Link>
            <span>•</span>
            <Link to="/privacy" onClick={(e) => { e.preventDefault(); handleNavigate('/privacy'); }} className="hover:text-white">سياسة الخصوصية</Link>
            <span>•</span>
            <Link to="/terms" onClick={(e) => { e.preventDefault(); handleNavigate('/terms'); }} className="hover:text-white">الشروط والأحكام</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
