import React, { useState, useEffect, lazy, Suspense } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import AdCard from './components/AdCard';
import AdCardSkeleton from './components/AdCardSkeleton';
import AdDetailsModal from './components/AdDetailsModal';
import SyncPanel from './components/SyncPanel';
import { Ad, CATEGORIES, YEMENI_CITIES } from './types';
import { INITIAL_ADS } from './data';
import { getFirebaseAds, getFirebaseBanners, Banner, expressInterest, getFirebaseAlerts, SiteAlert, db, normalizePhone, checkGoogleRedirectResult } from './firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { Filter, SlidersHorizontal, RefreshCw, X, Heart, Shield, Sparkles, MapPin, Globe } from 'lucide-react';
import SellerProfileModal from './components/SellerProfileModal';
import { TRANSLATIONS, Language } from './data/translations';
import AlertBar from './components/AlertBar';
import BottomMobileNav from './components/BottomMobileNav';
import GovernoratesBar from './components/GovernoratesBar';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MegaSeoFooter from './components/MegaSeoFooter';
import HomeMainContent from './components/HomeMainContent';
import PostAdModal from './components/PostAdModal';
import AuthModal from './components/AuthModal';
import ChatSection from './components/ChatSection';
import UserProfileModal from './components/UserProfileModal';
import AdminPortalModal from './components/AdminPortalModal';
import AndroidApkModal from './components/AndroidApkModal';
import CodePushModal from './components/CodePushModal';
import SellerDashboard from './components/SellerDashboard';

const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const MyAccountPage = lazy(() => import('./pages/MyAccountPage'));
const About = lazy(() => import('./pages/About'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));

export default function App() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Multilingual State (Arabic / English)
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('opensooq_lang');
    return (saved === 'en' || saved === 'ar') ? saved : 'ar';
  });

  // Favorites State
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('opensooq_favorites');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Modal visibility states
  const [activeAdDetail, setActiveAdDetail] = useState<Ad | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [showCodePushModal, setShowCodePushModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [activeSellerProfile, setActiveSellerProfile] = useState<{ phone: string; name: string } | null>(null);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [alerts, setAlerts] = useState<SiteAlert[]>([]);
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<{
    adId: string;
    adTitle: string;
    buyerPhone: string;
    sellerPhone: string;
    counterpartName: string;
    counterpartPhone: string;
  } | null>(null);
  const [currentUser, setCurrentUser] = useState<{ name: string; phone: string; email?: string } | null>(null);

  // Sync HTML doc direction when language switches
  useEffect(() => {
    localStorage.setItem('opensooq_lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Safety fallback if profile modal opened without login
  useEffect(() => {
    if (showProfileModal && !currentUser) {
      setShowProfileModal(false);
      setShowAuthModal(true);
    }
  }, [showProfileModal, currentUser]);

  // Sync favorites
  const handleFavoriteToggle = (adId: string) => {
    setFavorites(prev => {
      const updated = prev.includes(adId)
        ? prev.filter(id => id !== adId)
        : [...prev, adId];
      localStorage.setItem('opensooq_favorites', JSON.stringify(updated));
      return updated;
    });
  };

  // Load User on mount & check Google redirect login
  useEffect(() => {
    const savedUser = localStorage.getItem('opensooq_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.warn(e);
      }
    }

    // Check if user returned from Google Redirect Sign-In
    checkGoogleRedirectResult().then((user) => {
      if (user && user.email) {
        setCurrentUser(user);
        localStorage.setItem('opensooq_user', JSON.stringify(user));
      }
    }).catch((err) => {
      console.warn("Error checking redirect login:", err);
    });
  }, []);

  // Real-time alerts listener
  useEffect(() => {
    const alertsQuery = query(collection(db, 'opensooq_alerts'));
    const unsubscribeAlerts = onSnapshot(alertsQuery, (snapshot) => {
      const list: SiteAlert[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          text: data.text || '',
          backgroundColor: data.backgroundColor || 'red',
          startDate: data.startDate || '',
          endDate: data.endDate || '',
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdAt: data.createdAt || new Date().toISOString()
        });
      });
      setAlerts(list);
    }, (error) => {
      console.warn("Real-time alerts subscription issue:", error);
    });

    return () => unsubscribeAlerts();
  }, []);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInterestClick = async (ad: Ad) => {
    const buyerPhone = currentUser?.phone || currentUser?.email || 'زائر';
    const buyerName = currentUser?.name || 'مشتري يمني مهتم';
    try {
      await expressInterest(ad.id, buyerPhone, buyerName, ad.phone, ad.title);
      // Increment locally in state
      setAds(prevAds => prevAds.map(item => {
        if (item.id === ad.id) {
          return { ...item, interestsCount: (item.interestsCount || 0) + 1 };
        }
        return item;
      }));
      alert(
        lang === 'ar'
          ? `👍 تم تسجيل اهتمامك بالعرض بنجاح! لقد أرسلنا تنبيهاً فورياً لمعلّن السلعة: "${ad.ownerName}" لتسريع إتمام البيع.`
          : `👍 You have expressed interest successfully! We have notified the seller: "${ad.ownerName}" instantly.`
      );
    } catch (e) {
      console.error("Failed to express interest:", e);
    }
  };

  const loadMemoryFallback = () => {
    // Apply exact same filters in-memory on INITIAL_ADS (never touches localStorage)
    let filtered = [...INITIAL_ADS];
    if (selectedCategory) {
      filtered = filtered.filter(ad => ad.category === selectedCategory);
    }
    if (selectedSubcategory) {
      filtered = filtered.filter(ad => ad.subcategory === selectedSubcategory);
    }
    if (selectedCity) {
      filtered = filtered.filter(ad => ad.city === selectedCity);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(ad =>
        ad.title.toLowerCase().includes(q) ||
        ad.description.toLowerCase().includes(q)
      );
    }
    if (minPrice) {
      filtered = filtered.filter(ad => ad.price >= Number(minPrice));
    }
    if (maxPrice) {
      filtered = filtered.filter(ad => ad.price <= Number(maxPrice));
    }

    setAds(filtered);
  };

  const fetchBanners = async () => {
    try {
      const liveBanners = await getFirebaseBanners();
      setBanners(liveBanners || []);
      const liveAlerts = await getFirebaseAlerts();
      setAlerts(liveAlerts || []);
    } catch (e) {
      console.warn("Failed to fetch marketing banners or alerts:", e);
    }
  };

  // Load list from backend
  const fetchAds = async (loadMore = false) => {
    if (loadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      fetchBanners(); // Update marketing banners in background
      const firebaseResult = await getFirebaseAds({
        category: selectedCategory,
        subcategory: selectedSubcategory,
        city: selectedCity,
        search: searchTerm,
      }, loadMore ? lastVisible : null, 20);

      if (firebaseResult) {
        let finalAds = firebaseResult.ads;
        if (minPrice) {
          finalAds = finalAds.filter(ad => ad.price >= Number(minPrice));
        }
        if (maxPrice) {
          finalAds = finalAds.filter(ad => ad.price <= Number(maxPrice));
        }

        if (loadMore) {
          setAds(prev => [...prev, ...finalAds]);
        } else {
          setAds(finalAds);
        }
        setLastVisible(firebaseResult.lastVisible);
        setHasMore(firebaseResult.ads.length === 20);
      } else {
        // Fallback to memory INITIAL_ADS if Firebase is empty or unreachable
        if (!loadMore) {
          loadMemoryFallback();
          setHasMore(false);
        }
      }
    } catch (e) {
      console.error('Error fetching ads from Firebase:', e);
      if (!loadMore) {
        loadMemoryFallback();
        setHasMore(false);
      }
    } finally {
      if (loadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Preload top hero banner image for ultra-fast LCP rendering
  useEffect(() => {
    const firstHeroBanner = banners.find(b => b.isHero);
    if (firstHeroBanner?.imageUrl) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = firstHeroBanner.imageUrl;
      link.setAttribute('fetchpriority', 'high');
      document.head.appendChild(link);
      return () => {
        try {
          if (document.head.contains(link)) {
            document.head.removeChild(link);
          }
        } catch (e) {}
      };
    }
  }, [banners]);

  // Deep-linking routing support for individual ads (/ad/:id)
  useEffect(() => {
    const handleUrlRoute = async () => {
      const path = window.location.pathname;
      setCurrentPath(path);
      if (path === '/admin') {
        setShowAdminModal(true);
        setActiveAdDetail(null);
      } else if (path.startsWith('/ad/')) {
        const adId = path.substring(4);
        if (adId) {
          try {
            const { getFirebaseAd } = await import('./firebase');
            const targetAd = await getFirebaseAd(adId);
            if (targetAd) {
              setActiveAdDetail(targetAd);
            } else {
              setActiveAdDetail(null);
            }
          } catch (e) {
            console.warn("Failed to resolve ad from deep link:", e);
            setActiveAdDetail(null);
          }
        } else {
          setActiveAdDetail(null);
        }
      } else if (path.startsWith('/category/')) {
        setActiveAdDetail(null);
        const parts = path.split('/').filter(Boolean);
        if (parts[1]) {
          setSelectedCategory(parts[1]);
        }
      } else {
        setActiveAdDetail(null);
      }
    };

    handleUrlRoute();

    // Listen to popstate for back/forward navigation support
    const onPopState = () => {
      handleUrlRoute();
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  useEffect(() => {
    fetchAds();
  }, [selectedCategory, selectedSubcategory, selectedCity, searchTerm]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handlePostAdSuccess = (newAd: Ad) => {
    setShowPostModal(false);
    
    // Update local React state immediately with the new cloud-stored ad
    setAds(prev => [newAd, ...prev]);

    fetchAds();
    alert('🎉 تهانينا! لقد تم إدراج إعلانك السحابي بنجاح وسيكون ظاهراً فوراً لجميع المشترين في المحافظات اليمنية.');
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedCity('');
    setSearchTerm('');
    setMinPrice('');
    setMaxPrice('');
    fetchAds();
  };

  const handlePriceFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAds();
  };

  const currentCategoryObj = CATEGORIES.find(c => c.id === selectedCategory);

  const handleLoginSuccess = (user: { name: string; phone: string; email?: string }) => {
    setCurrentUser(user);
    localStorage.setItem('opensooq_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('opensooq_user');
    setIsChatOpen(false);
    setActiveChat(null);
  };

  const handleStartChat = (adItem: Ad) => {
    if (!currentUser) {
      alert('⚠️ عذراً! يجب إنشاء حساب أو تسجيل الدخول أولاً للبدء بمراسلة المعلنين والدردشة معهم.');
      setActiveAdDetail(null);
      setShowAuthModal(true);
      return;
    }
    
    if (normalizePhone(adItem.phone) === normalizePhone(currentUser.phone)) {
      alert('⚠️ هذا الإعلان تابع لك! لا يمكنك بدء محادثة دردشة مع رقمك الخاص.');
      return;
    }

    setActiveChat({
      adId: adItem.id,
      adTitle: adItem.title,
      buyerPhone: normalizePhone(currentUser.phone),
      sellerPhone: normalizePhone(adItem.phone),
      counterpartName: adItem.ownerName || 'المعلن',
      counterpartPhone: normalizePhone(adItem.phone)
    });
    
    setActiveAdDetail(null);
    setIsChatOpen(true);
  };

  const handlePostAdClick = () => {
    if (!currentUser) {
      setShowAuthModal(true);
    } else {
      setShowPostModal(true);
    }
  };

  // Calculate active counters for the visual map pins
  const adsCountByCity = ads.reduce((acc, ad) => {
    acc[ad.city] = (acc[ad.city] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filter listings by favorites mode in memory
  const heroBanners = banners.filter(b => b.isHero);
  const regularBanners = banners.filter(b => !b.isHero);

  const displayedAds = showFavoritesOnly
    ? ads.filter(ad => favorites.includes(ad.id))
    : ads;

  const isPreviewEnv = typeof window !== 'undefined' && (
    window.location.hostname.includes('aistudio.google.com') ||
    window.location.hostname === 'localhost' ||
    window.location.hostname.includes('run.app')
  );

  const homeContent = (
    <HomeMainContent
      heroBanners={heroBanners}
      regularBanners={regularBanners}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      selectedSubcategory={selectedSubcategory}
      setSelectedSubcategory={setSelectedSubcategory}
      selectedCity={selectedCity}
      setSelectedCity={setSelectedCity}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      minPrice={minPrice}
      setMinPrice={setMinPrice}
      maxPrice={maxPrice}
      setMaxPrice={setMaxPrice}
      showFavoritesOnly={showFavoritesOnly}
      setShowFavoritesOnly={setShowFavoritesOnly}
      adsCountByCity={adsCountByCity}
      totalAdsCount={ads.length}
      displayedAds={displayedAds}
      ads={ads}
      lang={lang}
      viewMode={viewMode}
      setViewMode={setViewMode}
      loading={loading}
      loadingMore={loadingMore}
      hasMore={hasMore}
      favorites={favorites}
      currentUser={currentUser}
      handleSearch={handleSearch}
      handlePostAdClick={handlePostAdClick}
      handleAdClick={(ad) => setActiveAdDetail(ad)}
      handleFavoriteToggle={handleFavoriteToggle}
      handleInterestClick={handleInterestClick}
      fetchAds={fetchAds}
      clearFilters={clearFilters}
      setShowAndroidModal={isPreviewEnv ? setShowAndroidModal : () => {}}
      setActiveAdDetail={setActiveAdDetail}
    />
  );

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-gray-800 dark:text-slate-100 font-sans pb-16 transition-colors duration-200" dir={lang === 'ar' ? 'rtl' : 'ltr'} id="root_layout">
      
      {/* Topmost Alert Bar */}
      <AlertBar alerts={alerts} />
      
      {isOffline && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-white font-black text-xs md:text-sm py-3 px-4 text-center flex items-center justify-center gap-2 shadow-sm animate-pulse" id="offline_network_banner">
          <span className="text-base">⚠️</span>
          <span>يبدو أنك لست متصلاً بالإنترنت حالياً (الشبكة مقطوعة). تم تشغيل وضع العمل الذاتي (In-Memory Safe Mode) تلقائياً لتصفح السلع وحماية البيانات!</span>
        </div>
      )}

      {/* Header section */}
      <Header
        onSearch={handleSearch}
        onPostAdClick={handlePostAdClick}
        selectedCity={selectedCity}
        onCityChange={(city) => setSelectedCity(city)}
        cities={YEMENI_CITIES}
        currentUser={currentUser}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        isChatOpen={isChatOpen}
        onToggleChat={() => {
          if (!currentUser) {
            alert('⚠️ يرجى تسجيل الدخول أولاً لتصفح صندوق دردشاتك الموثقة!');
            setShowAuthModal(true);
          } else {
            setShowProfileModal(true);
          }
        }}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenAdmin={() => setShowAdminModal(true)}
        onOpenAndroidApk={isPreviewEnv ? () => setShowAndroidModal(true) : undefined}
        onOpenCodePush={() => setShowCodePushModal(true)}
        lang={lang}
        onLanguageChange={setLang}
        favoritesCount={favorites.length}
        showFavoritesOnly={showFavoritesOnly}
        onToggleFavoritesOnly={() => setShowFavoritesOnly(!showFavoritesOnly)}
        onOpenDashboard={() => {
          if (!currentUser) {
            alert('⚠️ يرجى تسجيل الدخول أولاً لتصفح لوحة تحكم إعلاناتك الموثقة!');
            setShowAuthModal(true);
          } else {
            setShowDashboard(true);
          }
        }}
      />

      <Routes>
        <Route path="/category/:category" element={<CategoryPage />} />
        <Route path="/category/:category/:subcategory" element={<CategoryPage />} />
        <Route path="/city/:city" element={<CategoryPage />} />
        <Route path="/city/:city/:category" element={<CategoryPage />} />
        <Route path="/account" element={<MyAccountPage />} />
        <Route path="/my-account" element={<MyAccountPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/" element={homeContent} />
        <Route path="/ad/:id" element={homeContent} />
        <Route path="*" element={homeContent} />
      </Routes>

      {/* Mega SEO Footer view */}
      <MegaSeoFooter onOpenAndroidApk={isPreviewEnv ? () => setShowAndroidModal(true) : undefined} />

      {/* Ad Details Modal popup */}
      {activeAdDetail && (
        <AdDetailsModal
          ad={activeAdDetail}
          onClose={() => {
            setActiveAdDetail(null);
            window.history.pushState(null, '', '/');
          }}
          onStartChat={handleStartChat}
          lang={lang}
          currentUser={currentUser}
          onViewSellerProfile={(phone, name) => {
            setActiveSellerProfile({ phone, name });
          }}
        />
      )}

      {/* Public Seller Profile Modal */}
      {activeSellerProfile && (
        <SellerProfileModal
          sellerPhone={activeSellerProfile.phone}
          sellerName={activeSellerProfile.name}
          ads={ads}
          lang={lang}
          onClose={() => setActiveSellerProfile(null)}
          onAdClick={(ad) => {
            setActiveAdDetail(ad);
            setActiveSellerProfile(null);
          }}
        />
      )}

      <Suspense fallback={null}>
        {/* Seller Dashboard Modal popup */}
        {showDashboard && (
          <SellerDashboard
            currentUser={currentUser}
            ads={ads}
            onDeleteSuccess={(deletedId) => {
              setAds(prev => prev.filter(ad => ad.id !== deletedId));
              fetchAds();
            }}
            lang={lang}
            onPostAdClick={() => setShowPostModal(true)}
            onClose={() => setShowDashboard(false)}
          />
        )}

        {/* Post Ads submission Modal */}
        {showPostModal && (
          <PostAdModal
            onClose={() => setShowPostModal(false)}
            onPostSuccess={handlePostAdSuccess}
            currentUser={currentUser}
          />
        )}

        {/* Auth Modal Container */}
        {showAuthModal && (
          <AuthModal
            lang={lang}
            onClose={() => setShowAuthModal(false)}
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {/* User Profile Modal */}
        {showProfileModal && currentUser && (
          <UserProfileModal
            onClose={() => setShowProfileModal(false)}
            currentUser={currentUser}
            adsList={ads}
            onDeleteAd={(deletedAdId) => {
              setAds(prev => prev.filter(ad => ad.id !== deletedAdId));
              fetchAds();
            }}
            onUpdateName={(newName) => {
              setCurrentUser(prev => prev ? { ...prev, name: newName } : null);
            }}
            onOpenThread={(adItem, buyerPhone, sellerPhone) => {
              const counterpartPhone = buyerPhone === currentUser.phone ? sellerPhone : buyerPhone;
              setActiveChat({
                adId: adItem.id,
                adTitle: adItem.title,
                buyerPhone,
                sellerPhone,
                counterpartName: adItem.ownerName || counterpartPhone,
                counterpartPhone
              });
              setIsChatOpen(true);
            }}
          />
        )}

        {/* Live messaging float popup */}
        {isChatOpen && (
          <ChatSection
            currentUser={currentUser}
            activeChat={activeChat}
            onClose={() => {
              setIsChatOpen(false);
              setActiveChat(null);
            }}
          />
        )}

        {/* Admin Portal Modal */}
        {showAdminModal && (
          <AdminPortalModal
            onClose={() => setShowAdminModal(false)}
            onRefreshAds={fetchAds}
          />
        )}

        {/* Android App APK Modal */}
        {showAndroidModal && (
          <AndroidApkModal
            onClose={() => setShowAndroidModal(false)}
            lang={lang}
          />
        )}

        {/* Direct App Code Push Modal */}
        {showCodePushModal && (
          <CodePushModal
            isOpen={showCodePushModal}
            onClose={() => setShowCodePushModal(false)}
            lang={lang}
          />
        )}
      </Suspense>

      {/* Floating Direct Code Push Button (Always visible on screen) */}
      <div className="fixed bottom-20 left-4 z-40">
        <button
          onClick={() => setShowCodePushModal(true)}
          className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs py-2.5 px-4 rounded-2xl shadow-2xl border-2 border-amber-300 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
          title="زر دفع وتحديث أكواد التطبيق المباشرة إلى GitHub"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span>🚀 دفع أكواد التطبيق</span>
        </button>
      </div>

      {/* Mobile Bottom Navigation Bar for Android & Mobile Web */}
      <BottomMobileNav
        currentUser={currentUser}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenDashboard={() => {
          if (!currentUser) {
            alert('⚠️ يرجى تسجيل الدخول أولاً لتصفح إعلاناتك!');
            setShowAuthModal(true);
          } else {
            setShowDashboard(true);
          }
        }}
        onToggleChat={() => {
          if (!currentUser) {
            alert('⚠️ يرجى تسجيل الدخول أولاً لتصفح محادثاتك!');
            setShowAuthModal(true);
          } else {
            setShowProfileModal(true);
          }
        }}
        onPostAdClick={handlePostAdClick}
        onOpenAndroidApk={isPreviewEnv ? () => setShowAndroidModal(true) : undefined}
        lang={lang}
      />

    </div>
    </BrowserRouter>
  );
}
