export type Locale = 'en' | 'ar';

export const company = {
  name: 'Dar Al Shams',
  phoneDisplay: '+971 50 791 7947',
  phoneE164: '971507917947',
  email: 'connectdaralshams@gmail.com',
  location: 'Sharjah, Dubai, UAE'
};

// Draft service areas based on labels/workflows found in the ERP.
// Management must approve exact public wording before campaigns go live.
export const services = [
  { id: 'documents', icon: 'files', en: 'Document Clearance Support', ar: 'دعم تخليص المستندات', descEn: 'Speak with our team about your document processing requirements.', descAr: 'تواصل مع فريقنا لمناقشة متطلبات معالجة مستنداتك.' },
  { id: 'visa', icon: 'passport', en: 'Visa & Residence Support', ar: 'دعم التأشيرات والإقامة', descEn: 'Enquire about visa and residence-related processing support.', descAr: 'استفسر عن خدمات دعم إجراءات التأشيرات والإقامة.' },
  { id: 'identity', icon: 'id', en: 'Emirates ID Support', ar: 'دعم الهوية الإماراتية', descEn: 'Ask our team about Emirates ID-related service requirements.', descAr: 'اسأل فريقنا عن متطلبات خدمات الهوية الإماراتية.' },
  { id: 'renewals', icon: 'refresh', en: 'Renewals & Cancellations', ar: 'التجديد والإلغاء', descEn: 'Discuss renewal or cancellation requirements with our team.', descAr: 'ناقش متطلبات التجديد أو الإلغاء مع فريقنا.' }
];

export const copy = {
  en: {
    eyebrow: 'DOCUMENTS CLEARING SERVICES',
    title: 'Clear processes.\nConfident next steps.',
    intro: 'Talk to Dar Al Shams about your document clearance needs. Our team can help you understand the next steps for your enquiry.',
    primary: 'Get a consultation',
    secondary: 'Explore services',
    trust: 'A responsive team · Clear communication · Enquiry-led support',
    servicesEyebrow: 'HOW WE CAN HELP',
    servicesTitle: 'Services built around your needs',
    servicesIntro: 'Tell us what you need. We will confirm the relevant service, requirements and next steps with you.',
    processEyebrow: 'A SIMPLE PROCESS',
    processTitle: 'From enquiry to next steps',
    steps: [['Share your requirement', 'Tell us which service you need and how to reach you.'], ['Our team reviews it', 'We follow up to clarify requirements and availability.'], ['Understand the next steps', 'Receive guidance on the process and any confirmed quotation.']],
    promoEyebrow: 'PERSONAL SUPPORT',
    promoTitle: 'Not sure where to start?',
    promoBody: 'Send us your question on WhatsApp or request a call. We will help route your enquiry to the right person.',
    contactTitle: 'Let’s discuss your requirements',
    contactBody: 'Share a few details and our team can follow up with you.',
    name: 'Full name', phone: 'Phone / WhatsApp', service: 'Service of interest', message: 'How can we help?', submit: 'Send enquiry',
    choose: 'Choose a service', privacy: 'By submitting, you agree that Dar Al Shams may use these details to respond to your enquiry. Do not submit passport, Emirates ID or other sensitive documents through this form.',
    success: 'Thank you. Your enquiry has been received.', error: 'We could not submit your enquiry right now. Please contact us by phone or WhatsApp.',
    footer: 'Documents Clearing Services', about: 'Practical support, clear communication.', services: 'Services', contact: 'Contact', call: 'Call us', whatsapp: 'Chat on WhatsApp',
    language: 'العربية', location: 'Sharjah, Dubai, UAE', rights: 'All rights reserved.',
    note: 'Service details and eligibility are confirmed individually. Processing times and outcomes depend on the relevant authority and case.'
  },
  ar: {
    eyebrow: 'خدمات تخليص المستندات',
    title: 'إجراءات واضحة.\nوخطواتك القادمة بثقة.',
    intro: 'تواصل مع دار الشمس بشأن احتياجات تخليص المستندات. يمكن لفريقنا مساعدتك في فهم الخطوات التالية لاستفسارك.',
    primary: 'طلب استشارة',
    secondary: 'استكشف الخدمات',
    trust: 'فريق متجاوب · تواصل واضح · دعم حسب احتياجك',
    servicesEyebrow: 'كيف يمكننا مساعدتك',
    servicesTitle: 'خدمات تناسب احتياجاتك',
    servicesIntro: 'أخبرنا بما تحتاجه وسنؤكد معك الخدمة المناسبة والمتطلبات والخطوات التالية.',
    processEyebrow: 'خطوات بسيطة',
    processTitle: 'من الاستفسار إلى الخطوات التالية',
    steps: [['شارك متطلباتك', 'أخبرنا بالخدمة التي تحتاجها وكيفية التواصل معك.'], ['يراجع فريقنا طلبك', 'نتابع معك لتوضيح المتطلبات ومدى التوفر.'], ['تعرّف على الخطوات التالية', 'احصل على إرشادات حول الإجراءات وأي عرض سعر مؤكد.']],
    promoEyebrow: 'دعم شخصي',
    promoTitle: 'لست متأكداً من أين تبدأ؟',
    promoBody: 'أرسل سؤالك عبر واتساب أو اطلب اتصالاً. سنساعد في توجيه استفسارك إلى الشخص المناسب.',
    contactTitle: 'دعنا نناقش متطلباتك',
    contactBody: 'شارك بعض التفاصيل ليتمكن فريقنا من التواصل معك.',
    name: 'الاسم الكامل', phone: 'الهاتف / واتساب', service: 'الخدمة المطلوبة', message: 'كيف يمكننا مساعدتك؟', submit: 'إرسال الاستفسار',
    choose: 'اختر الخدمة', privacy: 'بإرسال النموذج، توافق على استخدام دار الشمس لهذه البيانات للرد على استفسارك. لا ترسل جواز السفر أو الهوية الإماراتية أو أي مستندات حساسة عبر هذا النموذج.',
    success: 'شكراً لك. تم استلام استفسارك.', error: 'تعذر إرسال الاستفسار حالياً. يرجى التواصل معنا هاتفياً أو عبر واتساب.',
    footer: 'خدمات تخليص المستندات', about: 'دعم عملي وتواصل واضح.', services: 'الخدمات', contact: 'تواصل معنا', call: 'اتصل بنا', whatsapp: 'تواصل عبر واتساب',
    language: 'English', location: 'الشارقة، دبي، الإمارات العربية المتحدة', rights: 'جميع الحقوق محفوظة.',
    note: 'يتم تأكيد تفاصيل الخدمة والأهلية لكل حالة. تعتمد أوقات المعالجة والنتائج على الجهة المختصة والحالة.'
  }
} as const;