import { Link } from 'react-router-dom';
import {
  Activity, AlertTriangle, BadgeCheck, Bell, Building2, CalendarClock, CheckCircle2, ClipboardCheck, Clock, FileCheck2, IndianRupee,
  LayoutDashboard, Package, PackageX, Percent, Send, ShoppingBag, Truck, Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Banner, Card, Kpi, PageHeader, Pill } from '../../components/ui';
import { CATEGORIES } from '../../data/categories';
import { NOVATEX_ID, VENDORS, vendorById } from '../../data/vendors';
import { fmtDateTime, inr, inrCompact, num } from '../../lib/format';
import { isOverdue, useOrders } from '../../lib/orders';
import { useCatalog } from '../../lib/catalog';
import { daysToExpiry, displayStatus, latest, useOnboarding } from '../../lib/onboarding';
import { useListings } from '../../lib/marketplace';
import { useAdmin } from '../../lib/admin';
import { useAudit } from '../../lib/audit';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';

/** Platform-wide baseline (mock) — demo orders are added on top. */
const BASE = { vendors: 178, orders: 1284, gmv: 47283960, commissionRate: 0.087 };

const FEED: { at: string; icon: LucideIcon; tone: string; text: string }[] = [
  { at: '2026-11-26T09:12:00+05:30', icon: ShoppingBag, tone: 'indigo', text: 'Order ORD-2026-5768 placed by Raymond Garments Ltd · ₹7,639.20' },
  { at: '2026-11-25T18:40:00+05:30', icon: FileCheck2, tone: 'blue', text: 'KYC submitted: Ribbonex India uploaded REACH + GST amendment' },
  { at: '2026-11-25T11:20:00+05:30', icon: BadgeCheck, tone: 'green', text: 'Vendor approved: AuraFastener Industries passed annual re-verification' },
  { at: '2026-11-24T11:05:00+05:30', icon: Wallet, tone: 'green', text: 'Payout released: batch SB-2026-047 · UTR HDFC0026112489 · ₹32,000.00' },
  { at: '2026-11-23T16:00:00+05:30', icon: Package, tone: 'violet', text: 'Product published: TT-RF-0750 UHF RFID Hang Tag Inlay (v1)' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { orders, subOrders } = useOrders();
  const { products, otherDocs } = useCatalog();
  const { data: onb } = useOnboarding();
  const listings = useListings();
  const admin = useAdmin();
  const { entries, log } = useAudit();
  const toast = useToast();

  const month = new Date().toISOString().slice(0, 7);
  const mtd = orders.filter((o) => o.placedAt.slice(0, 7) === month && !o.replacementFor);
  const gmv = BASE.gmv + mtd.reduce((s, o) => s + o.total, 0);
  const pendingApprovals = products.filter((p) => p.pending).length + [...onb.docs, ...Object.values(otherDocs).flat()].filter((d) => latest(d).status === 'Pending').length;

  const lateAccept = subOrders.filter((s) => s.status === 'Order Placed' && s.fulfilment !== 'insta' && isOverdue(s.acceptBy));
  const lateDispatch = [
    ...subOrders.filter((s) => s.status === 'Accepted' && isOverdue(s.dispatchBy)).map((s) => ({ s, days: Math.ceil((Date.now() - new Date(s.dispatchBy!).getTime()) / 86400000), open: true })),
    ...subOrders.filter((s) => s.handover && s.dispatchBy && s.handover.at > s.dispatchBy).map((s) => ({ s, days: Math.ceil((new Date(s.handover!.at).getTime() - new Date(s.dispatchBy!).getTime()) / 86400000), open: false })),
  ];
  const allDocs = [...onb.docs.map((d) => ({ vendorId: NOVATEX_ID, d })), ...Object.entries(otherDocs).flatMap(([v, ds]) => ds.map((d) => ({ vendorId: v, d })))];
  const expiring = allDocs.filter(({ d }) => { const n = daysToExpiry(d); return d.kind === 'CERT' && n !== null && n <= 30 && (displayStatus(d) === 'Approved' || displayStatus(d) === 'Expired'); })
    .sort((a, b) => (daysToExpiry(a.d) ?? 0) - (daysToExpiry(b.d) ?? 0));
  const zeroLive = VENDORS.map((v) => {
    const ls = listings.filter((l) => l.vendor.id === v.id);
    return { v, total: ls.length, sellable: ls.filter((l) => !l.salesBlocked).length, reason: ls.find((l) => l.salesBlocked)?.blockReason };
  }).filter((x) => x.sellable === 0);

  const notify = (key: string, what: string, entity: string) => {
    admin.markNotified(key);
    log({ action: what, entity });
    toast('success', what, entity);
  };
  const notifiedLabel = (key: string) => admin.notified[key] ? `Sent ${fmtDateTime(admin.notified[key]).split(', ')[1]}` : null;

  const feed = [
    ...entries.slice(0, 6).map((e) => ({ at: e.at, icon: Activity, tone: 'slate', text: `${e.action}: ${e.entity}${e.newValue ? ` → ${e.newValue}` : ''} · ${e.actor}` })),
    ...FEED,
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 9);

  const acceptedTotal = subOrders.filter((s) => s.events.some((e) => e.status === 'Accepted'));
  const acceptOnTime = acceptedTotal.filter((s) => (s.events.find((e) => e.status === 'Accepted')?.at ?? '') <= s.acceptBy).length;
  const dispatched = subOrders.filter((s) => s.handover && s.dispatchBy);
  const dispatchOnTime = dispatched.filter((s) => s.handover!.at <= s.dispatchBy!).length;

  return (
    <div className="container wide stack-16" style={{ maxWidth: 1400 }}>
      <PageHeader icon={LayoutDashboard} title="Admin Dashboard" subtitle={`Live platform overview, SLA monitoring · signed in as ${user?.name}`} />

      <div className="grid g-6">
        <Kpi icon={Building2} tone="indigo" label="Active vendors" value={num(BASE.vendors + VENDORS.filter((v) => v.status === 'Active').length)} help={`${admin.applicants.length} awaiting activation`} />
        <Kpi icon={Package} tone="violet" label="Live products" value={num(CATEGORIES.reduce((s, c) => s + c.products, 0))} help="Across 12 categories" />
        <Kpi icon={ShoppingBag} tone="blue" label="Orders MTD" value={num(BASE.orders + mtd.length)} help="Parent orders" />
        <Kpi icon={IndianRupee} tone="green" label="GMV MTD" value={<span className="mono" style={{ fontSize: 18 }}>{inrCompact(gmv)}</span>} help={<span className="mono">{inr(gmv)}</span>} />
        <Kpi icon={Percent} tone="amber" label="Commission MTD" value={<span className="mono" style={{ fontSize: 18 }}>{inrCompact(gmv * BASE.commissionRate)}</span>} help="Category-level only" />
        <Kpi icon={ClipboardCheck} tone="red" label="Pending approvals" value={pendingApprovals} help="Docs + listings with Approver" />
      </div>

      <div className="row" style={{ marginTop: 4 }}>
        <AlertTriangle size={17} style={{ color: 'var(--danger)' }} />
        <h2 className="section-title">SLA Breach Alerts</h2>
        <span className="small muted">Requires immediate action</span>
      </div>
      <div className="grid g-2" style={{ alignItems: 'start' }}>
        <AlertCard icon={Clock} tone="red" title="Orders awaiting vendor acceptance > 1 business day" count={lateAccept.length}>
          {lateAccept.map((s) => {
            const k = `accept:${s.id}`;
            const h = Math.floor((Date.now() - new Date(s.placedAt).getTime()) / 3600000);
            return (
              <AlertRow key={s.id} left={<><span className="mono small bold">{s.id}</span><div className="xs muted">{vendorById(s.vendorId)?.name} · waiting {Math.floor(h / 24)}d {h % 24}h</div></>}
                right={notifiedLabel(k) ? <Pill tone="green" icon={CheckCircle2}>{notifiedLabel(k)}</Pill> : <button className="btn btn-secondary btn-xs" onClick={() => notify(k, 'Vendor notified to accept', `${s.id} · ${vendorById(s.vendorId)?.name}`)}><Bell size={12} /> Notify Vendor</button>} />
            );
          })}
        </AlertCard>
        <AlertCard icon={Truck} tone="amber" title="Orders dispatched late beyond lead time" count={lateDispatch.length}>
          {lateDispatch.map(({ s, days, open }) => (
            <AlertRow key={s.id} left={<><span className="mono small bold">{s.id}</span><div className="xs muted">{vendorById(s.vendorId)?.name} · {open ? 'not yet dispatched' : `dispatched ${fmtDateTime(s.handover!.at)}`}</div></>}
              right={<div className="row"><Pill tone="red">{days}d late</Pill>{open && <button className="btn btn-secondary btn-xs" onClick={() => notify(`dispatch:${s.id}`, 'Dispatch escalation sent', s.id)}><Send size={12} /> Escalate</button>}</div>} />
          ))}
        </AlertCard>
        <AlertCard icon={CalendarClock} tone="amber" title="Vendor certificates expiring within 30 days" count={expiring.length}
          foot="On expiry the badge is hidden automatically and sales of products that need it are blocked.">
          {expiring.map(({ vendorId, d }) => {
            const n = daysToExpiry(d)!;
            const k = `cert:${vendorId}:${d.id}`;
            return (
              <AlertRow key={k} left={<><span className="small bold">{d.certType}</span> <span className="xs mono muted">{d.number}</span><div className="xs muted">{vendorById(vendorId)?.name}</div></>}
                right={<div className="row"><Pill tone={n < 0 ? 'red' : n <= 14 ? 'amber' : 'blue'}>{n < 0 ? `Expired ${-n}d ago` : `${n} days left`}</Pill>
                  {notifiedLabel(k) ? <Pill tone="green">{notifiedLabel(k)}</Pill> : <button className="btn btn-secondary btn-xs" onClick={() => notify(k, 'Certificate renewal reminder sent', `${vendorById(vendorId)?.name} · ${d.certType}`)}>Send Reminder</button>}</div>} />
            );
          })}
        </AlertCard>
        <AlertCard icon={PackageX} tone="red" title="Vendors with 0 live products, blocked by compliance" count={zeroLive.length}>
          {zeroLive.map(({ v, total, reason }) => (
            <AlertRow key={v.id} left={<><span className="small bold">{v.name}</span><div className="xs muted">{total} listing(s) hidden · {reason ?? (v.status !== 'Active' ? 'Vendor frozen' : 'No live listings')}</div></>}
              right={<Link to="/admin/vendors" className="btn btn-secondary btn-xs">Open vendor</Link>} />
          ))}
        </AlertCard>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', alignItems: 'start' }}>
        <Card title="Recent Platform Activity" icon={Activity} pad={false}>
          {feed.map((f, i) => (
            <div key={i} className="row" style={{ padding: '10px 20px', borderBottom: '1px solid var(--slate-100)', alignItems: 'flex-start' }}>
              <span className={`tone-${f.tone}`} style={{ width: 30, height: 30, borderRadius: 'var(--radius)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><f.icon size={14} /></span>
              <div className="grow small">{f.text}</div>
              <span className="xs muted nowrap">{fmtDateTime(f.at)}</span>
            </div>
          ))}
          <div style={{ padding: '10px 20px' }}><Link to="/admin/config/audit" className="small bold">Full audit log →</Link></div>
        </Card>
        <div className="stack-16">
          <Card title="Quick Actions">
            <div className="stack-12" style={{ gap: 8 }}>
              <button className="btn btn-secondary btn-block" style={{ justifyContent: 'space-between' }} onClick={() => notify('qa:publish', 'Approver team reminded to publish pending products', `${products.filter((p) => p.pending).length} listing(s)`)}>
                <span className="row"><Package size={14} /> Publish Pending Products</span><Pill tone="amber">{products.filter((p) => p.pending).length}</Pill>
              </button>
              <button className="btn btn-secondary btn-block" style={{ justifyContent: 'space-between' }} onClick={() => notify('qa:kyc', 'Approver team reminded to review KYC queue', 'Vendor documents')}>
                <span className="row"><FileCheck2 size={14} /> Review KYC Queue</span><Pill tone="amber">{pendingApprovals - products.filter((p) => p.pending).length}</Pill>
              </button>
              <Link to="/admin/settlements" className="btn btn-primary btn-block"><Wallet size={14} /> Generate Settlement Batch</Link>
              <div className="xs muted">Publishing and KYC decisions are made by the Approver. Admin can't self-approve; these buttons send the team a reminder.</div>
            </div>
          </Card>
          <Card title="SLA Summary">
            <div className="stack-12" style={{ gap: 8 }}>
              <SlaBar label="Accepted within 1 business day" pct={acceptedTotal.length ? (acceptOnTime / acceptedTotal.length) * 100 : 100} />
              <SlaBar label="Dispatched within lead time" pct={dispatched.length ? (dispatchOnTime / dispatched.length) * 100 : 100} />
              <SlaBar label="NDR actioned within 24h" pct={92} />
              <SlaBar label="Disputes decided within 5 days" pct={88} />
            </div>
          </Card>
          <Card title="Platform Health">
            <div className="stack-12" style={{ gap: 6 }}>
              {[['Payment gateway', 'Operational'], ['Courier APIs (Delhivery, BlueDart)', 'Operational'], ['GST / PAN verification', 'Operational'], ['SMS & email notifications', 'Degraded: provider TBD'], ['TrimInsta hub scanners', 'Operational']].map(([n, st]) => (
                <div key={n} className="row small"><span style={{ width: 8, height: 8, borderRadius: '50%', background: st === 'Operational' ? 'var(--success)' : 'var(--warning)' }} /><span className="grow">{n}</span><span className="xs muted">{st}</span></div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      <Banner tone="info" lead="Mock baseline:">platform-wide totals include a fixed demo baseline plus the orders placed in this demo.</Banner>
    </div>
  );
}

function AlertCard({ icon: Icon, tone, title, count, children, foot }: { icon: LucideIcon; tone: 'red' | 'amber'; title: string; count: number; children: React.ReactNode; foot?: string }) {
  return (
    <section className="card" style={{ borderTop: `3px solid var(--${tone === 'red' ? 'danger' : 'warning'})` }}>
      <div className="card-head">
        <span className={`tone-${tone}`} style={{ width: 30, height: 30, borderRadius: 'var(--radius)', display: 'grid', placeItems: 'center' }}><Icon size={15} /></span>
        <h3 className="grow">{title}</h3>
        <Pill tone={count ? tone : 'green'}>{count}</Pill>
      </div>
      <div style={{ maxHeight: 260, overflowY: 'auto' }}>
        {count === 0 ? <div className="small muted" style={{ padding: '14px 20px' }}><CheckCircle2 size={14} style={{ verticalAlign: -2, color: 'var(--success)' }} /> No breaches</div> : children}
      </div>
      {foot && <div className="xs muted" style={{ padding: '8px 20px', borderTop: '1px solid var(--border)' }}>{foot}</div>}
    </section>
  );
}

function AlertRow({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return <div className="row" style={{ padding: '9px 20px', borderBottom: '1px solid var(--slate-100)' }}><div className="grow" style={{ minWidth: 0 }}>{left}</div>{right}</div>;
}

function SlaBar({ label, pct }: { label: string; pct: number }) {
  const tone = pct >= 90 ? 'var(--success)' : pct >= 75 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div>
      <div className="row-between xs"><span>{label}</span><b className="mono">{pct.toFixed(0)}%</b></div>
      <div style={{ height: 6, borderRadius: 'var(--radius-sm)', background: 'var(--slate-100)', marginTop: 3 }}><div style={{ width: `${pct}%`, height: '100%', borderRadius: 'var(--radius-sm)', background: tone }} /></div>
    </div>
  );
}
