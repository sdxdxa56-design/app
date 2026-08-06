import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface Props {
  imageUrl: string;
  onDescription: (text: string) => void;
  lang: string;
}

export default function AIWriter({ imageUrl, onDescription, lang }: Props) {
  const [loading, setLoading] = useState(false);

  const generateDescription = async () => {
    if (!imageUrl) return;
    setLoading(true);
    try {
      let resolvedImageUrl = imageUrl;
      
      // If the image is a browser-local blob URL, convert to Base64 first so the server can process it!
      if (imageUrl.startsWith('blob:') || imageUrl.startsWith('file:')) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        resolvedImageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      // استدعاء Google Gemini Vision API عبر السيرفر الداخلي الموثوق وآمن
      const response = await fetch('/api/gemini/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: resolvedImageUrl })
      });
      const data = await response.json();
      if (data.description) {
        onDescription(data.description);
      } else if (data.error) {
        console.error("AI Writer Error:", data.error);
        alert(lang === 'ar' ? `خطأ: ${data.error}` : `Error: ${data.error}`);
      }
    } catch (e) {
      console.error(e);
      alert(lang === 'ar' ? 'فشل الاتصال بالذكاء الاصطناعي' : 'Failed to connect to AI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={generateDescription}
      disabled={loading || !imageUrl}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/40 dark:hover:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
      {lang === 'ar' ? 'اكتب وصفاً بالذكاء الاصطناعي ✨' : 'Generate AI Description ✨'}
    </button>
  );
}
