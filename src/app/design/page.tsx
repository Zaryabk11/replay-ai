import type { Metadata } from "next"
import { ArrowUpIcon, RotateCcwIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { FieldMessage, Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DialogDemo, MotionDemo, ToastDemo } from "./_demos"

export const metadata: Metadata = { title: "Design · Recap" }

const core = [
  { name: "Deep Teal", hex: "#2F5D62", token: "deep-teal-500 · primary", bg: "bg-deep-teal-500" },
  { name: "Harbor Blue", hex: "#6C8CA0", token: "harbor-blue-500 · focus ring", bg: "bg-harbor-blue-500" },
  { name: "Ink", hex: "#1E2527", token: "ink-900 · primary text", bg: "bg-ink-900" },
  { name: "Slate", hex: "#5A676A", token: "slate-600 · secondary text", bg: "bg-slate-600" },
  { name: "Blue-Grey", hex: "#AAB8C1", token: "blue-grey-300 · borders, mute", bg: "bg-blue-grey-300" },
  { name: "Mist Paper", hex: "#F3F6F5", token: "mist-paper · app bg", bg: "bg-mist-paper border-b border-line-300" },
]

const supporting = [
  { token: "deep-teal-600", hex: "#244A4E", bg: "bg-deep-teal-600", note: "hover" },
  { token: "deep-teal-700", hex: "#1C3B3F", bg: "bg-deep-teal-700", note: "active" },
  { token: "deep-teal-50", hex: "#F6FAF9", bg: "bg-deep-teal-50", note: "selected row" },
  { token: "deep-teal-100", hex: "#EAF0EF", bg: "bg-deep-teal-100", note: "chip bg" },
  { token: "deep-teal-200", hex: "#CFE0DC", bg: "bg-deep-teal-200", note: "chip border" },
  { token: "slate-400", hex: "#8695A0", bg: "bg-slate-400", note: "tertiary text" },
  { token: "surface-raised", hex: "#F8FAF9", bg: "bg-surface-raised", note: "table head" },
  { token: "line-100", hex: "#F0F3F2", bg: "bg-line-100", note: "row divider" },
  { token: "line-200", hex: "#EAEEED", bg: "bg-line-200", note: "inner divider" },
  { token: "line-300", hex: "#E1E7E6", bg: "bg-line-300", note: "card border" },
  { token: "line-400", hex: "#D4DBDA", bg: "bg-line-400", note: "page rule" },
  { token: "line-500", hex: "#CBD5D3", bg: "bg-line-500", note: "input border" },
  { token: "highlight", hex: "#FBF0C9", bg: "bg-highlight", note: "search match" },
]

const semantic = [
  { name: "Success", msg: "Citation verified · saved", c: "success", bg: "#EAF2EC", border: "#C2DBC9", text: "#2E5E3A" },
  { name: "Warning", msg: "Low-confidence section", c: "warning", bg: "#FBF3E3", border: "#EAD4A8", text: "#8A6514" },
  { name: "Error", msg: "Upload failed · retry", c: "error", bg: "#FBECE9", border: "#F0C3BA", text: "#B23A28" },
  { name: "Info", msg: "Transcript is processing", c: "info", bg: "#EDF1F4", border: "#C4D3DC", text: "#3C5A6B" },
] as const

const semanticClass = {
  success: "border-success-border bg-success-bg text-success-text",
  warning: "border-warning-border bg-warning-bg text-warning-text",
  error: "border-error-border bg-error-bg text-error-text",
  info: "border-info-border bg-info-bg text-info-text",
}

const radii = [
  ["xs", "4px", "rounded-xs", "skeleton bars"],
  ["sm", "5px", "rounded-sm", "badge, chip"],
  ["md", "6px", "rounded-md", "panel, small button"],
  ["lg", "7px", "rounded-lg", "button, input"],
  ["xl", "8px", "rounded-xl", "card, toast"],
  ["2xl", "10px", "rounded-2xl", "framed screen"],
  ["3xl", "12px", "rounded-3xl", "dialog"],
]

const shadows = [
  ["card", "shadow-card", "0 1px 3px · .05"],
  ["toast", "shadow-toast", "0 4px 14px · .14"],
  ["popover", "shadow-popover", "0 6px 18px · .10"],
  ["dialog", "shadow-dialog", "0 12px 40px · .14"],
]

const rings = [
  ["focus", "shadow-focus", "harbor-blue / 45"],
  ["focus-input", "shadow-focus-input", "harbor-blue / 25"],
  ["focus-error", "shadow-focus-error", "coral / 12"],
  ["focus-success", "shadow-focus-success", "success / 10"],
]

function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`font-mono text-[11px] tracking-eyebrow text-slate uppercase ${className}`}>
      {children}
    </span>
  )
}

function Cap({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-2xs text-slate-400">{children}</span>
}

function Section({ id, n, title, children }: { id: string; n: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-11 scroll-mt-6">
      <div className="mb-4 flex items-baseline gap-3.5">
        <span className="font-mono text-xs font-medium text-deep-teal-500">{n}</span>
        <h2 className="font-serif text-2xl font-medium">{title}</h2>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}

function Panel({
  title,
  note,
  children,
  className = "",
}: {
  title: string
  note?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-md border border-line-300 bg-white p-8 ${className}`}>
      <Eyebrow>{title}</Eyebrow>
      {note && <p className="mt-1.5 mb-5 max-w-170 text-sm text-slate">{note}</p>}
      {!note && <div className="mb-5" />}
      {children}
    </div>
  )
}

function Tag({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2.25">
      <Cap>{label}</Cap>
      {children}
    </div>
  )
}

export default function DesignPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-6 pb-30">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-line-400 pt-10 pb-5">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3">
            <div className="flex size-7.5 items-center justify-center rounded-lg bg-deep-teal-500 text-base font-bold text-white">
              R
            </div>
            <span className="text-xl font-semibold tracking-tight">Recap</span>
          </div>
          <h1 className="max-w-155 font-serif text-3xl font-medium tracking-tight">
            Design System v2
          </h1>
          <p className="max-w-140 text-base text-slate">
            One teal palette, one token set, one button, one citation style. Every swatch and
            component below renders from the live tokens.
          </p>
        </div>
        <div className="flex flex-col gap-1.5 text-right font-mono text-[11px] text-slate-400">
          <span>AI MEETING REVIEWER</span>
          <span>REV 2.0</span>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2 pt-5 pb-2">
        {[
          ["#foundations", "01 Foundations"],
          ["#components", "02 Components"],
          ["#motion", "03 Motion"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="rounded-full border border-line-400 bg-white px-2.75 py-1.25 font-mono text-xs text-slate"
          >
            {label}
          </a>
        ))}
      </nav>

      {/* ======================= FOUNDATIONS ======================= */}
      <Section id="foundations" n="01" title="Foundations">
        <Panel
          title="Core palette · one source of truth"
          note="Six brand colors. Coral is not a brand color: it is reserved for high priority, error and destructive states only."
        >
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5">
            {core.map((c) => (
              <li key={c.name} className="overflow-hidden rounded-sm border border-line-300">
                <div className={`h-18 ${c.bg}`} />
                <div className="px-3 py-2.5">
                  <div className="text-sm font-semibold">{c.name}</div>
                  <div className="font-mono text-[11px] text-slate-400">{c.hex}</div>
                  <div className="mt-0.75 font-mono text-2xs text-blue-grey">{c.token}</div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5.5 flex flex-wrap gap-5 border-t border-dashed border-line-400 pt-5">
            <div className="min-w-60 flex-1">
              <Eyebrow className="mb-2 block text-error-text">Reserved: not a brand color</Eyebrow>
              <div className="flex items-center gap-3">
                <div className="size-14 rounded-md bg-coral-500" />
                <div>
                  <div className="text-sm font-semibold">
                    Signal Coral{" "}
                    <span className="font-mono text-[11px] font-normal text-slate-400">#D2492F</span>
                  </div>
                  <div className="mt-0.75 max-w-75 text-xs text-slate">
                    High priority, error and destructive only. Never for primary actions, links or
                    decoration.
                  </div>
                </div>
              </div>
            </div>
            <div className="min-w-60 flex-2">
              <Eyebrow className="mb-2 block">Supporting tokens (used in the file, outside the six)</Eyebrow>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5">
                {supporting.map((s) => (
                  <li key={s.token} className="flex items-center gap-2">
                    <span className={`size-5 shrink-0 rounded-xs border border-line-300 ${s.bg}`} />
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-2xs text-ink">{s.token}</span>
                      <span className="block font-mono text-2xs text-slate-400">
                        {s.hex} · {s.note}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>

        <Panel
          title="Semantic tokens"
          note="Each state carries a background, border and text value. Error derives from Signal Coral; success, warning and info stay in the muted brand family."
        >
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
            {semantic.map((s) => (
              <div key={s.name} className={`overflow-hidden rounded-md border ${semanticClass[s.c]}`}>
                <div className="px-4 py-3.5">
                  <div className="flex items-center gap-2 text-base font-semibold">
                    <span className="size-2 rounded-full bg-current" />
                    {s.name}
                  </div>
                  <div className="mt-1 text-[12.5px] opacity-85">{s.msg}</div>
                </div>
                <div className="flex flex-col gap-0.5 bg-white px-4 py-2.25 font-mono text-[10.5px] text-slate-400">
                  <span>bg {s.bg}</span>
                  <span>border {s.border}</span>
                  <span>text {s.text}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Type system"
          note="Geist for UI and labels. Newsreader for editorial and headlines. Geist Mono carries token values and timestamps."
        >
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-7">
            <div>
              <Cap>GEIST · interface</Cap>
              <div className="mt-2.5 text-[52px] leading-none font-semibold tracking-[-0.02em]">Ag</div>
              <div className="mt-3 flex flex-col gap-1.25 text-sm text-slate">
                <span><b className="font-semibold text-ink">Semibold 600</b> — titles, buttons</span>
                <span><b className="font-medium text-ink">Medium 500</b> — labels, nav</span>
                <span><b className="font-normal text-ink">Regular 400</b> — body, metadata</span>
              </div>
            </div>
            <div>
              <Cap>NEWSREADER · editorial</Cap>
              <div className="mt-2.5 font-serif text-[52px] leading-none font-medium">Ag</div>
              <div className="mt-3 max-w-80 font-serif text-xl text-ink">
                Onboarding flow needs simplification.
              </div>
              <div className="mt-2 text-xs text-slate-400">Headlines &amp; summary titles · 400/500/600</div>
            </div>
            <div>
              <Cap>GEIST MONO · data</Cap>
              <div className="mt-2.5 font-mono text-[52px] leading-none">04:12</div>
              <div className="mt-3 text-sm text-slate">Timestamps, token values, eyebrows.</div>
            </div>
          </div>
        </Panel>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
          <Panel title="Radius">
            <ul className="flex flex-col gap-2.5">
              {radii.map(([k, px, cls, use]) => (
                <li key={k} className="flex items-center gap-3">
                  <span className={`size-9 border-2 border-deep-teal-500 bg-deep-teal-100 ${cls}`} />
                  <span className="font-mono text-xs text-ink">radius-{k} · {px}</span>
                  <span className="text-xs text-slate-400">{use}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Shadows">
            <ul className="flex flex-col gap-4">
              {shadows.map(([k, cls, spec]) => (
                <li key={k} className="flex items-center gap-3">
                  <span className={`size-9 rounded-lg border border-line-300 bg-white ${cls}`} />
                  <span className="font-mono text-xs text-ink">shadow-{k}</span>
                  <span className="text-xs text-slate-400">{spec}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Focus rings">
            <ul className="flex flex-col gap-4">
              {rings.map(([k, cls, spec]) => (
                <li key={k} className="flex items-center gap-3">
                  <span className={`size-9 rounded-lg border border-line-500 bg-white ${cls}`} />
                  <span className="font-mono text-xs text-ink">shadow-{k}</span>
                  <span className="text-xs text-slate-400">{spec}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </Section>

      {/* ======================= COMPONENTS ======================= */}
      <Section id="components" n="02" title="Components">
        <Panel
          title="Buttons: one secondary, outlined everywhere"
          note="Secondary is always outlined. Full set: primary, secondary, ghost, destructive, disabled, loading."
        >
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-3.5 gap-y-4.5">
            <Tag label="PRIMARY"><Button>Start review</Button></Tag>
            <Tag label="SECONDARY · outlined"><Button variant="secondary">Share</Button></Tag>
            <Tag label="GHOST"><Button variant="ghost">Cancel</Button></Tag>
            <Tag label="DESTRUCTIVE"><Button variant="destructive">Delete meeting</Button></Tag>
            <Tag label="DISABLED"><Button disabled>Start review</Button></Tag>
            <Tag label="LOADING"><Button loading>Processing</Button></Tag>
          </div>

          <div className="mt-6.5 border-t border-dashed border-line-400 pt-5.5">
            <Cap>INTERACTION STATES · primary</Cap>
            <div className="mt-3.5 flex flex-wrap gap-6">
              <Tag label="bg #2F5D62"><Button>Default</Button></Tag>
              <Tag label="bg #244A4E">
                <Button className="border-deep-teal-600 bg-deep-teal-600">Hover</Button>
              </Tag>
              <Tag label="bg #1C3B3F · ↓1px">
                <Button className="translate-y-px border-deep-teal-700 bg-deep-teal-700">Active</Button>
              </Tag>
              <Tag label="ring harbor-blue/45">
                <Button className="shadow-focus">Focus</Button>
              </Tag>
              <Tag label="mist bg · blue-grey text"><Button disabled>Disabled</Button></Tag>
            </div>
          </div>

          <div className="mt-6.5 border-t border-dashed border-line-400 pt-5.5">
            <Cap>SECONDARY · GHOST · DESTRUCTIVE STATES (derived, see notes)</Cap>
            <div className="mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-3.5 gap-y-4.5">
              <Tag label="secondary · hover"><Button variant="secondary" className="bg-mist-paper">Share</Button></Tag>
              <Tag label="secondary · focus"><Button variant="secondary" className="shadow-focus">Share</Button></Tag>
              <Tag label="secondary · disabled"><Button variant="secondary" disabled>Share</Button></Tag>
              <Tag label="secondary · loading"><Button variant="secondary" loading>Sharing</Button></Tag>
              <Tag label="ghost · hover"><Button variant="ghost" className="bg-deep-teal-50">Cancel</Button></Tag>
              <Tag label="ghost · disabled"><Button variant="ghost" disabled>Cancel</Button></Tag>
              <Tag label="destructive · hover"><Button variant="destructive" className="border-error-text bg-error-text">Delete</Button></Tag>
              <Tag label="destructive · loading"><Button variant="destructive" loading>Deleting</Button></Tag>
            </div>
          </div>

          <div className="mt-6.5 border-t border-dashed border-line-400 pt-5.5">
            <Cap>SIZES · sm · default · lg · icon</Cap>
            <div className="mt-3.5 flex flex-wrap items-center gap-3">
              <Button size="sm">Accept</Button>
              <Button size="sm" variant="secondary">Edit</Button>
              <Button size="sm" variant="ghost">Dismiss</Button>
              <Button size="sm" variant="destructive"><RotateCcwIcon /> Retry</Button>
              <Button>Upload recording <ArrowUpIcon /></Button>
              <Button size="lg">Create account</Button>
              <Button size="lg" variant="secondary">Sign in</Button>
              <Button size="icon" variant="secondary" aria-label="Upload"><ArrowUpIcon /></Button>
            </div>
          </div>
        </Panel>

        <Panel
          title="Citation chip + badges"
          note="The timestamp chip is the single citation primitive across transcript, summary and action items. Status badges share the semantic tokens."
        >
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Badge variant="citation">04:12</Badge>
            <Cap>default</Cap>
            <Badge variant="citation-active">04:12</Badge>
            <Cap>active / playing</Cap>
            <Badge variant="citation-verified">✓ 04:12</Badge>
            <Cap>verified</Cap>
            <Badge variant="citation" size="sm">04:12</Badge>
            <Cap>inline (sm)</Cap>
          </div>
          <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5">
            {[
              ["IN TRANSCRIPT", "We need to fix the onboarding flow.", "citation", "04:12"],
              ["IN SUMMARY", "Simplify onboarding flow", "citation", "04:12"],
              ["IN ACTION ITEM", "Alex to fix onboarding error", "citation-verified", "✓ 04:12"],
            ].map(([k, text, v, t]) => (
              <div key={k} className="rounded-md border border-line-300 px-4 py-3.5">
                <div className="mb-2 font-mono text-[10px] text-slate-400">{k}</div>
                <div className="text-sm leading-normal text-ink">
                  {text}{" "}
                  <Badge variant={v as "citation" | "citation-verified"} size="sm">{t}</Badge>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge variant="success">Ready</Badge>
            <Badge variant="info">Processing 62%</Badge>
            <Badge variant="neutral">Queued</Badge>
            <Badge variant="error">Failed</Badge>
            <Badge variant="warning">Low confidence</Badge>
            <Badge>Default</Badge>
            <Badge variant="label">AI meeting reviewer</Badge>
          </div>
        </Panel>

        <Panel title="Inputs" note="Default, focus, error, success, disabled and read-only. Labels are 12px medium slate.">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-5 gap-y-4.5">
            <div>
              <Label htmlFor="i-default">Work email</Label>
              <Input id="i-default" placeholder="you@company.com" />
            </div>
            <div>
              <Label htmlFor="i-focus">Focus</Label>
              <Input id="i-focus" defaultValue="onboarding flow" className="border-deep-teal-500 shadow-focus-input" />
            </div>
            <div>
              <Label htmlFor="i-error">Work email</Label>
              <Input id="i-error" defaultValue="sarah@" aria-invalid />
              <FieldMessage>Enter a valid email address.</FieldMessage>
            </div>
            <div>
              <Label htmlFor="i-ok">Meeting title</Label>
              <Input id="i-ok" defaultValue="Q4 Roadmap Review" data-valid />
              <FieldMessage tone="success">✓ Looks good.</FieldMessage>
            </div>
            <div>
              <Label htmlFor="i-dis">Disabled</Label>
              <Input id="i-dis" defaultValue="Locked" disabled />
            </div>
            <div>
              <Label htmlFor="i-ro">Share link</Label>
              <Input id="i-ro" readOnly defaultValue="recap.app/m/8fd1-product-sync" />
            </div>
          </div>
        </Panel>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
          <Panel title="Checkbox" note="Not drawn in the file; derived from the radio and primary teal.">
            <div className="flex flex-col gap-3 text-sm text-ink">
              <label className="flex items-center gap-2.5"><Checkbox /> Unchecked</label>
              <label className="flex items-center gap-2.5"><Checkbox defaultChecked /> Checked</label>
              <label className="flex items-center gap-2.5"><Checkbox indeterminate /> Indeterminate</label>
              <label className="flex items-center gap-2.5"><Checkbox className="shadow-focus" /> Focus</label>
              <label className="flex items-center gap-2.5"><Checkbox aria-invalid /> Invalid</label>
              <label className="flex items-center gap-2.5 text-blue-grey"><Checkbox disabled /> Disabled</label>
              <label className="flex items-center gap-2.5 text-blue-grey"><Checkbox disabled defaultChecked /> Disabled checked</label>
            </div>
          </Panel>
          <Panel title="Switch" note="36×20 pill, 16px thumb (share dialog).">
            <div className="flex flex-col gap-3 text-sm text-ink">
              <label className="flex items-center justify-between">Off <Switch /></label>
              <label className="flex items-center justify-between">On <Switch defaultChecked /></label>
              <label className="flex items-center justify-between">Focus <Switch className="shadow-focus" /></label>
              <label className="flex items-center justify-between text-blue-grey">Disabled <Switch disabled /></label>
              <label className="flex items-center justify-between text-blue-grey">Disabled on <Switch disabled defaultChecked /></label>
            </div>
          </Panel>
          <Panel title="Tabs" note="Segmented (summary templates) and underline (meeting page).">
            <Tabs defaultValue="general">
              <TabsList>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="sales">Sales</TabsTrigger>
                <TabsTrigger value="one">1:1</TabsTrigger>
                <TabsTrigger value="off" disabled>Off</TabsTrigger>
              </TabsList>
              <TabsContent value="general" className="text-slate">General template.</TabsContent>
              <TabsContent value="sales" className="text-slate">Sales template.</TabsContent>
              <TabsContent value="one" className="text-slate">1:1 template.</TabsContent>
            </Tabs>
            <Tabs defaultValue="summary" className="mt-6">
              <TabsList variant="line">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="clips">Clips</TabsTrigger>
              </TabsList>
              <TabsContent value="summary" className="text-slate">Summary panel.</TabsContent>
              <TabsContent value="transcript" className="text-slate">Transcript panel.</TabsContent>
              <TabsContent value="clips" className="text-slate">Clips panel.</TabsContent>
            </Tabs>
          </Panel>
        </div>

        <Panel title="Table" note="Meeting library rows: ready, processing, selected, queued, failed.">
          <Table>
            <TableHeader>
              <TableRow className="border-0">
                <TableHead>Meeting</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell><div className="font-medium text-ink">Product Weekly Sync</div><div className="text-[11.5px] text-slate-400">Speaker 1 · +3</div></TableCell>
                <TableCell>May 14</TableCell>
                <TableCell><Badge variant="success">Ready</Badge></TableCell>
                <TableCell>42:18</TableCell>
                <TableCell className="text-slate-400">4:20 PM</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><div className="font-medium text-ink">Q2 Roadmap Review</div><div className="text-[11.5px] text-slate-400">Speaker 1 · +9</div></TableCell>
                <TableCell>May 13</TableCell>
                <TableCell><Badge variant="info">Processing 62%</Badge></TableCell>
                <TableCell>1:02:47</TableCell>
                <TableCell className="text-slate-400">11:10 AM</TableCell>
              </TableRow>
              <TableRow data-state="selected">
                <TableCell><div className="font-medium text-ink">Onboarding Flow Audit</div><div className="text-[11.5px] text-slate-400">Speaker 1 · +5 · selected</div></TableCell>
                <TableCell>May 12</TableCell>
                <TableCell><Badge variant="success">Ready</Badge></TableCell>
                <TableCell>31:57</TableCell>
                <TableCell className="text-slate-400">9:30 AM</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><div className="font-medium text-ink">Customer Interview: Acme</div><div className="text-[11.5px] text-slate-400">Speaker 1 · +2</div></TableCell>
                <TableCell>May 9</TableCell>
                <TableCell><Badge variant="neutral">Queued</Badge></TableCell>
                <TableCell>26:43</TableCell>
                <TableCell className="text-slate-400">2:16 PM</TableCell>
              </TableRow>
              <TableRow data-muted>
                <TableCell><div className="font-medium text-ink line-through">Marketing launch plan</div><div className="text-[11.5px] text-slate-400">Dismissed · muted row</div></TableCell>
                <TableCell>May 8</TableCell>
                <TableCell><Badge variant="neutral">31:42</Badge></TableCell>
                <TableCell>—</TableCell>
                <TableCell className="text-slate-400">—</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><div className="font-medium text-ink">Sales &amp; Product Alignment</div><div className="text-[11.5px] text-slate-400">Speaker 1 · +11</div></TableCell>
                <TableCell>May 6</TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <Badge variant="error">Failed</Badge>
                    <button className="cursor-pointer rounded-sm text-[11.5px] font-semibold text-error-text outline-none focus-visible:shadow-focus">Retry</button>
                  </span>
                </TableCell>
                <TableCell>54:11</TableCell>
                <TableCell className="text-slate-400">10:07 AM</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Panel>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
          <Panel title="Toast" note="Live toasts via sonner. Click to fire.">
            <ToastDemo />
            <div className="mt-5 flex flex-col gap-2.5">
              <Cap>STATIC REFERENCE</Cap>
              <div className="flex items-center gap-2.5 rounded-xl bg-ink px-3.5 py-2.75 text-sm text-white shadow-toast">
                <span className="size-1.75 rounded-full bg-success-dot" />
                <span className="flex-1">Summary saved</span>
                <span className="text-xs text-blue-grey">Undo</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-error-border bg-error-bg px-3.5 py-2.75 text-sm text-error-text">
                <span className="size-1.75 rounded-full bg-error-text" />
                <span className="flex-1">Upload failed — network error</span>
                <span className="text-xs font-semibold">Retry</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-info-border bg-info-bg px-3.5 py-2.75 text-sm text-info-text">
                <span className="size-1.75 rounded-full bg-info-text" />
                <span className="flex-1">Transcript is processing…</span>
              </div>
            </div>
          </Panel>
          <Panel title="Dialog" note="Opens the real component with the scale-in preset.">
            <DialogDemo />
          </Panel>
          <Panel title="Progress">
            <div className="flex flex-col gap-5">
              <Progress value={18}>
                <ProgressLabel>Playback</ProgressLabel>
                <span className="ml-auto font-mono text-[11px] text-slate tabular-nums">04:12 / 28:14</span>
              </Progress>
              <Progress value={62}>
                <ProgressLabel>Transcribing</ProgressLabel>
                <ProgressValue />
              </Progress>
              <Progress value={100}>
                <ProgressLabel>Uploaded</ProgressLabel>
                <ProgressValue />
              </Progress>
              <div className="rounded-xl bg-ink px-4.5 py-3.5">
                <Progress value={18} tone="inverse">
                  <ProgressLabel className="text-blue-grey">Dark player</ProgressLabel>
                </Progress>
              </div>
            </div>
          </Panel>
        </div>

        <Panel title="Skeleton" note="1.3s linear shimmer. Library, meeting and search shapes.">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
            <div className="rounded-xl border border-line-200 p-4">
              <Cap>LIBRARY</Cap>
              <div className="mt-3 flex flex-col gap-3">
                {[["70%", "40%"], ["85%", "35%"]].map(([a, b]) => (
                  <div key={a} className="flex items-center gap-2.5">
                    <Skeleton className="size-7.5 rounded-lg" />
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Skeleton className="h-2.5" style={{ width: a }} />
                      <Skeleton className="h-2.25" style={{ width: b }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-line-200 p-4">
              <Cap>MEETING</Cap>
              <div className="mt-3 flex flex-col gap-2.25">
                <Skeleton className="h-4.5 w-[80%] rounded-sm" />
                <Skeleton className="h-2.5 w-full" />
                <Skeleton className="h-2.5 w-[92%]" />
                <Skeleton className="h-2.5 w-[60%]" />
              </div>
            </div>
            <div className="rounded-xl border border-line-200 p-4">
              <Cap>SEARCH</Cap>
              <div className="mt-3 flex flex-col gap-3">
                {[["45%", "100%"], ["55%", "90%"]].map(([a, b]) => (
                  <div key={a} className="flex flex-col gap-1.5">
                    <Skeleton className="h-2.5" style={{ width: a }} />
                    <Skeleton className="h-2.25" style={{ width: b }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </Section>

      {/* ======================= MOTION ======================= */}
      <Section id="motion" n="03" title="Motion">
        <p className="max-w-175 text-sm text-slate">
          Three presets in <span className="font-mono text-xs">src/lib/motion.ts</span>. Quiet,
          short, purposeful: motion confirms a change, it doesn&apos;t decorate. Demos loop.
        </p>
        <MotionDemo />
      </Section>

      <footer className="mt-14 flex flex-wrap justify-between gap-2.5 border-t border-line-400 pt-5 font-mono text-[11px] text-slate-400">
        <span>RECAP DESIGN SYSTEM · REV 2.0</span>
        <span>one palette · one token set · one button · one citation</span>
      </footer>
    </main>
  )
}
