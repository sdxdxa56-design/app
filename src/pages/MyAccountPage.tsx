import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { getSellerRatings, SellerRating, checkUserExists, updateUserProfileByPhone, getUserData, normalizePhone } from '../firebase';
import { UserData } from '../types';
import { Star, Edit2, Camera, CheckCircle, Phone, Calendar, ArrowRight, Save, User, Copy } from 'lucide-react';
import { TRANSLATIONS, Language } from '../data/translations';
import { Link } from 'react-router-dom';

export default function MyAccountPage() {
  const { currentUser, setCurrentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('summary');
  const [ratings, setRatings] = useState<SellerRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Language>('ar');
  const t = TRANSLATIONS[lang];

  // Dynamic user fields from Firestore
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('صنعاء');
  const [isVerified, setIsVerified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [copied, setCopied] = useState(false);

  const copyUserId = () => {
    if (userData?.userId) {
      navigator.clipboard.writeText(userData.userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (currentUser) {
      getUserData(currentUser.phone, currentUser.email)
        .then(setUserData)
        .catch(err => console.warn(err));
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      // 1. Fetch ratings
      if (currentUser.phone) {
        getSellerRatings(currentUser.phone)
          .then(setRatings)
          .finally(() => setLoading(false));
      } else {
        setRatings([]);
        setLoading(false);
      }

      // 2. Fetch full user document from Firestore to get isVerified, email, city
      checkUserExists(currentUser.phone, currentUser.email).then((userDoc) => {
        if (userDoc) {
          setName(userDoc.name || currentUser.name || '');
          setPhone(userDoc.phone || currentUser.phone || '');
          setEmail(userDoc.email || currentUser.email || '');
          setCity(userDoc.city || 'صنعاء');
          setIsVerified(!!userDoc.isVerified);
        } else {
          setName(currentUser.name || '');
          setPhone(currentUser.phone || '');
          setEmail(currentUser.email || '');
        }
      });
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" id="my_account_no_user">
        <p className="text-lg font-bold text-gray-500">يرجى تسجيل الدخول أولاً</p>
      </div>
    );
  }

  const avgStars = ratings.length > 0
    ? (ratings.reduce((acc, r) => acc + r.stars, 0) / ratings.length).toFixed(1)
    : '0.0';

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      alert('الرجاء إدخال الاسم الكامل');
      return;
    }
    const cleanedPhone = normalizePhone(phone);
    if (!cleanedPhone) {
      alert('الرجاء إدخال رقم هاتف يمني صحيح');
      return;
    }
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      // Update in Firestore
      await updateUserProfileByPhone(currentUser.phone, {
        name,
        email,
        city,
        phone: cleanedPhone
      });
      
      // Update in global auth store / localStorage
      setCurrentUser({
        name,
        phone: cleanedPhone,
        email: email || currentUser.email
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      if (err.message === "PHONE_ALREADY_EXISTS") {
        alert("⚠️ خطأ أمني: رقم الهاتف الجديد مستخدم بالفعل من قبل حساب آخر! لا يمكنك الاستيلاء على حساب آخر.");
      } else {
        alert('حدث خطأ أثناء حفظ التغييرات، يرجى المحاولة لاحقاً');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-right" dir="rtl" id="my_account_page_container">
      {/* Top navigation back bar */}
      <div className="bg-slate-900 text-white py-3.5 px-4 shadow-sm border-b border-slate-850">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" onClick={() => {
            window.history.pushState(null, '', '/');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }} className="flex items-center gap-1.5 text-xs font-black text-amber-400 hover:text-amber-300 transition-colors">
            <ArrowRight className="w-4.5 h-4.5" />
            <span>العودة للرئيسية 🏠</span>
          </Link>
          <span className="text-xs font-black text-slate-300">السوق المفتوح اليمن - لوحة تحكم الحساب المتقدمة</span>
        </div>
      </div>

      {/* Header Profile Card */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-blue-600 text-white flex items-center justify-center text-4xl font-black border-4 border-white shadow-lg">
                {name?.charAt(0) || 'م'}
              </div>
              <button className="absolute bottom-1 right-1 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                <Camera className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-right">
              <div className="flex flex-col sm:flex-row sm:items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-xl md:text-2xl font-black text-gray-900">{name}</h1>
                <div className="flex justify-center">
                  {isVerified ? (
                    <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-emerald-200 shadow-xs">
                      <CheckCircle className="w-3.5 h-3.5 fill-emerald-500 text-white" />
                      <span>حساب موثق 🇾🇪</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-amber-200">
                      <span>حساب غير موثق</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-2 text-sm text-gray-500 font-semibold">
                <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {phone || 'لا يوجد رقم هاتف (أضف رقمك من التعديل)'}</span>
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> عضو منذ 2026</span>
                {userData?.userId && (
                  <span className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border border-slate-200">
                    <span>ID: {userData.userId}</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(userData.userId);
                        alert('📋 تم نسخ معرّف الحساب بنجاح!');
                      }} 
                      className="hover:text-blue-600 focus:text-blue-700 bg-transparent border-none cursor-pointer p-0.5 inline-flex items-center"
                      title="نسخ معرّف الحساب"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4">
                <a
                  href={`https://wa.me/967775378369?text=${encodeURIComponent(
                    `مرحباً، أريد توثيق حسابي في السوق المفتوح اليمن.\nمعرف الحساب: ${userData?.userId || ''}\nالاسم: ${currentUser.name}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs px-4 py-2 rounded-xl transition-colors inline-block text-center"
                >
                  ⭐ وثّق حسابك الآن
                </a>
                <button 
                  onClick={() => setActiveTab('editProfile')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1 shadow-xs"
                >
                  <Edit2 className="w-4 h-4" />
                  تعديل الملف الشخصي
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {['summary', 'ratings', 'editProfile', 'editShop', 'files'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {{summary: 'الملخص 📊', ratings: 'التقييم ⭐', editProfile: 'تعديل حسابي 👤', editShop: 'متجري 🏪', files: 'الملفات 📁'}[tab as 'summary' | 'ratings' | 'editProfile' | 'editShop' | 'files']}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        {activeTab === 'summary' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border text-center shadow-xs">
                <p className="text-3xl font-black text-blue-600">{ratings.length}</p>
                <p className="text-sm text-gray-450 mt-1.5 font-bold">تقييماتي المستلمة</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border text-center shadow-xs">
                <p className="text-3xl font-black text-amber-500 flex items-center justify-center gap-1">
                  {avgStars} <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                </p>
                <p className="text-sm text-gray-450 mt-1.5 font-bold">متوسط التقييم العام</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border text-center shadow-xs">
                <p className="text-3xl font-black text-emerald-600">0</p>
                <p className="text-sm text-gray-450 mt-1.5 font-bold">متابعين نشطين</p>
              </div>
            </div>

            {userData && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
                  {/* بطاقة المعرف */}
                  <div className="bg-white p-6 rounded-2xl border text-center shadow-xs">
                    <p className="text-sm text-gray-400 mb-1 font-bold">معرف الحساب (ID)</p>
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-lg font-mono font-black text-blue-600">{userData.userId}</p>
                      <button
                        onClick={copyUserId}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border-none cursor-pointer flex items-center justify-center"
                        title="نسخ المعرف"
                      >
                        {copied ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {copied && <p className="text-xs text-emerald-500 mt-1">تم النسخ!</p>}
                  </div>

                  {/* بطاقة الرصيد */}
                  <div className="bg-white p-6 rounded-2xl border text-center shadow-xs flex flex-col justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1 font-bold">الرصيد</p>
                      <p className="text-3xl font-black text-amber-500">{userData.balance || 0}</p>
                      <p className="text-xs text-gray-400 font-bold">/ 1000 وحدة</p>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3">
                        <div
                          className="bg-amber-400 h-2.5 rounded-full transition-all"
                          style={{ width: `${Math.min(((userData.balance || 0) / 1000) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <a
                      href={`https://wa.me/967775378369?text=${encodeURIComponent(
                        `مرحباً، أريد تعبئة رصيدي في السوق المفتوح اليمن.\nمعرف الحساب: ${userData?.userId || ''}\nالاسم: ${name || currentUser?.name || ''}\nرقم الهاتف: ${phone || currentUser?.phone || ''}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-green-400 hover:from-emerald-600 hover:to-green-500 text-white font-black text-xs py-2.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border-none"
                    >
                      💰 تعبئة الرصيد عبر واتساب
                    </a>
                  </div>

                  {/* بطاقة الإعلانات المجانية */}
                  <div className="bg-white p-6 rounded-2xl border text-center shadow-xs">
                    <p className="text-sm text-gray-400 mb-1 font-bold">إعلانات مجانية متبقية</p>
                    <p className="text-3xl font-black text-emerald-500">{userData.freeAdsCount || 0}</p>
                    <p className="text-xs text-gray-400 font-bold">/ 3 إعلانات</p>
                  </div>
                </div>

                {/* شريط معلومات الوحدات الذكي */}
                <div className="bg-white p-6 rounded-2xl border shadow-xs space-y-4 text-right">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">رصيد الوحدات والحساب الذكي ⚡</h3>
                      <p className="text-[11px] text-gray-400 mt-1 font-medium leading-relaxed">
                        الحد الأقصى للرصيد هو 1000 وحدة. يمكنك استخدام الوحدات لتمديد إعلاناتك والحفاظ عليها نشطة دائماً. تمديد الإعلان يكلف 10 وحدات فقط.
                      </p>
                    </div>
                    <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-xl text-xs font-black whitespace-nowrap">
                      🎁 حساب موثق ونشط
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'ratings' && (
          <div className="bg-white rounded-2xl border p-6 shadow-xs animate-fadeIn">
            <h2 className="text-lg font-black mb-4">تقييماتي المستلمة ⭐</h2>
            {loading ? (
              <p className="text-gray-450 animate-pulse text-sm font-bold">جاري التحميل...</p>
            ) : ratings.length === 0 ? (
              <p className="text-gray-400 text-sm font-bold">لا توجد تقييمات بعد على حسابك.</p>
            ) : (
              <div className="space-y-4">
                {ratings.map(r => (
                  <div key={r.id} className="border-b pb-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-gray-800">{r.raterName}</span>
                      <div className="flex text-amber-400">
                        {Array.from({ length: r.stars }).map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400" />)}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 font-semibold">{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'editProfile' && (
          <div className="bg-white rounded-2xl border p-6 shadow-xs max-w-2xl animate-fadeIn">
            <h2 className="text-lg font-black mb-6">تعديل حسابي اليمني الشخصي 👤</h2>
            
            {saveSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black flex items-center gap-1.5 animate-bounce">
                <CheckCircle className="w-4 h-4 fill-emerald-500 text-white" />
                <span>تم حفظ التعديلات بنجاح وتحديث ملفك الشخصي! 🎉</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-gray-700 mb-1.5">الاسم الكامل</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 text-xs font-extrabold focus:ring-2 focus:ring-blue-500 outline-none text-right" 
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-gray-700 mb-1.5">رقم الهاتف اليمني 📞</label>
                <input 
                  type="text" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="مثال: 777123456"
                  className="w-full border rounded-xl px-4 py-3 text-xs font-extrabold focus:ring-2 focus:ring-blue-500 outline-none text-right" 
                />
                <p className="text-[9px] text-gray-400 mt-1">يمكنك تغيير رقم هاتفك. سيتم تحديثه في جميع إعلاناتك.</p>
              </div>
              <div>
                <label className="block text-xs font-extrabold text-gray-700 mb-1.5">البريد الإلكتروني</label>
                <input 
                  type="email" 
                  placeholder="example@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 text-xs font-extrabold focus:ring-2 focus:ring-blue-500 outline-none text-right" 
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-gray-700 mb-1.5">المدينة</label>
                <select 
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 text-xs font-extrabold focus:ring-2 focus:ring-blue-500 outline-none text-right"
                >
                  <option value="صنعاء">صنعاء</option>
                  <option value="عدن">عدن</option>
                  <option value="تعز">تعز</option>
                  <option value="إب">إب</option>
                  <option value="الحديدة">الحديدة</option>
                  <option value="حضرموت">حضرموت</option>
                  <option value="مأرب">مأرب</option>
                </select>
              </div>
              <button 
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold py-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 text-sm shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات الآن'}</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'editShop' && (
          <div className="bg-white rounded-2xl border p-6 text-center py-16 shadow-xs animate-fadeIn">
            <p className="text-gray-400 text-lg font-bold">🏪 قريباً - ميزة متجري المتقدم</p>
            <p className="text-gray-400 text-sm mt-2">ستتمكن قريباً من إنشاء متجرك الخاص وعرض جميع منتجاتك في مكان واحد مع تقارير مبيعات فورية.</p>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="bg-white rounded-2xl border p-6 text-center py-16 shadow-xs animate-fadeIn">
            <p className="text-gray-400 text-lg font-bold">📁 لا توجد ملفات مرفوعة</p>
            <p className="text-gray-400 text-sm mt-2">يمكنك رفع المستندات والصور الخاصة بك هنا لإرفاقها بإعلاناتك بشكل أسرع.</p>
          </div>
        )}
      </div>
    </div>
  );
}
