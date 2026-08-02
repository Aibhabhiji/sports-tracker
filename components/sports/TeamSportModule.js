'use client';

import React from 'react';

export default function TeamSportModule({ sportName, participants, sportState, onUpdateSportState }) {
  const teams = sportState?.teams || [];
  const matches = sportState?.matches || [];
  const stage = sportState?.stage || 'Quarter Finals';

  const handleGenerateTeamsAndMatches = () => {
    if (participants.length === 0) return alert('No participants match filters.');
    const groupSize = sportName.toLowerCase().includes('cricket') || sportName.toLowerCase().includes('football') ? 11 : 8;
    const newTeams = [];
    let teamIdx = 1;

    for (let i = 0; i < participants.length; i += groupSize) {
      const members = participants.slice(i, i + groupSize);
      newTeams.push({
        id: `TEAM_${teamIdx}`,
        name: `${sportName} Team ${teamIdx}`,
        members,
        purse: 10000000,
      });
      teamIdx++;
    }

    const newMatches = [];
    for (let i = 0; i < newTeams.length; i += 2) {
      if (i + 1 < newTeams.length) {
        newMatches.push({
          id: `M_${i}`,
          stage: 'Quarter Finals',
          teamA: newTeams[i],
          teamB: newTeams[i + 1],
          scoreA: 0,
          scoreB: 0,
          isLocked: false,
          winner: null,
        });
      }
    }

    onUpdateSportState({ teams: newTeams, matches: newMatches, stage: 'Quarter Finals' });
  };

  const updateScore = (matchId, teamKey, delta) => {
    const updated = matches.map((m) => {
      if (m.id === matchId && !m.isLocked) {
        return { ...m, [teamKey]: Math.max(0, m[teamKey] + delta) };
      }
      return m;
    });
    onUpdateSportState({ matches: updated });
  };

  const lockMatch = (matchId) => {
    const updated = matches.map((m) => {
      if (m.id === matchId) {
        const winner = m.scoreA > m.scoreB ? m.teamA.name : m.scoreB > m.scoreA ? m.teamB.name : 'Tie / Super Over';
        return { ...m, isLocked: true, winner };
      }
      return m;
    });
    onUpdateSportState({ matches: updated });
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-base font-black text-amber-400">{sportName} — Auction & Knockout Fixtures ({stage})</h3>
          <p className="text-xs text-slate-400">Team Size: 7–12 Players | Quarter Finals, Semi Finals & Finals</p>
        </div>
        <button onClick={handleGenerateTeamsAndMatches} className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs shadow">
          ⚡ Auto-Generate Teams & Fixtures
        </button>
      </div>

      <div className="space-y-4">
        {matches.map((match) => (
          <div key={match.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-amber-400">{match.stage}</span>
              {match.isLocked && <span className="text-xs bg-emerald-950 text-emerald-400 px-3 py-1 rounded-full font-black">🔒 Winner: {match.winner}</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Team A */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <h4 className="font-extrabold text-amber-400 text-sm">{match.teamA.name}</h4>
                  <span className="text-[10px] text-slate-400">{match.teamA.members.length} Squad Members</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-amber-300">{match.scoreA}</span>
                  {!match.isLocked && (
                    <div className="flex flex-col gap-1">
                      <button onClick={() => updateScore(match.id, 'scoreA', 1)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-xs font-bold">+</button>
                      <button onClick={() => updateScore(match.id, 'scoreA', -1)} className="bg-rose-900 hover:bg-rose-800 text-white px-3 py-1 rounded text-xs font-bold">-</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Team B */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <h4 className="font-extrabold text-amber-400 text-sm">{match.teamB.name}</h4>
                  <span className="text-[10px] text-slate-400">{match.teamB.members.length} Squad Members</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-amber-300">{match.scoreB}</span>
                  {!match.isLocked && (
                    <div className="flex flex-col gap-1">
                      <button onClick={() => updateScore(match.id, 'scoreB', 1)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-xs font-bold">+</button>
                      <button onClick={() => updateScore(match.id, 'scoreB', -1)} className="bg-rose-900 hover:bg-rose-800 text-white px-3 py-1 rounded text-xs font-bold">-</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!match.isLocked && (
              <button onClick={() => lockMatch(match.id)} className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 rounded-xl text-xs shadow">
                🔒 Save & Lock Match Result
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}