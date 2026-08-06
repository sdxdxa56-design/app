import React, { useState, useEffect } from 'react';
import { Search, Plus, Bell, MessageSquare, User, MapPin, Globe, ChevronDown, Menu, LogIn, LogOut, Heart, BarChart3, Sun, Moon, Smartphone, UploadCloud } from 'lucide-react';
import { TRANSLATIONS, Language } from '../data/translations';
import { useThemeStore } from '../store/useThemeStore';
import VoiceSearch from './VoiceSearch';
import { getSellerNotifications, markNotificationAsRead, db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface HeaderProps {
  onSearch: (term: string) => void;
  onPostAdClick: () => void;
  selectedCity: string;
  onCityChange: (city: string) => void;
  cities: string[];
  currentUser: any;
  onOpenAuth: () => void;
  onLogout: () => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
  onOpenProfile: () => void;
  onOpenAdmin: () => void;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  favoritesCount: number;
  showFavoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
  onOpenDashboard: () => void;
  onOpenAndroidApk?: () => void;
  onOpenCodePush?: () => void;
}

export default function Header({
  onSearch,
  onPostAdClick,
  selectedCity,
  onCityChange,
  cities,
  currentUser,
  onOpenAuth,
  onLogout,
  isChatOpen,
  onToggleChat,
  onOpenProfile,
  onOpenAdmin,
  lang,
  onLanguageChange,
  favoritesCount,
  showFavoritesOnly,
  onToggleFavoritesOnly,
  onOpenDashboard,
  onOpenAndroidApk,
  onOpenCodePush
}: HeaderProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const { theme, toggleTheme } = useThemeStore();
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!currentUser?.phone) {
      setUnreadCount(0);
      return;
    }
    const q = query(
      collection(db, 'opensooq_messages'),
      where('receiverPhone', '==', currentUser.phone)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      // count messages that are not marked as read (read is explicitly not true)
      const unread = snap.docs.filter(d => d.data().read !== true).length;
      setUnreadCount(unread);
    }, (err) => {
      console.warn("Unread messages listener issue:", err);
    });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.phone) {
      getSellerNotifications(currentUser.phone)
        .then(setNotifications)
        .catch(err => console.warn(err));

      const interval = setInterval(() => {
        getSellerNotifications(currentUser.phone)
          .then(setNotifications)
          .catch(err => console.warn(err));
      }, 10000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [currentUser]);

  const t = TRANSLATIONS[lang];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  const handleLangToggle = () => {
    onLanguageChange(lang === 'ar' ? 'en' : 'ar');
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-blue-700 text-white shadow-md" dir={lang === 'ar' ? 'rtl' : 'ltr'} id="header_section">
      {/* Top Banner Accent */}
      <div className="bg-blue-950 py-1.5 px-4 text-[11px] font-semibold" id="top_banner_accent">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              {t.subtitle}
            </span>
            <span className="opacity-40 hidden sm:inline">|</span>
            <span className="text-blue-200 hidden lg:inline">
              {lang === 'ar' 
                ? 'تصفح السيارات والوظائف والشقق والخدمات مجاناً ومباشرة من المالك في كافة محافظات اليمن' 
                : 'Browse cars, jobs, real estate and services directly from owners in all Yemen provinces'}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            {/* Direct App Code Push Button in Top Bar */}
            {onOpenCodePush && (
              <button
                onClick={onOpenCodePush}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 shadow-md border border-amber-300 transition-all hover:scale-105 cursor-pointer"
                title="زر دفع وتحديث أكواد التطبيق المباشرة إلى GitHub"
              >
                <UploadCloud className="w-3.5 h-3.5 text-slate-950 animate-bounce" />
                <span>{lang === 'ar' ? '🚀 دفع أكواد التطبيق (Push Code)' : '🚀 Push App Code'}</span>
              </button>
            )}

            {/* Prominent Android APK Push Button in Top Bar */}
            {onOpenAndroidApk && (
              <button
                onClick={onOpenAndroidApk}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 shadow-md border border-emerald-300 transition-all hover:scale-105 cursor-pointer"
                title="دفع إلى GitHub وبناء تطبيق الأندرويد APK"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
                <span>{lang === 'ar' ? '🚀 دفع وبناء APK أندرويد' : '🚀 Push & Build APK'}</span>
              </button>
            )}

            {/* Theme toggle (Sun/Moon) */}
            <button 
              onClick={toggleTheme}
              className="hover:text-amber-300 flex items-center gap-1 text-blue-200 cursor-pointer font-extrabold text-[11px] bg-transparent border-none"
              title={theme === 'dark' ? 'تفعيل الوضع المضيء ☀️' : 'تفعيل الوضع الداكن 🌙'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'ar' ? 'الوضع المضيء' : 'Light Mode'}</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'ar' ? 'الوضع الداكن' : 'Dark Mode'}</span>
                </>
              )}
            </button>
            <span className="opacity-30">|</span>
            {/* Direct Language Switcher flag button */}
            <button 
              onClick={handleLangToggle}
              className="hover:underline flex items-center gap-1.5 text-blue-200 cursor-pointer font-extrabold bg-transparent border-none"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'ar' ? 'English' : 'العربية - اليمن'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Row */}
      <div className="bg-blue-600 py-3.5 px-4 border-b border-blue-550" id="main_navigation_row">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* Logo & Yemen City Select */}
          <div className="flex items-center justify-between w-full lg:w-auto gap-4">
            <div className="flex items-center gap-3">
              {/* Logo */}
              <div 
                onClick={() => window.location.reload()}
                className="bg-white text-blue-700 font-extrabold text-xl sm:text-2xl px-3 py-1.5 rounded-2xl tracking-wider border border-blue-100 flex items-center gap-2 shadow-inner logo-anim cursor-pointer hover:shadow-md transition-all"
              >
                <img 
                  src="/app-logo.png" 
                  alt="Yemen Souq Logo" 
                  className="w-8 h-8 rounded-xl object-contain shadow-xs border border-blue-200/50 shrink-0" 
                  referrerPolicy="no-referrer"
                />
                <div className="flex items-center gap-1 leading-none">
                  <span className="text-amber-600 font-sans">Yemen</span>
                  <span>Souq</span>
                </div>
              </div>
              
              {/* City Selection Popover */}
              <div className="relative">
                <button 
                  onClick={() => setShowCityDropdown(!showCityDropdown)}
                  className="bg-blue-700 hover:bg-blue-850 text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 border border-blue-500/35 transition-all cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-amber-300" />
                  <span>{selectedCity || t.allCities}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showCityDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showCityDropdown && (
                  <div className={`absolute ${lang === 'ar' ? 'right-0' : 'left-0'} top-full mt-2 w-64 bg-white text-gray-800 rounded-2xl shadow-2xl border border-gray-200 py-2 z-50 overflow-hidden text-right animate-fade-in`}>
                    <div className="px-3 py-1.5 bg-slate-50 border-b border-gray-150 flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-500">
                        {lang === 'ar' ? '📍 اختر المحافظة اليمنية' : '📍 Select Governorate'}
                      </span>
                      {selectedCity && (
                        <button 
                          onClick={() => { onCityChange(''); setShowCityDropdown(false); }} 
                          className="text-[10px] font-black text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-lg border-none cursor-pointer"
                        >
                          {lang === 'ar' ? 'عرض الكل' : 'Reset'}
                        </button>
                      )}
                    </div>

                    <div className="p-2 border-b border-gray-100">
                      <input
                        type="text"
                        placeholder={lang === 'ar' ? 'ابحث عن المحافظة...' : 'Search governorate...'}
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase();
                          const items = document.querySelectorAll('.header-city-btn');
                          items.forEach((item: any) => {
                            const text = item.textContent?.toLowerCase() || '';
                            if (text.includes(val)) {
                              item.style.display = 'flex';
                            } else {
                              item.style.display = 'none';
                            }
                          });
                        }}
                        className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                        autoFocus
                      />
                    </div>

                    <div className="max-h-64 overflow-y-auto font-black text-xs text-gray-700">
                      <button
                        onClick={() => {
                          onCityChange('');
                          setShowCityDropdown(false);
                        }}
                        className={`header-city-btn w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors flex items-center justify-between border-none cursor-pointer ${!selectedCity ? 'bg-blue-50 text-blue-600 font-bold' : ''}`}
                      >
                        <span>{lang === 'ar' ? '📍 جميع المحافظات (الكل)' : 'All Governorates'}</span>
                        {!selectedCity && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
                      </button>

                      {cities.map((city) => (
                        <button
                          key={city}
                          onClick={() => {
                            onCityChange(city);
                            setShowCityDropdown(false);
                          }}
                          className={`header-city-btn w-full text-right px-4 py-2.5 hover:bg-blue-50 transition-colors flex items-center justify-between border-none cursor-pointer ${selectedCity === city ? 'bg-blue-50 text-blue-600 font-bold' : ''}`}
                        >
                          <span>{city}</span>
                          {selectedCity === city && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="w-full lg:flex-1 max-w-xl relative">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t.searchPlaceholder}
                className={`w-full bg-white text-gray-900 placeholder-gray-400 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-xs font-bold shadow-md transition-all border-none ${
                  lang === 'ar' ? 'pr-11 pl-28 text-right' : 'pl-11 pr-28 text-left'
                }`}
              />
              <Search className={`absolute ${lang === 'ar' ? 'right-3.5' : 'left-3.5'} top-3.5 w-4 h-4 text-gray-400`} />
              
              <div className={`absolute ${lang === 'ar' ? 'left-14' : 'right-14'} top-1 bottom-1 flex items-center`}>
                <VoiceSearch onResult={(text) => { setSearchTerm(text); onSearch(text); }} lang={lang} />
              </div>

              <button
                type="submit"
                className={`absolute ${lang === 'ar' ? 'left-1.5' : 'right-1.5'} top-1.5 bottom-1.5 bg-blue-700 hover:bg-blue-800 text-white text-[10px] font-black px-3.5 rounded-lg transition-all shadow cursor-pointer`}
              >
                {lang === 'ar' ? 'بحث' : 'Search'}
              </button>
            </div>
          </form>

          {/* Right utility buttons: Chats, notifications, profile, Add AD button */}
          <div className="flex flex-wrap items-center gap-2.5 mt-1 lg:mt-0">
            
            {/* Favorites filter toggle */}
            <button
              onClick={onToggleFavoritesOnly}
              className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all text-xs font-black border cursor-pointer ${
                showFavoritesOnly
                  ? 'bg-red-500 text-white border-red-400'
                  : 'bg-blue-700 hover:bg-blue-850 text-white border-blue-550'
              }`}
              title={t.favorites}
            >
              <Heart className={`h-4 w-4 ${showFavoritesOnly ? 'fill-white text-white' : 'text-amber-400'}`} />
              <span className="hidden sm:inline">{t.favorites}</span>
              <span className="bg-white text-blue-900 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {favoritesCount}
              </span>
            </button>

            {/* Authenticated user menu or Login button */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                {/* Seller Dashboard button */}
                <button
                  onClick={onOpenDashboard}
                  className="px-3 py-2 bg-blue-700 hover:bg-blue-850 border border-blue-550 text-white rounded-xl flex items-center gap-1.5 transition-all text-xs font-black cursor-pointer"
                  title={t.sellerDashboard}
                >
                  <BarChart3 className="h-4 w-4 text-amber-300" />
                  <span className="hidden sm:inline">{t.sellerDashboard}</span>
                </button>

                {/* Notifications Bell with Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`p-2 bg-blue-800/40 hover:bg-blue-800/70 text-white rounded-xl border border-blue-500/30 flex items-center justify-center transition-all cursor-pointer relative h-9 w-9`}
                    title={lang === 'ar' ? 'الإشعارات التنبيهية' : 'Notifications'}
                  >
                    <Bell className="w-4.5 h-4.5 text-amber-300" />
                    {notifications.filter(n => !n.read).length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-black animate-pulse">
                        {notifications.filter(n => !n.read).length}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className={`absolute top-full ${lang === 'ar' ? 'left-0' : 'right-0'} mt-2 w-72 bg-white text-gray-800 rounded-2xl shadow-2xl border border-gray-150 p-3.5 z-50 text-right select-none`}>
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                        <span className="text-xs font-extrabold text-blue-950">{lang === 'ar' ? 'الإشعارات والرسائل' : 'System Alerts'}</span>
                        {notifications.filter(n => !n.read).length > 0 && (
                          <button
                            onClick={async () => {
                              const unread = notifications.filter(n => !n.read);
                              for (const n of unread) {
                                await markNotificationAsRead(n.id);
                              }
                              getSellerNotifications(currentUser.phone).then(setNotifications);
                            }}
                            className="text-[10px] text-blue-600 hover:underline bg-transparent border-none cursor-pointer font-bold"
                          >
                            {lang === 'ar' ? 'قراءة الكل' : 'Mark all read'}
                          </button>
                        )}
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {notifications.length === 0 ? (
                          <p className="text-xs text-gray-400 py-6 text-center font-semibold">{lang === 'ar' ? 'لا توجد تنبيهات حالية' : 'No alerts yet'}</p>
                        ) : (
                          notifications.map(n => (
                            <div
                              key={n.id}
                              onClick={async () => {
                                if (!n.read) {
                                  await markNotificationAsRead(n.id);
                                  getSellerNotifications(currentUser.phone).then(setNotifications);
                                }
                              }}
                              className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                                n.read
                                  ? 'bg-gray-50/60 border-gray-100 text-gray-500 font-medium'
                                  : 'bg-amber-50/50 border-amber-200 text-slate-900 font-extrabold'
                              }`}
                            >
                              <div className="flex justify-between items-center gap-1">
                                <span className="text-[9px] text-gray-400 font-normal">
                                  {n.createdAt ? new Date(n.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-YE' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0 animate-pulse"></span>}
                              </div>
                              <div className="mt-1 leading-relaxed text-[10.5px] font-sans">{n.message}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={onLogout}
                  className="text-xs font-bold text-red-200 hover:text-red-100 hover:bg-white/10 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
                  title={t.logout}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-blue-950 font-black px-3.5 py-2 rounded-xl transition-all cursor-pointer text-xs flex items-center gap-1.5 shadow-md border border-amber-300 hover:scale-102"
              >
                <LogIn className="h-4 w-4 stroke-[2.5]" />
                <span>{lang === 'ar' ? 'دخول / حساب 👤' : 'Login / Account 👤'}</span>
              </button>
            )}

            {/* Admin Portal Button */}
            {currentUser && currentUser.email === 'sdxdxa56@gmail.com' && (
              <button
                onClick={onOpenAdmin}
                className="bg-blue-800/80 hover:bg-blue-900 border border-blue-500/30 text-amber-300 hover:text-amber-200 font-extrabold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer text-xs"
                title="لوحة الإدارة"
              >
                <span>🛡️</span>
                <span className="hidden sm:inline">{lang === 'ar' ? 'لوحة الإدارة' : 'Admin Portal'}</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
