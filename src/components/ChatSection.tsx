import React, { useState, useEffect, useRef } from 'react';
import { Send, User, MessageCircle, X, ShieldAlert, Sparkles, Image as ImageIcon, Loader2 } from 'lucide-react';
import { 
  listenFirebaseMessages, 
  sendFirebaseMessage, 
  uploadImageToStorage, 
  updateFirebaseTypingStatus, 
  listenFirebaseTypingStatus,
  trackEvent,
  logErrorToSentry,
  normalizePhone
} from '../firebase';

interface ServerMessage {
  id: string;
  senderPhone: string;
  senderName: string;
  text: string;
  timestamp: number;
  imageUrl?: string;
}

interface ChatSectionProps {
  currentUser: { name: string; phone: string } | null;
  activeChat: {
    adId: string;
    adTitle: string;
    buyerPhone: string;
    sellerPhone: string;
    counterpartName: string;
    counterpartPhone: string;
  } | null;
  onClose: () => void;
}

export default function ChatSection({ currentUser, activeChat, onClose }: ChatSectionProps) {
  const [messages, setMessages] = useState<ServerMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const adId = activeChat?.adId;
  const buyerPhone = activeChat?.buyerPhone;
  const sellerPhone = activeChat?.sellerPhone;

  // Real-time listener and loading of messages via Firebase
  useEffect(() => {
    if (!adId || !buyerPhone || !sellerPhone || !currentUser) return;

    const cleanBuyer = normalizePhone(buyerPhone || '');
    const cleanSeller = normalizePhone(sellerPhone || '');
    const phones = [cleanBuyer, cleanSeller].sort();
    const chatId = `${adId}_${phones[0]}_${phones[1]}`;

    // Listen to messages
    const unsubscribeMessages = listenFirebaseMessages(chatId, (firebaseMsgs) => {
      const mappedList: ServerMessage[] = firebaseMsgs.map((msg: any) => ({
        id: msg.id,
        senderPhone: msg.senderPhone,
        senderName: msg.senderName,
        text: msg.text,
        timestamp: new Date(msg.created_at || Date.now()).getTime(),
        imageUrl: msg.imageUrl
      }));
      setMessages(mappedList);
    });

    // Listen to typing status
    const unsubscribeTyping = listenFirebaseTypingStatus(chatId, (typingMap) => {
      setTypingUsers(typingMap);
    });

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
      // Reset typing status on unmount
      updateFirebaseTypingStatus(chatId, currentUser.phone, false).catch(console.error);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [adId, buyerPhone, sellerPhone, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleInputChange = (val: string) => {
    setInputText(val);

    if (!currentUser || !adId || !buyerPhone || !sellerPhone) return;
    const cleanBuyer = normalizePhone(buyerPhone || '');
    const cleanSeller = normalizePhone(sellerPhone || '');
    const phones = [cleanBuyer, cleanSeller].sort();
    const chatId = `${adId}_${phones[0]}_${phones[1]}`;

    // Set typing to true
    updateFirebaseTypingStatus(chatId, currentUser.phone, true).catch(console.error);

    // Debounce setting typing to false
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      updateFirebaseTypingStatus(chatId, currentUser.phone, false).catch(console.error);
    }, 2000);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser || !activeChat) return;

    const messageText = inputText.trim();
    setInputText('');

    // Stop typing indicator immediately
    const cleanBuyer = normalizePhone(buyerPhone || '');
    const cleanSeller = normalizePhone(sellerPhone || '');
    const phones = [cleanBuyer, cleanSeller].sort();
    const chatId = `${adId}_${phones[0]}_${phones[1]}`;
    updateFirebaseTypingStatus(chatId, currentUser.phone, false).catch(console.error);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const payload = {
      chatId,
      adId: activeChat.adId,
      adTitle: activeChat.adTitle,
      senderPhone: currentUser.phone,
      senderName: currentUser.name,
      receiverPhone: activeChat.counterpartPhone,
      text: messageText,
      created_at: new Date().toISOString()
    };

    try {
      await sendFirebaseMessage(payload);
      trackEvent('send_chat_message_success', 'engagement', activeChat.adId);
    } catch (err: any) {
      console.error('Error sending message:', err);
      logErrorToSentry(err, { context: "Chat Send Message Failed", adId: activeChat.adId });
      trackEvent('send_chat_message_failed', 'engagement', activeChat.adId);
      alert(`⚠️ فشل إرسال الرسالة!\nالسبب: ${err.message || err}`);
    }
  };

  const handleAttachImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !activeChat) return;

    setIsUploading(true);
    try {
      // 1. Upload to storage
      const downloadURL = await uploadImageToStorage(file);

      // 2. Send the message with imageUrl
      const cleanBuyer = normalizePhone(buyerPhone || '');
      const cleanSeller = normalizePhone(sellerPhone || '');
      const phones = [cleanBuyer, cleanSeller].sort();
      const chatId = `${adId}_${phones[0]}_${phones[1]}`;

      const payload = {
        chatId,
        adId: activeChat.adId,
        adTitle: activeChat.adTitle,
        senderPhone: currentUser.phone,
        senderName: currentUser.name,
        receiverPhone: activeChat.counterpartPhone,
        text: '📎 أرسل صورة مرفقة',
        imageUrl: downloadURL,
        created_at: new Date().toISOString()
      };

      await sendFirebaseMessage(payload);
    } catch (err: any) {
      console.error('Error attaching chat image:', err);
      alert(`⚠️ فشل تحميل الصورة وإرسالها: ${err.message || err}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!currentUser) {
    return (
      <div className="fixed bottom-4 left-4 z-[99999] w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-red-200 p-6 text-center font-sans">
        <p className="text-xs font-bold text-red-700">⚠️ يجب إنشاء حساب أو تسجيل الدخول أولاً للمشاركة بالدردشة!</p>
        <button onClick={onClose} className="mt-3 text-xs bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl text-gray-700 cursor-pointer border-none font-bold">إغلاق</button>
      </div>
    );
  }

  if (!activeChat) {
    return null;
  }

  const isCounterpartTyping = typingUsers[activeChat.counterpartPhone] === true;

  return (
    <div className="fixed bottom-4 left-4 z-[99999] w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-blue-500 flex flex-col overflow-hidden text-gray-800 font-sans radial-fade-in animate-in slide-in-from-bottom-5 duration-200" dir="rtl" id="chat_section">
      
      {/* Mini Titlebar */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <div>
            <p className="text-[11px] font-black">مراسلة: {activeChat.counterpartName}</p>
            <p className="text-[9px] text-blue-150 truncate max-w-[200px] font-semibold">بخصوص: {activeChat.adTitle}</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-full transition-colors text-white cursor-pointer border-none bg-transparent"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Safety warning tag */}
      <div className="bg-amber-50 text-amber-900 border-b border-amber-200 p-2.5 text-[9px] font-bold leading-relaxed flex items-center gap-1.5 flex-shrink-0">
        <ShieldAlert className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
        <span>تنبيه أمان: يرجى عدم تحويل أي مبالغ نقدية مسبقاً، وعاين السلعة دائماً بمكان عام قبل الدفع.</span>
      </div>

      {/* Message Window Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[300px] min-h-[220px] bg-slate-50/50 flex flex-col">
        {messages.length === 0 ? (
          <div className="text-center py-12 my-auto">
            <MessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-bounce" />
            <p className="text-[9px] text-slate-400 font-bold">لا توجد رسائل بينكما بعد.</p>
            <p className="text-[8px] text-blue-600 font-extrabold mt-1">اكتب رسالتك بالأسفل للتفاوض وسيرد البائع فوراً!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderPhone === currentUser.phone;
            return (
              <div 
                key={msg.id}
                className={`flex flex-col max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed font-semibold shadow-xs ${
                  isMe 
                    ? 'mr-auto bg-blue-600 text-white rounded-br-none text-left' 
                    : 'ml-auto bg-white border border-slate-200 text-slate-800 rounded-bl-none text-right'
                }`}
              >
                {!isMe && (
                  <span className="text-[8px] opacity-75 block mb-1 font-black text-blue-600">{msg.senderName}</span>
                )}
                
                {/* Attached Image Rendering */}
                {msg.imageUrl && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-black/10 max-w-full">
                    <img 
                      src={msg.imageUrl} 
                      alt="Attachment" 
                      className="max-h-40 w-full object-cover rounded-lg cursor-zoom-in" 
                      onClick={() => window.open(msg.imageUrl, '_blank')}
                    />
                  </div>
                )}
                
                <span>{msg.text}</span>
              </div>
            );
          })
        )}

        {/* Real-time typing bubble */}
        {isCounterpartTyping && (
          <div className="ml-auto mr-1 bg-gray-100 border border-gray-200 text-slate-500 rounded-2xl rounded-bl-none px-3 py-2 text-[10px] font-bold flex items-center gap-1.5 self-start animate-pulse">
            <span className="text-blue-600">{activeChat.counterpartName} يكتب الآن</span>
            <span className="flex gap-0.5 items-center">
              <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce duration-300"></span>
              <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce duration-300 delay-75"></span>
              <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce duration-300 delay-150"></span>
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Uploading Progress Indicator */}
      {isUploading && (
        <div className="bg-blue-50 border-t border-blue-100 px-4 py-2 flex items-center gap-2 text-[10px] font-bold text-blue-700 flex-shrink-0 animate-pulse">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>جاري تحميل صورتك المرفقة وتأمين نقلها سحابياً...</span>
        </div>
      )}

      {/* Message input panel */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 flex-shrink-0">
        
        {/* Hidden File input for image attach */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleAttachImage} 
          accept="image/*" 
          className="hidden" 
        />

        {/* Attachment icon button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer border-none disabled:opacity-50"
          title="إرفاق صورة"
        >
          <ImageIcon className="h-4 w-4" />
        </button>

        <input
          type="text"
          placeholder="اكتب رسالتك اللطيفة هنا للتفاوض..."
          value={inputText}
          onChange={(e) => handleInputChange(e.target.value)}
          className="flex-1 text-xs font-bold border border-slate-200 hover:border-blue-400 focus:border-blue-600 focus:bg-white bg-slate-50 rounded-xl px-3.5 py-2.5 focus:outline-none transition-all text-right"
          required={!isUploading}
        />
        
        <button
          type="submit"
          className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all cursor-pointer shadow-md hover:scale-105 border-none"
        >
          <Send className="h-4 w-4 transform rotate-180" />
        </button>
      </form>

    </div>
  );
}
