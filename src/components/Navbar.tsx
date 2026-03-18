import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useLang } from '../i18n/LanguageContext'

export default function Navbar() {
  const { lang, setLang, t } = useLang()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const handleHashLink = useCallback((e: React.MouseEvent, to: string) => {
    if (!to.startsWith('/#')) return
    const hash = to.slice(1)
    if (location.pathname === '/') {
      e.preventDefault()
      const el = document.querySelector(hash)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
      window.history.pushState(null, '', to)
    } else {
      e.preventDefault()
      navigate('/' + hash)
    }
  }, [location.pathname, navigate])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    { to: '/#products', label: t.nav.products },
    { to: '/blog', label: t.nav.blog },
    { to: '/#about', label: t.nav.about },
  ]

  const isActive = (to: string) => {
    if (to.startsWith('/#')) return location.pathname === '/' && location.hash === to.slice(1)
    return location.pathname === to
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center" style={{ padding: '12px 24px 0' }}>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className={`w-full transition-all duration-500 rounded-2xl ${
          scrolled
            ? 'bg-white/60 backdrop-blur-2xl shadow-[0_2px_24px_rgba(0,0,0,0.06)] border border-white/50'
            : 'bg-white/40 backdrop-blur-xl border border-transparent'
        }`}
        style={{ maxWidth: '1100px' }}
      >
        <div
          className="flex items-center justify-between"
          style={{ padding: '0 28px', height: '52px' }}
        >
          {/* Logo */}
          <Link
            to="/"
            className="no-underline flex items-center gap-0"
          >
            <span className="font-display font-700 text-sm tracking-tight text-ink">
              code
            </span>
            <span className="italic text-base text-accent" style={{ fontFamily: 'var(--font-accent)' }}>
              on
            </span>
            <span className="font-display font-700 text-sm tracking-tight text-ink">
              sunday
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link, i) => (
              <motion.div
                key={link.to}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  to={link.to}
                  onClick={(e) => handleHashLink(e, link.to)}
                  className={`text-[13px] font-body font-500 no-underline transition-all duration-300 relative rounded-lg ${
                    isActive(link.to)
                      ? 'text-ink bg-black/[0.04]'
                      : 'text-ink-muted hover:text-ink hover:bg-black/[0.03]'
                  }`}
                  style={{ padding: '6px 14px' }}
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}

            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="ml-2"
            >
              <button
                onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
                className="text-[11px] font-body font-600 text-ink-light hover:text-ink bg-black/[0.03] hover:bg-black/[0.06] border-none cursor-pointer transition-all duration-300 tracking-wider uppercase rounded-lg"
                style={{ padding: '5px 10px' }}
              >
                {lang === 'en' ? 'VI' : 'EN'}
              </button>
            </motion.div>
          </div>

          {/* Mobile */}
          <div className="flex md:hidden items-center gap-3">
            <button
              onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
              className="text-[11px] font-body font-600 text-ink-light bg-transparent border-none cursor-pointer tracking-wider uppercase"
            >
              {lang === 'en' ? 'VI' : 'EN'}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="text-ink bg-transparent border-none cursor-pointer p-1 relative w-6 h-5"
            >
              <motion.span
                className="absolute left-0 top-0 w-full h-[1.5px] bg-ink block origin-center rounded-full"
                animate={mobileOpen ? { rotate: 45, y: 9 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.span
                className="absolute left-0 top-[9px] w-full h-[1.5px] bg-ink block rounded-full"
                animate={mobileOpen ? { opacity: 0, x: -8 } : { opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              />
              <motion.span
                className="absolute left-0 bottom-0 w-full h-[1.5px] bg-ink block origin-center rounded-full"
                animate={mobileOpen ? { rotate: -45, y: -9 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden fixed inset-0 top-20 bg-white/80 backdrop-blur-2xl"
          >
            <div className="flex flex-col items-center justify-center h-full gap-8" style={{ paddingBottom: '80px' }}>
              {links.map((link, i) => (
                <motion.div
                  key={link.to}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    to={link.to}
                    onClick={(e) => { handleHashLink(e, link.to); setMobileOpen(false) }}
                    className={`font-display font-600 text-2xl no-underline tracking-tight ${
                      isActive(link.to) ? 'text-accent' : 'text-ink'
                    }`}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
