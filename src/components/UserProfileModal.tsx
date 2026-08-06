import React, { useState, useEffect } from 'react';
import { X, User, Phone, Trash2, MessageCircle, FileText, CheckCircle, ShoppingBag, Edit2, Save } from 'lucide-react';
import { Ad } from '../types';
import { getFirebaseUserThreads, deleteFirebaseAd, updateFirebaseUserName } from '../firebase';

interface UserProfileModalProps {
  onClose: () => void;
  currentUser: { name: string; phone: string; email?: string };
  adsList: Ad[];
  onDeleteAd: (adId: string) => void;
  onOpenThread: (adItem: Ad, buyerPhone: string, sellerPhone: string) => void;
  onUpdateName?: (newName: string) => void;
}

interface ChatThread {
  chatId: string;
  adId: string;
  lastMessage: string;
  lastActive: number;
  buyerPhone: string;
  sellerPhone: string;
  adTitle: string;
}

export default function UserProfileModal({ 
  onClose, 
  currentUser, 
  adsList, 
  onDeleteAd, 
  onOpenThread,
  onUpdateName
}: UserProfileModalProps) {
  const [userThreads, setUserThreads] = useState<ChatThread[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(currentUser.name);
  const [isSavingName, setIsSavingName] = useState(false);

  // Filter ads published by this specific user session
  const myAds = adsList.filter(ad => ad.phone === currentUser.phone);

  const handleNavigateAccount = () => {
    window.history.pushState(null, '', '/account');
    window.dispatchEvent(new PopStateEvent('popstate'));
    onClose();
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) return;
    setIsSavingName(true);
    try {
      if (currentUser.phone) {
        await updateFirebaseUserName(currentUser.phone, editedName.trim());
      }
      if (onUpdateName) {
        onUpdateName(editedName.trim());
      }
      setIsEditingName(false);
    } catch (err) {
      console.error("Failed to update name:", err);
      alert("⚠️ فشل تحديث الاسم، يرجى المحاولة مجدداً.");
    } finally {
      setIsSavingName(false);
    }
  };

  // Load user threads (both where user is buyer or seller)
  useEffect(() => {
    async function fetchThreads() {
      if (!currentUser.phone) {
        setUserThreads([]);
        return;
      }
      setIsLoadingChats(true);
      try {
        const data = await getFirebaseUserThreads(currentUser.phone);

        if (data) {
          const chatsMap = new Map<string, any>();

          data.forEach((msg: any) => {
            const partnerPhone = msg.senderPhone === currentUser.phone ? msg.receiverPhone : msg.senderPhone;
            const key = `${msg.adId}_${partnerPhone}`;
            
            const existingThread = chatsMap.get(key);
            const msgTime = new Date(msg.created_at || msg.createdAt || Date.now()).getTime();

            if (!existingThread || msgTime > existingThread.lastActive) {
              chatsMap.set(key, {
                chatId: msg.chatId,
                adId: msg.adId,
                adTitle: msg.adTitle,
                lastMessage: msg.text,
                lastActive: msgTime,
                buyerPhone: msg.senderPhone === currentUser.phone ? currentUser.phone : partnerPhone,
                sellerPhone: msg.senderPhone === currentUser.phone ? partnerPhone : currentUser.phone
              });
            }
          });

          const threads: ChatThread[] = Array.from(chatsMap.values())
            .sort((a, b) => b.lastActive - a.lastActive);

          setUserThreads(threads);
        }
      } catch (err) {
        console.error('Failed to load chat threads from Firebase:', err);
      } finally {
        setIsLoadingChats(false);
      }
    }

    fetchThreads();
  }, [currentUser.phone, adsList]);

  const handleDeleteListing = async (adId: string) => {
    if (confirm('هل أنت متأكد من رغبتك في حذف هذا الإعلان بشكل نهائي ومستمر من قاعدة البيانات؟')) {
      try {
        await deleteFirebaseAd(adId);
        onDeleteAd(adId);
      } catch (err: any) {
        console.warn('Firebase delete error, using local delete fallback', err);
        alert(`خطأ أثناء الحذف: ${err.message || 'فشل الاتصال'}`);
        onDeleteAd(adId);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto" dir="rtl" id="user_profile_modal">
      <div className="fixed inset-0 bg-black/65 transition-opacity" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col font-sans z-10 my-auto">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-800 to-blue-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="text-sm font-black">حسابي الشخصي في السوق المفتوح 🇾🇪</h2>
              <p className="text-[10px] text-blue-150 font-bold">إدارة إعلاناتك ودردشاتك الموثقة بكل أمان وسهولة</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full cursor-pointer transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Tabs area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 select-none">
          
          {/* User Profile Summary Card */}
          <div className="p-4 bg-gradient-to-l from-slate-50 to-blue-50/25 rounded-2xl border border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-lg shadow-md">
                {currentUser.name.charAt(0)}
              </div>
              <div>
                {isEditingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="bg-white border border-blue-200 px-2.5 py-1 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800"
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={isSavingName}
                      className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                      title="حفظ الاسم"
                    >
                      {isSavingName ? (
                        <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full h-3.5 w-3.5"></span>
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditedName(currentUser.name);
                        setIsEditingName(false);
                      }}
                      className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors cursor-pointer text-[10px] font-bold"
                    >
                      إلغاء
                    </button>
                  </div>
                ) : (
                  <h3 className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                    <span>{currentUser.name}</span>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 fill-white stroke-[3px]" />
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                      title="تعديل الاسم"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </h3>
                )}
                <p className="text-[10px] text-gray-500 font-bold mt-0.5 tracking-wider font-mono text-right">
                  {currentUser.phone ? `📞 ${currentUser.phone}` : '⚠️ لم تقم بإضافة رقم هاتف بعد'}
                </p>
              </div>
            </div>

            <span className="text-[9px] bg-blue-100/50 text-blue-600 border border-blue-200 px-3 py-1 rounded-full font-bold">
              حساب يمني موثق مجاني
            </span>
          </div>

          {/* Action to Full Account page */}
          <div className="p-1" id="full_account_page_action">
            <button
              onClick={handleNavigateAccount}
              className="w-full bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white font-black text-xs py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <User className="w-4 h-4 text-amber-350" />
              <span>عرض وإدارة صفحة حسابي المتقدمة الكاملة (الملخص، التقييمات، الملفات) 👤📊</span>
            </button>
          </div>

          {/* Grid section of listings and chats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* My Active Listings */}
            <div className="flex flex-col">
              <h3 className="text-xs font-black text-gray-800 mb-3 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>إعلاناتي النشطة ({myAds.length})</span>
              </h3>

              <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                {myAds.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-bold">لم تقم بنشر أي إعلانات بعد.</p>
                  </div>
                ) : (
                  myAds.map(adItem => (
                    <div key={adItem.id} className="p-3 bg-white border border-gray-250 hover:border-gray-300 rounded-xl flex items-center gap-2.5 transition-all">
                      <img 
                        src={adItem.image} 
                        alt="" 
                        className="w-10 h-10 object-cover rounded-lg bg-gray-100 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[10px] font-bold text-gray-800 truncate leading-tight">{adItem.title}</h4>
                        <p className="text-[10px] text-blue-600 font-black mt-1">{adItem.price.toLocaleString()} ريال</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteListing(adItem.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        title="حذف هذا الإعلان فورياً"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* My Conversations / Chats threads */}
            <div className="flex flex-col">
              <h3 className="text-xs font-black text-gray-800 mb-3 flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-blue-600" />
                <span>صندوق دردشاتي ({userThreads.length})</span>
              </h3>

              <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                {isLoadingChats ? (
                  <div className="text-center py-8">
                    <span className="text-[10px] text-gray-405 font-bold">جاري تحميل صندوق الدردشة...</span>
                  </div>
                ) : userThreads.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-bold">لا توجد دردشات نشطة حالياً.</p>
                    <p className="text-[8px] text-blue-600 font-bold mt-1">اضغط على زر "دردشة فورية" بأي إعلان لبدء مراسلة البائعين!</p>
                  </div>
                ) : (
                  userThreads.map(thr => {
                    const matchedAd = adsList.find(a => a.id === thr.adId);
                    const counterpartPhone = thr.buyerPhone === currentUser.phone ? thr.sellerPhone : thr.buyerPhone;
                    
                    return (
                      <button
                        key={thr.chatId}
                        onClick={() => {
                          if (matchedAd) {
                            onOpenThread(matchedAd, thr.buyerPhone, thr.sellerPhone);
                          } else {
                            // Fallback dummy ad to start chat
                            onOpenThread({
                              id: thr.adId,
                              title: thr.adTitle,
                              price: 0,
                              description: 'تم مسح الإعلان أو نقله، وتستمر المحادثة بينكم.',
                              category: 'أخرى',
                              subcategory: 'أخرى',
                              city: 'صنعاء',
                              phone: thr.sellerPhone,
                              image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341',
                              ownerName: 'معلن آخر',
                              createdAt: new Date().toISOString(),
                              views: 1
                            }, thr.buyerPhone, thr.sellerPhone);
                          }
                          onClose();
                        }}
                        className="w-full text-right p-2.5 bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 rounded-xl flex items-center gap-2.5 transition-all cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-105 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center font-black text-xs">
                          {counterpartPhone.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[10px] font-black text-slate-800 truncate">تواصل بخصوص: {thr.adTitle}</h4>
                          <p className="text-[9px] text-gray-500 truncate mt-0.5">{thr.lastMessage || 'مراسلة جديدة'}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
