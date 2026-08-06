import React from 'react';
import * as Icons from 'lucide-react';
import { CATEGORIES, Category } from '../types';

interface HeroProps {
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
  onSearch: (term: string) => void;
}

export default function Hero({ selectedCategory, onCategorySelect, onSearch }: HeroProps) {

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || Icons.HelpCircle;
    return <IconComponent className="w-6 h-6 stroke-[2]" />;
  };

  return (
    <section className="w-full bg-slate-50 py-10 px-4 border-b border-gray-200" dir="rtl" id="hero_section">
      <div className="max-w-7xl mx-auto">
        {/* Banner Card */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-850 text-white rounded-3xl p-8 shadow-xl text-center relative overflow-hidden mb-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none"></div>

          <p className="inline-block bg-amber-400 text-blue-950 text-[10px] sm:text-xs font-black px-4 py-1.5 rounded-full mb-4 shadow">
            🇾🇪 السوق المفتوح اليمني الأول والآمن لبيع وشراء وصيانة السلع بدون أي عمولة أو وسيط!
          </p>

          <h1 className="text-xl md:text-3xl font-extrabold tracking-tight mb-3">
            السوق المفتوح اليمن: سيارات، عقارات شقق، جوالات، خدمات ووظائف شاغرة
          </h1>
          <p className="text-xs md:text-sm text-blue-100 max-w-2xl mx-auto mb-6 font-semibold leading-relaxed">
            تصفح آلاف الإعلانات الحقيقية المضافة والمحدثة يومياً في صنعاء، عدن، تعز، حضرموت، وكافة محافظات اليمن مباشرة من المالك!
          </p>

          {/* Quick Statistics Tag */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] md:text-xs text-blue-100 font-bold">
            <span>🔹 32,490+ إعلان يمني معروض</span>
            <span>🔸 4,110+ جوال وسيارات مباعة هذا الأسبوع</span>
            <span>🔹 قنوات ومحادثات سحابية آمنة وموثقة</span>
          </div>
        </div>

        {/* Section Heading */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base sm:text-lg font-black text-blue-950">تصفح حسب فئات السوق المفتوح اليمن</h2>
            <p className="text-xs text-slate-600 font-bold mt-1">اختر قسماً للعثور على ما تبحث عنه بدقة تامة وبأفضل فرز</p>
          </div>
          {selectedCategory && (
            <button
              onClick={() => onCategorySelect(null)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 py-1.5 px-3.5 rounded-lg border border-blue-100 cursor-pointer"
            >
              عرض كافة الفئات
            </button>
          )}
        </div>

        {/* Categories Grid - Matching OpenSooq Grid Setup */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
          {CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => onCategorySelect(isSelected ? null : category.id)}
                className={`flex flex-col items-center justify-center text-center p-5 rounded-3xl border transition-all duration-300 hover:scale-[1.03] hover:shadow-md cursor-pointer group ${
                  isSelected
                    ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-inner bg-blue-50/80 font-bold scale-[1.03]'
                    : `${category.color} border-transparent bg-white shadow-sm font-bold`
                }`}
              >
                <div className={`p-3.5 rounded-2xl mb-3.5 transition-transform duration-300 ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-50 text-inherit border border-gray-100 group-hover:scale-110'}`}>
                  {getIcon(category.icon)}
                </div>
                <span className="text-xs font-black text-slate-900 line-clamp-1 block leading-tight">{category.name}</span>
                <span className="text-[10px] text-slate-600 mt-1 block">({category.subcategories.length} فروع)</span>
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
}
