'use client';

import React from 'react';

export default function MasterScheduleModule({ sportState = {}, categories = [] }) {
  const categoryRoundsMap = sportState?.categoryRounds || {};

  // Helper to aggregate ALL matches across ALL categories
  const getAllScheduledMatches = () => {
    let allMatches = [];
    Object.entries(categoryRoundsMap).forEach(([catKey, catData]) => {
      const roundsList = catData?.rounds || [];
      roundsList.forEach(r => {
        (r.groups || []).forEach(g => {
          (g.matches || []).forEach(m => {
            allMatches.push({
              ...m,
              category: catKey,
              roundName: r.roundName,
              groupName: g.groupName
            });
          });
        });
      });
    });
    return allMatches;
  };

  const allMasterMatches = getAllScheduledMatches();

  // Calculate match counts per category
  const categoryMatchCounts = {};
  categories.forEach(c => {
    categoryMatchCounts[c] = allMasterMatches.filter(m => m.category === c).length;
  });

  // Group master matches by Date -> Time Slot
  const masterScheduleMatrix = {};
  allMasterMatches.forEach(m => {
    const dKey = m.scheduledDate || '15Aug26';
    const tKey = m.scheduledTimeSlot || '11 AM to 12 PM';
    if (!masterScheduleMatrix[dKey]) masterScheduleMatrix[dKey] = {};
    if (!masterScheduleMatrix[dKey][tKey]) masterScheduleMatrix[dKey][tKey] = [];
    masterScheduleMatrix[dKey][tKey].push(m);
  });

  return (
    <div className="space-y-6">
      {/* Header with Summary Metrics */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider">📅 Master Schedule Matrix (All Categories)</h3>
          <p className="text-xs text-slate-400 mt-0.5">One-glance timeline view organized by date and time slot across all active tournament categories.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <span className="text-[11px] bg-slate-950 text-amber-400 font-bold px-3 py-1.5 rounded-xl border border-slate-800 shadow">
            Total Matches: <strong className="text-white">{allMasterMatches.length}</strong>
          </span>
          {categories.map(cat => (
            categoryMatchCounts[cat] > 0 && (
              <span key={cat} className="text-[10px] bg-amber-500/10 text-amber-300 font-bold px-2.5 py-1.5 rounded-xl border border-amber-500/20">
                {cat}: {categoryMatchCounts[cat]}
              </span>
            )
          ))}
        </div>
      </div>

      {/* Schedule Matrix Content */}
      {Object.keys(masterScheduleMatrix).length === 0 ? (
        <div className="text-center py-20 bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 space-y-3">
          <p className="text-sm">No matches scheduled yet across any category.</p>
          <p className="text-xs text-slate-500">Initialize and start rounds in your tournament modules to populate the timeline matrix.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(masterScheduleMatrix).map(([dateKey, timeSlots]) => (
            <div key={dateKey} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <span className="text-base">📅</span>
                <h4 className="font-black text-amber-400 text-sm">Date: {dateKey}</h4>
              </div>

              <div className="space-y-4">
                {Object.entries(timeSlots).map(([timeKey, matchesList]) => (
                  <div key={timeKey} className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-black text-rose-300 bg-rose-950/70 px-3 py-1 rounded-lg border border-rose-500/40">
                        ⏰ {timeKey}
                      </span>
                      <span className="text-[11px] text-slate-400 font-bold">
                        {matchesList.length} match(es) scheduled in this slot
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {matchesList.map((m) => (
                        <div key={m.id} className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2 shadow">
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-black px-2 py-0.5 rounded border border-emerald-500/20">
                              {m.category}
                            </span>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-bold">
                              {m.roundName} • {m.groupName}
                            </span>
                          </div>

                          <div className="text-xs font-bold text-slate-100 flex items-center justify-between pt-1">
                            <span>{m.playerA.name} <span className="text-amber-400 font-normal">vs</span> {m.playerB.name}</span>
                          </div>

                          {m.isLocked && m.scoreA !== null && m.scoreB !== null && (
                            <div className="text-[10px] text-emerald-400 font-bold pt-1 border-t border-slate-800/60">
                              Result: {m.scoreA} - {m.scoreB} 🔒
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}