'use client';

import React, { useState } from 'react';

export default function MarathonModule({ sportName, participants, sportState, onUpdateSportState }) {
  const scores = sportState.scores || {};
  const [timingData, setTimingData] = useState(scores);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('All');

  const categories = ['All', ...new Set(participants.map(p => p.category || 'General'))];

  const handleScoreChange = (participantId, field, value) => {
    const updated = {
      ...timingData,
      [participantId]: {
        ...(timingData[participantId] || { time: '', status: 'Registered' }),
        [field]: value
      }
    };
    setTimingData(updated);
    onUpdateSportState({ scores: updated });
  };

  const filteredParticipants = selectedCategoryTab === 'All' 
    ? participants 
    : participants.filter(p => (p.category || 'General') === selectedCategoryTab);

  const categoriesList = categories.filter(c => c !== 'All');

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-base font-black text-slate-900">🏃‍♂️ {sportName} - Category-Wise Tracking & Leaderboard</h3>
          <p className="text-xs text-slate-500 mt-0.5">Manage timings, category-based group divisions, and top 5-6 player leaderboards.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategoryTab(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedCategoryTab === cat ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard: Top 5-6 players per category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categoriesList.map(category => {
          const catParticipants = participants.filter(p => (p.category || 'General') === category);
          
          const ranked = [...catParticipants].sort((a, b) => {
            const timeA = timingData[a.id || a.regId || a.Registration_ID]?.time || '99:99:99';
            const timeB = timingData[b.id || b.regId || b.Registration_ID]?.time || '99:99:99';
            return timeA.localeCompare(timeB);
          }).slice(0, 6);

          return (
            <div key={category} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="font-black text-amber-700 text-sm">🏆 Leaderboard: {category} (Top 6)</h4>
                <span className="text-xs bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg font-bold border border-amber-200">
                  Group Division: {category}
                </span>
              </div>

              {ranked.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No participants in this category.</p>
              ) : (
                <div className="space-y-2">
                  {ranked.map((p, idx) => {
                    const pid = p.id || p.regId || p.Registration_ID;
                    const pData = timingData[pid] || {};
                    return (
                      <div key={pid} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] ${
                            idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-slate-300 text-slate-800' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-600'
                          }`}>
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 block">{p.name}</span>
                            <span className="text-[10px] text-slate-500">{p.flat}</span>
                          </div>
                        </div>
                        <div className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                          {pData.time || 'Not Recorded'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Participant Timing Entry Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h4 className="font-black text-slate-900 text-sm">⏱️ Marathon Timing Entry ({selectedCategoryTab})</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                <th className="p-3">Reg ID / Name</th>
                <th className="p-3">Category Group</th>
                <th className="p-3">Flat / Unit</th>
                <th className="p-3">Completion Time (HH:MM:SS)</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParticipants.map(p => {
                const pid = p.id || p.regId || p.Registration_ID;
                const pData = timingData[pid] || {};
                return (
                  <tr key={pid} className="hover:bg-slate-50/80">
                    <td className="p-3 font-bold text-slate-900">
                      {p.name} <span className="text-[10px] text-slate-400 block">({pid})</span>
                    </td>
                    <td className="p-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-bold text-[10px] border border-slate-200">
                        {p.category || 'General'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 font-medium">{p.flat}</td>
                    <td className="p-3">
                      <input
                        type="text"
                        placeholder="e.g. 00:45:20"
                        value={pData.time || ''}
                        onChange={(e) => handleScoreChange(pid, 'time', e.target.value)}
                        className="bg-slate-50 border border-slate-200 p-2 rounded-lg font-mono text-xs w-36 outline-none focus:border-amber-500"
                      />
                    </td>
                    <td className="p-3">
                      <select
                        value={pData.status || 'Registered'}
                        onChange={(e) => handleScoreChange(pid, 'status', e.target.value)}
                        className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-bold outline-none"
                      >
                        <option value="Registered">Registered</option>
                        <option value="Running">Running</option>
                        <option value="Completed">Completed</option>
                        <option value="DNF">DNF</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}