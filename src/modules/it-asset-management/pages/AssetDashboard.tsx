import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FolderKanban,
  HardDrive,
  Package2,
  Plus,
  Repeat2,
  ShieldAlert,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import AssetModuleTabs from '../components/AssetModuleTabs'
import type { AssetRecord } from '../data/mockAssets'
import assetService from '../services/assetService'
import { getExpiryPresentation, summarizeAssets } from '../utils/assetUtils'

export default function AssetDashboard() {
  const [assets, setAssets] = useState<AssetRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    assetService
      .list()
      .then(setAssets)
      .catch(() => toast.error('Failed to load asset dashboard'))
      .finally(() => setLoading(false))
  }, [])

  const summary = useMemo(() => summarizeAssets(assets), [assets])
  const assignedCount = useMemo(() => assets.filter((asset) => !!asset.assignedTo.trim()).length, [assets])
  const availableCount = useMemo(() => assets.filter((asset) => !asset.assignedTo.trim() || asset.status === 'In Stock').length, [assets])
  const maintenanceCount = useMemo(
    () => assets.filter((asset) => asset.status === 'Maintenance' || asset.status === 'Retired').length,
    [assets]
  )
  const attentionAssets = useMemo(
    () =>
      assets.filter((asset) => {
        const status = getExpiryPresentation(asset.expiryDate).status
        return status === 'Expired' || status === 'Expiring Soon'
      }).slice(0, 5),
    [assets]
  )
  const attentionCount = summary.expiringSoon + summary.expired

  if (loading) return <PageLoader />

  const summaryStrip = [
    { label: 'Tracked', value: summary.totalAssets },
    { label: 'Available', value: availableCount },
    { label: 'Attention', value: attentionCount },
    { label: 'Assigned', value: assignedCount },
  ] as const

  const compactStats = [
    {
      label: 'Available Stock',
      value: availableCount,
      helper: 'Ready to issue',
      icon: Boxes,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Hardware',
      value: summary.hardwareAssets,
      helper: 'Physical devices',
      icon: HardDrive,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
    },
    {
      label: 'Software',
      value: summary.softwareAssets,
      helper: 'Licenses and subs',
      icon: Package2,
      color: 'text-violet-700',
      bg: 'bg-violet-50',
    },
    {
      label: 'Maintenance',
      value: maintenanceCount,
      helper: 'Service or retired',
      icon: CalendarClock,
      color: 'text-amber-700',
      bg: 'bg-amber-50',
    },
  ] as const

  const workspaceLinks = [
    {
      title: 'Asset Master',
      body: 'Browse and edit records',
      to: '/it-assets/master',
      icon: FolderKanban,
    },
    {
      title: 'Transactions',
      body: 'Issue, return, transfer',
      to: '/it-assets/transactions',
      icon: Repeat2,
    },
    {
      title: 'Renewals',
      body: 'Expiry and warranty watch',
      to: '/it-assets/analytics',
      icon: CalendarClock,
    },
  ]

  return (
    <div className="page-shell space-y-3">
      <AssetModuleTabs />

      <section className="overflow-hidden rounded-[24px] border border-white/70 bg-white/78 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.26)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-200/80 bg-[linear-gradient(90deg,#10293f_0%,#163957_52%,#1d4361_100%)] px-4 py-3 text-white">
          <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200">
            <Boxes className="h-3.5 w-3.5" />
            Asset Control
          </div>
          {summaryStrip.map((item) => (
            <div key={item.label} className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-100">
              <span className="uppercase tracking-[0.16em] text-slate-300">{item.label}</span>
              <span className="text-[1rem] font-bold text-white">{item.value}</span>
            </div>
          ))}
          <div className="ml-auto inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Live register
          </div>
        </div>

        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1.35fr)_320px]">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h1 className="text-[1.9rem] font-bold tracking-tight text-slate-950">Asset Desk</h1>
                <p className="mt-1 text-[13px] font-medium text-slate-500">Track stock, renewals, and the next action from one place.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/it-assets/master" className="btn-secondary gap-2 px-3 py-2 text-[12px]">
                  <FolderKanban className="h-4 w-4" />
                  Open Master
                </Link>
                <Link to="/it-assets/add" className="btn-primary gap-2 px-3 py-2 text-[12px]">
                  <Plus className="h-4 w-4" />
                  Add Asset
                </Link>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {compactStats.map(({ label, value, helper, icon: Icon, color, bg }) => (
                <div
                  key={label}
                  className="rounded-[20px] border border-white/75 bg-white/72 px-4 py-3 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.2)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
                      <p className="mt-2 text-[1.7rem] font-bold leading-none tracking-tight text-slate-950">{value}</p>
                      <p className="mt-2 text-[11px] text-slate-500">{helper}</p>
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${bg}`}>
                      <Icon className={`h-4.5 w-4.5 ${color}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-[22px] border border-slate-200/80 bg-[linear-gradient(180deg,#fbfdff_0%,#f5f8fb_100%)] p-4 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.15)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Workspace Shortcuts</p>
                  <h2 className="mt-1 text-[1.05rem] font-semibold tracking-tight text-slate-950">Jump into the right workspace</h2>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-[0_10px_22px_-20px_rgba(15,23,42,0.16)]">
                  3 sections
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {workspaceLinks.map(({ title, body, to, icon: Icon }) => (
                  <Link
                    key={title}
                    to={to}
                    className="flex items-center gap-3 rounded-[18px] border border-white/75 bg-white px-4 py-3 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.14)] transition-all hover:-translate-y-0.5 hover:border-slate-300"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#4E5A7A]">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold tracking-tight text-slate-900">{title}</p>
                      <p className="mt-1 text-[12px] text-slate-500">{body}</p>
                    </div>
                    <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[28px] bg-[linear-gradient(180deg,#072f47_0%,#08283d_100%)] p-5 text-white shadow-[0_24px_55px_-34px_rgba(8,19,31,0.7)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Focus Panel</p>
                <p className="mt-4 text-[2.8rem] font-bold leading-none tracking-tight">{attentionCount}</p>
                <p className="mt-2 text-[13px] font-medium text-slate-300">items needing renewal attention</p>
              </div>
              <button className="text-slate-300">...</button>
            </div>

            <div className="mt-6 h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-[linear-gradient(90deg,#f59e0b_0%,#fb7185_100%)]"
                style={{ width: `${Math.min(100, summary.totalAssets ? (attentionCount / summary.totalAssets) * 100 : 0)}%` }}
              />
            </div>

            <div className="mt-8 space-y-3">
              <div className="rounded-[18px] border border-white/8 bg-white/6 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">Expiring Soon</p>
                <p className="mt-2 text-[1.3rem] font-bold text-white">{summary.expiringSoon}</p>
                <p className="mt-1 text-[11px] text-slate-400">Renewals approaching in the next window</p>
              </div>
              <div className="rounded-[18px] border border-white/8 bg-white/6 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">Expired</p>
                <p className="mt-2 text-[1.3rem] font-bold text-white">{summary.expired}</p>
                <p className="mt-1 text-[11px] text-slate-400">Already past expiry and due for action</p>
              </div>
              <div className="rounded-[18px] border border-white/8 bg-white/6 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">Assigned Devices</p>
                <p className="mt-2 text-[1.3rem] font-bold text-white">{assignedCount}</p>
                <p className="mt-1 text-[11px] text-slate-400">Assets currently placed with users or teams</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="glass-table">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="ui-section-title">Attention Queue</h2>
                <p className="ui-data-note mt-1">
                  {attentionAssets.length > 0 ? `${attentionAssets.length} assets need follow-up now.` : 'No assets need immediate follow-up.'}
                </p>
              </div>
              <Link to="/it-assets/analytics" className="btn-secondary gap-2 self-start px-3 py-2 text-[12px] md:self-auto">
                <CalendarClock className="h-4 w-4" />
                Open Renewals
              </Link>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {attentionAssets.length === 0 ? (
              <div className="px-5 py-10 text-center text-slate-400">No expiring or expired assets right now.</div>
            ) : (
              attentionAssets.map((asset) => {
                const expiry = getExpiryPresentation(asset.expiryDate)
                return (
                  <div key={asset.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="ui-list-id">{asset.id}</p>
                      <h3 className="ui-list-title mt-1">{asset.name}</h3>
                      <p className="ui-list-meta mt-1">
                        {asset.category} - {asset.vendor} - {asset.assignedTo || 'Unassigned'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${expiry.badgeTone}`}>
                        {expiry.status}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {asset.expiryDate ? `Expires ${asset.expiryDate}` : 'Expiry not tracked'}
                      </span>
                      <Link to={`/it-assets/${asset.id}`} className="btn-secondary px-3 py-1.5 text-xs">
                        Open Asset <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="ui-section-title">Snapshot</h2>
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {[
                {
                  label: 'Maintenance',
                  value: maintenanceCount,
                  helper: 'Service or retired',
                  icon: CalendarClock,
                  tone: 'text-amber-700',
                  bg: 'bg-amber-50',
                },
                {
                  label: 'Expired',
                  value: summary.expired,
                  helper: 'Past expiry date',
                  icon: ShieldAlert,
                  tone: 'text-red-700',
                  bg: 'bg-red-50',
                },
                {
                  label: 'Hardware',
                  value: summary.hardwareAssets,
                  helper: 'Physical devices',
                  icon: HardDrive,
                  tone: 'text-blue-700',
                  bg: 'bg-blue-50',
                },
                {
                  label: 'Software',
                  value: summary.softwareAssets,
                  helper: 'Licenses and subs',
                  icon: Package2,
                  tone: 'text-violet-700',
                  bg: 'bg-violet-50',
                },
              ].map(({ label, value, helper, icon: Icon, tone, bg }) => (
                <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/85 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
                      <Icon className={`h-4.5 w-4.5 ${tone}`} />
                    </div>
                    <div>
                      <p className="ui-data-label">{label}</p>
                      <p className="mt-1 text-[12px] font-medium text-slate-500">{helper}</p>
                    </div>
                  </div>
                  <span className="text-[1.35rem] font-extrabold leading-none tracking-[-0.05em] text-slate-900">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
