import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Crown, FileSignature, Rocket, Sprout } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Banner, Card, Modal, Pill } from '../../../components/ui';
import { useOnboarding } from '../../../lib/onboarding';
import type { PlanId } from '../../../lib/onboarding';

/** Tier names, prices and benefit sizes are open with the client → render as TBD placeholders. */
const PLANS: { id: PlanId; name: string; icon: LucideIcon; tone: string; features: string[] }[] = [
  { id: 'free', name: 'Free', icon: Sprout, tone: 'var(--success)', features: ['Standard search ranking', 'Listing in category pages', 'Category-level commission (same for every plan)'] },
  { id: 'standard', name: 'Standard', icon: Rocket, tone: 'var(--primary)', features: ['Ranking boost: TBD', 'Spotlight slots per month: TBD', 'Category-level commission (same for every plan)'] },
  { id: 'premium', name: 'Premium', icon: Crown, tone: 'var(--warning)', features: ['Ranking boost: TBD', 'Spotlight slots per month: TBD', 'ELITE supplier badge eligibility: TBD', 'Category-level commission (same for every plan)'] },
];

export default function Module2({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const { data, patch } = useOnboarding();
  const [agreeOpen, setAgreeOpen] = useState(false);
  const locked = !!data.submittedAt;

  return (
    <div className="stack-16">
      <Banner tone="info" lead="Partnership plans are not advertising.">A plan boosts your organic search ranking and spotlight placement. Listings are never labelled "Sponsored", and commission stays category-level for every plan.</Banner>
      <Banner tone="warning" lead="TBD:">tier names, prices and benefit sizes are being finalised with TrimNova. You can change your plan later without losing your listings.</Banner>

      <div className="grid g-3">
        {PLANS.map((p) => {
          const sel = data.plan === p.id;
          return (
            <button key={p.id} disabled={locked} onClick={() => patch({ plan: p.id })} className="card"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', textAlign: 'left', padding: 18, cursor: locked ? 'default' : 'pointer', border: sel ? '2px solid var(--primary)' : '1px solid var(--border)', boxShadow: sel ? '0 0 0 4px var(--primary-50)' : undefined, fontFamily: 'inherit' }}
              aria-pressed={sel}>
              <div className="row-between" style={{ width: '100%' }}>
                <div className="row"><p.icon size={18} style={{ color: p.tone }} /><b style={{ fontSize: 15 }}>{p.name}</b></div>
                <Pill tone="amber" strong>TBD</Pill>
              </div>
              <div style={{ margin: '12px 0', fontSize: 22, fontWeight: 750 }} className="mono">₹ TBD <span className="xs muted" style={{ fontFamily: 'var(--font)' }}>/ month</span></div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="stack-12">
                {p.features.map((f) => <li key={f} className="row small" style={{ alignItems: 'flex-start' }}><Check size={14} style={{ color: 'var(--success)', marginTop: 2, flexShrink: 0 }} />{f}</li>)}
              </ul>
              <div style={{ marginTop: 'auto', paddingTop: 14, width: '100%' }}>
                <span className={`btn btn-block btn-sm ${sel ? 'btn-primary' : 'btn-secondary'}`}>{sel ? 'Selected' : 'Choose plan'}</span>
              </div>
            </button>
          );
        })}
      </div>

      <Card title="Vendor Partnership Agreement" icon={FileSignature}>
        <div className="stack-12">
          <p className="small" style={{ color: 'var(--text-2)' }}>Covers pricing (your base price + TrimNova category commission = customer price), approval of listing changes, dispatch SLAs, OTP handover, the 5–7 day damage window, and the 6 payout conditions.</p>
          <div className="row wrap">
            <button className="btn btn-secondary btn-sm" onClick={() => setAgreeOpen(true)}>Read agreement</button>
            <label className="check" style={{ marginLeft: 4 }}>
              <input type="checkbox" disabled={locked} checked={data.agreementAccepted} onChange={(e) => patch({ agreementAccepted: e.target.checked })} />
              <span>I have read and accept the Vendor Partnership Agreement on behalf of my company.</span>
            </label>
          </div>
        </div>
      </Card>

      <div className="row-between">
        <button className="btn btn-secondary" onClick={onBack}><ArrowLeft size={15} /> Back to Module 01</button>
        <div className="row" style={{ gap: 12 }}>
          {(!data.plan || !data.agreementAccepted) && <span className="xs muted">Choose a plan and accept the agreement.</span>}
          <button className="btn btn-primary btn-lg" disabled={!data.plan || !data.agreementAccepted} onClick={() => { patch({ module2Done: true }); onNext(); }}>
            Proceed to Module 03 <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <Modal open={agreeOpen} onClose={() => setAgreeOpen(false)} title="Vendor Partnership Agreement (summary)" size="lg"
        footer={<button className="btn btn-primary" onClick={() => { if (!locked) patch({ agreementAccepted: true }); setAgreeOpen(false); }}>I accept</button>}>
        <ol className="small stack-12" style={{ paddingLeft: 18, margin: 0 }}>
          <li><b>Pricing.</b> You set a base price. Customers see base price + TrimNova category commission (pre-tax). Commission is set per category only; there are no vendor or product overrides. GST and fees are added separately.</li>
          <li><b>Listing approval.</b> Price, photo, description and policy edits need Approver re-approval. Stock-only edits go live immediately. A rejected edit never replaces your live listing.</li>
          <li><b>Orders.</b> Accept or reject within 1 business day. Partial acceptance is sent to TrimNova for decision (rule TBD).</li>
          <li><b>Dispatch.</b> Standard Delivery uses a courier assigned by the system. OTP handover to the courier is mandatory.</li>
          <li><b>Damage window.</b> Customers may claim for damaged quantity only, within the configured window (5–7 days).</li>
          <li><b>Payouts.</b> Paid manually by TrimNova only after all 6 conditions pass: delivery verified, return window ended, customer funds reconciled, invoices exist, no open dispute, not already paid.</li>
          <li><b>Conduct.</b> Customer communication happens through TrimNova Support only. Risk flags never auto-ban; any freeze follows a Support review and an Admin decision with reasons.</li>
        </ol>
      </Modal>
    </div>
  );
}
