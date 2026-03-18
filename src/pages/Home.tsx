import { useEffect } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Github, Play } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useLang } from '../i18n/LanguageContext'
import { blogPosts, POSTS_PER_PAGE } from '../data/blog'

const cineEase = [0.16, 1, 0.3, 1] as const

function ScrollReveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        whileInView={{ y: '0%', opacity: 1 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.8, delay, ease: cineEase }}
      >
        {children}
      </motion.div>
    </div>
  )
}

function ScrollFadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.8, delay, ease: cineEase }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function BlogSection() {
  const { t, lang } = useLang()
  const latestPosts = blogPosts.slice(0, POSTS_PER_PAGE)

  return (
    <section id="blog" className="relative overflow-hidden" style={{ padding: '80px 0 64px' }}>
      {/* Soft gradient blob — peach/coral top-right */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-120px',
          right: '-80px',
          width: '600px',
          height: '500px',
          background: 'radial-gradient(ellipse at center, rgba(255,140,100,0.12) 0%, rgba(255,180,140,0.06) 40%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      {/* Soft gradient blob — blue/lavender left */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '200px',
          left: '-160px',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(ellipse at center, rgba(140,160,255,0.10) 0%, rgba(180,190,255,0.05) 40%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div className="relative" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 40px' }}>
        {/* Section header */}
        <div className="mb-10">
          <ScrollReveal>
            <h2 className="font-display font-700 text-4xl md:text-5xl tracking-tight text-ink">
              {t.blog.title}<span className="text-accent">.</span>
            </h2>
          </ScrollReveal>
        </div>

        {latestPosts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {latestPosts.map((post, i) => (
                <ScrollFadeIn key={post.slug} delay={i * 0.06}>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="block no-underline text-ink group relative overflow-hidden rounded-2xl bg-white border border-border/60 hover:border-border hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all duration-500"
                    style={{ padding: '28px' }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <time className="text-xs text-ink-light font-body font-500">
                        {post.date}
                      </time>
                      <div className="flex gap-2">
                        {post.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[10px] font-body font-600 text-ink-muted bg-surface-alt px-2 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <h3 className="font-display font-700 text-lg md:text-xl tracking-tight mb-2 group-hover:text-accent transition-colors duration-400 leading-snug">
                      {post.title[lang]}
                    </h3>
                    <p className="text-ink-muted text-sm leading-relaxed">
                      {post.excerpt[lang]}
                    </p>
                    <div className="mt-4 flex items-center gap-1.5">
                      <span className="text-sm font-body font-500 text-ink-muted group-hover:text-accent transition-colors duration-400">
                        Read more
                      </span>
                      <ArrowRight size={12} strokeWidth={1.5} className="text-ink-light group-hover:text-accent group-hover:translate-x-1 transition-all duration-400" />
                    </div>
                  </Link>
                </ScrollFadeIn>
              ))}
            </div>

            <ScrollFadeIn delay={0.15} className="mt-10 text-center">
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 no-underline hover:text-accent transition-colors duration-400 group text-sm font-body font-500 text-ink-muted"
              >
                {t.blog.viewAll}
                <ArrowRight size={14} strokeWidth={1.5} className="group-hover:text-accent group-hover:translate-x-1 transition-all duration-400" />
              </Link>
            </ScrollFadeIn>
          </>
        ) : (
          <ScrollFadeIn>
            <div
              className="rounded-2xl bg-white border border-dashed border-border relative overflow-hidden"
              style={{ padding: '72px 40px' }}
            >
              <div className="relative text-center">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: 40 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.2, ease: cineEase }}
                  className="h-px bg-accent mx-auto mb-5"
                />
                <ScrollReveal delay={0.15}>
                  <p className="font-display font-700 text-xl md:text-2xl text-ink tracking-tight">{t.blog.empty}</p>
                </ScrollReveal>
                <ScrollFadeIn delay={0.3}>
                  <p className="text-ink-muted text-sm max-w-md mx-auto leading-relaxed mt-3">
                    {t.blog.emptySubtitle}
                  </p>
                </ScrollFadeIn>
              </div>
            </div>
          </ScrollFadeIn>
        )}
      </div>
    </section>
  )
}

function ProductsSection() {
  const { t } = useLang()

  const products = [
    {
      name: t.products.slideDeck.name,
      description: t.products.slideDeck.description,
      recentUpdate: t.products.slideDeck.recentUpdate,
      recentUpdateTime: t.products.slideDeck.recentUpdateTime,
      thumbnail: '/slide-deck-generator-thumb.png',
      demoLink: '/make/slides',
      githubLink: 'https://github.com/code-on-sunday/slide-deck-generator',
    },
  ]

  return (
    <section id="products" className="relative" style={{ padding: '64px 0 80px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 40px' }}>
        {/* Section header */}
        <div className="mb-10">
          <ScrollReveal>
            <h2 className="font-display font-700 text-4xl md:text-5xl tracking-tight text-ink">
              {t.products.title}<span className="text-accent">.</span>
            </h2>
          </ScrollReveal>
        </div>

        {/* Product list */}
        <div className="flex flex-col gap-4">
          {products.map((product, i) => (
            <ScrollFadeIn key={product.name} delay={i * 0.06}>
              <div className="flex gap-5 items-start rounded-2xl bg-white border border-border/60 hover:border-border hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all duration-500" style={{ padding: '24px' }}>
                {/* Thumbnail */}
                <div className="w-1/3 rounded-xl overflow-hidden shrink-0" style={{ aspectRatio: '16/9' }}>
                  <iframe
                    src="https://www.youtube.com/embed/TpKL3WY_lmE?autoplay=1&mute=1&loop=1&playlist=TpKL3WY_lmE&controls=0&showinfo=0&modestbranding=1"
                    title={product.name}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                    style={{ border: 'none' }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <Link to={product.demoLink} className="no-underline">
                    <h3 className="font-display font-700 text-lg md:text-xl tracking-tight text-ink leading-snug mb-1 hover:text-accent transition-colors duration-300">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="text-ink-muted text-sm leading-relaxed mb-3">
                    {product.description}
                  </p>

                  {/* Recent update */}
                  <div className="flex items-start gap-2 mb-3 text-xs">
                    <span className="text-ink-light font-body font-500 shrink-0">{product.recentUpdateTime}</span>
                    <span className="text-ink-muted font-body">{product.recentUpdate}</span>
                  </div>

                  {/* Links */}
                  <div className="flex flex-col gap-2">
                    <Link
                      to={product.demoLink}
                      className="inline-flex items-center gap-2 text-sm font-body font-600 text-ink hover:text-accent transition-colors duration-300 no-underline"
                    >
                      <Play size={16} strokeWidth={1.5} />
                      View Demo
                    </Link>
                    <a
                      href={product.githubLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-body font-600 text-ink hover:text-accent transition-colors duration-300 no-underline"
                    >
                      <Github size={16} strokeWidth={1.5} />
                      Source Code
                    </a>
                  </div>
                </div>
              </div>
            </ScrollFadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

function AboutSection() {
  const { t } = useLang()

  return (
    <section id="about" className="relative overflow-hidden" style={{ padding: '80px 0 64px' }}>
      {/* Soft gradient blob — rose/pink right */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-60px',
          right: '0',
          width: '500px',
          height: '450px',
          background: 'radial-gradient(ellipse at center, rgba(240,130,160,0.09) 0%, rgba(250,160,180,0.04) 40%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      {/* Soft gradient blob — violet/purple left */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '50%',
          left: '-100px',
          width: '450px',
          height: '400px',
          background: 'radial-gradient(ellipse at center, rgba(170,140,240,0.08) 0%, rgba(190,160,250,0.04) 40%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div className="relative" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 40px' }}>
        {/* Section header */}
        <div className="mb-10">
          <ScrollReveal>
            <h2 className="font-display font-700 text-4xl md:text-5xl tracking-tight text-ink">
              {t.about.title}<span className="text-accent">.</span>
            </h2>
          </ScrollReveal>
        </div>

        <div>
          <div className="max-w-2xl">
            {/* Avatar + Name */}
            <ScrollFadeIn>
              <div className="flex items-center gap-5 mb-8">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden ring-3 ring-accent/10 ring-offset-2 ring-offset-surface shrink-0">
                  <img
                    src="/avatar.jpg"
                    alt="Hoàng Quốc Trung"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-display font-700 text-xl md:text-2xl tracking-tight leading-tight">
                    {t.hero.name}<span className="text-accent">.</span>
                  </h3>
                  <span className="text-xs font-body font-500 text-ink-muted uppercase tracking-widest">
                    {t.hero.nickname}
                  </span>
                </div>
              </div>
            </ScrollFadeIn>

            <ScrollFadeIn delay={0.05}>
              <p
                className="italic text-xl md:text-2xl leading-snug text-ink mb-8"
                style={{ fontFamily: 'var(--font-accent)' }}
              >
                {t.about.intro}
              </p>
            </ScrollFadeIn>
            <ScrollFadeIn delay={0.1}>
              <p className="text-ink-muted text-sm leading-relaxed mb-4">
                {t.about.p1}
              </p>
            </ScrollFadeIn>
            <ScrollFadeIn delay={0.12}>
              <p className="text-ink-muted text-sm leading-relaxed mb-4">
                {t.about.p2}
              </p>
            </ScrollFadeIn>
            <ScrollFadeIn delay={0.14}>
              <p className="text-ink-muted text-sm leading-relaxed">
                {t.about.p3}
              </p>
            </ScrollFadeIn>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  const { hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash)
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [hash])

  return (
    <>
      <BlogSection />
      <ProductsSection />
      <AboutSection />
    </>
  )
}
