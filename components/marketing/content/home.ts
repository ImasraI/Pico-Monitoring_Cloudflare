import type { FAQ } from './types';
export const homeAssets = {
 dashboard:{src:'/assets/home/dashboard-list.webp',alt:'نمای PM Dashboard از HTML مرجع با داده‌های ناشناس نمایشی',width:1425,height:941},
 detail:{src:'/assets/home/dashboard-detail.webp',alt:'پرونده و یادداشت‌های نمونه در رابط مرجع PM Dashboard',width:1439,height:950},
 app:{src:'/assets/home/app-home.webp',alt:'صفحه خانه PM App از رابط مرجع، با اطلاعات نمونه',width:360,height:772},
 roadmap:{src:'/assets/home/app-roadmap.webp',alt:'نقشه راه نمونه درمان از رابط مرجع PM App',width:360,height:772},
 kids:{src:'/assets/home/kids-home.webp',alt:'PM Kids با picoori، فعالیت‌های روزانه و ستاره‌های نمونه',width:360,height:772},
 picoori:{src:'/assets/home/picoori-original.webp',alt:'شخصیت اصلی picoori از فایل مرجع PM Kids',width:980,height:1225},
 hardware:{src:'/assets/scanbox/hero.webp',alt:'ماکاپ موقت PM ScanBoxᴾʳᵒ، قابل جایگزینی با تصویر نهایی',width:1024,height:1024},
 packaging:{src:'/assets/scanbox/packaging.webp',alt:'ماکاپ موقت بسته‌بندی PM ScanBoxᴾʳᵒ',width:1024,height:1024},
 clinical:{src:'/assets/scanbox/clinical-front.webp',alt:'مدل دندانی برای نمایش مفهومی تنظیم کادر و روشنایی',width:640,height:640},
} as const;
export type HomeAsset = keyof typeof homeAssets;
export const homeProcess: {title:string;body:string;icon:string;asset:HomeAsset}[] = [
 {title:'ثبت تصویر از خانه',body:'بیمار پس از دریافت آموزش اولیه، با استفاده از PM ScanBoxᴾʳᵒ و راهنمای درون‌برنامه‌ای، تصاویر موردنیاز را در زمان‌های تعیین‌شده ثبت می‌کند.',icon:'camera',asset:'app'},
 {title:'استانداردسازی با هوش مصنوعی',body:'تصاویر ثبت‌شده با کمک هوش مصنوعی از نظر کادر، زاویه و نور تنظیم می‌شوند تا امکان مقایسه منظم‌تر تصاویر در دوره‌های مختلف فراهم شود.',icon:'target',asset:'clinical'},
 {title:'بررسی در داشبورد پزشک',body:'تصاویر ارسالی، سوابق پایش و اطلاعات مرتبط با بیمار در داشبورد اختصاصی ارتودنتیست در دسترس قرار می‌گیرند.',icon:'eye',asset:'detail'},
 {title:'تصمیم و پیگیری',body:'ارتودنتیست تصاویر را بررسی می‌کند و بر اساس شرایط بیمار، درباره ارسال راهنمایی، ادامه پیگیری از راه دور یا ضرورت مراجعه حضوری تصمیم می‌گیرد.',icon:'message',asset:'dashboard'},
];
export const homeProducts = [
 {name:'PM ScanBoxᴾʳᵒ',kind:'hardware',title:'یک تصویر بهتر، یک پیگیری روشن‌تر.',body:'ثبت تصاویر قابل‌استفاده برای پایش از خانه آغاز می‌شود. PM ScanBoxᴾʳᵒ در کنار تلفن همراه و راهنمای اپلیکیشن به بیمار کمک می‌کند تصاویر داخل‌دهانی موردنیاز را با چارچوب مشخصی تهیه کند.',to:'/scanbox',cta:'آشنایی با PM ScanBoxᴾʳᵒ'},
 {name:'PM Dashboard',kind:'dashboard',title:'اطلاعات منظم‌تر، تصمیم‌های آگاهانه‌تر.',body:'از مشاهده تصاویر و تاریخچه اسکن‌ها تا مدیریت پیگیری بیماران و ارتباط با آن‌ها، PM Dashboard اطلاعات موردنیاز ارتودنتیست را در یک محیط اختصاصی گرد هم می‌آورد.',to:'/dashboard',cta:'کشف امکانات PM Dashboard'},
 {name:'PM App',kind:'app',title:'پیگیری درمان، همراه بیمار.',body:'PM App مسیر ارتباط بیمار با برنامه پایش را ساده‌تر می‌کند. یادآوری اسکن‌ها، مشاهده روند درمان، دریافت پیام پزشک و دسترسی به آموزش‌های مرتبط، در یک اپلیکیشن قرار می‌گیرند.',to:'/app',cta:'آشنایی با PM App'},
 {name:'PM Kids',kind:'kids',title:'ماجراجویی لبخند، همراه picoori',body:'',to:'/kids',cta:'آشنایی با PM Kids'},
];
export const homeValues: {title:string;body:string;asset:HomeAsset}[] = [
 {title:'مراجعات حضوری هدفمندتر',body:'وقتی وضعیت بیمار در فاصله بین جلسات قابل بررسی باشد، ارتودنتیست می‌تواند با اطلاعات بیشتری درباره نیاز به مراجعه حضوری تصمیم بگیرد. هدف، حذف معاینات ضروری نیست؛ بلکه کاهش مراجعاتی است که پیگیری آن‌ها الزاماً به حضور بیمار نیاز ندارد.',asset:'detail'},
 {title:'مدیریت بهتر زمان و ظرفیت مطب',body:'انتقال بخشی از پیگیری‌های قابل انجام به فضای دیجیتال می‌تواند فرصت بیشتری برای اقدامات کلینیکی و بیمارانی فراهم کند که حضورشان در مطب ضروری است.',asset:'dashboard'},
 {title:'پیگیری و آموزش متناسب با بیمار',body:'از یادآوری‌های دوره‌ای تا ارسال پیام و محتوای آموزشی، Pico Monitoring امکان سازمان‌دهی ارتباطات و راهنمایی بیماران را متناسب با شرایط درمان فراهم می‌کند.',asset:'app'},
];
export const homeTreatments = [
 {title:'الاینر شفاف',body:'ثبت تصاویر دوره‌ای، پیگیری وضعیت درمان و ارتباط با بیمار در فاصله بین جلسات حضوری.',icon:'aligner'},
 {title:'براکت ثابت',body:'پیگیری تصویری وضعیت بیمار و فراهم‌کردن امکان ارسال راهنمایی و آموزش‌های مرتبط با مراقبت از دستگاه‌های ثابت.',icon:'braces'},
 {title:'پلاک متحرک',body:'پیگیری منظم و ارتباط با بیمار برای کمک به رعایت برنامه درمان و مراقبت از پلاک.',icon:'aligner'},
 {title:'دوره نگهداری',body:'حفظ ارتباط و پیگیری بیمار پس از پایان فاز فعال درمان، مطابق برنامه تعیین‌شده توسط ارتودنتیست.',icon:'check'},
];
export const homeFAQ: FAQ[] = [
 {id:'home-visits',category:'عمومی',question:'آیا Pico Monitoring جایگزین جلسات حضوری ارتودنسی می‌شود؟',answer:'خیر. Pico Monitoring برای تکمیل فرآیند پیگیری بین جلسات حضوری طراحی شده است. نیاز به معاینه یا اقدام بالینی حضوری بر اساس نظر ارتودنتیست تعیین می‌شود.'},
 {id:'home-treatment',category:'عمومی',question:'آیا Pico Monitoring فقط برای درمان با الاینر شفاف است؟',answer:'خیر. این راهکار می‌تواند متناسب با نوع درمان و پروتکل ارتودنتیست در درمان‌های الاینر شفاف، براکت ثابت، پلاک متحرک و دوره نگهداری استفاده شود.'},
 {id:'home-ai',category:'عمومی',question:'آیا هوش مصنوعی به‌جای ارتودنتیست تصمیم می‌گیرد؟',answer:'خیر. هوش مصنوعی به استانداردسازی و آماده‌سازی اطلاعات تصویری برای پایش کمک می‌کند. بررسی بالینی و تصمیم‌گیری درباره درمان در اختیار ارتودنتیست است.'},
 {id:'home-contact',category:'عمومی',question:'چگونه می‌توان همکاری با Pico Monitoring را آغاز کرد؟',answer:'ارتودنتیست‌ها می‌توانند از طریق راه‌های ارتباطی سایت با تیم Pico Monitoring تماس بگیرند و برای دریافت اطلاعات بیشتر و هماهنگی جلسه معرفی مجازی اقدام کنند.'},
];
