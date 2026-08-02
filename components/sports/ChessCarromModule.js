'use client';

import React, { useState } from 'react';

export default function ChessCarromModule({ sportName, participants, sportState, onUpdateSportState }) {
  const groups = sportState?.groups || [];
  const matches = sportState?.matches || [];
  const [groupSizeSetting, setGroupSizeSetting] = useState(4);

  const initializeGroupsAndFixtures = () => {
    if (participants.length < 2) return alert('Need at least 2 participants for group distribution.');

    const shuffled = [...participants].sort(() => 0.5 - Math.random());
    const newGroups = [];
    let groupLetterCode = 65; // 'A'

    for (let i = 0; i < shuffled.length; i += groupSizeSetting) {
      const groupMembers = shuffled.slice(i, i + groupSizeSetting);
      const groupName = `Group ${String.fromCharCode(groupLetterCode)}`;
      groupLetterCode++;

      newGroups.push({
        name: groupName,
        standings: groupMembers.map(p => ({
          id: p.id,
          name: p.name,
          flat: p.flat,
          played: 0,
          won: 0,
          lost: 0,
          points: 0,
        })),
      });
    }

    // Generate Round Robin matches within each group
    const newMatches = [];
    newGroups.forEach(grp => {
      const members = grp.standings;
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          newMatches.push({
            id: `MATCH_${grp.name}_${i}_${j}_${Date.now()}`,
            groupName: grp.name,
            playerA: members[i],
            playerB: members[j],
            winnerId: null,
            isLocked: false,
          });
        }
      }
    });

    onUpdateSportState({ groups: newGroups, matches: newMatches });
    alert(`Successfully distributed ${participants.length} players into ${newGroups.length} groups!`);
  };

  const recordMatchWinner = (matchId, winnerId) => {
    const match = matches.find(m => m.id === matchId);
    if (!match || match.isLocked) return;

    const updatedMatches = matches.map(m => m.id === matchId ? { ...m, winnerId, isLocked: true } : m);
    const loserId = match.playerA.id === winnerId ? match.playerB.id : match.playerA.id;

    const updatedGroups = groups.map(grp => {
      if (grp.name === match.groupName) {
        return {
          ...grp,
          standings: grp.standings.map(s => {
            if (s.id === winnerId) return { ...s, played: s.played + 1, won: s.won + 1, points: s.points + 3 };
            if (s.id === loserId) return { ...s, played: s.played + 1, lost: s.lost + 1 };
            return s;
          }),
        };
      }
      return grp;
    });

    onUpdateSportState({ groups: updatedGroups, matches: updatedMatches });
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div>
          <h3 className="text-sm font-black text-amber-400">{sportName} — Group Stage & Round Robin</h3>
          <p className="text-xs text-slate-400">Distribute players into groups with custom group sizes and track standings.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-bold">Group Size:</span>
            <input type="number" min="2" max="10" value={groupSizeSetting} onChange={(e) => setGroupSizeSetting(parseInt(e.target.value) || 4)} className="w-12 bg-slate-900 text-amber-400 font-black text-center rounded p-1 outline-none" />
          </div>

          <button onClick={initializeGroupsAndFixtures} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs shadow">
            ⚡ Distribute into Groups
          </button>
        </div>
      </div>

      {/* Standings by Group */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groups.map((grp) => (
          <div key={grp.name} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
            <h4 className="text-xs font-black text-amber-400 mb-3 uppercase tracking-wider">{grp.name} Standings</h4>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2">Player</th>
                  <th className="pb-2">Flat</th>
                  <th className="pb-2">P</th>
                  <th className="pb-2">W</th>
                  <th className="pb-2">L</th>
                  <th className="pb-2 text-amber-400 font-black">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {grp.standings.sort((a,b) => b.points - a.points).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-950">
                    <td className="py-2.5 font-bold text-slate-100">{s.name}</td>
                    <td className="py-2.5 text-slate-400">{s.flat}</td>
                    <td className="py-2.5 text-slate-300">{s.played}</td>
                    <td className="py-2.5 text-emerald-400">{s.won}</td>
                    <td className="py-2.5 text-rose-400">{s.lost}</td>
                    <td className="py-2.5 font-black text-amber-300">{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Fixtures by Group */}
      <div className="space-y-3">
        <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">Group Match Fixtures</h4>
        {matches.map((m) => (
          <div key={m.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
            <div>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-black border border-amber-500/20 mr-2">{m.groupName}</span>
              <span className="font-bold text-xs text-slate-200">{m.playerA.name} vs {m.playerB.name}</span>
            </div>
            {m.isLocked ? (
              <span className="text-xs bg-emerald-950 text-emerald-400 px-3 py-1 rounded font-black border border-emerald-500/20">
                Winner: {m.winnerId === m.playerA.id ? m.playerA.name : m.playerB.name}
              </span>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => recordMatchWinner(m.id, m.playerA.id)} className="bg-slate-950 hover:bg-slate-800 text-amber-400 px-3 py-1.5 rounded text-[10px] font-bold border border-slate-800">
                  {m.playerA.name} Won
                </button>
                <button onClick={() => recordMatchWinner(m.id, m.playerB.id)} className="bg-slate-950 hover:bg-slate-800 text-amber-400 px-3 py-1.5 rounded text-[10px] font-bold border border-slate-800">
                  {m.playerB.name} Won
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}