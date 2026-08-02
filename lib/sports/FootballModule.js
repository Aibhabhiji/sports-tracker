'use client';

import React from 'react';
import { generateKnockoutBracket } from '@/lib/tournamentEngine';

export default function FootballModule({ teams, sportState, onUpdateSportState }) {
  const currentStage = sportState?.currentStage || 'Round 1';
  const matches = sportState?.matches || generateKnockoutBracket(teams, currentStage).matches;

  const handleScoreChange = (matchId, teamKey, field, value) => {
    const updatedMatches = matches.map((m) => {
      if (m.id === matchId && !m.isLocked) {
        const teamScore = m[teamKey] || {};
        return {
          ...m,
          [teamKey]: { ...teamScore, [field]: value },
        };
      }
      return m;
    });
    onUpdateSportState({ matches: updatedMatches });
  };

  const handleLockMatch = (matchId) => {
    const updatedMatches = matches.map((m) => {
      if (m.id === matchId) {
        const gA = Number(m.scoreA?.goals) || 0;
        const gB = Number(m.scoreB?.goals) || 0;
        const pA = Number(m.scoreA?.penalties) || 0;
        const pB = Number(m.scoreB?.penalties) || 0;

        let winnerId = null;
        let winnerName = null;

        if (gA > gB) {
          winnerId = m.teamA.id;
          winnerName = m.teamA.name;
        } else if (gB > gA) {
          winnerId = m.teamB.id;
          winnerName = m.teamB.name;
        } else {
          if (pA > pB) {
            winnerId = m.teamA.id;
            winnerName = `${m.teamA.name} (Penalties)`;
          } else if (pB > pA) {
            winnerId = m.teamB.id;
            winnerName = `${m.teamB.name} (Penalties)`;
          } else {
            winnerName = 'Tie / Extra Penalties Needed';
          }
        }

        return {
          ...m,
          winnerId,
          winnerName,
          isLocked: true,
        };
      }
      return m;
    });
    onUpdateSportState({ matches: updatedMatches });
  };

  return (
    <div className="space-y-6">
      {matches.filter((m) => m.stage === currentStage).map((match) => (
        <div
          key={match.id}
          className={`p-5 rounded-2xl border ${
            match.isLocked ? 'bg-slate-855 border-emerald-600/50' : 'bg-slate-800 border-slate-700'
          }`}
        >
          <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
            <span className="text-xs font-bold text-amber-400">Football • {match.stage}</span>
            {match.isLocked && (
              <span className="text-xs bg-emerald-950 text-emerald-400 px-3 py-1 rounded-full font-black">
                🔒 Winner: {match.winnerName}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Team A */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
              <h4 className="font-extrabold text-amber-400 text-base mb-2">{match.teamA.name}</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Goals</label>
                  <input
                    type="number"
                    disabled={match.isLocked}
                    value={match.scoreA?.goals ?? ''}
                    onChange={(e) => handleScoreChange(match.id, 'scoreA', 'goals', e.target.value)}
                    className="w-full bg-slate-800 p-2 rounded border border-slate-700 font-bold text-amber-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Penalties</label>
                  <input
                    type="number"
                    disabled={match.isLocked}
                    value={match.scoreA?.penalties ?? ''}
                    onChange={(e) => handleScoreChange(match.id, 'scoreA', 'penalties', e.target.value)}
                    className="w-full bg-slate-800 p-2 rounded border border-slate-700 font-bold text-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* Team B */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
              <h4 className="font-extrabold text-amber-400 text-base mb-2">{match.teamB.name}</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Goals</label>
                  <input
                    type="number"
                    disabled={match.isLocked}
                    value={match.scoreB?.goals ?? ''}
                    onChange={(e) => handleScoreChange(match.id, 'scoreB', 'goals', e.target.value)}
                    className="w-full bg-slate-800 p-2 rounded border border-slate-700 font-bold text-amber-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Penalties</label>
                  <input
                    type="number"
                    disabled={match.isLocked}
                    value={match.scoreB?.penalties ?? ''}
                    onChange={(e) => handleScoreChange(match.id, 'scoreB', 'penalties', e.target.value)}
                    className="w-full bg-slate-800 p-2 rounded border border-slate-700 font-bold text-amber-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {!match.isLocked && (
            <button
              onClick={() => handleLockMatch(match.id)}
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md"
            >
              🔒 Save & Lock Football Match Result
            </button>
          )}
        </div>
      ))}
    </div>
  );
}