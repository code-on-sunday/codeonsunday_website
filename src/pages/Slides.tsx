import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import SectionHeading from '../components/SectionHeading'

interface SlideDeck {
  slug: string
  title: string
  description: string
  date: string
  tags: string[]
}

const cineEase = [0.16, 1, 0.3, 1] as const

export default function Slides() {
  const [decks, setDecks] = useState<SlideDeck[]>([])

  useEffect(() => {
    fetch('/slides/registry.json')
      .then(res => res.json())
      .then(data => setDecks(data))
      .catch(() => setDecks([]))
  }, [])

  return (
    <section className="px-6 md:px-12 lg:px-20 py-24 max-w-7xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-ink-muted hover:text-accent transition-colors mb-12 text-sm font-body"
      >
        <ArrowLeft size={16} />
        Back to home
      </Link>

      <SectionHeading title="Slide Decks" subtitle="Made with AI" number="S" />

      {decks.length === 0 ? (
        <p className="text-ink-muted text-lg">No slide decks yet. Check back soon.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {decks.map((deck, i) => (
            <motion.a
              key={deck.slug}
              href={`/slides/${deck.slug}/`}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: cineEase }}
              className="group block border border-border rounded-lg overflow-hidden hover:border-accent transition-colors"
            >
              <div className="aspect-video bg-dark flex items-center justify-center relative overflow-hidden">
                <img
                  src={`/slides/${deck.slug}.png`}
                  alt={deck.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-5">
                <h3 className="font-body font-700 text-lg text-ink mb-1 group-hover:text-accent transition-colors">
                  {deck.title}
                </h3>
                {deck.description && (
                  <p className="text-ink-muted text-sm mb-3 line-clamp-2">{deck.description}</p>
                )}
                <time className="text-ink-light text-xs">{deck.date}</time>
              </div>
            </motion.a>
          ))}
        </div>
      )}
    </section>
  )
}
