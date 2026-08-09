import React from 'react';
import { Eye, MapPin, Phone, MessageCircle, Star, Heart, ShieldCheck } from 'lucide-react';
import { Ad } from '../types';
import { TRANSLATIONS, Language } from '../data/translations';

interface AdCardProps {
  key?: string | number;
  ad: Ad;
  onAdClick: (ad: Ad) => void;
  lang: Language;
  isFavorite: boolean;
  onFavoriteToggle: (adId: string) => void;
  onInterestClick?: (ad: Ad) => void;
  viewMode?: 'grid' | 'list';
}

export default function AdCard({ ad, onAdClick, lang, isFavorite, onFavoriteToggle, onInterestClick, viewMode = 'grid' }: AdCardProps) {
  const safePrice = Number(ad.price) || 0;
  const formattedPrice = safePrice.toLocaleString('en-US');
  const t = TRANSLATIONS[lang];

  const handlePhoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    alert(
      lang === 'ar'
        ? `💡 للاتصال بالمعلّن اليمني مباشرة: ${ad.phone} (يرجى إخبار المعلن أنك وجدت هذا العرض على السوق المفتوح اليمن)`
        : `💡 Call seller directly: +967${ad.phone} (Please let them know you found this offer on OpenSooq Yemen)`
    );
  };

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const message = encodeURIComponent(
      lang === 'ar'
        ? `مرحباً أخي الكريم، أنا مهتم بعرضك: "${ad.title}" على السوق المفتوح اليمن.`
        : `Hello, I am interested in your offer: "${ad.title}" on OpenSooq Yemen.`
    );
    window.open(`https://wa.me/967${ad.phone}?text=${message}`, '_blank');
  };

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle(ad.id);
  };

  // Horizontal List View Layout
  if (viewMode === 'list') {
    return (
      <div 
        onClick={() => onAdClick(ad)}
        className={`relative bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-300 hover:shadow-md cursor-pointer flex flex-row overflow-hidden ${
          ad.isFeatured ? 'border-amber-400 bg-amber-50/10 dark:bg-amber-950/20 shadow-xs' : 'border-gray-200 dark:border-slate-700/60'
        }`}
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        <button
          onClick={handleHeartClick}
          className={`absolute top-2 ${lang === 'ar' ? 'left-2' : 'right-2'} z-10 p-1.5 bg-white/80 dark:bg-slate-800/80 hover:bg-white rounded-full transition-all cursor-pointer shadow-xs border border-gray-100 flex items-center justify-center`}
          title={t.favorites}
        >
          <Heart className={`w-3.5 h-3.5 transition-colors ${isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
        </button>

        <div className="w-32 sm:w-44 h-32 relative bg-gray-100 dark:bg-slate-700 flex-shrink-0 overflow-hidden">
          <img 
            src={ad.image || 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&q=80&w=800'} 
            alt={ad.title}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            referrerPolicy="no-referrer"
          />
          {ad.isFeatured && (
            <span className={`absolute top-1.5 ${lang === 'ar' ? 'right-1.5' : 'left-1.5'} z-10 bg-amber-400 text-blue-950 text-[8px] font-black px-1.5 py-0.5 rounded shadow flex items-center gap-0.5`}>
              <Star className="w-2.5 h-2.5 fill-blue-900 stroke-none" />
              <span>{lang === 'ar' ? 'مميز' : 'Featured'}</span>
            </span>
          )}
        </div>

        <div className="p-3 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mb-1">
              <span className="bg-gray-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-1.5 py-0.5 rounded text-[9px]">
                {ad.subcategory}
              </span>
              <span>{ad.createdAt}</span>
            </div>

            <h3 className="text-xs sm:text-sm font-black text-blue-950 dark:text-slate-100 line-clamp-1 leading-snug hover:text-blue-600 transition-colors mb-1">
              {ad.title}
            </h3>

            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-1 font-medium">
              {ad.description}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-700/50 mt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400 font-mono">
                {formattedPrice}
              </span>
              <span className="text-[9px] font-bold text-slate-500">{ad.currency || t.currency}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button 
                onClick={handleWhatsAppClick}
                className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer border border-emerald-100"
                title={t.whatsapp}
              >
                <MessageCircle className="w-3.5 h-3.5 fill-emerald-600 stroke-none" />
              </button>
              <button 
                onClick={handlePhoneClick}
                className="py-1 px-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer font-bold text-[10px] flex items-center gap-1 border border-blue-100"
              >
                <Phone className="w-3 h-3 fill-blue-600 stroke-none" />
                <span>{lang === 'ar' ? 'اتصل' : 'Call'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compact 2-Column Grid Layout (Default)
  return (
    <div 
      onClick={() => onAdClick(ad)}
      className={`relative bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer flex flex-col overflow-hidden h-full ${
        ad.isFeatured ? 'border-amber-400 bg-amber-50/10 dark:bg-amber-950/20 shadow-xs ring-1 ring-amber-300/30' : 'border-gray-200 dark:border-slate-700/60'
      }`}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Featured Badge */}
      {ad.isFeatured && (
        <span className={`absolute top-2 ${lang === 'ar' ? 'right-2' : 'left-2'} z-10 bg-amber-400 text-blue-950 text-[8px] sm:text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm flex items-center gap-0.5`}>
          <Star className="w-2.5 h-2.5 fill-blue-900 stroke-none" />
          <span>{lang === 'ar' ? 'مميز 🇾🇪' : 'Featured'}</span>
        </span>
      )}

      {/* Heart button for favorites */}
      <button
        onClick={handleHeartClick}
        className={`absolute top-2 ${lang === 'ar' ? 'left-2' : 'right-2'} z-10 p-1.5 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-all cursor-pointer shadow-xs border border-gray-100 dark:border-slate-700 flex items-center justify-center`}
        title={t.favorites}
      >
        <Heart className={`w-3.5 h-3.5 transition-colors ${isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
      </button>

      {/* Image Thumbnail with zoom effects */}
      <div className="w-full h-28 sm:h-36 md:h-40 relative bg-gray-100 dark:bg-slate-700 flex-shrink-0 overflow-hidden group">
        <img 
          src={ad.image || 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&q=80&w=800'} 
          alt={ad.title}
          width={300}
          height={200}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        {/* City tag on image bottom */}
        <div className={`absolute bottom-1.5 ${lang === 'ar' ? 'right-1.5' : 'left-1.5'} bg-slate-900/85 text-white px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5`}>
          <MapPin className="w-2.5 h-2.5 text-amber-400" />
          <span>{ad.city}</span>
        </div>
      </div>

      {/* Content block - Compact spacing for 2-column mobile layout */}
      <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between space-y-1.5">
        <div>
          {/* Subcategory & Verified */}
          <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400 font-bold mb-1">
            <span className="bg-gray-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] truncate max-w-[100px]">
              {ad.subcategory}
            </span>
            {ad.ownerVerified && (
              <span className="text-emerald-600 dark:text-emerald-400 font-black text-[8px] flex items-center gap-0.5">
                <ShieldCheck className="w-2.5 h-2.5" />
                <span>موثق</span>
              </span>
            )}
          </div>

          {/* Ad Main Title */}
          <h3 className="text-xs sm:text-sm font-black text-blue-950 dark:text-slate-100 line-clamp-2 leading-snug hover:text-blue-600 transition-colors mb-1">
            {ad.title}
          </h3>

          {/* Ad Snippet */}
          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 font-medium mb-1">
            {ad.description}
          </p>
        </div>

        {/* Footer info: Price and Quick buttons */}
        <div className="pt-2 border-t border-gray-100 dark:border-slate-700/50 space-y-1.5">
          
          {/* Price Tag with Price Drop alert */}
          <div className="flex items-baseline justify-between gap-1">
            <div className="flex items-baseline gap-1">
              <span className="text-xs sm:text-sm md:text-base font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight">
                {formattedPrice}
              </span>
              <span className="text-[9px] font-black text-slate-500">{ad.currency || t.currency}</span>
            </div>
            
            {ad.views && (
              <span className="text-[8px] text-slate-400 flex items-center gap-0.5 font-bold">
                <Eye className="w-2.5 h-2.5" />
                {ad.views}
              </span>
            )}
          </div>

          {/* Action buttons row */}
          <div className="flex items-center justify-between gap-1 pt-1">
            {onInterestClick && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onInterestClick(ad);
                }}
                className="py-1 px-1.5 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 text-amber-700 dark:text-amber-400 rounded-md transition-colors cursor-pointer font-black text-[9px] flex items-center gap-0.5 border border-amber-200 dark:border-amber-900"
                title={lang === 'ar' ? 'أنا مهتم بهذا الإعلان' : "I'm interested"}
              >
                <span>👍</span>
                <span>{lang === 'ar' ? 'مهتم' : 'Interested'}</span>
                {ad.interestsCount && ad.interestsCount > 0 ? (
                  <span className="bg-amber-200 text-amber-900 rounded-full px-1 text-[8px] font-mono font-black">
                    {ad.interestsCount}
                  </span>
                ) : null}
              </button>
            )}

            <div className="flex items-center gap-1 mr-auto">
              <button 
                onClick={handleWhatsAppClick}
                className="p-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer border border-emerald-100 dark:border-emerald-900"
                title={t.whatsapp}
              >
                <MessageCircle className="w-3.5 h-3.5 fill-emerald-600 dark:fill-emerald-400 stroke-none" />
              </button>
              <button 
                onClick={handlePhoneClick}
                className="py-1 px-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer font-black text-[10px] flex items-center gap-1 border border-blue-100 dark:border-blue-900"
              >
                <Phone className="w-3 h-3 fill-blue-600 dark:fill-blue-400 stroke-none" />
                <span>{lang === 'ar' ? 'اتصل' : 'Call'}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
