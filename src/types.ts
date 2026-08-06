export interface Ad {
  id: string;
  title: string;
  description: string;
  price: number;
  currency?: string; // العملة (ريال يمني، ريال سعودي، دولار أمريكي)
  oldPrice?: number; // Support price drop tracking
  category: string;
  subcategory: string;
  city: string;
  phone: string;
  image: string;
  images?: string[]; // Support up to 5 uploaded images
  createdAt: string;
  views: number;
  phoneClicks?: number; // Clicks on "إظهار الرقم" (Show Phone Number)
  isFeatured?: boolean;
  ownerName: string;
  latitude?: number; // Google Maps Lat
  longitude?: number; // Google Maps Lng
  mapAddress?: string; // Descriptive landmark name
  waterMeter?: number; // Smart water meter reading (m³)
  electricityMeter?: number; // Smart electricity reading (kWh)
  status?: 'active' | 'expired'; // For republishing
  interestsCount?: number; // Buyers interested count
  expiresAt?: string; // ISO string
  isFreeAd?: boolean; // هل استخدم إعلانًا مجانيًا
  ownerVerified?: boolean; // هل حساب المالك موثق
}

export interface UserData {
  id?: string;
  phone: string;
  name: string;
  email?: string;
  userId: string;        // ID فريد
  balance: number;       // رصيد الوحدات (max 1000)
  freeAdsCount: number;  // الإعلانات المجانية المتبقية
  isVerified?: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon identifier
  color: string;
  subcategories: string[];
}

export interface SyncLog {
  timestamp: string;
  type: 'info' | 'success' | 'error';
  message: string;
}

export interface SyncStatus {
  isPushing: boolean;
  repoUrl?: string;
  success?: boolean;
  logs: SyncLog[];
}

export const YEMENI_CITIES = [
  'صنعاء',
  'عدن',
  'تعز',
  'المكلا',
  'إب',
  'الحديدة',
  'مأرب',
  'ذمار',
  'عمران',
  'شبوة',
  'حضرموت',
  'سيئون',
  'صعدة',
  'لحج',
  'أبين',
  'المهرة',
  'البيضاء',
  'حجة',
  'ريمة',
  'سقطرى',
  'الضالع'
];

export const CATEGORIES: Category[] = [
  {
    id: 'cars',
    name: 'سيارات ومركبات',
    icon: 'Car',
    color: 'bg-blue-50 text-blue-600 border-blue-100',
    subcategories: ['سيارات للبيع', 'سيارات للإيجار', 'قطع غيار واكسسوارات', 'دراجات نارية', 'شاحنات ومعدات ثقيلة']
  },
  {
    id: 'properties',
    name: 'عقارات للبيع والإيجار',
    icon: 'Home',
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    subcategories: ['شقق للبيع', 'شقق للإيجار', 'بيوت ومنازل للبيع', 'أراضي للبيع', 'عقارات تجارية']
  },
  {
    id: 'mobiles',
    name: 'موبايل وتابلت',
    icon: 'Smartphone',
    color: 'bg-purple-50 text-purple-600 border-purple-100',
    subcategories: ['هواتف ذكية', 'اكسسوارات موبايل', 'تابلت وأيباد', 'ساعات ذكية', 'قطع غيار موبايل']
  },
  {
    id: 'electronics',
    name: 'أجهزة وإلكترونيات',
    icon: 'Tv',
    color: 'bg-amber-50 text-amber-600 border-amber-100',
    subcategories: ['شاشات وتلفزيونات', 'أجهزة كمبيوتر ولابتوب', 'ثلاجات وغسالات', 'مكيفات وأجهزة تبريد', 'كاميرات وتصوير']
  },
  {
    id: 'jobs',
    name: 'وظائف وعمل',
    icon: 'Briefcase',
    color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    subcategories: ['وظائف لاداريين ومحاسبين', 'تسويق ومبيعات', 'تعليم وتدريس', 'تكنولوجيا ومعلومات', 'صحة وتمريض', 'باحثين عن عمل']
  },
  {
    id: 'furniture',
    name: 'مستلزمات منزل وحديقة',
    icon: 'Armchair',
    color: 'bg-orange-50 text-orange-600 border-orange-100',
    subcategories: ['أثاث غرف جلوس', 'أثاث غرف نوم', 'ديكورات وسجاد', 'أدوات مطبخ', 'أثاث حدائق']
  },
  {
    id: 'services',
    name: 'خدمات ومقاولات',
    icon: 'Wrench',
    color: 'bg-red-50 text-red-600 border-red-100',
    subcategories: ['صيانة منزلية', 'نقل عفش وتوصيل', 'دروس خصوصية', 'تنظيف ومكافحة حشرات', 'خدمات طبية وجمالية']
  },
  {
    id: 'pets',
    name: 'حيوانات أليفة',
    icon: 'PawPrint',
    color: 'bg-teal-50 text-teal-600 border-teal-100',
    subcategories: ['كلاب', 'قطط', 'طيور', 'أسماك وزينة', 'مستلزمات حيوانات أليفة']
  },
  {
    id: 'fashion',
    name: 'أزياء وموضة وملابس',
    icon: 'Shirt',
    color: 'bg-pink-50 text-pink-600 border-pink-100',
    subcategories: ['ملابس رجالية', 'ملابس نسائية', 'ملابس أطفال', 'ساعات وإكسسوارات', 'أحذية وحقائب']
  },
  {
    id: 'games',
    name: 'ألعاب وبلايستيشن',
    icon: 'Gamepad2',
    color: 'bg-cyan-50 text-cyan-600 border-cyan-100',
    subcategories: ['بلايستيشن وصيانة الكونسول', 'ألعاب فيديو وبطاقات', 'إكسسوارات ألعاب', 'طاولات بلياردو وفيس بوك']
  }
];

export interface CarBrand {
  id: string;
  nameAr: string;
  nameEn: string;
  models?: string[];
}

export const CAR_BRANDS: CarBrand[] = [
  { id: 'toyota', nameAr: 'تويوتا', nameEn: 'Toyota', models: ['كامري', 'كورولا', 'لاند كروزر', 'هيلوكس', 'يارس', 'راف4', 'فورنتشر', 'شاص', 'اف جي', 'برادو', 'أفالون', 'تاكوما', 'سيكويا', 'هايبريد'] },
  { id: 'hyundai', nameAr: 'هيونداي', nameEn: 'Hyundai', models: ['سوناتا', 'افانتي / النترا', 'اكسنت', 'سنتافي', 'توسان', 'ازيرا', 'كريتا', 'تراكان'] },
  { id: 'kia', nameAr: 'كيا', nameEn: 'Kia', models: ['سيراتو / فورتي', 'بيكانتو', 'سبورتاج', 'سورينتو', 'كادينزا / K5', 'ريو', 'اوبتيما', 'سيلتوس'] },
  { id: 'nissan', nameAr: 'نيسان', nameEn: 'Nissan', models: ['باترول', 'صني', 'التيما', 'مكسيما', 'قشقاي', 'إكس ترايل', 'نافارا', 'تيدا', 'سنترا'] },
  { id: 'mercedes', nameAr: 'مرسيدس بنز', nameEn: 'Mercedes-Benz', models: ['E-Class', 'C-Class', 'S-Class', 'G-Class', 'GLE', 'GLC', 'CLA', 'شاحنات مرسيدس'] },
  { id: 'bmw', nameAr: 'بي إم دبليو', nameEn: 'BMW', models: ['الفئة الثالثة', 'الفئة الخامسة', 'الفئة السابعة', 'X5', 'X6', 'X3', 'M5'] },
  { id: 'lexus', nameAr: 'لكزس', nameEn: 'Lexus', models: ['LX 570 / 600', 'ES', 'LS', 'RX', 'GX', 'IS', 'NX'] },
  { id: 'ford', nameAr: 'فورد', nameEn: 'Ford', models: ['اف 150', 'موستانج', 'إكسبلورر', 'إكسبديشن', 'تورس', 'إدج', 'رينجر', 'كرون فيكتوريا'] },
  { id: 'chevrolet', nameAr: 'شيفروليه', nameEn: 'Chevrolet', models: ['تاهو', 'سيلفرادو', 'كابريس', 'كامارو', 'ماليبو', 'ترافيرس', 'سوبربان', 'أفيو'] },
  { id: 'honda', nameAr: 'هوندا', nameEn: 'Honda', models: ['أكورد', 'سيفيك', 'سي آر في (CR-V)', 'البريلود', 'أوديسي'] },
  { id: 'mitsubishi', nameAr: 'ميتسوبيشي', nameEn: 'Mitsubishi', models: ['باجيرو', 'لانسر', 'L200', 'أوتلاندر', 'إكليبس', 'مونتيرو'] },
  { id: 'mazda', nameAr: 'مازدا', nameEn: 'Mazda', models: ['مازدا 6', 'مازدا 3', 'CX-5', 'CX-9', 'CX-30', 'BT-50'] },
  { id: 'suzuki', nameAr: 'سوزوكي', nameEn: 'Suzuki', models: ['جيمني', 'فيتاارا', 'سويفت', 'سياز', 'أرتيغا', 'جراند فيتارا'] },
  { id: 'gmc', nameAr: 'جي إم سي', nameEn: 'GMC', models: ['يوكن', 'سييرا', 'أكاديا', 'تيرين', 'سافانا'] },
  { id: 'dodge', nameAr: 'دودج', nameEn: 'Dodge', models: ['تشارجر', 'تشالنجر', 'دورانجو', 'رام', 'نيترو'] },
  { id: 'jeep', nameAr: 'جيب', nameEn: 'Jeep', models: ['جراند شيروكي', 'رنجلر', 'شيروكي', 'كومباس', 'جلادياتور'] },
  { id: 'landrover', nameAr: 'لاند روفر', nameEn: 'Land Rover', models: ['رينج روفر', 'رينج روفر سبورت', 'ديفندر', 'ديسكفري', 'إيفوك'] },
  { id: 'audi', nameAr: 'أودي', nameEn: 'Audi', models: ['A4', 'A6', 'A8', 'Q7', 'Q5', 'Q8', 'RS'] },
  { id: 'volkswagen', nameAr: 'فولكس واجن', nameEn: 'Volkswagen', models: ['طوارق', 'تيجوان', 'جولف', 'باسات', 'بولو', 'أرتيون'] },
  { id: 'porsche', nameAr: 'بورش', nameEn: 'Porsche', models: ['كايين', 'باناميرا', '911', 'ماكان', 'تايكان'] },
  { id: 'cadillac', nameAr: 'كاديلاك', nameEn: 'Cadillac', models: ['إسكاليد', 'CTS', 'XT5', 'XT6', 'CT5'] },
  { id: 'lincoln', nameAr: 'لينكون', nameEn: 'Lincoln', models: ['نافيجيتور', 'أفياتور', 'تاون كار', 'مكيز'] },
  { id: 'chrysler', nameAr: 'كرايسلر', nameEn: 'Chrysler', models: ['300C', 'باسيفيكا', 'تاون اند كاونتري'] },
  { id: 'infiniti', nameAr: 'إنفينيتي', nameEn: 'Infiniti', models: ['QX80', 'QX60', 'Q50', 'FX35 / FX50'] },
  { id: 'acura', nameAr: 'أكورا', nameEn: 'Acura', models: ['MDX', 'RDX', 'TLX'] },
  { id: 'genesis', nameAr: 'جينيسيس', nameEn: 'Genesis', models: ['G80', 'G90', 'GV80', 'GV70'] },
  { id: 'subaru', nameAr: 'سوبارو', nameEn: 'Subaru', models: ['فورستر', 'أوتباك', 'إمبريزا', 'XV'] },
  { id: 'isuzu', nameAr: 'إيسوزو', nameEn: 'Isuzu', models: ['ديماكس (D-Max)', 'إم يو أكس (MU-X)', 'شاحنات إيسوزو'] },
  { id: 'daihatsu', nameAr: 'دايهاستو', nameEn: 'Daihatsu', models: ['تيريوس', 'سيريون', 'روكي'] },
  { id: 'peugeot', nameAr: 'بيجو', nameEn: 'Peugeot', models: ['508', '3008', '5008', '208'] },
  { id: 'renault', nameAr: 'رينو', nameEn: 'Renault', models: ['داستر', 'كوليوس', 'ميجان', 'سيمبول'] },
  { id: 'fiat', nameAr: 'فيات', nameEn: 'Fiat', models: ['500', 'تيبو', 'فلورينو'] },
  { id: 'volvo', nameAr: 'فولفو', nameEn: 'Volvo', models: ['XC90', 'XC60', 'S90', 'S60'] },
  { id: 'mg', nameAr: 'إم جي', nameEn: 'MG', models: ['MG RX5', 'MG ZS', 'MG 6', 'MG GT', 'MG HS', 'MG RX8'] },
  { id: 'geely', nameAr: 'جيلي', nameEn: 'Geely', models: ['توجيلا', 'مونجارو', 'كولراي', 'إمجراند', 'أوكافانجو'] },
  { id: 'changan', nameAr: 'شانجان', nameEn: 'Changan', models: ['CS95', 'CS75 Plus', 'CS35 Plus', 'إيدو Plus', 'ألسفن', 'UNI-K', 'UNI-T', 'HUNTER'] },
  { id: 'haval', nameAr: 'هافال', nameEn: 'Haval', models: ['H9', 'H6', 'جوليان', 'دارغو'] },
  { id: 'chery', nameAr: 'شيري', nameEn: 'Chery', models: ['تيجو 8 برو', 'تيجو 7 برو', 'تيجو 4 برو', 'أريزو 6'] },
  { id: 'greatwall', nameAr: 'جريت وول', nameEn: 'Great Wall', models: ['باور Wingle', 'تانك 300'] },
  { id: 'byd', nameAr: 'بي واي دي', nameEn: 'BYD', models: ['هان', 'تانغ', 'أتو 3', 'سونغ برو', 'F3'] },
  { id: 'jac', nameAr: 'جاك', nameEn: 'JAC', models: ['JS4', 'JS3', 'T8'] },
  { id: 'jetour', nameAr: 'جيتور', nameEn: 'Jetour', models: ['X70', 'X90', 'داشينغ', 'T2'] },
  { id: 'hongqi', nameAr: 'هونغ تشي', nameEn: 'Hongqi', models: ['H9', 'HS5', 'E-HS9'] },
  { id: 'gac', nameAr: 'جي إيه سي', nameEn: 'GAC', models: ['GS8', 'GA8', 'GS4'] },
  { id: 'exeed', nameAr: 'إكسيد', nameEn: 'Exeed', models: ['VX', 'TXL', 'LX'] },
  { id: 'tank', nameAr: 'تانك', nameEn: 'Tank', models: ['300', '500'] },
  { id: 'baic', nameAr: 'بايك', nameEn: 'BAIC', models: ['BJ40', 'BJ80', 'X35'] },
  { id: 'dongfeng', nameAr: 'دونغ فينغ', nameEn: 'Dongfeng', models: ['AX7', 'A60'] },
  { id: 'foton', nameAr: 'فوتون', nameEn: 'Foton', models: ['تونلاند', 'شاحنات فوتون'] },
  { id: 'tesla', nameAr: 'تيسلا', nameEn: 'Tesla', models: ['Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck'] },
  { id: 'jaguar', nameAr: 'جاكوار', nameEn: 'Jaguar', models: ['F-Pace', 'XJ', 'XF'] },
  { id: 'maserati', nameAr: 'مازيراتي', nameEn: 'Maserati', models: ['جيبلي', 'ليفانتي', 'كواتروبورتي'] },
  { id: 'ferrari', nameAr: 'فيراري', nameEn: 'Ferrari', models: ['F8', 'Roma', '488'] },
  { id: 'lamborghini', nameAr: 'لامبورغيني', nameEn: 'Lamborghini', models: ['أوروس', 'هوركان', 'افينتادور'] },
  { id: 'bentley', nameAr: 'بنتلي', nameEn: 'Bentley', models: ['بينتايغا', 'كونتيننتال'] },
  { id: 'rollsroyce', nameAr: 'رولز رويس', nameEn: 'Rolls-Royce', models: ['كولينان', 'فانتوم', 'جوست'] },
  { id: 'astonmartin', nameAr: 'أستون مارتن', nameEn: 'Aston Martin', models: ['DBX', 'DBS'] },
  { id: 'bugatti', nameAr: 'بوغاتي', nameEn: 'Bugatti', models: ['شيرون'] },
  { id: 'mclaren', nameAr: 'مكلارين', nameEn: 'McLaren', models: ['720S', 'Artura'] },
  { id: 'alfaromeo', nameAr: 'ألفا روميو', nameEn: 'Alfa Romeo', models: ['ستيلفيو', 'جوليا'] },
  { id: 'mini', nameAr: 'ميني', nameEn: 'Mini', models: ['كوبر', 'كونتري مان'] },
  { id: 'skoda', nameAr: 'شكودا', nameEn: 'Skoda', models: ['كودياك', 'أوكتافيا', 'سوبرب'] },
  { id: 'seat', nameAr: 'سيات', nameEn: 'SEAT', models: ['ليون', 'أتيكا'] },
  { id: 'opel', nameAr: 'أوبل', nameEn: 'Opel', models: ['أسترا', 'إنسيغنيا', 'موكا'] },
  { id: 'ssangyong', nameAr: 'سانغ يونغ', nameEn: 'SsangYong', models: ['ركستون', 'كوراندو', 'تيفولي'] },
  { id: 'daewoo', nameAr: 'دايو', nameEn: 'Daewoo', models: ['ماتيز', 'سييلو', 'لاسيوتي', 'نوبيرا'] },
  { id: 'hummer', nameAr: 'همر', nameEn: 'Hummer', models: ['H2', 'H3', 'Hummer EV'] },
  { id: 'lada', nameAr: 'لادا', nameEn: 'Lada', models: ['نيفا', 'جرانتا'] },
  { id: 'othercars', nameAr: 'ماركات سيارات أخرى', nameEn: 'Other Car Brands' },
];

export interface CategoryNode {
  id: string;
  nameAr: string;
  nameEn: string;
  children?: CategoryNode[];
}

export const CATEGORIES_TREE: CategoryNode[] = [
  {
    id: 'cars',
    nameAr: 'سيارات ومركبات',
    nameEn: 'Cars & Vehicles',
    children: [
      { 
        id: 'cars-for-sale', 
        nameAr: 'سيارات للبيع', 
        nameEn: 'Cars for Sale', 
        children: CAR_BRANDS.map(brand => ({
          id: brand.id,
          nameAr: brand.nameAr,
          nameEn: brand.nameEn,
          children: brand.models?.map((model, idx) => ({
            id: `${brand.id}-${idx}`,
            nameAr: model,
            nameEn: model,
          }))
        }))
      },
      { id: 'cars-for-rent', nameAr: 'سيارات للإيجار', nameEn: 'Cars for Rent' },
      { id: 'auto-parts', nameAr: 'قطع غيار واكسسوارات', nameEn: 'Auto Parts & Accessories' },
      { id: 'motorcycles', nameAr: 'دراجات نارية', nameEn: 'Motorcycles' },
      { id: 'trucks', nameAr: 'شاحنات ومعدات ثقيلة', nameEn: 'Trucks & Heavy Equipment' },
    ]
  },
  {
    id: 'properties',
    nameAr: 'عقارات',
    nameEn: 'Real Estate',
    children: [
      { id: 'properties-for-sale', nameAr: 'عقارات للبيع', nameEn: 'For Sale', children: [
        { id: 'apartments-sale', nameAr: 'شقق للبيع', nameEn: 'Apartments' },
        { id: 'villas-sale', nameAr: 'فلل للبيع', nameEn: 'Villas' },
        { id: 'lands-sale', nameAr: 'أراضي للبيع', nameEn: 'Lands' },
      ]},
      { id: 'properties-for-rent', nameAr: 'عقارات للإيجار', nameEn: 'For Rent', children: [
        { id: 'apartments-rent', nameAr: 'شقق للإيجار', nameEn: 'Apartments' },
        { id: 'commercial-rent', nameAr: 'محلات للإيجار', nameEn: 'Shops' },
      ]},
    ]
  },
  {
    id: 'electronics',
    nameAr: 'إلكترونيات',
    nameEn: 'Electronics',
    children: [
      { id: 'mobiles', nameAr: 'موبايل وتابلت', nameEn: 'Mobiles & Tablets', children: [
        { id: 'iphone', nameAr: 'ايفون', nameEn: 'iPhone' },
        { id: 'samsung', nameAr: 'سامسونج', nameEn: 'Samsung' },
      ]},
      { id: 'computers', nameAr: 'لابتوب وكمبيوتر', nameEn: 'Computers & Laptops' },
      { id: 'home-appliances', nameAr: 'أجهزة منزلية', nameEn: 'Home Appliances' },
    ]
  },
  {
    id: 'jobs',
    nameAr: 'وظائف',
    nameEn: 'Jobs',
    children: [
      { id: 'sales', nameAr: 'مندوب مبيعات', nameEn: 'Sales Rep' },
      { id: 'secretary', nameAr: 'سكرتيرة', nameEn: 'Secretary' },
      { id: 'driver', nameAr: 'سائق توصيل', nameEn: 'Driver' },
      { id: 'chef', nameAr: 'شيف - طباخ', nameEn: 'Chef' },
    ]
  },
  {
    id: 'fashion',
    nameAr: 'موضة وأطفال',
    nameEn: 'Fashion & Kids',
    children: [
      { id: 'men', nameAr: 'رجال', nameEn: 'Men' },
      { id: 'women', nameAr: 'نساء', nameEn: 'Women' },
      { id: 'kids', nameAr: 'أطفال', nameEn: 'Kids' },
    ]
  },
];
