'use client';

import React, { useState } from 'react';

export default function ChessAdvancedModule({ participants, sportState, onUpdateSportState }) {
  const rounds = sportState?.rounds || [];
  const currentRoundIndex = sportState?.currentRoundIndex || 0;
  const categories = sportState?.categories || ['Open', 'Under 16', 'Veterans'];
  const [selectedCategory, setSelectedCategory] = useState('Open');
  
  const [advancementCount, setAdvancementCount] = useState(2);
  const [groupSize, setGroupSize] = useState(4);
  
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  const filteredParticipants = participants.filter(p => {
    if (!selectedCategory || selectedCategory === 'Open') return true;
    return p.category === selectedCategory || p.ageGroup === selectedCategory;
  });

  const handleInitializeRound1 = () => {
    if (filteredParticipants.length < 2) {
      alert('Not enough participants in this category to start Round 1.');
      return;
    }

    const shuffled = [...filteredParticipants].sort(() => 0.5 - Math.random());
    const initialGroups = [];
    let groupCharCode = 65;

    for (let i = 0; i < shuffled.length; i += groupSize) {
      const groupPlayers = shuffled.slice(i, i + groupSize);
      const groupName = `Group ${String.fromCharCode(groupCharCode++)}`;
      
      const standings = groupPlayers.map(p => ({
        id: p.id,
        name: p.name,
        flat: p.flat,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        points: 0,
      }));

      const matches = [];
      for (let x = 0; x < standings.length; x++) {
        for (let y = x + 1; y < standings.length; y++) {
          matches.push({
            id: `MATCH_${groupName}_${x}_${y}_${Date.now()}`,
            playerA: standings[x],
            playerB: standings[y],
            scoreA: null,
            scoreB: null,
            isLocked: false,
          });
        }
      }

      initialGroups.push({ groupName, standings, matches });
    }

    const newRounds = [{ roundName: 'Round 1 (Group Stage)', groups: initialGroups }];
    onUpdateSportState({ rounds: newRounds, currentRoundIndex: 0 });
    alert(`Round 1 initialized with ${initialGroups.length} groups for category: ${selectedCategory}!`);
  };

  const updateMatchScore = (groupIndex, matchId, scoreA, scoreB) => {
    const currentRound = rounds[currentRoundIndex];
    if (!currentRound) return;

    const updatedGroups = currentRound.groups.map((grp, gIdx) => {
      if (gIdx !== groupIndex) return grp;

      const updatedMatches = grp.matches.map(m => {
        if (m.id === matchId) {
          return { ...m, scoreA, scoreB, isLocked: true };
        }
        return m;
      });

      const newStandings = grp.standings.map(s => ({
        ...s,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        points: 0,
      }));

      updatedMatches.forEach(m => {
        if (m.isLocked && m.scoreA !== null && m.scoreB !== null) {
          const pA = newStandings.find(s => s.id === m.playerA.id);
          const pB = newStandings.find(s => s.id === m.playerB.id);
          if (pA && pB) {
            pA.played += 1;
            pB.played += 1;
            if (m.scoreA > m.scoreB) {
              pA.won += 1; pA.points += 1;
              pB.lost += 1;
            } else if (m.scoreB > m.scoreA) {
              pB.won += 1; pB.points += 1;
              pA.lost += 1;
            } else {
              pA.drawn += 1; pA.points += 0.5;
              pB.drawn += 1; pB.points += 0.5;
            }
          }
        }
      });

      return { ...grp, standings: newStandings, matches: updatedMatches };
    });

    const updatedRounds = [...rounds];
    updatedRounds[currentRoundIndex] = { ...currentRound, groups: updatedGroups };
    onUpdateSportState({ rounds: updatedRounds });
  };

  const handleAdvanceToNextRound = () => {
    const currentRound = rounds[currentRoundIndex];
    if (!currentRound) return;

    let qualifiedPlayers = [];
    currentRound.groups.forEach(grp => {
      const sorted = [...grp.standings].sort((a, b) => b.points - a.points || b.won - a.won);
      const topN = sorted.slice(0, advancementCount);
      qualifiedPlayers.push(...topN);
    });

    if (qualifiedPlayers.length < 2) {
      alert('Not enough qualified players to form the next round.');
      return;
    }

    let nextRoundName = 'Next Round';
    if (qualifiedPlayers.length === 8) nextRoundName = 'Quarter Finals';
    else if (qualifiedPlayers.length === 4) nextRoundName = 'Semi Finals';
    else if (qualifiedPlayers.length <= 2) nextRoundName = 'Grand Finals 🏆';

    const shuffled = [...qualifiedPlayers].sort(() => 0.5 - Math.random());
    const nextGroups = [];
    let groupCharCode = 65;
    const currentGroupSize = qualifiedPlayers.length <= 4 ? qualifiedPlayers.length : groupSize;

    for (let i = 0; i < shuffled.length; i += currentGroupSize) {
      const groupPlayers = shuffled.slice(i, i + currentGroupSize);
      const groupName = qualifiedPlayers.length <= 4 ? nextRoundName : `Group ${String.fromCharCode(groupCharCode++)}`;
      
      const standings = groupPlayers.map(p => ({
        id: p.id,
        name: p.name,
        flat: p.flat,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        points: 0,
      }));

      const matches = [];
      for (let x = 0; x < standings.length; x++) {
        for (let y = x + 1; y < standings.length; y++) {
          matches.push({
            id: `MATCH_${groupName}_${x}_${y}_${Date.now()}`,
            playerA: standings[x],
            playerB: standings[y],
            scoreA: null,
            scoreB: null,
            isLocked: false,
          });
        }
      }

      nextGroups.push({ groupName, standings, matches });
    }

    const updatedRounds = [...rounds, { roundName: nextRoundName, groups: nextGroups }];
    onUpdateSportState({ rounds: updatedRounds, currentRoundIndex: currentRoundIndex + 1 });
    alert(`Successfully advanced ${qualifiedPlayers.length} players to ${nextRoundName}!`);
  };

  const verifyAdminPassword = (e) => {
    e.preventDefault();
    if (adminPasswordInput === 'admin123' || adminPasswordInput === 'chess2026') {
      setIsAdminUnlocked(true);
      setAdminPasswordInput('');
      alert('Admin unlocked! You can now edit locked match results.');
    } else {
      alert('Incorrect admin password.');
    }
  };

  const currentRound = rounds[currentRoundIndex];
  const isGrandFinale = currentRound?.roundName?.toLowerCase().includes('grand finals');

  // Determine Champion if in Grand Finals
  let grandChampion = null;
  if (isGrandFinale && currentRound.groups.length > 0) {
    const allStandings = currentRound.groups.flatMap(g => g.standings);
    allStandings.sort((a, b) => b.points - a.points || b.won - a.won);
    grandChampion = allStandings[0];
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Category Selector */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-xl">
        <div>
          <h3 className="text-sm font-black text-amber-400">♟️ Chess Master Championship Suite</h3>
          <p className="text-xs text-slate-400">Multi-round Swiss/Group progression, grid scorekeeping, and category management.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-bold">Category:</span>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-slate-900 text-amber-400 font-bold rounded p-1 outline-none">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-bold">Top N Advance:</span>
            <select value={advancementCount} onChange={(e) => setAdvancementCount(Number(e.target.value))} className="bg-slate-900 text-amber-400 font-bold rounded p-1 outline-none">
              <option value={2}>Top 2</option>
              <option value={3}>Top 3</option>
              <option value={1}>Top 1</option>
            </select>
          </div>

          {rounds.length === 0 && (
            <button onClick={handleInitializeRound1} className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs shadow">
              🚀 Start Round 1
            </button>
          )}
        </div>
      </div>

      {/* Admin Security Bar */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold">Admin Override Security:</span>
          {isAdminUnlocked ? (
            <span className="bg-emerald-950 text-emerald-400 px-2.5 py-1 rounded font-black border border-emerald-500/20">Unlocked 🔓</span>
          ) : (
            <span className="bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded font-black border border-amber-500/20">Locked 🔒</span>
          )}
        </div>
        {!isAdminUnlocked && (
          <form onSubmit={verifyAdminPassword} className="flex gap-2">
            <input type="password" placeholder="Admin Password" value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} className="bg-slate-900 text-slate-200 px-3 py-1 rounded border border-slate-800 text-xs outline-none" />
            <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold px-3 py-1 rounded border border-slate-800">Unlock</button>
          </form>
        )}
      </div>

      {/* Round Tabs */}
      {rounds.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {rounds.map((r, idx) => (
            <button
              key={idx}
              onClick={() => onUpdateSportState({ currentRoundIndex: idx })}
              className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap border transition ${currentRoundIndex === idx ? 'bg-amber-500 text-slate-950 border-amber-400 shadow' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
            >
              {r.roundName}
            </button>
          ))}
        </div>
      )}

      {/* CURRENT ROUND LEADERBOARDS & GRID SCOREKEEPING */}
      {currentRound && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">{currentRound.roundName} Leaderboards & Groups</h4>
            
            {/* CONDITIONAL: Hide Regroup button if in Grand Finals */}
            {!isGrandFinale ? (
              <button onClick={handleAdvanceToNextRound} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded-xl text-xs shadow">
                ⚡ Regroup & Advance Top {advancementCount} to Next Round
              </button>
            ) : (
              <span className="text-xs bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-xl font-black border border-amber-500/20">
                🏆 Grand Finale Stage — Tournament Conclusion
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {currentRound.groups.map((grp, gIdx) => (
              <div key={grp.groupName} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h5 className="font-black text-amber-400 text-xs">{grp.groupName}</h5>
                  <span className="text-[10px] text-slate-400">Leaderboard & Standings</span>
                </div>

                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-2">Rank & Player</th>
                      <th className="pb-2">Flat</th>
                      <th className="pb-2">P</th>
                      <th className="pb-2">W</th>
                      <th className="pb-2">D</th>
                      <th className="pb-2">L</th>
                      <th className="pb-2 text-amber-400 font-black">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {grp.standings.sort((a, b) => b.points - a.points || b.won - a.won).map((s, rank) => (
                      <tr key={s.id} className={rank < advancementCount ? 'bg-emerald-950/20' : ''}>
                        <td className="py-2.5 font-bold text-slate-100 flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${rank < advancementCount ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                            {rank + 1}
                          </span>
                          {s.name}
                        </td>
                        <td className="py-2.5 text-slate-400">{s.flat}</td>
                        <td className="py-2.5 text-slate-300">{s.played}</td>
                        <td className="py-2.5 text-emerald-400">{s.won}</td>
                        <td className="py-2.5 text-yellow-400">{s.drawn}</td>
                        <td className="py-2.5 text-rose-400">{s.lost}</td>
                        <td className="py-2.5 font-black text-amber-300">{s.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Grid Scorekeeping Matrix */}
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Match Score Grid</span>
                  {grp.matches.map((m) => (
                    <div key={m.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="text-xs font-bold text-slate-200">
                        {m.playerA.name} <span className="text-amber-400 font-normal">vs</span> {m.playerB.name}
                      </div>

                      {m.isLocked && !isAdminUnlocked ? (
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] bg-emerald-950 text-emerald-400 px-2.5 py-1 rounded font-black border border-emerald-500/20">
                            Result: {m.scoreA} - {m.scoreB}
                          </span>
                          <span className="text-[10px] text-slate-500">Locked 🔒</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <select
                            value={m.scoreA !== null ? m.scoreA : ''}
                            onChange={(e) => updateMatchScore(gIdx, m.id, Number(e.target.value), m.scoreB !== null ? m.scoreB : 0)}
                            className="bg-slate-900 text-amber-400 font-bold text-xs p-1.5 rounded border border-slate-800 outline-none"
                          >
                            <option value="" disabled>{m.playerA.name} Score</option>
                            <option value={1}>1 (Win)</option>
                            <option value={0.5}>0.5 (Draw)</option>
                            <option value={0}>0 (Loss)</option>
                          </select>

                          <span className="text-slate-500 font-bold">-</span>

                          <select
                            value={m.scoreB !== null ? m.scoreB : ''}
                            onChange={(e) => updateMatchScore(gIdx, m.id, m.scoreA !== null ? m.scoreA : 0, Number(e.target.value))}
                            className="bg-slate-900 text-amber-400 font-bold text-xs p-1.5 rounded border border-slate-800 outline-none"
                          >
                            <option value="" disabled>{m.playerB.name} Score</option>
                            <option value={1}>1 (Win)</option>
                            <option value={0.5}>0.5 (Draw)</option>
                            <option value={0}>0 (Loss)</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* GRAND FINALE WINNER CELEBRATION BOX (Right Side replacement) */}
            {isGrandFinale && (
              <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-yellow-950/30 p-8 rounded-2xl border-2 border-amber-500/50 shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
                {/* Decorative glow / effects */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl"></div>
                <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-yellow-500/20 rounded-full blur-2xl"></div>

                <div className="w-20 h-20 bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 rounded-full flex items-center justify-center text-3xl font-black shadow-lg shadow-amber-500/40 mb-4 animate-bounce">
                  👑
                </div>

                <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-3 py-1 rounded-full uppercase tracking-widest mb-2 shadow">
                  Grand Champion Crowned 🎆
                </span>

                <h3 className="text-2xl font-black text-amber-300 mt-2">
                  {grandChampion ? grandChampion.name : 'Waiting for Final Result...'}
                </h3>

                <p className="text-xs text-slate-300 mt-1 font-bold">
                  {grandChampion ? `Flat: ${grandChampion.flat} • Total Points: ${grandChampion.points} Pts` : 'Complete the Grand Finale match grid to reveal the champion.'}
                </p>

                <div className="mt-6 flex items-center gap-2 text-xs text-amber-400/80 bg-slate-950/60 px-4 py-2 rounded-xl border border-amber-500/20">
                  <span>✨ Congratulations to the Ultimate Chess Master! ✨</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {rounds.length === 0 && (
        <div className="text-center py-20 bg-slate-900 rounded-2xl border border-slate-800 text-slate-400">
          Click &quot;Start Round 1&quot; above to generate groups and grid scorekeeping for Chess.
        </div>
      )}
    </div>
  );
}