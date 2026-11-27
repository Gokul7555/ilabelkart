import { useState } from 'react';
import { AlertTriangle, Boxes, MapPin } from 'lucide-react';
import { Banner, Card, EmptyState, ExportButtons, Modal, PageHeader, Pill, Tabs } from '../../components/ui';
import { vendorById } from '../../data/vendors';
import { TRIMINSTA_HUBS } from '../../data/india';
import { inr, num } from '../../lib/format';
import { useCatalog } from '../../lib/catalog';
import { useOrders } from '../../lib/orders';
import { HUBS_META, RENT_PER_CBM, SPACE_USED, useWarehouse } from '../../lib/warehouse';
import { useAudit } from '../../lib/audit';
import { useToast } from '../../lib/toast';

type T = 'stock' | 'low' | 'space';

export default function Inventory() {
  const { products } = useCatalog();
  const { subOrders } = useOrders();
  const wh = useWarehouse();
  const { log } = useAudit();
  const toast = useToast();
  const [tab, setTab] = useState<T>('stock');
  const [hub, setHub] = useState('all');
  const [binEdit, setBinEdit] = useState<{ key: string; sku: string; bin: string } | null>(null);

  const rows = products.flatMap((p) => p.stock.filter((s) => s.loc.startsWith('WH-')).map((s) => {
    const hubId = s.loc.slice(0, 9);
    const hubLabel = TRIMINSTA_HUBS.find((h) => h.id === hubId)?.name ?? hubId;
    const reserved = subOrders.filter((so) => so.fulfilment === 'insta' && so.hubName === hubLabel && ['Order Placed', 'Accepted'].includes(so.status))
      .reduce((a, so) => a + (so.lines.find((l) => l.productId === p.id)?.qty ?? 0), 0);
    const available = s.qty - reserved;
    const threshold = (p.live?.moq ?? 100) * 2;
    return { p, hubId, hubLabel, onHand: s.qty, reserved, available, threshold, low: available < threshold, bin: wh.bins[`${hubId}:${p.id}`] };
  })).filter((r) => hub === 'all' || r.hubId === hub);
  const list = tab === 'low' ? rows.filter((r) => r.low) : rows;

  return (
    <div className="container wide stack-16" style={{ maxWidth: 1320 }}>
      <PageHeader icon={Boxes} title="Inventory & Bins" subtitle="Hub stock by bin location, reservations for TrimInsta orders, low stock, and space used per vendor" actions={<><Pill tone="amber" strong>WAREHOUSE OPS</Pill><ExportButtons name="hub-inventory" /></>} />
      <div className="row-between wrap">
        <Tabs<T> value={tab} onChange={setTab} tabs={[
          { id: 'stock', label: 'Stock & bins', count: rows.length }, { id: 'low', label: 'Low stock', count: rows.filter((r) => r.low).length }, { id: 'space', label: 'Space & rent', count: SPACE_USED.length },
        ]} />
        <select className="select" style={{ width: 240, height: 32 }} value={hub} onChange={(e) => setHub(e.target.value)} aria-label="Hub">
          <option value="all">All hubs</option>{TRIMINSTA_HUBS.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </div>

      {tab !== 'space' && (
        <>
          {tab === 'low' && <Banner tone="warning" icon={AlertTriangle} lead="Low stock:">TrimInsta is switched off automatically for a buyer when the hub can't cover their quantity. Ask the vendor for an inbound top-up.</Banner>}
          <Card pad={false}>
            {list.length === 0 ? <EmptyState icon={Boxes} title="No hub stock" /> : (
              <table className="tbl">
                <thead><tr><th>Hub</th><th>SKU</th><th>Vendor</th><th>Bin</th><th className="right">On hand</th><th className="right">Reserved</th><th className="right">Available</th><th></th></tr></thead>
                <tbody>{list.map((r) => (
                  <tr key={`${r.hubId}:${r.p.id}`}>
                    <td className="small">{r.hubLabel}</td>
                    <td><div className="mono small bold">{r.p.sku}</div><div className="t-sub" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.p.live?.title}</div></td>
                    <td className="small">{vendorById(r.p.vendorId)?.name}</td>
                    <td>{r.bin ? <span className="mono small"><MapPin size={11} style={{ verticalAlign: -1 }} /> {r.bin}</span> : <Pill tone="amber">Unassigned</Pill>}</td>
                    <td className="num">{num(r.onHand)}</td><td className="num">{num(r.reserved)}</td>
                    <td className="num" style={{ color: r.low ? 'var(--warning)' : undefined }}>{num(r.available)} {r.p.live?.unit}{r.low && <div><Pill tone="amber">Below {num(r.threshold)}</Pill></div>}</td>
                    <td className="right"><button className="btn btn-ghost btn-xs" onClick={() => setBinEdit({ key: `${r.hubId}:${r.p.id}`, sku: r.p.sku, bin: r.bin ?? '' })}>Move bin</button></td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </Card>
        </>
      )}

      {tab === 'space' && (
        <>
          <div className="grid g-4">
            {TRIMINSTA_HUBS.map((h) => {
              const used = SPACE_USED.filter((u) => u.hubId === h.id).reduce((a, u) => a + u.cbm, 0);
              const cap = HUBS_META[h.id].capacityCbm;
              const pct = (used / cap) * 100;
              return (
                <Card key={h.id}>
                  <div className="small bold">{h.name}</div>
                  <div className="xs muted">{num(used)} of {num(cap)} cbm used</div>
                  <div style={{ height: 8, background: 'var(--slate-100)', borderRadius: 'var(--radius-sm)', marginTop: 8 }}><div style={{ width: `${Math.min(100, pct)}%`, height: '100%', borderRadius: 'var(--radius-sm)', background: pct > 85 ? 'var(--danger)' : 'var(--primary)' }} /></div>
                  <div className="xs mono" style={{ marginTop: 4 }}>{pct.toFixed(1)}%</div>
                </Card>
              );
            })}
          </div>
          <Banner tone="warning" lead="Rent rate TBD.">Mock {inr(RENT_PER_CBM, { decimals: 0 })} per cbm per month. Rent invoices are issued in Finance › Invoices.</Banner>
          <Card pad={false}>
            <table className="tbl">
              <thead><tr><th>Hub</th><th>Vendor</th><th className="right">Space used</th><th className="right">Monthly rent (pre-GST)</th></tr></thead>
              <tbody>{SPACE_USED.map((u) => (
                <tr key={`${u.hubId}:${u.vendorId}`}><td className="small">{TRIMINSTA_HUBS.find((h) => h.id === u.hubId)?.name}</td><td className="small">{vendorById(u.vendorId)?.name}</td><td className="num">{num(u.cbm)} cbm</td><td className="num">{inr(u.cbm * RENT_PER_CBM)}</td></tr>
              ))}</tbody>
            </table>
          </Card>
        </>
      )}

      {binEdit && (
        <Modal open onClose={() => setBinEdit(null)} title={`Move bin · ${binEdit.sku}`} icon={MapPin}
          footer={<><button className="btn btn-secondary" onClick={() => setBinEdit(null)}>Cancel</button><button className="btn btn-primary" disabled={!/^[A-Z]{3}-[A-Z]-\d{2}-\d$/.test(binEdit.bin)} onClick={() => {
            const old = wh.bins[binEdit.key]; wh.setBin(binEdit.key, binEdit.bin); log({ action: 'Bin location changed', entity: `${binEdit.key}`, oldValue: old ?? '—', newValue: binEdit.bin }); toast('success', 'Bin updated', binEdit.bin); setBinEdit(null);
          }}>Save</button></>}>
          <div className="field"><label htmlFor="bn">Bin (HUB-ZONE-RACK-LEVEL)</label><input id="bn" className="input mono" value={binEdit.bin} onChange={(e) => setBinEdit({ ...binEdit, bin: e.target.value.toUpperCase() })} placeholder="MUM-A-03-2" /></div>
        </Modal>
      )}
    </div>
  );
}
