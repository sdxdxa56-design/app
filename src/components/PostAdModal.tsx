import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ArrowRight, HelpCircle, AlertCircle, ShoppingBag, UploadCloud, Trash2, Image as ImageIcon } from 'lucide-react';
import { CATEGORIES, YEMENI_CITIES, CAR_BRANDS } from '../types';
import { insertFirebaseAd, uploadImageWithFallback, getUserData, consumeFreeAd, consumeUnits } from '../firebase';
import AIWriter from './AIWriter';

interface PostAdModalProps {
  onClose: () => void;
  onPostSuccess: (newAd: any) => void;
  currentUser: { name: string; phone: string; email?: string } | null;
}

const IMAGE_PRESETS = [
  { label: '🚘 سيارات', url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800' },
  { label: '🏢 شقق وعقارات', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800' },
  { label: '📱 آبل آيفون', url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=800' },
  { label: '💻 لابتوب وأجهزة', url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&q=80&w=800' },
  { label: '🛋️ أثاث كلاسيك', url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800' },
  { label: '🎮 بلايستيشن', url: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&q=80&w=800' },
];

const CITY_COORDINATES: Record<string, { lat: number; lng: number; landmark: string }> = {
  'صنعاء': { lat: 15.354, lng: 44.206, landmark: 'ميدان التحرير، وسط العاصمة صنعاء' },
  'عدن': { lat: 12.800, lng: 45.033, landmark: 'المعلا، بجانب منارة عدن التاريخية' },
  'تعز': { lat: 13.579, lng: 44.020, landmark: 'شارع جمال، وسط مدينة تعز' },
  'الحديدة': { lat: 14.800, lng: 42.950, landmark: 'ميناء الحديدة، شارع صنعاء' },
  'إب': { lat: 13.966, lng: 44.183, landmark: 'شلال المشنة، وسط محافظة إب' },
  'حضرموت': { lat: 14.542, lng: 49.124, landmark: 'خور المكلا السياحي، المكلا' },
  'مأرب': { lat: 15.463, lng: 45.325, landmark: 'سد مأرب التاريخي، مدينة مأرب' },
  'ذمار': { lat: 14.542, lng: 44.401, landmark: 'جامعة ذمار، الشارع العام' },
  'لحج': { lat: 13.061, lng: 44.877, landmark: 'الحوطة، سوق الخضار والفاكهة' },
  'صعدة': { lat: 16.940, lng: 43.763, landmark: 'وسط مدينة صعدة القديمة' },
};

export default function PostAdModal({ onClose, onPostSuccess, currentUser }: PostAdModalProps) {
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [subcategory, setSubcategory] = useState('');
  const [carBrand, setCarBrand] = useState('');
  const [city, setCity] = useState(YEMENI_CITIES[0]);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('ريال يمني');
  
  // Bind phone and user name to the logged-in profile securely
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [ownerName, setOwnerName] = useState(currentUser?.name || '');
  const [description, setDescription] = useState('');

  const [userData, setUserData] = useState<any>(null);
  const [isLoadingQuota, setIsLoadingQuota] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setIsLoadingQuota(true);
      getUserData(currentUser.phone, currentUser.email)
        .then((data) => {
          setUserData(data);
        })
        .catch(err => console.error("Error loading user credit data:", err))
        .finally(() => {
          setIsLoadingQuota(false);
        });
    }
  }, [currentUser]);
  
  // Real Local Images State (array of up to 5 elements)
  const [imageList, setImageList] = useState<{ blob: Blob; previewUrl: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // External URL Auto-Import
  const [importUrl, setImportUrl] = useState('');
  const [isImportingUrl, setIsImportingUrl] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');

  // Maps & Geolocation Coordinates
  const [useMap, setUseMap] = useState(false);
  const [lat, setLat] = useState(CITY_COORDINATES['صنعاء']?.lat || 15.35);
  const [lng, setLng] = useState(CITY_COORDINATES['صنعاء']?.lng || 44.20);
  const [mapAddress, setMapAddress] = useState(CITY_COORDINATES['صنعاء']?.landmark || '');
  const [trafficLevel, setTrafficLevel] = useState('light'); // light, moderate, heavy

  // Smart Real Estate Meters
  const [useSmartMeters, setUseSmartMeters] = useState(false);
  const [waterMeter, setWaterMeter] = useState('2.4');
  const [electricityMeter, setElectricityMeter] = useState('185');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentCategoryObj = CATEGORIES[categoryIndex];

  // Helper: Compress and resize image client-side to output a Blob directly
  const compressToBlob = (file: File, maxWidth = 1024, maxHeight = 1024, quality = 0.75): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Scale down if it exceeds maximum dimensions
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // Fallback to original
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(file); // Fallback
          }
        }, 'image/jpeg', quality);
        
        // Revoke the temporary object URL to save browser memory
        URL.revokeObjectURL(img.src);
      };
      img.onerror = (err) => {
        reject(err);
      };
    });
  };

  // Read files, compress them, and store directly as Blobs with local object URLs for previewing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 5 - imageList.length;
    if (files.length > remainingSlots) {
      setErrorMsg(`⚠️ عذراً! الحد الأقصى للرفع هو 5 صور فقط للإعلان الواحد. تم تصفية الباقي.`);
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots) as File[];
    filesToProcess.forEach(async (file: File) => {
      try {
        const compressedBlob = await compressToBlob(file);
        const previewUrl = URL.createObjectURL(compressedBlob);
        setImageList(prev => [...prev, { blob: compressedBlob, previewUrl }]);
      } catch (err) {
        console.warn('Error compressing image, trying fallback to raw file:', err);
        const previewUrl = URL.createObjectURL(file);
        setImageList(prev => [...prev, { blob: file, previewUrl }]);
      }
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files) return;

    const remainingSlots = 5 - imageList.length;
    if (files.length > remainingSlots) {
      setErrorMsg(`⚠️ عذراً! الحد الأقصى للرفع هو 5 صور فقط للإعلان الواحد. تم تصفية الباقي.`);
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots) as File[];
    filesToProcess.forEach(async (file: File) => {
      if (!file.type.startsWith('image/')) return;
      try {
        const compressedBlob = await compressToBlob(file);
        const previewUrl = URL.createObjectURL(compressedBlob);
        setImageList(prev => [...prev, { blob: compressedBlob, previewUrl }]);
      } catch (err) {
        console.warn('Error compressing image, trying fallback to raw file:', err);
        const previewUrl = URL.createObjectURL(file);
        setImageList(prev => [...prev, { blob: file, previewUrl }]);
      }
    });
  };

  const removeUploadedImage = (index: number) => {
    const target = imageList[index];
    if (target && target.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(target.previewUrl);
    }
    setImageList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim() || title.length < 5) {
      setErrorMsg('❌ عنوان الإعلان قصير جداً (الحد الأدنى 5 حروف)');
      return;
    }
    if (!price || Number(price) <= 0) {
      setErrorMsg('❌ الرجاء كتابة سعر صحيح ودقيق بالريال اليمني');
      return;
    }
    if (!phone || phone.length < 9) {
      setErrorMsg('❌ رقم الهاتف اليمني غير صحيح (يجب أن يتكون من 9 أرقام على الأقل)');
      return;
    }
    if (!description.trim() || description.length < 15) {
      setErrorMsg('❌ يرجى تقديم تفاصيل كافية ومواصفات واضحة عن السلعة (15 حرفاً على الأقل)');
      return;
    }

    if (!currentUser) {
      setErrorMsg('❌ يجب تسجيل الدخول لنشر الإعلان');
      return;
    }
    
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // 1. جلب بيانات الحساب للتحقق النهائي
      const liveUser = await getUserData(currentUser.phone, currentUser.email);
      if (!liveUser) {
        setErrorMsg('❌ فشل التحقق من الحساب الموثق. يرجى إعادة المحاولة.');
        setIsSubmitting(false);
        return;
      }

      let usingFreeAd = false;
      if (liveUser.freeAdsCount > 0) {
        usingFreeAd = true;
      } else if (liveUser.balance < 10) {
        setErrorMsg('❌ رصيدك غير كافٍ! ليس لديك إعلانات مجانية متبقية، وتكلفة النشر هي 10 وحدات ورصيدك الحالي أقل من ذلك.');
        setIsSubmitting(false);
        return;
      }

      // 2. رفع الصور وتحميلها إلى قاعدة البيانات
      const uploadedUrls: string[] = [];
      if (imageList.length === 0) {
        // Fallback to beautiful preset category banner
        uploadedUrls.push(IMAGE_PRESETS[categoryIndex]?.url || IMAGE_PRESETS[0].url);
      } else {
        for (let i = 0; i < imageList.length; i++) {
          const item = imageList[i];
          const file = new File([item.blob], `ad_image_${i}.jpg`, { type: 'image/jpeg' });
          try {
            const downloadURL = await uploadImageWithFallback(file);
            if (downloadURL && typeof downloadURL === 'string' && downloadURL.trim() !== '') {
              uploadedUrls.push(downloadURL);
            }
          } catch (uploadErr) {
            console.error("Single image upload failed, skipping...", uploadErr);
          }
        }
      }

      // ضمان وجود صورة واحدة على الأقل في حال فشل كل الرفوعات
      if (uploadedUrls.length === 0) {
        uploadedUrls.push(IMAGE_PRESETS[categoryIndex]?.url || IMAGE_PRESETS[0].url);
      }

      // حساب تاريخ الانتهاء (أسبوع واحد بالضبط)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const newAd: any = {
        title,
        description,
        price: Number(price),
        currency,
        category: currentCategoryObj.id,
        subcategory: subcategory || currentCategoryObj.subcategories[0],
        city,
        phone,
        image: uploadedUrls[0],
        images: uploadedUrls,
        ownerName: ownerName.trim() || 'عضو السوق المفتوح اليمني',
        status: 'active' as const,
        interestsCount: 0,
        expiresAt,
        isFreeAd: usingFreeAd,
        ownerVerified: liveUser.isVerified || false
      };

      // إضافة الحقول الاختيارية فقط إذا كانت مفعلة ولها قيم معينة لتجنب undefined في Firestore
      if (useMap) {
        newAd.latitude = Number(lat);
        newAd.longitude = Number(lng);
        newAd.mapAddress = mapAddress.trim();
      }

      if (currentCategoryObj.id === 'properties' && useSmartMeters) {
        newAd.waterMeter = Number(waterMeter);
        newAd.electricityMeter = Number(electricityMeter);
      }

      // 3. استهلاك الرصيد أو الإعلانات المجانية
      if (usingFreeAd) {
        const success = await consumeFreeAd(currentUser.phone);
        if (!success) {
          throw new Error('فشل استهلاك الإعلان المجاني');
        }
      } else {
        const success = await consumeUnits(currentUser.phone, 10);
        if (!success) {
          throw new Error('فشل خصم وحدات الرصيد');
        }
      }

      // 4. إدراج الإعلان في Firestore
      const insertedAd = await insertFirebaseAd(newAd);

      onPostSuccess(insertedAd);
    } catch (err: any) {
      console.error('Error posting ad:', err);
      const errMsg = err.message || 'مشكلة غير معروفة في الاتصال بالخادم';
      setErrorMsg(`❌ فشل نشر الإعلان: ${errMsg}`);
      alert(`⚠️ عذراً، فشل نشر الإعلان السحابي!\nالسبب الرئيسي: ${errMsg}\n\nيرجى التأكد من اتصال الإنترنت السليم ثم المحاولة مجدداً.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto text-gray-800" dir="rtl" id="postad_modal">
      <div className="fixed inset-0 bg-black/65 transition-opacity" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col font-sans z-10 my-auto">
        
        {/* Sticky Header */}
        <div className="p-5 bg-gradient-to-r from-blue-700 to-blue-600 text-white flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="text-sm font-black">إضافة إعلان جديد مجاني في اليمن</h2>
              <p className="text-[10px] text-blue-105 font-bold">إعلانك يظهر فوراً لآلاف المشترين وبدون أي عمولات</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full cursor-pointer transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Area */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 select-none">
          
          {userData && (
            <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-bold text-blue-900 select-none">
              <div className="flex items-center gap-2">
                <span className="text-lg">💎</span>
                <div>
                  <div className="font-extrabold text-blue-950">حساب الرصيد والوحدات الذكي</div>
                  <div className="text-[10px] text-blue-600 font-medium">مدة الإعلان أسبوع واحد بالضبط من تاريخ النشر</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1 ${userData.freeAdsCount > 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                  🎁 إعلانات مجانية متبقية: {userData.freeAdsCount}
                </span>
                <span className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1 ${userData.balance >= 10 ? 'bg-amber-50 text-amber-850 border-amber-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                  ⚡ رصيد الوحدات: {userData.balance} / 1000
                </span>
              </div>
            </div>
          )}

          {/* Quick Import from External Link Option */}
          <div className="p-3.5 bg-gradient-to-r from-purple-50 to-indigo-50/70 rounded-2xl border border-purple-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                <span>⚡ جلب واستيراد بيانات إعلان تلقائياً من رابط</span>
                <span className="text-[10px] bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full font-bold">جلب ذكي</span>
              </span>
              <span className="text-[10px] text-purple-700 font-bold">السوق المفتوح / حراج / غيرها</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="ضع رابط الإعلان هنا (مثال: https://opensooq.com/...)"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                className="flex-1 text-xs font-semibold text-gray-900 border border-purple-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-purple-600 text-left"
                dir="ltr"
              />
              <button
                type="button"
                disabled={isImportingUrl || !importUrl.trim()}
                onClick={async () => {
                  if (!importUrl.trim()) return;
                  setIsImportingUrl(true);
                  setImportSuccessMsg('');
                  setErrorMsg('');
                  try {
                    let data: any = {};
                    let fetchedOk = false;
                    try {
                      const response = await fetch(`/api/scrape-ad?url=${encodeURIComponent(importUrl.trim())}`);
                      if (response.ok) {
                        data = await response.json();
                        if (data && !data.error) fetchedOk = true;
                      }
                    } catch (apiErr) {
                      console.warn('Backend scrape failed:', apiErr);
                    }

                    if (!fetchedOk) {
                      try {
                        const proxyRes = await fetch(`https://corsproxy.io/?${encodeURIComponent(importUrl.trim())}`);
                        if (proxyRes.ok) {
                          const html = await proxyRes.text();
                          const parser = new DOMParser();
                          const doc = parser.parseFromString(html, 'text/html');
                          data.title = doc.querySelector('h1')?.textContent?.trim() || doc.querySelector('[class*="title"]')?.textContent?.trim();
                          data.description = doc.querySelector('[class*="description"]')?.textContent?.trim();
                        }
                      } catch (corsErr) {
                        console.warn('Corsproxy failed:', corsErr);
                      }
                    }

                    if (data.title) setTitle(data.title);
                    if (data.price && Number(data.price) > 0) setPrice(String(data.price));
                    if (data.currency) setCurrency(data.currency);
                    if (data.city && YEMENI_CITIES.includes(data.city)) setCity(data.city);
                    if (data.description) setDescription(data.description);
                    if (data.phone && data.phone !== '777777777') setPhone(data.phone);

                    if (data.title || data.price) {
                      setImportSuccessMsg(`✅ تم جلب واستيراد بيانات الإعلان! السعر: ${data.price ? Number(data.price).toLocaleString() : 'لم يُحدد'} ${data.currency || 'ريال يمني'}`);
                    } else {
                      setErrorMsg('⚠️ تعذر استخراج البيانات تلقائياً من هذا الرابط. يرجى إدخال البيانات يدوياً.');
                    }
                  } catch (e) {
                    setErrorMsg('⚠️ تعذر جلب بيانات الرابط تلقائياً. يرجى إدخال البيانات يدوياً.');
                  } finally {
                    setIsImportingUrl(false);
                  }
                }}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
              >
                {isImportingUrl ? 'جاري الاستيراد...' : 'جلب البيانات'}
              </button>
            </div>
            {importSuccessMsg && (
              <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                {importSuccessMsg}
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-4 bg-amber-50 text-amber-900 text-xs font-bold leading-relaxed rounded-xl border border-amber-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form grids: Name & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">الاسم المرتبط بحسابك الحالي 🔒</label>
              <input
                type="text"
                value={ownerName}
                readOnly
                className="w-full text-xs font-bold text-gray-500 bg-slate-100 border border-gray-200 rounded-xl px-3.5 py-2.5 cursor-not-allowed focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-750 mb-1.5">رقم الاتصال الموثق بملفك 📞</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="أدخل رقم هاتف يمني (مثال: 777123456)"
                className="w-full text-xs font-bold text-gray-900 border border-gray-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-600 transition-colors text-left"
                dir="ltr"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-750 mb-1.5">القسم الرئيسي</label>
              <select
                value={categoryIndex}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  setCategoryIndex(idx);
                  setSubcategory(CATEGORIES[idx].subcategories[0]);
                  setCarBrand('');
                }}
                className="w-full text-xs font-semibold text-gray-905 border border-gray-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-600 bg-white transition-colors text-gray-900"
              >
                {CATEGORIES.map((cat, i) => (
                  <option key={cat.id} value={i}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-750 mb-1.5">التصنيف الفرعي</label>
              <select
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="w-full text-xs font-semibold text-gray-900 border border-gray-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-600 bg-white transition-colors"
              >
                {currentCategoryObj.subcategories.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>

          {currentCategoryObj.id === 'cars' && (
            <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200 animate-fade-in">
              <label className="block text-xs font-black text-slate-900 mb-1.5 flex items-center gap-1.5">
                <span>🚘 اختر ماركة السيارة (الشركة المصنعة):</span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">جميع الماركات متاحة ({CAR_BRANDS.length})</span>
              </label>
              <select
                value={carBrand}
                onChange={(e) => setCarBrand(e.target.value)}
                className="w-full text-xs font-extrabold text-gray-900 border border-amber-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-600 bg-white shadow-2xs"
              >
                <option value="">-- اضغط لاختيار ماركة السيارة (تويوتا، هيونداي، كيا، نيسان...) --</option>
                {CAR_BRANDS.map((b) => (
                  <option key={b.id} value={b.nameAr}>
                    {b.nameAr} ({b.nameEn})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-750 mb-1.5">عنوان الإعلان</label>
              <input
                type="text"
                placeholder="مثال: سيارة تويوتا يارس 2018 نظيفة مجمرك للبيع"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                }}
                className="w-full text-xs font-semibold text-gray-900 border border-gray-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-600 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-750 mb-1.5">المحافظة</label>
              <select
                value={city}
                onChange={(e) => {
                  const selectedCity = e.target.value;
                  setCity(selectedCity);
                  const coords = CITY_COORDINATES[selectedCity];
                  if (coords) {
                    setLat(coords.lat);
                    setLng(coords.lng);
                    setMapAddress(coords.landmark);
                  }
                }}
                className="w-full text-xs font-semibold text-gray-905 border border-gray-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-600 bg-white transition-colors text-gray-900"
              >
                {YEMENI_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-750 mb-1.5">السعر المطلوب والعملة</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="950000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="flex-1 text-xs font-semibold text-gray-900 border border-gray-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-600 transition-colors"
                  required
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="text-xs font-bold border border-gray-300 rounded-xl px-2.5 py-2.5 bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="ريال يمني">ريال يمني (YER)</option>
                  <option value="ريال سعودي">ريال سعودي (SAR)</option>
                  <option value="دولار أمريكي">دولار أمريكي (USD)</option>
                </select>
              </div>
            </div>
            
            <div className="bg-amber-50 rounded-2xl border border-amber-250 p-3 text-[10px] font-bold text-amber-800 leading-relaxed flex items-center">
              👉 اختر العملة الصحيحة (يمني، سعودي، أو دولار) وضع سعراً واقعياً لتصلك الاتصالات بسرعة!
            </div>
          </div>

          {/* Premium Multiple File Uploader */}
          <div className="p-4 bg-slate-50 border border-dashed border-gray-300 rounded-2xl">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span>صور الإعلان الحقيقية (الحد الأقصى 5 صور)</span>
              </span>
              <span className="text-[10px] text-gray-500 font-extrabold">{imageList.length} من أصل 5 صور مرفوعة</span>
            </div>

            {/* Click/Drag Box */}
            {imageList.length < 5 ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center py-6 rounded-xl cursor-pointer transition-all gap-1.5 group border-2 ${isDragging ? 'bg-blue-50/80 border-blue-500 scale-[1.01]' : 'bg-white border-gray-200 hover:border-blue-500'}`}
              >
                <UploadCloud className={`w-8 h-8 text-blue-500 transition-transform ${isDragging ? 'scale-120' : 'group-hover:scale-110'}`} />
                <span className="text-xs font-black text-blue-900">
                  {isDragging ? 'أفلت الصور الآن لرفعها! 🚀' : 'اضغط هنا أو اسحب الصور إلى هنا لتحميلها'}
                </span>
                <span className="text-[9px] text-gray-400 font-medium">يدعم صيغ JPG, PNG, GIF بحد أقصى 5 صور حقيقية للسلعة</span>
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept="image/*"
                  className="hidden"
                />
              </div>
            ) : (
              <div className="py-3 bg-emerald-50 text-emerald-800 text-[10px] font-black border border-emerald-200 text-center rounded-xl">
                ✓ لقد قمت بتمثيل كامل الحد الأقصى للصور (5 صور)! يمكنك حذف بعضها لتحميل صور بديلة.
              </div>
            )}

            {/* Preview Grid */}
            {imageList.length > 0 && (
              <div className="grid grid-cols-5 gap-2 mt-4">
                {imageList.map((img, idx) => (
                  <div key={idx} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 group">
                    <img 
                      src={img.previewUrl} 
                      alt={`preview-${idx}`} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => removeUploadedImage(idx)}
                        className="p-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors cursor-pointer"
                        title="حذف هذه الصورة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Google Maps Coordinate Picker */}
          <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-3.5">
            <label className="flex items-center gap-2 text-xs font-black text-gray-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useMap}
                onChange={(e) => setUseMap(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span>📍 ربط وتحديد الموقع الجغرافي الدقيق على الخريطة</span>
            </label>
            
            {useMap && (
              <div className="space-y-3 p-3.5 bg-white border border-gray-150 rounded-xl animate-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 font-extrabold mb-1">المعلم المميز أو الشارع القريب</label>
                    <input
                      type="text"
                      value={mapAddress}
                      onChange={(e) => setMapAddress(e.target.value)}
                      placeholder="مثال: بجوار مسجد الصالح، شارع السبعين"
                      className="w-full bg-slate-50 text-gray-900 border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 font-extrabold mb-1">الحركة المرورية المتوقعة للوصول إليك</label>
                    <select
                      value={trafficLevel}
                      onChange={(e) => setTrafficLevel(e.target.value)}
                      className="w-full bg-slate-50 text-gray-900 border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="light">🟢 خفيفة - وصول سريع جداً</option>
                      <option value="moderate">🟡 متوسطة - طبيعي</option>
                      <option value="heavy">🔴 مزدحمة - يفضل تجنب أوقات الذروة</option>
                    </select>
                  </div>
                </div>

                {/* Simulated Map coordinates visualizer */}
                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-[11px] space-y-2.5 relative overflow-hidden">
                  <div className="absolute right-3 top-3 bg-amber-500 text-blue-950 font-sans font-black text-[9px] px-2 py-0.5 rounded-full animate-pulse">
                    MOCKED GPS STAGE
                  </div>
                  <h5 className="font-sans font-black text-xs text-amber-400 mb-1">مستشعر إحداثيات خرائط جوجل لليمن</h5>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-gray-400 block text-[9px] font-bold">خط العرض (Latitude)</span>
                      <input 
                        type="number" 
                        step="0.001"
                        value={lat} 
                        onChange={(e) => setLat(Number(e.target.value))}
                        className="w-full bg-slate-800 text-white rounded px-2 py-1 text-xs border border-slate-700 font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[9px] font-bold">خط الطول (Longitude)</span>
                      <input 
                        type="number" 
                        step="0.001"
                        value={lng} 
                        onChange={(e) => setLng(Number(e.target.value))}
                        className="w-full bg-slate-800 text-white rounded px-2 py-1 text-xs border border-slate-700 font-mono"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 font-sans leading-relaxed mt-1">
                    💡 سيتمكن المشترون من حساب المسافة الدقيقة بين مكانهم وبين موقع السلعة هذا، بالإضافة لعرض مسار القيادة الفوري.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Smart Real Estate Utility Meters (Only for real estate listings!) */}
          {currentCategoryObj.id === 'properties' && (
            <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-3.5">
              <label className="flex items-center gap-2 text-xs font-black text-gray-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useSmartMeters}
                  onChange={(e) => setUseSmartMeters(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span>🔌 ربط وتوثيق العداد الذكي الفعلي للعقار (مياه وكهرباء)</span>
              </label>

              {useSmartMeters && (
                <div className="p-4 bg-white border border-gray-150 rounded-xl space-y-3 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 p-2.5 rounded-lg text-[10px] font-bold">
                    <span>⚡</span>
                    <span>يدعم التوثيق السحابي التلقائي مع العدادات في صنعاء وعدن وبقية المحافظات.</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-400 font-extrabold mb-1">متوسط استهلاك المياه الشهري (m³)</label>
                      <input
                        type="text"
                        value={waterMeter}
                        onChange={(e) => setWaterMeter(e.target.value)}
                        placeholder="مثال: 2.4"
                        className="w-full bg-slate-50 text-gray-950 border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 font-extrabold mb-1">متوسط استهلاك الكهرباء (kWh)</label>
                      <input
                        type="text"
                        value={electricityMeter}
                        onChange={(e) => setElectricityMeter(e.target.value)}
                        placeholder="مثال: 185"
                        className="w-full bg-slate-50 text-gray-950 border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Description text area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-gray-750">شرح ووصف كافٍ ومواصفات السلعة</label>
              {imageList.length > 0 && (
                <AIWriter 
                  imageUrl={imageList[0].previewUrl} 
                  onDescription={(text) => setDescription(text)} 
                  lang="ar" 
                />
              )}
            </div>
            <textarea
              rows={4}
              placeholder="اكتب مواصفات سيارتك، حالة جهازك، قياسات الشقة، محتويات الغرف الخ... (اجعل الوصف واضحاً ووافياً لجلب المشتريين بسرعة)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs font-bold text-gray-950 border border-gray-300 rounded-xl p-3.5 focus:outline-none focus:border-blue-600 transition-colors"
              required
            ></textarea>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-black text-xs rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 border-none"
            >
              {isSubmitting ? 'جاري نشر إعلانك على السوق...' : 'انشر الإعلان الآن 🇾🇪'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
            >
              إلغاء
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
