import { motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLang } from '../i18n/LanguageContext'

export default function About() {
  const { t } = useLang()

  return (
    <div className="min-h-screen" style={{ paddingTop: '140px', paddingBottom: '120px' }}>
      <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 48px' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-ink-muted text-sm no-underline hover:text-accent transition-colors mb-12 font-display font-700"
          >
            <ArrowLeft size={14} />
            {t.blog.backHome}
          </Link>

          <div className="mb-16">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-0.5 bg-accent" />
              <span className="font-display font-700 text-xs uppercase tracking-[0.2em] text-accent">
                {t.about.subtitle}
              </span>
            </div>
            <h1 className="font-display font-700 text-5xl md:text-6xl tracking-tight">
              {t.about.title}
              <span className="text-accent">.</span>
            </h1>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-16">
          {/* Main content — asymmetric layout */}
          <motion.div
            className="md:col-span-7"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <p className="font-display font-700 text-2xl md:text-3xl tracking-tight leading-snug mb-8 text-ink">
              {t.about.intro}
            </p>

            <div className="space-y-6 text-ink-muted leading-relaxed">
              <p>{t.about.p1}</p>
              <p>{t.about.p2}</p>
              <p>{t.about.p3}</p>
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            className="md:col-span-4 md:col-start-9"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="border-l-2 border-accent pl-6">
              <h3 className="font-display font-700 text-xs uppercase tracking-[0.2em] text-ink-muted mb-4">
                {t.about.companyTitle}
              </h3>
              <p className="font-display font-700 text-base text-ink mb-2">
                {t.about.companyName}
              </p>
              <p className="text-ink-muted text-sm">
                {t.about.taxLabel}: 0111098248
              </p>
            </div>

            {/* Geometric decoration */}
            <div className="mt-12 relative hidden md:block">
              <div className="w-32 h-32 border-2 border-border" />
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-accent/5" />
              <div className="absolute top-4 left-4 w-4 h-4 bg-accent" />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
