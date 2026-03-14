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
      <header className="glassmorphism sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-[#4E5A7A]">
            {branding.logoDataUrl ? (
              <img src={branding.logoDataUrl} alt={`${branding.appName} logo`} className="h-full w-full object-contain bg-white p-1" />
            ) : (
              <Shield className="w-4 h-4 text-white" />
            )}
          </div>
          <span className="font-bold text-slate-900 text-lg">{branding.appName}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-secondary text-sm px-4 py-2">Sign In</Link>
          <Link to="/signup" className="btn-primary text-sm px-4 py-2">Create Account</Link>
        </div>
      </header>

      <section className="relative min-h-[520px] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#111c21] to-[#1a2e3a]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#4E5A7A]/20 to-transparent" />
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-20"
          style={{ background: "url('https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800') center/cover" }} />
        <div className="relative z-10 max-w-3xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-[#4E5A7A]/20 border border-[#4E5A7A]/40 text-[#4E5A7A] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-[#4E5A7A] rounded-full animate-pulse" />
            Enterprise IT Support Portal
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            IT Support,
            <br />
            <span className="text-gradient-primary">Reimagined</span>
          </h1>
          <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
            A unified helpdesk platform for the Triton Group. Submit tickets, track issues, and get expert IT support in one shared workflow.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/signup" className="btn-primary text-base px-6 py-3 rounded-xl shadow-lg shadow-[#4E5A7A]/30">
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium transition-colors">
              Already have an account? Sign In
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#f6f7f8] py-12 border-y border-slate-200">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {highlights.map(({ icon: Icon, value, label }) => (
            <div key={label} className="text-center">
              <Icon className="w-6 h-6 text-[#4E5A7A] mx-auto mb-2" />
              <div className="text-lg font-extrabold text-slate-900">{value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-6 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">Everything you need</h2>
        <p className="text-slate-500 text-center mb-10">A complete IT support ecosystem, built for enterprise scale.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-6 text-center hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-xl bg-[#4E5A7A]/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-[#4E5A7A] transition-colors">
                <Icon className="w-6 h-6 text-[#4E5A7A] group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 border-y border-slate-200 py-10 px-6 overflow-hidden">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest text-center mb-6">Triton Group Companies</p>
        <div className="flex items-center justify-center flex-wrap gap-8">
          {companies.map((c) => (
            <div key={c} className="relative px-6 py-2">
              <span className="text-slate-300 hover:text-[#4E5A7A] font-bold text-lg transition-colors cursor-default select-none">
                {c}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-r from-[#4E5A7A] to-[#1a95d0] py-14 px-6 text-center text-white">
        <BookOpen className="w-10 h-10 mx-auto mb-4 opacity-80" />
        <h2 className="text-2xl font-bold mb-2">Explore the Knowledge Base</h2>
        <p className="text-white/80 mb-6">Find guides, FAQs, and self-service solutions to resolve issues independently.</p>
        <button className="inline-flex items-center gap-2 bg-white text-[#4E5A7A] font-semibold px-6 py-3 rounded-xl hover:shadow-lg transition-all">
          Browse Articles <ArrowRight className="w-4 h-4" />
        </button>
      </section>

      <footer className="bg-[#111c21] text-slate-400 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2 text-white">
            <Shield className="w-4 h-4 text-[#4E5A7A]" />
            <span className="font-semibold">{branding.appName}</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
          <p>© {new Date().getFullYear()} Triton Group</p>
        </div>
      </footer>
    </div>
  )
}

