import { motion } from 'motion/react'

interface Props {
  title: string
  subtitle: string
  number: string
}

export default function SectionHeading({ title, subtitle, number }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative" style={{ marginBottom: '80px' }}
    >
      <span className="font-display font-700 text-[8rem] leading-none text-border-light absolute -top-12 -left-2 select-none pointer-events-none hidden md:block">
        {number}
      </span>
      <div className="relative">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-0.5 bg-accent" />
          <span className="font-display font-700 text-xs uppercase tracking-[0.2em] text-accent">
            {subtitle}
          </span>
        </div>
        <h2 className="font-display font-700 text-4xl md:text-5xl tracking-tight text-ink">
          {title}
        </h2>
      </div>
    </motion.div>
  )
}
