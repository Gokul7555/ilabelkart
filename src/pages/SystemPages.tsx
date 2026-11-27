import { Link, useLocation } from 'react-router-dom';
import { Bell, Compass, ShieldOff } from 'lucide-react';
import { Card, EmptyState, PageHeader, Tabs } from '../components/ui';
import { homeFor, useAuth } from '../lib/auth';
import { useState } from 'react';
import { useNotifications } from '../lib/notifications';
import { fmtDateTime } from '../lib/format';

export function Forbidden() {
  const { user } = useAuth();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from;
  return (
    <div className="container">
      <Card>
        <EmptyState icon={ShieldOff} title="You don't have access to this area"
          action={user && <Link className="btn btn-primary" to={homeFor(user)}>Go to my home</Link>}>
          {from ? <>Your role (<b>{user?.role}</b>) cannot open <span className="mono">{from}</span>.</> : 'This page is restricted to another role.'}
        </EmptyState>
      </Card>
    </div>
  );
}

export function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div className="card" style={{ maxWidth: 420, width: '100%' }}>
        <EmptyState icon={Compass} title="Page not found" action={<Link className="btn btn-primary" to="/">Back to TrimNova</Link>}>
          The link may be broken or the page may have moved.
        </EmptyState>
      </div>
    </div>
  );
}

export function NotificationCentre() {
  const { items, isRead, markRead, markAll, unread } = useNotifications();
  const [f, setF] = useState<'all' | 'unread'>('all');
  const list = items.filter((n) => f === 'all' || !isRead(n.id));
  return (
    <div className="container">
      <PageHeader icon={Bell} title="Notification Centre" subtitle="Order, compliance, payout and case updates for your account"
        actions={<><Link to={'/account/profile'} className="btn btn-ghost btn-sm">Preferences</Link><button className="btn btn-secondary btn-sm" disabled={!unread} onClick={markAll}>Mark all read</button></>} />
      <div style={{ marginBottom: 12 }}><Tabs value={f} onChange={setF} tabs={[{ id: 'all', label: 'All', count: items.length }, { id: 'unread', label: 'Unread', count: unread }]} /></div>
      <Card pad={false}>
        {list.length === 0 ? <EmptyState icon={Bell} title="You're all caught up" /> : list.map((n) => (
          <div key={n.id} className={`notif ${isRead(n.id) ? '' : 'unread'}`} style={{ padding: '14px 20px' }}>
            <span className="n-dot" style={{ background: `var(--${{ red: 'danger', amber: 'warning', green: 'success', blue: 'info', indigo: 'primary' }[n.tone]})` }} />
            <div className="grow">
              <div className="bold">{n.title}</div>
              <div className="muted">{n.body}</div>
            </div>
            <div className="xs muted nowrap">{fmtDateTime(n.at)}</div>
            {n.to && <Link to={n.to} className="btn btn-secondary btn-xs" onClick={() => markRead(n.id)}>Open</Link>}
            {!isRead(n.id) && <button className="btn btn-ghost btn-xs" onClick={() => markRead(n.id)}>Mark read</button>}
          </div>
        ))}
      </Card>
    </div>
  );
}
