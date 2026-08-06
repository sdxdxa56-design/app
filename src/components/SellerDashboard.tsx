import React, { useState } from 'react';
import { X, BarChart3, Eye, TrendingUp, Trash2, RefreshCw, Tag } from 'lucide-react';
import { Ad } from '../types';
import { deleteFirebaseAd } from '../firebase';
import { Language, TRANSLATIONS } from '../data/translations';

interface Props {
  currentUser: { name: string; phone: string } | null;
  ads: Ad[];
  onDeleteSuccess: (deletedId: string) => void;
  lang: Language;
  onPostAdClick: () => void;
  onClose: () => void;
}

export default function SellerDashboard({ currentUser, ads, onDeleteSuccess, lang, onPostAdClick, onClose }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const t = TRANSLATIONS[lang];

  if (!currentUser) return null;

  const myAds = ads.filter(ad => ad.phone === currentUser.phone);
  const totalViews = myAds.reduce((sum, ad) => sum + (ad.views || 0), 0);
  const totalInterests = myAds.reduce((sum, ad) => sum + (ad.interestsCount || 0), 0);

  const handleDelete = async (adId: string) => {
    try {
      await deleteFirebaseAd(adId);
      onDeleteSuccess(adId);
      setShowDeleteConfirm(null);
    } catch (e) {
      alert('فشل الحذف');
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto" dir="rtl" id="seller_dashboard_modal">
      <div className="fixed inset-0 bg-black/65 transition-opacity" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-3xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col font-sans z-10 my-auto">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-700 to-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-amber-300" />
            <div>
              <h2 className="text-lg font-black">{lang === 'ar' ? 'لوحة تحكم البائع' : 'Seller Dashboard'}</h2>
              <p className="text-xs text-emerald-100">{currentUser.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full cursor-pointer bg-transparent border-none text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-xl text-center">
              <Eye className="w-6 h-6 text-blue-600 mx-auto" />
              <p className="text-2xl font-black text-blue-900">{totalViews}</p>
              <p className="text-xs text-blue-500">{lang === 'ar' ? 'مشاهدة' : 'Views'}</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-xl text-center">
              <TrendingUp className="w-6 h-6 text-amber-600 mx-auto" />
              <p className="text-2xl font-black text-amber-900">{myAds.length}</p>
              <p className="text-xs text-amber-500">{lang === 'ar' ? 'إعلان' : 'Ads'}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl text-center">
              <Tag className="w-6 h-6 text-emerald-600 mx-auto" />
              <p className="text-2xl font-black text-emerald-900">{totalInterests}</p>
              <p className="text-xs text-emerald-500">{lang === 'ar' ? 'مهتم' : 'Interests'}</p>
            </div>
          </div>

          {/* Ads Table */}
          <div>
            <h3 className="text-sm font-black mb-3 text-gray-700">{lang === 'ar' ? 'إعلاناتي' : 'My Ads'}</h3>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-xs text-right text-gray-800">
                <thead className="bg-gray-50 border-b text-gray-500 font-bold">
                  <tr>
                    <th className="p-3 text-right">صورة</th>
                    <th className="p-3 text-right">العنوان</th>
                    <th className="p-3 text-right">السعر</th>
                    <th className="p-3 text-right">المشاهدات</th>
                    <th className="p-3 text-right">المهتمين</th>
                    <th className="p-3 text-right">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {myAds.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-400 font-bold">
                        {lang === 'ar' ? 'لا توجد إعلانات نشطة لديك حالياً.' : 'No active ads posted yet.'}
                      </td>
                    </tr>
                  ) : (
                    myAds.map(ad => (
                      <tr key={ad.id} className="hover:bg-gray-50">
                        <td className="p-3">
                          <img src={ad.image || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=60&w=200'} className="w-10 h-10 object-cover rounded" referrerPolicy="no-referrer" />
                        </td>
                        <td className="p-3 font-bold max-w-[200px] truncate">{ad.title}</td>
                        <td className="p-3 font-mono text-blue-600">{ad.price.toLocaleString()} ر.ي</td>
                        <td className="p-3 font-mono">{ad.views || 0}</td>
                        <td className="p-3 font-mono">{ad.interestsCount || 0}</td>
                        <td className="p-3">
                          <button onClick={() => setShowDeleteConfirm(ad.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg bg-transparent border-none cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                          {showDeleteConfirm === ad.id && (
                            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                              <div className="bg-white p-6 rounded-2xl shadow-xl text-center max-w-sm mx-4">
                                <p className="text-sm font-bold mb-4 text-gray-800">هل أنت متأكد من حذف الإعلان؟</p>
                                <div className="flex gap-2 justify-center">
                                  <button onClick={() => handleDelete(ad.id)} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-xs font-black cursor-pointer border-none">حذف</button>
                                  <button onClick={() => setShowDeleteConfirm(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-5 py-2 rounded-xl text-xs font-black cursor-pointer border-none">إلغاء</button>
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <button onClick={onPostAdClick} className="w-full py-3.5 bg-emerald-600 text-white font-black rounded-xl text-sm hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer border-none">
            {lang === 'ar' ? 'أضف إعلاناً جديداً 🇾🇪' : 'Post New Ad 🇾🇪'}
          </button>
        </div>
      </div>
    </div>
  );
}
