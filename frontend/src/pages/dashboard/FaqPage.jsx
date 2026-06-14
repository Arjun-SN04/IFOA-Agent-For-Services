import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// ── Static reference data (mirrors the live pricing in SubscriptionPage) ───────
const AIRLINE_TIERS = [
  { range: '3 – 5 holders', oneYear: '$60 / cert', unlimited: '$265 / cert' },
  { range: '5 – 10 holders', oneYear: '$55 / cert', unlimited: '$255 / cert' },
  { range: 'More than 10', oneYear: '$49 / cert', unlimited: '$245 / cert' },
]
const INDIVIDUAL_PLANS = [
  { plan: '1 Year', price: '$69', note: 'Renews every year.' },
  { plan: 'Multiple Years', price: '$55 / year', note: 'Pay upfront for several years.' },
  { plan: 'Unlimited (Lifetime)', price: '$299', note: 'One-time — never expires.' },
]

const FAQS = [
  {
    for: 'airline',
    q: 'What is the difference between the Base plan and an Upgrade plan?',
    a: 'The Base plan is your main subscription — it sets your core certificate-holder capacity and pricing tier. An Upgrade (add-on) plan adds extra holder slots on top of the base. Upgrades are billed and renewed separately, but their holders stack directly on top of the base coverage.',
  },
  {
    for: 'airline',
    q: 'How is the holder count calculated?',
    a: 'Your total committed count = base plan holders + every active upgrade plan’s holders. Upgrade holders are numbered AFTER the base. Example: a base of 6 plus a 4-holder upgrade gives holders 1–6 (base) and 7–10 (upgrade) — 10 total.',
  },
  {
    for: 'airline',
    q: 'Why did my per-certificate price change when I added or renewed an upgrade?',
    a: 'Pricing is tier-based on the cumulative position. An upgrade that sits at holders 7–9 is priced at the “5 to 10” tier, not the “3 to 5” tier — the more holders stacked below it, the higher the volume tier (and the lower the per-cert rate).',
  },
  {
    for: 'airline',
    q: 'Can I reduce the number of holders at renewal?',
    a: 'Yes. Lower the holder count and a “Select Holders to Keep” picker appears — you choose exactly which holders carry into the renewed term. The rest are dropped. The same selection is available on the admin side.',
  },
  {
    for: 'airline',
    q: 'What happens to an expired upgrade if my base plan is still active?',
    a: 'The renewed upgrade continues counting after your active base. If your base covers 6 holders, the renewed upgrade starts at holder 7 — and its pricing tier reflects that stacked position.',
  },
  {
    for: 'individual',
    q: 'Do individuals have a holder count or tiers?',
    a: 'No. Individuals have a single subscription with one fixed price — no per-holder pricing, no upgrades, and no tiers. You just pick 1 Year, Multiple Years, or Unlimited (Lifetime).',
  },
  {
    for: 'individual',
    q: 'What does the Multiple Years plan cost?',
    a: 'It is billed at $55 per year, paid upfront for the number of years you choose. For example, 3 years = $165, locked in for the full term.',
  },
  {
    for: 'individual',
    q: 'Is the Unlimited (Lifetime) plan really one-time?',
    a: 'Yes. Unlimited is a single $299 payment that never expires — there is nothing to renew.',
  },
  {
    for: 'both',
    q: 'When can I renew, and what does “Renewal Due” mean?',
    a: 'A plan becomes renewable when it is within 60 days of expiry (or already expired). The “Renewal Due” button appears on your subscription card; clicking it expands the card and highlights exactly which plan needs renewing.',
  },
  {
    for: 'both',
    q: 'What is the difference between “queued” and “immediate” renewal?',
    a: 'If the plan is still active, renewing QUEUES the new term — it activates automatically the day the current term expires, so you never lose coverage and never double-pay. If the plan is already expired, the renewal activates immediately from today.',
  },
  {
    for: 'both',
    q: 'Can I upgrade an existing plan to Unlimited?',
    a: 'Yes. Any active, non-Unlimited plan can be converted to Unlimited in place — no need to buy a separate plan. Use the “Convert to Unlimited” button on the plan (base plan or an add-on plan). The plan switches to Unlimited immediately, never expires again, and keeps all its holders and slots. Your other plans are untouched.',
  },
  {
    for: 'both',
    q: 'How is the price for upgrading to Unlimited calculated?',
    a: 'You pay the Unlimited tier price for that plan’s holders, MINUS a credit for the time you have not yet used on the current term. Airlines: Unlimited per-cert rate × holders (at your volume tier). Individuals: the flat $299 Unlimited price. The unused-time credit is then subtracted, so you only pay the difference.',
  },
  {
    for: 'both',
    q: 'How does the unused-time credit work?',
    a: 'The credit is the part of your current term you have not consumed yet, prorated by days. Credit = what you paid for the current term × (days remaining ÷ full term length). Example: a 1-Year plan billed $240 with about half the year left gives roughly a $120 credit toward the Unlimited price. A plan near expiry credits little; one just started credits almost the full amount.',
  },
  {
    for: 'both',
    q: 'What does the upgrade invoice look like?',
    a: 'It shows two lines: the full Unlimited price, then a negative “Credit — unused …” line, netting to exactly what you are charged. Your previous invoice is preserved — the upgrade adds a NEW invoice to your history and never overwrites the old one.',
  },
  {
    for: 'airline',
    q: 'Can I pay for the Unlimited upgrade by wire transfer?',
    a: 'Yes. When you convert, choose Card (activates instantly) or Wire Transfer (requests an invoice for admin review). With wire, the upgrade shows as a “Convert to Unlimited — Pending” card until the admin approves it; nothing changes on your plan until approval.',
  },
  {
    for: 'both',
    q: 'What happens to my plan if a payment fails?',
    a: 'Nothing changes. A failed or cancelled payment never activates a plan, never converts it, and never generates an invoice — your subscription stays exactly as it was. Only a confirmed, successful payment updates your plan and creates an invoice.',
  },
  {
    for: 'both',
    q: 'Can I upgrade a plan that has already expired?',
    a: 'No. Once a plan expires you must renew it first, then upgrade. The Upgrade / Convert button is hidden on expired plans — use Renew to bring the plan back, after which the upgrade option returns.',
  },
  {
    for: 'individual',
    q: 'What can I upgrade my individual plan to?',
    a: 'A 1-Year plan can be upgraded to Multiple Years or Unlimited; a Multiple Years plan can be upgraded to Unlimited (or more years). You pick the target and, for Multiple Years, the number of years. The unused-time credit from your current plan is applied to the price.',
  },
]

function YourAccountBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 mb-2">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Your account
    </span>
  )
}

function Section({ step, title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        {step != null && (
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">{step}</span>
        )}
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900">{title}</h2>
      </div>
      <div className="text-sm text-slate-600 leading-relaxed space-y-2">{children}</div>
    </div>
  )
}

function FlowStep({ n, title, desc }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center flex-shrink-0">
        <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center">{n}</span>
        <span className="w-px flex-1 bg-slate-200 mt-1" />
      </div>
      <div className="pb-4">
        <p className="text-sm font-bold text-slate-800">{title}</p>
        <p className="text-[13px] text-slate-500 leading-relaxed mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition"
      >
        <span className="text-sm font-bold text-slate-800">{q}</span>
        <svg className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 text-[13px] text-slate-600 leading-relaxed border-t border-slate-100 pt-3">{a}</div>
      )}
    </div>
  )
}

// ── Interactive holder-count + pricing playground ──────────────────────────────
const PPC_MAP = {
  '1 Year Subscription Plan': { '3 to 5': 60, '5 to 10': 55, 'More than 10': 49 },
  'Unlimited Plan': { '3 to 5': 265, '5 to 10': 255, 'More than 10': 245 },
}
const tierLabel = (c) => (c <= 5 ? '3 to 5' : c <= 10 ? '5 to 10' : 'More than 10')
const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const cadence = (plan) => (plan === 'Unlimited Plan' ? 'one-time' : '/yr')

function PlanToggle({ value, set }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
      {[['1 Year Subscription Plan', '1 Year'], ['Unlimited Plan', 'Unlimited']].map(([val, lbl]) => (
        <button key={val} type="button" onClick={() => set(val)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${value === val ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}>{lbl}</button>
      ))}
    </div>
  )
}

function UnitControl({ title, color, count, setCount, min, plan, setPlan }) {
  return (
    <div className="flex-1 min-w-[200px] rounded-lg border border-slate-200 bg-white p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-sm ${color}`} />
        <p className="text-[12px] font-bold text-slate-700">{title}</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setCount(Math.max(min, count - 1))}
          className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 font-bold flex items-center justify-center transition">−</button>
        <span className="text-xl font-black text-slate-900 w-9 text-center tabular-nums">{count}</span>
        <button type="button" onClick={() => setCount(Math.min(20, count + 1))}
          className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 font-bold flex items-center justify-center transition">+</button>
        <span className="text-[11px] text-slate-400">holders</span>
      </div>
      <PlanToggle value={plan} set={setPlan} />
    </div>
  )
}

function HolderFlowPlayground() {
  const [base, setBase] = useState(6)
  const [basePlan, setBasePlan] = useState('1 Year Subscription Plan')
  const [upgrade, setUpgrade] = useState(4)
  const [upPlan, setUpPlan] = useState('1 Year Subscription Plan')

  const total = base + upgrade
  const mixed = upgrade > 0 && basePlan !== upPlan

  const basePpc = PPC_MAP[basePlan][tierLabel(Math.max(3, base))]
  const baseCost = base * basePpc
  // Upgrade stacks on the base (count-wise) — tier read at the cumulative top
  // position — but it is priced from ITS OWN plan's rate table.
  const upPpc = PPC_MAP[upPlan][tierLabel(Math.max(3, base + upgrade))]
  const upCost = upgrade * upPpc
  const grandTotal = baseCost + upCost

  const presets = [
    { label: 'No upgrade (5)', b: 5, bp: '1 Year Subscription Plan', u: 0, up: '1 Year Subscription Plan' },
    { label: 'Crosses a tier (5 + 3)', b: 5, bp: '1 Year Subscription Plan', u: 3, up: '1 Year Subscription Plan' },
    { label: 'Mixed: Unlimited base + 1-Year upgrade (6 + 5)', b: 6, bp: 'Unlimited Plan', u: 5, up: '1 Year Subscription Plan' },
  ]
  const applyPreset = (p) => { setBase(p.b); setBasePlan(p.bp); setUpgrade(p.u); setUpPlan(p.up) }

  // Cap rendered seats so big numbers stay readable.
  const CAP = 24
  const shownBase = Math.min(base, CAP)
  const shownUp = Math.min(upgrade, Math.max(0, CAP - shownBase))
  const hidden = total - (shownBase + shownUp)

  const totalLabel = upgrade === 0
    ? (cadence(basePlan) === 'one-time' ? 'One-time total' : 'Total per year')
    : mixed ? 'Combined total' : (cadence(basePlan) === 'one-time' ? 'One-time total' : 'Total per year')

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
      <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Try it yourself</p>

      {/* Base + Upgrade — each with its own count AND plan type */}
      <div className="flex flex-wrap gap-3">
        <UnitControl title="Base plan" color="bg-blue-300" count={base} setCount={setBase} min={1} plan={basePlan} setPlan={setBasePlan} />
        <UnitControl title="Expand holders (0 = none)" color="bg-emerald-300" count={upgrade} setCount={setUpgrade} min={0} plan={upPlan} setPlan={setUpPlan} />
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5">
        {presets.map(p => (
          <button key={p.label} type="button" onClick={() => applyPreset(p)}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600 transition">{p.label}</button>
        ))}
      </div>

      {/* Seat row */}
      <div>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: shownBase }, (_, i) => i + 1).map(n => (
            <span key={`b${n}`} className="w-7 h-7 rounded-md bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center justify-center">{n}</span>
          ))}
          {Array.from({ length: shownUp }, (_, i) => shownBase + i + 1).map(n => (
            <span key={`u${n}`} className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 text-[11px] font-bold flex items-center justify-center">{n}</span>
          ))}
          {hidden > 0 && (
            <span className="h-7 px-2 rounded-md bg-slate-200 text-slate-600 text-[11px] font-bold flex items-center justify-center">+{hidden}</span>
          )}
        </div>
        <p className="text-[12px] text-slate-500 mt-2">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-200 align-middle mr-1" />Base {base}
          <span className="text-slate-300 mx-1">+</span>
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-200 align-middle mr-1" />Upgrade {upgrade}
          <span className="text-slate-300 mx-1">=</span>
          <strong className="text-slate-800">{total} total holders</strong>
        </p>
      </div>

      {/* Cost breakdown */}
      <div className="rounded-lg bg-white border border-slate-200 divide-y divide-slate-100 text-[13px]">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="text-slate-600 min-w-0">Base · {base} × {money(basePpc)} <span className="text-slate-400">({tierLabel(Math.max(3, base))} tier · {basePlan === 'Unlimited Plan' ? 'Unlimited' : '1 Year'})</span></span>
          <span className="font-bold text-slate-800 flex-shrink-0">{money(baseCost)}<span className="text-[10px] font-semibold text-slate-400 ml-0.5">{cadence(basePlan)}</span></span>
        </div>
        {upgrade > 0 && (
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <span className="text-slate-600 min-w-0">Upgrade · {upgrade} × {money(upPpc)} <span className="text-slate-400">(seats {base + 1}–{total} → {tierLabel(Math.max(3, base + upgrade))} tier · {upPlan === 'Unlimited Plan' ? 'Unlimited' : '1 Year'})</span></span>
            <span className="font-bold text-slate-800 flex-shrink-0">{money(upCost)}<span className="text-[10px] font-semibold text-slate-400 ml-0.5">{cadence(upPlan)}</span></span>
          </div>
        )}
        <div className="flex items-center justify-between px-3 py-2.5 bg-slate-900 rounded-b-lg">
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/70">{totalLabel}</span>
          <span className="text-lg font-black text-white">{money(grandTotal)}</span>
        </div>
      </div>

      {/* Insight: stacking gives a better tier */}
      {upgrade > 0 && tierLabel(Math.max(3, base + upgrade)) !== tierLabel(Math.max(3, upgrade)) && (
        <p className="text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
          💡 The upgrade alone ({upgrade} holders) would be the <strong>{tierLabel(Math.max(3, upgrade))}</strong> tier, but stacking on the base lifts it to the better <strong>{tierLabel(Math.max(3, base + upgrade))}</strong> tier rate.
        </p>
      )}

      {/* Insight: mixed plan types billed independently */}
      {mixed && (
        <p className="text-[12px] text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          ℹ️ Your base and upgrade are <strong>different plan types</strong>, so they are billed and renewed independently on their own terms — the {basePlan === 'Unlimited Plan' ? 'Unlimited base is one-time' : '1-Year base renews yearly'}, while the {upPlan === 'Unlimited Plan' ? 'Unlimited upgrade is one-time' : '1-Year upgrade renews yearly'}. Each still uses its own rate table, priced at the stacked tier.
        </p>
      )}
    </div>
  )
}

export default function FaqPage() {
  const { user } = useAuth()
  const isAirline = user?.role === 'airline'
  const [view, setView] = useState(isAirline ? 'airline' : 'individual')

  const visibleFaqs = FAQS.filter(f => f.for === 'both' || f.for === view)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-8 space-y-6">
      {/* Header */}
      <div>
        <p className="text-[11px] font-black uppercase tracking-widest text-blue-600">Help &amp; FAQ</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Subscriptions, Plans &amp; Renewals</h1>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          A clear walkthrough of how plans, certificate-holder counts, and renewals work — so you always know what you are paying for and when.
        </p>
      </div>

      {/* Audience tabs */}
      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {[['individual', 'Individual'], ['airline', 'Airline']].map(([val, lbl]) => (
          <button
            key={val}
            type="button"
            onClick={() => setView(val)}
            className={`relative px-4 py-1.5 rounded-lg text-sm font-bold transition ${view === val ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            {lbl}
            {user && ((val === 'airline') === isAirline) && (
              <span className={`ml-1.5 text-[9px] font-black uppercase tracking-wide ${view === val ? 'text-blue-300' : 'text-blue-500'}`}>You</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Individual view ── */}
      {view === 'individual' && (
        <>
          <Section title="Individual plan types">
            {user && !isAirline && <YourAccountBadge />}
            <p>Individuals choose one fixed plan — no per-holder pricing, no tiers, no upgrades:</p>
            <div className="mt-3 grid sm:grid-cols-3 gap-2">
              {INDIVIDUAL_PLANS.map(p => (
                <div key={p.plan} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-sm font-bold text-slate-800">{p.plan}</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">{p.price}</p>
                  <p className="text-[12px] text-slate-500 mt-0.5">{p.note}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="How renewal works">
            <div className="mt-1">
              <FlowStep n="1" title="Your plan nears expiry" desc="Within 60 days of expiry (or once expired), a “Renewal Due” button appears on your subscription card." />
              <FlowStep n="2" title="You open the renewal" desc="Clicking it expands the card and highlights the plan that needs renewing." />
              <FlowStep n="3" title="Confirm or change your plan" desc="Keep your current plan, or switch to a different one (e.g. 1 Year → Unlimited) for the new term." />
              <FlowStep n="4" title="Queued or immediate" desc="If still active, the renewal QUEUES and activates automatically at expiry (no gap, no double charge). If already expired, it activates immediately. Unlimited never expires — nothing to renew." />
            </div>
          </Section>

          <Section title="Upgrading a plan (with credit)">
            <p>On an <strong>active</strong> 1-Year or Multiple-Years plan you can upgrade it at any time — no need to wait for renewal or buy a separate plan. <strong>Individuals</strong> can upgrade to Multiple Years or Unlimited; <strong>airlines</strong> upgrade to Unlimited (the base plan or any add-on plan).</p>
            <div className="mt-1">
              <FlowStep n="1" title="Click “Convert to Unlimited” / “Upgrade”" desc="The button sits on the plan you want to upgrade. Individuals pick the target (Multi-Year or Unlimited). A summary shows the new price, your unused-time credit, and the net amount." />
              <FlowStep n="2" title="You only pay the difference" desc="Charge = new-plan price − credit for the time left on your current term. A plan with lots of time left earns a bigger credit; one near expiry earns little." />
              <FlowStep n="3" title="Pay by card or wire" desc="Card activates instantly. Airlines may also request a wire invoice — the upgrade stays “Pending” until an admin approves it." />
              <FlowStep n="4" title="Plan upgrades in place" desc="It keeps every holder and slot. A new invoice is added to your history — your old invoice is preserved, never overwritten." />
            </div>
            <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-[13px] text-slate-600">
              <p className="font-bold text-slate-800 mb-1">Credit example</p>
              <p>A 1-Year plan billed <strong>$240</strong> with about half the year left → credit ≈ <strong>$120</strong>. If Unlimited for those holders is <strong>$1,060</strong>, you pay <strong>$1,060 − $120 = $940</strong>. The invoice shows both lines so the math is transparent.</p>
            </div>
            <p className="mt-3 text-[13px] text-slate-500"><strong className="text-slate-700">Expired plans can’t be upgraded</strong> — the upgrade button is hidden once a plan lapses; renew it first, then upgrade. A failed or cancelled payment changes nothing — the plan upgrades and the invoice is created only after a successful payment.</p>
          </Section>
        </>
      )}

      {/* ── Airline view ── */}
      {view === 'airline' && (
        <>
          <Section title="Airline plan types">
            {user && isAirline && <YourAccountBadge />}
            <p>Airlines are billed <strong>per certificate holder</strong>, at a volume tier that depends on how many holders you cover:</p>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-[13px]">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="text-left font-bold px-3 py-2">Holder tier</th>
                    <th className="text-left font-bold px-3 py-2">1 Year</th>
                    <th className="text-left font-bold px-3 py-2">Unlimited</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {AIRLINE_TIERS.map(t => (
                    <tr key={t.range}>
                      <td className="px-3 py-2 font-semibold text-slate-700">{t.range}</td>
                      <td className="px-3 py-2 text-slate-600">{t.oneYear}</td>
                      <td className="px-3 py-2 text-slate-600">{t.unlimited}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[13px] text-slate-500 mt-2">More holders = a higher tier = a lower per-certificate rate.</p>
          </Section>

          <Section title="How the holder count flows">
            <p>Airlines can hold several plans at once — a Base plan plus optional Upgrades. Think of your holders as seats in a row that fill up left to right. The <strong>Base plan</strong> books the first block of seats; each <strong>Upgrade</strong> adds more seats right after — it never restarts at seat&nbsp;1. Change the numbers below to see how the count, tier, and cost react.</p>

            <HolderFlowPlayground />

            <p className="mt-3 text-[13px] text-slate-500">
              <strong className="text-slate-700">In short:</strong> upgrades stack on top of the base and keep counting upward, and the tier price is based on where they land in the row.
            </p>
          </Section>

          <Section title="How renewal works">
            <div className="mt-1">
              <FlowStep n="1" title="A plan nears expiry" desc="Within 60 days of expiry (or once expired), the plan becomes renewable and a “Renewal Due” button appears on your subscription card." />
              <FlowStep n="2" title="You open the renewal" desc="Clicking it expands the card and highlights exactly which plan needs renewing. Each highlighted plan has its own Renew action." />
              <FlowStep n="3" title="Adjust holders (optional)" desc="Raise or lower the holder count. If you lower it, pick which holders to keep — the rest are dropped from the renewed term." />
              <FlowStep n="4" title="Queued or immediate" desc="If the plan is still active, the renewal QUEUES and activates automatically at expiry (no gap, no double charge). If already expired, it activates immediately from today." />
            </div>
          </Section>

          <Section title="Upgrading a plan to Unlimited (with credit)">
            <p>Any <strong>active</strong> plan — your <strong>base</strong> or any <strong>add-on</strong> — can be converted to <strong>Unlimited</strong> in place, at any time. Click <strong>“Convert to Unlimited”</strong> (or “To Unlimited” on an add-on row). Expired plans must be renewed first — the button is hidden once a plan lapses.</p>
            <div className="mt-1">
              <FlowStep n="1" title="Tier-priced for your holders" desc="You pay the Unlimited per-cert rate × that plan’s holders, at your volume tier — the same tiers used everywhere else." />
              <FlowStep n="2" title="Minus an unused-time credit" desc="The time left on the plan’s current term is credited back, prorated by days. Net charge = Unlimited price − credit." />
              <FlowStep n="3" title="Card or wire" desc="Card activates instantly; wire requests an invoice the admin approves. The pending request shows as “Convert to Unlimited — Pending” until approved." />
              <FlowStep n="4" title="In place, history kept" desc="The plan becomes Unlimited (no expiry) and keeps its holders/slots. The upgrade adds a new invoice — your earlier invoice is preserved, never overwritten." />
            </div>
            <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-[13px] text-slate-600">
              <p className="font-bold text-slate-800 mb-1">Example (4 holders, 1-Year @ $60)</p>
              <p>Unlimited tier = $265/cert × 4 = <strong>$1,060</strong>. Half the year left on a $240 term → credit ≈ <strong>$120</strong>. You pay <strong>$940</strong>. The invoice itemises the Unlimited line and the credit line.</p>
            </div>
            <p className="mt-3 text-[13px] text-slate-500">A failed or cancelled payment converts nothing and generates no invoice — your plans stay as they were.</p>
          </Section>
        </>
      )}

      {/* FAQ accordion — filtered to the selected audience */}
      <div>
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mb-3">
          Frequently asked questions <span className="text-slate-400 font-bold">· {view === 'airline' ? 'Airline' : 'Individual'}</span>
        </h2>
        <div className="space-y-2">
          {visibleFaqs.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 p-5 sm:p-6 text-center">
        <p className="text-sm font-bold text-white">Still have questions?</p>
        <p className="text-[13px] text-white/70 mt-1">Our team is happy to help with anything about your subscription.</p>
        <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
          <a
            href="mailto:agent@theifoa.com?subject=IFOA%20Agent%20for%20Service%20Enquiry"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-100 transition"
          >
            Contact Support
          </a>
          <Link
            to="/dashboard/subscription"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 ring-1 ring-inset ring-white/25 px-4 py-2 text-sm font-bold text-white hover:bg-white/20 transition"
          >
            View my subscription
          </Link>
        </div>
      </div>
    </div>
  )
}
