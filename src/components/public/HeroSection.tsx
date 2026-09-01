import { useState, useEffect, useCallback, useRef } from 'react';
import Image from '@/lib/compat/image';
import Link from '@/lib/compat/link';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from 'framer-motion';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

/* ─── Config ────────────────────────────────────────────────────── */
const SLIDE_DURATION = 6000; // ms per slide
const EASE_C = [0.76, 0, 0.24, 1] as const; // cinematic
const EASE_O = [0.25, 0.46, 0.45, 0.94] as const; // ease-out
const HERO_IMAGE_SIZES =
  '(max-width: 640px) 160vw, (max-width: 1024px) 120vw, 100vw';

/* ─── Slides — swap images for real school photos ───────────────── */
const slides = [
  {
    // TODO: replace with actual SGIS campus photo
    image: '/air-view.webp',
    badge: 'Admissions Open · 2026–2027',
    lines: ['Where Excellence', 'Meets'],
    accent: 'Global Vision',
    body: 'Sankt Georg International School nurtures curious, compassionate, and critical thinkers — preparing students for leading universities and meaningful lives.',
    cta: { label: 'Apply for Entrance Exam', href: '/entrance-exam' },
    sub: { label: 'Discover Our School', href: '/about' },
  },
  {
    // TODO: replace with Nursery & Primary section photo
    image: '/sgi-1.jpg.jpeg',
    badge: 'Foundation Years · Nursery & Primary',
    lines: ['Building Futures,', 'One'],
    accent: 'Child at a Time',
    body: 'Our foundation years focus on personalised learning — helping every pupil build confidence, curiosity, and the skills to flourish academically and socially.',
    cta: { label: 'Explore Our Programs', href: '/about' },
    sub: { label: 'Learn More', href: '/about' },
  },
  {
    // TODO: replace with Secondary section photo
    image: '/sgi-2.jpg.jpeg',
    badge: 'Secondary Section · Academic Excellence',
    lines: ["Shaping Tomorrow's"],
    accent: 'Leaders Today',
    body: 'Committed to all-round development, our secondary section equips students with knowledge, discipline, and the character to thrive in a rapidly changing world.',
    cta: { label: 'Learn About Admissions', href: '/admissions' },
    sub: { label: 'Contact Us', href: '/contact' },
  },
  {
    image: '/facilities/ict-suite.webp',
    badge: 'ICT Suite · Digital Literacy',
    lines: ['Fluent in the', 'Language of'],
    accent: 'Technology',
    body: 'Every student works hands-on in our fully equipped computer laboratory, building the digital fluency that modern study and modern careers demand.',
    cta: { label: 'Explore Our Facilities', href: '/about' },
    sub: { label: 'Apply Now', href: '/entrance-exam' },
  },
  {
    image: '/facilities/chemistry-laboratory.webp',
    badge: 'Sciences · Chemistry Laboratory',
    lines: ['Science Learned', 'at the'],
    accent: 'Workbench',
    body: 'Purpose-built fume-safe benches, running water, and full apparatus — our chemistry laboratory lets students test theory through practical experiment.',
    cta: { label: 'See Our Science Programs', href: '/about' },
    sub: { label: 'Apply Now', href: '/entrance-exam' },
  },
  {
    image: '/facilities/physics-laboratory.webp',
    badge: 'Sciences · Physics Laboratory',
    lines: ['Understanding How', 'the World'],
    accent: 'Works',
    body: 'From mechanics to electricity, students prove the principles themselves at dedicated, fully powered physics workstations.',
    cta: { label: 'See Our Science Programs', href: '/about' },
    sub: { label: 'Apply Now', href: '/entrance-exam' },
  },
  {
    image: '/facilities/biology-laboratory.webp',
    badge: 'Sciences · Biology Laboratory',
    lines: ['A Closer Look', 'at'],
    accent: 'Living Things',
    body: 'Specimen work, dissection, and microscopy in a modern biology laboratory — where curiosity about life becomes rigorous scientific method.',
    cta: { label: 'See Our Science Programs', href: '/about' },
    sub: { label: 'Apply Now', href: '/entrance-exam' },
  },
  {
    image: '/facilities/fine-arts-studio.webp',
    badge: 'Creative Arts · Fine Arts Studio',
    lines: ['Room to Create,', 'Space to'],
    accent: 'Imagine',
    body: 'Drafting tables, easels, and natural light. Our fine arts studio gives creative students the environment and the encouragement to develop real craft.',
    cta: { label: 'Explore Our Programs', href: '/about' },
    sub: { label: 'Learn More', href: '/about' },
  },
  {
    image: '/facilities/library.webp',
    badge: 'Library & Research Centre',
    lines: ['Where Independent', 'Study'],
    accent: 'Begins',
    body: 'A well-stocked library with private study carrels and open reading space — teaching students to research, reason, and think for themselves.',
    cta: { label: 'Discover Our School', href: '/about' },
    sub: { label: 'Contact Us', href: '/contact' },
  },
  {
    image: '/facilities/nursery-classroom.webp',
    badge: 'Early Years · Nursery',
    lines: ['A First Classroom', 'They'],
    accent: 'Look Forward To',
    body: 'Bright, warm, and built to a child\u2019s scale — our nursery classrooms make the very first years of school feel safe, joyful, and full of discovery.',
    cta: { label: 'Explore Early Years', href: '/about' },
    sub: { label: 'Apply Now', href: '/entrance-exam' },
  },
  {
    image: '/facilities/nursery-primary-campus.webp',
    badge: 'Nursery & Primary Campus',
    lines: ['Learning, Playing,', 'Growing'],
    accent: 'Together',
    body: 'A dedicated campus with secure, open grounds and full playground facilities — because childhood development happens outside the classroom too.',
    cta: { label: 'Explore Our Programs', href: '/about' },
    sub: { label: 'Book a Visit', href: '/contact' },
  },
] as const;

type SlideState = { index: number; dir: number };

/* ─── Component ─────────────────────────────────────────────────── */
export function HeroSection() {
  const prefersReduced = useReducedMotion();
  const [{ index, dir }, setSlide] = useState<SlideState>({ index: 0, dir: 0 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  /* Scroll-driven parallax */
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  // Background moves up slower than page scroll (parallax depth)
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '8%']);
  // Content fades and lifts as you scroll away
  const contentOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.55], ['0%', '-7%']);

  /* Auto-advance */
  const clearTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const advance = useCallback(() => {
    setSlide((prev) => ({ index: (prev.index + 1) % slides.length, dir: 1 }));
  }, []);

  useEffect(() => {
    if (prefersReduced) return;
    timerRef.current = setInterval(advance, SLIDE_DURATION);
    return clearTimer;
  }, [advance, clearTimer, prefersReduced]);

  const goTo = useCallback(
    (i: number) => {
      setSlide((prev) => ({ index: i, dir: i >= prev.index ? 1 : -1 }));
      clearTimer();
      if (!prefersReduced)
        timerRef.current = setInterval(advance, SLIDE_DURATION);
    },
    [advance, clearTimer, prefersReduced],
  );

  const slide = slides[index];

  return (
    <section
      ref={sectionRef}
      className="relative h-[78svh] min-h-128 overflow-hidden md:h-screen"
      aria-label="Hero carousel"
    >
      {/* ──────────────────────────────────────────────────────────
          Background: parallax container with sliding images
          Mobile uses a shallower overflow buffer so the image stays crisper;
          desktop keeps the deeper parallax canvas.
      ─────────────────────────────────────────────────────────── */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-[-10%] h-[120%] pointer-events-none md:top-[-25%] md:h-[150%]"
        style={{ y: bgY }}
      >
        {/* Sliding images */}
        <AnimatePresence initial={false} custom={dir}>
          <motion.div
            key={index}
            className="absolute inset-0"
            custom={dir}
            variants={{
              enter: (d: number) => ({ x: d >= 0 ? '100%' : '-100%' }),
              center: { x: 0 },
              exit: (d: number) => ({ x: d >= 0 ? '-100%' : '100%' }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.9, ease: EASE_C }}
          >
            {/* Ken Burns — subtle zoom over the full slide lifetime */}
            <motion.div
              className="absolute inset-0"
              initial={{ scale: 1.03 }}
              animate={{ scale: 1.0 }}
              transition={{
                duration: (SLIDE_DURATION + 1000) / 1000,
                ease: 'linear',
              }}
            >
              <Image
                src={slide.image}
                alt=""
                fill
                priority={index === 0}
                sizes={HERO_IMAGE_SIZES}
                className="object-cover object-center"
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Overlay — lighter than before, preserves image visibility */}
        <div className="absolute inset-0 bg-black/35" />
        {/* Bottom gradient so controls are always readable */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, transparent 35%, rgba(0,0,0,0.55) 100%)',
          }}
        />
      </motion.div>

      {/* ──────────────────────────────────────────────────────────
          Content — centered, lifts on scroll
      ─────────────────────────────────────────────────────────── */}
      <motion.div
        className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4"
        style={{ opacity: contentOpacity, y: contentY }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={index}
            className="max-w-4xl mx-auto space-y-6"
            initial="hidden"
            animate="show"
            exit="exit"
            variants={{
              hidden: {},
              show: {
                transition: { staggerChildren: 0.065, delayChildren: 0.18 },
              },
              exit: {
                transition: { staggerChildren: 0.03, staggerDirection: -1 },
              },
            }}
          >
            {/* Badge — flanked by lines */}
            <motion.div
              className="flex items-center justify-center gap-3"
              variants={{
                hidden: { opacity: 0, y: -10 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.5, ease: EASE_O },
                },
                exit: { opacity: 0, transition: { duration: 0.15 } },
              }}
            >
              <span className="block h-px w-8 bg-white/50" />
              <span
                className="text-xs font-medium text-white/85 uppercase"
                style={{ letterSpacing: '0.18em' }}
              >
                {slide.badge}
              </span>
              <span className="block h-px w-8 bg-white/50" />
            </motion.div>

            {/* Screen-reader heading */}
            <h1 className="sr-only">
              {slide.lines.join(' ')} {slide.accent}
            </h1>

            {/* Visual heading — word-reveal with overflow mask */}
            <div className="space-y-0" aria-hidden>
              {slide.lines.map((line, li) => (
                <div
                  key={`${index}-${li}`}
                  style={{ overflow: 'hidden', lineHeight: 1.06 }}
                >
                  <motion.p
                    className="font-serif font-bold text-white tracking-tight"
                    style={{
                      fontSize: 'clamp(2.8rem, 6vw, 5.5rem)',
                      lineHeight: 1.06,
                    }}
                    variants={{
                      hidden: { y: '108%' },
                      show: {
                        y: 0,
                        transition: {
                          duration: 0.75,
                          delay: li * 0.08,
                          ease: EASE_C,
                        },
                      },
                      exit: {
                        y: '-108%',
                        transition: {
                          duration: 0.4,
                          delay: li * 0.04,
                          ease: EASE_C,
                        },
                      },
                    }}
                  >
                    {line}
                  </motion.p>
                </div>
              ))}

              {/* Gradient accent line */}
              <div style={{ overflow: 'hidden', lineHeight: 1.06 }}>
                <motion.p
                  className="font-serif font-bold tracking-tight"
                  style={{
                    fontSize: 'clamp(2.8rem, 6vw, 5.5rem)',
                    lineHeight: 1.06,
                    backgroundImage:
                      'linear-gradient(135deg, oklch(0.82 0.1 14.5), oklch(0.97 0.03 14.5))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                  variants={{
                    hidden: { y: '108%' },
                    show: {
                      y: 0,
                      transition: {
                        duration: 0.75,
                        delay: slide.lines.length * 0.08,
                        ease: EASE_C,
                      },
                    },
                    exit: {
                      y: '-108%',
                      transition: {
                        duration: 0.4,
                        delay: slide.lines.length * 0.04,
                        ease: EASE_C,
                      },
                    },
                  }}
                >
                  {slide.accent}
                </motion.p>
              </div>
            </div>

            {/* Body */}
            <motion.p
              className="text-base sm:text-lg leading-relaxed text-white/80 max-w-2xl mx-auto"
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.6, ease: EASE_O },
                },
                exit: { opacity: 0, transition: { duration: 0.15 } },
              }}
            >
              {slide.body}
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="flex flex-wrap items-center justify-center gap-3 pt-1"
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.55, ease: EASE_O },
                },
                exit: { opacity: 0, transition: { duration: 0.15 } },
              }}
            >
              <Button
                asChild
                size="lg"
                className="font-medium gap-2 group"
                style={{
                  backgroundColor: 'oklch(0.41 0.108 14.5)',
                  color: 'white',
                  boxShadow: '0 6px 28px oklch(0.41 0.108 14.5 / 0.45)',
                }}
              >
                <Link href={slide.cta.href}>
                  {slide.cta.label}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="ghost"
                className="font-medium text-white hover:text-white hover:bg-white/15"
                style={{ border: '1px solid rgba(255,255,255,0.35)' }}
              >
                <Link href={slide.sub.href}>{slide.sub.label}</Link>
              </Button>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* ──────────────────────────────────────────────────────────
          Side arrows — large, frosted glass, always visible
      ─────────────────────────────────────────────────────────── */}
      {(
        [
          {
            i: (index - 1 + slides.length) % slides.length,
            Icon: ChevronLeft,
            side: 'left-4 md:left-6',
            label: 'Previous slide',
          },
          {
            i: (index + 1) % slides.length,
            Icon: ChevronRight,
            side: 'right-4 md:right-6',
            label: 'Next slide',
          },
        ] as const
      ).map(({ i, Icon, side, label }) => (
        <button
          key={label}
          onClick={() => goTo(i)}
          aria-label={label}
          className={`absolute ${side} top-1/2 -translate-y-1/2 z-20 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95`}
          style={{
            backgroundColor: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.35)',
            color: 'white',
          }}
        >
          <Icon className="h-5 w-5 md:h-6 md:w-6" />
        </button>
      ))}

      {/* ──────────────────────────────────────────────────────────
          Bottom controls — progress bar + counter + dots + scroll
      ─────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-6 md:px-10 pb-5">
        {/* Full-width progress bar */}
        <div
          className="h-px mb-4"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
        >
          {!prefersReduced && (
            <motion.div
              key={`prog-${index}`}
              className="h-full origin-left"
              style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: SLIDE_DURATION / 1000, ease: 'linear' }}
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          {/* Slide counter */}
          <div className="flex items-baseline gap-1 select-none min-w-14">
            <div style={{ overflow: 'hidden' }}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={index}
                  className="font-serif font-bold text-white block"
                  style={{ fontSize: '1.5rem', lineHeight: 1 }}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE_O }}
                >
                  {String(index + 1).padStart(2, '0')}
                </motion.span>
              </AnimatePresence>
            </div>
            <span className="text-white/40 text-sm font-medium">
              / {String(slides.length).padStart(2, '0')}
            </span>
          </div>

          {/* Dot pills */}
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <motion.button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className="relative rounded-full overflow-hidden cursor-pointer"
                style={{ height: 5 }}
                animate={{ width: i === index ? 44 : 12 }}
                transition={{ duration: 0.38, ease: EASE_O }}
              >
                {/* Track */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.28)' }}
                />
                {/* Fill */}
                {i === index && !prefersReduced && (
                  <motion.div
                    key={`df-${index}`}
                    className="absolute inset-0 rounded-full origin-left bg-white"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{
                      duration: SLIDE_DURATION / 1000,
                      ease: 'linear',
                    }}
                  />
                )}
              </motion.button>
            ))}
          </div>

          {/* Scroll cue */}
          <motion.button
            className="flex flex-col items-center gap-1 cursor-pointer"
            animate={prefersReduced ? {} : { y: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.9, ease: 'easeInOut' }}
            onClick={() => {
              const next = sectionRef.current
                ?.nextElementSibling as HTMLElement | null;
              next?.scrollIntoView({ behavior: 'smooth' });
            }}
            aria-label="Scroll to next section"
          >
            <span
              className="text-[9px] uppercase text-white/55 font-medium"
              style={{ letterSpacing: '0.2em' }}
            >
              Scroll
            </span>
            <ChevronDown className="h-4 w-4 text-white/55" />
          </motion.button>
        </div>
      </div>
    </section>
  );
}
