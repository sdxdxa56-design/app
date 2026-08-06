import { Ad } from './types';

export const INITIAL_ADS: Ad[] = [
  {
    id: '1',
    title: 'تويوتا هيلوكس 2021 دبل سعودي نظيف جداً كرت بضاعة',
    description: 'سيارة تويوتا هيلوكس موديل 2021، دبل، فل جير عادي، مجمركة مرتين وصالحة للاستخدام المباشر. مكينة مكفولة وجير كرت على الشرط. متواجد في صنعاء، حي حدة.',
    price: 18500000,
    category: 'cars',
    subcategory: 'سيارات للبيع',
    city: 'صنعاء',
    phone: '777123456',
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800',
    createdAt: 'منذ ساعتين',
    views: 142,
    isFeatured: true,
    ownerName: 'معرض الأمانة للسيارات'
  },
  {
    id: '2',
    title: 'شقة سكنية فاخرة للبيع في خور مكسر - إطلالة بحرية ساحرة',
    description: 'شقة سوبر ديلوكس تتكون من 4 غرف، حمامين، صالة كبيرة ومطبخ مجهز. تقع في مجمع سكني راقٍ بخور مكسر، مع موقف للسيارات وخزان مياه مستقل.',
    price: 45000000,
    category: 'properties',
    subcategory: 'شقق للبيع',
    city: 'عدن',
    phone: '733987654',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800',
    createdAt: 'منذ ٤ ساعات',
    views: 95,
    isFeatured: true,
    ownerName: 'مكتب عدن للعقارات'
  },
  {
    id: '3',
    title: 'آيفون 15 بروماكس 256 جيجا بايت كرتون وكالة بطارية 100%',
    description: 'جوال iPhone 15 Pro Max نظيف جداً وبدون أي خدوش. اللون تيتانيوم طبيعي، مع الكرتون وكافة الملحقات الأصلية. شاحن سريع هدية.',
    price: 320000,
    category: 'mobiles',
    subcategory: 'هواتف ذكية',
    city: 'صنعاء',
    phone: '775112233',
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=800',
    createdAt: 'منذ يوم واحد',
    views: 218,
    isFeatured: false,
    ownerName: 'اليمامة للاتصالات'
  },
  {
    id: '4',
    title: 'وظيفة شاغرة: محاسب مالي ذو خبرة لشركة تجارية كبرى بمدينة تعز',
    description: 'مطلوب محاسب مالي يحمل شهادة بكالوريوس ولديه خبرة لا تقل عن 3 سنوات في استخدام الأنظمة المحاسبية الحديثة (مثل نظام يمن سوفت). راتب مميز وحوافز.',
    price: 150000,
    category: 'jobs',
    subcategory: 'وظائف لاداريين ومحاسبين',
    city: 'تعز',
    phone: '711334455',
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800', // standard category
    createdAt: 'منذ ٣ أيام',
    views: 310,
    isFeatured: false,
    ownerName: 'مجموعة الهائل التجارية'
  },
  {
    id: '5',
    title: 'طاولة جلوس فخمة مع كراسي تركية مستوردة للمجالس والفلل',
    description: 'طاولة طعام خشب زان طبيعي مع 6 كراسي مبطنة مخمل فخم. مستوردة من تركيا بحالة ممتازة وشبه جديدة تليق بالمنازل الأنيقة والمجالس الفخمة.',
    price: 780000,
    category: 'furniture',
    subcategory: 'أثاث غرف جلوس',
    city: 'إب',
    phone: '770998877',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800',
    createdAt: 'منذ يومين',
    views: 54,
    isFeatured: false,
    ownerName: 'البيت الأنيق للأثاث'
  }
];
