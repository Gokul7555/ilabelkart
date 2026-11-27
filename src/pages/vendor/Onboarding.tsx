import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, FileCheck2, Globe, Lock } from 'lucide-react';
import { Banner, Card, PageHeader, Pill } from '../../components/ui';
import { fmtDate } from '../../lib/format';
import { useOnboarding } from '../../lib/onboarding';
import { usePlatformConfig } from '../../lib/platformConfig';
import { useVendorState } from '../../lib/vendorState';
import { TRIMINSTA_HUBS } from '../../data/india';
import Module1 from './onboarding/Module1';
import Module2 from './onboarding/Module2';
import Module3 from './onboarding/Module3';
import UnderReview from './onboarding/UnderReview';
import { DemoPanel, Switch } from './onboarding/shared';

type Mod = 1 | 2 | 3;

export default function Onboarding() {
  const { data, reset } = useOnboarding();
  const { status, setStatus } = useVendorState();
  const { cfg, update } = usePlatformConfig();
  const [mod, setMod] = useState<Mod>(!data.module1Done ? 1 : !data.module2Done ? 2 : 3);

  const restartAsNew = () => { reset('new'); setStatus('onboarding'); setMod(1); window.scrollTo(0, 0); };
  const restoreNovatex = () => { reset('novatex'); setStatus('active'); };

  const demo = (
    <DemoPanel>
      <Switch checked={cfg.registrationFeeOn} onChange={(v) => update({ registrationFeeOn: v })} label={<>Admin setting: registration fee <b>{cfg.registrationFeeOn ? 'ON' : 'OFF'}</b> <span className="muted">(TBD with client)</span></>} />
      <span className="grow" />
      {status === 'active'
        ? <button className="btn btn-secondary btn-sm" onClick={restartAsNew}>Restart as a new vendor</button>
        : <button className="btn btn-secondary btn-sm" onClick={restoreNovatex}>Restore NovaTex (active)</button>}
    </DemoPanel>
  );

  const header = <PageHeader icon={ClipboardCheck} title="Vendor Onboarding" subtitle="Complete all three modules to activate your vendor account" />;

  if (status === 'active') {
    return (
      <div className="container stack-16">
        {header}
        <Banner tone="success" lead="Account active.">{data.activatedAt ? `Activated on ${fmtDate(data.activatedAt)}.` : ''} All portal features are unlocked. Keep certificates current from KYC & Docs.</Banner>
        <div className="grid g-3">
          <Card title="Module 01: KYC & Compliance" icon={CheckCircle2}>
            <dl className="kv" style={{ gridTemplateColumns: '90px 1fr' }}>
              <dt>GSTIN</dt><dd className="mono">{data.gst?.gstin}</dd>
              <dt>PAN</dt><dd className="mono">{data.pan?.pan}</dd>
              <dt>Certificates</dt><dd>{data.docs.filter((d) => d.kind === 'CERT').length}</dd>
            </dl>
          </Card>
          <Card title="Module 02: Partnership Plan" icon={CheckCircle2}>
            <dl className="kv" style={{ gridTemplateColumns: '90px 1fr' }}>
              <dt>Plan</dt><dd>{data.plan ? data.plan[0].toUpperCase() + data.plan.slice(1) : '—'} <Pill tone="amber" strong>TBD</Pill></dd>
              <dt>Agreement</dt><dd>{data.agreementAccepted ? 'Accepted' : '—'}</dd>
            </dl>
          </Card>
          <Card title="Module 03: TrimInsta & Payment" icon={CheckCircle2}>
            <dl className="kv" style={{ gridTemplateColumns: '90px 1fr' }}>
              <dt>TrimInsta</dt><dd>{data.insta.optIn ? data.insta.hubs.map((h) => TRIMINSTA_HUBS.find((x) => x.id === h)?.city).join(', ') : 'Not opted in'}</dd>
              <dt>Bank</dt><dd>{data.bank ? `${data.bank.bankName} ••${data.bank.account.slice(-4)}` : '—'}</dd>
            </dl>
          </Card>
        </div>
        <div className="row"><Link to="/vendor/kyc" className="btn btn-secondary"><FileCheck2 size={15} /> Manage KYC & Docs</Link></div>
        {demo}
      </div>
    );
  }

  if (status === 'under_review') {
    return (
      <div className="container stack-16">
        {header}
        <UnderReview demoExtra={<><span className="grow" /><button className="btn btn-secondary btn-sm" onClick={restoreNovatex}>Restore NovaTex (active)</button></>} />
      </div>
    );
  }

  const progress = [
    { label: 'GST verified', ok: !!data.gst, detail: data.gst ? data.gst.gstin : 'Module 01' },
    { label: 'PAN verified', ok: !!data.pan, detail: data.pan ? data.pan.pan : 'Module 01, after GST' },
    { label: 'Certificates uploaded', ok: data.docs.filter((d) => d.kind === 'CERT').length > 0, detail: `${data.docs.filter((d) => d.kind === 'CERT').length} uploaded` },
    { label: 'Plan & agreement', ok: data.module2Done, detail: data.plan ? `${data.plan} plan (TBD)` : 'Module 02' },
    { label: 'Bank verified', ok: !!data.bank?.verified, detail: data.bank ? `${data.bank.bankName} ••${data.bank.account.slice(-4)}` : 'Module 03' },
    { label: 'Submitted for review', ok: !!data.submittedAt, detail: data.submittedAt ? fmtDate(data.submittedAt) : 'Module 03' },
  ];
  const modDone = { 1: data.module1Done, 2: data.module2Done, 3: !!data.submittedAt };
  const unlocked = { 1: true, 2: data.module1Done, 3: data.module2Done };
  const MODS: { id: Mod; label: string }[] = [
    { id: 1, label: 'KYC & Compliance' }, { id: 2, label: 'Partnership Plan' }, { id: 3, label: 'TrimInsta & Payment' },
  ];

  return (
    <div className="container stack-16">
      {header}
      {status === 'frozen' && <Banner tone="danger" lead="Account frozen.">Contact TrimNova Support.</Banner>}

      <div className="stepper" role="tablist">
        {MODS.map((m) => (
          <button key={m.id} role="tab" aria-selected={mod === m.id} disabled={!unlocked[m.id]}
            className={`step ${mod === m.id ? 'active' : ''} ${modDone[m.id] ? 'done' : ''}`} onClick={() => setMod(m.id)}>
            <span className="step-num">{modDone[m.id] ? <CheckCircle2 size={15} /> : !unlocked[m.id] ? <Lock size={13} /> : `0${m.id}`}</span>
            <span><span className="step-k">Module 0{m.id}</span><span className="step-l">{m.label}</span></span>
          </button>
        ))}
      </div>

      <div className="row" style={{ gap: 10 }}>
        <Globe size={14} className="muted" />
        <div className="tabs">
          <button className="tab active">India (IN)</button>
          <button className="tab" disabled title="Onboarding for other countries is not yet defined">Other Countries: TBD</button>
        </div>
      </div>

      <div className="detail-layout">
        <div className="stack-16">
          {mod === 1 && <Module1 onNext={() => setMod(2)} />}
          {mod === 2 && <Module2 onBack={() => setMod(1)} onNext={() => setMod(3)} />}
          {mod === 3 && <Module3 onBack={() => setMod(2)} />}
        </div>
        <aside className="stack-16 detail-aside">
          <section className="kcard" aria-labelledby="prog-title">
            <div className="kcard-head"><h2 id="prog-title">Your progress</h2><span className="count-pill">{progress.filter((x) => x.ok).length} / {progress.length}</span></div>
            <div className="segbar" style={{ marginBottom: 12 }}>{progress.map((x) => <span key={x.label} className={x.ok ? 'on' : ''} />)}</div>
            {progress.map((x) => (
              <div key={x.label} className="arow">
                <span className={`arow-icon ${x.ok ? 'tone-green' : 'tone-slate'}`}>{x.ok ? <CheckCircle2 size={16} /> : <Lock size={15} />}</span>
                <div className="grow" style={{ minWidth: 0 }}><div className="arow-title" style={{ fontSize: 14 }}>{x.label}</div><div className="arow-sub">{x.detail}</div></div>
              </div>
            ))}
          </section>
          <Banner tone="info" lead="What happens next:">the Approver reviews each document, then Admin activates your account. Locked menu items open after activation.</Banner>
        </aside>
      </div>

      {demo}
    </div>
  );
}
