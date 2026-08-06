import React from 'react';
import { Home, PlusCircle, MessageSquare, BarChart3, User, Smartphone } from 'lucide-react';
import { Language } from '../data/translations';

interface BottomMobileNavProps {
  currentUser: any;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onOpenDashboard: () => void;
  onToggleChat: () => void;
  onPostAdClick: () => void;
  onOpenAndroidApk?: () => void;
  unreadCount?: number;
  lang: Language;
}

export default function BottomMobileNav({
  currentUser,
  onOpenAuth,
  onOpenProfile,
  onOpenDashboard,
  onToggleChat,
  onPostAdClick,
  onOpenAndroidApk,
  unreadCount = 0,
  lang
}: BottomMobileNavProps) {
  const isAr = lang === 'ar';

  const handleGoHome = () => {
    window.history.pushState(null, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAccount = () => {
    if (!currentUser) {
      onOpenAuth();
    } else {
      onOpenProfile();
    }
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl py-1.5 px-2 flex items-center justify-around sm:hidden select-none"
      dir={isAr ? 'rtl' : 'ltr'}
      id="bottom_mobile_navigation_bar"
    >
      {/* Home */}
      <button
        onClick={handleGoHome}
        className="flex flex-col items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-amber-400 py-1 px-2 cursor-pointer transition-colors"
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px] font-extrabold mt-0.5">{isAr ? 'الرئيسية' : 'Home'}</span>
      </button>

      {/* Dashboard */}
      <button
        onClick={() => {
          if (!currentUser) {
            onOpenAuth();
          } else {
            onOpenDashboard();
          }
        }}
        className="flex flex-col items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-amber-400 py-1 px-2 cursor-pointer transition-colors"
      >
        <BarChart3 className="w-5 h-5" />
        <span className="text-[10px] font-extrabold mt-0.5">{isAr ? 'إعلاناتي' : 'My Ads'}</span>
      </button>

      {/* Elevated Post Ad Button */}
      <button
        onClick={onPostAdClick}
        className="flex flex-col items-center justify-center -mt-5 bg-gradient-to-r from-amber-500 to-yellow-400 text-blue-950 p-2.5 rounded-full shadow-lg border-2 border-white dark:border-slate-900 cursor-pointer active:scale-95 transition-transform"
      >
        <PlusCircle className="w-6 h-6 stroke-[2.5]" />
        <span className="text-[9px] font-black mt-0.5 leading-none">{isAr ? 'أضف إعلان' : 'Post Ad'}</span>
      </button>

      {/* Chats */}
      <button
        onClick={() => {
          if (!currentUser) {
            onOpenAuth();
          } else {
            onToggleChat();
          }
        }}
        className="relative flex flex-col items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-amber-400 py-1 px-2 cursor-pointer transition-colors"
      >
        <MessageSquare className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-extrabold animate-pulse">
            {unreadCount}
          </span>
        )}
        <span className="text-[10px] font-extrabold mt-0.5">{isAr ? 'دردشاتي' : 'Chats'}</span>
      </button>

      {/* User Account / Profile Button */}
      <button
        onClick={handleOpenAccount}
        className="flex flex-col items-center justify-center text-emerald-600 dark:text-emerald-400 font-extrabold py-1 px-2 cursor-pointer hover:scale-105 transition-all"
      >
        {currentUser ? (
          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shadow-xs">
            {currentUser.name ? currentUser.name[0] : '👤'}
          </div>
        ) : (
          <User className="w-5 h-5 text-amber-500" />
        )}
        <span className="text-[10px] font-black mt-0.5">
          {currentUser ? (isAr ? 'صفحتي' : 'Profile') : (isAr ? 'دخول' : 'Login')}
        </span>
      </button>
    </nav>
  );
}
