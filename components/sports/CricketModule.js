'use client';

import React, { useState } from 'react';

export default function CricketModule({ participants, sportState, onUpdateSportState }) {
  // sportState structure: { teams: [], matches: [], activeTab: 'teams' }
  const rawTeams = sportState.teams || [];
  // Ensure every team has a default auction purse (e.g., 1000 points)
  const teams = rawTeams.map(t => ({
    ...t,
    purse: t.purse !== undefined ? t.purse : 1000
  }));

  const matches = sportState.matches || [];
  const activeTab = sportState.activeTab || 'teams'; // 'teams', 'auction', 'fixtures', 'leaderboard'

  // Team creation form state
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedRole, setSelectedRole] = useState('Batsman');
  const [activeTeamId, setActiveTeamId] = useState(null);

  // Auction state
  const [auctionPlayerId, setAuctionPlayerId] = useState('');
  const [auctionWinningTeamId, setAuctionWinningTeamId] = useState('');
  const [auctionSoldPrice, setAuctionSoldPrice] = useState(100);

  const setSportTab = (tab) => {
    onUpdateSportState({ activeTab: tab });
  };

  // Add Team
  const handleCreateTeam = (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    const newTeam = {
      id: 'team_' + Date.now(),
      name: newTeamName.trim(),
      purse: 1000, // Default auction budget
      players: [] // { id, name, role: 'Batsman'|'Bowler'|'All-Rounder'|'Wicket Keeper', runs: 0, wickets: 0, soldPrice: 0 }
    };
    onUpdateSportState({ teams: [...teams, newTeam] });
    setNewTeamName('');
    if (!activeTeamId) setActiveTeamId(newTeam.id);
  };

  const handleDeleteTeam = (teamId) => {
    onUpdateSportState({
      teams: teams.filter(t => t.id !== teamId),
      matches: matches.filter(m => m.teamAId !== teamId && m.teamBId !== teamId)
    });
    if (activeTeamId === teamId) setActiveTeamId(null);
  };

  // Assign player to active team (Manual Direct Assignment)
  const handleAddPlayerToTeam = (teamId) => {
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
              runs: 0,
              wickets: 0,
              soldPrice: 0
            }
          ]
        };
      }
      return t;
    });

    onUpdateSportState({ teams: updatedTeams });
    setSelectedPlayerId('');
  };

  const handleRemovePlayerFromTeam = (teamId, playerId) => {
    const updatedTeams = teams.map(t => {
      if (t.id === teamId) {
        const removedPlayer = t.players.find(p => p.id.toString() === playerId.toString());
        const refund = removedPlayer?.soldPrice || 0;
        return {
          ...t,
          purse: t.purse + refund, // Refund purse if player auctioned and removed
          players: t.players.filter(p => p.id.toString() !== playerId.toString())
        };
      }
      return t;
    });
    onUpdateSportState({ teams: updatedTeams });
  };

  const handleUpdatePlayerRole = (teamId, playerId, newRole) => {
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
  };

  // --- AUCTION HANDLER ---
  const handleConductAuction = () => {
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
              role: 'All-Rounder', // Default role upon auction win
              runs: 0,
              wickets: 0,
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
  };

  // Generate Fixtures / Rounds
  const generateFixtures = (roundName = 'League Round') => {
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
          teamARuns: 0,
          teamAWickets: 0,
          teamAOvers: '0.0',
          teamBRuns: 0,
          teamBWickets: 0,
          teamBOvers: '0.0',
          playerStatsEvents: [],
          completed: false
        });
      }
    }
    onUpdateSportState({ matches: [...matches, ...newMatches], activeTab: 'fixtures' });
  };

  const generateKnockoutStage = (roundName) => {
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
        teamARuns: 0,
        teamAWickets: 0,
        teamAOvers: '0.0',
        teamBRuns: 0,
        teamBWickets: 0,
        teamBOvers: '0.0',
        playerStatsEvents: [],
        completed: false
      });
    }
    onUpdateSportState({ matches: [...matches, ...newMatches], activeTab: 'fixtures' });
  };

  // Update Match Score & Player Stats
  const handleUpdateMatchScore = (matchId, teamARuns, teamAWickets, teamAOvers, teamBRuns, teamBWickets, teamBOvers, playerStatsEvents) => {
    const updatedMatches = matches.map(m => {
      if (m.id === matchId) {
        return {
          ...m,
          teamARuns,
          teamAWickets,
          teamAOvers,
          teamBRuns,
          teamBWickets,
          teamBOvers,
          playerStatsEvents,
          completed: true
        };
      }
      return m;
    });

    const freshTeams = teams.map(t => ({
      ...t,
      players: t.players.map(p => ({ ...p, runs: 0, wickets: 0 }))
    }));

    updatedMatches.forEach(m => {
      if (m.playerStatsEvents && m.playerStatsEvents.length > 0) {
        m.playerStatsEvents.forEach(ev => {
          freshTeams.forEach(t => {
            if (t.id === ev.teamId) {
              t.players = t.players.map(p => p.id.toString() === ev.playerId.toString() ? {
                ...p,
                runs: p.runs + Number(ev.runs || 0),
                wickets: p.wickets + Number(ev.wickets || 0)
              } : p);
            }
          });
        });
      }
    });

    onUpdateSportState({ matches: updatedMatches, teams: freshTeams });
  };

  // Unassigned participants check
  const assignedPlayerIds = new Set(teams.flatMap(t => t.players.map(p => p.id.toString())));
  const unassignedParticipants = participants.filter(p => {
    const pId = (p.id || p.regId || p.Registration_ID).toString();
    return !assignedPlayerIds.has(pId);
  });

  const allPlayersWithStats = teams.flatMap(t => 
    t.players.map(p => ({ ...p, teamName: t.name, teamId: t.id }))
  ).sort((a, b) => b.runs - a.runs || b.wickets - a.wickets);

  const topScorer = allPlayersWithStats[0];
  const isGrandFinaleCompleted = matches.some(m => m.round === 'Grand Finale' && m.completed);
  const finaleMatch = matches.find(m => m.round === 'Grand Finale');
  let finaleWinner = null;
  if (isGrandFinaleCompleted && finaleMatch) {
    if (finaleMatch.teamARuns > finaleMatch.teamBRuns) {
      finaleWinner = teams.find(t => t.id === finaleMatch.teamAId)?.name;
    } else if (finaleMatch.teamBRuns > finaleMatch.teamARuns) {
      finaleWinner = teams.find(t => t.id === finaleMatch.teamBId)?.name;
    } else {
      finaleWinner = 'Super Over / Tied Winner';
    }
  }

  return (
    <div className="space-y-6">
      {/* Grand Finale Fireworks Banner */}
      {isGrandFinaleCompleted && (
        <div className="bg-gradient-to-r from-cyan-600 via-blue-500 to-cyan-600 p-6 rounded-2xl text-slate-950 text-center font-black shadow-2xl animate-pulse space-y-2 border-4 border-cyan-300">
          <div className="text-3xl">🎆 🏆 CRICKET GRAND FINALE CHAMPIONS 🏆 🎇</div>
          <div className="text-xl tracking-wider uppercase">Winner: {finaleWinner}</div>
          <p className="text-xs font-bold text-slate-900">Congratulations on an extraordinary cricket tournament performance!</p>
        </div>
      )}

      {/* Sub-navigation tabs for Cricket */}
      <div className="flex flex-wrap gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
        <button
          onClick={() => setSportTab('teams')}
          className={`px-4 py-2 rounded-lg text-xs font-black transition ${activeTab === 'teams' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'}`}
        >
          🛡️ Teams & Player Roles ({teams.length})
        </button>
        <button
          onClick={() => setSportTab('auction')}
          className={`px-4 py-2 rounded-lg text-xs font-black transition ${activeTab === 'auction' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'}`}
        >
          💰 Player Auction & Purses
        </button>
        <button
          onClick={() => setSportTab('fixtures')}
          className={`px-4 py-2 rounded-lg text-xs font-black transition ${activeTab === 'fixtures' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'}`}
        >
          🏏 Matches & Scoreboard ({matches.length})
        </button>
        <button
          onClick={() => setSportTab('leaderboard')}
          className={`px-4 py-2 rounded-lg text-xs font-black transition ${activeTab === 'leaderboard' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'}`}
        >
          🏆 Top Run/Wicket Scorers
        </button>
      </div>

      {/* TAB 1: TEAMS & ROLES */}
      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-black text-cyan-400">Create Cricket Team</h3>
            <form onSubmit={handleCreateTeam} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Team Name</label>
                <input
                  type="text"
                  placeholder="e.g., Royal Strikers CC"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs font-bold text-slate-100 outline-none"
                />
              </div>
              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black p-2.5 rounded-xl text-xs transition shadow">
                + Add Team
              </button>
            </form>

            <div className="border-t border-slate-800 pt-4 space-y-2">
              <h4 className="text-xs font-black text-slate-300">Available Registered Participants ({participants.length})</h4>
              <p className="text-[10px] text-slate-500">Select participant, assign cricket role, and add to active team directly or use the Auction tab.</p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {teams.length === 0 ? (
              <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs font-bold">
                No cricket teams created yet. Create a team on the left to begin distributing players.
              </div>
            ) : (
              teams.map((team) => {
                const isActive = activeTeamId === team.id || teams.length === 1;
                return (
                  <div key={team.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-black text-cyan-300">{team.name}</h4>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-slate-400">Squad: {team.players.length} Players</span>
                          <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-900/60 px-2 py-0.5 rounded-md">Purse: {team.purse} pts</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveTeamId(team.id)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border ${isActive ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-950 text-slate-300 border-slate-800'}`}
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
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Cricket Role</label>
                          <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs font-bold text-slate-200 outline-none"
                          >
                            <option value="Batsman">Batsman</option>
                            <option value="Bowler">Bowler</option>
                            <option value="All-Rounder">All-Rounder</option>
                            <option value="Wicket Keeper">Wicket Keeper</option>
                          </select>
                        </div>

                        <button
                          onClick={() => handleAddPlayerToTeam(team.id)}
                          className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold p-2 rounded-lg text-xs transition"
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
                            <th className="py-2 px-2">Role</th>
                            <th className="py-2 px-2 text-center">Sold Price</th>
                            <th className="py-2 px-2 text-center">Runs</th>
                            <th className="py-2 px-2 text-center">Wickets</th>
                            <th className="py-2 px-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {team.players.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="py-4 text-center text-slate-500 italic text-[11px]">
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
                                    className="bg-slate-950 border border-slate-800 text-[10px] font-bold text-cyan-300 p-1 rounded outline-none"
                                  >
                                    <option value="Batsman">Batsman</option>
                                    <option value="Bowler">Bowler</option>
                                    <option value="All-Rounder">All-Rounder</option>
                                    <option value="Wicket Keeper">Wicket Keeper</option>
                                  </select>
                                </td>
                                <td className="py-2 px-2 text-center text-cyan-400 font-semibold">{player.soldPrice || 0} pts</td>
                                <td className="py-2 px-2 text-center font-black text-emerald-400">{player.runs} 🏏</td>
                                <td className="py-2 px-2 text-center font-black text-amber-400">{player.wickets} 🎯</td>
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
                <h3 className="text-base font-black text-cyan-400">💰 Live Cricket Player Auction & Team Budgets</h3>
                <p className="text-xs text-slate-400">Auction unassigned participants to teams by deducting points from their tournament purses.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {teams.map(t => (
                  <div key={t.id} className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-slate-400 block">{t.name}</span>
                    <span className="text-xs font-black text-cyan-400">{t.purse} pts</span>
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
                    className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-xs font-bold text-cyan-400 outline-none"
                  />
                  <button
                    onClick={handleConductAuction}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition whitespace-nowrap shadow"
                  >
                    🔨 Hammer Down (Sell)
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-sm font-black text-cyan-300">Unsold / Unassigned Players Pool ({unassignedParticipants.length})</h4>
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
              <h4 className="text-sm font-black text-cyan-300">Team Auction Summaries</h4>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {teams.map(t => (
                  <div key={t.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-black text-cyan-400">{t.name}</span>
                      <span className="font-bold text-cyan-400">Purse Left: {t.purse} pts</span>
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

      {/* TAB 3: FIXTURES & SCOREBOARD */}
      {activeTab === 'fixtures' && (
        <div className="space-y-6">
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-wrap justify-between items-center gap-4">
            <div>
              <h3 className="text-sm font-black text-cyan-400">Tournament Stages & Fixtures</h3>
              <p className="text-[10px] text-slate-400">Generate cricket matches through group rounds, quarter finals, semi finals, and finals.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => generateFixtures('Group / League Round')}
                className="bg-slate-950 hover:bg-slate-800 text-cyan-400 border border-slate-800 px-3 py-2 rounded-xl text-xs font-black shadow"
              >
                + Generate League Fixtures
              </button>
              <button
                onClick={() => generateKnockoutStage('Quarter Finals')}
                className="bg-slate-950 hover:bg-slate-800 text-cyan-400 border border-slate-800 px-3 py-2 rounded-xl text-xs font-black shadow"
              >
                + Quarter Finals
              </button>
              <button
                onClick={() => generateKnockoutStage('Semi Finals')}
                className="bg-slate-950 hover:bg-slate-800 text-cyan-400 border border-slate-800 px-3 py-2 rounded-xl text-xs font-black shadow"
              >
                + Semi Finals
              </button>
              <button
                onClick={() => generateKnockoutStage('Grand Finale')}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3 py-2 rounded-xl text-xs font-black shadow"
              >
                + Grand Finale
              </button>
            </div>
          </div>

          {matches.length === 0 ? (
            <div className="bg-slate-900 p-12 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs font-bold">
              No cricket matches generated yet. Click above to generate fixtures for the tournament.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {matches.map((match) => {
                const teamA = teams.find(t => t.id === match.teamAId) || { name: 'Team A (Deleted)', players: [] };
                const teamB = teams.find(t => t.id === match.teamBId) || { name: 'Team B (Deleted)', players: [] };

                return (
                  <CricketMatchScoringCard
                    key={match.id}
                    match={match}
                    teamA={teamA}
                    teamB={teamB}
                    onSaveMatch={(aRuns, aWkts, aOvers, bRuns, bWkts, bOvers, events) => handleUpdateMatchScore(match.id, aRuns, aWkts, aOvers, bRuns, bWkts, bOvers, events)}
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
              <h3 className="text-base font-black text-cyan-400">🏆 Top Cricket Performers Leaderboard</h3>
              <p className="text-xs text-slate-400">Cumulative record of runs and wickets by every player across all tournament stages.</p>
            </div>
            {topScorer && (
              <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-right">
                <span className="text-[10px] text-cyan-400 font-bold block">Top Batter / Performer</span>
                <span className="text-xs font-black text-emerald-400">{topScorer.name} ({topScorer.teamName}) - {topScorer.runs} Runs / {topScorer.wickets} Wkts</span>
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
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3 text-center">Total Runs Scored</th>
                  <th className="py-3 px-3 text-center">Total Wickets Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {allPlayersWithStats.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-500 italic text-xs">
                      No player performance records yet. Start recording runs & wickets in match fixtures.
                    </td>
                  </tr>
                ) : (
                  allPlayersWithStats.map((player, idx) => (
                    <tr key={player.id + '-' + player.teamId} className="hover:bg-slate-950/40">
                      <td className="py-3 px-3 font-black text-cyan-400">#{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-100">{player.name}</td>
                      <td className="py-3 px-3 text-cyan-300 font-semibold">{player.teamName}</td>
                      <td className="py-3 px-3 text-slate-400">{player.role}</td>
                      <td className="py-3 px-3 text-center font-black text-emerald-400 text-sm">{player.runs} 🏏</td>
                      <td className="py-3 px-3 text-center font-black text-amber-400 text-sm">{player.wickets} 🎯</td>
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

function CricketMatchScoringCard({ match, teamA, teamB, onSaveMatch, onDeleteMatch }) {
  const [teamARuns, setTeamARuns] = useState(match.teamARuns || 0);
  const [teamAWickets, setTeamAWickets] = useState(match.teamAWickets || 0);
  const [teamAOvers, setTeamAOvers] = useState(match.teamAOvers || '0.0');

  const [teamBRuns, setTeamBRuns] = useState(match.teamBRuns || 0);
  const [teamBWickets, setTeamBWickets] = useState(match.teamBWickets || 0);
  const [teamBOvers, setTeamBOvers] = useState(match.teamBOvers || '0.0');

  const [playerStatsEvents, setPlayerStatsEvents] = useState(match.playerStatsEvents || []);

  const [selectedEventTeamId, setSelectedEventTeamId] = useState(teamA.id);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [runsScored, setRunsScored] = useState(0);
  const [wicketsTaken, setWicketsTaken] = useState(0);

  const activeEventTeam = selectedEventTeamId === teamA.id ? teamA : teamB;

  const handleAddPlayerStatEvent = () => {
    if (!selectedPlayerId) return;
    const playerObj = activeEventTeam.players.find(p => p.id.toString() === selectedPlayerId.toString());
    if (!playerObj) return;

    const newEvent = {
      id: 'event_' + Date.now(),
      teamId: activeEventTeam.id,
      teamName: activeEventTeam.name,
      playerId: playerObj.id,
      playerName: playerObj.name,
      runs: Number(runsScored) || 0,
      wickets: Number(wicketsTaken) || 0
    };

    const updatedEvents = [...playerStatsEvents, newEvent];
    setPlayerStatsEvents(updatedEvents);
    setSelectedPlayerId('');
    setRunsScored(0);
    setWicketsTaken(0);
  };

  const handleRemoveEvent = (index) => {
    const updatedEvents = playerStatsEvents.filter((_, i) => i !== index);
    setPlayerStatsEvents(updatedEvents);
  };

  const handleSave = () => {
    onSaveMatch(teamARuns, teamAWickets, teamAOvers, teamBRuns, teamBWickets, teamBOvers, playerStatsEvents);
    alert('Cricket match score and player statistics saved successfully!');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <span className="bg-cyan-400 text-slate-950 text-xs font-black px-2.5 py-1 rounded-lg uppercase">{match.round}</span>
          <span className="text-xs text-slate-400">{match.completed ? '✅ Completed' : '⚔️ Live / Pending'}</span>
        </div>
        <button onClick={onDeleteMatch} className="text-red-400 hover:text-red-300 text-xs font-bold">Delete Match</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
        <div className="text-center md:text-left space-y-2 border-b md:border-b-0 md:border-r border-slate-800 pb-4 md:pb-0 md:pr-4">
          <h4 className="text-sm font-black text-cyan-300">{teamA.name}</h4>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block">Runs</label>
              <input
                type="number"
                value={teamARuns}
                onChange={(e) => setTeamARuns(Number(e.target.value))}
                className="w-16 bg-slate-900 border border-slate-800 text-center text-base font-black text-emerald-400 p-1.5 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block">Wickets</label>
              <input
                type="number"
                value={teamAWickets}
                onChange={(e) => setTeamAWickets(Number(e.target.value))}
                className="w-16 bg-slate-900 border border-slate-800 text-center text-base font-black text-amber-400 p-1.5 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block">Overs</label>
              <input
                type="text"
                value={teamAOvers}
                onChange={(e) => setTeamAOvers(e.target.value)}
                className="w-16 bg-slate-900 border border-slate-800 text-center text-base font-black text-cyan-300 p-1.5 rounded-xl outline-none"
              />
            </div>
          </div>
          <div className="text-[10px] text-slate-500">Squad players: {teamA.players.length}</div>
        </div>

        <div className="text-center md:text-right space-y-2 pt-2 md:pt-0">
          <h4 className="text-sm font-black text-cyan-300">{teamB.name}</h4>
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block">Runs</label>
              <input
                type="number"
                value={teamBRuns}
                onChange={(e) => setTeamBRuns(Number(e.target.value))}
                className="w-16 bg-slate-900 border border-slate-800 text-center text-base font-black text-emerald-400 p-1.5 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block">Wickets</label>
              <input
                type="number"
                value={teamBWickets}
                onChange={(e) => setTeamBWickets(Number(e.target.value))}
                className="w-16 bg-slate-900 border border-slate-800 text-center text-base font-black text-amber-400 p-1.5 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block">Overs</label>
              <input
                type="text"
                value={teamBOvers}
                onChange={(e) => setTeamBOvers(e.target.value)}
                className="w-16 bg-slate-900 border border-slate-800 text-center text-base font-black text-cyan-300 p-1.5 rounded-xl outline-none"
              />
            </div>
          </div>
          <div className="text-[10px] text-slate-500">Squad players: {teamB.players.length}</div>
        </div>
      </div>

      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
        <h5 className="text-xs font-black text-slate-300">🏏 Individual Player Stat Recorder (Runs / Wickets)</h5>
        
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">Team</label>
            <select
              value={selectedEventTeamId}
              onChange={(e) => {
                setSelectedEventTeamId(e.target.value);
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
              <option value="">-- Select Player --</option>
              {activeEventTeam.players.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">Runs Scored</label>
            <input
              type="number"
              min="0"
              value={runsScored}
              onChange={(e) => setRunsScored(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs font-bold text-slate-200 outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">Wickets Taken</label>
            <input
              type="number"
              min="0"
              value={wicketsTaken}
              onChange={(e) => setWicketsTaken(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs font-bold text-slate-200 outline-none"
            />
          </div>

          <button
            onClick={handleAddPlayerStatEvent}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold p-2 rounded-lg text-xs transition"
          >
            + Add Stat Record
          </button>
        </div>

        {playerStatsEvents.length > 0 && (
          <div className="space-y-1 pt-2">
            <span className="text-[10px] font-black text-slate-400 uppercase">Match Player Performance Logs:</span>
            <div className="flex flex-wrap gap-2">
              {playerStatsEvents.map((ev, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2">
                  <span className="font-bold text-cyan-300">{ev.playerName}</span>
                  <span className="text-slate-400">({ev.teamName})</span>
                  {ev.runs > 0 && <span className="text-emerald-400 font-black">+{ev.runs} Runs</span>}
                  {ev.wickets > 0 && <span className="text-amber-400 font-black">+{ev.wickets} Wkts</span>}
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
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs transition shadow"
        >
          💾 Save Match Score & Stats
        </button>
      </div>
    </div>
  );
}