import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getFirebaseAds } from '../firebase';
import AdCard from '../components/AdCard';
import { Ad } from '../types';

export default function CategoryPage() {
  const params = useParams();
  
  // Safe parsing of params from path as backup for URL direct visits/state-router integration
  const path = window.location.pathname;
  const parts = path.split('/').filter(Boolean);
  
  let category = '';
  let subcategory = '';
  let city = '';

  if (parts[0] === 'category') {
    category = parts[1] || '';
    subcategory = parts[2] || '';
  } else if (parts[0] === 'city') {
    city = parts[1] || '';
    category = parts[2] || '';
  } else {
    category = params.category || '';
    subcategory = params.subcategory || '';
    city = params.city || '';
  }

  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  // بناء عنوان SEO ديناميكي
  const getPageTitle = () => {
    let title = 'السوق المفتوح اليمن';
    if (city) title = `${decodeURIComponent(city)} - ${title}`;
    if (subcategory) title = `${decodeURIComponent(subcategory)} في ${decodeURIComponent(city) || 'اليمن'} | ${title}`;
    else if (category) title = `${decodeURIComponent(category)} في ${decodeURIComponent(city) || 'اليمن'} | ${title}`;
    return title;
  };

  // بناء وصف SEO ديناميكي
  const getMetaDescription = () => {
    if (subcategory) return `تصفح أحدث إعلانات ${decodeURIComponent(subcategory)} في ${decodeURIComponent(city) || 'اليمن'}. تواصل مباشرة مع البائع وبأفضل الأسعار.`;
    if (category) return `تصفح أحدث إعلانات ${decodeURIComponent(category)} في ${decodeURIComponent(city) || 'اليمن'}. سيارات، عقارات، جوالات والمزيد.`;
    return 'تصفح آلاف الإعلانات المبوبة المجانية في اليمن.';
  };

  // جلب الإعلانات حسب الفئة والمدينة
  const fetchAds = async (loadMore = false) => {
    if (loadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    const result = await getFirebaseAds({
      category: category ? decodeURIComponent(category) : null,
      subcategory: subcategory ? decodeURIComponent(subcategory) : null,
      city: city ? decodeURIComponent(city) : null,
    }, loadMore ? lastVisible : null, 20);

    if (result) {
      if (loadMore) {
        setAds(prev => [...prev, ...result.ads]);
      } else {
        setAds(result.ads);
      }
      setLastVisible(result.lastVisible);
      setHasMore(result.ads.length === 20);
    } else {
      if (!loadMore) {
        setAds([]);
        setHasMore(false);
      }
    }
    if (loadMore) {
      setLoadingMore(false);
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    // تحديث وسموم الـ SEO
    document.title = getPageTitle();
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', getMetaDescription());

    fetchAds();
  }, [category, subcategory, city]);

  const handleNavigate = (to: string) => {
    window.history.pushState(null, '', to);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-right" dir="rtl" id="category_page_layout">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6 flex items-center gap-1.5 flex-wrap font-semibold">
          <Link to="/" onClick={(e) => { e.preventDefault(); handleNavigate('/'); }} className="hover:text-blue-600">الرئيسية</Link>
          {category && (
            <>
              <span>/</span>
              <Link to={`/category/${category}`} onClick={(e) => { e.preventDefault(); handleNavigate(`/category/${category}`); }} className="hover:text-blue-600">{decodeURIComponent(category)}</Link>
            </>
          )}
          {subcategory && (
            <>
              <span>/</span>
              <Link to={`/category/${category}/${subcategory}`} onClick={(e) => { e.preventDefault(); handleNavigate(`/category/${category}/${subcategory}`); }} className="hover:text-blue-600">{decodeURIComponent(subcategory)}</Link>
            </>
          )}
          {city && (
            <>
              <span>/</span>
              <span className="text-gray-400">{decodeURIComponent(city)}</span>
            </>
          )}
        </nav>

        <h1 className="text-3xl font-black text-blue-950 mb-4">{getPageTitle()}</h1>
        <p className="text-gray-500 mb-8 text-sm md:text-base font-semibold leading-relaxed">{getMetaDescription()}</p>

        {loading ? (
          <div className="py-20 text-center">
            <p className="text-base font-bold text-gray-400 animate-pulse">جاري تحميل الإعلانات المبوبة لليمن...</p>
          </div>
        ) : ads.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-200 shadow-sm max-w-2xl mx-auto space-y-4">
            <div className="text-5xl">📦</div>
            <p className="text-lg font-black text-gray-700">لا توجد إعلانات هنا بعد في هذا القسم.</p>
            <p className="text-xs text-gray-400 font-bold max-w-md mx-auto">هل تمتلك منتجاً أو خدمة ترغب في بيعها؟ انشر إعلانك مجاناً الآن ليكون أول عرض يظهر هنا!</p>
            <Link to="/" onClick={(e) => { e.preventDefault(); handleNavigate('/'); }} className="text-blue-600 underline text-sm font-extrabold block">تصفح أقسام أخرى</Link>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {ads.map(ad => (
                <AdCard
                  key={ad.id}
                  ad={ad}
                  lang="ar"
                  isFavorite={false}
                  onFavoriteToggle={() => {}}
                  onAdClick={(clickedAd) => {
                    clickedAd.views = (clickedAd.views || 0) + 1;
                    window.history.pushState(null, '', `/ad/${clickedAd.id}`);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={() => fetchAds(true)}
                  disabled={loadingMore}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:bg-blue-300"
                >
                  {loadingMore ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>جاري التحميل...</span>
                    </>
                  ) : (
                    <span>تحميل المزيد من الإعلانات 🔄</span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
