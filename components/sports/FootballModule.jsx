'use client';

import React, { useState, useMemo, useCallback } from 'react';

export default function FootballModule({ participants, sportState, onUpdateSportState }) {
  // sportState structure: { teams: [], matches: [], activeTab: 'teams' }
  const rawTeams = sportState.teams || [];
  const matches = sportState.matches || [];
  const activeTab = sportState.activeTab || 'teams'; // 'teams', 'auction', 'fixtures', 'leaderboard'

  // Team creation form state
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedRole, setSelectedRole] = useState('Forward');
  const [activeTeamId, setActiveTeamId] = useState(null);

  // Auction state
  const [auctionPlayerId, setAuctionPlayerId] = useState('');
  const [auctionWinningTeamId, setAuctionWinningTeamId] = useState('');
  const [auctionSoldPrice, setAuctionSoldPrice] = useState(100);

  // 1. Memoized Teams with Default Purse Initialization
  const teams = useMemo(() => {
    return rawTeams.map(t => ({
      ...t,
      purse: t.purse !== undefined ? t.purse : 1000
    }));
  }, [rawTeams]);

  const setSportTab = useCallback((tab) => {
    onUpdateSportState({ activeTab: tab });
  }, [onUpdateSportState]);

  // --- DOWNLOAD ALL PLAYERS DATA (CSV) WITH AGE, PHASE, & FLAT NO. ---
  const handleDownloadAllPlayers = useCallback(() => {
    const allPlayersData = participants.map(p => {
      const pId = (p.id || p.regId || p.Registration_ID).toString();
      let assignedTeam = 'Unassigned';
      let role = 'N/A';
      let goals = 0;
      let soldPrice = 0;

      for (const t of teams) {
        const foundPlayer = t.players.find(tp => tp.id.toString() === pId);
        if (foundPlayer) {
          assignedTeam = t.name;
          role = foundPlayer.role;
          goals = foundPlayer.goals;
          soldPrice = foundPlayer.soldPrice;
          break;
        }
      }

      return {
        id: pId,
        name: p.name,
        age: p.age || p.ageGroup || 'N/A',
        phase: p.phase || p.block || 'N/A',
        flatNo: p.flat || p.flatNo || p.apartment || 'N/A',
        team: assignedTeam,
        role: role,
        goals: goals,
        soldPrice: soldPrice
      };
    });

    const headers = ['Player ID', 'Name', 'Age', 'Phase', 'Flat No.', 'Team', 'Position / Role', 'Goals Scored', 'Sold Price (pts)'];
    const rows = allPlayersData.map(p => [
      p.id,
      `"${p.name}"`,
      `"${p.age}"`,
      `"${p.phase}"`,
      `"${p.flatNo}"`,
      `"${p.team}"`,
      `"${p.role}"`,
      p.goals,
      p.soldPrice
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `football_all_players_data_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [participants, teams]);

  // Add Team
  const handleCreateTeam = useCallback((e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    const newTeam = {
      id: 'team_' + Date.now(),
      name: newTeamName.trim(),
      purse: 1000,
      players: []
    };
    onUpdateSportState({ teams: [...teams, newTeam] });
    setNewTeamName('');
    if (!activeTeamId) setActiveTeamId(newTeam.id);
  }, [newTeamName, teams, activeTeamId, onUpdateSportState]);

  const handleDeleteTeam = useCallback((teamId) => {
    onUpdateSportState({
      teams: teams.filter(t => t.id !== teamId),
      matches: matches.filter(m => m.teamAId !== teamId && m.teamBId !== teamId)
    });
    if (activeTeamId === teamId) setActiveTeamId(null);
  }, [teams, matches, activeTeamId, onUpdateSportState]);

  // Assign player to active team (Manual Direct Assignment)
  const handleAddPlayerToTeam = useCallback((teamId) => {
    if (!selectedPlayerId) return;
    const playerObj = participants.find(p => (p.id || p.regId || p.Registration_ID).toString() === selectedPlayerId.toString());
    if (!playerObj) return;

    const updatedTeams = teams.map(t => {
      if (t.id === teamId) {
        if (t.players.some(p => p.id.toString() === selectedPlayerId.toString())) {
          alert('Player is already in this team!');
          return t;
        }
        return {
          ...t,
          players: [
            ...t.players,
            {
              id: playerObj.id || playerObj.regId || playerObj.Registration_ID,
              name: playerObj.name,
              role: selectedRole,
              goals: 0,
              soldPrice: 0
            }
          ]
        };
      }
      return t;
    });

    onUpdateSportState({ teams: updatedTeams });
    setSelectedPlayerId('');
  }, [selectedPlayerId, participants, teams, selectedRole, onUpdateSportState]);

  const handleRemovePlayerFromTeam = useCallback((teamId, playerId) => {
    const updatedTeams = teams.map(t => {
      if (t.id === teamId) {
        const removedPlayer = t.players.find(p => p.id.toString() === playerId.toString());
        const refund = removedPlayer?.soldPrice || 0;
        return {
          ...t,
          purse: t.purse + refund,
          players: t.players.filter(p => p.id.toString() !== playerId.toString())
        };
      }
      return t;
    });
    onUpdateSportState({ teams: updatedTeams });
  }, [teams, onUpdateSportState]);

  const handleUpdatePlayerRole = useCallback((teamId, playerId, newRole) => {
    const updatedTeams = teams.map(t => {
      if (t.id === teamId) {
        return {
          ...t,
          players: t.players.map(p => p.id.toString() === playerId.toString() ? { ...p, role: newRole } : p)
        };
      }
      return t;
    });
    onUpdateSportState({ teams: updatedTeams });
  }, [teams, onUpdateSportState]);

  // --- AUCTION HANDLER ---
  const handleConductAuction = useCallback(() => {
    if (!auctionPlayerId) {
      alert('Please select a player to auction.');
      return;
    }
    if (!auctionWinningTeamId) {
      alert('Please select the winning team for this auction.');
      return;
    }
    const price = Number(auctionSoldPrice) || 0;
    const winningTeam = teams.find(t => t.id === auctionWinningTeamId);
    if (!winningTeam) return;

    if (winningTeam.purse < price) {
      alert(`Team "${winningTeam.name}" does not have enough purse (${winningTeam.purse} pts remaining) for this bid (${price} pts)!`);
      return;
    }

    const playerObj = participants.find(p => (p.id || p.regId || p.Registration_ID).toString() === auctionPlayerId.toString());
    if (!playerObj) return;

    const updatedTeams = teams.map(t => {
      if (t.id === auctionWinningTeamId) {
        return {
          ...t,
          purse: t.purse - price,
          players: [
            ...t.players,
            {
              id: playerObj.id || playerObj.regId || playerObj.Registration_ID,
              name: playerObj.name,
              role: 'Forward',
              goals: 0,
              soldPrice: price
            }
          ]
        };
      }
      return t;
    });

    onUpdateSportState({ teams: updatedTeams });
    setAuctionPlayerId('');
    setAuctionSoldPrice(100);
    alert(`Successfully sold ${playerObj.name} to ${winningTeam.name} for ${price} points!`);
  }, [auctionPlayerId, auctionWinningTeamId, auctionSoldPrice, teams, participants, onUpdateSportState]);

  // Generate Fixtures / Rounds
  const generateFixtures = useCallback((roundName = 'League Round') => {
    if (teams.length < 2) {
      alert('Please create at least 2 teams to generate fixtures.');
      return;
    }
    const newMatches = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        newMatches.push({
          id: 'match_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          round: roundName,
          teamAId: teams[i].id,
          teamBId: teams[j].id,
          teamAScore: 0,
          teamBScore: 0,
          scorerEvents: [],
          completed: false
        });
      }
    }
    onUpdateSportState({ matches: [...matches, ...newMatches], activeTab: 'fixtures' });
  }, [teams, matches, onUpdateSportState]);

  const generateKnockoutStage = useCallback((roundName) => {
    if (teams.length < 2) {
      alert('Not enough teams for knockout stage.');
      return;
    }
    const newMatches = [];
    for (let i = 0; i < teams.length - 1; i += 2) {
      newMatches.push({
        id: 'match_' + Date.now() + '_' + i,
        round: roundName,
        teamAId: teams[i].id,
        teamBId: teams[i + 1].id,
        teamAScore: 0,
        teamBScore: 0,
        scorerEvents: [],
        completed: false
      });
    }
    onUpdateSportState({ matches: [...matches, ...newMatches], activeTab: 'fixtures' });
  }, [teams, matches, onUpdateSportState]);

  // Update Match Goal / Scorer Event
  const handleUpdateMatchScore = useCallback((matchId, teamAId, teamBId, teamAScore, teamBScore, scorerEvents) => {
    const updatedMatches = matches.map(m => {
      if (m.id === matchId) {
        return { ...m, teamAScore, teamBScore, scorerEvents, completed: true };
      }
      return m;
    });

    const freshTeams = teams.map(t => ({
      ...t,
      players: t.players.map(p => ({ ...p, goals: 0 }))
    }));

    updatedMatches.forEach(m => {
      if (m.scorerEvents && m.scorerEvents.length > 0) {
        m.scorerEvents.forEach(ev => {
          freshTeams.forEach(t => {
            if (t.id === ev.teamId) {
              t.players = t.players.map(p => p.id.toString() === ev.playerId.toString() ? { ...p, goals: p.goals + Number(ev.goals || 0) } : p);
            }
          });
        });
      }
    });

    onUpdateSportState({ matches: updatedMatches, teams: freshTeams });
  }, [matches, teams, onUpdateSportState]);

  // 2. Memoized Unassigned Participants & Leaderboard Calculations
  const { unassignedParticipants, allPlayersWithStats, topScorer, isGrandFinaleCompleted, finaleWinner } = useMemo(() => {
    const assignedPlayerIds = new Set(teams.flatMap(t => t.players.map(p => p.id.toString())));
    const unassigned = participants.filter(p => {
      const pId = (p.id || p.regId || p.Registration_ID).toString();
      return !assignedPlayerIds.has(pId);
    });

    const allStats = teams.flatMap(t => 
      t.players.map(p => ({ ...p, teamName: t.name, teamId: t.id }))
    ).sort((a, b) => b.goals - a.goals);

    const top = allStats[0];
    const isCompleted = matches.some(m => m.round === 'Grand Finale' && m.completed);
    const finaleMatch = matches.find(m => m.round === 'Grand Finale');
    
    let winner = null;
    if (isCompleted && finaleMatch) {
      if (finaleMatch.teamAScore > finaleMatch.teamBScore) {
        winner = teams.find(t => t.id === finaleMatch.teamAId)?.name;
      } else if (finaleMatch.teamBScore > finaleMatch.teamAScore) {
        winner = teams.find(t => t.id === finaleMatch.teamBId)?.name;
      } else {
        winner = 'Draw / Penalty Shootout Winner';
      }
    }

    return {
      unassignedParticipants: unassigned,
      allPlayersWithStats: allStats,
      topScorer: top,
      isGrandFinaleCompleted: isCompleted,
      finaleWinner: winner
    };
  }, [teams, participants, matches]);

  return (
    <div className="space-y-6">
      {/* Grand Finale Fireworks Banner */}
      {isGrandFinaleCompleted && (
        <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 p-6 rounded-2xl text-slate-950 text-center font-black shadow-2xl animate-pulse space-y-2 border-4 border-amber-300">
          <div className="text-3xl">🎆 🏆 GRAND FINALE CHAMPIONS 🏆 🎇</div>
          <div className="text-xl tracking-wider uppercase">Winner: {finaleWinner}</div>
          <p className="text-xs font-bold text-slate-900">Congratulations on an extraordinary tournament performance!</p>
        </div>
      )}

      {/* Sub-navigation tabs and Download button for Football */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setSportTab('teams')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition ${activeTab === 'teams' ? 'bg-amber-400 text-slate-950' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'}`}
          >
            🛡️ Teams & Player Roles ({teams.length})
          </button>
          <button
            onClick={() => setSportTab('auction')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition ${activeTab === 'auction' ? 'bg-amber-400 text-slate-950' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'}`}
          >
            💰 Player Auction & Purses
          </button>
          <button
            onClick={() => setSportTab('fixtures')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition ${activeTab === 'fixtures' ? 'bg-amber-400 text-slate-950' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'}`}
          >
            ⚽ Matches & Side-by-Side Scoring ({matches.length})
          </button>
          <button
            onClick={() => setSportTab('leaderboard')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition ${activeTab === 'leaderboard' ? 'bg-amber-400 text-slate-950' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'}`}
          >
            🏆 Top Goal Scorers Leaderboard
          </button>
        </div>

        <button
          onClick={handleDownloadAllPlayers}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black transition flex items-center gap-2 shadow"
        >
          <span>📥 Download All Players Data (CSV)</span>
        </button>
      </div>

      {/* TAB 1: TEAMS & ROLES */}
      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-black text-amber-400">Create Football Team</h3>
            <form onSubmit={handleCreateTeam} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Team Name</label>
                <input
                  type="text"
                  placeholder="e.g., FC Strikers"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs font-bold text-slate-100 outline-none"
                />
              </div>
              <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black p-2.5 rounded-xl text-xs transition shadow">
                + Add Team
              </button>
            </form>

            <div className="border-t border-slate-800 pt-4 space-y-2">
              <h4 className="text-xs font-black text-slate-300">Available Registered Participants ({participants.length})</h4>
              <p className="text-[10px] text-slate-500">Select participant, assign position, and add to active team directly or use the Auction tab.</p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {teams.length === 0 ? (
              <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs font-bold">
                No football teams created yet. Create a team on the left to begin distributing players.
              </div>
            ) : (
              teams.map((team) => {
                const isActive = activeTeamId === team.id || teams.length === 1;
                return (
                  <div key={team.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-black text-amber-300">{team.name}</h4>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-slate-400">Squad: {team.players.length} Players</span>
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-900/60 px-2 py-0.5 rounded-md">Purse: {team.purse} pts</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveTeamId(team.id)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border ${isActive ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-950 text-slate-300 border-slate-800'}`}
                        >
                          {isActive ? 'Active for Assignment' : 'Select Team'}
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team.id)}
                          className="bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-900/60 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                        >
                          Delete Team
                        </button>
                      </div>
                    </div>

                    {isActive && (
                      <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Select Participant</label>
                          <select
                            value={selectedPlayerId}
                            onChange={(e) => setSelectedPlayerId(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs font-bold text-slate-200 outline-none"
                          >
                            <option value="">-- Choose Player --</option>
                            {participants.map(p => {
                              const pId = p.id || p.regId || p.Registration_ID;
                              return (
                                <option key={pId} value={pId}>
                                  {p.name} ({p.flat || p.ageGroup || 'General'})
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Position / Role</label>
                          <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs font-bold text-slate-200 outline-none"
                          >
                            <option value="Forward">Forward</option>
                            <option value="Mid Field">Mid Field</option>
                            <option value="Defender">Defender</option>
                            <option value="Goal Keeper">Goal Keeper</option>
                          </select>
                        </div>

                        <button
                          onClick={() => handleAddPlayerToTeam(team.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-2 rounded-lg text-xs transition"
                        >
                          + Assign to Team
                        </button>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                            <th className="py-2 px-2">Player Name</th>
                            <th className="py-2 px-2">Position / Role</th>
                            <th className="py-2 px-2 text-center">Sold Price</th>
                            <th className="py-2 px-2 text-center">Goals Scored</th>
                            <th className="py-2 px-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {team.players.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="py-4 text-center text-slate-500 italic text-[11px]">
                                No players assigned to this team yet.
                              </td>
                            </tr>
                          ) : (
                            team.players.map(player => (
                              <tr key={player.id} className="hover:bg-slate-950/40">
                                <td className="py-2 px-2 font-bold text-slate-200">{player.name}</td>
                                <td className="py-2 px-2">
                                  <select
                                    value={player.role}
                                    onChange={(e) => handleUpdatePlayerRole(team.id, player.id, e.target.value)}
                                    className="bg-slate-950 border border-slate-800 text-[10px] font-bold text-amber-300 p-1 rounded outline-none"
                                  >
                                    <option value="Forward">Forward</option>
                                    <option value="Mid Field">Mid Field</option>
                                    <option value="Defender">Defender</option>
                                    <option value="Goal Keeper">Goal Keeper</option>
                                  </select>
                                </td>
                                <td className="py-2 px-2 text-center text-amber-400 font-semibold">{player.soldPrice || 0} pts</td>
                                <td className="py-2 px-2 text-center font-black text-emerald-400">{player.goals} ⚽</td>
                                <td className="py-2 px-2 text-right">
                                  <button
                                    onClick={() => handleRemovePlayerFromTeam(team.id, player.id)}
                                    className="text-red-400 hover:text-red-300 text-[10px] font-bold"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PLAYER AUCTION & PURSES */}
      {activeTab === 'auction' && (
        <div className="space-y-6">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-amber-400">💰 Live Player Auction & Team Budgets</h3>
                <p className="text-xs text-slate-400">Auction unassigned participants to teams by deducting points from their respective tournament purses.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {teams.map(t => (
                  <div key={t.id} className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-slate-400 block">{t.name}</span>
                    <span className="text-xs font-black text-emerald-400">{t.purse} pts</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 items-end">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Select Unassigned Player ({unassignedParticipants.length} left)</label>
                <select
                  value={auctionPlayerId}
                  onChange={(e) => setAuctionPlayerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-xs font-bold text-slate-200 outline-none"
                >
                  <option value="">-- Choose Unsold Player --</option>
                  {unassignedParticipants.map(p => {
                    const pId = p.id || p.regId || p.Registration_ID;
                    return (
                      <option key={pId} value={pId}>
                        {p.name} ({p.flat || p.ageGroup || 'General'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Winning Team</label>
                <select
                  value={auctionWinningTeamId}
                  onChange={(e) => setAuctionWinningTeamId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-xs font-bold text-slate-200 outline-none"
                >
                  <option value="">-- Choose Winning Team --</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name} (Purse: {t.purse} pts)</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Final Bid / Sold Price (pts)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={auctionSoldPrice}
                    onChange={(e) => setAuctionSoldPrice(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-xs font-bold text-amber-400 outline-none"
                  />
                  <button
                    onClick={handleConductAuction}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition whitespace-nowrap shadow"
                  >
                    🔨 Hammer Down (Sell)
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-sm font-black text-amber-300">Unsold / Unassigned Players Pool ({unassignedParticipants.length})</h4>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {unassignedParticipants.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">All registered participants have been assigned or auctioned into teams!</p>
                ) : (
                  unassignedParticipants.map(p => {
                    const pId = p.id || p.regId || p.Registration_ID;
                    return (
                      <div key={pId} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-200">{p.name}</span>
                        <span className="text-[10px] text-slate-400">{p.flat || p.ageGroup || 'General'}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-sm font-black text-amber-300">Team Auction Summaries</h4>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {teams.map(t => (
                  <div key={t.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-black text-amber-400">{t.name}</span>
                      <span className="font-bold text-emerald-400">Purse Left: {t.purse} pts</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Squad Size: {t.players.length} players | Spent: {t.players.reduce((acc, p) => acc + (p.soldPrice || 0), 0)} pts
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FIXTURES & SIDE-BY-SIDE SCORING SUITE */}
      {activeTab === 'fixtures' && (
        <div className="space-y-6">
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-wrap justify-between items-center gap-4">
            <div>
              <h3 className="text-sm font-black text-amber-400">Tournament Stages & Fixtures</h3>
              <p className="text-[10px] text-slate-400">Generate matches through rounds, quarter finals, semi finals, and finals.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => generateFixtures('Group / League Round')}
                className="bg-slate-950 hover:bg-slate-800 text-amber-400 border border-slate-800 px-3 py-2 rounded-xl text-xs font-black shadow"
              >
                + Generate League Fixtures
              </button>
              <button
                onClick={() => generateKnockoutStage('Quarter Finals')}
                className="bg-slate-950 hover:bg-slate-800 text-amber-400 border border-slate-800 px-3 py-2 rounded-xl text-xs font-black shadow"
              >
                + Quarter Finals
              </button>
              <button
                onClick={() => generateKnockoutStage('Semi Finals')}
                className="bg-slate-950 hover:bg-slate-800 text-amber-400 border border-slate-800 px-3 py-2 rounded-xl text-xs font-black shadow"
              >
                + Semi Finals
              </button>
              <button
                onClick={() => generateKnockoutStage('Grand Finale')}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-2 rounded-xl text-xs font-black shadow"
              >
                + Grand Finale
              </button>
            </div>
          </div>

          {matches.length === 0 ? (
            <div className="bg-slate-900 p-12 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs font-bold">
              No matches generated yet. Click above to generate fixtures for the tournament.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {matches.map((match) => {
                const teamA = teams.find(t => t.id === match.teamAId) || { name: 'Team A (Deleted)', players: [] };
                const teamB = teams.find(t => t.id === match.teamBId) || { name: 'Team B (Deleted)', players: [] };

                return (
                  <MatchScoringCard
                    key={match.id}
                    match={match}
                    teamA={teamA}
                    teamB={teamB}
                    onSaveMatch={(aScore, bScore, events) => handleUpdateMatchScore(match.id, match.teamAId, match.teamBId, aScore, bScore, events)}
                    onDeleteMatch={() => {
                      onUpdateSportState({ matches: matches.filter(m => m.id !== match.id) });
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6 shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-black text-amber-400">🏆 Top Goal Scorers Leaderboard</h3>
              <p className="text-xs text-slate-400">Cumulative record of goals scored by every player across all tournament stages until the Grand Finale.</p>
            </div>
            {topScorer && (
              <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-right">
                <span className="text-[10px] text-amber-400 font-bold block">Current Top Scorer</span>
                <span className="text-xs font-black text-emerald-400">{topScorer.name} ({topScorer.teamName}) - {topScorer.goals} ⚽</span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                  <th className="py-3 px-3">Rank</th>
                  <th className="py-3 px-3">Player Name</th>
                  <th className="py-3 px-3">Team</th>
                  <th className="py-3 px-3">Position</th>
                  <th className="py-3 px-3 text-center">Total Goals Scored</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {allPlayersWithStats.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-slate-500 italic text-xs">
                      No player performance records yet. Start recording goals in match fixtures.
                    </td>
                  </tr>
                ) : (
                  allPlayersWithStats.map((player, idx) => (
                    <tr key={player.id + '-' + player.teamId} className="hover:bg-slate-950/40">
                      <td className="py-3 px-3 font-black text-amber-400">#{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-100">{player.name}</td>
                      <td className="py-3 px-3 text-amber-300 font-semibold">{player.teamName}</td>
                      <td className="py-3 px-3 text-slate-400">{player.role}</td>
                      <td className="py-3 px-3 text-center font-black text-emerald-400 text-sm">{player.goals} ⚽</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// 3. Memoized Match Scoring Card to prevent unnecessary re-render propagation
const MatchScoringCard = React.memo(function MatchScoringCard({ match, teamA, teamB, onSaveMatch, onDeleteMatch }) {
  const [teamAScore, setTeamAScore] = useState(match.teamAScore || 0);
  const [teamBScore, setTeamBScore] = useState(match.teamBScore || 0);
  const [scorerEvents, setScorerEvents] = useState(match.scorerEvents || []);

  const [selectedScorerTeamId, setSelectedScorerTeamId] = useState(teamA.id);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [goalCount, setGoalCount] = useState(1);

  const activeScorerTeam = selectedScorerTeamId === teamA.id ? teamA : teamB;

  const handleAddGoalEvent = () => {
    if (!selectedPlayerId) return;
    const playerObj = activeScorerTeam.players.find(p => p.id.toString() === selectedPlayerId.toString());
    if (!playerObj) return;

    const newEvent = {
      id: 'event_' + Date.now(),
      teamId: activeScorerTeam.id,
      teamName: activeScorerTeam.name,
      playerId: playerObj.id,
      playerName: playerObj.name,
      goals: Number(goalCount)
    };

    const updatedEvents = [...scorerEvents, newEvent];
    setScorerEvents(updatedEvents);

    let aSum = 0;
    let bSum = 0;
    updatedEvents.forEach(ev => {
      if (ev.teamId === teamA.id) aSum += ev.goals;
      if (ev.teamId === teamB.id) bSum += ev.goals;
    });
    setTeamAScore(aSum);
    setTeamBScore(bSum);
    setSelectedPlayerId('');
  };

  const handleRemoveEvent = (index) => {
    const updatedEvents = scorerEvents.filter((_, i) => i !== index);
    setScorerEvents(updatedEvents);

    let aSum = 0;
    let bSum = 0;
    updatedEvents.forEach(ev => {
      if (ev.teamId === teamA.id) aSum += ev.goals;
      if (ev.teamId === teamB.id) bSum += ev.goals;
    });
    setTeamAScore(aSum);
    setTeamBScore(bSum);
  };

  const handleSave = () => {
    onSaveMatch(teamAScore, teamBScore, scorerEvents);
    alert('Match score and player statistics saved successfully!');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <span className="bg-amber-400 text-slate-950 text-xs font-black px-2.5 py-1 rounded-lg uppercase">{match.round}</span>
          <span className="text-xs text-slate-400">{match.completed ? '✅ Completed' : '⚔️ Live / Pending'}</span>
        </div>
        <button onClick={onDeleteMatch} className="text-red-400 hover:text-red-300 text-xs font-bold">Delete Match</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
        <div className="text-center md:text-left space-y-2 border-b md:border-b-0 md:border-r border-slate-800 pb-4 md:pb-0 md:pr-4">
          <h4 className="text-sm font-black text-amber-300">{teamA.name}</h4>
          <div className="flex items-center justify-center md:justify-start gap-3">
            <span className="text-xs text-slate-400">Total Goals:</span>
            <input
              type="number"
              value={teamAScore}
              onChange={(e) => setTeamAScore(Number(e.target.value))}
              className="w-20 bg-slate-900 border border-slate-800 text-center text-lg font-black text-emerald-400 p-1.5 rounded-xl outline-none"
            />
          </div>
          <div className="text-[10px] text-slate-500">Squad players: {teamA.players.length}</div>
        </div>

        <div className="text-center md:text-right space-y-2 pt-2 md:pt-0">
          <h4 className="text-sm font-black text-amber-300">{teamB.name}</h4>
          <div className="flex items-center justify-center md:justify-end gap-3">
            <input
              type="number"
              value={teamBScore}
              onChange={(e) => setTeamBScore(Number(e.target.value))}
              className="w-20 bg-slate-900 border border-slate-800 text-center text-lg font-black text-emerald-400 p-1.5 rounded-xl outline-none"
            />
            <span className="text-xs text-slate-400">: Total Goals</span>
          </div>
          <div className="text-[10px] text-slate-500">Squad players: {teamB.players.length}</div>
        </div>
      </div>

      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
        <h5 className="text-xs font-black text-slate-300">⚽ Individual Player Goal Recorder</h5>
        
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">Scoring Team</label>
            <select
              value={selectedScorerTeamId}
              onChange={(e) => {
                setSelectedScorerTeamId(e.target.value);
                setSelectedPlayerId('');
              }}
              className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs font-bold text-slate-200 outline-none"
            >
              <option value={teamA.id}>{teamA.name}</option>
              <option value={teamB.id}>{teamB.name}</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">Player</label>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs font-bold text-slate-200 outline-none"
            >
              <option value="">-- Select Goal Scorer --</option>
              {activeScorerTeam.players.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">Goals</label>
            <input
              type="number"
              min="1"
              value={goalCount}
              onChange={(e) => setGoalCount(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs font-bold text-slate-200 outline-none"
            />
          </div>

          <button
            onClick={handleAddGoalEvent}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-2 rounded-lg text-xs transition"
          >
            + Record Goal
          </button>
        </div>

        {scorerEvents.length > 0 && (
          <div className="space-y-1 pt-2">
            <span className="text-[10px] font-black text-slate-400 uppercase">Match Goal Events:</span>
            <div className="flex flex-wrap gap-2">
              {scorerEvents.map((ev, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2">
                  <span className="font-bold text-amber-300">{ev.playerName}</span>
                  <span className="text-slate-400">({ev.teamName})</span>
                  <span className="text-emerald-400 font-black">+{ev.goals} ⚽</span>
                  <button onClick={() => handleRemoveEvent(i)} className="text-red-400 hover:text-red-300 font-bold ml-1">×</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs transition shadow"
        >
          💾 Save Match Score & Stats
        </button>
      </div>
    </div>
  );
});