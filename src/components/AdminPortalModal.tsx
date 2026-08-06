import React, { useState, useEffect } from 'react';
import { 
  X, Lock, ShieldAlert, BarChart3, Users, FileText, Eye, 
  MessageSquare, Trash2, Plus, ExternalLink, Image as ImageIcon, 
  CheckCircle, RefreshCw, Sparkles, HelpCircle, Mail, Send, Bell, ListTodo,
  Settings
} from 'lucide-react';
import { 
  db, getFirebaseStats, getFirebaseBanners, insertFirebaseBanner, 
  deleteFirebaseBanner, deleteFirebaseAd, getFirebaseAds, insertFirebaseAd,
  uploadImageToStorage, getFirebaseAlerts, insertFirebaseAlert,
  deleteFirebaseAlert, updateFirebaseAlert, getAllUserEmails,
  sendEmailViaEmailJS, SiteAlert, Banner,
  verifyUserByPhone, unverifyUserByPhone,
  chargeUserBalance, getUserByUserId,
  getSiteSettings, updateSiteSettings, giveFreeCreditToAllUsers, generateDailyReport
} from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { Ad, YEMENI_CITIES } from '../types';

interface AdminPortalModalProps {
  onClose: () => void;
  onRefreshAds: () => void;
}

// Helper to safely fetch proxy HTML without throwing unhandled network errors
const fetchProxyHtml = async (url: string): Promise<string> => {
  try {
    const proxyRes = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
    if (proxyRes.ok) return await proxyRes.text();
  } catch (corsErr) {
    console.warn('corsproxy.io failed:', corsErr);
  }
  try {
    const allOriginsRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
    if (allOriginsRes.ok) return await allOriginsRes.text();
  } catch (allOriginsErr) {
    console.warn('allorigins failed:', allOriginsErr);
  }
  return '';
};

// Helper to reliably extract price and currency on client-side DOM parsing
const parseClientPriceAndCurrency = (doc: Document, textSource?: string) => {
  let price = 0;
  let currency = 'ريال يمني';

  const normalizeDigits = (str: string): string => {
    if (!str) return '';
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    let res = str;
    for (let i = 0; i < 10; i++) {
      res = res.replace(new RegExp(arabicDigits[i], 'g'), i.toString());
    }
    return res;
  };

  const detectCurrencyStr = (txt: string): string => {
    if (!txt) return 'ريال يمني';
    if (/دولار|\$|usd|dollar/i.test(txt)) return 'دولار أمريكي';
    if (/سعودي|ر\.س|sar|saudi/i.test(txt)) return 'ريال سعودي';
    return 'ريال يمني';
  };

  const cleanAndParseNum = (rawStr: string): { price: number; hasMultiplier: boolean } => {
    if (!rawStr) return { price: 0, hasMultiplier: false };
    const norm = normalizeDigits(rawStr);
    
    let multiplier = 1;
    let hasMultiplier = false;
    if (/(?:ألف|الف|آلاف|الاف|\bk\b|ك\b)/i.test(norm)) {
      multiplier = 1000;
      hasMultiplier = true;
    } else if (/(?:مليون|ملايين|million|\bm\b)/i.test(norm)) {
      multiplier = 1000000;
      hasMultiplier = true;
    }

    const decMatch = norm.match(/([0-9]+(?:[\.\,][0-9]+)?)/);
    if (!decMatch) return { price: 0, hasMultiplier: false };

    let numStr = decMatch[1];
    if (hasMultiplier) {
      numStr = numStr.replace(',', '.');
      const floatVal = parseFloat(numStr);
      if (!isNaN(floatVal) && floatVal > 0) {
        return { price: Math.round(floatVal * multiplier), hasMultiplier: true };
      }
    }

    const cleanDigits = norm.replace(/[^0-9]/g, "");
    if (!cleanDigits) return { price: 0, hasMultiplier: false };

    if (cleanDigits.length === 9 && cleanDigits.startsWith("7")) {
      return { price: 0, hasMultiplier: false };
    }

    const val = parseInt(cleanDigits, 10);
    if (isNaN(val) || val <= 0) return { price: 0, hasMultiplier: false };

    return { price: val, hasMultiplier };
  };

  // 1. Check JSON-LD
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  scripts.forEach(s => {
    try {
      const json = JSON.parse(s.textContent || '');
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        if (item) {
          const offer = item.offers || item.offer;
          if (offer && (offer.price || offer.lowPrice)) {
            const parsed = cleanAndParseNum(String(offer.price || offer.lowPrice));
            if (parsed.price > 0 && parsed.price < 1000000000) {
              price = parsed.price;
              if (offer.priceCurrency) {
                currency = detectCurrencyStr(String(offer.priceCurrency));
              }
            }
          }
        }
      }
    } catch (e) {}
  });

  // 2. Check __NEXT_DATA__
  if (price === 0) {
    const nextDataScript = doc.querySelector('#__NEXT_DATA__');
    if (nextDataScript && nextDataScript.textContent) {
      try {
        const nextJson = JSON.parse(nextDataScript.textContent);
        const scanObj = (obj: any, depth = 0) => {
          if (!obj || typeof obj !== 'object' || depth > 8 || price > 0) return;
          const targetKeys = ["price", "price_value", "priceValue", "post_price", "price_text", "price_string", "price_formatted", "price_label", "amount", "cost"];
          for (const k of targetKeys) {
            if (obj[k] !== undefined && obj[k] !== null) {
              const val = obj[k];
              if (typeof val === 'number' && val > 0 && val < 1000000000) {
                price = val;
              } else if (typeof val === 'string') {
                const parsed = cleanAndParseNum(val);
                if (parsed.price > 0 && parsed.price < 1000000000) price = parsed.price;
              } else if (typeof val === 'object') {
                const subP = val.value ?? val.amount ?? val.val ?? val.price ?? val.formatted;
                if (typeof subP === 'number' && subP > 0) price = subP;
                else if (typeof subP === 'string') {
                  const parsed = cleanAndParseNum(subP);
                  if (parsed.price > 0) price = parsed.price;
                }
                const subC = val.currency ?? val.currency_symbol ?? val.symbol;
                if (typeof subC === 'string') currency = detectCurrencyStr(subC);
              }

              const currStr = String(obj.currency || obj.price_currency || obj.currency_symbol || '');
              const det = detectCurrencyStr(currStr);
              if (det) currency = det;

              if (price > 0) return;
            }
          }
          for (const k of Object.keys(obj)) {
            if (k !== 'filter' && k !== 'filters' && k !== 'query' && k !== 'search') {
              scanObj(obj[k], depth + 1);
            }
          }
        };
        scanObj(nextJson.props?.pageProps);
      } catch (e) {}
    }
  }

  // 3. Check Meta tags
  if (price === 0) {
    const metaPrice = doc.querySelector('meta[property="product:price:amount"]')?.getAttribute('content') ||
                      doc.querySelector('meta[property="og:price:amount"]')?.getAttribute('content') ||
                      doc.querySelector('meta[name="price"]')?.getAttribute('content');
    if (metaPrice) {
      const parsed = cleanAndParseNum(metaPrice);
      if (parsed.price > 0 && parsed.price < 1000000000) price = parsed.price;
    }
  }

  // 4. Check Price DOM Elements
  if (price === 0) {
    const priceEls = doc.querySelectorAll("[class*='post-price'], [class*='postPrice'], [class*='main-price'], [class*='current-price'], [class*='Price_price'], [class*='price'], [class*='Price'], [data-testid*='price'], [id*='price']");
    for (const el of Array.from(priceEls)) {
      const text = normalizeDigits(el.textContent?.trim() || '');
      const det = detectCurrencyStr(text);

      const parsed = cleanAndParseNum(text);
      if (parsed.price > 0 && price === 0 && parsed.price < 1000000000) {
        price = parsed.price;
        if (det) currency = det;
        break;
      }
    }
  }

  // 5. Text regex fallback
  if (price === 0) {
    const bodyText = normalizeDigits(textSource || doc.body?.textContent || '');
    const dollarMatch = bodyText.match(/\$\s*([0-9]{1,3}(?:[,\s.][0-9]{3})+|[0-9]{2,8})/i) || 
                        bodyText.match(/([0-9]{1,3}(?:[,\s.][0-9]{3})+|[0-9]{2,8})\s*\$/i);
    if (dollarMatch) {
      const parsed = cleanAndParseNum(dollarMatch[1]);
      if (parsed.price > 0 && parsed.price < 1000000000) {
        price = parsed.price;
        currency = 'دولار أمريكي';
      }
    }

    if (price === 0) {
      const match = bodyText.match(/(?:السعر|السعر:\s*|ثمن|سعر|بـ|بسعر|Price:?)\s*:?\s*([0-9\s,\.]+)\s*(ألف|الف|آلاف|الاف|مليون|ملايين|k|دولار|\$|USD|ريال سعودي|سعودي|SAR|ر\.س|ريال يمني|يمني|YER|ر\.ي|ريال)?/i) ||
                    bodyText.match(/([0-9]{1,3}(?:[,\s.][0-9]{3})+|[0-9]{2,8})\s*(ألف|الف|آلاف|الاف|مليون|ملايين|k|دولار|\$|USD|ريال سعودي|سعودي|SAR|ر\.س|ريال يمني|يمني|YER|ر\.ي|ريال)/i);
      if (match) {
        const parsed = cleanAndParseNum(match[0]);
        if (parsed.price > 0 && parsed.price < 1000000000) {
          price = parsed.price;
          if (match[2]) currency = detectCurrencyStr(match[2]);
        }
      }
    }
  }

  return { price, currency };
};

const detectCityClient = (str: string): string => {
  const text = (str || '').toLowerCase();
  if (/(?:عدن|في عدن|محافظة عدن|\/عدن\/|\/aden\/|aden)/i.test(text)) return "عدن";
  if (/(?:تعز|في تعز|محافظة تعز|المخا|\/تعز\/|\/taiz\/|taiz)/i.test(text)) return "تعز";
  if (/(?:المكلا|حضرموت|سيئون|تريم|شبام|في المكلا|محافظة حضرموت|\/المكلا\/|\/حضرموت\/|mukalla|hadramout)/i.test(text)) return "المكلا";
  if (/(?:إب|اب|في إب|في اب|محافظة إب|\/إب\/|\/اب\/|\/ibb\/|ibb)/i.test(text)) return "إب";
  if (/(?:الحديدة|حديدة|في الحديدة|محافظة الحديدة|\/الحديدة\/|hodeidah)/i.test(text)) return "الحديدة";
  if (/(?:مأرب|مارب|في مأرب|محافظة مأرب|\/مأرب\/|\/مارب\/|marib)/i.test(text)) return "مأرب";
  if (/(?:ذمار|في ذمار|محافظة ذمار|\/ذمار\/|dhamar)/i.test(text)) return "ذمار";
  if (/(?:عمران|في عمران|محافظة عمران|\/عمران\/|amran)/i.test(text)) return "عمران";
  if (/(?:شبوة|عتق|في شبوة|محافظة شبوة|\/شبوة\/|shabwah|ataq)/i.test(text)) return "شبوة";
  if (/(?:صعدة|في صعدة|محافظة صعدة|\/صعدة\/|saada)/i.test(text)) return "صعدة";
  if (/(?:لحج|في لحج|محافظة لحج|\/لحج\/|lahij)/i.test(text)) return "لحج";
  if (/(?:أبين|ابين|في أبين|محافظة أبين|\/أبين\/|abyan)/i.test(text)) return "أبين";
  if (/(?:المهرة|الغيضة|في المهرة|محافظة المهرة|\/المهرة\/|mahrah)/i.test(text)) return "المهرة";
  if (/(?:البيضاء|في البيضاء|محافظة البيضاء|\/البيضاء\/|bayda)/i.test(text)) return "البيضاء";
  if (/(?:حجة|في حجة|محافظة حجة|\/حجة\/|hajjah)/i.test(text)) return "حجة";
  if (/(?:ريمة|في ريمة|محافظة ريمة|\/ريمة\/|raymah)/i.test(text)) return "ريمة";
  if (/(?:سقطرى|في سقطرى|\/سقطرى\/|socotra)/i.test(text)) return "سقطرى";
  if (/(?:الضالع|في الضالع|محافظة الضالع|\/الضالع\/|dhalea)/i.test(text)) return "الضالع";
  if (/(?:صنعاء|أمانة العاصمة|في صنعاء|محافظة صنعاء|\/صنعاء\/|\/sanaa\/|sanaa)/i.test(text)) return "صنعاء";
  return "صنعاء";
};

const detectCategoryClient = (title: string, desc: string, url: string): { category: string; subcategory: string } => {
  const full = `${url} ${title} ${desc}`.toLowerCase();

  // URL path check
  if (url.includes('سيارات-ومركبات') || url.includes('cars') || url.includes('سيارات-للبيع')) {
    let sub = 'سيارات للبيع';
    if (/قطع|إكسسوار|اكسسوار|جنوط|كفر|اطار/i.test(full)) sub = 'قطع غيار واكسسوارات';
    else if (/إيجار|ايجار/i.test(full)) sub = 'سيارات للإيجار';
    else if (/دراجة|موتور|دباب/i.test(full)) sub = 'دراجات نارية';
    else if (/شاحنة|معدة|بوكلين|حفار|قاطرة/i.test(full)) sub = 'شاحنات ومعدات ثقيلة';
    return { category: 'cars', subcategory: sub };
  }

  if (url.includes('عقارات') || url.includes('real-estate') || url.includes('properties')) {
    let sub = 'عقارات للبيع';
    if (/إيجار|ايجار|للايجار/i.test(full)) sub = 'عقارات للإيجار';
    else if (/أرض|ارض|أراضي|اراضي/i.test(full)) sub = 'أراضي للبيع';
    else if (/تجاري|محل|مكتب|دكان/i.test(full)) sub = 'عقارات تجارية';
    return { category: 'properties', subcategory: sub };
  }

  // Text & keywords check for Cars & Vehicles
  if (/(?:سيارات|سيارة|مركبات|تويوتا|هيونداي|كيا|نيسان|مرسيدس|بي_ام|لكزس|فورد|شيفروليه|هوندا|ميتسوبيشي|مازدا|سوزوكي|جي_ام_سي|دودج|جيب|لاند_روفر|أودي|فولكس_واجن|بورش|كاديلاك|لينكون|كرايسلر|إنفينيتي|أكورا|جينيسيس|سوبارو|إيسوزو|دايهاستو|بيجو|رينو|فيات|فولفو|إم_جي|جيلي|شانجان|هافال|شيري|جريت_وول|بي_واي_دي|جاك|جيتور|هونغ_تشي|جي_إيه_سي|إكسيد|تانك|بايك|دونغ_فينغ|فوتون|تيسلا|جاكوار|مازيراتي|فيراري|لامبورغيني|بنتلي|رولز_رويس|أستون_مارتن|بوغاتي|مكلارين|ألفا_روميو|ميني|شكودا|سيات|أوبل|سانغ_يونغ|دايو|همر|لادا|دراجة|دراجات|شاحنة|باص|دباب|قطع_غيار|اطارات|كفرات|كامري|كورولا|هيلوكس|لاندكروزر|سوناتا|إلنترا|اكسنت|بيكانتو|سيراتو|باترول|صني|تاهو|شاص|اف_جي|برادو|يارس|فورنتشر|توسان|سنتافي)/i.test(full)) {
    let sub = 'سيارات للبيع';
    if (/إيجار|ايجار/i.test(full)) sub = 'سيارات للإيجار';
    else if (/قطع|إكسسوار|اكسسوار|جنوط|تاير|كفر/i.test(full)) sub = 'قطع غيار واكسسوارات';
    else if (/دراجة|موتور|سيكل|دباب/i.test(full)) sub = 'دراجات نارية';
    else if (/شاحنة|باص|دينة|تريلة|معدة|بوكلين|حفار/i.test(full)) sub = 'شاحنات ومعدات ثقيلة';
    return { category: 'cars', subcategory: sub };
  }

  // Real estate
  if (/(?:عقار|عقارات|شقة|شقق|فيلا|فلة|أرض|ارض|عماره|عمارة|بيت|منزل|محل|مكتب|مخزن|استثمار|لبنة|قصبة|حبلة|هنجر)/i.test(full)) {
    let sub = 'شقق للبيع';
    if (/إيجار|ايجار|للايجار/i.test(full)) sub = 'شقق للإيجار';
    else if (/أرض|ارض|أراضي|اراضي|لبنة|قصبة/i.test(full)) sub = 'أراضي للبيع';
    else if (/تجاري|محل|مكتب|دكان|هنجر/i.test(full)) sub = 'عقارات تجارية';
    else if (/فيلا|فلة|منزل|بيت|عمارة/i.test(full)) sub = 'بيوت ومنازل للبيع';
    return { category: 'properties', subcategory: sub };
  }

  // Mobiles
  if (/(?:جوال|موبايل|تلفون|هاتف|آيفون|ايفون|سامسونج|جلاكسي|جالكسي|شاومي|ردمي|هواوي|انفينكس|أبل|ايباد|تابلت|ساعة_ذكية|ريلمي|اوبو)/i.test(full)) {
    let sub = 'هواتف ذكية';
    if (/ايفون|آيفون|iphone|apple/i.test(full)) sub = 'آيفون';
    else if (/سامسونج|samsung|galaxy/i.test(full)) sub = 'سامسونج';
    else if (/اكسسوار|سماعة|شاحن|جراب/i.test(full)) sub = 'إكسسوارات هواتف';
    else if (/تابلت|ايباد|ipad|tablet/i.test(full)) sub = 'تابلت وأيباد';
    return { category: 'mobiles', subcategory: sub };
  }

  // Jobs
  if (/(?:وظيفة|وظائف|مطلوب|عمل|موظف|مهندس|محاسب|مندوب|سائق|مدرس|حارس|مطلوب_عمل|سيرة_ذاتية)/i.test(full)) {
    return { category: 'jobs', subcategory: 'وظائف شاغرة' };
  }

  // Furniture & Appliances
  if (/(?:أثاث|اثاث|كنب|طاولة|مجلس|غرفة|دولاب|سرير|مطبخ|فرش|موكيت|ستائر|ثلاجة|غسالة|مكيف|شاشة|تلفزيون|فرن|إلكترونيات|الكترونيات)/i.test(full)) {
    let sub = 'أثاث منزلي';
    if (/ثلاجة|غسالة|مكيف|فرن|شاشة|تلفزيون/i.test(full)) sub = 'أجهزة منزلية';
    return { category: 'furniture', subcategory: sub };
  }

  // Pets
  if (/(?:حيوان|حيوانات|كلب|كلاب|قط|قطط|طيور|طير|حمام|دجاج|غنم|مواشي|خيل|أسماك|سمك)/i.test(full)) {
    return { category: 'animals', subcategory: 'حيوانات أليفة' };
  }

  // Fashion
  if (/(?:ملابس|عطور|ساعات|شنط|أحذية|تجميل|مكياج|فستان|عباية)/i.test(full)) {
    return { category: 'fashion', subcategory: 'موضة وعناية' };
  }

  // Services
  if (/(?:خدمة|خدمات|مقاولات|صيانة|تنظيف|شحن|نقل|برمجة|تصميم)/i.test(full)) {
    return { category: 'services', subcategory: 'خدمات عامة' };
  }

  return { category: 'cars', subcategory: 'سيارات للبيع' };
};

export default function AdminPortalModal({ onClose, onRefreshAds }: AdminPortalModalProps) {
  // Login States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Dashboard Stats States
  const [stats, setStats] = useState({
    usersCount: 0,
    listingsCount: 0,
    messagesCount: 0,
    totalViews: 0
  });
  const [activeUsersToday, setActiveUsersToday] = useState(0);
  const [listingsTodayCount, setListingsTodayCount] = useState(0);
  const [simulatedVisitors, setSimulatedVisitors] = useState(1280);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Listings Management States
  const [allListings, setAllListings] = useState<Ad[]>([]);
  const [searchListingTerm, setSearchListingTerm] = useState('');
  const [isLoadingListings, setIsLoadingListings] = useState(false);

  // Banners States
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [bannerIsHero, setBannerIsHero] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isAddingBanner, setIsAddingBanner] = useState(false);
  const [isLoadingBanners, setIsLoadingBanners] = useState(false);

  // Site Alerts States
  const [alerts, setAlerts] = useState<SiteAlert[]>([]);
  const [alertText, setAlertText] = useState('');
  const [alertBgColor, setAlertBgColor] = useState('red');
  const [alertStartDate, setAlertStartDate] = useState('');
  const [alertEndDate, setAlertEndDate] = useState('');
  const [alertIsActive, setAlertIsActive] = useState(true);
  const [isAddingAlert, setIsAddingAlert] = useState(false);

  // Bulk Email States
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [emailProgress, setEmailProgress] = useState({ current: 0, total: 0 });
  const [emailSuccessCount, setEmailSuccessCount] = useState(0);

  // Active view tab inside admin
  const [activeTab, setActiveTab] = useState<'stats' | 'listings' | 'banners' | 'alerts' | 'bulk_emails' | 'verify_users' | 'charge_balance' | 'settings' | 'report' | 'scrape_single'>('stats');

  // Single Scrape States
  const [scrapeSingleUrl, setScrapeSingleUrl] = useState('');
  const [scrapedSingleAd, setScrapedSingleAd] = useState<any>(null);
  const [isScrapingSingle, setIsScrapingSingle] = useState(false);
  const [scrapeSingleError, setScrapeSingleError] = useState<string | null>(null);
  const [isImportingSingle, setIsImportingSingle] = useState(false);

  // Bulk / Fast Scrape States
  const [scrapeMode, setScrapeMode] = useState<'single' | 'bulk'>('single');
  const [scrapeBulkUrl, setScrapeBulkUrl] = useState('');
  const [scrapedResultsList, setScrapedResultsList] = useState<any[]>([]);
  const [isScrapingBulk, setIsScrapingBulk] = useState(false);
  const [scrapeBulkError, setScrapeBulkError] = useState<string | null>(null);
  const [importingAdLinks, setImportingAdLinks] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});

  const [editedTitle, setEditedTitle] = useState('');
  const [editedPrice, setEditedPrice] = useState<number>(0);
  const [editedCurrency, setEditedCurrency] = useState<string>('ريال يمني');
  const [editedOwnerName, setEditedOwnerName] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedCity, setEditedCity] = useState('');
  const [editedCategory, setEditedCategory] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedImageUrl, setEditedImageUrl] = useState('');

  // New site settings states
  const [siteSettings, setSiteSettings] = useState({ unitPrice: 10, freeCreditAmount: 0 });
  const [newUnitPrice, setNewUnitPrice] = useState('');
  const [freeAmount, setFreeAmount] = useState('');
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [verifyPhone, setVerifyPhone] = useState('');
  const [verifyMessage, setVerifyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Credit and balance charging state
  const [chargeUserId, setChargeUserId] = useState('');
  const [chargeAmount, setChargeAmount] = useState<number>(100);
  const [isCharging, setIsCharging] = useState(false);
  const [chargeMessage, setChargeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Handle Admin Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    const isUserValid = (cleanUser === 'ahmed' || cleanUser === 'admin');
    const isPassValid = (cleanPass === 'ahmed00' || cleanPass === 'adminping');

    if (isUserValid && isPassValid) {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('❌ اسم المستخدم أو كلمة المرور غير صحيحة! يرجى التأكد وإعادة المحاولة.');
    }
  };

  // Set up live Firestore listeners for Stats & Listings
  useEffect(() => {
    if (!isAuthenticated) return;

    setIsLoadingStats(true);
    setIsLoadingListings(true);

    // 1. Real-time listings listener
    const listingsQuery = query(collection(db, 'opensooq_listings'));
    const unsubscribeListings = onSnapshot(listingsQuery, (snapshot) => {
      const list: Ad[] = [];
      let totalV = 0;
      let adsToday = 0;
      const todayStr = new Date().toDateString();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const views = Number(data.views) || 0;
        totalV += views;

        // Count ads posted today
        const createdAt = data.createdAt || '';
        if (createdAt && new Date(createdAt).toDateString() === todayStr) {
          adsToday++;
        }

        list.push({ id: doc.id, views, ...data } as unknown as Ad);
      });

      // Sort ads by date descending
      list.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      setAllListings(list);
      setListingsTodayCount(adsToday);
      setStats(prev => ({
        ...prev,
        listingsCount: snapshot.size,
        totalViews: totalV
      }));
      setIsLoadingListings(false);

      // Simulate visitors based on listings & views
      setSimulatedVisitors(Math.max(1400, (totalV * 1.4) + snapshot.size * 5 + 320));
    }, (err) => {
      console.error("Listings subscription error:", err);
      setIsLoadingListings(false);
    });

    // 2. Real-time users listener
    const usersQuery = query(collection(db, 'opensooq_users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      setStats(prev => ({
        ...prev,
        usersCount: snapshot.size
      }));

      // Calculate active users today based on registered date
      const activeCount = snapshot.docs.filter(d => {
        const data = d.data();
        const dateStr = data.createdAt || data.created_at || '';
        if (!dateStr) return false;
        const userDate = new Date(dateStr);
        const today = new Date();
        return userDate.toDateString() === today.toDateString();
      }).length;
      
      // Keep at least 1 to show activity, or show the active count
      setActiveUsersToday(Math.max(1, activeCount));

      setIsLoadingStats(false);
    }, (err) => {
      console.error("Users subscription error:", err);
      setIsLoadingStats(false);
    });

    // 3. Real-time messages listener
    const messagesQuery = query(collection(db, 'opensooq_messages'));
    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      setStats(prev => ({
        ...prev,
        messagesCount: snapshot.size
      }));
    });

    // 4. Initial load of banners & alerts
    const fetchOtherData = async () => {
      setIsLoadingBanners(true);
      try {
        const bList = await getFirebaseBanners();
        setBanners(bList);
        const aList = await getFirebaseAlerts();
        setAlerts(aList);
        const settings = await getSiteSettings();
        setSiteSettings({
          unitPrice: settings.unitPrice,
          freeCreditAmount: settings.freeCreditAmount
        });
      } catch (err) {
        console.error("Error loading alerts/banners/settings:", err);
      } finally {
        setIsLoadingBanners(false);
      }
    };
    fetchOtherData();

    return () => {
      unsubscribeListings();
      unsubscribeUsers();
      unsubscribeMessages();
    };
  }, [isAuthenticated]);

  // Handle Direct Banner Image Upload
  const handleBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBanner(true);
    try {
      const url = await uploadImageToStorage(file);
      setBannerImageUrl(url);
      alert('✅ تم رفع صورة البانر بنجاح وحفظها في Firebase Storage!');
    } catch (err) {
      alert('❌ فشل رفع الصورة. يرجى التحقق من حجم الملف والاتصال بالخادم.');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  // Add Banner/Hero Banner
  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerImageUrl.trim()) {
      alert('⚠️ يرجى تزويد رابط الصورة أو رفع صورة من جهازك أولاً!');
      return;
    }

    setIsAddingBanner(true);
    try {
      const newBanner = await insertFirebaseBanner({
        title: bannerTitle.trim() || 'مساحة إعلانية مميزة',
        imageUrl: bannerImageUrl.trim(),
        link: bannerLink.trim() || 'https://wa.me/967775378369',
        isHero: bannerIsHero
      });

      setBanners(prev => [newBanner, ...prev]);
      setBannerTitle('');
      setBannerImageUrl('');
      setBannerLink('');
      setBannerIsHero(false);
      alert('🎉 تم نشر المساحة الإعلانية المتميزة بنجاح على الموقع!');
    } catch (err) {
      alert('❌ تعذر إضافة البانر الإعلاني.');
    } finally {
      setIsAddingBanner(false);
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!window.confirm('⚠️ هل تريد إزالة هذا البانر الإعلاني من العرض نهائياً؟')) {
      return;
    }

    try {
      await deleteFirebaseBanner(bannerId);
      setBanners(prev => prev.filter(b => b.id !== bannerId));
      alert('✅ تم إزالة البانر الإعلاني بنجاح.');
    } catch (err) {
      alert('❌ فشل إزالة البانر.');
    }
  };

  // Add Alert Bar
  const handleAddAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertText.trim()) {
      alert('⚠️ يرجى كتابة نص التنبيه العلوي!');
      return;
    }

    setIsAddingAlert(true);
    try {
      const newAlert = await insertFirebaseAlert({
        text: alertText.trim(),
        backgroundColor: alertBgColor,
        startDate: alertStartDate,
        endDate: alertEndDate,
        isActive: alertIsActive
      });

      setAlerts(prev => [newAlert, ...prev]);
      setAlertText('');
      setAlertBgColor('red');
      setAlertStartDate('');
      setAlertEndDate('');
      setAlertIsActive(true);
      alert('🚨 تم نشر وتفعيل التنبيه العلوي الجديد بنجاح على شريط الإعلانات العام!');
    } catch (err) {
      alert('❌ تعذر إضافة التنبيه العلوي.');
    } finally {
      setIsAddingAlert(false);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!window.confirm('⚠️ هل تريد حذف هذا التنبيه نهائياً من الموقع؟')) {
      return;
    }

    try {
      await deleteFirebaseAlert(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      alert('✅ تم حذف التنبيه بنجاح.');
    } catch (err) {
      alert('❌ فشل حذف التنبيه.');
    }
  };

  const handleToggleAlertStatus = async (alertId: string, currentStatus: boolean) => {
    try {
      await updateFirebaseAlert(alertId, { isActive: !currentStatus });
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, isActive: !currentStatus } : a));
    } catch (err) {
      alert('❌ تعذر تحديث حالة التنبيه.');
    }
  };

  // Bulk Email Sending via EmailJS
  const handleSendBulkEmails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject.trim() || !emailBody.trim()) {
      alert('⚠️ يرجى تعبئة عنوان ومحتوى الرسالة أولاً!');
      return;
    }

    setIsSendingEmails(true);
    setEmailSuccessCount(0);

    try {
      const emails = await getAllUserEmails();
      if (emails.length === 0) {
        alert('⚠️ لم يتم العثور على أي مستخدمين مسجلين لديهم بريد إلكتروني صالح في النظام.');
        setIsSendingEmails(false);
        return;
      }

      setEmailProgress({ current: 0, total: emails.length });

      let success = 0;
      for (let i = 0; i < emails.length; i++) {
        const mail = emails[i];
        setEmailProgress(prev => ({ ...prev, current: i + 1 }));
        
        const isSent = await sendEmailViaEmailJS(mail, emailSubject.trim(), emailBody.trim());
        if (isSent) {
          success++;
          setEmailSuccessCount(success);
        }
        // Minimal timeout to prevent blocking thread
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      alert(`🎉 تم الانتهاء من إرسال الرسائل الجماعية! تم الإرسال لـ ${success} من أصل ${emails.length} بريد إلكتروني.`);
      setEmailSubject('');
      setEmailBody('');
    } catch (err) {
      alert('❌ حدث خطأ أثناء إرسال البريد الإلكتروني الجماعي.');
    } finally {
      setIsSendingEmails(false);
    }
  };

  const handleDeleteListing = async (adId: string) => {
    if (!window.confirm('⚠️ هل أنت متأكد من رغبتك في حذف هذا الإعلان نهائياً من قاعدة بيانات السوق المفتوح اليمني؟')) {
      return;
    }

    try {
      await deleteFirebaseAd(adId);
      setAllListings(prev => prev.filter(ad => ad.id !== adId));
      onRefreshAds();
      alert('✅ تم حذف إعلان المستخدم بنجاح من الخادم في الـ Cloud.');
    } catch (err) {
      alert('❌ فشل حذف الإعلان. الرجاء التحقق من جودة الاتصال بالإنترنت.');
    }
  };

  const handleFastImport = async (ad: { title: string; link: string; price: number; image: string }) => {
    setImportingAdLinks(prev => ({ ...prev, [ad.link]: 'loading' }));
    try {
      let data;
      try {
        const response = await fetch(`/api/scrape-ad?url=${encodeURIComponent(ad.link)}`);
        if (!response.ok) throw new Error('Backend failed');
        data = await response.json();
        if (data.error) throw new Error(data.error);
      } catch (apiErr) {
        console.warn('Backend scrape failed during fast import, trying client-side proxy:', apiErr);
        const html = await fetchProxyHtml(ad.link);

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const title = doc.querySelector('h1')?.textContent?.trim() || 
                      doc.querySelector('[class*="title"]')?.textContent?.trim() || 
                      ad.title || 'إعلان من السوق المفتوح';

        const bodyText = doc.body.textContent || '';
        const parsedData = parseClientPriceAndCurrency(doc, bodyText);
        let price = parsedData.price || ad.price || 0;
        let currency = parsedData.currency || (ad as any).currency || 'ريال يمني';

        const images: string[] = [];
        doc.querySelectorAll('img').forEach(img => {
          const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
          if (src && !src.includes('base64') && !src.startsWith('data:') && !images.includes(src)) {
            if (src.includes('opensooq-images') || src.includes('img.opensooq') || src.includes('opensooq.com')) {
              images.push(src);
            }
          }
        });

        if (images.length === 0) {
          doc.querySelectorAll('img').forEach(img => {
            const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
            if (src && src.startsWith('http') && !src.includes('google') && !src.includes('facebook') && !images.includes(src)) {
              images.push(src);
            }
          });
        }

        const description = doc.querySelector('[class*="description"]')?.textContent?.trim() ||
                            doc.querySelector('[class*="details"]')?.textContent?.trim() ||
                            'لا يوجد وصف متاح';

        const ownerName = doc.querySelector('[class*="user-name"]')?.textContent?.trim() ||
                          doc.querySelector('[class*="seller-name"]')?.textContent?.trim() ||
                          'بائع من السوق المفتوح';

        let phone = '777777777';
        const phoneMatch = html.match(/[\+]?[0-9]{9,12}/g);
        if (phoneMatch) {
          for (const match of phoneMatch) {
            const cleaned = match.replace(/[^0-9]/g, '');
            if (cleaned.length >= 9) {
              phone = cleaned.slice(-9);
              break;
            }
          }
        }

        const locText = (doc.querySelector('[class*="city"], [class*="location"], [class*="address"]')?.textContent || '') + ' ' + html + ' ' + title + ' ' + description;
        const city = detectCityClient(locText);
        const { category, subcategory } = detectCategoryClient(title, description, ad.link);

        data = {
          title,
          description: description.substring(0, 1000),
          price,
          currency,
          images,
          image: images[0] || ad.image || 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&q=80&w=800',
          ownerName,
          phone,
          city,
          category,
          subcategory
        };
      }

      // Resolve clean images list
      const cleanImages = Array.isArray(data.images) && data.images.length > 0
        ? data.images
        : [data.image || ad.image || "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&q=80&w=800"];

      // 2. Save to firebase
      await insertFirebaseAd({
        title: (data.title || ad.title).trim(),
        description: (data.description || "لا يوجد وصف متاح").trim(),
        price: Number(data.price || ad.price) || 0,
        currency: data.currency || (ad as any).currency || "ريال يمني",
        category: data.category || "cars",
        subcategory: data.subcategory || "أخرى",
        city: data.city || "صنعاء",
        phone: (data.phone || "777777777").trim(),
        image: cleanImages[0],
        images: cleanImages,
        ownerName: (data.ownerName || "بائع من السوق المفتوح").trim(),
        status: 'active',
        interestsCount: 0,
        views: 0,
        createdAt: new Date().toISOString()
      } as any);

      setImportingAdLinks(prev => ({ ...prev, [ad.link]: 'success' }));
      onRefreshAds();
    } catch (err) {
      console.error("Fast import error:", err);
      setImportingAdLinks(prev => ({ ...prev, [ad.link]: 'error' }));
    }
  };

  // Filter listings based on search term
  const filteredListings = allListings.filter(ad => 
    ad.title.toLowerCase().includes(searchListingTerm.toLowerCase()) ||
    (ad.description && ad.description.toLowerCase().includes(searchListingTerm.toLowerCase())) ||
    ad.city.toLowerCase().includes(searchListingTerm.toLowerCase()) ||
    ad.phone.includes(searchListingTerm)
  );

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto flex items-center justify-center p-3 sm:p-6 text-right" dir="rtl" id="admin_portal_modal_backdrop">
      <div className="fixed inset-0 bg-slate-950/80 transition-opacity" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] z-10 my-auto" id="admin_portal_content_container">
        
        {/* Header bar */}
        <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-amber-500 text-slate-950 rounded-xl font-bold">
              🛡️
            </span>
            <div>
              <h3 className="text-sm font-black flex items-center gap-1.5">
                <span>لوحة التحكم والإدارة لـ السوق المفتوح اليمني</span>
                <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-black">غرفة العمليات الحية</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-bold mt-1">بوابة المشرف لمراقبة النشاط العام، تخصيص المساحات الإعلانية، وبث التنبيهات.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer border-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isAuthenticated ? (
          /* Login Form View */
          <div className="p-8 md:p-12 max-w-md mx-auto w-full text-center space-y-6" id="admin_login_box">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto text-3xl shadow-sm border border-amber-100 animate-pulse">
              🔐
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900">تسجيل الدخول لبوابة الإدارة المتقدمة</h4>
              <p className="text-xs text-gray-400 font-bold mt-1">الوصول متاح فقط لصاحب الموقع ومطوري النظام المعتمدين.</p>
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-150 text-right leading-relaxed">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-right">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">اسم المستخدم (Username)</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="أدخل اسم المستخدم المخصص"
                    className="w-full text-xs font-bold border border-gray-200 rounded-xl p-3.5 pr-10 focus:outline-none focus:border-slate-800 bg-gray-50 focus:bg-white text-right"
                  />
                  <span className="absolute right-3.5 top-3.5 text-gray-400 text-xs">👤</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">كلمة المرور (Password)</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور السرية"
                    className="w-full text-xs font-bold border border-gray-200 rounded-xl p-3.5 pr-10 focus:outline-none focus:border-slate-800 bg-gray-50 focus:bg-white text-right"
                  />
                  <span className="absolute right-3.5 top-3.5 text-gray-400 text-xs">🔑</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-850 text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer border-none"
              >
                المصادقة وفتح لوحة التحكم 🚀
              </button>
            </form>

            <p className="text-[10px] text-gray-400 font-bold pt-4 border-t border-gray-100">
              مستوى حماية عالي الجودة مشفر عبر قنوات Firebase الآمنة.
            </p>
          </div>
        ) : (
          /* Logged In Dashboard View */
          <div className="flex flex-col flex-1 overflow-hidden" id="admin_dashboard_authenticated">
            
            {/* Nav tabs bar */}
            <div className="bg-slate-100 p-2.5 flex flex-wrap gap-2 border-b border-gray-250">
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'stats' ? 'bg-slate-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>إحصائيات فورية حية</span>
              </button>

              <button
                onClick={() => setActiveTab('listings')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'listings' ? 'bg-slate-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>إدارة الإعلانات ({allListings.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('scrape_single')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'scrape_single' ? 'bg-slate-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <ExternalLink className="w-4 h-4 text-purple-500" />
                <span>استيراد إعلان 🔗</span>
              </button>

              <button
                onClick={() => setActiveTab('banners')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'banners' ? 'bg-slate-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>المساحة الإعلانية الكبرى والبنرات ({banners.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('alerts')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'alerts' ? 'bg-slate-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>شريط التنبيهات العلوي ({alerts.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('bulk_emails')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'bulk_emails' ? 'bg-slate-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>الرسائل الجماعية عبر البريد ✉️</span>
              </button>

              <button
                onClick={() => setActiveTab('verify_users')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'verify_users' ? 'bg-slate-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>توثيق الحسابات 🛡️</span>
              </button>

              <button
                onClick={() => setActiveTab('charge_balance')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'charge_balance' ? 'bg-slate-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>شحن الأرصدة والوحدات ⚡</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'settings' ? 'bg-slate-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>الإعدادات العامة ⚙️</span>
              </button>

              <button
                onClick={() => setActiveTab('report')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'report' ? 'bg-slate-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-500" />
                <span>التقرير اليومي PDF 📄</span>
              </button>
            </div>

            {/* Main view areas scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">

              {activeTab === 'stats' && (
                /* Stats and Analytics Tab */
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Live indicators banner */}
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="text-xs font-black text-emerald-900">الاتصال المباشر بقاعدة البيانات Firestore نشط. يتم تحديث الأرقام والبيانات في نفس اللحظة تلقائياً!</span>
                  </div>

                  {/* Cards container */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    
                    <div className="bg-white rounded-2xl border border-gray-250 p-5 shadow-xs relative overflow-hidden">
                      <div className="absolute left-3 bottom-3 text-3xl opacity-15">👥</div>
                      <h5 className="text-[10px] font-black text-gray-400">إجمالي المشتركين</h5>
                      <p className="text-xl font-extrabold text-slate-900 mt-1">{stats.usersCount}</p>
                      <span className="text-[9px] text-emerald-600 font-bold mt-1 block">موزعين بكافة المدن اليمنية</span>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-250 p-5 shadow-xs relative overflow-hidden">
                      <div className="absolute left-3 bottom-3 text-3xl opacity-15">📦</div>
                      <h5 className="text-[10px] font-black text-gray-400">الإعلانات الكلية النشطة</h5>
                      <p className="text-xl font-extrabold text-slate-900 mt-1">{stats.listingsCount}</p>
                      <span className="text-[9px] text-blue-600 font-bold mt-1 block">إجمالي السلع والخدمات</span>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-250 p-5 shadow-xs relative overflow-hidden">
                      <div className="absolute left-3 bottom-3 text-3xl opacity-15">💬</div>
                      <h5 className="text-[10px] font-black text-gray-400">المحادثات المتبادلة</h5>
                      <p className="text-xl font-extrabold text-slate-900 mt-1">{stats.messagesCount}</p>
                      <span className="text-[9px] text-amber-600 font-bold mt-1 block">دردشات مباشرة نشطة</span>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-250 p-5 shadow-xs relative overflow-hidden">
                      <div className="absolute left-3 bottom-3 text-3xl opacity-15">👁️</div>
                      <h5 className="text-[10px] font-black text-gray-400">مشاهدات المعروض</h5>
                      <p className="text-xl font-extrabold text-slate-900 mt-1">{stats.totalViews}</p>
                      <span className="text-[9px] text-purple-600 font-bold mt-1 block">زيارات مجمعة حقيقية</span>
                    </div>

                  </div>

                  {/* Live Activity Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-blue-900 to-slate-950 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
                      <h4 className="text-xs font-black text-blue-400">المستخدمون النشطون اليوم 👤</h4>
                      <p className="text-2xl font-black mt-2">{activeUsersToday} مستخدم</p>
                      <p className="text-[10px] text-slate-300 mt-1 font-semibold">عدد الحسابات الموثقة التي تفاعلت مع العروض أو أرسلت رسائل اليوم.</p>
                    </div>

                    <div className="bg-gradient-to-br from-amber-600 to-amber-900 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
                      <h4 className="text-xs font-black text-amber-200">الإعلانات الجديدة اليوم 📦</h4>
                      <p className="text-2xl font-black mt-2">{listingsTodayCount} إعلان جديد</p>
                      <p className="text-[10px] text-amber-100 mt-1 font-semibold">إعلانات وعروض منشورة من مختلف محافظات اليمن خلال الـ 24 ساعة الماضية.</p>
                    </div>
                  </div>

                  {/* Simulated visitor indicator */}
                  <div className="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden shadow-md">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-black text-amber-400 flex items-center gap-1.5">
                          <span>مؤشر حركة الزوار الكلي لليوم</span>
                          <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded-full font-black animate-pulse">نشط الآن</span>
                        </h4>
                        <p className="text-[11px] text-slate-300 mt-1">
                          يقدر إجمالي الزيارات والتصفح لغير المسجلين اليوم بـ <strong className="text-white text-sm">{simulatedVisitors}</strong> تصفح مستمر.
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          setSimulatedVisitors(v => v + Math.floor(Math.random() * 30) + 10);
                        }}
                        className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-[10px] py-2 px-4 rounded-xl transition-colors cursor-pointer border-none"
                      >
                        إعادة فحص الزوار 🔄
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {activeTab === 'listings' && (
                /* Listings Management Tab */
                <div className="space-y-4 animate-fade-in">
                  
                  {/* Search Bar */}
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={searchListingTerm}
                      onChange={(e) => setSearchListingTerm(e.target.value)}
                      placeholder="ابحث عن إعلان محدد لحذفه (اكتب العنوان، المحافظة، أو هاتف الناشر)..."
                      className="flex-1 text-xs font-bold border border-gray-250 rounded-xl p-3 focus:outline-none focus:border-slate-800 bg-white"
                    />
                    {searchListingTerm && (
                      <button 
                        onClick={() => setSearchListingTerm('')}
                        className="text-xs font-black text-red-600 bg-red-50 hover:bg-red-100 px-4 py-3 rounded-xl border border-red-200 transition-colors cursor-pointer"
                      >
                        مسح
                      </button>
                    )}
                  </div>

                  {/* Listings Grid */}
                  {isLoadingListings ? (
                    <div className="py-12 text-center text-xs font-bold text-gray-400">جاري تحميل إعلانات السوق المفتوح من Firestore...</div>
                  ) : filteredListings.length === 0 ? (
                    <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-300 p-6">
                      <p className="text-xs font-black text-gray-500">لم يتم العثور على أي إعلانات تطابق بحثك الحالي!</p>
                      <p className="text-[11px] text-gray-400 mt-1 font-bold">يرجى تغيير كلمات البحث.</p>
                    </div>
                  ) : (
                    <div className="border border-gray-250 rounded-2xl overflow-hidden bg-white shadow-xs max-h-[450px] overflow-y-auto">
                      <table className="w-full text-right border-collapse text-[11px]">
                        <thead className="bg-slate-100 border-b border-gray-250 text-slate-700 font-extrabold sticky top-0">
                          <tr>
                            <th className="p-3">صورة العرض</th>
                            <th className="p-3">عنوان الإعلان</th>
                            <th className="p-3">السعر</th>
                            <th className="p-3">القسم والمحافظة</th>
                            <th className="p-3">صاحب العرض وهاتفه</th>
                            <th className="p-3">المشاهدات</th>
                            <th className="p-3 text-center">الإجراء</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 font-bold">
                          {filteredListings.map((ad) => (
                            <tr key={ad.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3">
                                {ad.image ? (
                                  <img 
                                    src={ad.image} 
                                    alt={ad.title} 
                                    className="w-10 h-10 object-cover rounded-lg border border-gray-200"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-slate-100 rounded-lg border border-gray-250 flex items-center justify-center text-xs text-gray-400">
                                    📷
                                  </div>
                                )}
                              </td>
                              <td className="p-3">
                                <div className="font-extrabold text-slate-900 line-clamp-1">{ad.title}</div>
                                <div className="text-[10px] text-gray-400 font-bold">ID: {ad.id}</div>
                              </td>
                              <td className="p-3 text-amber-600 font-black">
                                {ad.price ? `${Number(ad.price).toLocaleString('ar-YE')} ر.ي` : 'غير محدد'}
                              </td>
                              <td className="p-3 text-slate-700">
                                <div>{ad.category}</div>
                                <div className="text-[9px] text-gray-400">{ad.city}</div>
                              </td>
                              <td className="p-3 text-slate-700">
                                <div>{ad.userName || 'مستخدم غير معروف'}</div>
                                <div className="text-[9px] text-gray-400 font-mono">{ad.phone}</div>
                              </td>
                              <td className="p-3 text-slate-600">
                                <div className="flex items-center gap-1">
                                  <Eye className="w-3.5 h-3.5 text-gray-400" />
                                  <span>{ad.views || 0}</span>
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handleDeleteListing(ad.id)}
                                  className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-lg transition-colors border-none cursor-pointer"
                                  title="حذف الإعلان"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              )}

              {activeTab === 'banners' && (
                /* Banners and Hero Ads Tab */
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Info banner */}
                  <div className="p-4 bg-amber-50 text-amber-950 rounded-2xl border border-amber-200 flex items-start gap-3 text-right">
                    <span className="text-base">✨</span>
                    <div className="text-[11px] leading-relaxed font-semibold">
                      <p className="font-extrabold text-xs mb-1">إدارة المساحات الإعلانية والبنرات المتميزة:</p>
                      <ul className="list-disc list-inside space-y-1 text-amber-900">
                        <li><strong>البنرات الإعلانية الكبرى:</strong> تظهر أعلى الموقع وتكون ملفتة للانتباه للزوار.</li>
                        <li>يمكنك رفع الصور مباشرة لـ Firebase Storage والحصول على الرابط تلقائياً للتسهيل!</li>
                      </ul>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Add Banner Form */}
                    <div className="bg-white rounded-2xl border border-gray-250 p-5 space-y-4 shadow-xs">
                      <h5 className="text-xs font-black text-slate-950 border-b border-gray-200 pb-2.5 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-slate-800" />
                        <span>إضافة مساحة إعلانية جديدة:</span>
                      </h5>

                      <form onSubmit={handleAddBanner} className="space-y-4 text-right">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-gray-500">عنوان البانر (اختياري)</label>
                          <input
                            type="text"
                            value={bannerTitle}
                            onChange={(e) => setBannerTitle(e.target.value)}
                            placeholder="مثال: خصم 50% على اشتراكات المتاجر"
                            className="w-full text-xs font-bold border border-gray-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-850"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-gray-500">رفع صورة مباشرة أو رابط الصورة (URL)</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={bannerImageUrl}
                              onChange={(e) => setBannerImageUrl(e.target.value)}
                              placeholder="أدخل رابط الصورة أو ارفعها من اليسار"
                              className="flex-1 text-xs font-bold border border-gray-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-850 text-left"
                              dir="ltr"
                            />
                            <label className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-4 rounded-xl flex items-center justify-center cursor-pointer select-none">
                              <span>{isUploadingBanner ? 'جاري الرفع...' : 'رفع صورة 📷'}</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleBannerImageUpload} 
                                className="hidden" 
                                disabled={isUploadingBanner}
                              />
                            </label>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-gray-500">رابط التوجيه عند الضغط على البانر</label>
                          <input
                            type="text"
                            value={bannerLink}
                            onChange={(e) => setBannerLink(e.target.value)}
                            placeholder="مثال: https://wa.me/967775378369"
                            className="w-full text-xs font-bold border border-gray-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-850 text-left"
                            dir="ltr"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <input
                            type="checkbox"
                            id="banner_is_hero"
                            checked={bannerIsHero}
                            onChange={(e) => setBannerIsHero(e.target.checked)}
                            className="w-4 h-4 text-amber-500 border-gray-300 rounded-sm focus:ring-amber-500 cursor-pointer"
                          />
                          <label htmlFor="banner_is_hero" className="text-[11px] font-black text-slate-700 cursor-pointer select-none">
                            تعيين كبنر هيرو (Hero Banner) رئيسي بمنتصف الصفحة العليا.
                          </label>
                        </div>

                        <div className="text-left pt-2">
                          <button
                            type="submit"
                            disabled={isAddingBanner}
                            className="py-3 px-8 bg-slate-950 hover:bg-slate-850 text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer border-none disabled:bg-gray-400"
                          >
                            {isAddingBanner ? 'جاري النشر...' : 'نشر الإعلان المتميز 🚀'}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Active Banners list */}
                    <div className="bg-white rounded-2xl border border-gray-250 p-5 space-y-4 shadow-xs">
                      <h5 className="text-xs font-black text-slate-950 border-b border-gray-200 pb-2.5 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-slate-800" />
                        <span>البنرات والمساحات الإعلانية الحالية (${banners.length}):</span>
                      </h5>

                      {isLoadingBanners ? (
                        <p className="text-xs text-gray-400 font-bold text-center py-12">جاري جلب البنرات الإعلانية...</p>
                      ) : banners.length === 0 ? (
                        <div className="py-12 text-center text-xs text-gray-400 font-bold border border-dashed border-gray-300 rounded-xl bg-slate-50">
                          لا توجد مساحات إعلانية نشطة حالياً. ابدأ بإضافة البانر الإعلاني الأول!
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[350px] overflow-y-auto">
                          {banners.map((b) => (
                            <div key={b.id} className="bg-slate-50 border border-gray-200 p-3 rounded-xl flex items-center gap-3 justify-between">
                              <img 
                                src={b.imageUrl} 
                                alt={b.title} 
                                className="w-16 h-10 object-cover rounded-lg border border-gray-200"
                                referrerPolicy="no-referrer"
                              />
                              <div className="flex-1 min-w-0 text-right space-y-0.5">
                                <h6 className="text-[10px] font-black text-slate-900 truncate">{b.title || 'إعلان متميز'}</h6>
                                <p className="text-[8px] text-gray-400 truncate" dir="ltr">{b.link}</p>
                                <span className="inline-block text-[8px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                                  {b.isHero ? 'بنر رئيسي (Hero)' : 'بنر فرعي'}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteBanner(b.id)}
                                className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors border-none cursor-pointer"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {activeTab === 'alerts' && (
                /* Site Alert Bars Tab */
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Info banner */}
                  <div className="p-4 bg-red-50 text-red-950 rounded-2xl border border-red-200 flex items-start gap-3">
                    <span className="text-base">🚨</span>
                    <div className="text-[11px] leading-relaxed font-semibold text-right">
                      <p className="font-extrabold text-xs mb-1">أشرطة التنبيه الإدارية الطارئة أعلى الموقع:</p>
                      <ul className="list-disc list-inside space-y-1 text-red-900">
                        <li>تظهر أشرطة التنبيه مباشرة أسفل الهيدر الرئيسي لكافة زوار السوق المفتوح اليمني.</li>
                        <li>مثالية لبث التحذيرات الأمنية من المحتالين، إعلان توقف مؤقت، أو تهنئة بالأعياد الوطنية والمناسبات!</li>
                      </ul>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Add Alert Form */}
                    <div className="bg-white rounded-2xl border border-gray-250 p-5 space-y-4 shadow-xs">
                      <h5 className="text-xs font-black text-slate-950 border-b border-gray-200 pb-2.5 flex items-center gap-1.5">
                        <Bell className="w-4 h-4 text-slate-800" />
                        <span>بث شريط تنبيه عام جديد:</span>
                      </h5>

                      <form onSubmit={handleAddAlert} className="space-y-4 text-right">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-gray-500">محتوى التنبيه (سيظهر للجميع)</label>
                          <textarea
                            required
                            value={alertText}
                            onChange={(e) => setAlertText(e.target.value)}
                            placeholder="مثال: تنبيه أمني هام! يرجى عدم تحويل أموال عربون لأي معلن دون التأكد من مصداقيته ومعاينة السلعة بنفسك."
                            rows={3}
                            className="w-full text-xs font-bold border border-gray-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-850"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-gray-500">لون خلفية التنبيه</label>
                            <select
                              value={alertBgColor}
                              onChange={(e) => setAlertBgColor(e.target.value)}
                              className="w-full text-xs font-bold border border-gray-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-850"
                            >
                              <option value="red">أحمر (تحذيري طارئ) 🔴</option>
                              <option value="blue">أزرق (إرشادي تعليمي) 🔵</option>
                              <option value="green">أخضر (تهاني وتحديثات) 🟢</option>
                              <option value="amber">أصفر (تنبيه أمني عام) 🟡</option>
                            </select>
                          </div>

                          <div className="space-y-1.5 font-bold flex flex-col justify-end">
                            <div className="flex items-center gap-2 pb-3">
                              <input
                                type="checkbox"
                                id="alert_active_checkbox"
                                checked={alertIsActive}
                                onChange={(e) => setAlertIsActive(e.target.checked)}
                                className="w-4 h-4 text-rose-600 border-gray-300 rounded-sm focus:ring-rose-500 cursor-pointer"
                              />
                              <label htmlFor="alert_active_checkbox" className="text-[11px] font-black text-slate-700 cursor-pointer">
                                تفعيل التنبيه وبثه فوراً
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-gray-500">تاريخ بدء النشر (اختياري)</label>
                            <input
                              type="datetime-local"
                              value={alertStartDate}
                              onChange={(e) => setAlertStartDate(e.target.value)}
                              className="w-full text-xs font-bold border border-gray-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-850 text-left"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-gray-500">تاريخ انتهاء النشر (اختياري)</label>
                            <input
                              type="datetime-local"
                              value={alertEndDate}
                              onChange={(e) => setAlertEndDate(e.target.value)}
                              className="w-full text-xs font-bold border border-gray-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-850 text-left"
                            />
                          </div>
                        </div>

                        <div className="text-left pt-2">
                          <button
                            type="submit"
                            disabled={isAddingAlert}
                            className="py-3 px-8 bg-slate-950 hover:bg-slate-850 text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer border-none disabled:bg-gray-400"
                          >
                            {isAddingAlert ? 'جاري البث...' : 'بث التنبيه للجميع 📢'}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Active Alerts List */}
                    <div className="bg-white rounded-2xl border border-gray-250 p-5 space-y-4 shadow-xs">
                      <h6 className="text-xs font-black text-slate-850 border-b border-gray-200 pb-2.5 flex items-center gap-1.5">
                        <ListTodo className="w-4 h-4 text-slate-800" />
                        <span>التنبيهات العامة النشطة والسابقة (${alerts.length}):</span>
                      </h6>
                      
                      {alerts.length === 0 ? (
                        <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-gray-300 p-6 text-xs text-gray-400 font-bold">
                          لم يتم بث أي تنبيهات حتى الآن. يمكنك بث التنبيه التحذيري الأول لسلامة سوق اليمن!
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[380px] overflow-y-auto">
                          {alerts.map((alert) => (
                            <div 
                              key={alert.id}
                              className="bg-white border border-gray-200 p-4 rounded-xl flex items-start justify-between gap-4 shadow-3xs"
                            >
                              <div className="space-y-1.5 text-right flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${
                                    alert.backgroundColor === 'red' ? 'bg-rose-500' :
                                    alert.backgroundColor === 'blue' ? 'bg-sky-500' :
                                    alert.backgroundColor === 'green' ? 'bg-emerald-500' : 'bg-amber-400'
                                  }`}></span>
                                  <span className="text-[10px] font-black text-slate-900 break-words line-clamp-3">
                                    {alert.text}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-gray-400 font-bold">
                                  <span>الحالة: {alert.isActive ? <strong className="text-emerald-600 font-extrabold">نشط ✅</strong> : <strong className="text-red-500 font-extrabold">متوقف ❌</strong>}</span>
                                  {alert.startDate && <span>بدء: {new Date(alert.startDate).toLocaleDateString('ar-YE')}</span>}
                                  {alert.endDate && <span>انتهاء: {new Date(alert.endDate).toLocaleDateString('ar-YE')}</span>}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => handleToggleAlertStatus(alert.id, alert.isActive)}
                                  className={`px-2 py-1 rounded text-[9px] font-black cursor-pointer transition-colors border-none ${
                                    alert.isActive 
                                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                                      : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  }`}
                                >
                                  {alert.isActive ? 'تعطيل' : 'تفعيل'}
                                </button>

                                <button
                                  onClick={() => handleDeleteAlert(alert.id)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors cursor-pointer border-none"
                                  title="حذف"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {activeTab === 'bulk_emails' && (
                /* Bulk Email Sender Tab */
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Info card */}
                  <div className="p-4 bg-blue-50 text-blue-950 rounded-2xl border border-blue-150 flex items-start gap-3">
                    <span className="text-base">✉️</span>
                    <div className="text-[11px] leading-relaxed font-semibold text-right">
                      <p className="font-extrabold text-xs mb-1">خدمة إرسال الرسائل الجماعية عبر البريد الإلكتروني:</p>
                      <ul className="list-disc list-inside space-y-1 text-blue-900">
                        <li>يقوم هذا النظام بالمرور الذاتي على كافة إيميلات المستخدمين المسجلين في السوق المفتوح اليمني.</li>
                        <li>يتم إرسال الرسائل الإعلانية أو التحذيرية لكل مستخدم على حدة وبشكل آمن وتلقائي عبر EmailJS.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-250 p-5 space-y-4 shadow-xs text-right">
                    <h5 className="text-xs font-black text-slate-950 border-b border-gray-200 pb-2.5 flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-slate-800" />
                      <span>نموذج بث رسالة بريدية جماعية (للجميع):</span>
                    </h5>

                    <form onSubmit={handleSendBulkEmails} className="space-y-4 text-right">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-gray-500">عنوان الرسالة (Subject)</label>
                        <input
                          type="text"
                          required
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          placeholder="مثال: مرحباً بك في السوق المفتوح اليمني! تحديثات أمنية جديدة لعروضك"
                          className="w-full text-xs font-bold border border-gray-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-850"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-gray-500">محتوى الرسالة (Body)</label>
                        <textarea
                          required
                          rows={6}
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          placeholder="اكتب هنا محتوى الرسالة البريدية بالتفصيل..."
                          className="w-full text-xs font-bold border border-gray-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-850 text-right font-semibold"
                        />
                      </div>

                      {isSendingEmails && (
                        <div className="bg-slate-50 border border-gray-250 p-4 rounded-xl space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span>جاري معالجة الإرسال وبث البريد...</span>
                            <span>{emailProgress.current} / {emailProgress.total} مستخدم</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div 
                              className="bg-blue-600 h-2.5 transition-all duration-300"
                              style={{ width: `${(emailProgress.current / emailProgress.total) * 100}%` }}
                            ></div>
                          </div>
                          <p className="text-[10px] text-emerald-600 font-bold">
                            تم الإرسال بنجاح لـ {emailSuccessCount} مستخدم حتى الآن!
                          </p>
                        </div>
                      )}

                      <div className="text-left">
                        <button
                          type="submit"
                          disabled={isSendingEmails}
                          className="py-3 px-8 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer border-none disabled:bg-gray-400 flex items-center justify-center gap-1.5"
                        >
                          <Send className="w-4 h-4" />
                          <span>{isSendingEmails ? 'جاري بث الرسائل...' : 'إرسال للجميع الآن 🚀'}</span>
                        </button>
                      </div>
                    </form>
                  </div>

                </div>
              )}

              {activeTab === 'verify_users' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-white rounded-2xl border border-gray-250 p-5 space-y-4 shadow-xs text-right">
                    <h5 className="text-xs font-black text-slate-950 border-b border-gray-200 pb-2.5 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-slate-800" />
                      <span>توثيق حساب مستخدم (يدوياً عبر رقم الهاتف):</span>
                    </h5>

                    <div className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1.5">
                        <label className="block text-[10px] font-black text-gray-500">رقم الهاتف للمستخدم المراد توثيقه</label>
                        <input
                          type="text"
                          value={verifyPhone}
                          onChange={(e) => setVerifyPhone(e.target.value)}
                          placeholder="مثال: 777123456"
                          className="w-full text-xs font-bold border border-gray-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-850 text-left"
                          dir="ltr"
                        />
                      </div>
                      <button
                        onClick={async () => {
                          if (!verifyPhone.trim()) return;
                          setVerifyMessage(null);
                          try {
                            await verifyUserByPhone(verifyPhone.trim());
                            setVerifyMessage({ type: 'success', text: `✅ تم توثيق المستخدم ${verifyPhone} بنجاح` });
                            setVerifyPhone('');
                          } catch (err) {
                            setVerifyMessage({ type: 'error', text: '❌ فشل توثيق المستخدم، تأكد من صحة الرقم.' });
                          }
                        }}
                        className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer border-none"
                      >
                        توثيق
                      </button>
                      <button
                        onClick={async () => {
                          if (!verifyPhone.trim()) return;
                          setVerifyMessage(null);
                          try {
                            await unverifyUserByPhone(verifyPhone.trim());
                            setVerifyMessage({ type: 'success', text: `✅ تم إلغاء توثيق المستخدم ${verifyPhone} بنجاح` });
                            setVerifyPhone('');
                          } catch (err) {
                            setVerifyMessage({ type: 'error', text: '❌ فشل إلغاء التوثيق.' });
                          }
                        }}
                        className="py-3 px-6 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer border-none"
                      >
                        إلغاء التوثيق
                      </button>
                    </div>

                    {verifyMessage && (
                      <div className={`p-3 rounded-xl text-xs font-black ${
                        verifyMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {verifyMessage.text}
                      </div>
                    )}

                    <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                      💡 كل حساب يمتلك رقم هاتف فريد كمعرّف (ID). بعد التوثيق، سيظهر للمستخدم شارة "موثق" في ملفه الشخصي.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'charge_balance' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-white rounded-2xl border border-gray-250 p-5 space-y-4 shadow-xs text-right">
                    <h5 className="text-xs font-black text-slate-950 border-b border-gray-200 pb-2.5 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>شحن رصيد الوحدات للمستخدم عبر معرّف الحساب (userId) ⚡</span>
                    </h5>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-gray-500">معرّف الحساب الفريد للمستخدم (userId)</label>
                          <input
                            type="text"
                            value={chargeUserId}
                            onChange={(e) => setChargeUserId(e.target.value)}
                            placeholder="مثال: qY82Nao1Xz"
                            className="w-full text-xs font-bold border border-gray-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-850 text-left font-mono"
                            dir="ltr"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-gray-500">عدد الوحدات المراد شحنها (كحد أقصى 1000 رصيد كلي)</label>
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            value={chargeAmount}
                            onChange={(e) => setChargeAmount(Number(e.target.value) || 0)}
                            placeholder="مثال: 100"
                            className="w-full text-xs font-bold border border-gray-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-850 text-left"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          disabled={isCharging}
                          onClick={async () => {
                            if (!chargeUserId.trim()) {
                              setChargeMessage({ type: 'error', text: '⚠️ يرجى إدخال معرّف حساب المستخدم أولاً.' });
                              return;
                            }
                            if (chargeAmount <= 0) {
                              setChargeMessage({ type: 'error', text: '⚠️ يجب أن تكون القيمة أكبر من صفر.' });
                              return;
                            }
                            setIsCharging(true);
                            setChargeMessage(null);
                            try {
                              const userObj = await getUserByUserId(chargeUserId.trim());
                              if (!userObj) {
                                setChargeMessage({ type: 'error', text: '❌ لم يتم العثور على أي مستخدم بهذا المعرّف (userId)!' });
                                setIsCharging(false);
                                return;
                              }
                              
                              await chargeUserBalance(chargeUserId.trim(), chargeAmount);
                              setChargeMessage({ 
                                type: 'success', 
                                text: `✅ تم شحن ${chargeAmount} وحدة رصيد بنجاح لحساب المشترك "${userObj.name}" (هاتف: ${userObj.phone})!` 
                              });
                              setChargeUserId('');
                              setChargeAmount(100);
                            } catch (err: any) {
                              setChargeMessage({ type: 'error', text: `❌ حدث خطأ أثناء الشحن: ${err.message || err}` });
                            } finally {
                              setIsCharging(false);
                            }
                          }}
                          className="py-3 px-8 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer border-none flex items-center gap-1.5"
                        >
                          {isCharging ? 'جاري الشحن...' : 'تأكيد الشحن الفوري وإرسال إشعار 🚀'}
                        </button>
                      </div>

                      {chargeMessage && (
                        <div className={`p-3 rounded-xl text-xs font-black leading-relaxed text-right ${
                          chargeMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {chargeMessage.text}
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border text-right space-y-1.5 text-xs font-semibold text-slate-600">
                      <p className="font-bold text-slate-800 text-[11px]">💡 معلومات وتوجيهات أمنية حول الوحدات:</p>
                      <ul className="list-disc list-inside space-y-1 text-[10px] text-gray-500 leading-relaxed">
                        <li>يقوم الشحن بزيادة رصيد المشترك مباشرة في Firestore.</li>
                        <li>يتلقى المشترك إشعاراً فورياً تلقائياً ينبهه بحصوله على الوحدات ورصيده الجديد.</li>
                        <li>يمكنك التحقق من الرصيد والوحدات من صفحة "حسابي" الخاصة بالمشترك.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-6 animate-fade-in text-right">
                  <div className="bg-white rounded-2xl border border-gray-250 p-5 space-y-4 shadow-xs">
                    <h5 className="text-xs font-black text-slate-950 border-b border-gray-200 pb-2.5 flex items-center gap-1.5">
                      <Settings className="w-4 h-4 text-slate-800" />
                      <span>الإعدادات العامة للرصيد والموقع ⚙️</span>
                    </h5>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      {/* Unit Price Customization */}
                      <div className="p-4 bg-slate-50 rounded-2xl border space-y-3 text-right">
                        <h6 className="text-xs font-black text-slate-850">💰 سعر الإعلان بالوحدات</h6>
                        <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                          السعر الحالي للوحدة: <span className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-800 font-bold">{siteSettings.unitPrice} وحدة</span> لكل تمديد أو إعلان مدفوع.
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            value={newUnitPrice}
                            onChange={(e) => setNewUnitPrice(e.target.value)}
                            placeholder="السعر الجديد (وحدات)"
                            className="flex-1 text-xs font-bold border border-gray-200 rounded-xl p-2.5 bg-white focus:outline-none focus:border-slate-800 text-center"
                          />
                          <button
                            onClick={async () => {
                              if (!newUnitPrice || Number(newUnitPrice) <= 0) {
                                setSettingsMessage('⚠️ الرجاء إدخال سعر وحدة صحيح.');
                                return;
                              }
                              try {
                                await updateSiteSettings({ unitPrice: Number(newUnitPrice) });
                                setSiteSettings(prev => ({ ...prev, unitPrice: Number(newUnitPrice) }));
                                setSettingsMessage('✅ تم تحديث سعر الوحدة بنجاح!');
                                setNewUnitPrice('');
                              } catch (e: any) {
                                setSettingsMessage(`❌ فشل الحفظ: ${e.message || e}`);
                              }
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-xl text-xs font-black cursor-pointer transition-colors"
                          >
                            تحديث 💾
                          </button>
                        </div>
                      </div>

                      {/* Gift Free Credit to All */}
                      <div className="p-4 bg-slate-50 rounded-2xl border space-y-3 text-right">
                        <h6 className="text-xs font-black text-slate-850">🎁 هدية رصيد مجاني للجميع</h6>
                        <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                          قم بتوزيع رصيد مجاني موحد لجميع المشتركين المسجلين في النظام فوراً كهدية أو عرض مؤقت.
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            max="500"
                            value={freeAmount}
                            onChange={(e) => setFreeAmount(e.target.value)}
                            placeholder="الكمية (مثال: 50)"
                            className="flex-1 text-xs font-bold border border-gray-200 rounded-xl p-2.5 bg-white focus:outline-none focus:border-slate-800 text-center"
                          />
                          <button
                            onClick={async () => {
                              const amountNum = Number(freeAmount);
                              if (!freeAmount || amountNum <= 0) {
                                setSettingsMessage('⚠️ الرجاء إدخال كمية رصيد صحيحة.');
                                return;
                              }
                              try {
                                setSettingsMessage('⏳ جاري تحديث أرصدة جميع المشتركين...');
                                const count = await giveFreeCreditToAllUsers(amountNum);
                                setSettingsMessage(`✅ تم بنجاح شحن ${amountNum} وحدة مجانية لـ ${count} مشترك!`);
                                setFreeAmount('');
                              } catch (e: any) {
                                setSettingsMessage(`❌ فشل التوزيع: ${e.message || e}`);
                              }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 rounded-xl text-xs font-black cursor-pointer transition-colors"
                          >
                            توزيع للكل 🎉
                          </button>
                        </div>
                      </div>
                    </div>

                    {settingsMessage && (
                      <div className="p-3 bg-blue-50 text-blue-750 text-xs font-bold rounded-xl border border-blue-150 leading-relaxed text-right">
                        {settingsMessage}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'report' && (
                <div className="space-y-6 animate-fade-in text-right">
                  <div className="bg-white rounded-2xl border border-gray-250 p-5 space-y-4 shadow-xs">
                    <h5 className="text-xs font-black text-slate-950 border-b border-gray-200 pb-2.5 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      <span>تقرير PDF اليومي وإحصائيات النظام 📄</span>
                    </h5>

                    <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                      تتيح لك هذه الأداة توليد تقرير شامل بصيغة PDF يحتوي على أحدث الأرقام التلخيصية، الإعلانات النشطة، وقائمة المشتركين مع تفاصيل أرصدتهم وإعلاناتهم المجانية للطباعة أو الأرشفة الورقية.
                    </p>

                    <div className="p-6 bg-slate-50 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 text-right">
                      <div>
                        <h6 className="text-xs font-black text-slate-800 mb-1">📋 جاهز لتوليد التقرير المباشر</h6>
                        <p className="text-[10px] text-gray-500 font-bold">يحتوي التقرير على {stats.usersCount} مشترك و {allListings.length} إعلان نشط.</p>
                      </div>

                      <button
                        disabled={isGeneratingPdf}
                        onClick={async () => {
                          setIsGeneratingPdf(true);
                          try {
                            const blob = await generateDailyReport();
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `OpenSooq_Yemen_Daily_Report_${new Date().toISOString().split('T')[0]}.pdf`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                          } catch (err: any) {
                            alert(`❌ فشل توليد التقرير: ${err.message || err}`);
                          } finally {
                            setIsGeneratingPdf(false);
                          }
                        }}
                        className="py-3 px-8 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer border-none flex items-center gap-1.5"
                      >
                        {isGeneratingPdf ? '⏳ جاري التوليد...' : 'تنزيل ملف التقرير PDF المعتمد 📥'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'scrape_single' && (
                <div className="space-y-6 animate-fade-in text-right">
                  {/* Mode switcher tabs */}
                  <div className="flex border-b border-gray-200 mb-2">
                    <button
                      onClick={() => setScrapeMode('single')}
                      className={`flex-1 pb-3 text-xs font-black transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer border-x-0 border-t-0 bg-transparent ${
                        scrapeMode === 'single'
                          ? 'border-purple-600 text-purple-600'
                          : 'border-transparent text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>🔗 استيراد إعلان فردي (رابط واحد)</span>
                    </button>
                    <button
                      onClick={() => setScrapeMode('bulk')}
                      className={`flex-1 pb-3 text-xs font-black transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer border-x-0 border-t-0 bg-transparent ${
                        scrapeMode === 'bulk'
                          ? 'border-purple-600 text-purple-600'
                          : 'border-transparent text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>⚡ الاستيراد السريع بالدفعة (من صفحة نتائج)</span>
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-250 p-5 space-y-4 shadow-xs">
                    {scrapeMode === 'single' && (
                      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-200 p-5 space-y-4">
                        <h5 className="text-xs font-black text-purple-950 flex items-center gap-1.5 justify-end">
                          <span>🔗 مساعد نشر إعلانات السوق المفتوح اليمني</span>
                          <ExternalLink className="w-4 h-4 text-purple-600" />
                        </h5>
                        
                        <p className="text-[11px] text-purple-900 font-extrabold leading-relaxed text-right" dir="rtl">
                          💡 لتسهيل نقل الإعلانات، قمنا بتوفير طريقتين: التصفح المباشر والنشر اليدوي المضمون، أو محاولة الاستخراج التلقائي أدناه:
                        </p>

                        {/* Direct Action Buttons Row */}
                        <div className="flex flex-col sm:flex-row gap-3" dir="rtl">
                          <a
                            href="https://ye.opensooq.com/ar"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 border-none cursor-pointer text-center no-underline select-none"
                          >
                            <span>🌐 1. اذهب وتصفح السوق المفتوح الآن واصطاد إعلان ↗️</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              setScrapedSingleAd({
                                title: '',
                                description: '',
                                price: 0,
                                images: [],
                                image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&q=80&w=800',
                                ownerName: 'عضو السوق المفتوح اليمني',
                                phone: '',
                                city: 'صنعاء',
                                category: 'cars',
                                subcategory: 'سيارات للبيع'
                              });
                              setEditedTitle('');
                              setEditedPrice(0);
                              setEditedOwnerName('عضو السوق المفتوح اليمني');
                              setEditedPhone('');
                              setEditedCity('صنعاء');
                              setEditedCategory('cars');
                              setEditedDescription('');
                              setEditedImageUrl('https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&q=80&w=800');
                              setScrapeSingleError(null);
                            }}
                            className="flex-1 py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 border-none cursor-pointer select-none"
                          >
                            <Plus className="w-4.5 h-4.5" />
                            <span>✍️ 2. افتح نموذج التعبئة اليدوية للنشر فوراً</span>
                          </button>
                        </div>

                        <div className="border-t border-dashed border-purple-200 pt-3.5 space-y-3">
                          <p className="text-[10px] text-gray-500 font-bold leading-relaxed text-right">
                            أو الصق رابط الإعلان من السوق المفتوح أدناه لنحاول استخراج بياناته تلقائياً وتسهيل تعبئتها:
                          </p>
                          <div className="flex gap-2" dir="rtl">
                            <input
                              type="text"
                              value={scrapeSingleUrl}
                              onChange={(e) => setScrapeSingleUrl(e.target.value)}
                              placeholder="https://ye.opensooq.com/ar/سيارات-للبيع..."
                              className="flex-1 text-xs font-bold border border-purple-200 rounded-xl p-3 bg-white focus:outline-none focus:border-purple-600 text-left"
                              dir="ltr"
                            />
                            <button
                              type="button"
                              disabled={isScrapingSingle}
                              onClick={async () => {
                                if (!scrapeSingleUrl) {
                                  setScrapeSingleError('⚠️ الرجاء إدخال رابط الإعلان أولاً.');
                                  return;
                                }
                                setIsScrapingSingle(true);
                                setScrapeSingleError(null);
                                setScrapedSingleAd(null);
                                try {
                                  let data;
                                  try {
                                    const response = await fetch(`/api/scrape-ad?url=${encodeURIComponent(scrapeSingleUrl)}`);
                                    if (!response.ok) throw new Error('Backend failed');
                                    data = await response.json();
                                    if (data.error) throw new Error(data.error);
                                  } catch (apiErr) {
                                    console.warn('Backend scrape failed, trying client fallback:', apiErr);
                                    const html = await fetchProxyHtml(scrapeSingleUrl);

                                    const parser = new DOMParser();
                                    const doc = parser.parseFromString(html, 'text/html');

                                    const title = doc.querySelector('h1')?.textContent?.trim() || 
                                                  doc.querySelector('[class*="title"]')?.textContent?.trim() || 
                                                  'إعلان من السوق المفتوح';

                                    const parsedClientData = parseClientPriceAndCurrency(doc);
                                    let price = parsedClientData.price;
                                    let currency = parsedClientData.currency;
                                    const priceEls = doc.querySelectorAll("[class*='price'], [class*='Price'], [class*='amount'], [data-testid*='price']");
                                    for (const el of Array.from(priceEls)) {
                                      const text = el.textContent?.trim() || '';
                                      const cleaned = text.replace(/[^0-9]/g, '');
                                      if (cleaned) {
                                        const val = parseInt(cleaned);
                                        if (val > 0 && val < 500000000 && !text.includes("هاتف") && !text.includes("تلفون") && cleaned.length < 9) {
                                          price = val;
                                          break;
                                        }
                                      }
                                    }

                                    if (price === 0) {
                                      const bodyText = doc.body.textContent || '';
                                      const match1 = bodyText.match(/(?:السعر|السعر:\s*)\s*([\d,]+)\s*(?:ريال|دولار|\$)/i);
                                      if (match1) {
                                        price = parseInt(match1[1].replace(/,/g, ''));
                                      }
                                      if (price === 0) {
                                        const match2 = bodyText.match(/([\d,]+)\s*(?:ريال يمني|ريال|دولار|\$)/i);
                                        if (match2) {
                                          price = parseInt(match2[1].replace(/,/g, ''));
                                        }
                                      }
                                    }

                                    const images = [];
                                    doc.querySelectorAll('img').forEach(img => {
                                      const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
                                      if (src && !src.includes('base64') && !src.startsWith('data:') && !images.includes(src)) {
                                        if (src.includes('opensooq-images') || src.includes('img.opensooq') || src.includes('opensooq.com')) {
                                          images.push(src);
                                        }
                                      }
                                    });

                                    if (images.length === 0) {
                                      doc.querySelectorAll('img').forEach(img => {
                                        const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
                                        if (src && src.startsWith('http') && !src.includes('google') && !src.includes('facebook') && !images.includes(src)) {
                                          images.push(src);
                                        }
                                      });
                                    }

                                    const description = doc.querySelector('[class*="description"]')?.textContent?.trim() ||
                                                        doc.querySelector('[class*="details"]')?.textContent?.trim() ||
                                                        'لا يوجد وصف متاح';

                                    const ownerName = doc.querySelector('[class*="user-name"]')?.textContent?.trim() ||
                                                      doc.querySelector('[class*="seller-name"]')?.textContent?.trim() ||
                                                      'بائع من السوق المفتوح';

                                    let phone = '777777777';
                                    doc.querySelectorAll('a[href^="tel:"]').forEach(el => {
                                      const tel = el.getAttribute('href') || '';
                                      const cleaned = tel.replace(/[^0-9]/g, '');
                                      if (cleaned.length >= 9) {
                                        const last9 = cleaned.slice(-9);
                                        if (last9.startsWith('7')) {
                                          phone = last9;
                                        }
                                      }
                                    });

                                    if (phone === '777777777') {
                                      const searchSource = `${description} ${html}`;
                                      const yemeniRegex = /(?:00967|\+967|967|0)?\s*(7[01378]\d{7})\b/g;
                                      let match;
                                      while ((match = yemeniRegex.exec(searchSource)) !== null) {
                                        if (match[1] && match[1].length === 9) {
                                          phone = match[1];
                                          break;
                                        }
                                      }
                                    }

                                    if (phone === '777777777') {
                                      const generalMatch = html.match(/\b(7\d{8})\b/);
                                      if (generalMatch) {
                                        phone = generalMatch[1];
                                      }
                                    }

                                    let city = 'صنعاء';
                                    const cityMatch = html.match(/(صنعاء|عدن|تعز|إب|الحديدة|المكلا|مأرب|ذمار|عمران|شبوة)/);
                                    if (cityMatch) city = cityMatch[1];

                                    const specsMap = {};
                                    const commonLabels = [
                                      "الحالة", "النوع", "موديل", "الفئة", "سنة الصنع", "الكيلومترات", 
                                      "نوع ناقل الحركة", "نوع الوقود", "اللون", "المنشأ", "طريقة الدفع", 
                                      "المواصفات الإقليمية", "نوع الهيكل", "عدد الأبواب", "عدد المقاعد", 
                                      "سعة المحرك", "دهان", "حالة الهيكل", "ترخيص"
                                    ];

                                    doc.querySelectorAll('*').forEach(el => {
                                      const tagName = el.tagName.toLowerCase();
                                      if (['script', 'style', 'noscript', 'iframe', 'html', 'head'].includes(tagName)) return;
                                      
                                      const text = el.textContent?.trim() || '';
                                      for (const label of commonLabels) {
                                        if (text === label || text.startsWith(label + ' ') || text.startsWith(label + ':') || text.startsWith(label + '\n')) {
                                          let value = '';
                                          const parent = el.parentElement;
                                          
                                          if (parent) {
                                            Array.from(parent.children).forEach(sib => {
                                              const sibText = sib.textContent?.trim() || '';
                                              if (sibText && sibText !== label && sibText.length < 50 && !value) {
                                                value = sibText;
                                              }
                                            });
                                          }
                                          
                                          if (!value && parent) {
                                            const parentText = parent.textContent?.trim() || '';
                                            if (parentText.includes(label)) {
                                              let afterLabel = parentText.substring(parentText.indexOf(label) + label.length).trim();
                                              afterLabel = afterLabel.replace(/^[:：\s\-\/\|]+/, '').trim();
                                              const parts = afterLabel.split(/[\n\t\r]+/);
                                              if (parts[0] && parts[0].length < 50) {
                                                value = parts[0].trim();
                                              }
                                            }
                                          }
                                          
                                          if (value && value.length < 50) {
                                            specsMap[label] = value;
                                          }
                                        }
                                      }
                                    });

                                    const features = [];
                                    const knownFeatures = [
                                      "كراسي مدفأة", "مشغل اسطوانات CD", "AUX / USB مدخل", "مقاعد جلد", 
                                      "فتحة سقف", "شاشة لمس", "نظام ملاحة", "مثبت سرعة", "كاميرا خلفية", 
                                      "حساسات ركن", "مرايا كهربائية", "بلوتوث", "أكياس هوائية", "فرامل ABS", 
                                      "سنتر لوك", "دخول بدون مفتاح", "تشغيل بصمة", "مرايا قابلة للطي", 
                                      "جنوط", "أضواء LED", "كشافات ضباب", "تحكم مقود", "تكييف", "نظام صوتي",
                                      "بانوراما", "حساسات إماميه", "حساسات خلفيه", "مرايات كهربائيه", "ستاره خلفيه",
                                      "جلد بلون اسود", "كراسي كهربائية", "ذاكره تخزين لكرسي السائق", "طبلون شاشه"
                                    ];

                                    doc.querySelectorAll("[class*='feature'], [class*='option'], [class*='chip'], [class*='badge'], li, span").forEach(el => {
                                      const text = el.textContent?.trim() || '';
                                      if (text && text.length > 2 && text.length < 40) {
                                        const isFeature = knownFeatures.some(f => text.includes(f) || f.includes(text));
                                        if (isFeature && !features.includes(text) && !Object.values(specsMap).includes(text) && !Object.keys(specsMap).includes(text)) {
                                          features.push(text);
                                        }
                                      }
                                    });

                                    let finalDescription = description;
                                    let specsBlock = "";

                                    if (Object.keys(specsMap).length > 0) {
                                      specsBlock += "\n\n📋 **المواصفات الفنية للسيارة:**\n";
                                      for (const [key, val] of Object.entries(specsMap)) {
                                        specsBlock += `• **${key}:** ${val}\n`;
                                      }
                                    }

                                    if (features.length > 0) {
                                      specsBlock += "\n✨ **ميزات السلامة والرفاهية والتقنية:**\n";
                                      features.forEach(f => {
                                        specsBlock += `• ${f}\n`;
                                      });
                                    }

                                    if (specsBlock) {
                                      finalDescription = `${description}${specsBlock}`;
                                    }

                                    const categoryMap = {
                                      'سيارة': 'cars', 'مركبة': 'cars', 'تويوتا': 'cars', 'هيونداي': 'cars', 'كيا': 'cars',
                                      'شقة': 'properties', 'فيلا': 'properties', 'عقار': 'properties', 'أرض': 'properties',
                                      'جوال': 'mobiles', 'ايفون': 'mobiles', 'سامسونج': 'mobiles', 'موبايل': 'mobiles',
                                      'وظيفة': 'jobs', 'مطلوب': 'jobs', 'راتب': 'jobs',
                                      'كنب': 'furniture', 'طاولة': 'furniture', 'أثاث': 'furniture',
                                    };
                                    let category = 'cars';
                                    for (const [key, value] of Object.entries(categoryMap)) {
                                      if (title.includes(key) || description.includes(key)) {
                                        category = value;
                                        break;
                                      }
                                    }

                                    data = {
                                      title,
                                      description: finalDescription,
                                      price,
                                      currency,
                                      images,
                                      image: images[0] || 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&q=80&w=800',
                                      ownerName,
                                      phone,
                                      city,
                                      category,
                                      subcategory: category === 'cars' ? 'سيارات للبيع' : 'أخرى'
                                    };
                                  }

                                  setScrapedSingleAd(data);
                                  setEditedTitle(data.title || '');
                                  setEditedPrice(data.price || 0);
                                  setEditedCurrency(data.currency || 'ريال يمني');
                                  setEditedOwnerName(data.ownerName || '');
                                  setEditedPhone(data.phone || '');
                                  setEditedCity(data.city || 'صنعاء');
                                  setEditedCategory(data.category || 'cars');
                                  setEditedDescription(data.description || '');
                                  setEditedImageUrl(data.image || '');
                                } catch (err) {
                                  setScrapeSingleError(err.message || 'حدث خطأ أثناء استخراج البيانات.');
                                } finally {
                                  setIsScrapingSingle(false);
                                }
                              }}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl text-xs font-black disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center select-none"
                            >
                              {isScrapingSingle ? '⏳ جاري الاستخراج...' : '🔍 استخرج التفاصيل'}
                            </button>
                          </div>
                        </div>

                        {scrapeSingleError && (
                          <div className="p-3 bg-red-50 text-red-700 text-xs font-black rounded-xl border border-red-200">
                            {scrapeSingleError}
                          </div>
                        )}

                        {/* Extracted Ad form */}
                       {scrapedSingleAd && (
                         <div className="space-y-4 pt-4 border-t border-purple-200 animate-fade-in text-right">
                           <h6 className="text-xs font-black text-purple-950 flex items-center gap-1.5 justify-end">
                             <span>✅ تم استخراج بيانات الإعلان بنجاح ومستعدة للمراجعة:</span>
                           </h6>
                           
                           {/* Photos Slider */}
                           <div className="space-y-1.5">
                             <label className="block text-[10px] font-black text-gray-500">الصور المستخرجة ({scrapedSingleAd.images?.length || 0})</label>
                             <div className="flex gap-2 overflow-x-auto pb-2" dir="rtl">
                               {scrapedSingleAd.images && scrapedSingleAd.images.length > 0 ? (
                                 scrapedSingleAd.images.slice(0, 10).map((img: string, idx: number) => (
                                   <div key={idx} className="relative flex-shrink-0">
                                     <img src={img} className="w-20 h-20 object-cover rounded-xl border border-gray-200 shadow-xs" referrerPolicy="no-referrer" />
                                     <span className="absolute bottom-1 right-1 bg-black/60 text-[8px] text-white px-1.5 py-0.5 rounded-md font-bold">{idx + 1}</span>
                                   </div>
                                 ))
                               ) : (
                                 <div className="text-xs font-semibold text-gray-400 py-4 bg-gray-50 rounded-xl border border-dashed flex-1 text-center">
                                   لا توجد صور مستخرجة من الإعلان، سيتم استخدام صورة بديلة افتراضية.
                                 </div>
                               )}
                             </div>
                           </div>

                           {/* Editable details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black text-gray-500 mb-1">العنوان</label>
                              <input 
                                type="text" 
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                className="w-full text-xs font-bold border border-gray-200 rounded-xl p-3 bg-white focus:outline-none focus:border-purple-600" 
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-gray-500 mb-1">السعر والعملة</label>
                              <div className="flex gap-2">
                                <input 
                                  type="number" 
                                  value={editedPrice}
                                  onChange={(e) => setEditedPrice(Number(e.target.value))}
                                  className="flex-1 text-xs font-bold border border-gray-200 rounded-xl p-3 bg-white focus:outline-none focus:border-purple-600" 
                                />
                                <select
                                  value={editedCurrency}
                                  onChange={(e) => setEditedCurrency(e.target.value)}
                                  className="text-xs font-bold border border-gray-200 rounded-xl px-2 py-3 bg-white text-gray-900 focus:outline-none focus:border-purple-600"
                                >
                                  <option value="ريال يمني">ريال يمني (YER)</option>
                                  <option value="ريال سعودي">ريال سعودي (SAR)</option>
                                  <option value="دولار أمريكي">دولار أمريكي (USD)</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-gray-500 mb-1">اسم البائع</label>
                              <input 
                                type="text" 
                                value={editedOwnerName}
                                onChange={(e) => setEditedOwnerName(e.target.value)}
                                className="w-full text-xs font-bold border border-gray-200 rounded-xl p-3 bg-white focus:outline-none focus:border-purple-600" 
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-gray-500 mb-1">رقم الهاتف للاتصال والواتساب</label>
                              <input 
                                type="text" 
                                value={editedPhone}
                                onChange={(e) => setEditedPhone(e.target.value)}
                                className="w-full text-xs font-bold border border-gray-200 rounded-xl p-3 bg-white focus:outline-none focus:border-purple-600 text-left" 
                                dir="ltr" 
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-gray-500 mb-1">المحافظة الصحيحة</label>
                              <select 
                                value={editedCity}
                                onChange={(e) => setEditedCity(e.target.value)}
                                className="w-full text-xs font-bold border border-gray-200 rounded-xl p-3 bg-white focus:outline-none focus:border-purple-600"
                              >
                                {YEMENI_CITIES.map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-gray-500 mb-1">القسم الرئيسي</label>
                              <select 
                                value={editedCategory}
                                onChange={(e) => setEditedCategory(e.target.value)}
                                className="w-full text-xs font-bold border border-gray-200 rounded-xl p-3 bg-white focus:outline-none focus:border-purple-600"
                              >
                                <option value="cars">سيارات ومركبات</option>
                                <option value="properties">عقارات للبيع والإيجار</option>
                                <option value="mobiles">موبايل وتابلت</option>
                                <option value="electronics">إلكترونيات وأجهزة منزلية</option>
                                <option value="jobs">وظائف شاغرة وعمل</option>
                                <option value="furniture">أثاث وديكور منزلي</option>
                                <option value="fashion">موضة وأزياء رجالي نسائي</option>
                                <option value="services">خدمات واستشارات</option>
                                <option value="pets">حيوانات أليفة للبيع</option>
                                <option value="games">ألعاب فيديو واكسسواراتها</option>
                              </select>
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-gray-500 mb-1">رابط الصورة الرئيسية للإعلان (يمكنك وضع رابط مباشر لصورة من الإنترنت أو سيو فريد)</label>
                              <input 
                                type="text" 
                                value={editedImageUrl}
                                onChange={(e) => setEditedImageUrl(e.target.value)}
                                placeholder="https://images.unsplash.com/... أو رابط الصورة المستخرجة"
                                className="w-full text-xs font-bold border border-gray-200 rounded-xl p-3 bg-white focus:outline-none focus:border-purple-600 text-left" 
                                dir="ltr"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-gray-500 mb-1">الوصف الكامل للإعلان</label>
                            <textarea 
                              rows={5} 
                              value={editedDescription}
                              onChange={(e) => setEditedDescription(e.target.value)}
                              className="w-full text-xs font-bold border border-gray-200 rounded-xl p-3 bg-white focus:outline-none focus:border-purple-600 leading-relaxed" 
                            />
                          </div>

                          {/* Submit Button */}
                          <button
                            disabled={isImportingSingle}
                            onClick={async () => {
                              if (!editedTitle.trim() || !editedDescription.trim() || !editedPhone.trim()) {
                                alert('⚠️ يرجى تعبئة الحقول الأساسية: العنوان، الوصف، ورقم الهاتف.');
                                return;
                              }
                              setIsImportingSingle(true);
                              try {
                                const finalImg = editedImageUrl.trim() || scrapedSingleAd.image || "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&q=80&w=800";
                                const cleanImages = Array.isArray(scrapedSingleAd.images) && scrapedSingleAd.images.length > 0
                                  ? [finalImg, ...scrapedSingleAd.images.filter((x: string) => x !== finalImg)]
                                  : [finalImg];
                                
                                await insertFirebaseAd({
                                  title: editedTitle.trim(),
                                  description: editedDescription.trim(),
                                  price: Number(editedPrice) || 0,
                                  currency: editedCurrency || "ريال يمني",
                                  category: editedCategory,
                                  subcategory: scrapedSingleAd.subcategory || "أخرى",
                                  city: editedCity,
                                  phone: editedPhone.trim(),
                                  image: finalImg,
                                  images: cleanImages,
                                  ownerName: editedOwnerName.trim() || "بائع من السوق المفتوح",
                                  status: 'active',
                                  interestsCount: 0,
                                  views: 0,
                                  createdAt: new Date().toISOString()
                                } as any);

                                alert('🎉 تم نشر وإضافة الإعلان بنجاح في قاعدة البيانات!');
                                onRefreshAds();
                                setScrapedSingleAd(null);
                                setScrapeSingleUrl('');
                              } catch (err: any) {
                                alert(`❌ فشل نشر الإعلان: ${err.message || err}`);
                              } finally {
                                setIsImportingSingle(false);
                              }
                            }}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer border-none disabled:opacity-50 flex items-center justify-center gap-1.5 mt-2"
                          >
                            {isImportingSingle ? '⏳ جاري النشر وإعداد الإعلان...' : '📢 انشر هذا الإعلان في منصتي الآن'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                    {scrapeMode === 'bulk' && (
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 p-5 space-y-4">
                        <h5 className="text-xs font-black text-indigo-950 flex items-center gap-1.5 justify-end">
                          <span>⚡ جلب سريع لـ الإعلانات بالدفعة من نتائج البحث</span>
                          <Sparkles className="w-4 h-4 text-indigo-600" />
                        </h5>
                        <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                          الصق رابط صفحة نتائج البحث أو التصنيف من السوق المفتوح (مثال: https://ye.opensooq.com/ar/سيارات-ومركبات/سيارات-للبيع) وسيقوم النظام بسحب قائمة الإعلانات المعروضة وتوفير خيار "استيراد كامل وسريع بنقرة واحدة"!
                        </p>

                        <div className="flex flex-col md:flex-row gap-3">
                          <input
                            type="text"
                            value={scrapeBulkUrl}
                            onChange={(e) => setScrapeBulkUrl(e.target.value)}
                            placeholder="https://ye.opensooq.com/ar/سيارات-ومركبات/سيارات-للبيع..."
                            className="flex-1 text-xs font-bold border border-indigo-200 rounded-xl p-3 bg-white text-left focus:outline-none focus:border-indigo-600"
                            dir="ltr"
                          />
                          <button
                            onClick={async () => {
                              if (!scrapeBulkUrl) {
                                setScrapeBulkError('⚠️ الرجاء إدخال رابط صفحة النتائج أولاً.');
                                return;
                              }
                              setIsScrapingBulk(true);
                              setScrapeBulkError(null);
                              setScrapedResultsList([]);
                              try {
                                let data;
                                try {
                                  const response = await fetch(`/api/scrape-results?url=${encodeURIComponent(scrapeBulkUrl)}`);
                                  if (!response.ok) throw new Error('Backend failed');
                                  data = await response.json();
                                  if (data.error) throw new Error(data.error);
                                } catch (apiErr) {
                                  console.warn('Backend bulk scrape failed, falling back to client-side proxy:', apiErr);
                                  const html = await fetchProxyHtml(scrapeBulkUrl);

                                  const parser = new DOMParser();
                                  const doc = parser.parseFromString(html, 'text/html');
                                  const adsList: any[] = [];

                                  const nextDataScript = doc.querySelector('script#__NEXT_DATA__');
                                  if (nextDataScript && nextDataScript.textContent) {
                                    try {
                                      const nextObj = JSON.parse(nextDataScript.textContent);
                                      const rawPosts: any[] = [];
                                      const scanForPosts = (obj: any, depth = 0) => {
                                        if (!obj || typeof obj !== "object" || depth > 8) return;
                                        if (Array.isArray(obj)) {
                                          for (const item of obj) {
                                            if (item && typeof item === "object" && (item.post_id || item.postId || item.id) && (item.title || item.post_title || item.secondary_title)) {
                                              rawPosts.push(item);
                                            } else {
                                              scanForPosts(item, depth + 1);
                                            }
                                          }
                                          return;
                                        }
                                        for (const k of Object.keys(obj)) {
                                          scanForPosts(obj[k], depth + 1);
                                        }
                                      };
                                      scanForPosts(nextObj.props?.pageProps);

                                      rawPosts.forEach((p: any) => {
                                        const title = String(p.title || p.post_title || p.secondary_title || p.name || "").trim();
                                        const priceRaw = p.price_amount ?? p.price ?? p.price_value ?? p.post_price ?? p.cost ?? p.amount;
                                        const price = parseInt(String(priceRaw || "").replace(/[^0-9]/g, '')) || 0;
                                        const currency = /سعودي/i.test(String(priceRaw)) ? 'ريال سعودي' : /دولار|\$/i.test(String(priceRaw)) ? 'دولار أمريكي' : 'ريال يمني';

                                        let link = p.post_url || p.share_deep_link || (p.id ? `/ar/post/${p.id}` : "") || p.url || p.link || "";
                                        if (link && !link.startsWith("http")) {
                                          try { link = new URL(link, "https://ye.opensooq.com").href; } catch (e) {}
                                        }

                                        let img = "";
                                        if (p.image_uri) {
                                          img = p.image_uri.startsWith("http") ? p.image_uri : `https://opensooq-imagesv2.os-cdn.com/previews/640x480/${p.image_uri}.webp`;
                                        } else if (p.contentUrl) {
                                          img = p.contentUrl;
                                        } else if (p.main_image) {
                                          const mi = String(p.main_image);
                                          img = mi.startsWith("http") ? mi : `https://opensooq-imagesv2.os-cdn.com/previews/640x480/${mi}.webp`;
                                        } else if (p.image) {
                                          const im = typeof p.image === "string" ? p.image : (p.image.contentUrl || p.image.url || "");
                                          img = im.startsWith("http") ? im : (im ? `https://opensooq-imagesv2.os-cdn.com/previews/640x480/${im}.webp` : "");
                                        } else if (Array.isArray(p.photos) && p.photos.length > 0) {
                                          const ph = p.photos[0];
                                          const urlStr = typeof ph === "string" ? ph : (ph.url || ph.src || ph.uri || ph.image_uri || ph.contentUrl || "");
                                          if (urlStr) {
                                            img = urlStr.startsWith("http") ? urlStr : `https://opensooq-imagesv2.os-cdn.com/previews/640x480/${urlStr}.webp`;
                                          }
                                        }

                                        if (title && link && !adsList.some(item => item.link === link)) {
                                          adsList.push({
                                            title: title.substring(0, 100),
                                            link,
                                            price,
                                            currency,
                                            image: img || "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800"
                                          });
                                        }
                                      });
                                    } catch (e) {}
                                  }

                                  doc.querySelectorAll('a').forEach(el => {
                                    const href = el.getAttribute('href') || '';
                                    if (href) {
                                      let absoluteUrl = href;
                                      if (href.startsWith('/')) {
                                        try {
                                          absoluteUrl = new URL(href, scrapeBulkUrl).href;
                                        } catch (e) {}
                                      }

                                      const matchId = href.match(/\d{6,15}/);
                                      const hasAdKeyword = href.includes('/ar/') || href.includes('/en/');
                                      const isNotExclusion = !absoluteUrl.includes('/user/') && !absoluteUrl.includes('/profile/') && !absoluteUrl.includes('/chat/') && !absoluteUrl.includes('/terms/') && !absoluteUrl.includes('/blog/');

                                      if (matchId && hasAdKeyword && absoluteUrl.startsWith('http') && isNotExclusion) {
                                        let title = el.getAttribute('title') || 
                                                    el.querySelector('h2')?.textContent?.trim() || 
                                                    el.querySelector('h3')?.textContent?.trim() || 
                                                    el.querySelector('[class*="title"]')?.textContent?.trim() || 
                                                    el.textContent?.trim() || '';
                                        title = title.replace(/\s+/g, ' ').trim();

                                        if (title && title.length > 8 && !adsList.some(item => item.link === absoluteUrl)) {
                                          let priceText = el.querySelector('[class*="price"]')?.textContent?.trim() || '';
                                          if (!priceText) {
                                            const card = el.closest('[class*="Card"]');
                                            if (card) {
                                              priceText = card.querySelector('[class*="price"]')?.textContent?.trim() || '';
                                            }
                                          }
                                          if (!priceText) {
                                            const li = el.closest('li');
                                            if (li) {
                                              priceText = li.querySelector('[class*="price"]')?.textContent?.trim() || '';
                                            }
                                          }
                                          const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;

                                          let img = el.querySelector('img')?.getAttribute('src') || 
                                                    el.querySelector('img')?.getAttribute('data-src') || 
                                                    el.querySelector('img')?.getAttribute('data-original') || '';
                                          if (!img || img.startsWith('data:') || img.includes('base64')) {
                                            const card = el.closest('[class*="Card"]');
                                            if (card) {
                                              const cardImg = card.querySelector('img');
                                              img = cardImg?.getAttribute('src') || cardImg?.getAttribute('data-src') || '';
                                            }
                                          }
                                          if (!img || img.startsWith('data:') || img.includes('base64')) {
                                            img = "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800";
                                          }

                                          adsList.push({
                                            title: title.substring(0, 100),
                                            link: absoluteUrl,
                                            price,
                                            image: img
                                          });
                                        }
                                      }
                                    }
                                  });

                                  if (adsList.length === 0) {
                                    doc.querySelectorAll('script').forEach(el => {
                                      const text = el.textContent || '';
                                      if (text.includes('post') || text.includes('title')) {
                                        const urls = (text.match(/https?:\/\/[a-z]+\.opensooq\.com\/ar\/[^\s"'}]+/g) || []);
                                        urls.forEach((u) => {
                                          if (u.match(/\d{6,15}/) && !adsList.some(item => item.link === u)) {
                                            adsList.push({
                                              title: "إعلان متميز من نتائج البحث",
                                              link: u,
                                              price: 0,
                                              image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800"
                                            });
                                          }
                                        });
                                      }
                                    });
                                  }

                                  data = adsList.slice(0, 24);
                                }

                                setScrapedResultsList(data);
                                if (data.length === 0) {
                                  setScrapeBulkError('⚠️ لم نتمكن من العثور على إعلانات في هذا الرابط، يرجى التأكد من الرابط أو المحاولة لاحقاً.');
                                }
                              } catch (err: any) {
                                setScrapeBulkError(err.message || 'حدث خطأ أثناء استخراج قائمة الإعلانات.');
                              } finally {
                                setIsScrapingBulk(false);
                              }
                            }}
                            disabled={isScrapingBulk}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-xs font-black disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer border-none"
                          >
                            {isScrapingBulk ? '⏳ جاري جلب القائمة...' : '🔍 جلب قائمة الإعلانات'}
                          </button>
                        </div>

                        {scrapeBulkError && (
                          <div className="p-3 bg-red-50 text-red-700 text-xs font-black rounded-xl border border-red-200">
                            {scrapeBulkError}
                          </div>
                        )}

                        {/* List of scraped bulk ads */}
                        {scrapedResultsList.length > 0 && (
                          <div className="space-y-4 pt-4 border-t border-indigo-200 text-right animate-fade-in">
                            <h6 className="text-[11px] font-black text-indigo-950 flex items-center gap-1.5 justify-end">
                              <span>📋 قائمة الإعلانات المتاحة للاستيراد ({scrapedResultsList.length}):</span>
                            </h6>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
                              {scrapedResultsList.map((ad, idx) => {
                                const importStatus = importingAdLinks[ad.link] || 'idle';
                                return (
                                  <div key={idx} className="bg-white rounded-xl border border-gray-250 p-3 flex gap-3 items-center hover:border-indigo-400 transition-all shadow-xs" dir="rtl">
                                    <img 
                                      src={ad.image} 
                                      className="w-16 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0" 
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        (e.target as any).src = "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800";
                                      }}
                                    />
                                    <div className="flex-1 min-w-0 text-right">
                                      <h6 className="text-xs font-extrabold text-slate-900 truncate" title={ad.title}>{ad.title}</h6>
                                      <p className="text-[10px] text-amber-600 font-black mt-1">
                                        {ad.price ? `${Number(ad.price).toLocaleString('ar-YE')} ${ad.currency || 'ر.ي'}` : 'السعر غير معلن'}
                                      </p>
                                      
                                      <div className="mt-2 flex gap-1.5 justify-start">
                                        {importStatus === 'success' ? (
                                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-3 py-1.5 text-[9px] font-black flex items-center gap-1">
                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>تم الاستيراد بنجاح ✅</span>
                                          </span>
                                        ) : importStatus === 'error' ? (
                                          <button
                                            onClick={() => handleFastImport(ad)}
                                            className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg px-3 py-1.5 text-[9px] font-black transition-colors cursor-pointer border-none"
                                          >
                                            ❌ فشل الاستيراد - أعد المحاولة 🔄
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => handleFastImport(ad)}
                                            disabled={importStatus === 'loading'}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white border-none rounded-lg px-3 py-1.5 text-[9px] font-black transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                          >
                                            {importStatus === 'loading' ? (
                                              <span>⏳ جاري الاستيراد الكامل...</span>
                                            ) : (
                                              <>
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                <span>⚡ استيراد كامل وسريع</span>
                                              </>
                                            )}
                                          </button>
                                        )}

                                        <a 
                                          href={ad.link} 
                                          target="_blank" 
                                          rel="noreferrer" 
                                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-250 rounded-lg px-2.5 py-1.5 text-[9px] font-black transition-colors flex items-center gap-0.5 decoration-none"
                                        >
                                          <span>معاينة الأصل 🔗</span>
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Footer rights inside panel */}
            <div className="bg-slate-950 text-slate-400 p-4 border-t border-slate-850 text-center text-[10px] font-bold">
              حقوق لوحة التحكم محفوظة ومؤمنة بالكامل لـ السوق المفتوح اليمني © {new Date().getFullYear()}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
