import { useMemo, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUpRight, BadgeCheck, Building2, Check, ChevronRight, FileCheck2, Files, IdCard, Menu, MessageCircle, Phone, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react';
import { company, copy, services, type Locale } from './content';

const iconFor = (id: string) => {
  if (id === 'visa') return <FileCheck2 />;
  if (id === 'identity') return <IdCard />;
  if (id === 'renewals') return <RefreshCw />;
  return <Files />;
};

export default function App() {
  const [locale, setLocale] = useState<Locale>('en');
  const [menuOpen, setMenuOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const t = copy[locale];
  const isArabic = locale === 'ar';
  const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || '';
  const whatsappUrl = useMemo(() => 'https://wa.me/' + company.phoneE164 + '?text=' + encodeURIComponent(isArabic ? 'مرحباً دار الشمس، أود الاستفسار عن خدماتكم.' : 'Hello Dar Al Shams, I would like to enquire about your services.'), [isArabic]);

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get('name') || '').trim(),
      phone: String(form.get('phone') || '').trim(),
      service: String(form.get('service') || '').trim(),
      message: String(form.get('message') || '').trim(),
      locale,
      source: 'website'
    };
    try {
      const response = await fetch(apiBase + '/api/public/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Lead submission failed');
      setStatus(t.success);
      event.currentTarget.reset();
    } catch {
      setStatus(t.error);
    } finally {
      setBusy(false);
    }
  }

  return <div className={isArabic ? 'site arabic' : 'site'} dir={isArabic ? 'rtl' : 'ltr'} lang={locale}>
    <div className="topline"><div className="wrap topline-inner"><span><span className="live-dot" /> {t.eyebrow}</span><span className="top-contact"><a href={'tel:+' + company.phoneE164}><Phone size={14} /> {company.phoneDisplay}</a><span className="top-separator">·</span><span>{company.location}</span></span></div></div>
    <header className="header"><div className="wrap nav">
      <a className="brand" href="#home" aria-label="Dar Al Shams home">
        <img src="https://raw.githubusercontent.com/Jubindgeorge/dar/main/LOGO.png" alt="Dar Al Shams official logo" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        <span className="brand-text"><strong>DAR AL SHAMS</strong><small>DOCUMENTS CLEARING SERVICES</small></span>
      </a>
      <nav className={menuOpen ? 'nav-links open' : 'nav-links'}><a href="#services" onClick={() => setMenuOpen(false)}>{t.services}</a><a href="#process" onClick={() => setMenuOpen(false)}>{isArabic ? 'طريقة العمل' : 'How it works'}</a><a href="#contact" onClick={() => setMenuOpen(false)}>{t.contact}</a></nav>
      <div className="nav-actions"><button className="language-button" onClick={() => setLocale(isArabic ? 'en' : 'ar')}>{t.language}</button><a className="button button-dark nav-cta" href="#contact">{t.primary}<ArrowUpRight size={16} /></a><button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button></div>
    </div></header>

    <main>
      <section id="home" className="hero"><div className="hero-orb orb-one" /><div className="hero-orb orb-two" /><div className="wrap hero-grid">
        <div className="hero-copy"><div className="eyebrow"><Sparkles size={15} /> {t.eyebrow}</div><h1>{t.title.split('\n').map((line, i) => <span key={line} className={i === 1 ? 'gold-line' : ''}>{line}<br /></span>)}</h1><p className="hero-intro">{t.intro}</p><div className="hero-actions"><a className="button button-gold" href="#contact">{t.primary}<ArrowUpRight size={17} /></a><a className="button button-outline" href="#services">{t.secondary}<ChevronRight size={16} /></a></div><div className="hero-proof"><span><ShieldCheck size={17} /> {t.trust.split(' · ')[0]}</span><span><BadgeCheck size={17} /> {t.trust.split(' · ')[1]}</span></div></div>
        <div className="hero-visual"><div className="visual-backdrop" /><div className="visual-frame"><img src="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=85" alt="Modern Dubai skyline" /><div className="frame-gradient" /><div className="visual-label"><span className="label-icon"><Building2 size={18} /></span><div><strong>Dar Al Shams</strong><small>{isArabic ? 'خدمات الأعمال والمستندات' : 'Business & document support'}</small></div><ArrowUpRight size={20} /></div></div><div className="floating-card"><div className="float-icon"><Check size={18} /></div><div><strong>{isArabic ? 'تواصل واضح' : 'Clear communication'}</strong><small>{isArabic ? 'خطواتك التالية تبدأ هنا' : 'Your next step starts here'}</small></div></div><div className="decorative-stamp">DS<span>✦</span></div></div>
      </div><div className="hero-bottom"><div className="wrap hero-bottom-inner"><span>{isArabic ? 'دعم في كل خطوة' : 'Support at every step'}</span><span className="line" /><span>{isArabic ? 'تواصل مباشر مع فريقنا' : 'Direct contact with our team'}</span><ArrowDown size={16} /></div></div></section>

      <section id="services" className="section services-section"><div className="wrap"><div className="section-heading"><div><div className="eyebrow dark-eyebrow">{t.servicesEyebrow}</div><h2>{t.servicesTitle}</h2></div><p>{t.servicesIntro}</p></div><div className="service-grid">{services.map((s, i) => <article className="service-card" key={s.id}><div className="service-card-top"><span className="service-icon">{iconFor(s.id)}</span><span className="service-number">0{i + 1}</span></div><h3>{isArabic ? s.ar : s.en}</h3><p>{isArabic ? s.descAr : s.descEn}</p><a href="#contact" className="text-link" onClick={() => { const el = document.querySelector<HTMLSelectElement>('#lead-service'); if (el) el.value = s.id; }}>{isArabic ? 'استفسر عن الخدمة' : 'Enquire about this service'} <ArrowUpRight size={16} /></a></article>)}</div><p className="service-note"><ShieldCheck size={16} /> {t.note}</p></div></section>

      <section id="process" className="section process-section"><div className="wrap process-layout"><div className="process-intro"><div className="eyebrow">{t.processEyebrow}</div><h2>{t.processTitle}</h2><p>{isArabic ? 'ابدأ باستفسار بسيط وسنوضح لك الخطوات المناسبة.' : 'Start with a simple enquiry and we will help clarify the appropriate next steps.'}</p><a className="button button-gold" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={17} /> {t.whatsapp}</a></div><div className="steps">{t.steps.map((step, i) => <div className="step" key={step[0]}><div className="step-number">0{i + 1}</div><div><h3>{step[0]}</h3><p>{step[1]}</p></div><ChevronRight className="step-arrow" size={20} /></div>)}</div></div></section>

      <section className="cta-band"><div className="wrap cta-content"><div><div className="eyebrow">{t.promoEyebrow}</div><h2>{t.promoTitle}</h2><p>{t.promoBody}</p></div><a className="button button-light" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={18} /> {t.whatsapp}<ArrowUpRight size={16} /></a></div></section>

      <section id="contact" className="section contact-section"><div className="wrap contact-grid"><div className="contact-copy"><div className="eyebrow dark-eyebrow">{isArabic ? 'تواصل معنا' : 'GET IN TOUCH'}</div><h2>{t.contactTitle}</h2><p>{t.contactBody}</p><div className="contact-list"><a href={'tel:+' + company.phoneE164}><span className="contact-icon"><Phone /></span><span><small>{t.call}</small><strong>{company.phoneDisplay}</strong></span><ArrowUpRight /></a><a href={'mailto:' + company.email}><span className="contact-icon"><Building2 /></span><span><small>Email</small><strong>{company.email}</strong></span><ArrowUpRight /></a><a href={whatsappUrl} target="_blank" rel="noreferrer"><span className="contact-icon"><MessageCircle /></span><span><small>WhatsApp</small><strong>{t.whatsapp}</strong></span><ArrowUpRight /></a></div><div className="location-card"><Building2 size={19} /><span>{t.location}</span></div></div>
        <form className="lead-form" onSubmit={submitLead}><div className="form-title"><div><h3>{isArabic ? 'أرسل استفسارك' : 'Send an enquiry'}</h3><p>{isArabic ? 'سنستخدم بياناتك للرد على استفسارك فقط.' : 'Your details will be used to respond to your enquiry.'}</p></div><span className="form-title-icon"><Files /></span></div><label>{t.name}<input name="name" autoComplete="name" required maxLength={100} placeholder={isArabic ? 'اسمك' : 'Your name'} /></label><label>{t.phone}<input name="phone" type="tel" autoComplete="tel" required maxLength={32} placeholder="+971 ..." /></label><label>{t.service}<select id="lead-service" name="service" required defaultValue=""><option value="" disabled>{t.choose}</option>{services.map(s => <option key={s.id} value={s.id}>{isArabic ? s.ar : s.en}</option>)}</select></label><label>{t.message}<textarea name="message" rows={3} maxLength={1500} placeholder={isArabic ? 'اكتب استفسارك هنا' : 'Tell us briefly what you need'} /></label><p className="privacy-note">{t.privacy}</p><button className="button button-dark submit-button" type="submit" disabled={busy}>{busy ? (isArabic ? 'جارٍ الإرسال…' : 'Sending…') : t.submit}<ArrowUpRight size={17} /></button>{status && <p role="status" className={status === t.success ? 'form-status success' : 'form-status'}>{status}</p>}</form>
      </div></section>
    </main>

    <footer className="footer"><div className="wrap footer-main"><div className="footer-brand"><span className="footer-monogram">DS</span><div><strong>DAR AL SHAMS</strong><small>{t.footer}</small></div></div><p>{t.about}</p><div className="footer-social"><a href={whatsappUrl} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle /></a><a href={'tel:+' + company.phoneE164} aria-label="Call"><Phone /></a></div></div><div className="wrap footer-bottom"><span>© {new Date().getFullYear()} Dar Al Shams. {t.rights}</span><span>{company.location}</span></div></footer>
  </div>;
}