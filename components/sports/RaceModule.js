'use client';

import React, { useState } from 'react';

export default function RaceModule({ sportName, participants, sportState, onUpdateSportState }) {
  const heats = sportState?.heats || [];

  const initializeHeats = () => {
    if (participants.length === 0) return alert('No participants available.');
    const newHeats = participants.map((p, index) => ({
      id: p.id,
      participant: p,
      timeRecorded: '',
      position: index + 1,
      isLocked: false,
    }));
    onUpdateSportState({ heats: newHeats });
    alert('Race heats initialized!');
  };

  const updateHeatResult = (id, time, position) => {
    const updated = heats.map(h => h.id === id ? { ...h, timeRecorded: time, position: parseInt(position) || h.position, isLocked: true } : h);
    onUpdateSportState({ heats: updated });
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex justify-between items-center shadow-xl">
        <div>
          <h3 className="text-sm font-black text-amber-400">{sportName} — Race Timings & Heats</h3>
          <p className="text-xs text-slate-400">Record finish times and podium positions.</p>
        </div>
        <button onClick={initializeHeats} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs shadow">
          ⚡ Initialize Race Heats
        </button>
      </div>

      <div className="space-y-3">
        {heats.sort((a,b) => a.position - b.position).map((h) => (
          <div key={h.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="font-bold text-xs text-slate-100 block">{h.participant.name}</span>
              <span className="text-[10px] text-amber-400">{h.participant.flat} • Age Group: {h.participant.ageGroup}</span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Time (e.g. 12.4s)"
                defaultValue={h.timeRecorded}
                onBlur={(e) => updateHeatResult(h.id, e.target.value, h.position)}
                className="bg-slate-950 text-slate-200 text-xs p-2 rounded-xl border border-slate-800 w-28 outline-none"
              />
              <select
                defaultValue={h.position}
                onChange={(e) => updateHeatResult(h.id, h.timeRecorded, e.target.value)}
                className="bg-slate-950 text-amber-400 text-xs font-bold p-2 rounded-xl border border-slate-800 outline-none"
              >
                <option value={1}>(🥇 1st)</option>
                <option value={2}>(🥈 2nd)</option>
                <option value={3}>(🥉 3rd)</option>
                <option value={4}>4th+</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}