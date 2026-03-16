import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Clock3,
  Layers3,
  MessageSquareText,
  Shield,
  Sparkles,
  Ticket,
} from 'lucide-react'
import { fetchBrandingSettings, getBrandingSettings } from '@/services/brandingService'

const featureCards = [
  {
    icon: Ticket,
    title: 'Structured requests',
    desc: 'Give every issue a clean starting point with guided ticket intake and clearer routing.',
  },
  {
    icon: MessageSquareText,
    title: 'Visible conversations',
    desc: 'Keep updates, assignees, and replies together so support never feels scattered.',
  },
  {
    icon: Clock3,
    title: 'Real-time clarity',
    desc: 'Status, ownership, and timelines stay readable from the first request to resolution.',
  },
]

const valuePills = ['Ticketing', 'Approvals', 'Status tracking', 'Role-based access', 'Knowledge base ready']

export default function LandingPage() {
  const [branding, setBranding] = useState(() => getBrandingSettings())

  useEffect(() => {
    void fetchBrandingSettings()
      .then((settings) => setBranding(settings))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (!elements.length) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion || typeof IntersectionObserver === 'undefined') {
      elements.forEach((element) => element.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.18,
        rootMargin: '0px 0px -10% 0px',
      },
    )

    elements.forEach((element, index) => {
      if (!element.style.transitionDelay) {
        element.style.transitionDelay = `${Math.min(index * 70, 220)}ms`
      }
      observer.observe(element)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#eef4f8_46%,#f8fbfd_100%)] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-white/65 bg-white/78 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-slate-200/85 bg-[linear-gradient(180deg,#ffffff_0%,#f1f5f9_100%)] p-2.5 shadow-[0_18px_38px_-28px_rgba(15,23,42,0.38)]">
              {branding.logoDataUrl ? (
                <img
                  src={branding.logoDataUrl}
                  alt={`${branding.appName} logo`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <Shield className="h-7 w-7 text-[#4E5A7A]" />
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate text-[1.55rem] font-extrabold leading-none tracking-[-0.05em] text-slate-950">
                {branding.appName}
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Modern support portal
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d7deeb] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(243,247,252,0.96)_100%)] px-4 py-2.5 text-[13.5px] font-semibold leading-none tracking-[-0.015em] text-[#4E5A7A] shadow-[0_0_0_1px_rgba(122,141,184,0.08),0_16px_30px_-24px_rgba(78,90,122,0.38)] transition-all hover:-translate-y-0.5 hover:border-[#c5d0e2] hover:shadow-[0_0_0_1px_rgba(122,141,184,0.12),0_18px_34px_-24px_rgba(78,90,122,0.42)]"
            >
              Sign In
            </Link>
            <Link to="/signup" className="btn-primary px-5 py-2.5">
              Create Account
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:hidden">
            <Link to="/login" className="btn-secondary px-3 py-2.5 text-[12px]">
              Sign In
            </Link>
            <Link to="/signup" className="btn-primary px-3 py-2.5 text-[12px]">
              Join
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(119,130,246,0.18),transparent_24%),radial-gradient(circle_at_78%_24%,rgba(34,197,94,0.08),transparent_18%),linear-gradient(135deg,#09131f_0%,#0d1b2a_50%,#152638_100%)]" />
        <div className="absolute inset-y-0 right-0 hidden w-[42%] bg-[linear-gradient(90deg,rgba(9,19,31,0)_0%,rgba(9,19,31,0.24)_20%,rgba(9,19,31,0.66)_100%)] lg:block" />
        <div className="landing-pan absolute inset-y-0 right-0 hidden w-[46%] opacity-40 mix-blend-screen lg:block">
          <div className="h-full w-full bg-[url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200')] bg-cover bg-center" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_36%)]" />

        <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] lg:items-center lg:px-8 lg:py-24">
          <div data-reveal className="reveal reveal-left max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-sky-200" />
              Cleaner support experience
            </div>

            <h1 className="max-w-3xl text-[2.9rem] font-extrabold leading-[0.9] tracking-[-0.065em] text-white sm:text-[3.8rem] lg:text-[5rem]">
              Support that feels modern from the first click.
            </h1>

            <p className="mt-5 max-w-xl text-[15px] font-medium leading-8 text-slate-300 sm:text-[17px]">
              A sleek helpdesk portal for teams that want structured requests, clear communication, and a calmer workflow.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#7a8db8_0%,#576687_100%)] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_24px_50px_-26px_rgba(122,141,184,0.65)] transition-all hover:-translate-y-0.5 hover:shadow-[0_30px_55px_-26px_rgba(122,141,184,0.72)]"
              >
                Create Account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-6 py-3.5 text-[15px] font-semibold text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition-all hover:bg-white/12"
              >
                Sign In
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2.5">
              {valuePills.map((pill) => (
                <span
                  key={pill}
                  className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[12px] font-semibold text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm"
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>

          <div data-reveal className="reveal reveal-right relative">
            <div className="landing-drift absolute -left-10 top-8 hidden h-28 w-28 rounded-full bg-indigo-300/18 blur-3xl lg:block" />
            <div className="landing-drift absolute -right-6 bottom-8 hidden h-24 w-24 rounded-full bg-sky-300/16 blur-3xl lg:block" />

            <div className="landing-float relative overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(13,24,39,0.82)_0%,rgba(17,33,54,0.72)_100%)] p-5 text-white shadow-[0_35px_90px_-42px_rgba(8,19,31,0.88)] backdrop-blur-xl sm:p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_22%)]" />

              <div className="relative z-10">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Live workspace</p>
                    <h2 className="mt-2 text-[1.55rem] font-extrabold leading-[0.98] tracking-[-0.05em] text-white sm:text-[1.8rem]">
                      A support portal people actually enjoy using.
                    </h2>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <Shield className="h-5 w-5 text-sky-100" />
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-[22px] border border-white/10 bg-white/7 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">New ticket</p>
                        <p className="mt-2 text-[15px] font-semibold text-white">VPN access issue for remote employee</p>
                      </div>
                      <span className="rounded-full bg-emerald-400/14 px-3 py-1.5 text-[11px] font-semibold text-emerald-200">
                        Active
                      </span>
                    </div>
                    <p className="mt-3 text-[13px] font-medium leading-6 text-slate-300">
                      Routed, assigned, and ready for follow-up without extra back-and-forth.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[20px] border border-white/10 bg-white/7 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Status</p>
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-sky-400/12 px-3 py-1.5 text-[12px] font-semibold text-sky-100">
                        <span className="h-2 w-2 rounded-full bg-sky-300" />
                        In progress
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-white/10 bg-white/7 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Replies</p>
                      <p className="mt-3 text-[14px] font-medium leading-6 text-slate-200">
                        Comments and updates stay inside the ticket, not lost in email threads.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section data-reveal className="reveal mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Why it works</p>
          <h2 className="mt-3 text-[2rem] font-extrabold leading-[0.98] tracking-[-0.05em] text-slate-950 sm:text-[2.5rem]">
            Designed to feel lighter, clearer, and faster.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {featureCards.map(({ icon: Icon, title, desc }, index) => (
            <div
              key={title}
              data-reveal
              className="reveal card p-6"
              style={{ transitionDelay: `${120 + index * 90}ms` }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#eef3fb_0%,#ffffff_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                <Icon className="h-5 w-5 text-[#4E5A7A]" />
              </div>
              <h3 className="mt-5 text-[1.22rem] font-bold leading-[1.05] tracking-[-0.04em] text-slate-950">{title}</h3>
              <p className="mt-3 text-[14px] font-medium leading-7 text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section data-reveal className="reveal px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[34px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(126,147,193,0.16),transparent_24%),linear-gradient(135deg,#f8fbff_0%,#eef4f9_44%,#f8fbfd_100%)] p-7 shadow-[0_32px_75px_-54px_rgba(15,23,42,0.38)] sm:p-9">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                <Layers3 className="h-3.5 w-3.5 text-[#4E5A7A]" />
                Ready to launch
              </div>
              <h2 className="mt-5 text-[2rem] font-extrabold leading-[0.98] tracking-[-0.05em] text-slate-950 sm:text-[2.65rem]">
                Start with a cleaner support experience and grow from there.
              </h2>
              <p className="mt-4 max-w-2xl text-[15px] font-medium leading-8 text-slate-500">
                Keep the experience simple on day one, then expand with approvals, analytics, and deeper workflows as your
                team grows.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link to="/signup" className="btn-primary min-w-[220px] px-6 py-3.5 text-[14px]">
                Create Account
              </Link>
              <Link to="/login" className="btn-secondary min-w-[220px] px-6 py-3.5 text-[14px]">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200/80 bg-white/80 px-4 py-8 text-slate-500 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-slate-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f1f5f9_100%)] p-2 shadow-[0_18px_30px_-24px_rgba(15,23,42,0.35)]">
              {branding.logoDataUrl ? (
                <img
                  src={branding.logoDataUrl}
                  alt={`${branding.appName} logo`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <Shield className="h-4 w-4 text-[#4E5A7A]" />
              )}
            </div>
            <div>
              <div className="text-[14px] font-semibold text-slate-900">{branding.appName}</div>
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">Support portal</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-5 text-[13px] font-medium">
            <a href="#" className="transition-colors hover:text-slate-900">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-slate-900">
              Terms
            </a>
            <a href="#" className="transition-colors hover:text-slate-900">
              Contact
            </a>
          </div>

          <p className="text-[13px] font-medium">(c) {new Date().getFullYear()} {branding.appName}</p>
        </div>
      </footer>
    </div>
  )
}
