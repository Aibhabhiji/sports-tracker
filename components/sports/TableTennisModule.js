'use client';

import React, { useState } from 'react';

export default function TableTennisModule({ participants, sportState, onUpdateSportState }) {
  const matches = sportState.matches || [
    { id: 'm1', round: 'Quarter Final 1', player1: participants[0]?.name || 'Player A', player2: participants[1]?.name || 'Player B', date: '', time: '', score: '', status: 'Scheduled' },
    { id: 'm2', round: 'Quarter Final 2', player1: participants[2]?.name || 'Player C', player2: participants[3]?.name || 'Player D', date: '', time: '', score: '', status: 'Scheduled' },
  ];

  const [matchList, setMatchList] = useState(matches);
  const [newRound, setNewRound] = useState('Semi Final');
  const [newP1, setNewP1] = useState('');
  const [newP2, setNewP2] = useState('');

  const handleUpdateMatch = (id, field, value) => {
    const updated = matchList.map(m => m.id === id ? { ...m, [field]: value } : m);
    setMatchList(updated);
    onUpdateSportState({ matches: updated });
  };

  const handleAddMatch = (e) => {
    e.preventDefault();
    if (!newP1 || !newP2) return;
    const newMatch = {
      id: 'm_' + Date.now(),
      round: newRound,
      player1: newP1,
      player2: newP2,
      date: '',
      time: '',
      score: '',
      status: 'Scheduled'
    };
    const updated = [...matchList, newMatch];
    setMatchList(updated);
    onUpdateSportState({ matches: updated });
    setNewP1('');
    setNewP2('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-base font-black text-slate-900">🏓 Table Tennis - Match Scheduler & Draws</h3>
          <p className="text-xs text-slate-500 mt-0.5">Manage tournament draws, assign/reschedule match dates and times, and track scores.</p>
        </div>
      </div>

      {/* Add Match Draw */}
      <form onSubmit={handleAddMatch} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h4 className="font-black text-slate-900 text-sm">➕ Create New Match Draw & Schedule</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Round (e.g. Semi Final)"
            value={newRound}
            onChange={(e) => setNewRound(e.target.value)}
            className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs outline-none"
            required
          />
          <select
            value={newP1}
            onChange={(e) => setNewP1(e.target.value)}
            className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold outline-none"
            required
          >
            <option value="">Select Player 1</option>
            {participants.map(p => (
              <option key={p.id || p.regId || p.Registration_ID} value={p.name}>{p.name} ({p.flat || 'General'})</option>
            ))}
          </select>
          <select
            value={newP2}
            onChange={(e) => setNewP2(e.target.value)}
            className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold outline-none"
            required
          >
            <option value="">Select Player 2</option>
            {participants.map(p => (
              <option key={p.id || p.regId || p.Registration_ID} value={p.name}>{p.name} ({p.flat || 'General'})</option>
            ))}
          </select>
          <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white font-black px-4 py-2.5 rounded-xl text-xs shadow transition">
            Add Match & Schedule
          </button>
        </div>
      </form>

      {/* Matches & Rescheduling Hub */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h4 className="font-black text-slate-900 text-sm">📅 Match Schedule & Rescheduling Hub</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                <th className="p-3">Round / Draw</th>
                <th className="p-3">Opponents</th>
                <th className="p-3">Scheduled Date</th>
                <th className="p-3">Scheduled Time</th>
                <th className="p-3">Score / Result</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matchList.map(m => (
                <tr key={m.id} className="hover:bg-slate-50/80">
                  <td className="p-3 font-bold text-amber-700">{m.round}</td>
                  <td className="p-3 font-semibold text-slate-900">
                    {m.player1} <span className="text-slate-400 font-normal">vs</span> {m.player2}
                  </td>
                  <td className="p-3">
                    <input
                      type="date"
                      value={m.date || ''}
                      onChange={(e) => handleUpdateMatch(m.id, 'date', e.target.value)}
                      className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-amber-500"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="time"
                      value={m.time || ''}
                      onChange={(e) => handleUpdateMatch(m.id, 'time', e.target.value)}
                      className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-amber-500"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="text"
                      placeholder="e.g. 11-9, 11-7"
                      value={m.score || ''}
                      onChange={(e) => handleUpdateMatch(m.id, 'score', e.target.value)}
                      className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs w-32 outline-none"
                    />
                  </td>
                  <td className="p-3">
                    <select
                      value={m.status || 'Scheduled'}
                      onChange={(e) => handleUpdateMatch(m.id, 'status', e.target.value)}
                      className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-bold outline-none"
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Rescheduled">Rescheduled</option>
                      <option value="Live">Live</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}