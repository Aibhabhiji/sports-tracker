'use client';

import React, { useState } from 'react';

export default function AdminModule({ currentUser, onAdminStateChange }) {
  const [admins, setAdmins] = useState(['admin@example.com', 'manager@tournament.com']);
  const [newEmail, setNewEmail] = useState('');

  const currentIdentifier = currentUser?.email || currentUser || '';
  const isCurrentAdmin = admins.includes(currentIdentifier);

  const handleAddAdmin = (e) => {
    e.preventDefault();
    if (!newEmail || admins.includes(newEmail)) return;
    const updated = [...admins, newEmail];
    setAdmins(updated);
    setNewEmail('');
    if (onAdminStateChange) {
      onAdminStateChange({ admins: updated, isAdmin: updated.includes(currentIdentifier) });
    }
  };

  const handleRemoveAdmin = (emailToRemove) => {
    const updated = admins.filter(email => email !== emailToRemove);
    setAdmins(updated);
    if (onAdminStateChange) {
      onAdminStateChange({ admins: updated, isAdmin: updated.includes(currentIdentifier) });
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div>
        <h3 className="text-base font-black text-slate-900">🛡️ Admin Access Control Module</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage authorized administrators. Only listed admins possess create, update, and delete privileges; all other public users remain strictly read-only.
        </p>
      </div>

      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
        <div>
          <span className="font-bold text-slate-700">Access Status: </span>
          <span className={`font-black ${isCurrentAdmin ? 'text-green-600' : 'text-amber-600'}`}>
            {isCurrentAdmin ? 'Authorized Admin (Read / Write Enabled)' : 'Public User (Read-Only)'}
          </span>
        </div>
      </div>

      <form onSubmit={handleAddAdmin} className="flex gap-2">
        <input
          type="email"
          placeholder="Enter authorized admin email..."
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs flex-1 outline-none focus:border-amber-500"
          required
        />
        <button
          type="submit"
          className="bg-amber-500 hover:bg-amber-600 text-white font-black px-4 py-2.5 rounded-xl text-xs shadow transition"
        >
          Grant Admin Access
        </button>
      </form>

      <div className="space-y-2">
        <h4 className="font-bold text-slate-700 text-xs">Authorized Admin List ({admins.length})</h4>
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 text-xs">
          {admins.map((email) => (
            <div key={email} className="flex items-center justify-between p-3 hover:bg-slate-100/50">
              <span className="font-semibold text-slate-800">{email}</span>
              <button
                onClick={() => handleRemoveAdmin(email)}
                className="text-red-500 font-bold hover:underline"
              >
                Revoke Access
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}