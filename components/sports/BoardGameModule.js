'use client';

import React from 'react';
import { generateKnockoutBracket } from '@/lib/tournamentEngine';

export default function BoardGameModule({ sportName, teams, sportState, onUpdateSportState }) {
  const currentStage = sportState?.currentStage || 'Round 1';
  const matches = sportState?.matches || generateKnockoutBracket(teams, currentStage).matches;
  const byes = sportState?.byes || generateKnockoutBracket(teams, currentStage).byes;

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
        const scoreA = Number(m.scoreA?.score) || 0;
        const scoreB = Number(m.scoreB?.score) || 0;
        let winnerId = null;
        let winnerName = null;

        if (scoreA > scoreB) {
          winnerId = m.teamA.id;
          winnerName = m.teamA.name;
        } else if (scoreB > scoreA) {
          winnerId = m.teamB.id;
          winnerName = m.teamB.name;
        } else {
          winnerName = 'Draw / Tie-Break Required';
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
      {byes.length > 0 && (
        <div className="bg-amber-950/60 border border-amber-600 text-amber-300 p-4 rounded-xl text-xs font-bold">
          🎁 <strong>AUTOMATIC BYE:</strong> {byes.map((b) => b.name).join(', ')} advances directly to the next round.
        </div>
      )}

      {matches.filter((m) => m.stage === currentStage).map((match) => (
        <div
          key={match.id}
          className={`p-5 rounded-2xl border ${
            match.isLocked ? 'bg-slate-900 border-emerald-600/50' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-amber-400">{sportName} • {match.stage}</span>
            {match.isLocked && (
              <span className="text-xs bg-emerald-950 text-emerald-400 px-3 py-1 rounded-full font-black">
                🔒 Winner: {match.winnerName}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Competitor A */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h4 className="font-extrabold text-amber-400 text-base mb-2">{match.teamA.name}</h4>
              <div className="text-xs text-slate-400 mb-2">
                {match.teamA.members?.map(m => m.name).join(', ') || ''}
              </div>
              <div>
                <label className="text-slate-400 block mb-1 text-xs">Sets / Points Won</label>
                <input
                  type="number"
                  disabled={match.isLocked}
                  value={match.scoreA?.score ?? ''}
                  onChange={(e) => handleScoreChange(match.id, 'scoreA', 'score', e.target.value)}
                  className="w-full bg-slate-900 p-2.5 rounded-xl border border-slate-800 font-bold text-amber-400 text-xs"
                />
              </div>
            </div>

            {/* Competitor B */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h4 className="font-extrabold text-amber-400 text-base mb-2">{match.teamB.name}</h4>
              <div className="text-xs text-slate-400 mb-2">
                {match.teamB.members?.map(m => m.name).join(', ') || ''}
              </div>
              <div>
                <label className="text-slate-400 block mb-1 text-xs">Sets / Points Won</label>
                <input
                  type="number"
                  disabled={match.isLocked}
                  value={match.scoreB?.score ?? ''}
                  onChange={(e) => handleScoreChange(match.id, 'scoreB', 'score', e.target.value)}
                  className="w-full bg-slate-900 p-2.5 rounded-xl border border-slate-800 font-bold text-amber-400 text-xs"
                />
              </div>
            </div>
          </div>

          {!match.isLocked && (
            <button
              onClick={() => handleLockMatch(match.id)}
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md"
            >
              🔒 Save & Lock {sportName} Match Result
            </button>
          )}
        </div>
      ))}
    </div>
  );
}