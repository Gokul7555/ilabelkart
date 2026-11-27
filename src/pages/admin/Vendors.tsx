import { useState } from 'react';
import { BadgeCheck, Building2, Eye, Lock, ShieldOff, Snowflake, Star, Sun } from 'lucide-react';
import { Banner, Card, ConfirmWithReason, Drawer, EmptyState, ExportButtons, PageHeader, Pill, StatusPill, Tabs } from '../../components/ui';
import { NOVATEX_ID, VENDORS } from '../../data/vendors';
import type { Vendor } from '../../data/vendors';
import { fmtDate, fmtDateTime, maskGstin } from '../../lib/format';
import { allRequiredApproved, displayStatus, latest, useOnboarding } from '../../lib/onboarding';
import type { VendorDoc } from '../../lib/onboarding';
import { useCatalog } from '../../lib/catalog';
import { useListings } from '../../lib/marketplace';
import { useOrders } from '../../lib/orders';
import { useVendorState } from '../../lib/vendorState';
import { useAdmin } from '../../lib/admin';
import { useSupport } from '../../lib/support';
import { useAuth } from '../../lib/auth';
import { useAudit } from '../../lib/audit';
import { useToast } from '../../lib/toast';
import { AuditTrailButton } from '../../components/AuditTrail';

type T = 'all' | 'pending' | 'frozen';

export default function Vendors() {
  const { user } = useAuth();
  const { otherDocs } = useCatalog();
  const { data: onb, patch: patchOnb } = useOnboarding();
  const { status: novaStatus, setStatus: setNova } = useVendorState();
  const listings = useListings();
  const { subOrders } = useOrders();
  const admin = useAdmin();
  const { flags, patchFlag } = useSupport();
  const { log } = useAudit();
  const toast = useToast();
  const [tab, setTab] = useState<T>('all');
  const [view, setView] = useState<Vendor | null>(null);
  const [act, setAct] = useState<{ v: Vendor; to: 'Active' | 'Frozen'; flagId?: string } | null>(null);
  const me = `${user?.name} (${user?.id})`;

  const statusOf = (v: Vendor): 'Active' | 'Frozen' | 'Under review' =>
    v.id === NOVATEX_ID ? (novaStatus === 'active' ? 'Active' : novaStatus === 'frozen' ? 'Frozen' : 'Under review') : admin.vendorStatus[v.id] ?? 'Active';
  const docsOf = (v: Vendor): VendorDoc[] => (v.id === NOVATEX_ID ? onb.docs : otherDocs[v.id] ?? []);
  const recs = flags.filter((f) => f.kind === 'Vendor' && f.status === 'Freeze recommended to Admin');

  const pending = [
    ...(novaStatus === 'under_review' ? [{ id: NOVATEX_ID, name: onb.gst?.tradeName ?? 'NovaTex Manufacturing', city: 'Mumbai', state: onb.gst?.state ?? 'Maharashtra', gstin: onb.gst?.gstin ?? '', submittedAt: onb.submittedAt ?? '', docs: onb.docs }] : []),
    ...admin.applicants,
  ];
  const rows = VENDORS.filter((v) => (tab === 'frozen' ? statusOf(v) === 'Frozen' : true));

  return (
    <div className="container wide stack-16" style={{ maxWidth: 1320 }}>
      <PageHeader icon={Building2} title="Vendors" subtitle="Activate new vendors, and freeze or reactivate existing ones. Every action needs a reason." actions={<ExportButtons name="vendors" />} />
      {recs.map((f) => {
        const v = VENDORS.find((x) => x.id === f.subjectId);
        return v && statusOf(v) !== 'Frozen' ? (
          <Banner key={f.id} tone="danger" icon={ShieldOff} lead={`Support recommends freezing ${f.subjectName}.`}
            actions={<><button className="btn btn-secondary btn-sm" onClick={() => { patchFlag(f.id, { status: 'Reviewed – no action', note: `${f.note} · Admin declined (${me})` }); log({ action: 'Freeze recommendation declined', entity: f.subjectName }); toast('info', 'Recommendation declined'); }}>Decline</button><button className="btn btn-danger btn-sm" onClick={() => setAct({ v, to: 'Frozen', flagId: f.id })}>Freeze vendor</button></>}>
            {f.metric}. Support note: “{f.note}”
          </Banner>
        ) : null;
      })}

      <Tabs<T> value={tab} onChange={setTab} tabs={[
        { id: 'all', label: 'All vendors', count: VENDORS.length },
        { id: 'pending', label: 'Pending activation', count: pending.length },
        { id: 'frozen', label: 'Frozen', count: VENDORS.filter((v) => statusOf(v) === 'Frozen').length },
      ]} />

      {tab === 'pending' ? (
        pending.length === 0 ? <div className="card"><EmptyState title="No vendors waiting for activation" /></div> : pending.map((a) => {
          const ready = allRequiredApproved(a.docs);
          return (
            <Card key={a.id} title={<span className="row">{a.name} <span className="mono xs muted">{a.id}</span></span>} sub={`${a.city}, ${a.state} · GSTIN ${a.gstin ? maskGstin(a.gstin) : '—'} · submitted ${a.submittedAt ? fmtDateTime(a.submittedAt) : '—'}`}
              actions={<button className="btn btn-success btn-sm" disabled={!ready} title={ready ? '' : 'Enabled only when every required document is Approved'} onClick={() => {
                if (a.id === NOVATEX_ID) { setNova('active'); patchOnb({ activatedAt: new Date().toISOString() }); } else admin.activateApplicant(a.id, me);
                log({ action: 'Vendor activated', entity: `${a.name} (${a.id})`, oldValue: 'Under review', newValue: 'Active', reason: 'All required documents approved' });
                toast('success', 'Vendor activated', a.name);
              }}><BadgeCheck size={14} /> Activate vendor</button>}>
              <div className="stack-12">
                {!ready && <Banner tone="warning" icon={Lock} lead="Activation locked.">Every required document must be Approved by the Approver first.</Banner>}
                <table className="tbl"><tbody>{a.docs.map((d) => (
                  <tr key={d.id}><td className="small">{d.title} {d.required && <Pill tone="grey">Required</Pill>}</td><td className="mono xs">{d.number}</td><td><StatusPill status={latest(d).status} /></td><td className="xs muted">{latest(d).reason}</td></tr>
                ))}</tbody></table>
              </div>
            </Card>
          );
        })
      ) : (
        <Card pad={false}>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Vendor</th><th>Plan</th><th>Status</th><th>Documents</th><th className="right">Sellable listings</th><th className="right">Rejections</th><th>Flags</th><th></th></tr></thead>
              <tbody>{rows.map((v) => {
                const st = statusOf(v);
                const docs = docsOf(v);
                const approved = docs.filter((d) => displayStatus(d) === 'Approved').length;
                const ls = listings.filter((l) => l.vendor.id === v.id);
                const flag = flags.find((f) => f.subjectId === v.id && f.status !== 'Reviewed – no action');
                return (
                  <tr key={v.id}>
                    <td><div className="t-name">{v.name} {v.elite && <Pill tone="dark" strong>ELITE</Pill>}</div><div className="t-sub"><span className="mono">{v.id}</span> · {v.city} · <Star size={10} style={{ verticalAlign: -1 }} /> {v.rating}</div></td>
                    <td className="small">{v.plan} <span className="xs muted">(TBD)</span></td>
                    <td><StatusPill status={st === 'Under review' ? 'Pending' : st} /></td>
                    <td className="small">{approved}/{docs.length} approved{docs.some((d) => displayStatus(d) === 'Expired') && <div><Pill tone="red">Expired cert</Pill></div>}</td>
                    <td className="num">{ls.filter((l) => !l.salesBlocked).length}/{ls.length}</td>
                    <td className="num">{subOrders.filter((s) => s.vendorId === v.id && s.rejection).length}</td>
                    <td>{flag ? <Pill tone="red">{flag.status === 'Open' ? 'Flag under Support review' : 'Freeze recommended'}</Pill> : <span className="xs muted">—</span>}</td>
                    <td className="right nowrap">
                      <button className="btn btn-ghost btn-xs" onClick={() => setView(v)}><Eye size={12} /> View</button>{' '}
                      {st === 'Frozen' ? <button className="btn btn-secondary btn-xs" onClick={() => setAct({ v, to: 'Active' })}><Sun size={12} /> Reactivate</button>
                        : st === 'Active' ? <button className="btn btn-outline-danger btn-xs" onClick={() => setAct({ v, to: 'Frozen' })}><Snowflake size={12} /> Freeze</button> : null}
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmWithReason open={!!act} onClose={() => setAct(null)} danger={act?.to === 'Frozen'}
        title={act?.to === 'Frozen' ? `Freeze ${act.v.name}?` : `Reactivate ${act?.v.name ?? ''}?`} confirmLabel={act?.to === 'Frozen' ? 'Freeze vendor' : 'Reactivate'}
        description={act?.to === 'Frozen' ? 'All listings are hidden immediately and new orders blocked. Open orders continue, and payouts stay subject to the 6 conditions. The vendor is told the reason.' : 'Listings with valid compliance become visible again.'}
        onConfirm={(r) => {
          if (!act) return;
          admin.setVendorStatus(act.v.id, act.to, r, me);
          if (act.v.id === NOVATEX_ID) setNova(act.to === 'Frozen' ? 'frozen' : 'active');
          if (act.flagId) patchFlag(act.flagId, { note: `Frozen by Admin: ${r}` });
          log({ action: act.to === 'Frozen' ? 'Vendor frozen' : 'Vendor reactivated', entity: `${act.v.name} (${act.v.id})`, oldValue: act.to === 'Frozen' ? 'Active' : 'Frozen', newValue: act.to, reason: r });
          toast(act.to === 'Frozen' ? 'warning' : 'success', act.to === 'Frozen' ? 'Vendor frozen' : 'Vendor reactivated', act.v.name);
        }} />

      <Drawer open={!!view} onClose={() => setView(null)} title={view?.name ?? ''}>
        {view && (
          <div className="stack-16">
            <dl className="kv" style={{ gridTemplateColumns: '100px 1fr' }}>
              <dt>Vendor ID</dt><dd className="mono">{view.id}</dd>
              <dt>GSTIN</dt><dd className="mono">{view.gstin}</dd>
              <dt>Location</dt><dd>{view.city}, {view.state}</dd>
              <dt>Since</dt><dd>{fmtDate(view.since)}</dd>
              <dt>Status</dt><dd><StatusPill status={statusOf(view) === 'Under review' ? 'Pending' : statusOf(view)} /></dd>
            </dl>
            <div className="caps muted">Documents</div>
            {docsOf(view).map((d) => <div key={d.id} className="row small"><span className="grow">{d.title}</span><StatusPill status={displayStatus(d)} /></div>)}
            <AuditTrailButton match={[view.name, view.id]} />
            <div className="caps muted">Status history</div>
            {(admin.vendorEvents[view.id] ?? []).length === 0 ? <div className="xs muted">No changes.</div> : (admin.vendorEvents[view.id] ?? []).slice().reverse().map((e, i) => (
              <div key={i} className="xs"><b>{e.action}</b> · {fmtDateTime(e.at)} · {e.by}<div className="muted">“{e.reason}”</div></div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
}
