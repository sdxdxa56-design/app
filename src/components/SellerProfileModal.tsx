import React, { useState, useEffect } from 'react';
import { X, Star, User, Phone, Mail, Rss, Calendar, TrendingUp, Award, ShieldCheck, Heart, ExternalLink, Check, Bell } from 'lucide-react';
import { Ad } from '../types';
import { 
  getSellerRatings, 
  SellerRating, 
  followSeller, 
  unfollowSeller, 
  getSellerFollowersCount, 
  isFollowingSeller 
} from '../firebase';

interface SellerProfileModalProps {
  sellerPhone: string;
  sellerName: string;
  ads: Ad[];
  lang: 'ar' | 'en';
  onClose: () => void;
  onAdClick: (ad: Ad) => void;
}

export default function SellerProfileModal({ 
  sellerPhone, 
  sellerName, 
  ads, 
  lang, 
  onClose, 
  onAdClick 
}: SellerProfileModalProps) {
  const [ratings, setRatings] = useState<SellerRating[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFollowForm, setShowFollowForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeAds = ads.filter(ad => ad.phone === sellerPhone);
  
  useEffect(() => {
    async function loadSellerData() {
      setLoading(true);
      try {
        // Load ratings
        const fetchedRatings = await getSellerRatings(sellerPhone);
        setRatings(fetchedRatings);

        // Load followers count
        const count = await getSellerFollowersCount(sellerPhone);
        setFollowersCount(count);

        // Check if cached follower email exists in localStorage
        const storedEmail = localStorage.getItem('user_follower_email');
        if (storedEmail) {
          const following = await isFollowingSeller(sellerPhone, storedEmail);
          setIsFollowing(following);
          setEmailInput(storedEmail);
        }
      } catch (err) {
        console.error("Error loading seller profile data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSellerData();
  }, [sellerPhone]);

  const handleFollowToggle = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!emailInput.trim() || !emailInput.includes('@')) {
      setMessage({
        type: 'error',
        text: lang === 'ar' ? 'الرجاء إدخال بريد إلكتروني صحيح' : 'Please enter a valid email address'
      });
      return;
    }

    try {
      if (isFollowing) {
        await unfollowSeller(sellerPhone, emailInput.trim());
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
        setMessage({
          type: 'success',
          text: lang === 'ar' ? 'تم إلغاء المتابعة بنجاح' : 'Unfollowed successfully'
        });
      } else {
        await followSeller(sellerPhone, emailInput.trim());
        localStorage.setItem('user_follower_email', emailInput.trim());
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        setShowFollowForm(false);
        setMessage({
          type: 'success',
          text: lang === 'ar' 
            ? 'تمت المتابعة! ستصلك تنبيهات عبر البريد عند نزول إعلانات جديدة لهذا المعلن 📧' 
            : 'Subscribed! You will receive email updates when this seller posts new ads 📧'
        });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: lang === 'ar' ? 'فشل إتمام العملية، يرجى المحاولة لاحقاً' : 'Operation failed, please try again'
      });
    }
  };

  // Calculate Rating Metrics
  const avgStars = ratings.length > 0 
    ? (ratings.reduce((acc, curr) => acc + curr.stars, 0) / ratings.length).toFixed(1)
    : '5.0';

  const t = {
    title: lang === 'ar' ? 'الملف الشخصي للمعلن الموثق' : 'Verified Seller Public Profile',
    adsCount: lang === 'ar' ? 'عدد الإعلانات النشطة' : 'Active Listings',
    followers: lang === 'ar' ? 'المتابعون المشتركون' : 'Subscribers / Followers',
    memberSince: lang === 'ar' ? 'عضو منذ' : 'Member Since',
    joinedIn: lang === 'ar' ? '٢٠٢٦ (موثق)' : '2026 (Verified)',
    followBtn: lang === 'ar' ? 'تابع المعلن لتلقي إشعارات' : 'Follow Seller for Alerts',
    followingBtn: lang === 'ar' ? '✓ أنت تتابع هذا المعلن' : '✓ Following this Seller',
    enterEmail: lang === 'ar' ? 'اشترك ببريدك الإلكتروني لتلقي إشعار فور نشر إعلان جديد:' : 'Enter your email to receive alerts when new ads are posted:',
    subscribe: lang === 'ar' ? 'تفعيل المتابعة' : 'Activate Follow',
    unsubscribe: lang === 'ar' ? 'إلغاء المتابعة' : 'Unfollow',
    activeListings: lang === 'ar' ? 'كافة إعلانات هذا المعلن' : 'All Seller Listings',
    ratingsTitle: lang === 'ar' ? 'تقييمات وآراء المشترين' : 'Buyer Reviews',
    noAds: lang === 'ar' ? 'لا توجد إعلانات نشطة حالياً لهذا المعلن.' : 'No active listings for this seller currently.',
    noReviews: lang === 'ar' ? 'لا توجد تقييمات مكتوبة لهذا المعلن بعد.' : 'No reviews written for this seller yet.',
    sellerStatus: lang === 'ar' ? 'معلن ذهبي موثوق 🏅' : 'Golden Trusted Seller 🏅'
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'} id="seller_profile_modal">
      <div className="fixed inset-0 bg-black/65 transition-opacity" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl text-gray-800 flex flex-col max-h-[90vh] z-10 my-auto">
        
        {/* Header bar */}
        <div className="p-5 bg-gradient-to-r from-blue-900 to-blue-700 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-black">{t.title}</h2>
              <p className="text-[10px] text-blue-100 font-bold">{t.sellerStatus}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full cursor-pointer transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
          {/* Seller Top Card */}
          <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/20 border border-blue-100/60 p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 w-40 h-40 bg-blue-100/20 rounded-full blur-2xl"></div>
            
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-3xl border-4 border-white shadow-lg shrink-0">
              {sellerName.charAt(0)}
            </div>

            {/* Profile Meta details */}
            <div className="flex-1 text-center sm:text-start space-y-2.5 z-10">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-blue-950 flex items-center justify-center sm:justify-start gap-1">
                  <span>{sellerName}</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-500 fill-emerald-500/10" />
                </h3>
                <span className="inline-block bg-amber-100 text-amber-800 text-[9px] font-black px-2.5 py-1 rounded-full self-center">
                  {lang === 'ar' ? 'معلن موثق هوية 🇾🇪' : 'ID Verified 🇾🇪'}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 text-[11px] text-gray-500 font-bold font-sans">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-blue-500" />
                  +967 {sellerPhone}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  {t.memberSince}: {t.joinedIn}
                </span>
              </div>

              {/* Followers & Ratings summary badges */}
              <div className="flex items-center justify-center sm:justify-start gap-3 pt-1">
                <div className="bg-white border border-gray-150 px-3 py-1.5 rounded-xl text-center shadow-xs">
                  <span className="block text-xs font-black text-blue-900">{activeAds.length}</span>
                  <span className="text-[9px] text-gray-400 font-extrabold">{lang === 'ar' ? 'إعلاناته' : 'Ads'}</span>
                </div>
                <div className="bg-white border border-gray-150 px-3 py-1.5 rounded-xl text-center shadow-xs">
                  <span className="block text-xs font-black text-amber-500 flex items-center justify-center gap-0.5">
                    {avgStars}
                    <Star className="w-3 h-3 fill-amber-500 stroke-none" />
                  </span>
                  <span className="text-[9px] text-gray-400 font-extrabold">{lang === 'ar' ? 'التقييم' : 'Rating'}</span>
                </div>
                <div className="bg-white border border-gray-150 px-3 py-1.5 rounded-xl text-center shadow-xs">
                  <span className="block text-xs font-black text-emerald-600">{followersCount}</span>
                  <span className="text-[9px] text-gray-400 font-extrabold">{lang === 'ar' ? 'متابعاً' : 'Followers'}</span>
                </div>
              </div>
            </div>

            {/* Follow / Subscribe Action Button */}
            <div className="shrink-0 w-full sm:w-auto z-10 self-center">
              {isFollowing ? (
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => {
                      setShowFollowForm(true);
                    }}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs py-3 px-5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    <Check className="w-4 h-4" />
                    <span>{t.followingBtn}</span>
                  </button>
                  <button 
                    onClick={() => {
                      setIsFollowing(false);
                      unfollowSeller(sellerPhone, emailInput);
                      setFollowersCount(prev => Math.max(0, prev - 1));
                    }}
                    className="text-center text-[10px] text-red-500 hover:underline font-bold cursor-pointer"
                  >
                    {t.unsubscribe}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowFollowForm(!showFollowForm)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-3 px-5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-md hover:shadow-lg"
                >
                  <Rss className="w-4 h-4 animate-pulse" />
                  <span>{t.followBtn}</span>
                </button>
              )}
            </div>
          </div>

          {/* Inline Email subscription form */}
          {showFollowForm && (
            <form onSubmit={handleFollowToggle} className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 text-amber-800 text-xs font-extrabold">
                <Bell className="w-4 h-4" />
                <span>{t.enterEmail}</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="e.g. name@example.com"
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-4 py-2 rounded-xl cursor-pointer transition-all shrink-0"
                >
                  {t.subscribe}
                </button>
              </div>
            </form>
          )}

          {/* Operation Status Messages */}
          {message && (
            <div className={`p-3 rounded-xl text-xs font-black flex items-center gap-2 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' : 'bg-red-50 text-red-600 border border-red-150'
            }`}>
              {message.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Seller Listings */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-blue-950 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>{t.activeListings} ({activeAds.length})</span>
            </h4>

            {activeAds.length === 0 ? (
              <p className="text-xs text-gray-400 font-bold italic py-4">{t.noAds}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
                {activeAds.map(ad => (
                  <div 
                    key={ad.id} 
                    onClick={() => {
                      onAdClick(ad);
                      onClose();
                    }}
                    className="border border-gray-200 hover:border-blue-400 bg-slate-50/50 hover:bg-white p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all duration-200 group shadow-xs"
                  >
                    <img 
                      src={ad.image} 
                      alt={ad.title} 
                      className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <h5 className="text-[11px] font-black text-blue-950 truncate group-hover:text-blue-600">{ad.title}</h5>
                      <p className="text-[10px] text-gray-400 font-bold">{ad.city} • {ad.subcategory}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[11px] font-mono font-black text-amber-600">
                          {ad.price.toLocaleString(lang === 'ar' ? 'ar-YE' : 'en-US')}
                        </span>
                        <span className="text-[8px] text-gray-400 font-black">
                          {lang === 'ar' ? 'ر.ي' : 'YR'}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ratings & Reviews */}
          <div className="space-y-3 border-t border-gray-100 pt-5">
            <h4 className="text-xs font-black text-blue-950 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>{t.ratingsTitle} ({ratings.length})</span>
            </h4>

            {ratings.length === 0 ? (
              <p className="text-xs text-gray-400 font-bold italic py-4">{t.noReviews}</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                {ratings.map(rate => (
                  <div key={rate.id} className="bg-slate-50 border border-gray-100 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-black text-blue-950">{rate.raterName}</span>
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: rate.stars }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 stroke-none" />
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-600 font-medium leading-relaxed">{rate.comment}</p>
                    <span className="text-[8px] text-gray-400 font-bold block mt-1">{rate.createdAt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
