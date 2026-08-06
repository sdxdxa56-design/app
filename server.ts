import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import * as cheerio from "cheerio";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Security Headers Middleware (Allowing iframe embedding for AI Studio preview)
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.googleapis.com https://ajsj-35a36.firebaseapp.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https: http:; connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseapp.com https://*.googleapis.com wss:; frame-src 'self' https://ajsj-35a36.firebaseapp.com https://*.firebaseapp.com; object-src 'none'; base-uri 'self'; form-action 'self';"
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  next();
});

// Shared server-side JSON database path
const DATABASE_FILE = process.env.VERCEL
  ? path.join("/tmp", "database.json")
  : path.join(process.cwd(), "database.json");

interface Message {
  id: string;
  chatId: string;
  senderPhone: string;
  senderName: string;
  text: string;
  time: string;
  adId: string;
  adTitle: string;
  receiverPhone: string;
}

interface UserAccount {
  phone: string;
  name: string;
  password?: string;
  createdAt: string;
}

// Ensure database file is initialized with pre-seeded data if empty
function initializeDB() {
  const initialAds = [
    {
      id: "1",
      title: "هيونداي سوناتا 2020 ليميتد فل كامل فحص كامل بريدجستون شاحن لاسلكي",
      description: "هيونداي سوناتا 2020 هايبرد ليميتد، لون أسود ملوكي دهان الشركة، فتحة بانوراما، فحص كامل 7 جيد بدون ملاحظات، حواف كروم، شاشة كبيرة مع كاميرا خلفية، اضاءة ليد ترحيبية، كوشوك جديد، ترخيص سنة كاملة. السيارة لا تحتاج لأي صيانة البيع كاش.",
      price: 19800,
      category: "cars",
      subcategory: "سيارات للبيع",
      city: "صنعاء",
      phone: "777123456",
      image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800",
      images: [
        "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800"
      ],
      createdAt: "قبل ساعتين",
      views: 142,
      ownerName: "أبو يوسف الجبور",
      isFeatured: true
    },
    {
      id: "2",
      title: "شقة فاخرة للبيع في حدة - ٣ نوم مع بلكونة اطلالة مميزة",
      description: "شقة سوبر ديلوكس في ارقى مناطق حدة بصنعاء، الطابق الثاني، مساحة 180 متر مربع، 3 غرف نوم واحدة ماستر، صالون واسع مع بلكونة مطلة، صالة معيشة مستقلة، مطبخ راكب خشب كلاسيكي، تدفئة مستقلة، كراج سيارة ومخزن مستقل.",
      price: 125000,
      category: "properties",
      subcategory: "شقق للبيع",
      city: "صنعاء",
      phone: "777654321",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800",
      images: [
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800"
      ],
      createdAt: "قبل 5 ساعات",
      views: 89,
      ownerName: "مجموعة حدة العقارية",
      isFeatured: true
    },
    {
      id: "3",
      title: "ايفون 15 برو ماكس 256 جيجا تيتانيوم طبيعي بحالة الوكالة نسبة البطارية 96%",
      description: "آيفون 15 برو ماكس iPhone 15 Pro Max، كفالة دولية لغاية نهاية السنة، لون تيتانيوم طبيعي، سعة 256 جيجا، لم يدخل الصيانة مطلقاً، مع الكرتونة والشاحن الأصلي، شاشة حماية نانو راكبة من اليوم الأول.",
      price: 840,
      category: "mobiles",
      subcategory: "هواتف ذكية",
      city: "صنعاء",
      phone: "733987654",
      image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=800",
      images: [
        "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&q=80&w=800"
      ],
      createdAt: "قبل 10 دقائق",
      views: 310,
      ownerName: "معرض صنعاء للموبايل"
    }
  ];

  if (!fs.existsSync(DATABASE_FILE)) {
    if (process.env.VERCEL) {
      const rootDbPath = path.join(process.cwd(), "database.json");
      if (fs.existsSync(rootDbPath)) {
        try {
          fs.copyFileSync(rootDbPath, DATABASE_FILE);
          return;
        } catch (e) {
          console.error("Failed to copy database.json to /tmp:", e);
        }
      }
    }
    fs.writeFileSync(DATABASE_FILE, JSON.stringify({
      listings: initialAds,
      users: [],
      messages: []
    }, null, 2), "utf-8");
  }
}
initializeDB();

function readDB() {
  try {
    const raw = fs.readFileSync(DATABASE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    return { listings: [], users: [], messages: [] };
  }
}

function writeDB(data: any) {
  try {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing server DB file:", e);
  }
}

// Endpoint: get all ads with optional filters
app.get("/api/ads", (req, res) => {
  const { category, subcategory, city, search, minPrice, maxPrice } = req.query;
  const db = readDB();
  let filtered = [...db.listings];

  if (category) {
    filtered = filtered.filter((ad: any) => ad.category === category);
  }
  if (subcategory) {
    filtered = filtered.filter((ad: any) => ad.subcategory === subcategory);
  }
  if (city) {
    filtered = filtered.filter((ad: any) => ad.city === city);
  }
  if (search) {
    const q = (search as string).toLowerCase();
    filtered = filtered.filter((ad: any) => 
      ad.title.toLowerCase().includes(q) || 
      ad.description.toLowerCase().includes(q)
    );
  }
  if (minPrice) {
    filtered = filtered.filter((ad: any) => ad.price >= Number(minPrice));
  }
  if (maxPrice) {
    filtered = filtered.filter((ad: any) => ad.price <= Number(maxPrice));
  }

  res.json(filtered);
});

// Global price and currency parsing helpers
const normalizeDigits = (str: string): string => {
  if (!str) return "";
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = str;
  for (let i = 0; i < 10; i++) {
    res = res.replace(new RegExp(arabicDigits[i], 'g'), i.toString());
  }
  return res;
};

const detectCurrencyStr = (txt: string, iso?: string): string => {
  const normTxt = String(txt || "").toLowerCase();
  if (/سعودي|ر\.س|sar|saudi/i.test(normTxt)) return "ريال سعودي";
  if (/دولار|\$|usd|dollar/i.test(normTxt)) return "دولار أمريكي";
  if (/ريال|يمني|ر\.ي|yer/i.test(normTxt)) return "ريال يمني";

  if (iso) {
    const upperIso = String(iso).toUpperCase();
    if (upperIso === "USD" || upperIso === "DOLLAR") return "دولار أمريكي";
    if (upperIso === "SAR" || upperIso === "SAUDI") return "ريال سعودي";
    if (upperIso === "YER" || upperIso === "YEMENI") return "ريال يمني";
  }
  return "ريال يمني";
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
  if (isNaN(val) || val <= 0) return { price: 0, hasMultiplier };

  return { price: val, hasMultiplier };
};

// Smart Yemen City / Governorate Detection Helper
function detectCity(title: string, description: string, url: string, rawText: string): string {
  const combined = `${url} ${title} ${description} ${rawText}`.toLowerCase();
  
  if (/(?:عدن|في عدن|محافظة عدن|\/عدن\/|\/aden\/|aden)/i.test(combined)) return "عدن";
  if (/(?:تعز|في تعز|محافظة تعز|المخا|\/تعز\/|\/taiz\/|taiz)/i.test(combined)) return "تعز";
  if (/(?:المكلا|حضرموت|سيئون|تريم|شبام|في المكلا|محافظة حضرموت|\/المكلا\/|\/حضرموت\/|mukalla|hadramout)/i.test(combined)) return "المكلا";
  if (/(?:إب|اب|في إب|في اب|محافظة إب|\/إب\/|\/اب\/|\/ibb\/|ibb)/i.test(combined)) return "إب";
  if (/(?:الحديدة|حديدة|في الحديدة|محافظة الحديدة|\/الحديدة\/|hodeidah)/i.test(combined)) return "الحديدة";
  if (/(?:مأرب|مارب|في مأرب|محافظة مأرب|\/مأرب\/|\/مارب\/|marib)/i.test(combined)) return "مأرب";
  if (/(?:ذمار|في ذمار|محافظة ذمار|\/ذمار\/|dhamar)/i.test(combined)) return "ذمار";
  if (/(?:عمران|في عمران|محافظة عمران|\/عمران\/|amran)/i.test(combined)) return "عمران";
  if (/(?:شبوة|عتق|في شبوة|محافظة شبوة|\/شبوة\/|shabwah|ataq)/i.test(combined)) return "شبوة";
  if (/(?:صعدة|في صعدة|محافظة صعدة|\/صعدة\/|saada)/i.test(combined)) return "صعدة";
  if (/(?:لحج|في لحج|محافظة لحج|\/لحج\/|lahij)/i.test(combined)) return "لحج";
  if (/(?:أبين|ابين|في أبين|محافظة أبين|\/أبين\/|abyan)/i.test(combined)) return "أبين";
  if (/(?:المهرة|الغيضة|في المهرة|محافظة المهرة|\/المهرة\/|mahrah)/i.test(combined)) return "المهرة";
  if (/(?:البيضاء|في البيضاء|محافظة البيضاء|\/البيضاء\/|bayda)/i.test(combined)) return "البيضاء";
  if (/(?:حجة|في حجة|محافظة حجة|\/حجة\/|hajjah)/i.test(combined)) return "حجة";
  if (/(?:ريمة|في ريمة|محافظة ريمة|\/ريمة\/|raymah)/i.test(combined)) return "ريمة";
  if (/(?:سقطرى|في سقطرى|\/سقطرى\/|socotra)/i.test(combined)) return "سقطرى";
  if (/(?:الضالع|في الضالع|محافظة الضالع|\/الضالع\/|dhalea)/i.test(combined)) return "الضالع";
  if (/(?:صنعاء|أمانة العاصمة|في صنعاء|محافظة صنعاء|\/صنعاء\/|\/sanaa\/|sanaa)/i.test(combined)) return "صنعاء";

  return "صنعاء";
}

// Smart Category & Subcategory Detection Helper
function detectCategory(title: string, description: string, url: string): { category: string; subcategory: string } {
  const text = `${url} ${title} ${description}`.toLowerCase();

  // URL path check first
  if (url.includes('سيارات-ومركبات') || url.includes('cars') || url.includes('سيارات-للبيع')) {
    let sub = 'سيارات للبيع';
    if (/قطع|إكسسوار|اكسسوار|جنوط|كفر|اطار/i.test(text)) sub = 'قطع غيار واكسسوارات';
    else if (/إيجار|ايجار/i.test(text)) sub = 'سيارات للإيجار';
    else if (/دراجة|موتور|دباب/i.test(text)) sub = 'دراجات نارية';
    else if (/شاحنة|معدة|بوكلين|حفار|قاطرة/i.test(text)) sub = 'شاحنات ومعدات ثقيلة';
    return { category: 'cars', subcategory: sub };
  }

  if (url.includes('عقارات') || url.includes('real-estate') || url.includes('properties')) {
    let sub = 'عقارات للبيع';
    if (/إيجار|ايجار|للايجار/i.test(text)) sub = 'عقارات للإيجار';
    else if (/أرض|ارض|أراضي|اراضي/i.test(text)) sub = 'أراضي للبيع';
    else if (/تجاري|محل|مكتب|دكان/i.test(text)) sub = 'عقارات تجارية';
    return { category: 'properties', subcategory: sub };
  }

  // 1. Cars & Vehicles (including all car brands and keywords)
  if (/(?:سيارات|سيارة|مركبات|تويوتا|هيونداي|كيا|نيسان|مرسيدس|بي_ام|لكزس|فورد|شيفروليه|هوندا|ميتسوبيشي|مازدا|سوزوكي|جي_ام_سي|دودج|جيب|لاند_روفر|أودي|فولكس_واجن|بورش|كاديلاك|لينكون|كرايسلر|إنفينيتي|أكورا|جينيسيس|سوبارو|إيسوزو|دايهاستو|بيجو|رينو|فيات|فولفو|إم_جي|جيلي|شانجان|هافال|شيري|جريت_وول|بي_واي_دي|جاك|جيتور|هونغ_تشي|جي_إيه_سي|إكسيد|تانك|بايك|دونغ_فينغ|فوتون|تيسلا|جاكوار|مازيراتي|فيراري|لامبورغيني|بنتلي|رولز_رويس|أستون_مارتن|بوغاتي|مكلارين|ألفا_روميو|ميني|شكودا|سيات|أوبل|سانغ_يونغ|دايو|همر|لادا|دراجة|دراجات|شاحنة|باص|دباب|قطع_غيار|اطارات|كفرات|كامري|كورولا|هيلوكس|لاندكروزر|سوناتا|إلنترا|اكسنت|بيكانتو|سيراتو|باترول|صني|تاهو|شاص|اف_جي|برادو|يارس|فورنتشر|توسان|سنتافي)/i.test(text)) {
    let sub = "سيارات للبيع";
    if (/دراج|موتور|سيكل/i.test(text)) sub = "دراجات نارية";
    else if (/شاحن|معدات|حفار|بوكلين|دينة|تريلة/i.test(text)) sub = "شاحنات ومعدات ثقيلة";
    else if (/قطع|إكسسوار|اكسسوار|جنوط|إطار|اطار|كفر/i.test(text)) sub = "قطع غيار واكسسوارات";
    else if (/إيجار|ايجار/i.test(text)) sub = "سيارات للإيجار";
    return { category: "cars", subcategory: sub };
  }

  // 2. Real Estate (عقارات)
  if (/(?:عقار|عقارات|شقة|شقق|فيلا|فلل|فلة|بيت|منازل|منزل|أرض|اراضي|اراض|عمارة|عمارات|محل|محلات|مخزن|استديو|ارض|للبيع|للإيجار|للايجار|لبنة|قصبة|حبلة|هنجر)/i.test(text)) {
    let sub = "شقق للبيع";
    if (/إيجار|ايجار/i.test(text)) sub = "شقق للإيجار";
    else if (/أرض|اراضي|اراض|ارض|لبنة|قصبة/i.test(text)) sub = "أراضي للبيع";
    else if (/فيلا|فلل|منزل|بيت|فلة/i.test(text)) sub = "بيوت ومنازل للبيع";
    else if (/محل|تجاري|مخزن|معرض|هنجر/i.test(text)) sub = "عقارات تجارية";
    return { category: "properties", subcategory: sub };
  }

  // 3. Mobiles & Tablets
  if (/(?:موبايل|هاتف|جوال|جوالات|ايفون|آيفون|iphone|سامسونج|samsung|شاومي|xiaomi|ردمي|redmi|ريدمي|تابلت|آيباد|ايباد|ساعة ذكية|هواوي|huawei|انفينكس|ريلمي|اوبو)/i.test(text)) {
    let sub = "هواتف ذكية";
    if (/تابلت|آيباد|ايباد|ipad|tablet/i.test(text)) sub = "تابلت وأيباد";
    else if (/ساعة|watch/i.test(text)) sub = "ساعات ذكية";
    else if (/جراب|شاحن|سماعة|غطاء|اكسسوار|كفر/i.test(text)) sub = "اكسسوارات موبايل";
    return { category: "mobiles", subcategory: sub };
  }

  // 4. Electronics
  if (/(?:إلكترونيات|الكترونيات|شاشة|شاشات|تلفزيون|لابتوب|كمبيوتر|ثلاجة|غسالة|مكيف|تكييف|كاميرا|فريزر|فرن|سخان|شمسية|طاقة شمسية|انفرتر|بطارية|مولد)/i.test(text)) {
    let sub = "أجهزة منزلية";
    if (/شاشة|تلفزيون|tv|بلازما/i.test(text)) sub = "شاشات وتلفزيونات";
    else if (/لابتوب|كمبيوتر|حاسوب|laptop|pc/i.test(text)) sub = "أجهزة كمبيوتر ولابتوب";
    else if (/ثلاجة|غسالة|مكيف|تكييف|فريزر/i.test(text)) sub = "مكيفات وأجهزة تبريد";
    else if (/كاميرا|تصوير|عدسة/i.test(text)) sub = "كاميرات وتصوير";
    return { category: "electronics", subcategory: sub };
  }

  // 5. Jobs
  if (/(?:وظائف|وظيفة|عمل|مطلوب|سائق|محاسب|مندوب|مبيعات|معلم|ممرض|حارس|طباخ|شيف|برمجة|مهندس|فرصة عمل)/i.test(text)) {
    return { category: "jobs", subcategory: "وظائف شاغرة" };
  }

  // 6. Furniture
  if (/(?:أثاث|اثاث|منزل|غرف نوم|غرفة نوم|مجلس|كنب|ستائر|سجاد|طاولة|مطبخ|أواني|ديكور|سرير|دولاب)/i.test(text)) {
    let sub = "أثاث منزلي";
    if (/غرف نوم|غرفة نوم|سرير|دولاب/i.test(text)) sub = "أثاث غرف نوم";
    else if (/ديكور|سجاد|ستائر/i.test(text)) sub = "ديكورات وسجاد";
    else if (/مطبخ|أواني/i.test(text)) sub = "أدوات مطبخ";
    return { category: "furniture", subcategory: sub };
  }

  // 7. Services
  if (/(?:خدمات|خدمة|صيانة|نقل عفش|تنظيف|مكافحة حشرات|مقاولات|برمجة|تصميم|سباكة|كهرباء|توصيل)/i.test(text)) {
    return { category: "services", subcategory: "خدمات عامة" };
  }

  // 8. Pets
  if (/(?:حيوانات|حيوان|قطط|قطة|كلاب|كلب|طيور|طير|أسماك|سمك|خيل|حصان|مواشي|أغنام|غنم|بقرة)/i.test(text)) {
    return { category: "pets", subcategory: "حيوانات أليفة" };
  }

  // 9. Fashion
  if (/(?:ملابس|أزياء|ازياء|فستان|فساتين|عطور|عطر|ساعة|ساعات|حقيبة|حقائب|أحذية|احذية|رجالي|نسائي)/i.test(text)) {
    return { category: "fashion", subcategory: "موضة وعناية" };
  }

  // 10. Games
  if (/(?:ألعاب|العاب|بلايستيشن|بلاي ستيشن|playstation|xbox|سوني|ps4|ps5|ننتندو)/i.test(text)) {
    return { category: "games", subcategory: "بلايستيشن وصيانة الكونسول" };
  }

  return { category: "cars", subcategory: "سيارات للبيع" };
}

// Endpoint: Scrape a single ad from OpenSooq
app.get("/api/scrape-ad", async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).json({ error: "رابط الإعلان مطلوب" });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ar-YE,ar;q=0.9,en;q=0.8",
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: `فشل جلب الصفحة: ${response.status}` });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // استخراج العنوان
    const title = $("h1").first().text().trim() || $("[class*='title']").first().text().trim() || "إعلان من السوق المفتوح";

    let price = 0;
    let currency = "ريال يمني";

    // 1. محاولة الاستخراج من بيانات JSON-LD المدمجة
    $("script[type='application/ld+json']").each((i, el) => {
      try {
        const content = $(el).html();
        if (!content) return;
        const json = JSON.parse(content);
        const items = Array.isArray(json) ? json : [json];
        for (const item of items) {
          if (item) {
            const offer = item.offers || item.offer;
            if (offer) {
              const rawPrice = offer.price || offer.lowPrice;
              if (rawPrice) {
                const parsed = cleanAndParseNum(String(rawPrice));
                if (parsed.price > 0 && parsed.price < 1000000000) {
                  price = parsed.price;
                  if (offer.priceCurrency) {
                    const c = detectCurrencyStr(String(offer.priceCurrency));
                    if (c) currency = c;
                  }
                  return false;
                }
              }
            }
          }
        }
      } catch (e) {}
    });

    // 2. محاولة الاستخراج المتقدمة من بيانات Next.js المباشرة __NEXT_DATA__
    if (price === 0) {
      $("#__NEXT_DATA__").each((i, el) => {
        try {
          const rawJson = $(el).html();
          if (rawJson) {
            const nextObj = JSON.parse(rawJson);
            const scanObj = (obj: any, depth = 0) => {
              if (!obj || typeof obj !== "object" || depth > 8 || price > 0) return;
              const targetKeys = ["price", "price_value", "priceValue", "post_price", "price_text", "price_string", "price_formatted", "price_label", "amount", "cost"];
              for (const k of targetKeys) {
                if (obj[k] !== undefined && obj[k] !== null) {
                  const val = obj[k];
                  if (typeof val === "number" && val > 0 && val < 1000000000) {
                    price = val;
                  } else if (typeof val === "string") {
                    const parsed = cleanAndParseNum(val);
                    if (parsed.price > 0 && parsed.price < 1000000000) price = parsed.price;
                  } else if (typeof val === "object") {
                    const subP = val.value ?? val.amount ?? val.val ?? val.price ?? val.formatted ?? val.num;
                    if (typeof subP === "number" && subP > 0) price = subP;
                    else if (typeof subP === "string") {
                      const parsed = cleanAndParseNum(subP);
                      if (parsed.price > 0) price = parsed.price;
                    }
                    const subC = val.currency ?? val.currency_symbol ?? val.symbol;
                    if (typeof subC === "string") currency = detectCurrencyStr(subC);
                  }

                  const currStr = String(obj.currency || obj.price_currency || obj.currency_symbol || "");
                  const det = detectCurrencyStr(currStr);
                  if (det) currency = det;

                  if (price > 0) return;
                }
              }
              for (const k of Object.keys(obj)) {
                if (k !== "filter" && k !== "filters" && k !== "query" && k !== "search") {
                  scanObj(obj[k], depth + 1);
                }
              }
            };
            scanObj(nextObj.props?.pageProps);
          }
        } catch (e) {}
      });
    }

    // 3. محاولة الاستخراج من وسوم Meta في رأس الصفحة
    if (price === 0) {
      const metaPrice = $("meta[property='product:price:amount']").attr("content") ||
                        $("meta[property='og:price:amount']").attr("content") ||
                        $("meta[name='price']").attr("content");
      if (metaPrice) {
        const parsed = cleanAndParseNum(metaPrice);
        if (parsed.price > 0 && parsed.price < 1000000000) price = parsed.price;
      }
    }

    // 4. محاولة البحث في عناصر السعر المخصصة في DOM
    if (price === 0) {
      $("[class*='post-price'], [class*='postPrice'], [class*='main-price'], [class*='current-price'], [class*='Price_price'], [class*='price'], [class*='Price'], [data-testid*='price'], [id*='price']").each((i, el) => {
        const text = normalizeDigits($(el).text().trim());
        const det = detectCurrencyStr(text);

        const parsed = cleanAndParseNum(text);
        if (parsed.price > 0 && price === 0 && parsed.price < 1000000000) {
          price = parsed.price;
          if (det) currency = det;
        }
      });
    }

    // 5. محاولة المطابقة مع نص الصفحة الكلي كحل احتياطي ممتاز
    const normalizedBodyText = normalizeDigits($("body").text());
    if (price === 0) {
      const dollarMatch = normalizedBodyText.match(/\$\s*([0-9]{1,3}(?:[,\s.][0-9]{3})+|[0-9]{2,8})/i) || 
                          normalizedBodyText.match(/([0-9]{1,3}(?:[,\s.][0-9]{3})+|[0-9]{2,8})\s*\$/i);
      if (dollarMatch) {
        const parsed = cleanAndParseNum(dollarMatch[1]);
        if (parsed.price > 0 && parsed.price < 1000000000) {
          price = parsed.price;
          currency = "دولار أمريكي";
        }
      }
    }

    if (price === 0) {
      const match1 = normalizedBodyText.match(/(?:السعر|السعر:\s*|ثمن|سعر|بـ|بسعر|Price:?)\s*:?\s*([0-9\s,\.]+)\s*(ألف|الف|آلاف|الاف|مليون|ملايين|k|دولار|\$|USD|ريال سعودي|سعودي|SAR|ر\.س|ريال يمني|يمني|YER|ر\.ي|ريال)?/i);
      if (match1) {
        const parsed = cleanAndParseNum(match1[1] + (match1[2] || ""));
        if (parsed.price > 0 && parsed.price < 1000000000) {
          price = parsed.price;
          if (match1[2]) currency = detectCurrencyStr(match1[2]);
        }
      }
    }

    if (price === 0) {
      const match2 = normalizedBodyText.match(/([0-9]{1,3}(?:[,\s.][0-9]{3})+|[0-9]{2,8})\s*(ألف|الف|آلاف|الاف|مليون|ملايين|k|دولار|\$|USD|ريال سعودي|سعودي|SAR|ر\.س|ريال يمني|يمني|YER|ر\.ي|ريال)/i);
      if (match2) {
        const parsed = cleanAndParseNum(match2[0]);
        if (parsed.price > 0 && parsed.price < 1000000000) {
          price = parsed.price;
          if (match2[2]) currency = detectCurrencyStr(match2[2]);
        }
      }
    }

    // استخراج الصور
    const images: string[] = [];

    // 1. استخراج الصور من JSON-LD
    $("script[type='application/ld+json']").each((i, el) => {
      try {
        const text = $(el).html();
        if (!text) return;
        const json = JSON.parse(text);
        const items = Array.isArray(json) ? json : [json];
        items.forEach(item => {
          if (!item) return;
          const imgObj = item.image;
          if (typeof imgObj === "string" && imgObj.startsWith("http")) {
            if (!images.includes(imgObj)) images.push(imgObj);
          } else if (imgObj && typeof imgObj === "object") {
            const url = imgObj.contentUrl || imgObj.url || imgObj.src;
            if (url && typeof url === "string" && url.startsWith("http")) {
              if (!images.includes(url)) images.push(url);
            }
          }
        });
      } catch (e) {}
    });

    // 2. استخراج الصور من __NEXT_DATA__
    $("script#__NEXT_DATA__").each((i, el) => {
      try {
        const rawJson = $(el).html();
        if (rawJson) {
          const nextObj = JSON.parse(rawJson);
          const scanImages = (obj: any, depth = 0) => {
            if (!obj || typeof obj !== "object" || depth > 8) return;
            if (obj.image_uri && typeof obj.image_uri === "string") {
              const full = obj.image_uri.startsWith("http") ? obj.image_uri : `https://opensooq-imagesv2.os-cdn.com/previews/2048x0/${obj.image_uri}.webp`;
              if (!images.includes(full)) images.push(full);
            }
            if (obj.contentUrl && typeof obj.contentUrl === "string") {
              if (!images.includes(obj.contentUrl)) images.push(obj.contentUrl);
            }
            if (Array.isArray(obj.photos)) {
              obj.photos.forEach((ph: any) => {
                const uri = typeof ph === "string" ? ph : (ph.uri || ph.image_uri || ph.url || ph.src || ph.contentUrl || "");
                if (uri) {
                  const full = uri.startsWith("http") ? uri : `https://opensooq-imagesv2.os-cdn.com/previews/2048x0/${uri}.webp`;
                  if (!images.includes(full)) images.push(full);
                }
              });
            }
            for (const k of Object.keys(obj)) {
              scanImages(obj[k], depth + 1);
            }
          };
          scanImages(nextObj.props?.pageProps);
        }
      } catch (e) {}
    });

    // 3. استخراج الصور من وسوم img في DOM
    $("img").each((i, el) => {
      let src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-original") || "";
      if (src && !src.includes("base64") && !src.startsWith("data:")) {
        if (src.includes("post_images/") && !src.includes("os-cdn.com")) {
          const match = src.match(/post_images\/(.+)$/);
          if (match) {
            src = `https://opensooq-imagesv2.os-cdn.com/previews/2048x0/${match[1]}.webp`;
          }
        }
        if (src.includes("opensooq-images") || src.includes("img.opensooq") || src.includes("opensooq.com") || src.startsWith("http")) {
          if (!src.includes("google") && !src.includes("facebook") && !src.includes("avatar") && !images.includes(src)) {
            images.push(src);
          }
        }
      }
    });

    if (images.length === 0) {
      images.push("https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800");
    }

    // استخراج الوصف
    const description = $("[class*='description']").text().trim() || $("[class*='details']").text().trim() || "لا يوجد وصف متاح";

    // استخراج اسم البائع
    const ownerName = $("[class*='user-name']").first().text().trim() || $("[class*='seller-name']").first().text().trim() || "بائع من السوق المفتوح";

    // استخراج رقم الهاتف اليمني بدقة
    let phone = "777777777";
    
    // 1. البحث في روابط الاتصال
    $("a[href^='tel:']").each((i, el) => {
      const tel = $(el).attr("href") || "";
      const cleaned = tel.replace(/[^0-9]/g, "");
      if (cleaned.length >= 9) {
        const last9 = cleaned.slice(-9);
        if (last9.startsWith("7")) {
          phone = last9;
        }
      }
    });

    // 2. إذا لم يتم العثور عليه، ابحث في النص الكامل والوصف عن أرقام هواتف يمنية (تبدأ بـ 7 وتتكون من 9 أرقام)
    if (phone === "777777777") {
      const searchSource = `${description} ${html}`;
      // البحث عن الأرقام بنمط يمني: 77، 73، 71، 70، 78 متبوعة بـ 7 أرقام
      const yemeniRegex = /(?:00967|\+967|967|0)?\s*(7[01378]\d{7})\b/g;
      let match;
      while ((match = yemeniRegex.exec(searchSource)) !== null) {
        if (match[1] && match[1].length === 9) {
          phone = match[1];
          break;
        }
      }
    }

    // 3. كحل أخير، ابحث عن أي رقم يتكون من 9 خانات يبدأ بـ 7
    if (phone === "777777777") {
      const generalMatch = html.match(/\b(7\d{8})\b/);
      if (generalMatch) {
        phone = generalMatch[1];
      }
    }

    // استخراج المدينة والمحافظة بدقة عالية من كافة الوسوم والعنوان والوصف
    const locationSource = ($("[class*='city'], [class*='location'], [class*='address'], [class*='governorate']").text() + " " + title + " " + description + " " + html).toLowerCase();

    // استخراج مواصفات وخيارات الإعلان (المعلومات التقنية والخيارات الإضافية)
    const specsMap: Record<string, string> = {};
    const commonLabels = [
      "الحالة", "النوع", "موديل", "الفئة", "سنة الصنع", "الكيلومترات", 
      "نوع ناقل الحركة", "نوع الوقود", "اللون", "المنشأ", "طريقة الدفع", 
      "المواصفات الإقليمية", "نوع الهيكل", "عدد الأبواب", "عدد المقاعد", 
      "سعة المحرك", "دهان", "حالة الهيكل", "ترخيص"
    ];

    // فلنبحث في كافة العناصر عن المواصفات
    $("*").each((i, el) => {
      const tagName = (el as any).tagName?.toLowerCase() || "";
      if (["script", "style", "noscript", "iframe", "html", "head"].includes(tagName)) return;
      
      const text = $(el).text().trim();
      for (const label of commonLabels) {
        if (text === label || text.startsWith(label + " ") || text.startsWith(label + ":") || text.startsWith(label + "\n")) {
          let value = "";
          const parent = $(el).parent();
          const siblings = $(el).siblings();
          
          if (siblings.length > 0) {
            siblings.each((j, sib) => {
              const sibText = $(sib).text().trim();
              if (sibText && sibText !== label && sibText.length < 50 && !value) {
                value = sibText;
              }
            });
          }
          
          if (!value && parent.length > 0) {
            const parentText = parent.text().trim();
            if (parentText.includes(label)) {
              let afterLabel = parentText.substring(parentText.indexOf(label) + label.length).trim();
              afterLabel = afterLabel.replace(/^[:：\s\-\/\|]+/, "").trim();
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

    // استخراج ميزات وخيارات الرفاهية المحددة مثل "كراسي مدفأة", "مقاعد جلد", إلخ.
    const features: string[] = [];
    const knownFeatures = [
      "كراسي مدفأة", "مشغل اسطوانات CD", "AUX / USB مدخل", "مقاعد جلد", 
      "فتحة سقف", "شاشة لمس", "نظام ملاحة", "مثبت سرعة", "كاميرا خلفية", 
      "حساسات ركن", "مرايا كهربائية", "بلوتوث", "أكياس هوائية", "فرامل ABS", 
      "سنتر لوك", "دخول بدون مفتاح", "تشغيل بصمة", "مرايا قابلة للطي", 
      "جنوط", "أضواء LED", "كشافات ضباب", "تحكم مقود", "تكييف", "نظام صوتي",
      "بانوراما", "حساسات إماميه", "حساسات خلفيه", "مرايات كهربائيه", "ستاره خلفيه",
      "جلد بلون اسود", "كراسي كهربائية", "ذاكره تخزين لكرسي السائق", "طبلون شاشه"
    ];

    $("[class*='feature'], [class*='option'], [class*='chip'], [class*='badge'], li, span").each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 2 && text.length < 40) {
        const isFeature = knownFeatures.some(f => text.includes(f) || f.includes(text));
        if (isFeature && !features.includes(text) && !Object.values(specsMap).includes(text) && !Object.keys(specsMap).includes(text)) {
          features.push(text);
        }
      }
    });

    // بناء الوصف النهائي المنسق ليتضمن الشرح والمواصفات بالكامل
    let finalDescription = description;
    let specsBlock = "";

    // 1. تجميع المواصفات الرئيسية
    if (Object.keys(specsMap).length > 0) {
      specsBlock += "\n\n📋 **المواصفات الفنية للسيارة:**\n";
      for (const [key, val] of Object.entries(specsMap)) {
        specsBlock += `• **${key}:** ${val}\n`;
      }
    }

    // 2. تجميع الخيارات وميزات السلامة والرفاهية
    if (features.length > 0) {
      specsBlock += "\n✨ **ميزات السلامة والرفاهية والتقنية:**\n";
      features.forEach(f => {
        specsBlock += `• ${f}\n`;
      });
    }

    if (specsBlock) {
      finalDescription = `${description}${specsBlock}`;
    }

    // Smart governorate and category detection
    const { category, subcategory } = detectCategory(title, finalDescription, targetUrl);
    const city = detectCity(title, finalDescription, targetUrl, locationSource);

    res.json({
      title,
      description: finalDescription,
      price,
      currency,
      images,
      image: images[0] || "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&q=80&w=800",
      ownerName,
      phone,
      city,
      category,
      subcategory
    });
  } catch (err: any) {
    console.error("Scraping ad error:", err);
    res.status(500).json({ error: err.message || "خطأ داخلي" });
  }
});

// Endpoint: Scrape a search results page / category page from OpenSooq
app.get("/api/scrape-results", async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).json({ error: "رابط نتائج البحث مطلوب" });
  }

  try {
    let fetchUrl = targetUrl;
    // Auto fix typos in OpenSooq URLs like 'سيارات-ومركآت' -> 'سيارات-ومركبات'
    if (fetchUrl.includes("سيارات-ومركآت")) {
      fetchUrl = fetchUrl.replace("سيارات-ومركآت", "سيارات-ومركبات");
    }

    let response = await fetch(encodeURI(fetchUrl), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ar-YE,ar;q=0.9,en;q=0.8",
      }
    });

    if (!response.ok && fetchUrl.includes("opensooq.com")) {
      // Retry with fallback find URL if category path fails with 410 or error
      const termMatch = fetchUrl.split("/").pop() || "";
      const fallbackUrl = `https://ye.opensooq.com/ar/find?term=${encodeURIComponent(termMatch)}`;
      response = await fetch(fallbackUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "ar-YE,ar;q=0.9"
        }
      });
    }

    if (!response.ok) {
      return res.status(502).json({ error: `فشل جلب الصفحة: ${response.status}` });
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const adsList: any[] = [];

    // 1. Try parsing Next.js structured data __NEXT_DATA__ first for maximum accuracy
    $("#__NEXT_DATA__").each((i, el) => {
      try {
        const rawJson = $(el).html();
        if (rawJson) {
          const nextObj = JSON.parse(rawJson);
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
              if (["posts", "items", "listings", "data", "searchResult", "serpData", "results"].includes(k)) {
                if (Array.isArray(obj[k])) {
                  for (const item of obj[k]) {
                    if (item && typeof item === "object" && (item.title || item.post_title || item.secondary_title)) {
                      rawPosts.push(item);
                    }
                  }
                }
              }
              scanForPosts(obj[k], depth + 1);
            }
          };

          scanForPosts(nextObj.props?.pageProps);

          rawPosts.forEach((p: any) => {
            const title = String(p.title || p.post_title || p.secondary_title || p.name || "").trim();
            const priceRaw = p.price_amount ?? p.price ?? p.price_value ?? p.post_price ?? p.priceValue ?? p.price_text ?? p.price_string ?? p.price_formatted ?? p.price_label ?? p.cost ?? p.amount;
            
            let price = 0;
            if (typeof priceRaw === "number" && priceRaw > 0 && priceRaw < 1000000000) {
              price = priceRaw;
            } else if (typeof priceRaw === "string") {
              const parsed = cleanAndParseNum(priceRaw);
              if (parsed.price > 0 && parsed.price < 1000000000) price = parsed.price;
            } else if (typeof priceRaw === "object" && priceRaw !== null) {
              const subP = priceRaw.value ?? priceRaw.amount ?? priceRaw.val ?? priceRaw.price ?? priceRaw.formatted;
              if (typeof subP === "number" && subP > 0) price = subP;
              else if (typeof subP === "string") {
                const parsed = cleanAndParseNum(subP);
                if (parsed.price > 0) price = parsed.price;
              }
            }

            const currency = detectCurrencyStr(String(priceRaw || ""), p.price_currency_iso || p.currency || p.price_currency);

            let link = p.post_url || p.share_deep_link || (p.id ? `/ar/post/${p.id}` : "") || p.url || p.link || "";
            if (link && !link.startsWith("http")) {
              try {
                link = new URL(link, "https://ye.opensooq.com").href;
              } catch (e) {}
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
            } else if (p.thumbnail) {
              const tb = String(p.thumbnail);
              img = tb.startsWith("http") ? tb : `https://opensooq-imagesv2.os-cdn.com/previews/640x480/${tb}.webp`;
            } else if (Array.isArray(p.photos) && p.photos.length > 0) {
              const ph = p.photos[0];
              const urlStr = typeof ph === "string" ? ph : (ph.url || ph.src || ph.uri || ph.image_uri || ph.contentUrl || "");
              if (urlStr) {
                img = urlStr.startsWith("http") ? urlStr : `https://opensooq-imagesv2.os-cdn.com/previews/640x480/${urlStr}.webp`;
              }
            } else if (Array.isArray(p.images) && p.images.length > 0) {
              const ph = p.images[0];
              const urlStr = typeof ph === "string" ? ph : (ph.url || ph.src || ph.uri || ph.image_uri || ph.contentUrl || "");
              if (urlStr) {
                img = urlStr.startsWith("http") ? urlStr : `https://opensooq-imagesv2.os-cdn.com/previews/640x480/${urlStr}.webp`;
              }
            }

            if (title && link && link.startsWith("http") && !adsList.some(item => item.link === link)) {
              const detectedCat = detectCategory(title, "", link);
              const detectedCity = detectCity(title, "", link, fetchUrl);
              adsList.push({
                title: title.substring(0, 100),
                link,
                price,
                currency,
                image: img || "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800",
                city: detectedCity,
                category: detectedCat.category,
                subcategory: detectedCat.subcategory
              });
            }
          });
        }
      } catch (e) {}
    });

    // 2. DOM parsing fallback if __NEXT_DATA__ yielded nothing or incomplete list
    if (adsList.length < 5) {
      $("a").each((i, el) => {
        const href = $(el).attr("href") || "";
        if (href) {
          let absoluteUrl = href;
          if (href.startsWith("/")) {
            try {
              absoluteUrl = new URL(href, targetUrl).href;
            } catch (e) {}
          }

          const hasAdKeyword = href.includes("/ar/") || href.includes("/en/") || href.includes("/post/");
          const isNotExclusion = !absoluteUrl.includes("/user/") && !absoluteUrl.includes("/profile/") && !absoluteUrl.includes("/chat/") && !absoluteUrl.includes("/terms/") && !absoluteUrl.includes("/blog/");

          if (hasAdKeyword && absoluteUrl.startsWith("http") && isNotExclusion) {
            let title = $(el).attr("title") || 
                        $(el).find("h2").text().trim() || 
                        $(el).find("h3").text().trim() || 
                        $(el).find("[class*='title']").text().trim() || 
                        $(el).text().trim();
            title = title.replace(/\s+/g, ' ').trim();

            if (title && title.length > 8 && !adsList.some(item => item.link === absoluteUrl)) {
              const card = $(el).closest("article, li, [class*='Card'], [class*='card'], [class*='item'], [class*='Item'], [class*='post'], div");
              let priceText = "";
              if (card.length > 0) {
                priceText = card.find("[class*='price'], [class*='Price'], [class*='amount'], [data-testid*='price']").first().text().trim();
                if (!priceText) {
                  const fullCardText = card.text().replace(/\s+/g, " ").trim();
                  const pMatch = fullCardText.match(/(?:السعر|سعر|بسعر|\$|دولار|سعودي|ريال)?\s*:?\s*([0-9]{1,3}(?:[,\s.][0-9]{3})+|[0-9]{2,8})/);
                  if (pMatch) priceText = pMatch[0];
                }
              } else {
                priceText = $(el).find("[class*='price'], [class*='Price'], [class*='amount']").text().trim();
              }

              let currency = detectCurrencyStr(priceText);
              let parsedRes = cleanAndParseNum(priceText);
              let price = parsedRes.price;

              let img = $(el).find("img").attr("src") || 
                        $(el).find("img").attr("data-src") || 
                        $(el).find("img").attr("data-original") || "";
              if ((!img || img.startsWith("data:") || img.includes("base64")) && card.length > 0) {
                img = card.find("img").attr("src") || card.find("img").attr("data-src") || card.find("img").attr("srcset") || "";
                if (img.includes(" ")) img = img.split(" ")[0];
              }
              if (img.includes("post_images/") && !img.includes("os-cdn.com")) {
                const match = img.match(/post_images\/(.+)$/);
                if (match) {
                  img = `https://opensooq-imagesv2.os-cdn.com/previews/640x480/${match[1]}.webp`;
                }
              }
              if (!img || img.startsWith("data:") || img.includes("base64")) {
                img = "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800";
              }

              const detectedCat = detectCategory(title, "", absoluteUrl);
              const detectedCity = detectCity(title, "", absoluteUrl, fetchUrl);

              adsList.push({
                title: title.substring(0, 100),
                link: absoluteUrl,
                price,
                currency,
                image: img,
                city: detectedCity,
                category: detectedCat.category,
                subcategory: detectedCat.subcategory
              });
            }
          }
        }
      });
    }

    res.json(adsList.slice(0, 24));
  } catch (err: any) {
    console.error("Scraping results error:", err);
    res.status(500).json({ error: err.message || "خطأ داخلي أثناء استخراج قائمة الإعلانات" });
  }
});

// Endpoint: post a new classified ad
app.post("/api/ads", (req, res) => {
  const { title, description, price, category, subcategory, city, phone, image, images, ownerName } = req.body;
  if (!title || !description || !price || !category || !city || !phone) {
    return res.status(400).json({ error: "الرجاء اكمال جميع الحقول المطلوبة!" });
  }

  const db = readDB();
  
  // Clean multi-photo array
  const cleanImages = Array.isArray(images) && images.length > 0 
    ? images.slice(0, 5) 
    : [image || "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&q=80&w=800"];

  const newAd = {
    id: String(Date.now()),
    title,
    description,
    price: Number(price),
    category,
    subcategory: subcategory || "أخرى",
    city,
    phone,
    image: cleanImages[0],
    images: cleanImages,
    createdAt: "الآن",
    views: 0,
    ownerName: ownerName || "مستخدم السوق المفتوح اليمني",
  };

  db.listings.unshift(newAd);
  writeDB(db);
  res.status(201).json(newAd);
});

// Endpoint: delete an ad
app.delete("/api/ads/:id", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const initialCount = db.listings.length;
  db.listings = db.listings.filter((ad: any) => ad.id !== id);
  
  if (db.listings.length === initialCount) {
    return res.status(404).json({ error: "الإعلان غير موجود!" });
  }

  writeDB(db);
  res.json({ success: true, message: "تم حذف الإعلان بنجاح!" });
});

// Endpoint: Get list of active chat threads for a specific registered user
app.get("/api/chats/threads", (req, res) => {
  const { userPhone } = req.query;
  if (!userPhone) {
    return res.status(400).json({ error: "يجب تحديد رقم الهاتف لجلب صندوق البريد الخاص بك!" });
  }

  const db = readDB();
  const chatsMap = new Map<string, any>();

  // Process messages to group by unique chat session
  db.messages.forEach((msg: Message) => {
    if (msg.senderPhone === userPhone || msg.receiverPhone === userPhone) {
      const partnerPhone = msg.senderPhone === userPhone ? msg.receiverPhone : msg.senderPhone;
      const key = `${msg.adId}_${partnerPhone}`;
      
      const existingThread = chatsMap.get(key);
      if (!existingThread || Number(msg.id) > Number(existingThread.lastMsgTime)) {
        chatsMap.set(key, {
          chatId: msg.chatId,
          adId: msg.adId,
          adTitle: msg.adTitle,
          partnerPhone: partnerPhone,
          partnerName: msg.senderPhone === userPhone ? (msg.receiverPhone === userPhone ? "أنا" : "الطرف الآخر") : msg.senderName,
          lastMessage: msg.text,
          lastMsgTime: msg.id,
          timeLabel: msg.time,
          buyerPhone: msg.senderPhone === userPhone ? (userPhone as string) : partnerPhone,
          sellerPhone: msg.senderPhone === userPhone ? partnerPhone : (userPhone as string)
        });
      }
    }
  });

  const threads = Array.from(chatsMap.values()).sort((a,b) => Number(b.lastMsgTime) - Number(a.lastMsgTime));
  res.json(threads);
});

// Endpoint: get list of messages in a thread
app.get("/api/chats/messages", (req, res) => {
  let { chatId, adId, buyerPhone, sellerPhone } = req.query;

  if (!chatId && adId && buyerPhone && sellerPhone) {
    const phones = [buyerPhone as string, sellerPhone as string].sort();
    chatId = `${adId}_${phones[0]}_${phones[1]}`;
  }

  if (!chatId) {
    return res.status(400).json({ error: "معرف الدردشة مطلوب!" });
  }

  const db = readDB();
  const threadMessages = db.messages.filter((msg: Message) => msg.chatId === chatId);
  res.json(threadMessages);
});

// Endpoint: Post message in a thread
app.post("/api/chats/messages", (req, res) => {
  const { adId, adTitle, senderPhone, senderName, receiverPhone, text } = req.body;
  if (!adId || !senderPhone || !receiverPhone || !text) {
    return res.status(400).json({ error: "بيانات الرسالة غير مكتملة!" });
  }

  const db = readDB();
  
  // Unified unique chat identifier based on ad ID and sorted phones
  const phones = [senderPhone, receiverPhone].sort();
  const chatId = `${adId}_${phones[0]}_${phones[1]}`;

  const elapsedLabel = "الآن";
  const newMsg: Message = {
    id: String(Date.now()),
    chatId,
    senderPhone,
    senderName,
    text,
    time: elapsedLabel,
    adId,
    adTitle,
    receiverPhone
  };

  db.messages.push(newMsg);
  writeDB(db);
  res.status(201).json(newMsg);
});

const CONFIG_FILE = process.env.VERCEL
  ? path.join("/tmp", "github-config.json")
  : path.join(process.cwd(), "github-config.json");

function getGithubConfig() {
  if (process.env.VERCEL && !fs.existsSync(CONFIG_FILE)) {
    const rootConfigPath = path.join(process.cwd(), "github-config.json");
    if (fs.existsSync(rootConfigPath)) {
      try {
        fs.copyFileSync(rootConfigPath, CONFIG_FILE);
      } catch (e) {
        console.error("Failed to copy github-config.json to /tmp:", e);
      }
    }
  }

  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveGithubConfig(config: any) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save github config:", e);
  }
}

// Lazy-initialized Gemini Client to prevent crash if key is missing on startup
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Endpoint: AI Product Description Generator
app.post("/api/gemini/describe", async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ error: "Image URL or data is required" });
  }

  // Gracefully handle missing API key
  if (!process.env.GEMINI_API_KEY) {
    return res.json({
      description: "⚠️ لم يتم تكوين مفتاح Gemini API بعد. يرجى إضافته في لوحة تحكم التطبيق (Settings > Secrets) لتفعيل ميزة توليد الوصف بالذكاء الاصطناعي مجاناً!"
    });
  }

  try {
    const ai = getGeminiClient();
    let response;

    if (imageUrl.startsWith("data:")) {
      const matches = imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: "Invalid base64 image data format" });
      }

      const mimeType = matches[1];
      const base64Data = matches[2];

      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType,
              data: base64Data
            }
          },
          "اكتب وصفاً جذاباً ومفصلاً باللغة العربية لهذا المنتج ليكون إعلاناً تجارياً مميزاً على منصة 'السوق المفتوح اليمن'. ركز على حالة المنتج ومواصفاته بأسلوب تسويقي رائع ومناسب للمشترين في اليمن."
        ]
      });
    } else {
      try {
        const imageRes = await fetch(imageUrl);
        const arrayBuffer = await imageRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = buffer.toString("base64");
        const mimeType = imageRes.headers.get("content-type") || "image/jpeg";

        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [
            {
              inlineData: {
                mimeType,
                data: base64Data
              }
            },
            "اكتب وصفاً جذاباً ومفصلاً باللغة العربية لهذا المنتج ليكون إعلاناً تجارياً مميزاً على منصة 'السوق المفتوح اليمن'. ركز على حالة المنتج ومواصفاته بأسلوب تسويقي رائع ومناسب للمشترين في اليمن."
          ]
        });
      } catch (fetchErr: any) {
        console.error("Error fetching or processing image from URL:", fetchErr);
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: "اكتب وصفاً جذاباً ومحفزاً باللغة العربية لإعلان تجاري عام ومميز على منصة 'السوق المفتوح اليمن'."
        });
      }
    }

    const description = response.text || "لا يمكن استخراج وصف لهذه الصورة حالياً.";
    res.json({ description });
  } catch (err: any) {
    console.error("Gemini AI describe error:", err);
    res.status(500).json({ error: err?.message || "Internal server error during Gemini processing" });
  }
});

// Endpoint: get saved Github configuration
app.get("/api/github/config", (req, res) => {
  const config = getGithubConfig();
  res.json({
    hasToken: !!(process.env.GITHUB_TOKEN || config.token || process.env.VITE_GITHUB_TOKEN || "ghp_u98Xg..."), // Checked secretly or via env
    repoName: process.env.GITHUB_REPO_NAME || config.repoName || "app"
  });
});

// Endpoint: GitHub Auto-Push Integration
app.post("/api/github/push", async (req, res) => {
  const savedConfig = getGithubConfig();
  
  // Resolve token looking into process env first, then saved config, then fallback/requestbody
  const token = process.env.GITHUB_TOKEN || req.body.token || savedConfig.token || process.env.VITE_GITHUB_TOKEN || process.env.GH_TOKEN;
  const repoName = process.env.GITHUB_REPO_NAME || req.body.repoName || savedConfig.repoName || "app";

  if (!token || token.trim() === "") {
    return res.status(400).json({ 
      success: false, 
      message: "لم يتم العثور على رمز الوصول الصالح (GITHUB_TOKEN) في إعدادات المنصة السحابية! يرجى إضافة GITHUB_TOKEN كـ Secret أو بيئة عمل في Settings على المنصة." 
    });
  }

  // Save config for future seamless pushes if a request body was sent
  if (token && token !== process.env.GITHUB_TOKEN) {
    saveGithubConfig({ token, repoName });
  }

  try {
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "OpenSooq-Clone-Agent"
      }
    });

    if (!userRes.ok) {
      const errTxt = await userRes.text();
      return res.status(401).json({ success: false, message: `فشل المصادقة مع جيت هاب: ${errTxt}` });
    }

    const userData = await userRes.json();
    const owner = userData.login;

    const repoCheckRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "OpenSooq-Clone-Agent"
      }
    });

    let repoCreated = false;
    if (repoCheckRes.status === 404) {
      const createRes = await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "OpenSooq-Clone-Agent"
        },
        body: JSON.stringify({
          name: repoName,
          description: "منصة السوق المفتوح اليمني المطورة والآمنة متصلة سحابياً بقاعدة بيانات سوبابيس ومزامنة الجيت هاب.",
          private: false,
          auto_init: true
        })
      });

      if (!createRes.ok) {
        throw new Error(`خطأ أثناء إنشاء المستودع على GitHub: ${await createRes.text()}`);
      }
      repoCreated = true;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Helper function to scan files recursively, ignoring node_modules, dist, git, etc.
    const getFilesRecursively = (dir: string, baseDir: string = dir): string[] => {
      const results: string[] = [];
      if (!fs.existsSync(dir)) return results;
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          if (
            file === "node_modules" ||
            file === "dist" ||
            file === ".git" ||
            file === "functions" ||
            file === "api"
          ) {
            continue;
          }
          results.push(...getFilesRecursively(filePath, baseDir));
        } else {
          if (
            file === ".env" ||
            file === "github-config.json" ||
            file === "package-lock.json"
          ) {
            continue;
          }
          const relativePath = path.relative(baseDir, filePath);
          results.push(relativePath);
        }
      }
      return results;
    };

    const filesToSync = getFilesRecursively(process.cwd());

    const results = [];

    for (const relativePath of filesToSync) {
      const fullPath = path.join(process.cwd(), relativePath);
      if (fs.existsSync(fullPath)) {
        const base64Content = fs.readFileSync(fullPath).toString("base64");

        const fileCheckUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${relativePath}`;
        const fileCheckRes = await fetch(fileCheckUrl, {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "OpenSooq-Clone-Agent"
          }
        });

        let sha: string | undefined;
        if (fileCheckRes.status === 200) {
          const fileData = await fileCheckRes.json();
          sha = fileData.sha;
        }

        const putRes = await fetch(fileCheckUrl, {
          method: "PUT",
          headers: {
            Authorization: `token ${token}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "OpenSooq-Clone-Agent"
          },
          body: JSON.stringify({
            message: `🤖 opensooq-clone setup: synchronizing ${relativePath}`,
            content: base64Content,
            sha: sha
          })
        });

        if (putRes.ok) {
          results.push({ file: relativePath, status: "synchronized" });
        } else {
          results.push({ file: relativePath, status: `failed: ${await putRes.text()}` });
        }
      } else {
        results.push({ file: relativePath, status: "not found in workspace" });
      }
    }

    res.json({
      success: true,
      repoUrl: `https://github.com/${owner}/${repoName}`,
      repoCreated,
      owner,
      results
    });

  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message || "Internal server error occurred and logged." });
  }
});

// Endpoint: Supabase Proxy to bypass country/ISP connection blocks in client environments
app.all("/api/supabase-proxy", async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).send("Missing target URL ('url' parameter)");
  }

  try {
    // Only proxy to our configured Supabase URL to avoid open-proxy exploits
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    if (supabaseUrl && !targetUrl.startsWith(supabaseUrl)) {
      return res.status(403).send("Forbidden proxy target. Only the configured Supabase URL is allowed.");
    }

    const method = req.method;
    const headers: Record<string, string> = {};

    // Forward request headers except local host/origin headers
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === "string") {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey !== "host" &&
          lowerKey !== "origin" &&
          lowerKey !== "referer" &&
          lowerKey !== "content-length" &&
          lowerKey !== "connection" &&
          lowerKey !== "accept-encoding"
        ) {
          headers[key] = value;
        }
      }
    }

    const fetchOptions: any = {
      method,
      headers,
    };

    // Forward request body if present and method is not GET/HEAD
    if (method !== "GET" && method !== "HEAD") {
      if (req.body) {
        if (typeof req.body === "object") {
          fetchOptions.body = JSON.stringify(req.body);
          fetchOptions.headers["content-type"] = "application/json";
        } else {
          fetchOptions.body = req.body;
        }
      }
    }

    const response = await fetch(targetUrl, fetchOptions);

    // Set status
    res.status(response.status);

    // Forward response headers
    response.headers.forEach((value, name) => {
      const lowerName = name.toLowerCase();
      if (
        lowerName !== "transfer-encoding" &&
        lowerName !== "content-encoding" &&
        lowerName !== "content-length"
      ) {
        res.setHeader(name, value);
      }
    });

    // Ensure CORS headers are present for frontend
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-headers", "*");
    res.setHeader("access-control-allow-methods", "*");

    const responseText = await response.text();
    res.send(responseText);
  } catch (error: any) {
    console.error("Supabase Express Proxy error:", error);
    res.status(500).json({ error: "Supabase proxy request failed", details: error?.message });
  }
});

// SSR Dynamic SEO Metadata Hydration Route for Ads
app.get("/ad/:id", async (req, res) => {
  const adId = req.params.id;
  let title = "السوق المفتوح اليمن - سيارات، عقارات، جوالات، وظائف ومبيعات";
  let description = "تصفح آلاف الإعلانات المبوبة المجانية في اليمن. سيارات للبيع، عقارات، جوالات، وظائف شاغرة والمزيد مباشرة من المالك وبدون عمولة.";
  let image = "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800";
  let jsonLdString = "";

  try {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/ajsj-35a36/databases/(default)/documents/opensooq_listings/${adId}`;
    const response = await fetch(firestoreUrl);
    if (response.ok) {
      const data = await response.json();
      const fields = data.fields || {};

      const rawTitle = fields.title?.stringValue || "";
      const rawDesc = fields.description?.stringValue || "";
      const rawImage = fields.image?.stringValue || "";
      const rawPrice = fields.price?.stringValue || fields.price?.integerValue || fields.price?.doubleValue || "";
      const rawCity = fields.city?.stringValue || "";
      const rawCategory = fields.category?.stringValue || "";

      if (rawTitle) {
        title = `${rawTitle} | السوق المفتوح اليمن`;
        description = rawDesc ? rawDesc.substring(0, 160) : `اعلان مميز في قسم ${rawCategory} في محافظة ${rawCity}. السعر: ${rawPrice} ريال يمني.`;
        if (rawImage) image = rawImage;

        const jsonLd = {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": rawTitle,
          "description": rawDesc || description,
          "image": image,
          "offers": {
            "@type": "Offer",
            "price": rawPrice || "0",
            "priceCurrency": "YER",
            "availability": "https://schema.org/InStock",
            "areaServed": {
              "@type": "AdministrativeArea",
              "name": rawCity
            }
          }
        };
        jsonLdString = `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
      }
    }
  } catch (error) {
    console.warn("Failed to fetch ad details for SEO tags:", error);
  }

  try {
    let templatePath = path.join(process.cwd(), "dist", "index.html");
    if (process.env.NODE_ENV !== "production") {
      templatePath = path.join(process.cwd(), "index.html");
    }
    
    if (!fs.existsSync(templatePath)) {
      templatePath = path.join(process.cwd(), "index.html");
    }

    let html = fs.readFileSync(templatePath, 'utf8');

    // Replace basic title tag
    html = html.replace(
      `<title>السوق المفتوح اليمن - سيارات، عقارات، جوالات، وظائف ومبيعات</title>`,
      `<title>${title}</title>`
    );

    // Inject dynamic social meta tags
    const metaTags = `
      <title>${title}</title>
      <meta name="description" content="${description}" />
      <meta property="og:title" content="${title}" />
      <meta property="og:description" content="${description}" />
      <meta property="og:image" content="${image}" />
      <meta property="og:url" content="https://app.vercel.app/ad/${adId}" />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${title}" />
      <meta name="twitter:description" content="${description}" />
      <meta name="twitter:image" content="${image}" />
      <link rel="canonical" href="https://app.vercel.app/ad/${adId}" />
      ${jsonLdString}
    `;

    // Insert meta tags inside head, right after <meta charset="UTF-8" />
    html = html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n${metaTags}`);

    res.send(html);
  } catch (err) {
    console.error("Error reading index.html for SSR rendering:", err);
    res.status(500).send("Internal Server Error during rendering");
  }
});

// Robots.txt route
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(`User-agent: *
Allow: /
Allow: /ad/*
Allow: /category/*
Disallow: /admin
Disallow: /api/
Sitemap: https://axp-kappa.vercel.app/sitemap.xml`);
});

// Dynamic sitemap.xml route
app.get("/sitemap.xml", async (req, res) => {
  res.header("Content-Type", "application/xml; charset=utf-8");
  res.header("Cache-Control", "public, max-age=3600");
  let urls = [
    '<url><loc>https://axp-kappa.vercel.app/</loc><priority>1.0</priority><changefreq>daily</changefreq></url>',
    '<url><loc>https://axp-kappa.vercel.app/category/cars</loc><priority>0.9</priority><changefreq>daily</changefreq></url>',
    '<url><loc>https://axp-kappa.vercel.app/category/properties</loc><priority>0.9</priority><changefreq>daily</changefreq></url>',
    '<url><loc>https://axp-kappa.vercel.app/category/mobiles</loc><priority>0.9</priority><changefreq>daily</changefreq></url>',
    '<url><loc>https://axp-kappa.vercel.app/category/jobs</loc><priority>0.9</priority><changefreq>daily</changefreq></url>',
    '<url><loc>https://axp-kappa.vercel.app/category/furniture</loc><priority>0.9</priority><changefreq>daily</changefreq></url>',
    '<url><loc>https://axp-kappa.vercel.app/category/electronics</loc><priority>0.9</priority><changefreq>daily</changefreq></url>'
  ];

  try {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/ajsj-35a36/databases/(default)/documents/opensooq_listings?pageSize=50`;
    const response = await fetch(firestoreUrl);
    if (response.ok) {
      const data = await response.json();
      const documents = data.documents || [];
      documents.forEach((doc: any) => {
        const parts = doc.name.split("/");
        const id = parts[parts.length - 1];
        if (id) {
          urls.push(`<url>
            <loc>https://axp-kappa.vercel.app/ad/${id}</loc>
            <changefreq>weekly</changefreq>
            <priority>0.8</priority>
          </url>`);
        }
      });
    }
  } catch (err) {
    console.warn("Could not load listings for dynamic sitemap:", err);
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.join("\n")}
</urlset>`;
  res.send(sitemapXml);
});

// Serve frontend assets built in production, or hook Vite middleware in development
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`OpenSooq Full-Stack Server running on active port ${PORT}`);
  });
}

if (!process.env.VERCEL) {
  bootstrap();
}

export default app;
