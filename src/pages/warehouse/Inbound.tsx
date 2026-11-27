import { useState } from 'react';
import { CheckCircle2, PackageCheck, Truck, XCircle } from 'lucide-react';
import { Banner, Card, ConfirmWithReason, EmptyState, Modal, PageHeader, Pill, Tabs } from '../../components/ui';
import { vendorById } from '../../data/vendors';
import { TRIMINSTA_HUBS } from '../../data/india';
import { fmtDateTime, num } from '../../lib/format';
import { useWarehouse } from '../../lib/warehouse';
import type { Inbound as InboundT, InboundStatus } from '../../lib/warehouse';
import { useCatalog } from '../../lib/catalog';
import { useAuth } from '../../lib/auth';
import { useAudit } from '../../lib/audit';
import { useToast } from '../../lib/toast';

type T = 'pending' | 'scheduled' | 'received' | 'rejected';
const TAB_OF: Record<InboundStatus, T> = { 'Pending approval': 'pending', Approved: 'scheduled', 'In transit': 'scheduled', Received: 'received', Rejected: 'rejected' };
export const hubName = (id: string) => TRIMINSTA_HUBS.find((h) => h.id === id)?.name ?? id;
export const hubLoc = (id: string) => `${id} · ${hubName(id).split('·').pop()!.trim()}`;

export default function Inbound() {
  const wh = useWarehouse();
  const { products, updateStock } = useCatalog();
  const { user } = useAuth();
  const { log } = useAudit();
  const toast = useToast();
  const [tab, setTab] = useState<T>('pending');
  const [approve, setApprove] = useState<InboundT | null>(null);
  const [reject, setReject] = useState<InboundT | null>(null);
  const [receive, setReceive] = useState<InboundT | null>(null);
  const me = `${user?.name} (${user?.id})`;
  const list = wh.inbound.filter((i) => TAB_OF[i.status] === tab);
  const count = (t: T) => wh.inbound.filter((i) => TAB_OF[i.status] === t).length;

  return (
    <div className="container wide stack-16" style={{ maxWidth: 1200 }}>
      <PageHeader icon={Truck} title="Inbound & Receiving" subtitle="Approve vendor stock transfers into TrimInsta hubs, then count on arrival and record any discrepancy" actions={<Pill tone="amber" strong>WAREHOUSE OPS</Pill>} />
      <Banner tone="info">Hub stock goes live for TrimInsta only after it's counted here. Damaged units don't become sellable stock. Vendors can't edit hub quantities themselves.</Banner>
      <Tabs<T> value={tab} onChange={setTab} tabs={[
        { id: 'pending', label: 'Pending approval', count: count('pending') }, { id: 'scheduled', label: 'Scheduled / in transit', count: count('scheduled') },
        { id: 'received', label: 'Received', count: count('received') }, { id: 'rejected', label: 'Rejected', count: count('rejected') },
      ]} />
      {list.length === 0 && <div className="card"><EmptyState title="Nothing here" /></div>}
      {list.map((i) => (
        <Card key={i.id} title={<span className="row"><span className="mono">{i.id}</span> · {vendorById(i.vendorId)?.name}</span>}
          sub={<>To {hubName(i.hubId)} · requested {fmtDateTime(i.createdAt)}{i.slot && <> · slot {fmtDateTime(i.slot)}</>}{i.vehicle && <> · vehicle <span className="mono">{i.vehicle}</span></>}</>}
          actions={<Pill tone={i.status === 'Received' ? 'green' : i.status === 'Rejected' ? 'red' : i.status === 'Pending approval' ? 'amber' : 'blue'}>{i.status}</Pill>}>
          <table className="tbl">
            <thead><tr><th>SKU</th><th>Product</th><th className="right">Expected</th>{i.status === 'Received' && <><th className="right">Counted</th><th className="right">Damaged</th><th className="right">Discrepancy</th></>}</tr></thead>
            <tbody>{i.lines.map((l) => {
              const d = (l.counted ?? 0) - l.expected;
              return (
                <tr key={l.productId}>
                  <td className="mono small">{l.sku}</td><td className="small">{l.title}</td><td className="num">{num(l.expected)} {l.unit}</td>
                  {i.status === 'Received' && <><td className="num">{num(l.counted ?? 0)}</td><td className="num">{num(l.damaged ?? 0)}</td>
                    <td className="num">{d === 0 ? <Pill tone="green">OK</Pill> : <Pill tone="red">{d > 0 ? '+' : ''}{num(d)}</Pill>}{l.note && <div className="xs muted">{l.note}</div>}</td></>}
                </tr>
              );
            })}</tbody>
          </table>
          {i.reason && <div className="xs muted" style={{ marginTop: 6 }}>Reason: {i.reason}</div>}
          {i.receivedAt && <div className="xs muted" style={{ marginTop: 6 }}>Received {fmtDateTime(i.receivedAt)} by {i.receivedBy}</div>}
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
            {i.status === 'Pending approval' && <><button className="btn btn-outline-danger btn-sm" onClick={() => setReject(i)}><XCircle size={13} /> Reject</button><button className="btn btn-success btn-sm" onClick={() => setApprove(i)}><CheckCircle2 size={13} /> Approve & book slot</button></>}
            {i.status === 'Approved' && <button className="btn btn-secondary btn-sm" onClick={() => { wh.patchInbound(i.id, { status: 'In transit' }); toast('info', 'Marked in transit'); }}>Demo: vendor dispatched</button>}
            {i.status === 'In transit' && <button className="btn btn-primary btn-sm" onClick={() => setReceive(i)}><PackageCheck size={13} /> Receive & count</button>}
          </div>
        </Card>
      ))}

      {approve && <ApproveModal i={approve} onClose={() => setApprove(null)} onSave={(slot, vehicle) => { wh.patchInbound(approve.id, { status: 'Approved', slot, vehicle }); log({ action: 'Inbound approved', entity: approve.id, newValue: `Slot ${slot}` }); toast('success', 'Inbound approved', `Slot booked at ${hubName(approve.hubId)}`); }} />}
      <ConfirmWithReason open={!!reject} onClose={() => setReject(null)} danger title={`Reject ${reject?.id ?? ''}?`} confirmLabel="Reject inbound"
        description="The vendor is told the reason. No stock moves."
        onConfirm={(r) => { if (!reject) return; wh.patchInbound(reject.id, { status: 'Rejected', reason: r }); log({ action: 'Inbound rejected', entity: reject.id, reason: r }); toast('warning', 'Inbound rejected'); }} />
      {receive && <ReceiveModal i={receive} onClose={() => setReceive(null)} onSave={(lines, bins) => {
        wh.patchInbound(receive.id, { status: 'Received', lines, receivedAt: new Date().toISOString(), receivedBy: me });
        lines.forEach((l) => {
          const p = products.find((x) => x.id === l.productId);
          if (!p) return;
          const good = Math.max(0, (l.counted ?? 0) - (l.damaged ?? 0));
          const loc = hubLoc(receive.hubId);
          const has = p.stock.some((s) => s.loc.startsWith(receive.hubId));
          const stock = has ? p.stock.map((s) => (s.loc.startsWith(receive.hubId) ? { ...s, qty: s.qty + good } : s)) : [...p.stock, { loc, qty: good }];
          updateStock(p.id, stock, `${me} · inbound ${receive.id}`);
          if (bins[l.productId]) wh.setBin(`${receive.hubId}:${l.productId}`, bins[l.productId]);
        });
        log({ action: 'Inbound received', entity: receive.id, newValue: lines.map((l) => `${l.sku}: ${l.counted}/${l.expected} (${l.damaged ?? 0} damaged)`).join('; ') });
        toast('success', 'Stock received', 'Hub stock updated and available for TrimInsta.');
        setTab('received');
      }} />}
    </div>
  );
}

function ApproveModal({ i, onClose, onSave }: { i: InboundT; onClose: () => void; onSave: (slot: string, vehicle: string) => void }) {
  const [slot, setSlot] = useState('');
  const [vehicle, setVehicle] = useState('');
  return (
    <Modal open onClose={onClose} title={`Approve ${i.id}`} icon={CheckCircle2}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-success" disabled={!slot} onClick={() => { onSave(slot, vehicle); onClose(); }}>Approve & notify vendor</button></>}>
      <div className="stack-12">
        <div className="field"><label htmlFor="sl">Receiving slot at {hubName(i.hubId)}</label><input id="sl" type="datetime-local" className="input" value={slot} onChange={(e) => setSlot(e.target.value)} /></div>
        <div className="field"><label htmlFor="vh">Vehicle number (optional)</label><input id="vh" className="input mono" value={vehicle} onChange={(e) => setVehicle(e.target.value.toUpperCase())} /></div>
      </div>
    </Modal>
  );
}

function ReceiveModal({ i, onClose, onSave }: { i: InboundT; onClose: () => void; onSave: (lines: InboundT['lines'], bins: Record<string, string>) => void }) {
  const wh = useWarehouse();
  const [lines, setLines] = useState(i.lines.map((l) => ({ ...l, counted: l.expected, damaged: 0, note: '' })));
  const [bins, setBins] = useState<Record<string, string>>(Object.fromEntries(i.lines.map((l) => [l.productId, wh.bins[`${i.hubId}:${l.productId}`] ?? ''])));
  const set = (idx: number, p: Partial<(typeof lines)[number]>) => setLines((x) => x.map((l, j) => (j === idx ? { ...l, ...p } : l)));
  const ok = lines.every((l) => l.counted >= 0 && l.damaged >= 0 && l.damaged <= l.counted && (l.counted === l.expected && l.damaged === 0 || l.note.trim().length >= 5)) && Object.values(bins).every((b) => /^[A-Z]{3}-[A-Z]-\d{2}-\d$/.test(b));
  return (
    <Modal open onClose={onClose} title={`Receive ${i.id}`} icon={PackageCheck} size="lg"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!ok} onClick={() => { onSave(lines, bins); onClose(); }}>Confirm receipt</button></>}>
      <div className="stack-12">
        <Banner tone="info">Count every carton. If the count differs from expected, or any units are damaged, add a note. The vendor sees it.</Banner>
        <table className="tbl">
          <thead><tr><th>SKU</th><th className="right">Expected</th><th>Counted</th><th>Damaged</th><th>Bin</th><th>Discrepancy note</th></tr></thead>
          <tbody>{lines.map((l, idx) => {
            const d = l.counted - l.expected;
            return (
              <tr key={l.productId}>
                <td className="mono small">{l.sku}<div className="xs muted" style={{ maxWidth: 160 }}>{l.title}</div></td>
                <td className="num">{num(l.expected)}</td>
                <td style={{ width: 110 }}><input type="number" min={0} className="input mono" style={{ height: 32 }} value={l.counted} onChange={(e) => set(idx, { counted: Math.max(0, +e.target.value) })} />{d !== 0 && <div className="xs" style={{ color: 'var(--danger)' }}>{d > 0 ? '+' : ''}{num(d)}</div>}</td>
                <td style={{ width: 100 }}><input type="number" min={0} className="input mono" style={{ height: 32 }} value={l.damaged} onChange={(e) => set(idx, { damaged: Math.max(0, +e.target.value) })} /></td>
                <td style={{ width: 130 }}><input className="input mono" style={{ height: 32 }} placeholder="TUP-B-02-3" value={bins[l.productId]} onChange={(e) => setBins((b) => ({ ...b, [l.productId]: e.target.value.toUpperCase() }))} /></td>
                <td><input className="input" style={{ height: 32 }} value={l.note} onChange={(e) => set(idx, { note: e.target.value })} placeholder={d !== 0 || l.damaged ? 'Required' : 'Optional'} /></td>
              </tr>
            );
          })}</tbody>
        </table>
        <div className="xs muted">Bin format: HUB-ZONE-RACK-LEVEL, e.g. TUP-B-02-3.</div>
      </div>
    </Modal>
  );
}
