import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Search, ShoppingBag } from 'lucide-react';
import { Card, EmptyState, ExportButtons, PageHeader, Tabs } from '../../components/ui';
import { SortTh, useSort } from '../../components/SortTh';
import { SubStatusPill } from '../../components/OrderBits';
import { vendorById } from '../../data/vendors';
import { fmtDate, inr } from '../../lib/format';
import { isException, useOrders } from '../../lib/orders';
import type { Order } from '../../lib/orders';
import { useAuth } from '../../lib/auth';

type F = 'all' | 'active' | 'delivered' | 'issues';

const bucket = (o: Order): F => {
  if (o.subOrders.some((s) => isException(s.status))) return 'issues';
  if (o.subOrders.every((s) => s.status === 'Delivered')) return 'delivered';
  return 'active';
};

export default function MyOrders() {
  const { user } = useAuth();
  const { orders } = useOrders();
  const nav = useNavigate();
  const [f, setF] = useState<F>('all');
  const [q, setQ] = useState('');
  const mine = useMemo(() => orders.filter((o) => o.customerId === user?.customerId).sort((a, b) => b.placedAt.localeCompare(a.placedAt)), [orders, user]);
  const shown = mine.filter((o) => (f === 'all' || bucket(o) === f)
    && `${o.id} ${o.subOrders.map((s) => `${s.id} ${s.awb ?? ''} ${s.lines.map((l) => l.title).join(' ')}`).join(' ')}`.toLowerCase().includes(q.toLowerCase()));
  const { sorted, sort, by } = useSort(shown, { order: (o) => o.id, placed: (o) => o.placedAt, total: (o) => o.total, vendors: (o) => o.subOrders.length }, { key: 'placed', dir: 'desc' });
  const count = (x: F) => mine.filter((o) => x === 'all' || bucket(o) === x).length;

  return (
    <div className="container wide stack-16" style={{ maxWidth: 1180 }}>
      <PageHeader icon={ShoppingBag} title="My Orders" subtitle="Parent orders with one sub-order per vendor. Track shipments, download invoices and raise damage claims." actions={<ExportButtons name="my-orders" />} />
      <div className="row-between wrap">
        <Tabs<F> value={f} onChange={setF} tabs={[
          { id: 'all', label: 'All', count: count('all') }, { id: 'active', label: 'In progress', count: count('active') },
          { id: 'delivered', label: 'Delivered', count: count('delivered') }, { id: 'issues', label: 'Needs attention', count: count('issues') },
        ]} />
        <div className="input-icon" style={{ width: 300 }}><Search size={15} /><input className="input" placeholder="Order, sub-order, AWB or product" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <Card pad={false}>
        {shown.length === 0 ? (
          <EmptyState icon={Package} title={mine.length ? 'No orders match' : 'No orders yet'} action={!mine.length && <Link to="/marketplace" className="btn btn-primary btn-sm">Start procuring</Link>} />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><SortTh k="order" sort={sort} by={by}>Order</SortTh><SortTh k="placed" sort={sort} by={by}>Placed</SortTh><SortTh k="vendors" sort={sort} by={by}>Vendor sub-orders</SortTh><SortTh k="total" sort={sort} by={by} right>Total</SortTh><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {sorted.map((o) => (
                  <tr key={o.id} className="clickable" onClick={() => nav(`/account/orders/${o.id}`)}>
                    <td><div className="mono bold">{o.id}</div><div className="t-sub">{o.subOrders.reduce((s, x) => s + x.lines.length, 0)} item(s) · {o.address.label}</div></td>
                    <td className="small nowrap">{fmtDate(o.placedAt)}</td>
                    <td>
                      <div className="stack-12" style={{ gap: 4 }}>
                        {o.subOrders.map((s) => (
                          <div key={s.id} className="row wrap" style={{ gap: 6 }}>
                            <span className="mono xs">{s.id}</span>
                            <span className="xs muted">{vendorById(s.vendorId)?.name}</span>
                            <SubStatusPill status={s.status} />
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="num">{inr(o.total)}</td>
                    <td className="right"><span className="btn btn-secondary btn-xs">View</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
