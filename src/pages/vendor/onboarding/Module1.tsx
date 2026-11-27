import { useState } from 'react';
import { ArrowRight, BadgeCheck, CheckCircle2, CreditCard, FileBadge, IdCard, Landmark, Loader2, Trash2 } from 'lucide-react';
import { Banner, Card, Dropzone, FileChip, Modal, Pill } from '../../../components/ui';
import type { UploadedFile } from '../../../components/ui';
import { CERT_TYPES, DEMO_KYC, GSTIN_RE, GST_STATES, PAN_RE } from '../../../data/india';
import { fmtDate, inr } from '../../../lib/format';
import { latest, useOnboarding } from '../../../lib/onboarding';
import { usePlatformConfig } from '../../../lib/platformConfig';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../lib/toast';
import { DocStatusPill, ExpiryChip, certDateError } from './shared';

export default function Module1({ onNext }: { onNext: () => void }) {
  const { data, patch, upsertDoc, removeDoc } = useOnboarding();
  const { cfg } = usePlatformConfig();
  const { user } = useAuth();
  const toast = useToast();

  const [gstin, setGstin] = useState(data.gst?.gstin ?? '');
  const [gstErr, setGstErr] = useState('');
  const [gstBusy, setGstBusy] = useState(false);
  const [pan, setPan] = useState(data.pan?.pan ?? '');
  const [panErr, setPanErr] = useState('');
  const [panBusy, setPanBusy] = useState(false);

  const [certType, setCertType] = useState<string>('GOTS');
  const [certNo, setCertNo] = useState('');
  const [issue, setIssue] = useState('');
  const [expiry, setExpiry] = useState('');
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [certTouched, setCertTouched] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const certs = data.docs.filter((d) => d.kind === 'CERT');
  const gstOk = !!data.gst;
  const panOk = !!data.pan;
  const feeDue = cfg.registrationFeeOn && !data.feePaid;
  const canProceed = gstOk && panOk && certs.length > 0;
  const feeGst = Math.round(cfg.registrationFee * cfg.gstRate) / 100;

  const verifyGst = () => {
    const g = gstin.trim().toUpperCase();
    if (!GSTIN_RE.test(g)) { setGstErr('Enter a valid 15-character GSTIN (e.g. 27AABCN4567K1Z9).'); return; }
    setGstErr(''); setGstBusy(true);
    setTimeout(() => {
      setGstBusy(false);
      if (g === DEMO_KYC.cancelledGstin) { setGstErr('GST portal returned status "Cancelled". Only Active registrations can onboard.'); return; }
      const legal = g === DEMO_KYC.gstin ? DEMO_KYC.legalName : `${(user?.org ?? 'Vendor').toUpperCase()} PRIVATE LIMITED`;
      patch({ gst: { gstin: g, legalName: legal, tradeName: user?.org ?? legal, state: GST_STATES[g.slice(0, 2)] ?? 'Unknown state code', status: 'Active', regDate: '2017-07-01', type: 'Regular' } });
      upsertDoc({ id: 'DOC-GST', kind: 'GST', title: 'GST Registration Certificate', number: g, required: true, versions: [{ v: 1, fileName: 'GST portal record (auto-fetched)', uploadedAt: new Date().toISOString(), status: 'Pending' }] });
      toast('success', 'GSTIN verified', legal);
    }, 900);
  };

  const resetGst = () => {
    patch({ gst: undefined, pan: undefined });
    removeDoc('DOC-GST'); removeDoc('DOC-PAN');
    setPan('');
  };

  const verifyPan = () => {
    const p = pan.trim().toUpperCase();
    if (!PAN_RE.test(p)) { setPanErr('Enter a valid 10-character PAN (e.g. AABCN4567K).'); return; }
    if (data.gst && data.gst.gstin.slice(2, 12) !== p) { setPanErr(`PAN must match the PAN inside your GSTIN (${data.gst.gstin.slice(2, 12)}).`); return; }
    setPanErr(''); setPanBusy(true);
    setTimeout(() => {
      setPanBusy(false);
      patch({ pan: { pan: p, name: data.gst!.legalName } });
      upsertDoc({ id: 'DOC-PAN', kind: 'PAN', title: 'PAN (Company)', number: p, required: true, versions: [{ v: 1, fileName: 'NSDL PAN record (auto-fetched)', uploadedAt: new Date().toISOString(), status: 'Pending' }] });
      toast('success', 'PAN verified', 'Name matches GST legal name.');
    }, 800);
  };

  const dateErr = certDateError(issue, expiry);
  const addCert = () => {
    setCertTouched(true);
    if (!certNo.trim() || !file || dateErr) return;
    upsertDoc({
      id: `DOC-${Date.now()}`, kind: 'CERT', title: `${certType} Certificate`, certType, number: certNo.trim(), required: true,
      versions: [{ v: 1, fileName: file.name, uploadedAt: new Date().toISOString(), status: 'Pending', issueDate: issue, expiryDate: expiry }],
    });
    toast('success', `${certType} certificate added`, 'Status: Pending review');
    setCertNo(''); setIssue(''); setExpiry(''); setFile(null); setCertTouched(false);
  };

  const proceed = () => {
    if (feeDue) { setPayOpen(true); return; }
    patch({ module1Done: true });
    onNext();
  };

  return (
    <div className="stack-16">
      {/* a) GST */}
      <Card title="GST Verification" icon={Landmark} sub="We fetch your registration from the GST portal. Only Active GSTINs can onboard."
        actions={gstOk ? <Pill tone="green" icon={CheckCircle2}>Verified</Pill> : <Pill tone="grey">Step 1</Pill>}>
        {!gstOk ? (
          <div className="stack-12">
            <div className="field">
              <label htmlFor="gstin">GSTIN</label>
              <div className="input-group">
                <input id="gstin" className={`input mono ${gstErr ? 'invalid' : ''}`} maxLength={15} placeholder="27AABCN4567K1Z9" value={gstin}
                  onChange={(e) => { setGstin(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '')); setGstErr(''); }} />
                <button className="btn btn-primary" onClick={verifyGst} disabled={gstin.length !== 15 || gstBusy}>
                  {gstBusy ? <><Loader2 size={14} className="spin" /> Verifying…</> : 'Verify GST'}
                </button>
              </div>
              {gstErr ? <span className="err">{gstErr}</span> : <span className="hint"><span className="mono">{gstin.length}</span>/15 characters</span>}
            </div>
            <div className="xs muted">Demo: <button className="btn btn-ghost btn-xs mono" onClick={() => setGstin(DEMO_KYC.gstin)}>{DEMO_KYC.gstin}</button> verifies · <button className="btn btn-ghost btn-xs mono" onClick={() => setGstin(DEMO_KYC.cancelledGstin)}>{DEMO_KYC.cancelledGstin}</button> returns Cancelled</div>
          </div>
        ) : (
          <div className="row-between wrap" style={{ alignItems: 'flex-start' }}>
            <dl className="kv" style={{ flex: 1, minWidth: 280 }}>
              <dt>GSTIN</dt><dd className="mono">{data.gst!.gstin}</dd>
              <dt>Legal name</dt><dd>{data.gst!.legalName}</dd>
              <dt>State</dt><dd>{data.gst!.state} <span className="muted mono">({data.gst!.gstin.slice(0, 2)})</span></dd>
              <dt>Status</dt><dd><Pill tone="green">{data.gst!.status}</Pill> <span className="xs muted">· {data.gst!.type} taxpayer since {fmtDate(data.gst!.regDate)}</span></dd>
            </dl>
            {!data.submittedAt && <button className="btn btn-secondary btn-sm" onClick={resetGst}>Change GSTIN</button>}
          </div>
        )}
      </Card>

      {/* b) PAN */}
      <Card title="PAN Verification" icon={IdCard} locked={!gstOk} lockHint="Unlocked after GST verification"
        sub={gstOk ? 'Must match the PAN embedded in your GSTIN.' : undefined}
        actions={panOk ? <Pill tone="green" icon={CheckCircle2}>Verified</Pill> : <Pill tone="grey">Step 2</Pill>}>
        {!panOk ? (
          <div className="field">
            <label htmlFor="pan">PAN</label>
            <div className="input-group">
              <input id="pan" className={`input mono ${panErr ? 'invalid' : ''}`} maxLength={10} placeholder="AABCN4567K" disabled={!gstOk} value={pan}
                onChange={(e) => { setPan(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '')); setPanErr(''); }} />
              <button className="btn btn-primary" disabled={!gstOk || pan.length !== 10 || panBusy} onClick={verifyPan}>
                {panBusy ? <><Loader2 size={14} className="spin" /> Verifying…</> : 'Verify PAN'}
              </button>
            </div>
            {panErr ? <span className="err">{panErr}</span> : gstOk && <span className="hint">Tip: characters 3–12 of your GSTIN — <button className="btn btn-ghost btn-xs mono" onClick={() => setPan(data.gst!.gstin.slice(2, 12))}>{data.gst!.gstin.slice(2, 12)}</button></span>}
          </div>
        ) : (
          <dl className="kv">
            <dt>PAN</dt><dd className="mono">{data.pan!.pan}</dd>
            <dt>Name on PAN</dt><dd>{data.pan!.name} <Pill tone="green" icon={BadgeCheck}>Matches GST</Pill></dd>
          </dl>
        )}
      </Card>

      {/* c) Certificates */}
      <Card title="Compliance Certificates" icon={FileBadge} sub="Upload at least one certificate. Each is reviewed by the TrimNova Approver; expired certificates hide the badge and block sales."
        actions={<Pill tone={certs.length ? 'green' : 'grey'}>{certs.length} uploaded</Pill>}>
        <div className="stack-16">
          <div className="grid g-4" style={{ gap: 12 }}>
            <div className="field">
              <label htmlFor="ct">Certificate type</label>
              <select id="ct" className="select" value={certType} onChange={(e) => setCertType(e.target.value)}>
                {CERT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cn">Certificate no.</label>
              <input id="cn" className={`input mono ${certTouched && !certNo.trim() ? 'invalid' : ''}`} value={certNo} onChange={(e) => setCertNo(e.target.value)} placeholder="CU 1046789" />
            </div>
            <div className="field">
              <label htmlFor="ci">Issue date</label>
              <input id="ci" type="date" className="input" value={issue} onChange={(e) => setIssue(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="ce">Expiry date</label>
              <input id="ce" type="date" className="input" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </div>
          </div>
          {certTouched && dateErr && <span className="err small">{dateErr}</span>}
          {file ? <FileChip file={file} onRemove={() => setFile(null)} /> : <Dropzone multiple={false} onFiles={(f) => setFile(f[0])} label="Drag & drop the certificate, or click to browse" />}
          {certTouched && !file && <span className="err small">Attach the certificate file</span>}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={addCert}>Add certificate</button>
          </div>

          {certs.length > 0 && (
            <div className="table-wrap" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <table className="tbl">
                <thead><tr><th>Certificate</th><th>Number</th><th>Validity</th><th>File</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {certs.map((d) => {
                    const v = latest(d);
                    return (
                      <tr key={d.id}>
                        <td className="t-name">{d.certType}</td>
                        <td className="mono">{d.number}</td>
                        <td><div className="xs">{v.issueDate && fmtDate(v.issueDate)} → {v.expiryDate && fmtDate(v.expiryDate)}</div><ExpiryChip doc={d} /></td>
                        <td className="xs muted">{v.fileName}</td>
                        <td><DocStatusPill doc={d} />{v.reason && <div className="xs muted" style={{ maxWidth: 220 }}>{v.reason}</div>}</td>
                        <td className="right">
                          {!data.submittedAt && <button className="icon-btn light" aria-label="Remove certificate" onClick={() => removeDoc(d.id)}><Trash2 size={14} /></button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* d) Registration fee — only when Admin setting is ON */}
      {cfg.registrationFeeOn && (
        data.feePaid
          ? <Banner tone="success" lead="Platform fee paid.">Transaction <span className="mono">{data.feeTxn}</span>. A GST invoice has been emailed to you.</Banner>
          : <Banner tone="warning" lead="One-time registration fee.">Pay the one-time platform fee of <span className="mono bold">{inr(cfg.registrationFee)}</span> + {cfg.gstRate}% GST (<span className="mono">{inr(feeGst)}</span>) to continue.</Banner>
      )}

      {/* e) Proceed */}
      <div className="row" style={{ justifyContent: 'flex-end', gap: 12 }}>
        {!canProceed && <span className="xs muted">Verify GST and PAN, and upload at least one certificate to continue.</span>}
        <button className="btn btn-primary btn-lg" disabled={!canProceed} onClick={proceed}>
          {feeDue ? <><CreditCard size={16} /> Pay &amp; Proceed</> : <>Proceed to Module 02 <ArrowRight size={16} /></>}
        </button>
      </div>

      <FeePaymentModal open={payOpen} onClose={() => setPayOpen(false)} amount={cfg.registrationFee} gst={feeGst} gstRate={cfg.gstRate}
        onPaid={(txn) => { patch({ feePaid: true, feeTxn: txn, module1Done: true }); setPayOpen(false); toast('success', 'Payment successful', `Txn ${txn}`); onNext(); }} />
    </div>
  );
}

function FeePaymentModal({ open, onClose, amount, gst, gstRate, onPaid }: {
  open: boolean; onClose: () => void; amount: number; gst: number; gstRate: number; onPaid: (txn: string) => void;
}) {
  const [method, setMethod] = useState<'upi' | 'card' | 'nb'>('upi');
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={() => !busy && onClose()} title="Pay platform registration fee" icon={CreditCard}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={() => { setBusy(true); setTimeout(() => { setBusy(false); onPaid(`PAY-${Date.now().toString().slice(-8)}`); }, 1200); }}>
          {busy ? 'Processing…' : `Pay ${inr(amount + gst)}`}
        </button>
      </>}>
      <div className="stack-16">
        <dl className="kv">
          <dt>Platform fee</dt><dd className="mono right">{inr(amount)}</dd>
          <dt>GST @ {gstRate}%</dt><dd className="mono right">{inr(gst)}</dd>
          <dt className="bold" style={{ color: 'var(--text)' }}>Total</dt><dd className="mono right bold">{inr(amount + gst)}</dd>
        </dl>
        <div className="stack-12">
          {([['upi', 'UPI'], ['card', 'Credit / Debit card'], ['nb', 'Net banking']] as const).map(([id, l]) => (
            <label key={id} className="check" style={{ padding: 10, border: `1px solid ${method === id ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius)' }}>
              <input type="radio" name="pm" checked={method === id} onChange={() => setMethod(id)} /> {l}
            </label>
          ))}
        </div>
        <div className="xs muted">Single payment attempt. If the payment fails, no amount is captured and you can retry.</div>
      </div>
    </Modal>
  );
}
