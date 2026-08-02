'use client';

import React, { useState } from 'react';

export default function CricketModule({ participants = [], sportState = {}, onUpdateSportState }) {
  // Tournament staging & category filters state
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('All');
  const [selectedPhase, setSelectedPhase] = useState('All');
  const [selectedGender, setSelectedGender] = useState('All');

  // Teams & tournament data stored in sportState
  const teams = sportState?.teams || [];
  const matches = sportState?.matches || [];
  const tournamentStage = sportState?.tournamentStage || 'League'; // League -> QF -> SF -> Final -> Champion
  const champion = sportState?.champion || null;

  // Player role categorizations stored locally or in state: { [playerId]: 'Batsman' | 'Bowler' | 'All-Rounder' }
  const playerRoles = sportState?.playerRoles || {};

  // Active match being scored side-by-side
  const [activeMatchId, setActiveMatchId] = useState(null);

  // New team creation form state
  const [newTeamName, setNewTeamName] = useState('');

  // Helper to filter participants based on selected category combination
  const filteredParticipants = participants.filter(p => {
    const ageMatch = selectedAgeGroup === 'All' || (p.ageGroup || p.age) === selectedAgeGroup;
    const phaseMatch = selectedPhase === 'All' || (p.phase || p.phaseGroup) === selectedPhase;
    const genderMatch = selectedGender === 'All' || (p.gender || p.sex) === selectedGender;
    return ageMatch && phaseMatch && genderMatch;
  });

  const handleAddTeam = (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    const newTeam = {
      id: `team_${Date.now()}`,
      name: newTeamName.trim(),
      players: []
    };
    onUpdateSportState({
      ...sportState,
      teams: [...teams, newTeam]
    });
    setNewTeamName('');
  };

  const handleAssignPlayerToTeam = (teamId, player) => {
    const updatedTeams = teams.map(t => {
      if (t.id === teamId) {
        if (t.players.some(p => (p.id || p.regId) === (player.id || player.regId))) return t;
        return { ...t, players: [...t.players, player] };
      }
      return t;
    });
    onUpdateSportState({ ...sportState, teams: updatedTeams });
  };

  const handleRemovePlayerFromTeam = (teamId, playerId) => {
    const updatedTeams = teams.map(t => {
      if (t.id === teamId) {
        return { ...t, players: t.players.filter(p => (p.id || p.regId) !== playerId) };
      }
      return t;
    });
    onUpdateSportState({ ...sportState, teams: updatedTeams });
  };

  const handleUpdatePlayerRole = (playerId, role) => {
    const updatedRoles = { ...playerRoles, [playerId]: role };
    onUpdateSportState({ ...sportState, playerRoles: updatedRoles });
  };

  const handleCreateMatch = (teamAId, teamBId) => {
    if (teamAId === teamBId) {
      alert('A team cannot play against itself.');
      return;
    }
    const tA = teams.find(t => t.id === teamAId);
    const tB = teams.find(t => t.id === teamBId);
    if (!tA || !tB) return;

    const newMatch = {
      id: `match_${Date.now()}`,
      stage: tournamentStage,
      teamA: { id: tA.id, name: tA.name, score: 0, wickets: 0, overs: 0, playerScores: {} },
      teamB: { id: tB.id, name: tB.name, score: 0, wickets: 0, overs: 0, playerScores: {} },
      status: 'Live'
    };

    onUpdateSportState({
      ...sportState,
      matches: [...matches, newMatch]
    });
    setActiveMatchId(newMatch.id);
  };

  // Update individual player score in an active match
  const handleUpdatePlayerMatchStats = (matchId, teamKey, playerId, statField, delta) => {
    const updatedMatches = matches.map(m => {
      if (m.id === matchId) {
        const teamData = m[teamKey];
        const pScores = teamData.playerScores[playerId] || { runs: 0, balls: 0, fours: 0, sixes: 0, wicketsTaken: 0, oversBowled: 0, runsConceded: 0 };
        const newVal = Math.max(0, (pScores[statField] || 0) + delta);
        
        const updatedPScores = {
          ...teamData.playerScores,
          [playerId]: { ...pScores, [statField]: newVal }
        };

        // Recalculate team total runs if updating runs
        let totalRuns = teamData.score;
        let totalWickets = teamData.wickets;
        if (statField === 'runs') {
          totalRuns = Object.values(updatedPScores).reduce((sum, ps) => sum + (ps.runs || 0), 0);
        }
        if (statField === 'wicketsTaken') {
          totalWickets = Object.values(updatedPScores).reduce((sum, ps) => sum + (ps.wicketsTaken || 0), 0);
        }

        return {
          ...m,
          [teamKey]: {
            ...teamData,
            score: totalRuns,
            wickets: totalWickets,
            playerScores: updatedPScores
          }
        };
      }
      return m;
    });

    onUpdateSportState({ ...sportState, matches: updatedMatches });
  };

  const handleCompleteMatch = (matchId, winnerTeamName) => {
    const updatedMatches = matches.map(m => {
      if (m.id === matchId) {
        return { ...m, status: 'Completed', winner: winnerTeamName };
      }
      return m;
    });
    onUpdateSportState({ ...sportState, matches: updatedMatches });
    setActiveMatchId(null);
  };

  const handleAdvanceStage = () => {
    if (tournamentStage === 'League') {
      onUpdateSportState({ ...sportState, tournamentStage: 'Quarter Finals', matches: [] });
    } else if (tournamentStage === 'Quarter Finals') {
      onUpdateSportState({ ...sportState, tournamentStage: 'Semi Finals', matches: [] });
    } else if (tournamentStage === 'Semi Finals') {
      onUpdateSportState({ ...sportState, tournamentStage: 'Final', matches: [] });
    } else if (tournamentStage === 'Final') {
      // Find winner from final match
      const finalMatch = matches.find(m => m.stage === 'Final' && m.status === 'Completed');
      const winTeam = finalMatch ? finalMatch.winner : 'Grand Champion';
      onUpdateSportState({ ...sportState, tournamentStage: 'Champion', champion: winTeam });
    }
  };

  // Aggregate player statistics across all completed matches up to the final
  const playerCareerStats = {};
  matches.forEach(m => {
    ['teamA', 'teamB'].forEach(tKey => {
      const pScores = m[tKey]?.playerScores || {};
      Object.entries(pScores).forEach(([pId, stats]) => {
        if (!playerCareerStats[pId]) {
          playerCareerStats[pId] = { runs: 0, wickets: 0, balls: 0, fours: 0, sixes: 0 };
        }
        playerCareerStats[pId].runs += stats.runs || 0;
        playerCareerStats[pId].wickets += stats.wicketsTaken || 0;
        playerCareerStats[pId].balls += stats.balls || 0;
        playerCareerStats[pId].fours += stats.fours || 0;
        playerCareerStats[pId].sixes += stats.sixes || 0;
      });
    });
  });

  // Find max run scorer and max wicket taker for leaderboard & records
  const allCareerEntries = Object.entries(playerCareerStats);
  let topRunScorer = null;
  let topWicketTaker = null;

  if (allCareerEntries.length > 0) {
    const sortedByRuns = [...allCareerEntries].sort((a, b) => b[1].runs - a[1].runs);
    const sortedByWickets = [...allCareerEntries].sort((a, b) => b[1].wickets - a[1].wickets);

    const findParticipantDetails = (id) => participants.find(p => (p.id || p.regId) === id) || { name: `Player ${id}` };

    if (sortedByRuns[0]) {
      topRunScorer = { ...findParticipantDetails(sortedByRuns[0][0]), ...sortedByRuns[0][1] };
    }
    if (sortedByWickets[0]) {
      topWicketTaker = { ...findParticipantDetails(sortedByWickets[0][0]), ...sortedByWickets[0][1] };
    }
  }

  const activeMatch = matches.find(m => m.id === activeMatchId);

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header & Stage Banner */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <h3 className="text-sm font-black text-amber-400">🏏 Cricket Tournament & Score Tracking Module</h3>
          <p className="text-xs text-slate-400">Category staging, player roles (Batsman/Bowler/All-Rounder), side-by-side individual scoring, and round advancement.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-amber-400 font-bold">
            Stage: {tournamentStage}
          </span>
          {tournamentStage !== 'Champion' && (
            <button 
              onClick={handleAdvanceStage}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow transition"
            >
              Advance to Next Round 🚀
            </button>
          )}
        </div>
      </div>

      {/* Champion Celebration View */}
      {tournamentStage === 'Champion' && (
        <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 p-8 rounded-3xl text-center text-slate-950 shadow-2xl space-y-3 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/30 via-transparent to-transparent pointer-events-none animate-pulse"></div>
          <h2 className="text-3xl font-black uppercase tracking-wider">🎉 GRAND FINALE CHAMPION 🎉</h2>
          <p className="text-xl font-bold bg-slate-950 text-amber-400 py-2 px-6 rounded-2xl inline-block shadow">
            Winner: {champion || 'Outstanding Team'}
          </p>
          <p className="text-xs font-semibold text-slate-950">Fireworks & Celebration! Tournament successfully concluded with all player records archived.</p>
        </div>
      )}

      {/* Category Staging & Filters */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">Tournament Category Staging (Filter Pool)</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">Age Group / Category</label>
            <select 
              value={selectedAgeGroup} 
              onChange={(e) => setSelectedAgeGroup(e.target.value)}
              className="w-full bg-slate-950 text-amber-400 font-bold p-2.5 rounded-xl border border-slate-800 text-xs outline-none"
            >
              <option value="All">All Age Groups</option>
              <option value="Under 12">Under 12 (e.g. Example 1)</option>
              <option value="18-49">18-49 (e.g. Example 2)</option>
              <option value="Open">Open</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">Phase</label>
            <select 
              value={selectedPhase} 
              onChange={(e) => setSelectedPhase(e.target.value)}
              className="w-full bg-slate-950 text-amber-400 font-bold p-2.5 rounded-xl border border-slate-800 text-xs outline-none"
            >
              <option value="All">All Phases</option>
              <option value="Phase 1">Phase 1</option>
              <option value="Phase 2">Phase 2</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">Gender</label>
            <select 
              value={selectedGender} 
              onChange={(e) => setSelectedGender(e.target.value)}
              className="w-full bg-slate-950 text-amber-400 font-bold p-2.5 rounded-xl border border-slate-800 text-xs outline-none"
            >
              <option value="All">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
          <span>Eligible Participants Found in Category: <strong className="text-emerald-400">{filteredParticipants.length} Players</strong></span>
          <span className="text-amber-400 font-bold">Staged Tournaments Active</span>
        </div>
      </div>

      {/* Leaderboard per Category (Max Runs & Max Wickets) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3">
          <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">🏆 Leaderboard: Maximum Runs</h4>
          {topRunScorer ? (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <h5 className="font-bold text-slate-100 text-sm">{topRunScorer.name}</h5>
                <p className="text-[10px] text-slate-400">{topRunScorer.flat || 'Participant'} • {playerRoles[topRunScorer.id || topRunScorer.regId] || 'Batsman'}</p>
              </div>
              <div className="text-right">
                <span className="text-amber-400 font-black text-lg">{topRunScorer.runs} Runs</span>
                <p className="text-[10px] text-slate-400">{topRunScorer.fours} 4s | {topRunScorer.sixes} 6s</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-xs italic">No runs recorded yet.</div>
          )}
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3">
          <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">🎯 Leaderboard: Maximum Wickets</h4>
          {topWicketTaker ? (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <h5 className="font-bold text-slate-100 text-sm">{topWicketTaker.name}</h5>
                <p className="text-[10px] text-slate-400">{topWicketTaker.flat || 'Participant'} • {playerRoles[topWicketTaker.id || topWicketTaker.regId] || 'Bowler'}</p>
              </div>
              <div className="text-right">
                <span className="text-emerald-400 font-black text-lg">{topWicketTaker.wickets} Wickets</span>
                <p className="text-[10px] text-slate-400">Total Balls Bowled: {topWicketTaker.balls}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-xs italic">No wickets recorded yet.</div>
          )}
        </div>
      </div>

      {/* Teams & Role Assignment Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Team Form */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">Create Cricket Team</h4>
          <form onSubmit={handleAddTeam} className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Team Name</label>
              <input 
                type="text" 
                placeholder="e.g. Strikers XI" 
                value={newTeamName} 
                onChange={(e) => setNewTeamName(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-xl border border-slate-800 text-xs outline-none focus:border-amber-400"
              />
            </div>
            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl text-xs shadow transition">
              + Add Team
            </button>
          </form>
        </div>

        {/* Teams & Player Distribution */}
        <div className="lg:col-span-2 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">Teams & Player Role Assignment</h4>
          {teams.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">No teams created yet. Create a team above to begin distributing players.</div>
          ) : (
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {teams.map(team => (
                <div key={team.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <h5 className="font-bold text-amber-300 text-sm">{team.name} ({team.players.length} Players)</h5>
                    <div className="flex gap-2">
                      {teams.length >= 2 && (
                        <button 
                          onClick={() => {
                            const opponent = teams.find(t => t.id !== team.id);
                            if (opponent) handleCreateMatch(team.id, opponent.id);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black px-3 py-1 rounded text-[10px]"
                        >
                          ⚔️ Schedule Match
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Player list in team with Role categorization */}
                  {team.players.length > 0 ? (
                    <div className="space-y-2">
                      {team.players.map(p => {
                        const pId = p.id || p.regId;
                        const currentRole = playerRoles[pId] || 'All-Rounder';
                        return (
                          <div key={pId} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                            <div>
                              <span className="font-bold text-slate-200">{p.name}</span>
                              <span className="text-[10px] text-slate-400 ml-2">({p.flat || 'Flat'})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <select 
                                value={currentRole} 
                                onChange={(e) => handleUpdatePlayerRole(pId, e.target.value)}
                                className="bg-slate-950 text-amber-400 font-bold px-2 py-1 rounded border border-slate-800 text-[10px]"
                              >
                                <option value="Batsman">Batsman</option>
                                <option value="Bowler">Bowler</option>
                                <option value="All-Rounder">All-Rounder</option>
                              </select>
                              <button 
                                onClick={() => handleRemovePlayerFromTeam(team.id, pId)}
                                className="text-rose-400 hover:text-rose-300 text-[10px]"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500 italic">No players assigned to this team yet. Assign below from filtered pool:</div>
                  )}

                  {/* Add Player from Filtered Pool */}
                  <div className="pt-2 border-t border-slate-900 flex gap-2">
                    <select 
                      id={`select_p_${team.id}`}
                      className="flex-1 bg-slate-900 text-slate-200 p-1.5 rounded border border-slate-800 text-xs"
                    >
                      <option value="">Select player from category pool...</option>
                      {filteredParticipants.map(fp => (
                        <option key={fp.id || fp.regId} value={fp.id || fp.regId}>
                          {fp.name} ({fp.flat || 'Flat'})
                        </option>
                      ))}
                    </select>
                    <button 
                      onClick={() => {
                        const selId = document.getElementById(`select_p_${team.id}`).value;
                        const foundP = filteredParticipants.find(fp => (fp.id || fp.regId) === selId);
                        if (foundP) handleAssignPlayerToTeam(team.id, foundP);
                      }}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded text-xs"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Matches & Side-by-Side Scoring Suite */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">Matches & Side-by-Side Player Score Tracking</h4>
        
        {matches.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">No matches scheduled. Create a match between teams above.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matches.map(m => (
              <div key={m.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                  <span className="text-xs font-black text-amber-400">{m.stage} Match</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${m.status === 'Live' ? 'bg-amber-950 text-amber-400 border border-amber-500/30' : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'}`}>
                    {m.status} {m.winner ? `• Winner: ${m.winner}` : ''}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm font-bold">
                  <div>{m.teamA.name}: <span className="text-amber-400">{m.teamA.score}/{m.teamA.wickets}</span></div>
                  <span className="text-slate-500 text-xs">VS</span>
                  <div>{m.teamB.name}: <span className="text-amber-400">{m.teamB.score}/{m.teamB.wickets}</span></div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => setActiveMatchId(m.id)}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-1.5 rounded text-xs"
                  >
                    📝 Side-by-Side Scorecard
                  </button>
                  {m.status === 'Live' && (
                    <button 
                      onClick={() => {
                        const winTeam = m.teamA.score >= m.teamB.score ? m.teamA.name : m.teamB.name;
                        handleCompleteMatch(m.id, winTeam);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-3 py-1.5 rounded text-xs"
                    >
                      Finish Match
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Side-by-Side Detailed Scoring Modal / Drawer */}
      {activeMatch && (
        <div className="bg-slate-900 p-6 rounded-2xl border-2 border-amber-500/50 shadow-2xl space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-black text-amber-400">Live Side-by-Side Scorecard: {activeMatch.teamA.name} vs {activeMatch.teamB.name}</h4>
              <p className="text-[10px] text-slate-400">Capture individual player runs, 4s, 6s, and wickets in real-time.</p>
            </div>
            <button 
              onClick={() => setActiveMatchId(null)}
              className="text-slate-400 hover:text-slate-200 text-xs bg-slate-950 px-3 py-1 rounded border border-slate-800"
            >
              Close Scorecard ✕
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team A Scorecard */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                <h5 className="font-bold text-amber-300 text-xs">{activeMatch.teamA.name} (Total: {activeMatch.teamA.score}/{activeMatch.teamA.wickets})</h5>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {teams.find(t => t.id === activeMatch.teamA.id)?.players?.map(p => {
                  const pId = p.id || p.regId;
                  const stats = activeMatch.teamA.playerScores[pId] || { runs: 0, balls: 0, fours: 0, sixes: 0, wicketsTaken: 0 };
                  const role = playerRoles[pId] || 'Batsman';
                  return (
                    <div key={pId} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                      <div>
                        <span className="font-bold text-slate-200">{p.name}</span>
                        <span className="text-[10px] text-amber-400 ml-2">({role})</span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Runs: {stats.runs} | 4s: {stats.fours} | 6s: {stats.sixes} | Wickets: {stats.wicketsTaken}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleUpdatePlayerMatchStats(activeMatch.id, 'teamA', pId, 'runs', 1)} className="bg-slate-800 hover:bg-amber-500 hover:text-slate-950 px-2 py-1 rounded text-[10px] font-bold">+1R</button>
                        <button onClick={() => handleUpdatePlayerMatchStats(activeMatch.id, 'teamA', pId, 'runs', 4)} className="bg-slate-800 hover:bg-amber-500 hover:text-slate-950 px-2 py-1 rounded text-[10px] font-bold">+4</button>
                        <button onClick={() => handleUpdatePlayerMatchStats(activeMatch.id, 'teamA', pId, 'runs', 6)} className="bg-slate-800 hover:bg-amber-500 hover:text-slate-950 px-2 py-1 rounded text-[10px] font-bold">+6</button>
                        <button onClick={() => handleUpdatePlayerMatchStats(activeMatch.id, 'teamA', pId, 'wicketsTaken', 1)} className="bg-rose-950 hover:bg-rose-900 text-rose-300 px-2 py-1 rounded text-[10px] font-bold">+W</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team B Scorecard */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                <h5 className="font-bold text-amber-300 text-xs">{activeMatch.teamB.name} (Total: {activeMatch.teamB.score}/{activeMatch.teamB.wickets})</h5>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {teams.find(t => t.id === activeMatch.teamB.id)?.players?.map(p => {
                  const pId = p.id || p.regId;
                  const stats = activeMatch.teamB.playerScores[pId] || { runs: 0, balls: 0, fours: 0, sixes: 0, wicketsTaken: 0 };
                  const role = playerRoles[pId] || 'Batsman';
                  return (
                    <div key={pId} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                      <div>
                        <span className="font-bold text-slate-200">{p.name}</span>
                        <span className="text-[10px] text-amber-400 ml-2">({role})</span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Runs: {stats.runs} | 4s: {stats.fours} | 6s: {stats.sixes} | Wickets: {stats.wicketsTaken}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleUpdatePlayerMatchStats(activeMatch.id, 'teamB', pId, 'runs', 1)} className="bg-slate-800 hover:bg-amber-500 hover:text-slate-950 px-2 py-1 rounded text-[10px] font-bold">+1R</button>
                        <button onClick={() => handleUpdatePlayerMatchStats(activeMatch.id, 'teamB', pId, 'runs', 4)} className="bg-slate-800 hover:bg-amber-500 hover:text-slate-950 px-2 py-1 rounded text-[10px] font-bold">+4</button>
                        <button onClick={() => handleUpdatePlayerMatchStats(activeMatch.id, 'teamB', pId, 'runs', 6)} className="bg-slate-800 hover:bg-amber-500 hover:text-slate-950 px-2 py-1 rounded text-[10px] font-bold">+6</button>
                        <button onClick={() => handleUpdatePlayerMatchStats(activeMatch.id, 'teamB', pId, 'wicketsTaken', 1)} className="bg-rose-950 hover:bg-rose-900 text-rose-300 px-2 py-1 rounded text-[10px] font-bold">+W</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}