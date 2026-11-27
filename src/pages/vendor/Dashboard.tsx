import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Boxes, CalendarClock, ClipboardCheck, FileCheck2, IndianRupee, Plus, ShoppingBag, Timer, Truck, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader, StatusPill } from '../../components/ui';
import { ActionRow, DataTableCard, FilterChips, HeroStatCard, MonoId, ProgressStatCard, StatCard } from '../../components/kit';
import { customerById } from '../../data/customer';
import { fmtDate, inr, num } from '../../lib/format';
import { isException, isOverdue, useOrders, vendorAmount } from '../../lib/orders';
import type { SubOrder } from '../../lib/orders';
import { productStatus, totalStock, useCatalog } from '../../lib/catalog';
import type { ProductStatus } from '../../lib/catalog';
import { daysToExpiry, displayStatus, useOnboarding } from '../../lib/onboarding';
import { useAuth } from '../../lib/auth';

type ActKind = 'orders' | 'compliance' | 'catalog';
interface Act { key: string; kind: ActKind; critical: boolean; icon: LucideIcon; tone: 'red' | 'amber' | 'blue' | 'violet'; title: string; refId?: string; subtitle: string; cta: string; to: string }
type ActFilter = 'all' | 'critical' | ActKind;
type OrdFilter = 'all' | 'new' | 'dispatch' | 'transit' | 'delivered' | 'exceptions';

const ordBucket = (s: SubOrder): Exclude<OrdFilter, 'all'> =>
  s.status === 'Order Placed' ? 'new' : s.status === 'Accepted' ? 'dispatch' : ['Dispatched', 'In Transit', 'Out for Delivery'].includes(s.status) ? 'transit' : s.status === 'Delivered' ? 'delivered' : 'exceptions';

export default function VendorDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { subOrders } = useOrders();
  const { products } = useCatalog();
  const { data } = useOnboarding();
  const [actF, setActF] = useState<ActFilter>('all');
  const [ordF, setOrdF] = useState<OrdFilter>('all');

  const mine = useMemo(() => subOrders.filter((s) => s.vendorId === user?.vendorId).sort((a, b) => b.placedAt.localeCompare(a.placedAt)), [subOrders, user]);
  const myProducts = products.filter((p) => p.vendorId === user?.vendorId);
  const newOrders = mine.filter((s) => s.status === 'Order Placed' && s.fulfilment !== 'insta');
  const lateAccept = newOrders.filter((s) => isOverdue(s.acceptBy));
  const lateDispatch = mine.filter((s) => s.status === 'Accepted' && s.fulfilment !== 'insta' && isOverdue(s.dispatchBy));
  const lowStock = myProducts.filter((p) => p.live && totalStock(p) < p.lowStockAt);
  const expiring = data.docs.filter((d) => { const n = daysToExpiry(d); return n !== null && n <= 30 && ['Approved', 'Expired'].includes(displayStatus(d)); });
  const pendingApprovals = myProducts.filter((p) => p.pending).length;

  /* ---------- earnings (vendor base price, pre-tax) ---------- */
  const now = new Date();
  const monthKey = (d: Date) => d.toISOString().slice(0, 7);
  const thisM = monthKey(now);
  const lastM = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 15));
  const delivered = mine.filter((s) => s.delivery && s.total > 0);
  const earnIn = (m: string) => delivered.filter((s) => s.delivery!.at.slice(0, 7) === m).reduce((a, s) => a + vendorAmount(s), 0);
  const mtd = earnIn(thisM);
  const prev = earnIn(lastM);
  const trendPct = prev ? ((mtd - prev) / prev) * 100 : 0;
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = now.getTime() - (7 - i) * 7 * 86400000;
    return delivered.filter((s) => { const t = new Date(s.delivery!.at).getTime(); return t <= end && t > end - 7 * 86400000; }).reduce((a, s) => a + vendorAmount(s), 0);
  });

  /* ---------- documents progress ---------- */
  const docStates = data.docs.map((d) => displayStatus(d));
  const approved = docStates.filter((s) => s === 'Approved').length;
  const pendingDocs = docStates.filter((s) => s === 'Pending').length;
  const badDocs = docStates.length - approved - pendingDocs;

  /* ---------- action list ---------- */
  const acts: Act[] = [
    ...lateDispatch.map((s) => ({ key: `ld-${s.id}`, kind: 'orders' as const, critical: true, icon: Truck, tone: 'red' as const, title: 'Dispatch overdue', refId: s.id, subtitle: `${customerById(s.customerId)?.company} · promised ${fmtDate(s.dispatchBy!)}`, cta: 'Dispatch now', to: '/vendor/orders' })),
    ...newOrders.map((s) => ({ key: `no-${s.id}`, kind: 'orders' as const, critical: isOverdue(s.acceptBy), icon: ShoppingBag, tone: isOverdue(s.acceptBy) ? 'red' as const : 'amber' as const, title: isOverdue(s.acceptBy) ? 'Acceptance overdue' : 'Accept or reject', refId: s.id, subtitle: `${customerById(s.customerId)?.company} · ${num(s.lines[0].qty)} ${s.lines[0].unit} · accept by ${fmtDate(s.acceptBy)}`, cta: 'Review', to: '/vendor/orders' })),
    ...expiring.map((d) => { const n = daysToExpiry(d) ?? 0; return { key: `cx-${d.id}`, kind: 'compliance' as const, critical: n < 0, icon: CalendarClock, tone: n < 0 ? 'red' as const : 'amber' as const, title: n < 0 ? `${d.certType} expired` : `${d.certType} expires in ${n} days`, refId: d.number, subtitle: n < 0 ? 'Badge hidden; sales of products that need it are blocked' : 'Upload the renewal to keep the badge and sales active', cta: 'Upload renewal', to: '/vendor/kyc' }; }),
    ...data.docs.filter((d) => ['Rejected', 'On Hold'].includes(displayStatus(d))).map((d) => ({ key: `dh-${d.id}`, kind: 'compliance' as const, critical: false, icon: FileCheck2, tone: 'amber' as const, title: `${d.title}: ${displayStatus(d)}`, refId: d.number, subtitle: d.versions[d.versions.length - 1].reason ?? 'See the reviewer note', cta: 'Re-upload', to: '/vendor/kyc' })),
    ...lowStock.map((p) => ({ key: `ls-${p.id}`, kind: 'catalog' as const, critical: false, icon: Boxes, tone: 'amber' as const, title: 'Low stock', refId: p.sku, subtitle: `${num(totalStock(p))} ${p.live!.unit} left · reorder level ${num(p.lowStockAt)}`, cta: 'Update stock', to: '/vendor/catalog' })),
    ...myProducts.filter((p) => ['Rejected', 'Revision rejected'].includes(productStatus(p))).map((p) => ({ key: `lr-${p.id}`, kind: 'catalog' as const, critical: false, icon: AlertTriangle, tone: 'red' as const, title: 'Listing rejected', refId: p.sku, subtitle: p.rejected?.reason ?? '', cta: 'Fix & resubmit', to: `/vendor/catalog/${p.id}/edit` })),
  ];
  const actShown = acts.filter((a) => actF === 'all' || (actF === 'critical' ? a.critical : a.kind === actF));
  const actCount = (f: ActFilter) => acts.filter((a) => f === 'all' || (f === 'critical' ? a.critical : a.kind === f)).length;

  const ordCount = (f: OrdFilter) => mine.filter((s) => f === 'all' || ordBucket(s) === f).length;
  const ordShown = mine.filter((s) => ordF === 'all' || ordBucket(s) === ordF).slice(0, 6);
  const catalogStates: ProductStatus[] = ['Live', 'Revision pending', 'Pending', 'Rejected', 'Revision rejected', 'Draft'];

  return (
    <div>
      <PageHeader
        eyebrow={<>{user?.org} · <span style={{ textTransform: 'none' }}>{user?.email}</span></>}
        title={`Good day, ${user?.name.split(' ')[0]}`}
        subtitle={`${acts.length} item(s) need your attention · ${fmtDate(now)}`}
        actions={<>
          <Link to="/vendor/settlements" className="btn btn-secondary"><Wallet size={15} /> Settlements</Link>
          <Link to="/vendor/catalog/new" className="btn btn-primary"><Plus size={15} /> Add product</Link>
        </>} />

      <section className="kgrid" aria-label="Key figures">
        <div className="hero">
          <HeroStatCard label="Earnings this month" icon={IndianRupee} value={<span className="mono" style={{ fontSize: 'inherit' }}>{inr(mtd, { decimals: 0 })}</span>}
            trend={prev ? { pct: trendPct, label: 'vs last month' } : undefined} series={weeks}
            caption={<>{delivered.filter((s) => s.delivery!.at.slice(0, 7) === thisM).length} delivered sub-orders · base price, pre-tax · last 8 weeks</>} />
        </div>
        <StatCard label="New orders" icon={ShoppingBag} value={newOrders.length} attention={lateAccept.length ? 'red' : newOrders.length ? 'amber' : false}
          caption={lateAccept.length ? `${lateAccept.length} past accept-by` : 'Accept within 1 business day'} to="/vendor/orders" />
        <StatCard label="Late dispatch" icon={Timer} value={lateDispatch.length} attention={lateDispatch.length ? 'red' : false} caption="Past the dispatch-by date" to="/vendor/orders" />
        <StatCard label="Low stock" icon={Boxes} value={lowStock.length} attention={lowStock.length ? 'amber' : false} caption="SKUs below reorder level" to="/vendor/catalog" />
        <StatCard label="Cert. expiry" icon={CalendarClock} value={expiring.length} attention={expiring.some((d) => (daysToExpiry(d) ?? 0) < 0) ? 'red' : expiring.length ? 'amber' : false} caption="Expired or due within 30 days" to="/vendor/kyc" />
        <StatCard label="Pending approvals" icon={ClipboardCheck} value={pendingApprovals} caption="Listings with the Approver" to="/vendor/catalog" />
        <ProgressStatCard label="Documents approved" icon={FileCheck2} done={approved} total={docStates.length}
          segments={docStates.map((s) => (s === 'Approved' ? 'on' : s === 'Pending' ? 'warn' : 'bad'))}
          caption={`${approved} approved · ${pendingDocs} pending · ${badDocs} need action`} to="/vendor/kyc" />
      </section>

      <div className="split" style={{ marginTop: 18 }}>
        <section className="kcard" aria-labelledby="act-title">
          <div className="kcard-head"><h2 id="act-title">Action needed</h2><span className="count-pill">{acts.length}</span></div>
          <div style={{ marginBottom: 14 }}>
            <FilterChips<ActFilter> label="Filter actions" value={actF} onChange={setActF} chips={[
              { id: 'all', label: 'All', count: actCount('all') }, { id: 'critical', label: 'Critical', count: actCount('critical') },
              { id: 'orders', label: 'Orders', count: actCount('orders') }, { id: 'compliance', label: 'Compliance', count: actCount('compliance') }, { id: 'catalog', label: 'Catalog', count: actCount('catalog') },
            ]} />
          </div>
          {actShown.length === 0 ? <div className="small muted">Nothing here. You're all caught up.</div>
            : actShown.map((a) => <ActionRow key={a.key} icon={a.icon} tone={a.tone} title={a.title} refId={a.refId} subtitle={a.subtitle} cta={a.cta} to={a.to} critical={a.critical} />)}
        </section>

        <div className="stack-16">
          <DataTableCard<SubOrder> title="Recent sub-orders" viewAll="/vendor/orders"
            chips={<FilterChips<OrdFilter> label="Filter sub-orders by status" value={ordF} onChange={setOrdF} chips={[
              { id: 'all', label: 'All', count: ordCount('all') }, { id: 'new', label: 'New', count: ordCount('new') }, { id: 'dispatch', label: 'To dispatch', count: ordCount('dispatch') },
              { id: 'transit', label: 'In transit', count: ordCount('transit') }, { id: 'delivered', label: 'Delivered', count: ordCount('delivered') }, { id: 'exceptions', label: 'Exceptions', count: ordCount('exceptions') },
            ]} />}
            rows={ordShown} rowKey={(s) => s.id} onRowClick={() => nav('/vendor/orders')}
            columns={[
              { key: 'id', header: 'Sub-order', render: (s) => <><MonoId strong>{s.id}</MonoId><span className="sec">{customerById(s.customerId)?.company}</span></> },
              { key: 'st', header: 'Status', render: (s) => <StatusPill status={s.status} /> },
              { key: 'amt', header: 'Amount', align: 'right', render: (s) => <span className="mono" style={{ fontWeight: 600, color: isException(s.status) ? 'var(--text-3)' : 'var(--heading)' }}>{inr(vendorAmount(s))}</span> },
            ]} />

          <section className="kcard" aria-labelledby="cat-title">
            <div className="kcard-head"><h2 id="cat-title">Catalog at a glance</h2><span className="count-pill">{myProducts.length}</span><Link to="/vendor/catalog" className="view-all">Open catalog →</Link></div>
            <div className="row wrap" style={{ gap: 8 }}>
              {catalogStates.map((st) => <StatusPill key={st} status={st} label={`${st === 'Revision pending' ? 'Revision pending' : st}: ${myProducts.filter((p) => productStatus(p) === st).length}`} />)}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
