import { useState } from 'react';
import { ArrowLeft, BadgeCheck, Building, CheckCircle2, Loader2, Send, Warehouse, XCircle, Zap } from 'lucide-react';
import { Banner, Card, Dropzone, FileChip, Modal, Pill } from '../../../components/ui';
import { BANKS, DEMO_KYC, IFSC_RE, TRIMINSTA_HUBS } from '../../../data/india';
import { allRequiredApproved, latest, useOnboarding } from '../../../lib/onboarding';
import { useVendorState } from '../../../lib/vendorState';
import { useToast } from '../../../lib/toast';
import { useAudit } from '../../../lib/audit';
import { Switch } from './shared';

export default function Module3({ onBack }: { onBack: () => void }) {
  const { data, patch, upsertDoc } = useOnboarding();
  const { setStatus } = useVendorState();
  const toast = useToast();
  const { log } = useAudit();
  const locked = !!data.submittedAt;

  const [holder, setHolder] = useState(data.bank?.holder ?? '');
  const [acct, setAcct] = useState(data.bank?.account ?? '');
  const [acct2, setAcct2] = useState(data.bank?.account ?? '');
  const [ifsc, setIfsc] = useState(data.bank?.ifsc ?? '');
  const [busy, setBusy] = useState(false);
  const [bankErr, setBankErr] = useState('');
  const [confirm, setConfirm] = useState(false);

  const bankName = IFSC_RE.test(ifsc) ? BANKS[ifsc.slice(0, 4)] : undefined;
  const acctOk = /^\d{9,18}$/.test(acct);
  const match = acct === acct2;
  const cheque = data.docs.find((d) => d.id === 'DOC-BANK');
  const verified = !!data.bank?.verified;
  const instaOk = !data.insta.optIn || data.insta.hubs.length > 0;
  const canSubmit = verified && !!cheque && instaOk;

  const verifyBank = () => {
    if (!holder.trim() || !acctOk || !match || !IFSC_RE.test(ifsc)) { setBankErr('Check the account holder, account number (9–18 digits, both entries match) and IFSC.'); return; }
    if (!bankName) { setBankErr('IFSC not recognised. Check the code on your cheque book.'); return; }
    setBankErr(''); setBusy(true);
    setTimeout(() => {
      setBusy(false);
      patch({ bank: { holder: holder.trim(), account: acct, ifsc, bankName, branch: 'Andheri East, Mumbai', verified: true } });
      toast('success', 'Bank account verified', '₹1.00 penny-drop succeeded; beneficiary name matches.');
    }, 1300);
  };

  const toggleHub = (id: string) =>
    patch({ insta: { ...data.insta, hubs: data.insta.hubs.includes(id) ? data.insta.hubs.filter((h) => h !== id) : [...data.insta.hubs, id] } });

  const submit = () => {
    patch({ submittedAt: new Date().toISOString() });
    setStatus('under_review');
    log({ action: 'Onboarding submitted for review', entity: `Vendor ${data.gst?.legalName ?? ''}`, oldValue: 'Onboarding', newValue: 'Under review' });
    toast('success', 'Submitted for review', 'The TrimNova Approver will review each document.');
  };

  return (
    <div className="stack-16">
      <Card title="TrimInsta 6-Hour Express" icon={Zap} sub="Store stock at TrimNova hubs so buyers within ~6 km of a hub get delivery in 6 hours."
        actions={<Switch id="insta" checked={data.insta.optIn} onChange={(v) => !locked && patch({ insta: { optIn: v, hubs: v ? data.insta.hubs : [] } })} label={data.insta.optIn ? 'Opted in' : 'Not opted in'} />}>
        {data.insta.optIn ? (
          <div className="stack-12">
            <div className="label">Choose hubs to stock</div>
            <div className="grid g-2" style={{ gap: 10 }}>
              {TRIMINSTA_HUBS.map((h) => {
                const on = data.insta.hubs.includes(h.id);
                return (
                  <label key={h.id} className="check" style={{ padding: 12, border: `1px solid ${on ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius)', background: on ? 'var(--primary-50)' : '#fff' }}>
                    <input type="checkbox" checked={on} disabled={locked} onChange={() => toggleHub(h.id)} />
                    <span className="grow"><Warehouse size={13} style={{ verticalAlign: -2 }} /> <b>{h.name}</b><div className="xs muted mono">{h.id}</div></span>
                  </label>
                );
              })}
            </div>
            {!instaOk && <span className="err small">Select at least one hub, or turn TrimInsta off.</span>}
            <Banner tone="info" lead="How it works:">you send stock to the hub; warehouse staff count it on arrival and record any discrepancy. Hub rent is charged by space used (rate TBD). Express is offered only when the buyer is inside the hub's service zone and the hub has stock.</Banner>
          </div>
        ) : (
          <p className="small muted">Optional. You can opt in later from Capabilities. Standard Delivery (direct from your factory, courier assigned by the system) is always available.</p>
        )}
      </Card>

      <Card title="Bank Beneficiary Details" icon={Building} sub="Payouts are sent by NEFT/RTGS to this account. It must be a current account in the GST legal name."
        actions={verified ? <Pill tone="green" icon={BadgeCheck}>Verified</Pill> : <Pill tone="grey">Not verified</Pill>}>
        {verified ? (
          <div className="row-between wrap" style={{ alignItems: 'flex-start' }}>
            <dl className="kv" style={{ flex: 1 }}>
              <dt>Account holder</dt><dd>{data.bank!.holder}</dd>
              <dt>Account number</dt><dd className="mono">••••••{data.bank!.account.slice(-4)}</dd>
              <dt>IFSC</dt><dd className="mono">{data.bank!.ifsc}</dd>
              <dt>Bank</dt><dd>{data.bank!.bankName} · {data.bank!.branch}</dd>
              <dt>Verification</dt><dd><Pill tone="green" icon={CheckCircle2}>Penny-drop success · name match</Pill></dd>
            </dl>
            {!locked && <button className="btn btn-secondary btn-sm" onClick={() => patch({ bank: undefined })}>Change account</button>}
          </div>
        ) : (
          <div className="stack-12">
            <div className="grid g-2" style={{ gap: 12 }}>
              <div className="field">
                <label htmlFor="bh">Account holder name</label>
                <input id="bh" className="input" value={holder} onChange={(e) => setHolder(e.target.value.toUpperCase())} placeholder={data.gst?.legalName ?? 'As per bank records'} />
              </div>
              <div className="field">
                <label htmlFor="ifsc">IFSC</label>
                <input id="ifsc" className={`input mono ${ifsc.length === 11 && !bankName ? 'invalid' : ''}`} maxLength={11} value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''))} placeholder="HDFC0001234" />
                {bankName ? <span className="hint" style={{ color: 'var(--success)' }}><CheckCircle2 size={11} style={{ verticalAlign: -1 }} /> {bankName}</span>
                  : ifsc.length === 11 ? <span className="err"><XCircle size={11} style={{ verticalAlign: -1 }} /> IFSC not recognised</span> : <span className="hint">11 characters, e.g. {DEMO_KYC.ifsc}</span>}
              </div>
              <div className="field">
                <label htmlFor="an">Account number</label>
                <input id="an" className="input mono" inputMode="numeric" type="password" value={acct} onChange={(e) => setAcct(e.target.value.replace(/\D/g, ''))} />
              </div>
              <div className="field">
                <label htmlFor="an2">Confirm account number</label>
                <input id="an2" className={`input mono ${acct2 && !match ? 'invalid' : ''}`} inputMode="numeric" value={acct2} onChange={(e) => setAcct2(e.target.value.replace(/\D/g, ''))} onPaste={(e) => e.preventDefault()} />
                {acct2 && !match && <span className="err">Account numbers don't match</span>}
              </div>
            </div>
            {bankErr && <Banner tone="danger">{bankErr}</Banner>}
            <div className="row-between wrap">
              <button className="btn btn-ghost btn-xs" onClick={() => { setHolder(data.gst?.legalName ?? DEMO_KYC.legalName); setIfsc(DEMO_KYC.ifsc); setAcct(DEMO_KYC.account); setAcct2(DEMO_KYC.account); }}>Fill demo bank details</button>
              <button className="btn btn-primary" onClick={verifyBank} disabled={busy}>{busy ? <><Loader2 size={14} className="spin" /> Verifying…</> : 'Verify account (₹1 penny-drop)'}</button>
            </div>
          </div>
        )}
        <div className="divider-h" />
        <div className="stack-12">
          <div className="label">Cancelled cheque or bank letter <span style={{ color: 'var(--danger)' }}>*</span></div>
          {cheque ? <FileChip file={{ name: latest(cheque).fileName, size: 182000 }} />
            : <Dropzone multiple={false} label="Upload a cancelled cheque" onFiles={(f) => upsertDoc({
              id: 'DOC-BANK', kind: 'BANK', title: 'Cancelled Cheque', number: acct ? `${bankName ?? 'Bank'} ••${acct.slice(-4)}` : undefined, required: true,
              versions: [{ v: 1, fileName: f[0].name, uploadedAt: new Date().toISOString(), status: 'Pending' }],
            })} />}
        </div>
      </Card>

      <div className="row-between">
        <button className="btn btn-secondary" onClick={onBack}><ArrowLeft size={15} /> Back to Module 02</button>
        <div className="row" style={{ gap: 12 }}>
          {!canSubmit && <span className="xs muted">Verify your bank account and upload a cancelled cheque.</span>}
          <button className="btn btn-primary btn-lg" disabled={!canSubmit || locked} onClick={() => setConfirm(true)}><Send size={15} /> Submit for Review</button>
        </div>
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Submit onboarding for review?" icon={Send}
        footer={<><button className="btn btn-secondary" onClick={() => setConfirm(false)}>Keep editing</button><button className="btn btn-primary" onClick={() => { setConfirm(false); submit(); }}>Submit</button></>}>
        <div className="stack-12 small">
          <p>The TrimNova Approver will review each document. Admin activates your account once <b>every required document is Approved</b>.</p>
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            <li>GSTIN <span className="mono">{data.gst?.gstin}</span> and PAN <span className="mono">{data.pan?.pan}</span></li>
            <li>{data.docs.filter((d) => d.kind === 'CERT').length} compliance certificate(s)</li>
            <li>Plan: {data.plan ? data.plan[0].toUpperCase() + data.plan.slice(1) : '—'} (TBD)</li>
            <li>TrimInsta: {data.insta.optIn ? `${data.insta.hubs.length} hub(s)` : 'Not opted in'}</li>
            <li>Bank: {data.bank?.bankName} ••{data.bank?.account.slice(-4)}</li>
          </ul>
          {allRequiredApproved(data.docs) && <Banner tone="success">All documents are already approved.</Banner>}
        </div>
      </Modal>
    </div>
  );
}
