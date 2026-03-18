import { Github, Youtube, Facebook } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'

function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.92a8.16 8.16 0 0 0 4.76 1.52V7.05a4.84 4.84 0 0 1-1-.36z" />
    </svg>
  )
}

export default function Footer() {
  const { t } = useLang()

  const socials = [
    { icon: <TikTokIcon />, href: 'https://www.tiktok.com/@code.on.sunday', label: 'TikTok' },
    { icon: <Youtube size={18} />, href: 'https://www.youtube.com/@code.on.sunday', label: 'YouTube' },
    { icon: <Facebook size={18} />, href: 'https://www.facebook.com/trungboo/', label: 'Facebook' },
    { icon: <Github size={18} />, href: 'https://github.com/code-on-sunday', label: 'GitHub' },
  ]

  return (
    <footer className="mt-auto" style={{ padding: '0 40px 40px' }}>
      <div
        className="rounded-2xl bg-white border border-border/60"
        style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 40px' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand column */}
          <div className="md:col-span-5">
            <div className="text-lg tracking-tight mb-2 flex items-center gap-0">
              <span className="font-body font-700 text-sm">code</span>
              <span className="italic text-base text-accent" style={{ fontFamily: 'var(--font-accent)' }}>on</span>
              <span className="font-body font-700 text-sm">sunday</span>
            </div>
            <p className="text-ink-muted text-sm leading-relaxed mb-3">
              {t.footer.tagline}
            </p>
            <div className="text-ink-light text-xs leading-relaxed">
              <p>{t.footer.company}</p>
              <p>{t.footer.taxNumber}</p>
            </div>
          </div>

          {/* Spacer */}
          <div className="hidden md:block md:col-span-4" />

          {/* Social column */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-body font-600 uppercase tracking-widest mb-4 text-ink-muted">
              {t.footer.social}
            </h4>
            <div className="flex flex-col gap-2.5">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink-muted hover:text-accent transition-colors text-sm no-underline flex items-center gap-2"
                >
                  {s.icon}
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-5 border-t border-border/40 flex items-center justify-between">
          <p className="text-ink-light text-xs">
            &copy; {new Date().getFullYear()} CodeOnSunday
          </p>
          <div className="w-6 h-1 bg-accent rounded-full" />
        </div>
      </div>
    </footer>
  )
}
