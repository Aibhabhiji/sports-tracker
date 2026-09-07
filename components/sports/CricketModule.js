'use client';

import React, { useState, useMemo } from 'react';

export default function CricketModule({ participants = [], sportState, onUpdateSportState }) {
  // sportState structure: { teams: [], matches: [], activeTab: 'teams' }
  const teams = sportState.teams || [];
  const matches = sportState.matches || [];
  const activeTab = sportState.activeTab || 'teams'; // 'teams', 'fixtures', 'leaderboard'

  // Team creation form state
  const [newTeamName, setNewTeamName] = useState('');
  const [activeTeamId, setActiveTeamId] = useState(teams[0]?.id || null);

  // Filter states for participant assignment (Age Category, Phase, Gender)
  const [filterAgeCategory, setFilterAgeCategory] = useState('All');
  const [filterPhase, setFilterPhase] = useState('All');
  const [filterGender, setFilterGender] = useState('All');
  const [selectedRole, setSelectedRole] = useState('Batsman');

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
      players: [] // { id, name, role, runs: 0, wickets: 0 }
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
    if (activeTeamId === teamId) {
      const remaining = teams.filter(t => t.id !== teamId);
      setActiveTeamId(remaining[0]?.id || null);
    }
  };

  // Memoized assigned player IDs set for O(1) lookup
  const assignedPlayerIds = useMemo(() => {
    return new Set(teams.flatMap(t => t.players.map(p => p.id.toString())));
  }, [teams]);

  // Unique filter options extracted from participants
  const ageCategories = useMemo(() => {
    const set = new Set(participants.map(p => p.ageCategory || p.ageGroup || p.category || 'General'));
    return ['All', ...Array.from(set)];
  }, [participants]);

  const phases = useMemo(() => {
    const set = new Set(participants.map(p => p.phase || p.stage || 'Standard'));
    return ['All', ...Array.from(set)];
  }, [participants]);

  const genders = useMemo(() => {
    const set = new Set(participants.map(p => p.gender || p.sex || 'Open'));
    return ['All', ...Array.from(set)];
  }, [participants]);

  // Filtered available participants who are not yet assigned to any team
  const availableParticipants = useMemo(() => {
    return participants.filter(p => {
      const pId = (p.id || p.regId || p.Registration_ID).toString();
      if (assignedPlayerIds.has(pId)) return false;

      const pAge = p.ageCategory || p.ageGroup || p.category || 'General';
      const pPhase = p.phase || p.stage || 'Standard';
      const pGender = p.gender || p.sex || 'Open';

      if (filterAgeCategory !== 'All' && pAge !== filterAgeCategory) return false;
      if (filterPhase !== 'All' && pPhase !== filterPhase) return false;
      if (filterGender !== 'All' && pGender !== filterGender) return false;

      return true;
    });
  }, [participants, assignedPlayerIds, filterAgeCategory, filterPhase, filterGender]);

  // Assign player to active team
  const handleAddPlayerToTeam = (playerId) => {
    if (!activeTeamId) {
      alert('Please select or create a team on the left first.');
      return;
    }
    const playerObj = participants.find(p => (p.id || p.regId || p.Registration_ID).toString() === playerId.toString());
    if (!playerObj) return;

    const updatedTeams = teams.map(t => {
      if (t.id === activeTeamId) {
        if (t.players.some(p => p.id.toString() === playerId.toString())) return t;
        return {
          ...t,
          players: [
            ...t.players,
            {
              id: playerObj.id || playerObj.regId || playerObj.Registration_ID,
              name: playerObj.name,
              role: selectedRole,
              runs: 0,
              wickets: 0
            }
          ]
        };
      }
      return t;
    });

    onUpdateSportState({ teams: updatedTeams });
  };

  const handleRemovePlayerFromTeam = (teamId, playerId) => {
    const updatedTeams = teams.map(t => {
      if (t.id === teamId) {
        return {
          ...t,
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

  const allPlayersWithStats = useMemo(() => {
    return teams.flatMap(t => 
      t.players.map(p => ({ ...p, teamName: t.name, teamId: t.id }))
    ).sort((a, b) => b.runs - a.runs || b.wickets - a.wickets);
  }, [teams]);

  // Excel / CSV Export Helpers
  const downloadCSV = (content, fileName) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportTeamsToCSV = () => {
    let csvContent = "Team Name,Player Name,Role,Runs,Wickets\n";
    teams.forEach(t => {
      if (t.players.length === 0) {
        csvContent += `"${t.name}","No Players","N/A",0,0\n`;
      } else {
        t.players.forEach(p => {
          csvContent += `"${t.name}","${p.name}","${p.role || 'Player'}",${p.runs || 0},${p.wickets || 0}\n`;
        });
      }
    });
    downloadCSV(csvContent, 'cricket_teams_squads.csv');
  };

  const exportMatchesToCSV = () => {
    let csvContent = "Round,Team A,Team A Runs,Team A Wickets,Team A Overs,Team B,Team B Runs,Team B Wickets,Team B Overs,Status\n";
    matches.forEach(m => {
      const teamA = teams.find(t => t.id === m.teamAId)?.name || 'Unknown';
      const teamB = teams.find(t => t.id === m.teamBId)?.name || 'Unknown';
      csvContent += `"${m.round}","${teamA}",${m.teamARuns},${m.teamAWickets},"${m.teamAOvers}","${teamB}",${m.teamBRuns},${m.teamBWickets},"${m.teamBOvers}","${m.completed ? 'Completed' : 'Pending'}"\n`;
    });
    downloadCSV(csvContent, 'cricket_matches_fixtures.csv');
  };

  const exportLeaderboardToCSV = () => {
    let csvContent = "Rank,Player Name,Team,Role,Total Runs,Total Wickets\n";
    allPlayersWithStats.forEach((p, idx) => {
      csvContent += `${idx + 1},"${p.name}","${p.teamName}","${p.role}",${p.runs},${p.wickets}\n`;
    });
    downloadCSV(csvContent, 'cricket_leaderboard.csv');
  };

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

  const activeTeam = teams.find(t => t.id === activeTeamId) || teams[0];

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

      {/* Sub-navigation tabs for Cricket and Excel Export Actions[cite: 2] */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSportTab('teams')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition ${activeTab === 'teams' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'}`}
          >
            🛡️ Teams & Squad Assignment ({teams.length})
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

        {/* Excel / CSV Export Module Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportTeamsToCSV}
            className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow"
            title="Export Teams & Squads to Excel/CSV"
          >
            📊 Export Teams
          </button>
          <button
            onClick={exportMatchesToCSV}
            className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow"
            title="Export Matches & Fixtures to Excel/CSV"
          >
            📊 Export Matches
          </button>
          <button
            onClick={exportLeaderboardToCSV}
            className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow"
            title="Export Leaderboard to Excel/CSV"
          >
            📊 Export Leaderboard
          </button>
        </div>
      </div>

      {/* TAB 1: TEAMS & CATEGORY/PHASE/GENDER ASSIGNMENT */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          {/* Team Creation bar */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-wrap justify-between items-center gap-4 shadow-xl">
            <div>
              <h3 className="text-sm font-black text-cyan-400">Manage Cricket Teams & Squads</h3>
              <p className="text-xs text-slate-400">Create teams, select an active team on the left, and assign filtered players.</p>
            </div>
            <form onSubmit={handleCreateTeam} className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="New Team Name (e.g., Royal Strikers)"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs font-bold text-slate-100 outline-none w-full sm:w-64"
              />
              <button type="submit" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition shadow whitespace-nowrap">
                + Add Team
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT SIDE: Team Selector & Active Team Roster Fixed List Box */}
            <div className="lg:col-span-5 bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl flex flex-col">
              <h4 className="text-xs font-black text-cyan-300 uppercase tracking-wider">Left: Team & Fixed Roster</h4>
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Select Team to Manage / Fix Players</label>
                <select
                  value={activeTeamId || ''}
                  onChange={(e) => setActiveTeamId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs font-bold text-cyan-400 outline-none"
                >
                  {teams.length === 0 ? (
                    <option value="">No teams available</option>
                  ) : (
                    teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.players.length} players)</option>
                    ))
                  )}
                </select>
              </div>

              {activeTeam && (
                <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-xs font-black text-slate-200 block">{activeTeam.name}</span>
                    <span className="text-[10px] text-slate-400">Fixed Squad Size: {activeTeam.players.length}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteTeam(activeTeam.id)}
                    className="bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-900/60 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                  >
                    Delete Team
                  </button>
                </div>
              )}

              {/* Roster List Box */}
              <div className="space-y-2 flex-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Players Fixed to {activeTeam?.name || 'Selected Team'}:</label>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-96 overflow-y-auto space-y-2">
                  {!activeTeam || activeTeam.players.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-6 text-center">No players fixed to this team yet. Select players from the right pool.</p>
                  ) : (
                    activeTeam.players.map(player => (
                      <div key={player.id} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-slate-200 block">{player.name}</span>
                          <select
                            value={player.role}
                            onChange={(e) => handleUpdatePlayerRole(activeTeam.id, player.id, e.target.value)}
                            className="bg-slate-950 border border-slate-800 text-[10px] font-bold text-cyan-300 p-0.5 rounded outline-none mt-1"
                          >
                            <option value="Batsman">Batsman</option>
                            <option value="Bowler">Bowler</option>
                            <option value="All-Rounder">All-Rounder</option>
                            <option value="Wicket Keeper">Wicket Keeper</option>
                          </select>
                        </div>
                        <button
                          onClick={() => handleRemovePlayerFromTeam(activeTeam.id, player.id)}
                          className="text-red-400 hover:text-red-300 text-[10px] font-bold px-2 py-1 bg-red-950/40 rounded border border-red-900/40"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: Category, Phase, Gender Filters & Available Participants Pool */}
            <div className="lg:col-span-7 bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
              <h4 className="text-xs font-black text-cyan-300 uppercase tracking-wider">Right: Filter & Available Participants Pool</h4>
              
              {/* Category, Phase, Gender Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Age Category</label>
                  <select
                    value={filterAgeCategory}
                    onChange={(e) => setFilterAgeCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs font-bold text-slate-200 outline-none"
                  >
                    {ageCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Phase / Stage</label>
                  <select
                    value={filterPhase}
                    onChange={(e) => setFilterPhase(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs font-bold text-slate-200 outline-none"
                  >
                    {phases.map(ph => (
                      <option key={ph} value={ph}>{ph}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Gender</label>
                  <select
                    value={filterGender}
                    onChange={(e) => setFilterGender(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs font-bold text-slate-200 outline-none"
                  >
                    {genders.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Role selection for new additions */}
              <div className="flex items-center gap-3 bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800">
                <label className="text-[10px] font-bold text-slate-400 whitespace-nowrap">Default Role upon adding:</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="bg-slate-900 border border-slate-800 p-1.5 rounded-lg text-xs font-bold text-cyan-300 outline-none"
                >
                  <option value="Batsman">Batsman</option>
                  <option value="Bowler">Bowler</option>
                  <option value="All-Rounder">All-Rounder</option>
                  <option value="Wicket Keeper">Wicket Keeper</option>
                </select>
              </div>

              {/* Available Players List Box */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Available Unassigned Players ({availableParticipants.length}):</span>
                  <span className="text-[10px] text-slate-500">Assigned players are automatically hidden</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-80 overflow-y-auto space-y-2">
                  {availableParticipants.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-8 text-center">No matching unassigned participants found for this combination.</p>
                  ) : (
                    availableParticipants.map(p => {
                      const pId = p.id || p.regId || p.Registration_ID;
                      const pAge = p.ageCategory || p.ageGroup || p.category || 'General';
                      const pPhase = p.phase || p.stage || 'Standard';
                      const pGender = p.gender || p.sex || 'Open';

                      return (
                        <div key={pId} className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs hover:border-cyan-500/50 transition">
                          <div>
                            <span className="font-bold text-slate-100 block">{p.name}</span>
                            <span className="text-[10px] text-cyan-400 font-semibold">{pAge} | {pPhase} | {pGender} {p.flat ? `| ${p.flat}` : ''}</span>
                          </div>
                          <button
                            onClick={() => handleAddPlayerToTeam(pId)}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition shadow"
                          >
                            + Add to {activeTeam?.name || 'Team'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FIXTURES & SCOREBOARD */}
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

      {/* TAB 3: LEADERBOARD */}
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