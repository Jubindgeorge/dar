/* Basic EN/AR interface labels. Print-preview surfaces are deliberately excluded. */
(function () {
  const labels = {
    'WORKSPACE':'مساحة العمل','CRM':'إدارة العملاء','OPERATIONS':'العمليات','SALES':'المبيعات','PURCHASE':'المشتريات','ACCOUNTING':'المحاسبة','ALERTS':'التنبيهات',
    'Dashboard':'لوحة التحكم','Companies & Clients':'الشركات والعملاء','Company Staff Data':'بيانات موظفي الشركة','Works Directory':'دليل الأعمال',
    'Services & Tariffs':'الخدمات والتعرفة','PRO Work Tracking':'متابعة أعمال العلاقات الحكومية','Completed Files':'الملفات المكتملة',
    'Invoices & Quotations':'الفواتير وعروض الأسعار','+ Create Invoice':'إنشاء فاتورة +','+ Create Quotation':'إنشاء عرض سعر +',
    'Purchases & Suppliers':'المشتريات والموردون','Accounts & Ledger':'الحسابات ودفتر الأستاذ','Notification Center':'مركز الإشعارات',
    'Staff ID':'رقم الموظف','Name':'الاسم','Company':'الشركة','Last Work Done':'آخر عمل منجز','Visa Expiry':'انتهاء التأشيرة',
    'Passport Expiry':'انتهاء جواز السفر','Renewal Status':'حالة التجديد','Actions':'الإجراءات','All companies':'جميع الشركات',
    '+ Add Staff':'إضافة موظف +','All Companies':'كل الشركات','Add Staff':'إضافة موظف','Full Name *':'الاسم الكامل *',
    'Nationality':'الجنسية','Designation / Position':'المسمى الوظيفي','Passport Number':'رقم جواز السفر','Visa Number':'رقم التأشيرة',
    'Visa Status':'حالة التأشيرة','Joining Date':'تاريخ الانضمام','Contact Number':'رقم الاتصال','Email':'البريد الإلكتروني',
    'Notes':'ملاحظات','Save Staff':'حفظ الموظف','Cancel':'إلغاء','Edit':'تعديل','Unpaid':'غير مدفوع','Partial':'مدفوع جزئياً',
    'Paid':'مدفوع','Pending':'قيد الانتظار','Due Soon':'مستحق قريباً','In Progress':'قيد التنفيذ','Renewed':'تم التجديد',
    'Expired':'منتهي الصلاحية','Not Required':'غير مطلوب','Client Name':'اسم العميل','Company Name':'اسم الشركة',
    'Contact Person Name':'اسم الشخص المسؤول','+ New Client':'عميل جديد +','Complete Staff Details':'إكمال بيانات الموظف',
    'Supplier':'المورد','Bill / Reference':'الفاتورة / المرجع','Date':'التاريخ','Description':'الوصف','Amount (AED)':'المبلغ (درهم)',
    'Payment Status':'حالة الدفع','+ Add Supplier':'إضافة مورد +','+ Record Purchase':'تسجيل مشتريات +',
    'Recorded Purchases':'إجمالي المشتريات المسجلة','Add Supplier':'إضافة مورد','Record Purchase':'تسجيل مشتريات',
    'Supplier Name *':'اسم المورد *','Contact Person':'الشخص المسؤول','Phone':'الهاتف','Save Supplier':'حفظ المورد',
    'Purchase Date *':'تاريخ الشراء *','Amount (AED) *':'المبلغ (درهم) *','Save Purchase':'حفظ المشتريات'
  };
  const skip = '#document-preview-modal, #a4-wrapper-element, .invoice-document, .quotation-document, .preview-modal-body-canvas';
  function translate(language) {
    document.querySelectorAll('.sidebar, .top-bar, #tab-staff, #tab-purchases, #tab-clients, #tab-documents, #tab-works, #tab-services-config, #tab-work-tracking, #tab-completed-files, #tab-expiry-notifications, #tab-accounts-ledger').forEach(root => {
      if (root.closest(skip)) return;
      root.querySelectorAll('*').forEach(element => {
        if (element.closest(skip)) return;
        element.childNodes.forEach(node => {
          if (node.nodeType !== 3) return;
          const value = node.nodeValue || '';
          const key = value.trim();
          if (language === 'ar' && labels[key]) {
            if (!node.__darOriginalText) node.__darOriginalText = value;
            node.nodeValue = value.replace(key, labels[key]);
          } else if (language === 'en' && node.__darOriginalText !== undefined) {
            node.nodeValue = node.__darOriginalText;
            delete node.__darOriginalText;
          }
        });
      });
    });
  }
  window.applyDarLanguage = function () {
    translate(document.body.classList.contains('dar-arabic-ui') ? 'ar' : 'en');
  };
  window.toggleDarLanguage = function () {
    const arabic = !document.body.classList.contains('dar-arabic-ui');
    document.body.classList.toggle('dar-arabic-ui', arabic);
    document.documentElement.lang = arabic ? 'ar' : 'en';
    window.applyDarLanguage();
    const button = document.getElementById('dar-language-toggle');
    if (button) button.textContent = arabic ? 'العربية / EN' : 'EN / العربية';
  };
})();
