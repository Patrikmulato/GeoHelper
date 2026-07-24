'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listUsers } from '@/lib/api/users';
import { useAuth } from '@/lib/auth/AuthProvider';
import type { User } from '@/types/user';

export default function DashboardPage() {
  const router = useRouter();
  const { status, role } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Send unauthenticated visitors to the login route.
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  // Load users only for authenticated admins.
  useEffect(() => {
    if (status !== 'authenticated' || role !== 'ADMIN') {
      return;
    }

    let active = true;

    async function load() {
      try {
        const items = await listUsers();
        if (active) {
          setUsers(items);
        }
      } catch {
        if (active) {
          setError('Failed to load users.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [status, role]);

  if (status === 'loading') {
    return <div className="flex flex-1 items-center justify-center text-zinc-500">Loading…</div>;
  }

  if (status === 'authenticated' && role !== 'ADMIN') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="text-3xl font-bold text-white">403</p>
        <p className="text-sm text-zinc-400">You are not authorized to view this page.</p>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return null;
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 text-lg font-bold text-white">Dashboard</h1>
        <p className="mb-4 text-sm text-zinc-400">Registered users (admin only).</p>

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        {loading ? (
          <p className="text-sm text-zinc-500">Loading users…</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#20262e] text-xs uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-4 py-2 font-semibold">Email</th>
                  <th className="px-4 py-2 font-semibold">Role</th>
                  <th className="px-4 py-2 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-zinc-800">
                    <td className="px-4 py-2 text-zinc-200">{user.email}</td>
                    <td className="px-4 py-2 text-zinc-300">{user.role}</td>
                    <td className="px-4 py-2 text-zinc-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
