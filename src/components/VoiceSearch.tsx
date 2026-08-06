import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface Props {
  onResult: (text: string) => void;
  lang: string;
}

export default function VoiceSearch({ onResult, lang }: Props) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isStartedRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = lang === 'ar' ? 'ar-YE' : 'en-US';
      
      rec.onstart = () => {
        isStartedRef.current = true;
        setListening(true);
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        onResult(text);
      };
      
      rec.onerror = (err: any) => {
        console.error("Speech recognition error:", err);
        isStartedRef.current = false;
        setListening(false);
      };

      rec.onend = () => {
        isStartedRef.current = false;
        setListening(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch (e) {
          console.error("SpeechRecognition cleanup error:", e);
        }
      }
    };
  }, [lang, onResult]);

  const toggle = () => {
    if (!supported || !recognitionRef.current) {
      alert(lang === 'ar' ? 'البحث الصوتي غير مدعوم في متصفحك الحالي.' : 'Voice search is not supported in your browser.');
      return;
    }

    if (listening || isStartedRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (err) {
        console.error("Failed to abort speech recognition:", err);
      }
      isStartedRef.current = false;
      setListening(false);
    } else {
      try {
        // Abort first to make sure there's no active lock, then start
        try {
          recognitionRef.current.abort();
        } catch (e) {}
        
        recognitionRef.current.start();
        setListening(true);
        isStartedRef.current = true;
      } catch (err: any) {
        console.error("Failed to start speech recognition:", err);
        if (err && (err.name === 'InvalidStateError' || (err.message && err.message.includes('already started')))) {
          isStartedRef.current = true;
          setListening(true);
        } else {
          isStartedRef.current = false;
          setListening(false);
        }
      }
    }
  };

  if (!supported) return null;

  return (
    <button 
      type="button" 
      onClick={toggle} 
      className={`p-2.5 rounded-xl transition-colors cursor-pointer border-none flex items-center justify-center ${
        listening 
          ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
          : 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-500 dark:text-gray-300'
      }`}
      title={lang === 'ar' ? 'بحث صوتي ذكي' : 'Smart Voice Search'}
    >
      {listening ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
    </button>
  );
}
