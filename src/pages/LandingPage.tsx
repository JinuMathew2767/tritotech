import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Ticket, BookOpen, ArrowRight, CheckCircle, Zap, Clock, Users } from 'lucide-react'
import companyService from '@/services/companyService'
import { fetchBrandingSettings, getBrandingSettings } from '@/services/brandingService'

const features = [
  { icon: Ticket, title: 'Report an Issue', desc: 'Quickly submit IT support tickets and track their status in real time.' },
  { icon: BookOpen, title: 'Knowledge Base', desc: 'Access self-service articles and step-by-step guides to resolve common issues.' },
  { icon: Shield, title: 'Track Tickets', desc: 'Monitor your support requests from submission through to resolution.' },
]

const highlights = [
  { icon: Zap, value: 'Fast Intake', label: 'Ticket routing and handling in one place' },
  { icon: CheckCircle, value: 'Live SLA', label: 'Dashboards use current operational data' },
  { icon: Clock, value: 'Clear Tracking', label: 'Expected and actual resolution timelines' },
  { icon: Users, value: 'Role-Based Access', label: 'Employees, IT staff, and admins' },
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

  return (
    <div className="min-h-screen bg-white">
      <header className="glassmorphism sticky top-0 z-40 px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-[#4E5A7A] shadow-sm sm:h-8 sm:w-8 sm:rounded-lg">
              {branding.logoDataUrl ? (
                <img src={branding.logoDataUrl} alt={`${branding.appName} logo`} className="h-full w-full object-contain bg-white p-1" />
              ) : (
                <Shield className="h-4 w-4 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold leading-tight text-slate-900">{branding.appName}</p>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400 sm:hidden">
                Enterprise IT Support
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
            <Link to="/login" className="btn-secondary w-full px-3 py-3 text-sm sm:w-auto sm:px-4 sm:py-2">
              Sign In
            </Link>
            <Link to="/signup" className="btn-primary w-full px-3 py-3 text-sm sm:w-auto sm:px-4 sm:py-2">
              Create Account
            </Link>
          </div>
        </div>
      </header>

      <section className="relative flex min-h-[540px] items-center overflow-hidden sm:min-h-[520px]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#111c21] to-[#1a2e3a]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#4E5A7A]/20 to-transparent" />
        <div
          className="absolute inset-0 opacity-12 md:inset-y-0 md:left-auto md:right-0 md:w-[45%] md:opacity-20"
          style={{ background: "url('https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800') center/cover" }}
        />

        <div className="relative z-10 mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#4E5A7A]/40 bg-[#4E5A7A]/20 px-3 py-1.5 text-[11px] font-semibold text-[#b8c2db] sm:text-xs">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4E5A7A]" />
            Enterprise IT Support Portal
          </div>

          <h1 className="mb-4 text-4xl font-extrabold leading-[1.05] text-white sm:text-5xl">
            IT Support,
            <br />
            <span className="text-gradient-primary">Reimagined</span>
          </h1>

          <p className="mx-auto mb-8 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
            A unified helpdesk platform for the Triton Group. Submit tickets, track issues, and get expert IT support in one shared workflow.
          </p>

          <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link to="/signup" className="btn-primary w-full justify-center rounded-2xl px-6 py-3 text-base shadow-lg shadow-[#4E5A7A]/30 sm:w-auto">
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/login" className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-white">
              Already have an account? Sign In
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-[#f6f7f8] py-10 sm:py-12">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-5 px-4 sm:px-6 md:grid-cols-4 md:gap-6">
          {highlights.map(({ icon: Icon, value, label }) => (
            <div key={label} className="text-center">
              <Icon className="mx-auto mb-2 h-6 w-6 text-[#4E5A7A]" />
              <div className="text-lg font-extrabold text-slate-900">{value}</div>
              <div className="mt-0.5 text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="mb-2 text-center text-2xl font-bold text-slate-900">Everything you need</h2>
        <p className="mb-10 text-center text-slate-500">A complete IT support ecosystem, built for enterprise scale.</p>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-5 text-center transition-shadow hover:shadow-md group sm:p-6">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#4E5A7A]/10 transition-colors group-hover:bg-[#4E5A7A]">
                <Icon className="h-6 w-6 text-[#4E5A7A] transition-colors group-hover:text-white" />
              </div>
              <h3 className="mb-2 font-semibold text-slate-900">{title}</h3>
              <p className="text-sm text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden border-y border-slate-200 bg-slate-50 px-4 py-10 sm:px-6">
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-slate-400">Triton Group Companies</p>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:gap-8">
          {companies.map((company) => (
            <div key={company} className="relative px-3 py-2 sm:px-6">
              <span className="cursor-default select-none text-center text-base font-bold text-slate-300 transition-colors hover:text-[#4E5A7A] sm:text-lg">
                {company}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-r from-[#4E5A7A] to-[#1a95d0] px-4 py-12 text-center text-white sm:px-6 sm:py-14">
        <BookOpen className="mx-auto mb-4 h-10 w-10 opacity-80" />
        <h2 className="mb-2 text-2xl font-bold">Explore the Knowledge Base</h2>
        <p className="mb-6 text-white/80">Find guides, FAQs, and self-service solutions to resolve issues independently.</p>
        <button className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-[#4E5A7A] transition-all hover:shadow-lg">
          Browse Articles <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      <footer className="bg-[#111c21] px-4 py-8 text-slate-400 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm md:flex-row">
          <div className="flex items-center gap-2 text-white">
            <Shield className="h-4 w-4 text-[#4E5A7A]" />
            <span className="font-semibold">{branding.appName}</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="transition-colors hover:text-white">Privacy</a>
            <a href="#" className="transition-colors hover:text-white">Terms</a>
            <a href="#" className="transition-colors hover:text-white">Contact</a>
          </div>
          <p>(c) {new Date().getFullYear()} Triton Group</p>
        </div>
      </footer>
    </div>
  )
}
