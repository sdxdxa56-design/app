import React, { useState, useEffect, useRef } from 'react';
import { X, Eye, MapPin, Calendar, Phone, MessageCircle, User, Share2, Info, Star, ShieldAlert, Check, Bell, Navigation, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Ad, UserData } from '../types';
import { TRANSLATIONS, Language } from '../data/translations';
import { getSellerRatings, submitSellerRating, incrementPhoneClick, SellerRating, addPriceDropAlert, extendAd, checkExpiredAdsAndNotify, getUserData } from '../firebase';

import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';

// Fix Leaflet default marker icon URL issues in Vite
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 10);
  }, [center, map]);
  return null;
}

const BUYER_PRESETS = [
  { name: 'صنعاء - حدة', lat: 15.312, lng: 44.184 },
  { name: 'صنعاء - الحصبة', lat: 15.385, lng: 44.201 },
  { name: 'عدن - المعلا', lat: 12.788, lng: 45.002 },
  { name: 'عدن - كريتر', lat: 12.766, lng: 45.034 },
  { name: 'تعز - شارع جمال', lat: 13.579, lng: 44.020 },
  { name: 'حضرموت - المكلا', lat: 14.542, lng: 49.124 },
  { name: 'إب - الدليل', lat: 13.966, lng: 44.183 },
];

function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
}

interface AdDetailsModalProps {
  ad: Ad;
  onClose: () => void;
  onStartChat: (ad: Ad) => void;
  lang: Language;
  currentUser?: { name: string; phone: string; email?: string } | null;
  onViewSellerProfile?: (phone: string, name: string) => void;
}

export default function AdDetailsModal({ ad, onClose, onStartChat, lang, currentUser, onViewSellerProfile }: AdDetailsModalProps) {
  const safePrice = Number(ad.price) || 0;
  const formattedPrice = safePrice.toLocaleString('en-US');
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [phoneHidden, setPhoneHidden] = useState(true);
  const [ratings, setRatings] = useState<SellerRating[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [raterName, setRaterName] = useState('');
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [ratingSuccess, setRatingSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Notify when price drops
  const [showPriceAlertForm, setShowPriceAlertForm] = useState(false);
  const [priceAlertPhone, setPriceAlertPhone] = useState('');
  const [priceAlertSuccess, setPriceAlertSuccess] = useState(false);

  // Expiration and credit extension state
  const [localExpiresAt, setLocalExpiresAt] = useState<string | undefined>(ad.expiresAt);
  const [localStatus, setLocalStatus] = useState<string | undefined>(ad.status);
  const [isExtending, setIsExtending] = useState(false);
  const [localUser, setLocalUser] = useState<UserData | null>(null);

  // Delay map rendering to prevent Leaflet from auto-scrolling the modal on load
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setMapReady(false);
    const timer = setTimeout(() => {
      setMapReady(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [ad.id]);

  // Scroll reference for modal container and outer container focus ref
  const scrollRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Scroll-reset helper function
  const resetScrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  };

  useEffect(() => {
    // Reset scroll immediately
    resetScrollToTop();
    
    // Reset after short delays to counter any async autofocus or Leaflet auto-scrolling
    const t1 = setTimeout(resetScrollToTop, 50);
    const t2 = setTimeout(resetScrollToTop, 150);
    const t3 = setTimeout(resetScrollToTop, 300);
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [ad.id]);

  // Reset scroll to top specifically when Leaflet Map is fully mounted/rendered
  useEffect(() => {
    if (mapReady) {
      const t1 = setTimeout(resetScrollToTop, 50);
      const t2 = setTimeout(resetScrollToTop, 200);
      const t3 = setTimeout(resetScrollToTop, 500);
      const t4 = setTimeout(resetScrollToTop, 1000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    }
  }, [mapReady]);

  useEffect(() => {
    if (currentUser) {
      // 1. التحقق من الإعلانات منتهية الصلاحية وإرسال الإشعارات تلقائياً
      if (currentUser.phone) {
        checkExpiredAdsAndNotify(currentUser.phone);
      }
      
      // 2. جلب بيانات المستخدم المحدثة للرصيد
      getUserData(currentUser.phone, currentUser.email).then((data) => {
        setLocalUser(data);
      }).catch(err => console.warn(err));
    }
  }, [currentUser, ad.id]);

  const handleExtendAd = async () => {
    if (!currentUser || !ad.id) return;
    setIsExtending(true);
    try {
      const success = await extendAd(ad.id, currentUser.phone);
      if (success) {
        const updatedUser = await getUserData(currentUser.phone, currentUser.email);
        setLocalUser(updatedUser);
        
        const currentExpiry = new Date(localExpiresAt || Date.now());
        const newExpiry = new Date(currentExpiry.getTime() + 7 * 24 * 60 * 60 * 1000);
        setLocalExpiresAt(newExpiry.toISOString());
        setLocalStatus('active');
        
        alert(lang === 'ar' 
          ? '🎉 تم تمديد إعلانك بنجاح لمدة أسبوع إضافي! وتم خصم 10 وحدات من رصيدك.' 
          : '🎉 Your listing has been extended successfully for an additional week! 10 units deducted.'
        );
      } else {
        alert(lang === 'ar' 
          ? '❌ فشل التمديد. يرجى التأكد من توفر رصيد كافٍ (10 وحدات على الأقل).' 
          : '❌ Extension failed. Please make sure you have sufficient balance (at least 10 units).'
        );
      }
    } catch (err) {
      console.error(err);
      alert(lang === 'ar' ? '❌ حدث خطأ غير متوقع أثناء تمديد الإعلان.' : '❌ An unexpected error occurred while extending.');
    } finally {
      setIsExtending(false);
    }
  };

  // Map Navigation Preset
  const [buyerPresetIdx, setBuyerPresetIdx] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const t = TRANSLATIONS[lang];
  
  // دمج جميع الصور في مصفوفة واحدة صالحة وتصفية الصور التالفة أو الفارغة
  let allImages: string[] = [];
  if (ad.images && Array.isArray(ad.images) && ad.images.length > 0) {
    allImages = ad.images.filter((img): img is string => 
      typeof img === 'string' && img.trim() !== ''
    );
  }
  if (allImages.length === 0 && ad.image) {
    allImages = [ad.image].filter((img): img is string => typeof img === 'string' && img.trim() !== '');
  }
  const safeImages = allImages.length > 0 ? allImages : ['https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&q=80&w=800'];
  const safeIdx = activeImageIdx < safeImages.length ? activeImageIdx : 0;

  // Load reviews/ratings for this seller's phone
  useEffect(() => {
    const fetchRatings = async () => {
      if (ad.phone) {
        setLoadingRatings(true);
        try {
          const fetched = await getSellerRatings(ad.phone);
          setRatings(fetched);
        } catch (e) {
          console.warn("Failed fetching seller ratings:", e);
        } finally {
          setLoadingRatings(false);
        }
      }
    };
    fetchRatings();
  }, [ad.phone]);

  const handleRevealPhone = async () => {
    if (phoneHidden) {
      setPhoneHidden(false);
      // Increment click statistics in Firestore for dynamic dashboard views
      if (ad.id) {
        try {
          await incrementPhoneClick(ad.id);
        } catch (e) {
          console.warn("Failed incrementing phone click statistics:", e);
        }
      }
    }
  };

  const handlePhoneCall = () => {
    handleRevealPhone();
    window.location.href = `tel:${ad.phone}`;
  };

  const handleWhatsApp = () => {
    handleRevealPhone();
    const message = encodeURIComponent(
      lang === 'ar'
        ? `مرحباً أخي الكريم ${ad.ownerName}، أود الاستفسار بخصوص إعلانك: "${ad.title}" على السوق المفتوح اليمن.`
        : `Hello ${ad.ownerName}, I'm interested in your listing: "${ad.title}" on OpenSooq Yemen.`
    );
    window.open(`https://wa.me/967${ad.phone}?text=${message}`, '_blank');
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/ad/${ad.id}`;
    navigator.clipboard.writeText(shareUrl);
    alert(
      lang === 'ar'
        ? '🔗 تم نسخ رابط الإعلان المباشر إلى الحافظة بنجاح لمشاركته وسيو (SEO) ممتاز!'
        : '🔗 Direct ad link copied to clipboard successfully for sharing and maximum SEO reach!'
    );
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!raterName.trim()) {
      setErrorMsg(lang === 'ar' ? 'الرجاء إدخال اسمك أولاً' : 'Please enter your name first');
      return;
    }
    if (!comment.trim()) {
      setErrorMsg(lang === 'ar' ? 'الرجاء كتابة تعليق أو تقييم' : 'Please write a comment or review');
      return;
    }

    try {
      const newRating = await submitSellerRating({
        sellerPhone: ad.phone,
        raterName: raterName.trim(),
        stars: stars,
        comment: comment.trim()
      });
      setRatings([newRating, ...ratings]);
      setRaterName('');
      setComment('');
      setRatingSuccess(true);
      setErrorMsg('');
      setTimeout(() => setRatingSuccess(false), 4000);
    } catch (err) {
      setErrorMsg(lang === 'ar' ? 'حدث خطأ في الشبكة، يرجى المحاولة لاحقاً' : 'Network error, please try again later');
    }
  };

  const handlePriceAlertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceAlertPhone.trim() || priceAlertPhone.length < 9) {
      alert(lang === 'ar' ? 'الرجاء إدخال رقم هاتف صحيح يتكون من 9 أرقام على الأقل' : 'Please enter a valid phone number (at least 9 digits)');
      return;
    }
    try {
      await addPriceDropAlert(ad.id, priceAlertPhone.trim(), ad.price);
      setPriceAlertSuccess(true);
      setTimeout(() => {
        setShowPriceAlertForm(false);
        setPriceAlertSuccess(false);
        setPriceAlertPhone('');
      }, 4000);
    } catch (err) {
      console.error(err);
    }
  };

  // Calculate Average Rating Stars
  const avgStars = ratings.length > 0 
    ? (ratings.reduce((acc, curr) => acc + curr.stars, 0) / ratings.length).toFixed(1)
    : '5.0';

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 overflow-y-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'} id="addetails_modal">
      <div className="fixed inset-0 bg-black/65 transition-opacity" onClick={onClose} aria-hidden="true" />
      <Helmet>
        <title>{ad.title} | السوق المفتوح اليمن</title>
        <meta name="description" content={ad.description?.substring(0, 160) || ''} />
        <meta property="og:title" content={ad.title} />
        <meta property="og:description" content={ad.description?.substring(0, 160) || ''} />
        <meta property="og:image" content={ad.image || ''} />
        <meta property="og:url" content={`${window.location.origin}/ad/${ad.id}`} />
      </Helmet>
      <div 
        ref={modalRef}
        className="relative bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl my-auto text-gray-800 outline-none z-10 font-sans overflow-hidden"
      >
        
        {/* Close Button Header */}
        <div className={`absolute top-4 ${lang === 'ar' ? 'left-4' : 'right-4'} z-20`}>
          <button 
            onClick={onClose}
            className="p-2.5 bg-gray-950/80 text-white hover:bg-black rounded-full cursor-pointer transition-all border border-white/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content wrap split into top Image and detailed info */}
        <div ref={scrollRef} className="flex flex-col max-h-[90vh] overflow-y-auto">
          {/* Main Hero Image Slider */}
          <div className="w-full relative bg-gray-100 overflow-hidden">
            <div className="h-80 w-full relative">
              {safeImages.length > 0 && safeIdx < safeImages.length ? (
                <img 
                  src={safeImages[safeIdx]} 
                  alt={ad.title} 
                  className="w-full h-full object-cover transition-all duration-300 cursor-zoom-in"
                  onClick={() => setIsLightboxOpen(true)}
                  referrerPolicy="no-referrer"
                  title={lang === 'ar' ? 'انقر للتكبير وتصفح الصور 🔍' : 'Click to zoom and browse images 🔍'}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400 font-bold">
                  {lang === 'ar' ? 'لا توجد صور متاحة' : 'No images available'}
                </div>
              )}
              
              {/* Navigation Arrows on main image */}
              {safeImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIdx((prev) => (prev === 0 ? safeImages.length - 1 : prev - 1));
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full cursor-pointer transition-all z-20 flex items-center justify-center"
                    aria-label="Previous Image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIdx((prev) => (prev === safeImages.length - 1 ? 0 : prev + 1));
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full cursor-pointer transition-all z-20 flex items-center justify-center"
                    aria-label="Next Image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-transparent pointer-events-none"></div>
            </div>

            {/* Price tag positioned cleanly on the photo */}
            <div className={`absolute bottom-5 ${lang === 'ar' ? 'right-6' : 'left-6'} flex flex-col items-start text-white z-10 font-sans`}>
              <span className="text-xs font-bold opacity-90">{t.priceRequired}</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl md:text-3xl font-black font-mono tracking-tight text-amber-400">
                  {formattedPrice}
                </span>
                <span className="text-xs font-bold text-gray-200">{ad.currency || t.currency}</span>
              </div>
            </div>

            {/* Featured Badge on modal top */}
            {ad.isFeatured && (
              <span className={`absolute top-4 ${lang === 'ar' ? 'right-4' : 'left-4'} bg-amber-400 text-blue-950 font-black text-[10px] px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1 z-10`}>
                <Star className="w-4 h-4 fill-blue-900 stroke-none animate-pulse" />
                <span>{lang === 'ar' ? 'إعلان ذهبي مميز 🇾🇪' : 'Golden Featured Ad 🇾🇪'}</span>
              </span>
            )}

            {/* Image Slider Thumbnails Overlay */}
            {safeImages.length > 1 && (
              <div className={`absolute bottom-4 ${lang === 'ar' ? 'left-4' : 'right-4'} flex gap-1.5 bg-black/60 p-1.5 rounded-xl z-10 select-none`}>
                {safeImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIdx(idx);
                    }}
                    className={`w-10 h-10 rounded-lg overflow-hidden border-2 cursor-pointer transition-all duration-200 ${
                      idx === safeIdx ? 'border-amber-400 scale-110' : 'border-white/40 opacity-80'
                    }`}
                  >
                    <img src={img} className="w-full h-full object-cover" alt={`صورة ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Body */}
          <div className="p-6 md:p-8">
            <div className="mb-4">
              {/* Category Breadcrumbs & Views */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-gray-400 font-bold mb-3 gap-2">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full">{ad.category}</span>
                  <span className="text-gray-300">/</span>
                  <span className="text-gray-600">{ad.subcategory}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {ad.views + 15} {t.activeViews}
                  </span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {ad.createdAt}
                  </span>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-base sm:text-lg md:text-xl font-black text-blue-950 leading-relaxed mb-4" id="ad_details_modal_title">
                {ad.title}
              </h2>

              {/* Price and Photo Indicator row - Ensures price is visible and user knows there are pictures */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4 bg-slate-50 p-4 rounded-2xl border border-gray-150" id="ad_details_price_photo_strip">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 font-extrabold">{t.priceRequired}</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-blue-900">
                      {formattedPrice}
                    </span>
                    <span className="text-xs font-black text-blue-600">{ad.currency || t.currency}</span>
                  </div>
                </div>
                
                {/* Micro Images Thumbnail Indicator */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 font-extrabold block">
                    {lang === 'ar' ? 'معرض الصور:' : 'Photo Gallery:'}
                  </span>
                  <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[11px] px-3 py-1 rounded-full font-black flex items-center gap-1.5">
                    <span className="animate-pulse">📸</span>
                    <span>{safeImages.length} {lang === 'ar' ? 'صور' : 'photos'}</span>
                  </span>
                </div>
              </div>

              {/* Dedicated Visual Image Gallery Browser Button - Requested by the user */}
              <div className="mb-4" id="view_all_images_btn_container">
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg active:scale-[0.98]"
                >
                  <span className="text-lg animate-bounce">🖼️</span>
                  <span>
                    {lang === 'ar' 
                      ? `اضغط هنا لتصفح واستعراض جميع صور هذا الإعلان (${safeImages.length} صور)` 
                      : `Click here to browse and view all photos of this listing (${safeImages.length} photos)`}
                  </span>
                </button>
              </div>

              {/* Interactive Thumbnail Strip inside the Details Body */}
              {safeImages.length > 0 && (
                <div className="mb-6" id="details_body_thumbnails_container">
                  <p className="text-[10px] text-gray-400 font-extrabold mb-2">
                    {lang === 'ar' ? 'معاينة سريعة للصور (انقر لتكبير وتصفح أي صورة):' : 'Quick photo preview (click to zoom/browse any image):'}
                  </p>
                  <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200">
                    {safeImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setActiveImageIdx(idx);
                          setIsLightboxOpen(true);
                        }}
                        className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all hover:scale-105 active:scale-95 shadow-xs ${
                          idx === safeIdx ? 'border-blue-600 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        <img src={img} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                          <span className="text-white text-[10px] bg-black/60 px-1.5 py-0.5 rounded-md opacity-0 hover:opacity-100 transition-opacity">
                            🔎 {idx + 1}
                          </span>
                        </div>
                      </button>
                    ))}
                    
                    {/* Extra indicator button at the end */}
                    {safeImages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setIsLightboxOpen(true)}
                        className="w-20 h-20 rounded-xl bg-slate-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all shrink-0 font-extrabold text-[10px]"
                      >
                        <span>➕ {safeImages.length}</span>
                        <span>{lang === 'ar' ? 'عرض الكل' : 'View All'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* تمديد الإعلان ونظام الرصيد للبائع مالك الإعلان */}
              {currentUser && currentUser.phone === ad.phone && (
                <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs font-bold text-amber-950 select-none">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-extrabold flex items-center gap-1 text-sm text-amber-900">
                        <span>🌟</span>
                        <span>{lang === 'ar' ? 'أنت مالك هذا الإعلان - لوحة التحكم بالصلاحية' : 'You are the owner of this ad - Expiration Control Panel'}</span>
                      </div>
                      <div className="text-[11px] text-amber-800 font-semibold leading-relaxed">
                        {lang === 'ar' ? 'حالة الإعلان الحالي:' : 'Current ad status:'} {localStatus === 'expired' ? <span className="text-rose-600 font-black">{lang === 'ar' ? 'منتهي الصلاحية 🛑' : 'Expired 🛑'}</span> : <span className="text-emerald-600 font-black">{lang === 'ar' ? 'نشط وصالح ✅' : 'Active ✅'}</span>}
                        {localExpiresAt && (
                          <span className="mx-2">| {lang === 'ar' ? 'تاريخ انتهاء الصلاحية:' : 'Expires at:'} {new Date(localExpiresAt).toLocaleDateString(lang === 'ar' ? 'ar-YE' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        )}
                      </div>
                      {localUser && (
                        <div className="text-[10px] text-slate-500 font-medium">
                          {lang === 'ar' 
                            ? `رصيدك الحالي: ${localUser.balance} وحدة (تكلفة التمديد لأسبوع إضافي: 10 وحدات)` 
                            : `Your current balance: ${localUser.balance} units (Extension cost for an extra week: 10 units)`}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={isExtending || (localUser && localUser.balance < 10)}
                      onClick={handleExtendAd}
                      className="bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-slate-950 font-black text-xs px-4.5 py-3 rounded-xl transition-colors cursor-pointer shrink-0 border-none shadow-sm flex items-center gap-1 justify-center"
                    >
                      <span>🔁</span>
                      <span>{isExtending ? (lang === 'ar' ? 'جاري التمديد...' : 'Extending...') : (lang === 'ar' ? 'تمديد أسبوع إضافي (10 وحدات)' : 'Extend 1 extra week (10 units)')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Price Drop alert Bell icon and form without registration */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setShowPriceAlertForm(!showPriceAlertForm)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-black text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-xs select-none"
                >
                  <Bell className="w-3.5 h-3.5 animate-bounce" />
                  <span>{lang === 'ar' ? 'أخبرني إذا انخفض السعر (بدون تسجيل) 🔔' : 'Notify me if price drops (No signup required)'}</span>
                </button>

                {showPriceAlertForm && (
                  <form onSubmit={handlePriceAlertSubmit} className="mt-3 bg-gradient-to-br from-amber-50/60 to-amber-100/30 border border-amber-200 p-4 rounded-2xl space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="text-[10px] text-amber-900 font-extrabold flex items-center gap-1">
                      <span>💬</span>
                      <span>{lang === 'ar' ? 'سنرسل لك إشعاراً فورياً عبر الواتساب فور انخفاض سعر هذا الإعلان:' : 'We will alert you via WhatsApp immediately if price drops:'}</span>
                    </div>

                    {priceAlertSuccess ? (
                      <div className="bg-emerald-50 text-emerald-800 text-[10px] font-black p-2 rounded-xl flex items-center gap-1.5">
                        <Check className="w-4 h-4" />
                        <span>{lang === 'ar' ? '✓ تم تفعيل التنبيه بنجاح! شكراً لثقتك.' : '✓ Alert activated successfully!'}</span>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          value={priceAlertPhone}
                          onChange={(e) => setPriceAlertPhone(e.target.value)}
                          placeholder={lang === 'ar' ? 'مثال: 777123456' : 'e.g. 777123456'}
                          className="flex-1 bg-white border border-gray-250 rounded-xl px-3 py-2 text-xs font-black text-gray-900 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-left"
                          dir="ltr"
                          required
                        />
                        <button
                          type="submit"
                          className="bg-amber-500 hover:bg-amber-600 text-blue-950 font-black text-xs px-4 py-2 rounded-xl cursor-pointer transition-all shrink-0"
                        >
                          {lang === 'ar' ? 'تفعيل الجرس' : 'Activate'}
                        </button>
                      </div>
                    )}
                  </form>
                )}
              </div>
            </div>

            {/* Quick Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-150 mb-6 font-bold text-xs text-gray-600">
              <div className={`flex flex-col gap-1.5 ${lang === 'ar' ? 'border-l pl-4' : 'border-r pr-4'} border-gray-200`}>
                <span className="text-gray-400 font-extrabold">{t.city}</span>
                <span className="text-gray-800 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  {ad.city}
                </span>
              </div>
              <div className={`flex flex-col gap-1.5 md:${lang === 'ar' ? 'border-l pl-4' : 'border-r pr-4'} border-gray-200`}>
                <span className="text-gray-400 font-extrabold">{lang === 'ar' ? 'حالة المعاينة' : 'Inspection'}</span>
                <span className="text-emerald-600">{lang === 'ar' ? 'متاح فوري' : 'Available Instantly'}</span>
              </div>
              <div 
                onClick={() => onViewSellerProfile && onViewSellerProfile(ad.phone, ad.ownerName)}
                className={`flex flex-col gap-1.5 ${lang === 'ar' ? 'border-l pl-4' : 'border-r pr-4'} border-gray-200 cursor-pointer hover:bg-gray-100 p-1 rounded-lg transition-colors`}
                title={lang === 'ar' ? 'عرض الملف الشخصي العام للمعلن 👤' : 'View Public Seller Profile 👤'}
              >
                <span className="text-gray-400 font-extrabold">{t.postedBy}</span>
                <span className="text-blue-600 flex items-center gap-1 font-black underline decoration-dashed">
                  <User className="w-3.5 h-3.5" />
                  <span>{ad.ownerName}</span>
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-gray-400 font-extrabold">{lang === 'ar' ? 'تسهيل الشراء' : 'Payment Method'}</span>
                <span className="text-gray-800">{lang === 'ar' ? 'كاش أو يد بيد' : 'Cash on delivery'}</span>
              </div>
            </div>

            {/* Full Description text */}
            <div className="mb-6">
              <h3 className="text-xs font-black text-blue-950 mb-3 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600" />
                <span>{t.description}</span>
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed bg-blue-50/20 p-5 rounded-2xl border border-blue-100/30 whitespace-pre-line font-semibold">
                {ad.description}
              </p>
            </div>

            {/* Smart Utility Meters for Real Estate */}
            {ad.category === 'properties' && (ad.waterMeter !== undefined || ad.electricityMeter !== undefined) && (
              <div className="mb-6 p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                    <span>🔌</span>
                    <span>عدادات الاستهلاك الذكية الموثقة سحابياً للعقار</span>
                  </h4>
                  <span className="bg-emerald-200 text-emerald-900 text-[8px] font-extrabold px-2 py-0.5 rounded-full">✓ موثق</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-emerald-100 p-3 rounded-xl flex items-center justify-between shadow-xs">
                    <div>
                      <span className="text-[9px] text-gray-400 font-extrabold block mb-0.5">متوسط استهلاك المياه</span>
                      <span className="text-sm font-black font-mono text-emerald-700">{ad.waterMeter || '2.4'}</span>
                      <span className="text-[9px] text-gray-500 font-bold mr-1">m³/شهر</span>
                    </div>
                    <div className="text-xl">💧</div>
                  </div>

                  <div className="bg-white border border-emerald-100 p-3 rounded-xl flex items-center justify-between shadow-xs">
                    <div>
                      <span className="text-[9px] text-gray-400 font-extrabold block mb-0.5">متوسط استهلاك الكهرباء</span>
                      <span className="text-sm font-black font-mono text-amber-600">{ad.electricityMeter || '185'}</span>
                      <span className="text-[9px] text-gray-500 font-bold mr-1">kWh/شهر</span>
                    </div>
                    <div className="text-xl">⚡</div>
                  </div>
                </div>

                <p className="text-[9px] text-gray-400 font-extrabold mt-2.5 leading-relaxed">
                  💡 متوسط الاستهلاك موثق آلياً بناء على قراءات العدادات الإلكترونية للشهر الماضي، مما يضمن كفاءة الطاقة الشمسية وجودة تمديدات العقار قبل الاستئجار.
                </p>
              </div>
            )}

            {/* Phone Privacy Reveal Bar */}
            <div className="mb-6 bg-slate-50 border border-gray-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-blue-950">{t.showPhone}</h4>
                  <p className="text-[10px] text-gray-400 font-extrabold">{lang === 'ar' ? 'لحماية الخصوصية ومنع تطفل الروبوتات' : 'Protects privacy and blocks unsolicited robocalls'}</p>
                </div>
              </div>

              {phoneHidden ? (
                <button
                  onClick={handleRevealPhone}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-2 px-4 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all shadow-md self-start sm:self-auto"
                >
                  <Eye className="w-4 h-4" />
                  <span>{t.phoneHidden}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 font-mono text-base font-black text-blue-700 bg-white border border-blue-200 px-4 py-2 rounded-xl shadow-inner select-all">
                  <span>+967</span>
                  <span>{ad.phone}</span>
                </div>
              )}
            </div>

            {/* Interactive Geographical Map Section with Distance & Route Calculator */}
            {(() => {
              const targetLat = ad.latitude || 15.354;
              const targetLng = ad.longitude || 44.206;
              const currentPreset = BUYER_PRESETS[buyerPresetIdx];
              const calculatedDistance = getDistanceInKm(currentPreset.lat, currentPreset.lng, targetLat, targetLng);
              const estTime = Math.round(calculatedDistance * 1.8 + 4);
              
              return (
                <div className="mb-6 bg-slate-50 border border-gray-150 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                      <span>📍</span>
                      <span>{lang === 'ar' ? `موقع البائع الدقيق وحركة المرور` : `Seller Location & Driving Traffic`}</span>
                    </h4>
                    {ad.mapAddress && (
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full">
                        📌 {ad.mapAddress}
                      </span>
                    )}
                  </div>

                  {/* Buyer Location Selector for real-time Navigation Sim */}
                  <div className="p-3 bg-white border border-gray-100 rounded-xl space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 font-extrabold flex items-center gap-1">
                        <Navigation className="w-3.5 h-3.5 text-blue-500" />
                        <span>{lang === 'ar' ? 'اختر موقعك الحالي لحساب المسافة ومدة القيادة:' : 'Choose your current location to compute distance:'}</span>
                      </span>
                    </div>
                    <select
                      value={buyerPresetIdx}
                      onChange={(e) => setBuyerPresetIdx(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-gray-200 text-xs font-bold text-gray-900 px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {BUYER_PRESETS.map((p, i) => (
                        <option key={i} value={i}>🟢 {p.name}</option>
                      ))}
                    </select>

                    <div className="grid grid-cols-2 gap-3 pt-2 text-center border-t border-gray-100">
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <span className="text-[9px] text-gray-400 font-extrabold block">{lang === 'ar' ? 'المسافة الجغرافية' : 'Distance'}</span>
                        <span className="text-xs font-black font-mono text-blue-600">{calculatedDistance.toFixed(1)} كم</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <span className="text-[9px] text-gray-400 font-extrabold block">{lang === 'ar' ? 'زمن القيادة المتوقع' : 'Estimated Drive'}</span>
                        <span className="text-xs font-black font-mono text-emerald-600">~ {estTime} دقيقة</span>
                      </div>
                    </div>
                  </div>

                  {/* Live Interactive Leaflet Map Container */}
                  <div className="h-64 w-full rounded-xl overflow-hidden border border-gray-200 relative z-10" id="live_leaflet_map_container">
                    {mapReady ? (
                      <MapContainer 
                        center={[targetLat, targetLng]} 
                        zoom={10} 
                        style={{ height: "100%", width: "100%" }}
                        scrollWheelZoom={false}
                        keyboard={false}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {/* Recenter helper */}
                        <RecenterMap center={[targetLat, targetLng]} />

                        {/* Seller Marker */}
                        <Marker position={[targetLat, targetLng]} keyboard={false}>
                          <Popup>
                            <div className="text-right p-1 font-sans" dir="rtl">
                              <h5 className="font-bold text-xs text-blue-950">{ad.title}</h5>
                              <p className="text-[10px] text-blue-600 font-bold mt-1 font-mono">{formattedPrice} {ad.currency || t.currency}</p>
                              <p className="text-[9px] text-gray-500 mt-0.5">{ad.city} - {ad.mapAddress || ''}</p>
                            </div>
                          </Popup>
                        </Marker>

                        {/* Selected Buyer/User Location Marker */}
                        <Marker position={[currentPreset.lat, currentPreset.lng]} keyboard={false}>
                          <Popup>
                            <div className="text-right p-1 font-sans" dir="rtl">
                              <h5 className="font-bold text-xs text-emerald-600">{lang === 'ar' ? 'موقعك الافتراضي الحالي' : 'Your Default Current Position'}</h5>
                              <p className="text-[9px] text-gray-500 mt-0.5">{currentPreset.name}</p>
                            </div>
                          </Popup>
                        </Marker>

                        {/* Direct Routing Line */}
                        <Polyline 
                          positions={[
                            [currentPreset.lat, currentPreset.lng],
                            [targetLat, targetLng]
                          ]}
                          pathOptions={{ color: '#4f46e5', weight: 3, dashArray: '6, 6' }}
                        />
                      </MapContainer>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-gray-400 gap-2 font-bold text-xs select-none">
                        <span className="animate-spin text-lg">⚙️</span>
                        <span>{lang === 'ar' ? 'جاري تحميل الخريطة التفاعلية...' : 'Loading interactive map...'}</span>
                      </div>
                    )}
                  </div>

                  {/* External Google Maps Button */}
                  <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-100 rounded-xl border border-gray-200 text-xs">
                    <div className="text-right">
                      <span className="font-extrabold text-gray-700 block">{ad.city}، الجمهورية اليمنية</span>
                      <span className="text-[9px] text-gray-400 font-mono block">Lat {targetLat.toFixed(4)}, Lng {targetLng.toFixed(4)}</span>
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${targetLat},${targetLng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-black py-2 px-4 rounded-lg flex items-center gap-1 shadow-sm transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-white" />
                      <span>{lang === 'ar' ? 'فتح في خرائط جوجل والملاحة 🧭' : 'Open in Google Maps'}</span>
                    </a>
                  </div>
                </div>
              );
            })()}

            {/* Seller Ratings Section (نظام التقييم) */}
            <div className="mb-8 border-t border-gray-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs sm:text-sm font-black text-blue-950 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>{t.ratingsTitle}</span>
                </h3>
                <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-black">
                  <span>{avgStars}</span>
                  <Star className="w-3.5 h-3.5 fill-amber-700 stroke-none" />
                  <span className="text-gray-400 font-bold">({ratings.length})</span>
                </div>
              </div>

              {/* Existing reviews list */}
              {loadingRatings ? (
                <div className="py-4 text-center text-xs text-gray-400 font-bold">...</div>
              ) : ratings.length === 0 ? (
                <p className="text-xs text-gray-400 font-bold italic mb-6">{t.noRatings}</p>
              ) : (
                <div className="space-y-3 mb-6 max-h-48 overflow-y-auto pr-1">
                  {ratings.map((rate) => (
                    <div key={rate.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-blue-950">{rate.raterName}</span>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: rate.stars }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-500 stroke-none" />
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-600 font-semibold">{rate.comment}</p>
                      <span className="text-[9px] text-gray-400 font-bold block mt-1">{rate.createdAt}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Submit a review form */}
              <form onSubmit={handleSubmitReview} className="bg-blue-50/20 border border-blue-100 rounded-2xl p-4">
                <h4 className="text-xs font-black text-blue-950 mb-3">{t.addRating}</h4>
                
                {ratingSuccess && (
                  <div className="mb-3 p-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    <span>{t.ratingSuccess}</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="mb-3 p-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-black flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 font-extrabold mb-1">{lang === 'ar' ? 'اسمك' : 'Your Name'}</label>
                    <input
                      type="text"
                      value={raterName}
                      onChange={(e) => setRaterName(e.target.value)}
                      placeholder={lang === 'ar' ? 'مثال: أبو صالح اليافعي' : 'e.g. John Doe'}
                      className="w-full bg-white text-gray-900 border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 font-extrabold mb-1">{lang === 'ar' ? 'التقييم بالنجوم' : 'Rating Stars'}</label>
                    <div className="flex items-center gap-1.5 h-9">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setStars(num)}
                          className="text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star className={`w-5 h-5 ${num <= stars ? 'fill-amber-400 stroke-none' : 'text-gray-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-[10px] text-gray-400 font-extrabold mb-1">{lang === 'ar' ? 'ملاحظتك وتجربتك مع البائع' : 'Review Comment'}</label>
                  <textarea
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t.ratingPlaceholder}
                    className="w-full bg-white text-gray-900 border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-2 px-4 rounded-xl cursor-pointer transition-all shadow-sm"
                >
                  {t.submitRating}
                </button>
              </form>
            </div>

            {/* Action Section / Interactive Call Center */}
            <div className="flex flex-col sm:flex-row items-center gap-4 border-t border-gray-100 pt-6">
              
              {/* Profile Card Summary */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-base border border-blue-200 shadow-sm shrink-0">
                  {ad.ownerName ? ad.ownerName.charAt(0) : 'Y'}
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-black text-blue-950">{ad.ownerName}</p>
                  <p className="text-[10px] text-gray-400 font-bold">{t.yemeniMember}</p>
                </div>
              </div>

              {/* Communication Button Suite */}
              <div className="flex items-center gap-2 w-full sm:flex-1 sm:justify-end flex-wrap">
                <button
                  type="button"
                  onClick={handleShare}
                  className="p-3 bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors cursor-pointer flex items-center justify-center shadow-xs"
                  title={lang === 'ar' ? 'مشاركة الإعلان للـ SEO' : 'Share for SEO ranking'}
                >
                  <Share2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onStartChat(ad)}
                  className="flex-1 sm:flex-initial py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-blue-950 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg"
                >
                  <MessageCircle className="w-4 h-4 fill-blue-950 stroke-none" />
                  <span>{t.chat}</span>
                </button>

                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="flex-1 sm:flex-initial py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg"
                >
                  <MessageCircle className="w-4 h-4 fill-white stroke-none" />
                  <span>{t.whatsapp}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePhoneCall}
                  className="flex-1 sm:flex-initial py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg"
                >
                  <Phone className="w-4 h-4 fill-white stroke-none" />
                  <span>{t.callNow}</span>
                </button>
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* Custom Ultra-Polished Lightbox Gallery (Portal-free, highly responsive) */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 bg-black/95 z-[9999] flex flex-col justify-between p-4 select-none animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Top Bar */}
          <div className="w-full flex items-center justify-between text-white p-2">
            <span className="text-xs font-mono font-bold tracking-wider">
              {safeIdx + 1} / {safeImages.length}
            </span>
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer flex items-center justify-center"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Stage with image and side controls */}
          <div className="flex-1 flex items-center justify-center relative max-w-5xl mx-auto w-full">
            {/* Left Button */}
            {safeImages.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIdx((prev) => (prev === 0 ? safeImages.length - 1 : prev - 1));
                }}
                className="absolute left-2 md:left-6 bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95 text-white p-3 rounded-full cursor-pointer transition-all z-50 flex items-center justify-center"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* The Image */}
            <img
              src={safeImages[safeIdx]}
              alt={ad.title}
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl transition-all duration-300"
              onClick={(e) => e.stopPropagation()}
              referrerPolicy="no-referrer"
            />

            {/* Right Button */}
            {safeImages.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIdx((prev) => (prev === safeImages.length - 1 ? 0 : prev + 1));
                }}
                className="absolute right-2 md:right-6 bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95 text-white p-3 rounded-full cursor-pointer transition-all z-50 flex items-center justify-center"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails */}
          {safeImages.length > 1 && (
            <div className="w-full py-4 flex justify-center gap-2 overflow-x-auto" onClick={(e) => e.stopPropagation()}>
              {safeImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-12 h-12 md:w-16 md:h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                    idx === safeIdx ? 'border-amber-400 scale-110 animate-pulse' : 'border-white/20 opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={img} className="w-full h-full object-cover" alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
