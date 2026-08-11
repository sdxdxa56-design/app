import React, { useState } from 'react';
import { MapPin, Search, X, Check, Globe, ChevronDown, Filter } from 'lucide-react';
import { YEMENI_CITIES } from '../types';
import { Language } from '../data/translations';

interface GovernoratesBarProps {
  selectedCity: string;
  onSelectCity: (city: string) => void;
  adsCountByCity: Record<string, number>;
  totalAdsCount: number;
  lang: Language;
}

export default function GovernoratesBar({
  selectedCity,
  onSelectCity,
  adsCountByCity,
  totalAdsCount,
  lang
}: GovernoratesBarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Major popular governorates to display as quick pills
  const mainCities = [
    'الكل',
    'صنعاء',
    'عدن',
    'تعز',
    'المكلا',
    'إب',
    'الحديدة',
    'مأرب',
    'ذمار',
    'حضرموت',
    'سيئون',
    'شبوة'
  ];

  const filteredCities = YEMENI_CITIES.filter(city =>
    city.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div className="bg-white rounded-3xl border border-gray-200 p-4 shadow-sm mb-6 animate-fade-in" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-3">
        {/* Title & Badge */}
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl shadow-sm">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900">
                {lang === 'ar' ? 'تصفح الإعلانات حسب المحافظة اليمنية' : 'Browse Ads by Yemen Governorate'}
              </h3>
              {selectedCity ? (
                <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span>محددة: {selectedCity}</span>
                  <button 
                    onClick={() => onSelectCity('')}
                    className="hover:text-red-600 cursor-pointer border-none bg-transparent p-0"
                    title="إزالة الفلترة"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ) : (
                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {lang === 'ar' ? 'جميع المحافظات' : 'All Governorates'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 font-bold mt-0.5">
              {lang === 'ar' 
                ? 'اختر محافظتك لمشاهدة جميع السلع والسيارات والعقارات المعروضة فيها مباشرة' 
                : 'Select your city to explore active deals and listings in your area'}
            </p>
          </div>
        </div>

        {/* Action Button: Open Full Governorates Modal */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 md:flex-initial py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
          >
            <Globe className="w-4 h-4" />
            <span>{lang === 'ar' ? 'قائمة كافة المحافظات الـ 21 🗺️' : 'All 21 Governorates List 🗺️'}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </button>

          {selectedCity && (
            <button
              onClick={() => onSelectCity('')}
              className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-black rounded-2xl border border-gray-250 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === 'ar' ? 'عرض الكل' : 'Reset'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Governorate Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar text-right">
        {mainCities.map((cityName) => {
          const isAll = cityName === 'الكل';
          const isSelected = isAll ? !selectedCity : selectedCity === cityName;
          const count = isAll ? totalAdsCount : (adsCountByCity[cityName] || 0);

          return (
            <button
              key={cityName}
              onClick={() => onSelectCity(isAll ? '' : cityName)}
              className={`py-2 px-3.5 rounded-2xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border select-none ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-102'
                  : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-gray-200 hover:border-blue-200'
              }`}
            >
              <span>{isAll ? '📍 الكل' : cityName}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                isSelected ? 'bg-white/20 text-white' : 'bg-gray-200/80 text-gray-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}

        <button
          onClick={() => setIsModalOpen(true)}
          className="py-2 px-3 rounded-2xl text-xs font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 shrink-0 cursor-pointer flex items-center gap-1 transition-colors"
        >
          <span>المزيد...</span>
        </button>
      </div>

      {/* Full Governorate Selection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <div className="fixed inset-0 bg-black/65 transition-opacity" onClick={() => setIsModalOpen(false)} aria-hidden="true" />
          <div className="relative bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200 z-10 my-auto">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-2xl">
                  <MapPin className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white">
                    {lang === 'ar' ? 'اختر المحافظة اليمنية لمشاهدة إعلاناتها 🇾🇪' : 'Select Yemen Governorate 🇾🇪'}
                  </h4>
                  <p className="text-xs text-blue-200 font-medium">
                    {lang === 'ar' ? 'جميع محافظات الجمهورية اليمنية متوفرة أدناه' : 'All official Yemen governorates are available'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer border-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 bg-slate-50 border-b border-gray-200">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'ar' ? 'ابحث عن محافظة (صنعاء، عدن، تعز، المكلا...)' : 'Search governorate...'}
                  className="w-full pl-4 pr-10 py-3 bg-white border border-gray-300 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer border-none bg-transparent"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Governorates Grid */}
            <div className="p-5 overflow-y-auto max-h-[55vh]">
              {/* Option: All Governorates */}
              <button
                onClick={() => {
                  onSelectCity('');
                  setIsModalOpen(false);
                }}
                className={`w-full p-4 mb-3 rounded-2xl border text-right font-black text-xs transition-all flex items-center justify-between cursor-pointer ${
                  !selectedCity
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-white hover:bg-blue-50 text-slate-800 border-gray-250 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Globe className={`w-5 h-5 ${!selectedCity ? 'text-amber-300' : 'text-blue-600'}`} />
                  <div>
                    <span className="block text-sm">{lang === 'ar' ? 'جميع المحافظات (عرض كل الإعلانات)' : 'All Governorates'}</span>
                    <span className={`text-[10px] font-normal ${!selectedCity ? 'text-blue-100' : 'text-gray-500'}`}>
                      {lang === 'ar' ? 'إظهار كافة الإعلانات النشطة دون تصفية موقع' : 'Show all active ads nationwide'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono px-2.5 py-1 rounded-xl ${
                    !selectedCity ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {totalAdsCount} إعلان
                  </span>
                  {!selectedCity && <Check className="w-5 h-5 text-amber-300" />}
                </div>
              </button>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredCities.map((cityName) => {
                  const isSelected = selectedCity === cityName;
                  const count = adsCountByCity[cityName] || 0;

                  return (
                    <button
                      key={cityName}
                      onClick={() => {
                        onSelectCity(cityName);
                        setIsModalOpen(false);
                      }}
                      className={`p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer select-none ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.02]'
                          : 'bg-white hover:bg-slate-50 text-slate-800 border-gray-250 hover:border-blue-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="block text-xs font-black truncate">{cityName}</span>
                        <span className={`text-[10px] font-bold block mt-0.5 ${
                          isSelected ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {count} {count === 1 ? 'إعلان' : count === 2 ? 'إعلانان' : 'إعلانات'}
                        </span>
                      </div>

                      {isSelected && <Check className="w-4 h-4 text-amber-300 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {filteredCities.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-xs font-bold">لم نتمكن من العثور على محافظة بهذا الاسم "{searchQuery}"</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100 border-t border-gray-200 flex items-center justify-between text-xs">
              <span className="text-gray-600 font-bold">
                إجمالي المحافظات: {YEMENI_CITIES.length} محافظة
              </span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="py-2 px-5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl transition-colors cursor-pointer border-none"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
