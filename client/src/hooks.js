import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

export function useProject(projectId) {
  const [project, setProject] = useState(null);
  const [error, setError] = useState('');
  const reload = useCallback(() => {
    if (!projectId) return;
    api(`/projects/${projectId}`)
      .then((p) => {
        setProject(p);
        setError('');
      })
      .catch((e) => setError(e.message));
  }, [projectId]);
  useEffect(reload, [reload]);
  return { project, error, reload, setProject };
}

// Epics of a project (for pickers and filters). `version` lets callers force a reload.
export function useEpics(projectId, version = 0) {
  const [epics, setEpics] = useState([]);
  useEffect(() => {
    if (!projectId) return;
    api(`/projects/${projectId}/issues?type=epic`)
      .then(setEpics)
      .catch(() => setEpics([]));
  }, [projectId, version]);
  return epics;
}

export function useUsers() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    api('/users').then(setUsers).catch(() => setUsers([]));
  }, []);
  return users;
}

export function formatDate(value) {
  if (!value) return '';
  const d = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
