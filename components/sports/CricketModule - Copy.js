'use client';

import React, { useState, useEffect } from 'react';
import { generateKnockoutBracket } from '@/lib/tournamentEngine';

export default function CricketModule({ teams, sportState, onUpdateSportState }) {
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
        const runsA = Number(m.scoreA?.runs) || 0;
        const runsB = Number(m.scoreB?.runs) || 0;
        let winnerId = null;
        let winnerName = null;

        if (runsA > runsB) {
          winnerId = m.teamA.id;
          winnerName = m.teamA.name;
        } else if (runsB > runsA) {
          winnerId = m.teamB.id;
          winnerName = m.teamB.name;
        } else {
          winnerName = 'Tie / Super Over Required';
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
            match.isLocked ? 'bg-slate-855 border-emerald-600/50' : 'bg-slate-800 border-slate-700'
          }`}
        >
          <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
            <span className="text-xs font-bold text-amber-400">Cricket • {match.stage}</span>
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
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Runs</label>
                  <input
                    type="number"
                    disabled={match.isLocked}
                    value={match.scoreA?.runs ?? ''}
                    onChange={(e) => handleScoreChange(match.id, 'scoreA', 'runs', e.target.value)}
                    className="w-full bg-slate-800 p-2 rounded border border-slate-700 font-bold text-amber-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Wickets</label>
                  <input
                    type="number"
                    disabled={match.isLocked}
                    value={match.scoreA?.wickets ?? ''}
                    onChange={(e) => handleScoreChange(match.id, 'scoreA', 'wickets', e.target.value)}
                    className="w-full bg-slate-800 p-2 rounded border border-slate-700 font-bold text-amber-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Overs</label>
                  <input
                    type="text"
                    disabled={match.isLocked}
                    value={match.scoreA?.overs ?? ''}
                    onChange={(e) => handleScoreChange(match.id, 'scoreA', 'overs', e.target.value)}
                    className="w-full bg-slate-800 p-2 rounded border border-slate-700 font-bold text-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* Team B */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
              <h4 className="font-extrabold text-amber-400 text-base mb-2">{match.teamB.name}</h4>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Runs</label>
                  <input
                    type="number"
                    disabled={match.isLocked}
                    value={match.scoreB?.runs ?? ''}
                    onChange={(e) => handleScoreChange(match.id, 'scoreB', 'runs', e.target.value)}
                    className="w-full bg-slate-800 p-2 rounded border border-slate-700 font-bold text-amber-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Wickets</label>
                  <input
                    type="number"
                    disabled={match.isLocked}
                    value={match.scoreB?.wickets ?? ''}
                    onChange={(e) => handleScoreChange(match.id, 'scoreB', 'wickets', e.target.value)}
                    className="w-full bg-slate-800 p-2 rounded border border-slate-700 font-bold text-amber-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Overs</label>
                  <input
                    type="text"
                    disabled={match.isLocked}
                    value={match.scoreB?.overs ?? ''}
                    onChange={(e) => handleScoreChange(match.id, 'scoreB', 'overs', e.target.value)}
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
              🔒 Save & Lock Cricket Match Result
            </button>
          )}
        </div>
      ))}
    </div>
  );
}