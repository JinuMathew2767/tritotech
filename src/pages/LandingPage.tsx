import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react'
import companyService from '@/services/companyService'
import { fetchBrandingSettings, getBrandingSettings } from '@/services/brandingService'

const portalHighlights = [
  {
    icon: CheckCircle2,
    value: 'Faster routing',
    label: 'Tickets land with the right team sooner.',
  },
  {
    icon: Clock3,
    value: 'Clear timelines',
    label: 'Users can see expected and actual resolution progress.',
  },
  {
    icon: Building2,
    value: 'Group-ready',
    label: 'One experience across companies, departments, and roles.',
  },
]

export default function LandingPage() {
  const [branding, setBranding] = useState(() => getBrandingSettings())
  const [companies, setCompanies] = useState<string[]>([])

  useEffect(() => {
    void fetchBrandingSettings()
      .then((settings) => setBranding(settings))
      .catch(() => undefined)

    void companyService
      .listPublic()
      .then((items) => setCompanies(items.map((item) => item.name)))
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

  const companyPreview = companies.slice(0, 5)
  const companyCountLabel = companies.length > 0 ? `${companies.length}+` : 'Multi'

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbfe_0%,#eef4f8_48%,#f7fafc_100%)] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-white/65 bg-white/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-slate-200/85 bg-[linear-gradient(180deg,#ffffff_0%,#f1f5f9_100%)] p-2.5 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.45)]">
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
                Triton Group Support Portal
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <Link to="/login" className="btn-secondary px-4 py-2.5">
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

      <section className="relative overflow-hidden border-b border-white/60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(120,157,255,0.18),transparent_28%),radial-gradient(circle_at_80%_22%,rgba(56,189,248,0.14),transparent_20%),linear-gradient(135deg,#08131f_0%,#0f1e2b_52%,#162b36_100%)]" />
        <div className="absolute inset-y-0 right-0 hidden w-[44%] bg-[linear-gradient(90deg,rgba(8,19,31,0)_0%,rgba(8,19,31,0.28)_18%,rgba(8,19,31,0.64)_100%)] lg:block" />
        <div
          className="landing-pan absolute inset-y-0 right-0 hidden w-[48%] opacity-45 mix-blend-screen lg:block"
          style={{
            background:
              "linear-gradient(180deg,rgba(8,19,31,0.18),rgba(8,19,31,0.74)), url('https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200') center/cover",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%)]" />

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-center lg:px-8 lg:py-24">
          <div data-reveal className="reveal reveal-left max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-sky-200" />
              Enterprise IT support, redesigned for Triton
            </div>

            <h1 className="max-w-3xl text-[2.85rem] font-extrabold leading-[0.92] tracking-[-0.06em] text-white sm:text-[3.75rem] lg:text-[4.6rem]">
              The smarter front door for every IT request.
            </h1>

            <p className="mt-5 max-w-2xl text-[15px] font-medium leading-8 text-slate-300 sm:text-[17px]">
              Bring ticket creation, routing, communication, and visibility into one polished support portal for employees,
              IT staff, and administrators across the Triton Group.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#7a8db8_0%,#576687_100%)] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_24px_50px_-26px_rgba(122,141,184,0.65)] transition-all hover:-translate-y-0.5 hover:shadow-[0_30px_55px_-26px_rgba(122,141,184,0.7)]"
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

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="rounded-full border border-white/12 bg-white/8 px-4 py-2.5 text-[13px] font-semibold text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm">
                {companyCountLabel} company environments supported
              </div>
              <div className="rounded-full border border-white/12 bg-white/8 px-4 py-2.5 text-[13px] font-semibold text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm">
                Employees, IT staff, and admins in one workflow
              </div>
            </div>
          </div>

          <div data-reveal className="reveal reveal-right relative">
            <div className="landing-drift absolute -left-10 top-10 hidden h-28 w-28 rounded-full bg-sky-400/18 blur-3xl lg:block" />
            <div className="landing-drift absolute -right-6 bottom-6 hidden h-24 w-24 rounded-full bg-indigo-300/16 blur-3xl lg:block" />

            <div className="landing-float card relative overflow-hidden border-white/12 bg-[linear-gradient(180deg,rgba(10,19,31,0.76)_0%,rgba(14,28,43,0.64)_100%)] p-5 text-white shadow-[0_35px_90px_-45px_rgba(8,19,31,0.88)] sm:p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.24),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_22%)]" />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Support at a glance</p>
                    <h2 className="mt-3 text-[1.75rem] font-extrabold leading-[0.98] tracking-[-0.05em] text-white sm:text-[2rem]">
                      Keep support simple, visible, and easy to follow.
                    </h2>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/8 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                    <Shield className="h-5 w-5 text-sky-100" />
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="rounded-[20px] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Core experience</div>
                    <p className="mt-2 text-sm font-medium leading-7 text-slate-200">
                      Raise a request, see who owns it, follow progress, and stay updated without digging through emails or
                      disconnected tools.
                    </p>
                  </div>

                  <div className="rounded-[20px] border border-sky-300/18 bg-[linear-gradient(180deg,rgba(129,140,248,0.14)_0%,rgba(56,189,248,0.08)_100%)] p-4 backdrop-blur-sm">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">Company footprint</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(companyPreview.length > 0 ? companyPreview : ['Triton Group', 'Multi-company ready']).map((company) => (
                        <span
                          key={company}
                          className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-[12px] font-medium text-slate-100"
                        >
                          {company}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section data-reveal className="reveal mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mb-8 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Why it works</p>
          <h2 className="mt-3 text-[2rem] font-extrabold leading-[0.98] tracking-[-0.05em] text-slate-950 sm:text-[2.35rem]">
            A cleaner support experience for the whole organization.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {portalHighlights.map(({ icon: Icon, value, label }, index) => (
            <div
              key={value}
              data-reveal
              className="reveal card p-5"
              style={{ transitionDelay: `${120 + index * 90}ms` }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#eef3fb_0%,#ffffff_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                <Icon className="h-5 w-5 text-[#4E5A7A]" />
              </div>
              <h3 className="mt-5 text-[1.25rem] font-bold leading-[1.05] tracking-[-0.04em] text-slate-950">{value}</h3>
              <p className="mt-3 text-[14px] font-medium leading-7 text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section data-reveal className="reveal mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
        <div className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_100%)] p-6 shadow-[0_24px_55px_-42px_rgba(15,23,42,0.35)] sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                <Zap className="h-3.5 w-3.5 text-[#4E5A7A]" />
                Company footprint
              </div>
              <h2 className="mt-4 text-[1.9rem] font-extrabold leading-[0.98] tracking-[-0.05em] text-slate-950 sm:text-[2.25rem]">
                Built for Triton Group support operations across companies and departments.
              </h2>
              <p className="mt-3 text-[15px] font-medium leading-8 text-slate-500">
                One portal, one support language, and a much calmer experience for everyone using it.
              </p>
            </div>

            <div className="rounded-full bg-[#4E5A7A]/8 px-4 py-2 text-[13px] font-semibold text-[#4E5A7A]">
              {companies.length > 0 ? `${companies.length} companies configured` : 'Company-ready setup'}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {(companyPreview.length > 0 ? companyPreview : ['Triton Group', 'Operations', 'Shared IT']).map((company) => (
              <span
                key={company}
                className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-semibold text-slate-600 shadow-[0_10px_20px_-18px_rgba(15,23,42,0.25)]"
              >
                {company}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section data-reveal className="reveal px-4 pb-14 sm:px-6 lg:px-8 lg:pb-20">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[32px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(126,147,193,0.18),transparent_22%),linear-gradient(135deg,#f5f8fe_0%,#eef3f8_42%,#f8fbfd_100%)] p-6 shadow-[0_30px_70px_-52px_rgba(15,23,42,0.4)] sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                <Shield className="h-3.5 w-3.5 text-[#4E5A7A]" />
                Ready to launch
              </div>
              <h2 className="mt-5 text-[2rem] font-extrabold leading-[0.98] tracking-[-0.05em] text-slate-950 sm:text-[2.5rem]">
                Give your teams a support portal that feels as strong as the operation behind it.
              </h2>
              <p className="mt-4 max-w-2xl text-[15px] font-medium leading-8 text-slate-500">
                Join the portal to raise requests, follow progress, and collaborate through a cleaner enterprise support
                experience.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link to="/signup" className="btn-primary min-w-[210px] px-6 py-3.5 text-[14px]">
                Create Account
              </Link>
              <Link to="/login" className="btn-secondary min-w-[210px] px-6 py-3.5 text-[14px]">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200/80 bg-white/80 px-4 py-8 text-slate-500 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm md:flex-row md:items-center md:justify-between">
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
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">Triton Group</div>
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

          <p className="text-[13px] font-medium">(c) {new Date().getFullYear()} Triton Group</p>
        </div>
      </footer>
    </div>
  )
}
