import { useParams, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { blogPosts } from '../data/blog'

function renderMarkdown(text: string) {
  return text.split('\n\n').map((block, i) => {
    if (block.startsWith('- ')) {
      const items = block.split('\n').filter((l) => l.startsWith('- '))
      return (
        <ul key={i} className="list-disc pl-6 space-y-2 text-ink leading-relaxed">
          {items.map((item, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: boldify(item.slice(2)) }} />
          ))}
        </ul>
      )
    }
    return (
      <p
        key={i}
        className="text-ink leading-relaxed"
        dangerouslySetInnerHTML={{ __html: boldify(block) }}
      />
    )
  })
}

function boldify(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-ink font-700">$1</strong>')
}

export default function BlogPost() {
  const { slug } = useParams()
  const { lang, t } = useLang()
  const post = blogPosts.find((p) => p.slug === slug)

  if (!post) {
    return (
      <div className="min-h-screen" style={{ paddingTop: '140px', paddingBottom: '120px' }}>
        <div style={{ maxWidth: '768px', margin: '0 auto', padding: '0 48px' }}>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-ink-muted text-sm no-underline hover:text-accent transition-colors mb-12 font-display font-700"
          >
            <ArrowLeft size={14} />
            {t.blog.backHome}
          </Link>
          <p className="text-ink-muted">Post not found.</p>
        </div>
      </div>
    )
  }

  const aspectRatio = post.youtubeShort ? '9/16' : '16/9'
  const maxWidth = post.youtubeShort ? '360px' : '100%'

  return (
    <div className="min-h-screen" style={{ paddingTop: '140px', paddingBottom: '120px' }}>
      <div style={{ maxWidth: '768px', margin: '0 auto', padding: '0 48px' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-ink-muted text-sm no-underline hover:text-accent transition-colors mb-12 font-display font-700"
          >
            <ArrowLeft size={14} />
            {t.blog.backHome}
          </Link>

          <article>
            <header className="mb-10">
              <time className="text-ink-light text-xs font-display font-700 uppercase tracking-wider">
                {post.date}
              </time>
              <h1 className="font-display font-700 text-3xl md:text-4xl tracking-tight mt-2 mb-4">
                {post.title[lang]}
              </h1>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-ink-light text-[10px] font-display font-700 uppercase tracking-wider border border-border-light"
                    style={{ padding: '2px 8px' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </header>

            {post.youtubeId && (
              <div className={post.youtubeShort ? 'mb-20' : 'mb-10'} style={{ maxWidth, margin: post.youtubeShort ? '0 auto' : undefined }}>
                <div style={{ position: 'relative', width: '100%', aspectRatio, overflow: 'hidden' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${post.youtubeId}`}
                    title={post.title[lang]}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      border: 'none',
                    }}
                  />
                </div>
              </div>
            )}

            <div className="p-8 md:p-10 space-y-4" style={{ backgroundColor: 'rgba(0,0,0,0.02)', fontFamily: '"Noto Serif", serif', fontSize: '19px' }}>
              {renderMarkdown(post.content[lang])}
            </div>
          </article>
        </motion.div>
      </div>
    </div>
  )
}
