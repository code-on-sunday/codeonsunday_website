import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { blogPosts, POSTS_PER_PAGE } from '../data/blog'

export default function Blog() {
  const { t, lang } = useLang()
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(blogPosts.length / POSTS_PER_PAGE))
  const paginatedPosts = blogPosts.slice(
    (page - 1) * POSTS_PER_PAGE,
    page * POSTS_PER_PAGE
  )

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
            className="inline-flex items-center gap-2 text-ink-muted text-sm no-underline hover:text-accent transition-colors mb-12 font-body font-700"
          >
            <ArrowLeft size={14} />
            {t.blog.backHome}
          </Link>

          <div className="mb-16">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-0.5 bg-accent" />
              <span className="font-body font-700 text-xs uppercase tracking-[0.2em] text-accent">
                {t.blog.subtitle}
              </span>
            </div>
            <h1 className="font-display font-700 text-5xl md:text-6xl tracking-tight">
              {t.blog.title}
              <span className="text-accent">.</span>
            </h1>
          </div>
        </motion.div>

        {paginatedPosts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedPosts.map((post, i) => (
                <motion.div
                  key={post.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <Link
                    to={`/blog/${post.slug}`}
                    className="block border border-border p-6 no-underline text-ink hover:border-ink transition-colors group"
                  >
                    <time className="text-ink-light text-xs font-display font-700 uppercase tracking-wider">
                      {post.date}
                    </time>
                    <h3 className="font-body font-700 text-lg mt-2 mb-2 tracking-tight group-hover:text-accent transition-colors">
                      {post.title[lang]}
                    </h3>
                    <p className="text-ink-muted text-sm leading-relaxed">
                      {post.excerpt[lang]}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-ink-light text-[10px] font-body font-700 uppercase tracking-wider border border-border-light"
                          style={{ padding: '2px 8px' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-16 flex items-center justify-center gap-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-border bg-transparent cursor-pointer disabled:opacity-30 disabled:cursor-default hover:border-ink transition-colors text-ink"
                >
                  <ArrowLeft size={16} />
                </button>
                <span className="font-body font-700 text-sm text-ink-muted">
                  {t.blog.page} {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 border border-border bg-transparent cursor-pointer disabled:opacity-30 disabled:cursor-default hover:border-ink transition-colors text-ink"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="border border-border border-dashed py-20 text-center"
          >
            <p className="font-body font-700 text-xl text-ink mb-2">{t.blog.empty}</p>
            <p className="text-ink-muted text-sm max-w-md mx-auto">{t.blog.emptySubtitle}</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
