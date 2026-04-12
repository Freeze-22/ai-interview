// frontend/src/lib/api.ts
import { auth } from './firebase';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

async function getToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();
  localStorage.setItem('authToken', token);
  return token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  createSession: (data: { jobTitle: string; interviewType: string }) =>
    request<{ sessionId: string; wsUrl: string }>('/api/sessions/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getSession: (sessionId: string) =>
    request<any>(`/api/sessions/${sessionId}`),

  getSessions: () =>
    request<{ sessions: any[] }>('/api/sessions/user/all'),

  getReport: (sessionId: string) =>
    request<any>(`/api/sessions/${sessionId}/report`),

  uploadResume: async (file: File): Promise<{ resumeText: string; fileId: string }> => {
    const token = await getToken();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${BASE_URL}/api/upload/resume`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  },

  executeCode: (data: { code: string; language: string; stdin?: string }) =>
    request<any>('/api/judge/execute', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
