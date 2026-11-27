import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, BadgeCheck, Building2, CalendarClock, CheckCircle2, ClipboardCheck, Clock, FileCheck2, History, IndianRupee,
  Package, PackageX, Percent, ShoppingBag, Truck, Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader, Pill, StatusPill } from '../../components/ui';
import { ActionRow, DataTableCard, FilterChips, HeroStatCard, MonoId, ProgressStatCard, StatCard } from '../../components/kit';
import { CATEGORIES } from '../../data/categories';
import { NOVATEX_ID, VENDORS, vendorById } from '../../data/vendors';
import { customerById } from '../../data/customer';
import { fmtDate, fmtDateTime, inr, inrCompact, num } from '../../lib/format';
import { isOverdue, useOrders } from '../../lib/orders';
import type { SubOrder } from '../../lib/orders';
import { useCatalog } from '../../lib/catalog';
import { daysToExpiry, displayStatus, latest, useOnboarding } from '../../lib/onboarding';
import { useListings } from '../../lib/marketplace';
import { useAdmin } from '../../lib/admin';
import { useAudit } from '../../lib/audit';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';

/** Platform-wide baseline (mock): demo orders are added on top. */
const BASE = { vendors: 178, orders: 1284, gmv: 47283960, commissionRate: 0.087 };

const FEED: { at: string; icon: LucideIcon; tone: string; text: string }[] = [
  { at: '2026-11-26T09:12:00+05:30', icon: ShoppingBag, tone: 'indigo', text: 'Order ORD-2026-5768 placed by Raymond Garments Ltd' },
  { at: '2026-11-25T18:40:00+05:30', icon: FileCheck2, tone: 'blue', text: 'KYC submitted: Ribbonex India uploaded REACH + GST amendment' },
  { at: '2026-11-25T11:20:00+05:30', icon: BadgeCheck, tone: 'green', text: 'Vendor approved: AuraFastener Industries passed annual re-verification' },
  { at: '2026-11-24T11:05:00+05:30', icon: Wallet, tone: 'green', text: 'Payout released: batch SB-2026-047 · UTR HDFC0026112489 · ₹32,000.00' },
  { at: '2026-11-23T16:00:00+05:30', icon: Package, tone: 'violet', text: 'Product published: TT-RF-0750 UHF RFID Hang Tag Inlay (v1)' },
];

type ActKind = 'orders' | 'compliance' | 'vendors';
type ActF = 'all' | 'critical' | ActKind;
type OrdF = 'all' | 'new' | 'progress' | 'delivered' | 'exceptions';
const bucket = (s: SubOrder): Exclude<OrdF, 'all'> =>
  s.status === 'Order Placed' ? 'new' : s.status === 'Delivered' ? 'delivered' : ['Accepted', 'Dispatched', 'In Transit', 'Out for Delivery'].includes(s.status) ? 'progress' : 'exceptions';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { orders, subOrders } = useOrders();
  const { products, otherDocs } = useCatalog();
  const { data: onb } = useOnboarding();
  const listings = useListings();
  const admin = useAdmin();
  const { entries, log } = useAudit();
  const toast = useToast();
  const [actF, setActF] = useState<ActF>('all');
  const [ordF, setOrdF] = useState<OrdF>('all');

  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  const real = orders.filter((o) => !o.replacementFor);
  const mtd = real.filter((o) => o.placedAt.slice(0, 7) === month);
  const gmv = BASE.gmv + mtd.reduce((s, o) => s + o.total, 0);
  const weekly = Array.from({ length: 8 }, (_, i) => {
    const end = now.getTime() - (7 - i) * 7 * 86400000;
    return real.filter((o) => { const t = new Date(o.placedAt).getTime(); return t <= end && t > end - 7 * 86400000; }).reduce((s, o) => s + o.total, 0);
  });
  const pendingProducts = products.filter((p) => p.pending).length;
  const pendingDocs = [...onb.docs, ...Object.values(otherDocs).flat()].filter((d) => latest(d).status === 'Pending').length;
  const dispatched = subOrders.filter((s) => s.handover && s.dispatchBy);
  const onTime = dispatched.filter((s) => s.handover!.at <= s.dispatchBy!).length;

  /* ---------- SLA breaches → action rows ---------- */
  const notify = (key: string, what: string, entity: string) => { admin.markNotified(key); log({ action: what, entity }); toast('success', what, entity); };
  const sent = (key: string) => (admin.notified[key] ? <Pill tone="green" icon={CheckCircle2}>Sent {fmtDateTime(admin.notified[key]).split(', ')[1]}</Pill> : undefined);

  const allDocs = [...onb.docs.map((d) => ({ vendorId: NOVATEX_ID, d })), ...Object.entries(otherDocs).flatMap(([v, ds]) => ds.map((d) => ({ vendorId: v, d })))];
  type Act = { key: string; kind: ActKind; critical: boolean; icon: LucideIcon; tone: 'red' | 'amber'; title: string; refId?: string; subtitle: string; cta: string; to?: string; onClick?: () => void };
  const acts: Act[] = [
    ...subOrders.filter((s) => s.status === 'Order Placed' && s.fulfilment !== 'insta' && isOverdue(s.acceptBy)).map((s) => {
      const h = Math.floor((Date.now() - new Date(s.placedAt).getTime()) / 3600000);
      return { key: `accept:${s.id}`, kind: 'orders' as const, critical: true, icon: Clock, tone: 'red' as const, title: 'Acceptance overdue', refId: s.id, subtitle: `${vendorById(s.vendorId)?.name} · waiting ${Math.floor(h / 24)}d ${h % 24}h`, cta: 'Notify vendor', onClick: () => notify(`accept:${s.id}`, 'Vendor notified to accept', `${s.id} · ${vendorById(s.vendorId)?.name}`) };
    }),
    ...subOrders.filter((s) => s.status === 'Accepted' && s.fulfilment !== 'insta' && isOverdue(s.dispatchBy)).map((s) => ({
      key: `dispatch:${s.id}`, kind: 'orders' as const, critical: true, icon: Truck, tone: 'red' as const, title: 'Dispatch overdue', refId: s.id,
      subtitle: `${vendorById(s.vendorId)?.name} · promised ${fmtDate(s.dispatchBy!)}`, cta: 'Escalate', onClick: () => notify(`dispatch:${s.id}`, 'Dispatch escalation sent', s.id),
    })),
    ...allDocs.filter(({ d }) => { const n = daysToExpiry(d); return d.kind === 'CERT' && n !== null && n <= 30 && ['Approved', 'Expired'].includes(displayStatus(d)); })
      .sort((a, b) => (daysToExpiry(a.d) ?? 0) - (daysToExpiry(b.d) ?? 0)).map(({ vendorId, d }) => {
        const n = daysToExpiry(d)!; const k = `cert:${vendorId}:${d.id}`;
        return { key: k, kind: 'compliance' as const, critical: n < 0, icon: CalendarClock, tone: n < 0 ? 'red' as const : 'amber' as const, title: n < 0 ? `${d.certType} expired ${-n}d ago` : `${d.certType} expires in ${n} days`, refId: d.number,
          subtitle: `${vendorById(vendorId)?.name} · badge hidden and sales blocked on expiry`, cta: 'Send reminder', onClick: () => notify(k, 'Certificate renewal reminder sent', `${vendorById(vendorId)?.name} · ${d.certType}`) };
      }),
    ...VENDORS.map((v) => ({ v, ls: listings.filter((l) => l.vendor.id === v.id) })).filter((x) => x.ls.every((l) => l.salesBlocked)).map(({ v, ls }) => ({
      key: `zero:${v.id}`, kind: 'vendors' as const, critical: false, icon: PackageX, tone: 'amber' as const, title: '0 sellable products', refId: v.id,
      subtitle: `${v.name} · ${ls.length} listing(s) hidden · ${ls.find((l) => l.salesBlocked)?.blockReason ?? (v.status !== 'Active' ? 'Vendor frozen' : 'No live listings')}`, cta: 'Open vendor', to: '/admin/vendors',
    })),
  ];
  const actCount = (f: ActF) => acts.filter((a) => f === 'all' || (f === 'critical' ? a.critical : a.kind === f)).length;
  const actShown = acts.filter((a) => actF === 'all' || (actF === 'critical' ? a.critical : a.kind === actF));

  const recent = useMemo(() => [...subOrders].filter((s) => s.total > 0).sort((a, b) => b.placedAt.localeCompare(a.placedAt)), [subOrders]);
  const ordCount = (f: OrdF) => recent.filter((s) => f === 'all' || bucket(s) === f).length;

  const feed = [
    ...entries.slice(0, 6).map((e) => ({ at: e.at, icon: History, tone: 'slate', text: `${e.action}: ${e.entity}${e.newValue ? ` → ${e.newValue}` : ''} · ${e.actor}` })),
    ...FEED,
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);

  return (
    <div>
      <PageHeader title={`Good day, ${user?.name.split(' ')[0]}`} subtitle={`Live platform overview and SLA monitoring · ${acts.length} item(s) need action · ${fmtDate(now)}`}
        actions={<>
          <Link to="/admin/config/audit" className="btn btn-secondary"><History size={15} /> Audit log</Link>
          <Link to="/admin/settlements" className="btn btn-primary"><Wallet size={15} /> Generate settlement batch</Link>
        </>} />

      <section className="kgrid" aria-label="Platform figures">
        <div className="hero">
          <HeroStatCard label="GMV this month" icon={IndianRupee} value={<span className="mono" style={{ fontSize: 'inherit' }}>{inrCompact(gmv)}</span>} series={weekly}
            caption={<>{inr(gmv, { decimals: 0 })} incl. GST · mock baseline + demo orders · sparkline: demo orders, last 8 weeks</>} />
        </div>
        <StatCard label="Active vendors" icon={Building2} value={num(BASE.vendors + VENDORS.filter((v) => v.status === 'Active').length)} caption={`${admin.applicants.length} awaiting activation`} to="/admin/vendors" />
        <StatCard label="Live products" icon={Package} value={num(CATEGORIES.reduce((s, c) => s + c.products, 0))} caption="Across 12 categories" />
        <StatCard label="Orders MTD" icon={ShoppingBag} value={num(BASE.orders + mtd.length)} caption="Parent orders" />
        <StatCard label="Commission MTD" icon={Percent} value={<span className="mono" style={{ fontSize: 'inherit' }}>{inrCompact(gmv * BASE.commissionRate)}</span>} caption="Category-level only" to="/admin/margin" />
        <StatCard label="Pending approvals" icon={ClipboardCheck} value={pendingProducts + pendingDocs} attention={pendingProducts + pendingDocs ? 'amber' : false} caption={`${pendingProducts} listings · ${pendingDocs} documents`} />
        <ProgressStatCard label="Dispatched on time" icon={Truck} done={onTime} total={dispatched.length}
          segments={dispatched.map((s) => (s.handover!.at <= s.dispatchBy! ? 'on' : 'bad'))} caption={`${dispatched.length - onTime} late · target 90%`} />
      </section>

      <div className="split" style={{ marginTop: 18 }}>
        <section className="kcard" aria-labelledby="sla-title">
          <div className="kcard-head"><h2 id="sla-title">SLA breaches & action needed</h2><span className="count-pill">{acts.length}</span></div>
          <div style={{ marginBottom: 14 }}>
            <FilterChips<ActF> label="Filter actions" value={actF} onChange={setActF} chips={[
              { id: 'all', label: 'All', count: actCount('all') }, { id: 'critical', label: 'Critical', count: actCount('critical') },
              { id: 'orders', label: 'Orders', count: actCount('orders') }, { id: 'compliance', label: 'Certificates', count: actCount('compliance') }, { id: 'vendors', label: 'Vendors', count: actCount('vendors') },
            ]} />
          </div>
          {actShown.length === 0 ? <div className="small muted">No breaches. Everything is within SLA.</div>
            : actShown.map((a) => <ActionRow key={a.key} icon={a.icon} tone={a.tone} title={a.title} refId={a.refId} subtitle={a.subtitle} cta={a.cta} to={a.to} onClick={a.onClick} done={sent(a.key)} critical={a.critical} />)}
        </section>

        <div className="stack-16">
          <DataTableCard<SubOrder> title="Recent sub-orders" viewAll="/admin/reports"
            chips={<FilterChips<OrdF> label="Filter sub-orders" value={ordF} onChange={setOrdF} chips={[
              { id: 'all', label: 'All', count: ordCount('all') }, { id: 'new', label: 'Awaiting acceptance', count: ordCount('new') },
              { id: 'progress', label: 'In progress', count: ordCount('progress') }, { id: 'delivered', label: 'Delivered', count: ordCount('delivered') }, { id: 'exceptions', label: 'Exceptions', count: ordCount('exceptions') },
            ]} />}
            rows={recent.filter((s) => ordF === 'all' || bucket(s) === ordF).slice(0, 6)} rowKey={(s) => s.id}
            columns={[
              { key: 'id', header: 'Sub-order', render: (s) => <><MonoId strong>{s.id}</MonoId><span className="sec">{vendorById(s.vendorId)?.name}</span></> },
              { key: 'buyer', header: 'Buyer', render: (s) => <span className="small">{customerById(s.customerId)?.company}</span> },
              { key: 'st', header: 'Status', render: (s) => <StatusPill status={s.status} /> },
              { key: 'amt', header: 'Amount', align: 'right', render: (s) => <span className="mono" style={{ fontWeight: 600 }}>{inr(s.total)}</span> },
            ]} />
          <section className="kcard" aria-labelledby="health-title">
            <div className="kcard-head"><h2 id="health-title">Platform health</h2></div>
            <div className="row wrap" style={{ gap: 8 }}>
              <Pill tone="green" icon={CheckCircle2}>Payment gateway</Pill>
              <Pill tone="green" icon={CheckCircle2}>Courier APIs</Pill>
              <Pill tone="green" icon={CheckCircle2}>GST / PAN checks</Pill>
              <Pill tone="green" icon={CheckCircle2}>Hub scanners</Pill>
              <Pill tone="amber" icon={Clock}>SMS & email: provider TBD</Pill>
            </div>
          </section>
        </div>
      </div>

      <section className="kcard" style={{ marginTop: 18 }} aria-labelledby="feed-title">
        <div className="kcard-head"><h2 id="feed-title">Recent platform activity</h2><Link to="/admin/config/audit" className="view-all">Full audit log →</Link></div>
        {feed.map((f, i) => (
          <div key={i} className="arow">
            <span className={`arow-icon tone-${f.tone}`}><f.icon size={16} aria-hidden /></span>
            <div className="grow" style={{ minWidth: 0 }}><div className="arow-sub" style={{ color: 'var(--text)', whiteSpace: 'normal' }}>{f.text}</div></div>
            <span className="xs muted nowrap">{fmtDateTime(f.at)}</span>
          </div>
        ))}
      </section>
      <p className="xs muted" style={{ marginTop: 10 }}><Activity size={11} style={{ verticalAlign: -1 }} /> Platform totals use a fixed demo baseline plus the orders placed in this demo.</p>
    </div>
  );
}
