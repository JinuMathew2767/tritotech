import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock3,
  Headphones,
  Shield,
  Sparkles,
  Ticket,
  Users,
  Zap,
} from 'lucide-react'
import companyService from '@/services/companyService'
import { fetchBrandingSettings, getBrandingSettings } from '@/services/brandingService'

const heroFeatures = [
  {
    icon: Ticket,
    title: 'Fast intake',
    desc: 'Raise incidents, service requests, and follow-ups through one structured portal.',
  },
  {
    icon: BarChart3,
    title: 'Live visibility',
    desc: 'Track ownership, status, and SLA movement with current operational data.',
  },
  {
    icon: Users,
    title: 'Role-based workflows',
    desc: 'Employees, IT staff, and admins work in one shared system without losing control.',
  },
]

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
  {
    icon: Headphones,
    value: 'One support front door',
    label: 'Requests, updates, and conversations live in one place.',
  },
]

const workflowSteps = [
  'Submit a request with the right company, department, and issue details.',
  'Route work to the correct support team with full status visibility.',
  'Resolve faster with comments, assignments, and operational dashboards.',
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

  const companyPreview = companies.slice(0, 6)
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
          className="absolute inset-y-0 right-0 hidden w-[48%] opacity-45 mix-blend-screen lg:block"
          style={{
            background:
              "linear-gradient(180deg,rgba(8,19,31,0.18),rgba(8,19,31,0.74)), url('https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200') center/cover",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%)]" />

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-center lg:px-8 lg:py-24">
          <div className="max-w-2xl">
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

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Coverage</div>
                <div className="mt-2 text-[2rem] font-extrabold leading-none tracking-[-0.05em] text-white">{companyCountLabel}</div>
                <div className="mt-2 text-sm font-medium text-slate-300">company environments supported</div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workflow</div>
                <div className="mt-2 text-[2rem] font-extrabold leading-none tracking-[-0.05em] text-white">24/7</div>
                <div className="mt-2 text-sm font-medium text-slate-300">request visibility and status tracking</div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Access</div>
                <div className="mt-2 text-[2rem] font-extrabold leading-none tracking-[-0.05em] text-white">3</div>
                <div className="mt-2 text-sm font-medium text-slate-300">employee, IT staff, and admin roles</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-10 top-10 hidden h-28 w-28 rounded-full bg-sky-400/18 blur-3xl lg:block" />
            <div className="absolute -right-6 bottom-6 hidden h-24 w-24 rounded-full bg-indigo-300/16 blur-3xl lg:block" />

            <div className="card relative overflow-hidden border-white/12 bg-[linear-gradient(180deg,rgba(10,19,31,0.76)_0%,rgba(14,28,43,0.64)_100%)] p-5 text-white shadow-[0_35px_90px_-45px_rgba(8,19,31,0.88)] sm:p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.24),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_22%)]" />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Executive pulse</p>
                    <h2 className="mt-3 text-[1.75rem] font-extrabold leading-[0.98] tracking-[-0.05em] text-white sm:text-[2rem]">
                      Keep every request visible from intake to resolution.
                    </h2>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/8 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                    <Shield className="h-5 w-5 text-sky-100" />
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[20px] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Now monitoring</div>
                    <div className="mt-2 text-[1.9rem] font-extrabold leading-none tracking-[-0.05em] text-white">
                      Ticket flow
                    </div>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-300">
                      Employees can submit structured requests while teams keep status, assignee, and reply history visible.
                    </p>
                  </div>

                  <div className="rounded-[20px] border border-sky-300/18 bg-[linear-gradient(180deg,rgba(129,140,248,0.14)_0%,rgba(56,189,248,0.08)_100%)] p-4 backdrop-blur-sm">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">Coverage map</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {companyPreview.length > 0 ? (
                        companyPreview.map((company) => (
                          <span
                            key={company}
                            className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-[12px] font-medium text-slate-100"
                          >
                            {company}
                          </span>
                        ))
                      ) : (
                        <>
                          <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-[12px] font-medium text-slate-100">
                            Triton Group
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-[12px] font-medium text-slate-100">
                            Multi-company ready
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {workflowSteps.map((step, index) => (
                    <div
                      key={step}
                      className="flex items-start gap-3 rounded-[18px] border border-white/8 bg-white/6 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/12 text-[12px] font-semibold text-white">
                        {index + 1}
                      </div>
                      <p className="text-[13px] font-medium leading-6 text-slate-200">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {portalHighlights.map(({ icon: Icon, value, label }) => (
            <div key={value} className="card p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#eef3fb_0%,#ffffff_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                <Icon className="h-5 w-5 text-[#4E5A7A]" />
              </div>
              <h3 className="mt-5 text-[1.25rem] font-bold leading-[1.05] tracking-[-0.04em] text-slate-950">{value}</h3>
              <p className="mt-3 text-[14px] font-medium leading-7 text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="card overflow-hidden p-6 sm:p-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              <Zap className="h-3.5 w-3.5 text-[#4E5A7A]" />
              Why teams adopt it
            </div>

            <h2 className="mt-5 text-[2rem] font-extrabold leading-[0.98] tracking-[-0.05em] text-slate-950 sm:text-[2.35rem]">
              Everything your IT support workflow needs, without the clutter.
            </h2>

            <p className="mt-4 max-w-xl text-[15px] font-medium leading-8 text-slate-500">
              The portal keeps request intake, progress tracking, communication, and operational oversight in one calm,
              structured experience that feels modern on desktop and mobile.
            </p>

            <div className="mt-7 grid gap-3">
              {heroFeatures.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-[22px] border border-slate-200/85 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbfe_100%)] p-4 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.22)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#4E5A7A]/10">
                      <Icon className="h-5 w-5 text-[#4E5A7A]" />
                    </div>
                    <div>
                      <h3 className="text-[1.05rem] font-bold leading-tight tracking-[-0.03em] text-slate-950">{title}</h3>
                      <p className="mt-1.5 text-[13.5px] font-medium leading-6 text-slate-500">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden p-6 sm:p-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              <BookOpen className="h-3.5 w-3.5 text-[#4E5A7A]" />
              Triton-ready platform
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f7fafc_100%)] p-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Unified workflow</div>
                <div className="mt-3 text-[1.65rem] font-extrabold leading-[0.98] tracking-[-0.05em] text-slate-950">
                  Ticketing, visibility, and support updates in one place.
                </div>
                <p className="mt-3 text-[13.5px] font-medium leading-6 text-slate-500">
                  Users always know what they raised, where it is, and who owns the next step.
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,#eef5ff_0%,#ffffff_100%)] p-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Operational clarity</div>
                <div className="mt-3 text-[1.65rem] font-extrabold leading-[0.98] tracking-[-0.05em] text-slate-950">
                  Status, assignee, SLA, and comments stay easy to read.
                </div>
                <p className="mt-3 text-[13.5px] font-medium leading-6 text-slate-500">
                  The experience is designed to feel calm and usable instead of dense and administrative.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-slate-200/80 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_100%)] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Company footprint</p>
                  <h3 className="mt-2 text-[1.25rem] font-bold leading-tight tracking-[-0.03em] text-slate-950">
                    Built to support Triton Group operations across companies and departments.
                  </h3>
                </div>
                <div className="rounded-full bg-[#4E5A7A]/8 px-4 py-2 text-[13px] font-semibold text-[#4E5A7A]">
                  {companies.length > 0 ? `${companies.length} companies configured` : 'Company-ready setup'}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2.5">
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
          </div>
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6 lg:px-8 lg:pb-20">
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
