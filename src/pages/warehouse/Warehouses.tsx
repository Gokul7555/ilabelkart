import { Link } from 'react-router-dom';
import { Clock, MapPin, Users, Warehouse } from 'lucide-react';
import { Banner, Card, PageHeader, Pill } from '../../components/ui';
import { TRIMINSTA_HUBS } from '../../data/india';
import { inr, num } from '../../lib/format';
import { usePlatformConfig } from '../../lib/platformConfig';
import { HUBS_META, RENT_PER_CBM, SPACE_USED, useWarehouse } from '../../lib/warehouse';

export default function Warehouses() {
  const { cfg } = usePlatformConfig();
  const { inbound } = useWarehouse();
  return (
    <div className="container wide stack-16" style={{ maxWidth: 1200 }}>
      <PageHeader icon={Warehouse} title="Warehouses" subtitle="TrimInsta hubs: location, service zone, capacity and staff" />
      <Banner tone="info">Service-zone radius is edited in <Link to="/admin/config">Platform Cfg</Link>. Rent rate ({inr(RENT_PER_CBM, { decimals: 0 })}/cbm/month) is a mock value, TBD with client.</Banner>
      <div className="grid g-2">
        {TRIMINSTA_HUBS.map((h) => {
          const m = HUBS_META[h.id];
          const used = SPACE_USED.filter((u) => u.hubId === h.id).reduce((a, u) => a + u.cbm, 0);
          const pct = (used / m.capacityCbm) * 100;
          const pending = inbound.filter((i) => i.hubId === h.id && ['Pending approval', 'Approved', 'In transit'].includes(i.status)).length;
          return (
            <Card key={h.id} title={h.name} sub={<span className="mono">{h.id}</span>} actions={<Pill tone="green">Active</Pill>}>
              <div className="stack-12">
                <div className="small row" style={{ alignItems: 'flex-start' }}><MapPin size={14} className="muted" /> {m.address}</div>
                <dl className="kv" style={{ gridTemplateColumns: '130px 1fr' }}>
                  <dt>Service zone</dt><dd>{(cfg.zones[h.id] ?? 6).toFixed(1)} km radius</dd>
                  <dt>Capacity</dt><dd>{num(used)} / {num(m.capacityCbm)} cbm ({pct.toFixed(1)}%)</dd>
                  <dt>Vendors stocked</dt><dd>{SPACE_USED.filter((u) => u.hubId === h.id).length}</dd>
                  <dt>Open inbounds</dt><dd>{pending}</dd>
                  <dt><Clock size={12} style={{ verticalAlign: -1 }} /> Hours</dt><dd>{m.hours}</dd>
                  <dt><Users size={12} style={{ verticalAlign: -1 }} /> Staff</dt><dd>{m.staff} · manager {m.manager}</dd>
                </dl>
                <div style={{ height: 8, background: 'var(--slate-100)', borderRadius: 'var(--radius-sm)' }}><div style={{ width: `${pct}%`, height: '100%', borderRadius: 'var(--radius-sm)', background: 'var(--primary)' }} /></div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
