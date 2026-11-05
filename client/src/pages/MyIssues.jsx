import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useUsers } from '../hooks.js';
import IssueDetailModal from '../components/IssueDetailModal.jsx';
import IssueTable from '../components/IssueTable.jsx';

export default function MyIssues() {
  const users = useUsers();
  const [issues, setIssues] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    api('/issues/mine').then(setIssues).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>My open issues</h1>
      </div>
      {error && <div className="alert">{error}</div>}
      {!issues ? (
        <p className="muted">Loading…</p>
      ) : issues.length === 0 ? (
        <div className="empty">Nothing assigned to you. 🎉</div>
      ) : (
        <IssueTable issues={issues} onSelect={(i) => setSelected(i.id)} showProject />
      )}
      {selected && (
        <IssueDetailModal
          issueId={selected}
          users={users}
          onClose={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}
