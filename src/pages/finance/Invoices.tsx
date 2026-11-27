import { useState } from 'react';
import { Download, Receipt } from 'lucide-react';
import { Banner, Card, ExportButtons, PageHeader, Pill, Tabs } from '../../components/ui';
import { customerById } from '../../data/customer';
import { VENDORS, vendorById } from '../../data/vendors';
import { TRIMINSTA_HUBS } from '../../data/india';
import { fmtDate, inr, num } from '../../lib/format';
import { useOrders } from '../../lib/orders';
import { RENT_PER_CBM, SPACE_USED } from '../../lib/warehouse';
import { useToast } from '../../lib/toast';
import { useAudit } from '../../lib/audit';

type T = 'seller' | 'commission' | 'rent';
const MONTH = '2026-11';

export default function Invoices() {
  const { orders, subOrders } = useOrders();
  const toast = useToast();
  const { log } = useAudit();
  const [tab, setTab] = useState<T>('seller');
  const [issued, setIssued] = useState<Set<string>>(new Set());

  const seller = subOrders.filter((s) => s.invoiceNo).map((s) => {
    const o = orders.find((x) => x.id === s.orderId)!;
    const intra = vendorById(s.vendorId)?.state === o.address.state;
    return { s, o, intra, taxable: s.subtotal + s.shipping };
  }).sort((a, b) => (b.s.delivery?.at ?? '').localeCompare(a.s.delivery?.at ?? ''));

  const commission = VENDORS.map((v) => {
    const sos = subOrders.filter((s) => s.vendorId === v.id && s.delivery && s.delivery.at.slice(0, 7) === MONTH && s.total > 0);
    const amt = Math.round(sos.reduce((a, s) => a + s.lines.reduce((b, l) => b + (l.unitPrice - l.basePrice) * l.qty, 0), 0) * 100) / 100;
    return { v, sos, amt, gst: Math.round(amt * 18) / 100, no: `TN-COM-${MONTH.replace('-', '')}-${v.id.slice(-5)}` };
  }).filter((x) => x.sos.length);

  const rent = SPACE_USED.map((u) => {
    const amt = Math.round(u.cbm * RENT_PER_CBM * 100) / 100;
    return { ...u, amt, gst: Math.round(amt * 18) / 100, no: `TN-RNT-${MONTH.replace('-', '')}-${u.vendorId.slice(-5)}-${u.hubId.slice(3, 6)}` };
  });

  const issue = (no: string, what: string) => { setIssued((x) => new Set(x).add(no)); log({ action: `${what} invoice issued`, entity: no }); toast('success', 'Invoice issued', no); };
  const dl = (no: string) => toast('success', 'Downloaded', `${no}.pdf`);

  return (
    <div className="container wide stack-16" style={{ maxWidth: 1320 }}>
      <PageHeader icon={Receipt} title="Invoices" subtitle="Seller invoices (vendor → buyer), commission invoices and hub rent invoices (TrimNova → vendor)" actions={<><Pill tone="indigo" strong>FINANCE DESK</Pill><ExportButtons name="invoices" /></>} />
      <Tabs<T> value={tab} onChange={setTab} tabs={[
        { id: 'seller', label: 'Seller invoices', count: seller.length }, { id: 'commission', label: 'Commission invoices', count: commission.length }, { id: 'rent', label: 'Rent invoices', count: rent.length },
      ]} />

      {tab === 'seller' && (
        <>
          <Banner tone="info">One GST invoice per vendor sub-order, generated automatically after verified delivery. CGST + SGST within a state, IGST across states.</Banner>
          <Card pad={false}>
            <table className="tbl">
              <thead><tr><th>Invoice</th><th>Seller</th><th>Buyer</th><th>Sub-order</th><th>Date</th><th className="right">Taxable</th><th className="right">GST</th><th className="right">Total</th><th></th></tr></thead>
              <tbody>{seller.map(({ s, o, intra, taxable }) => (
                <tr key={s.id}>
                  <td className="mono small bold">{s.invoiceNo}</td><td className="small">{vendorById(s.vendorId)?.name}</td><td className="small">{customerById(o.customerId)?.company}</td>
                  <td className="mono xs">{s.id}</td><td className="small nowrap">{s.delivery ? fmtDate(s.delivery.at) : '—'}</td>
                  <td className="num">{inr(taxable)}</td><td className="num">{inr(s.gst)}<div className="xs muted">{intra ? 'CGST+SGST' : 'IGST'}</div></td><td className="num">{inr(s.total)}</td>
                  <td className="right"><button className="btn btn-ghost btn-xs" onClick={() => dl(s.invoiceNo!)}><Download size={12} /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </Card>
        </>
      )}

      {tab === 'commission' && (
        <>
          <Banner tone="info">Monthly invoice to each vendor for TrimNova's category commission on sub-orders delivered in November 2026, plus 18% GST.</Banner>
          <Card pad={false}>
            <table className="tbl">
              <thead><tr><th>Invoice</th><th>Vendor</th><th className="right">Sub-orders</th><th className="right">Commission</th><th className="right">GST 18%</th><th className="right">Total</th><th>Status</th><th></th></tr></thead>
              <tbody>{commission.map((c) => (
                <tr key={c.no}>
                  <td className="mono small bold">{c.no}</td><td className="small">{c.v.name}</td><td className="num">{c.sos.length}</td>
                  <td className="num">{inr(c.amt)}</td><td className="num">{inr(c.gst)}</td><td className="num">{inr(c.amt + c.gst)}</td>
                  <td><Pill tone={issued.has(c.no) ? 'green' : 'grey'}>{issued.has(c.no) ? 'Issued' : 'Draft'}</Pill></td>
                  <td className="right nowrap">{!issued.has(c.no) && <button className="btn btn-primary btn-xs" onClick={() => issue(c.no, 'Commission')}>Issue</button>} <button className="btn btn-ghost btn-xs" onClick={() => dl(c.no)}><Download size={12} /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </Card>
        </>
      )}

      {tab === 'rent' && (
        <>
          <Banner tone="warning" lead="Rate TBD with client.">Mock rate {inr(RENT_PER_CBM, { decimals: 0 })} per cbm per month, based on space used at each TrimInsta hub.</Banner>
          <Card pad={false}>
            <table className="tbl">
              <thead><tr><th>Invoice</th><th>Vendor</th><th>Hub</th><th className="right">Space used</th><th className="right">Rent</th><th className="right">GST 18%</th><th className="right">Total</th><th>Status</th><th></th></tr></thead>
              <tbody>{rent.map((r) => (
                <tr key={r.no}>
                  <td className="mono small bold">{r.no}</td><td className="small">{vendorById(r.vendorId)?.name}</td><td className="small">{TRIMINSTA_HUBS.find((h) => h.id === r.hubId)?.name}</td>
                  <td className="num">{num(r.cbm)} cbm</td><td className="num">{inr(r.amt)}</td><td className="num">{inr(r.gst)}</td><td className="num">{inr(r.amt + r.gst)}</td>
                  <td><Pill tone={issued.has(r.no) ? 'green' : 'grey'}>{issued.has(r.no) ? 'Issued' : 'Draft'}</Pill></td>
                  <td className="right nowrap">{!issued.has(r.no) && <button className="btn btn-primary btn-xs" onClick={() => issue(r.no, 'Rent')}>Issue</button>} <button className="btn btn-ghost btn-xs" onClick={() => dl(r.no)}><Download size={12} /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
