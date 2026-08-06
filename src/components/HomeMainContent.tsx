import React, { Suspense } from 'react';
import Hero from './Hero';
import GovernoratesBar from './GovernoratesBar';
import AdCard from './AdCard';
import AdCardSkeleton from './AdCardSkeleton';
import SyncPanel from './SyncPanel';
import { Ad, UserData, CATEGORIES, CAR_BRANDS } from '../types';
import { Banner } from '../firebase';
import { Filter, RefreshCw, Grid, List, PlusCircle, Sparkles, Shield, SlidersHorizontal } from 'lucide-react';

interface HomeMainContentProps {
  heroBanners: Banner[];
  regularBanners: Banner[];
  selectedCategory: string | null;
  setSelectedCategory: (cat: string | null) => void;
  selectedSubcategory: string | null;
  setSelectedSubcategory: (sub: string | null) => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  minPrice: string;
  setMinPrice: (p: string) => void;
  maxPrice: string;
  setMaxPrice: (p: string) => void;
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (f: boolean) => void;
  adsCountByCity: Record<string, number>;
  totalAdsCount: number;
  displayedAds: Ad[];
  ads: Ad[];
  lang: 'ar' | 'en';
  viewMode: 'grid' | 'list';
  setViewMode: (m: 'grid' | 'list') => void;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  favorites: string[];
  currentUser: UserData | any;
  handleSearch: (term: string) => void;
  handlePostAdClick: () => void;
  handleAdClick: (ad: Ad) => void;
  handleFavoriteToggle: (adId: string) => void;
  handleInterestClick: (ad: Ad) => void;
  fetchAds: (loadMore?: boolean) => void;
  clearFilters: () => void;
  setShowAndroidModal: (val: boolean) => void;
  setActiveAdDetail: (ad: Ad | null) => void;
}

export const HomeMainContent: React.FC<HomeMainContentProps> = ({
  heroBanners,
  regularBanners,
  selectedCategory,
  setSelectedCategory,
  selectedSubcategory,
  setSelectedSubcategory,
  selectedCity,
  setSelectedCity,
  searchTerm,
  setSearchTerm,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  showFavoritesOnly,
  setShowFavoritesOnly,
  adsCountByCity,
  totalAdsCount,
  displayedAds,
  ads,
  lang,
  viewMode,
  setViewMode,
  loading,
  loadingMore,
  hasMore,
  favorites,
  currentUser,
  handleSearch,
  handlePostAdClick,
  handleAdClick,
  handleFavoriteToggle,
  handleInterestClick,
  fetchAds,
  clearFilters,
  setShowAndroidModal,
  setActiveAdDetail,
}) => {
  const currentCategoryObj = CATEGORIES.find(c => c.id === selectedCategory);

  const handlePriceFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAds();
  };

  return (
    <>
      {/* Huge Premium Hero Banner Space */}
      {heroBanners.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mt-4" id="premium_hero_banners_container">
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-amber-300 shadow-xl h-[160px] sm:h-[220px] md:h-[280px]">
            {heroBanners.map((banner, idx) => (
              <a
                key={banner.id}
                href={banner.link}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 block group cursor-pointer"
                style={{ display: idx === 0 ? 'block' : 'none' }}
              >
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  className="w-full h-full object-cover group-hover:scale-[1.015] transition-transform duration-700"
                  referrerPolicy="no-referrer"
                  loading="eager"
                  fetchPriority="high"
                  decoding="sync"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/15 flex flex-col justify-end p-4 md:p-8 text-right">
                  <span className="bg-amber-400 text-slate-950 font-black text-[9px] md:text-xs px-3 py-1 rounded-full w-fit mb-2 animate-pulse shadow-sm">
                    إعلان مميز بمساحة ذهبية ⭐
                  </span>
                  <h3 className="text-sm md:text-2xl font-black text-white drop-shadow-md">
                    {banner.title}
                  </h3>
                  <p className="text-[10px] md:text-sm text-slate-200 mt-1 hover:underline font-bold">
                    اضغط هنا للتفاصيل والتواصل المباشر 🔗
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Hero section */}
      <Hero
        selectedCategory={selectedCategory}
        onCategorySelect={(catId) => {
          setSelectedCategory(catId);
          setSelectedSubcategory(null);
        }}
        onSearch={handleSearch}
      />

      {/* Main Grid Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-8" id="main_content_area" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        
        {/* Governorates Selection Bar */}
        <GovernoratesBar
          selectedCity={selectedCity}
          onSelectCity={(city) => setSelectedCity(city)}
          adsCountByCity={adsCountByCity}
          totalAdsCount={ads.length}
          lang={lang}
        />

        {/* Filter Indicators & View Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-200 dark:border-slate-700">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-600">
            {selectedCategory && (
              <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full flex items-center gap-1 border border-blue-100">
                <span>{lang === 'ar' ? 'القسم:' : 'Category:'} {CATEGORIES.find(c => c.id === selectedCategory)?.name}</span>
                <button onClick={() => { setSelectedCategory(null); setSelectedSubcategory(null); }} className="hover:text-red-500 font-black mr-1">×</button>
              </span>
            )}
            {selectedSubcategory && (
              <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full flex items-center gap-1 border border-emerald-100">
                <span>{lang === 'ar' ? 'الفرع:' : 'Subcategory:'} {selectedSubcategory}</span>
                <button onClick={() => setSelectedSubcategory(null)} className="hover:text-red-500 font-black mr-1">×</button>
              </span>
            )}
            {selectedCity && (
              <span className="bg-amber-50 text-amber-800 px-3 py-1.5 rounded-full flex items-center gap-1 border border-amber-200">
                <span>{lang === 'ar' ? 'المحافظة:' : 'Province:'} {selectedCity}</span>
                <button onClick={() => setSelectedCity('')} className="hover:text-red-500 font-black mr-1">×</button>
              </span>
            )}
            {searchTerm && (
              <span className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full flex items-center gap-1 border border-purple-100">
                <span>{lang === 'ar' ? 'الكلمة:' : 'Query:'} "{searchTerm}"</span>
                <button onClick={() => setSearchTerm('')} className="hover:text-red-500 font-black mr-1">×</button>
              </span>
            )}
            {showFavoritesOnly && (
              <span className="bg-red-50 text-red-700 px-3 py-1.5 rounded-full flex items-center gap-1 border border-red-100">
                <span>{lang === 'ar' ? 'المفضلة فقط' : 'Saved Listings Only'}</span>
                <button onClick={() => setShowFavoritesOnly(false)} className="hover:text-red-500 font-black mr-1">×</button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mr-auto">
            <button
              onClick={() => fetchAds()}
              className="p-2 text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-xl transition-all border border-gray-200 cursor-pointer bg-white dark:bg-slate-800 dark:border-slate-700"
              title={lang === 'ar' ? 'تحديث المعروض' : 'Refresh Listings'}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {(selectedCategory || selectedSubcategory || selectedCity || searchTerm || minPrice || maxPrice || showFavoritesOnly) && (
              <button
                onClick={clearFilters}
                className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-2 rounded-xl transition-colors cursor-pointer"
              >
                {lang === 'ar' ? 'مسح التصفية' : 'Clear Filters'}
              </button>
            )}
            <div className="flex border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors cursor-pointer border-none ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                title={lang === 'ar' ? 'عرض شبكي' : 'Grid View'}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors cursor-pointer border-none ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                title={lang === 'ar' ? 'عرض قائمة' : 'List View'}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar (shown when subcategories or car brands exist) */}
          {selectedCategory && (
            <aside className="lg:col-span-1 space-y-6" id="right_sidebar">
              {/* Subcategories picker */}
              {currentCategoryObj && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-slate-700 p-5 shadow-xs">
                  <h4 className="text-xs font-black text-blue-950 dark:text-white mb-3.5 border-b border-gray-100 dark:border-slate-700 pb-2.5">
                    {lang === 'ar' ? 'تصفية الفروع والأقسام:' : 'Filter Subcategories:'}
                  </h4>
                  <div className="space-y-1.5">
                    {currentCategoryObj.subcategories.map((sub) => (
                      <button
                        key={sub}
                        onClick={() => setSelectedSubcategory(selectedSubcategory === sub ? null : sub)}
                        className={`w-full text-right py-2 px-3.5 rounded-xl transition-all text-xs font-bold flex items-center justify-between cursor-pointer ${
                          selectedSubcategory === sub 
                            ? 'bg-blue-50 text-blue-600 font-black shadow-inner border border-blue-100' 
                            : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 border border-transparent'
                        }`}
                      >
                        <span>{sub}</span>
                        {selectedSubcategory === sub && <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Car Brands Filter Box - Only visible when Cars category is selected */}
              {selectedCategory === 'cars' && (
                <div className="bg-gradient-to-b from-amber-50/80 to-white dark:from-slate-800 dark:to-slate-800 rounded-3xl border border-amber-200 dark:border-slate-700 p-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-amber-200/80 dark:border-slate-700 pb-2.5 mb-3">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>🚗 ماركة السيارة:</span>
                    </h4>
                    <span className="text-[10px] text-amber-900 dark:text-amber-300 font-bold bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                      {CAR_BRANDS.length} ماركة
                    </span>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {CAR_BRANDS.map((brand) => {
                      const isSelected = searchTerm.toLowerCase().includes(brand.nameAr.toLowerCase()) || 
                                         searchTerm.toLowerCase().includes(brand.nameEn.toLowerCase());
                      return (
                        <button
                          key={brand.id}
                          onClick={() => {
                            if (isSelected) {
                              setSearchTerm('');
                            } else {
                              setSelectedCategory('cars');
                              setSearchTerm(brand.nameAr);
                            }
                          }}
                          className={`w-full text-right py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-amber-100/60 dark:hover:bg-slate-700'
                          }`}
                        >
                          <span>{brand.nameAr}</span>
                          <span className="text-[9px] text-slate-500 font-normal">{brand.nameEn}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </aside>
          )}

          {/* Main Listings Grid */}
          <main className={selectedCategory ? "lg:col-span-3 space-y-6" : "lg:col-span-4 space-y-6"} id="listings_section">
            
            {/* Header section */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-black text-blue-950 dark:text-white">
                  {selectedCategory 
                    ? (lang === 'ar' ? `إعلانات قسم (${CATEGORIES.find(c => c.id === selectedCategory)?.name})` : `Listings in (${CATEGORIES.find(c => c.id === selectedCategory)?.name})`)
                    : (lang === 'ar' ? 'جديد المعروضات اليوم في اليمن 🇾🇪' : 'New Classifieds Today in Yemen 🇾🇪')}
                </h3>
                <p className="text-[11px] text-gray-400 font-bold mt-1">
                  {lang === 'ar' 
                    ? `تم العثور على ${displayedAds.length} عرض يطابق خيار فرزك الحالي` 
                    : `Found ${displayedAds.length} matching offers corresponding to your filter`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-bold text-gray-400">{lang === 'ar' ? 'محدثة فريش' : 'Live Updated'}</span>
              </div>
            </div>

            {/* Dynamic Promotional Banners */}
            {regularBanners.length > 0 && (
              <div className="mb-4 bg-gradient-to-r from-amber-500/5 via-yellow-500/5 to-amber-500/5 p-4 rounded-3xl border border-amber-200/60 shadow-xs" id="marketing_banners_container">
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="text-xs">⭐</span>
                  <h4 className="text-[11px] font-black text-amber-900">
                    {lang === 'ar' ? 'مساحات ترويجية مميزة وعروض اليوم في اليمن 📢' : 'Featured Promotional Highlights & Offers in Yemen 📢'}
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {regularBanners.map((banner) => (
                    <a
                      key={banner.id}
                      href={banner.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer"
                      id={`marketing_banner_${banner.id}`}
                    >
                      <div className="h-28 w-full overflow-hidden relative flex justify-center items-center bg-gray-50">
                        <img
                          src={banner.imageUrl}
                          alt={banner.title}
                          className="h-full w-full object-cover group-hover:scale-103 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute top-2 right-2 bg-amber-400 text-slate-950 text-[8px] font-black px-2 py-0.5 rounded-full shadow-sm">
                          مميز ✨
                        </span>
                      </div>
                      <div className="p-2.5 bg-white border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate max-w-[130px]">{banner.title}</span>
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2 py-1 rounded-lg font-black flex items-center gap-0.5">
                          تواصل 💬
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Listings Grid / List */}
            {loading ? (
              <div className="space-y-4">
                <p className="text-xs font-black text-gray-400 dark:text-gray-500 animate-pulse text-center">
                  {lang === 'ar' ? '⚡ جاري جلب وتأمين آخر العروض والسلع اليمنية الفريش...' : '⚡ Fetching latest live Yemeni listings...'}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                  {[...Array(6)].map((_, i) => (
                    <AdCardSkeleton key={i} />
                  ))}
                </div>
              </div>
            ) : displayedAds.length === 0 ? (
              <div className="py-16 text-center bg-white border border-gray-200 rounded-3xl flex flex-col items-center justify-center p-6 space-y-4 shadow-sm">
                <div className="text-5xl">🔍</div>
                <div>
                  <h4 className="text-xs font-black text-gray-700">{lang === 'ar' ? 'لم نجد أي إعلانات تطابق خياراتك الحالية!' : 'No classified listings matched your criteria!'}</h4>
                  <p className="text-[11px] text-gray-400 font-bold mt-1">
                    {lang === 'ar' 
                      ? 'يرجى تبسيط نطاق البحث أو السعر، أو إدراج أول إعلان لك في هذا القسم ليكون أول عارض!' 
                      : 'Please simplify your search terms, expand your price range, or post the first listing in this category to get immediate leads!'}
                  </p>
                </div>
                <button
                  onClick={clearFilters}
                  className="py-2 px-5 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {lang === 'ar' ? 'استعادة الكل' : 'Reset Filters'}
                </button>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4" : "space-y-3"}>
                {displayedAds.map((item) => (
                  <AdCard
                    key={item.id}
                    ad={item}
                    lang={lang}
                    viewMode={viewMode}
                    isFavorite={favorites.includes(item.id)}
                    onFavoriteToggle={handleFavoriteToggle}
                    onInterestClick={handleInterestClick}
                    onAdClick={(clickedAd) => {
                      clickedAd.views = (clickedAd.views || 0) + 1;
                      setActiveAdDetail(clickedAd);
                      if (clickedAd.id) {
                        window.history.pushState(null, '', `/ad/${clickedAd.id}`);
                      }
                    }}
                  />
                ))}
                
                {hasMore && (
                  <div className="flex justify-center pt-6 col-span-2 sm:col-span-2 md:col-span-3 lg:col-span-4">
                    <button
                      onClick={() => fetchAds(true)}
                      disabled={loadingMore}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:bg-blue-300"
                    >
                      {loadingMore ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span>
                        </>
                      ) : (
                        <span>{lang === 'ar' ? 'تحميل المزيد من الإعلانات 🔄' : 'Load More Listings 🔄'}</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Sync developer panel helper */}
            {(currentUser?.email === 'sdxdxa56@gmail.com' ||
              window.location.hostname === 'localhost' ||
              window.location.hostname.includes('run.app') ||
              window.location.hostname.includes('aistudio.google.com')) && <SyncPanel />}

          </main>

        </div>

      </main>

      {/* Customer Service Help Box */}
      <div className="max-w-7xl mx-auto px-4 mt-12" dir="rtl">
        <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="text-right">
            <h3 className="text-sm font-black text-blue-950">💬 خدمة العملاء والدعم الفني</h3>
            <p className="text-xs text-gray-500 mt-1 font-bold">نحن هنا لمساعدتك. تواصل معنا مباشرة عبر واتساب لأي استفسار، مشكلة، أو لتعبئة الرصيد.</p>
          </div>
          <a
            href="https://wa.me/967775378369"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs py-3 px-6 rounded-xl transition-all shadow-md flex items-center gap-2 shrink-0 cursor-pointer border-none"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.76.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.44.79 3.07 1.2 4.74 1.2 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.91-9.91-9.91zm5.18 14.17c-.23.66-1.14 1.2-1.56 1.26-.42.06-.86.15-2.4-.5-2.03-.85-3.34-2.84-3.44-2.97-.1-.13-.82-1.09-.82-2.08s.52-1.48.7-1.68c.18-.2.4-.25.53-.25.13 0 .26.002.38.01.12.01.29-.04.45.34.16.38.55 1.34.6 1.44.05.1.08.22.02.36-.06.14-.1.22-.2.34-.1.12-.2.22-.3.3-.1.08-.2.16-.08.32.12.16.52.86 1.12 1.4.77.68 1.42.9 1.62 1 .2.1.32.08.44-.04.12-.12.52-.6.66-.8.14-.2.28-.16.48-.1.2.06 1.28.6 1.5.72.22.12.36.18.4.28.04.1.04.6-.2 1.26z"/>
            </svg>
            <span>تواصل معنا واتساب</span>
          </a>
        </div>
      </div>
    </>
  );
};

export default HomeMainContent;
