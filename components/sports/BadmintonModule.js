'use client';

import React, { useState } from 'react';

export default function BadmintonModule({ participants, sportState, onUpdateSportState }) {
  const categoriesList = sportState.categories || ['Open / All Categories', 'Under 12', 'Under 16', '18-49 Age Group'];
  const selectedCategory = sportState.selectedCategory || categoriesList[0];
  const gameMode = sportState.gameMode || 'Single'; // 'Single', 'Double', 'MixDouble'

  const rawTeams = sportState.teams || [];
  const teams = rawTeams.filter(t => !selectedCategory || t.category === selectedCategory);
  
  const matches = (sportState.matches || []).filter(m => !selectedCategory || m.category === selectedCategory);
  const activeTab = sportState.activeTab || 'teams'; // 'teams', 'fixtures', 'leaderboard'

  const [newTeamName, setNewTeamName] = useState('');
  const [selectedPlayer1Id, setSelectedPlayer1Id] = useState('');
  const [selectedPlayer2Id, setSelectedPlayer2Id] = useState('');

  // Collect IDs of players already registered in this specific category
  const usedPlayerIds = new Set();
  teams.forEach(t => {
    if (t.players) {
      t.players.forEach(p => usedPlayerIds.add(p.id.toString()));
    }
  });

  const availableParticipants = participants.filter(p => !usedPlayerIds.has((p.id || p.regId || p.Registration_ID).toString()));

  const setSportTab = (tab) => {
    onUpdateSportState({ activeTab: tab });
  };

  const handleCategoryChange = (cat) => {
    onUpdateSportState({ selectedCategory: cat });
    setSelectedPlayer1Id('');
    setSelectedPlayer2Id('');
  };

  const handleGameModeChange = (mode) => {
    onUpdateSportState({ gameMode: mode });
    setSelectedPlayer1Id('');
    setSelectedPlayer2Id('');
  };

  const handleCreateEntry = (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    let teamPlayers = [];
    if (gameMode === 'Single') {
      if (!selectedPlayer1Id) {
        alert('Please select a player for Single match.');
        return;
      }
      const p1 = participants.find(p => (p.id || p.regId || p.Registration_ID).toString() === selectedPlayer1Id.toString());
      if (!p1) return;
      teamPlayers = [{ id: p1.id || p1.regId || p1.Registration_ID, name: p1.name, gender: p1.gender || 'Male' }];
    } else if (gameMode === 'Double') {
      if (!selectedPlayer1Id || !selectedPlayer2Id) {
        alert('Please select two players for Doubles.');
        return;
      }
      if (selectedPlayer1Id === selectedPlayer2Id) {
        alert('Cannot select the same player twice.');
        return;
      }
      const p1 = participants.find(p => (p.id || p.regId || p.Registration_ID).toString() === selectedPlayer1Id.toString());
      const p2 = participants.find(p => (p.id || p.regId || p.Registration_ID).toString() === selectedPlayer2Id.toString());
      if (!p1 || !p2) return;
      teamPlayers = [
        { id: p1.id || p1.regId || p1.Registration_ID, name: p1.name, gender: p1.gender || 'Male' },
        { id: p2.id || p2.regId || p2.Registration_ID, name: p2.name, gender: p2.gender || 'Female' }
      ];
    } else if (gameMode === 'MixDouble') {
      if (!selectedPlayer1Id || !selectedPlayer2Id) {
        alert('Mixed Doubles requires 1 Male and 1 Female player.');
        return;
      }
      const p1 = participants.find(p => (p.id || p.regId || p.Registration_ID).toString() === selectedPlayer1Id.toString());
      const p2 = participants.find(p => (p.id || p.regId || p.Registration_ID).toString() === selectedPlayer2Id.toString());
      if (!p1 || !p2) return;

      const g1 = (p1.gender || 'Male').toLowerCase();
      const g2 = (p2.gender || 'Female').toLowerCase();
      if (g1 === g2) {
        alert('Mixed Doubles must consist of 1 Male and 1 Female player!');
        return;
      }
      teamPlayers = [
        { id: p1.id || p1.regId || p1.Registration_ID, name: p1.name, gender: p1.gender },
        { id: p2.id || p2.regId || p2.Registration_ID, name: p2.name, gender: p2.gender }
      ];
    }

    const newTeamObj = {
      id: 'badm_team_' + Date.now(),
      name: newTeamName.trim(),
      category: selectedCategory,
      gameMode: gameMode,
      players: teamPlayers,
      totalScore: 0,
      matchesPlayed: 0,
      matchesWon: 0
    };

    onUpdateSportState({ teams: [...(sportState.teams || []), newTeamObj] });
    setNewTeamName('');
    setSelectedPlayer1Id('');
    setSelectedPlayer2Id('');
  };

  const handleDeleteTeam = (teamId) => {
    onUpdateSportState({
      teams: (sportState.teams || []).filter(t => t.id !== teamId),
      matches: (sportState.matches || []).filter(m => m.teamAId !== teamId && m.teamBId !== teamId)
    });
  };

  const generateFixtures = (roundName = 'League Round') => {
    if (teams.length < 2) {
      alert('Please create at least 2 entries/teams in this category to generate fixtures.');
      return;
    }
    const newMatches = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        newMatches.push({
          id: 'badm_match_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          category: selectedCategory,
          gameMode: gameMode,
          round: roundName,
          teamAId: teams[i].id,
          teamBId: teams[j].id,
          teamAScore: 0,
          teamBScore: 0,
          completed: false
        });
      }
    }
    onUpdateSportState({ matches: [...(sportState.matches || []), ...newMatches], activeTab: 'fixtures' });
  };

  const generateKnockoutStage = (roundName) => {
    if (teams.length < 2) {
      alert('Not enough teams for knockout stage.');
      return;
    }
    const newMatches = [];
    for (let i = 0; i < teams.length - 1; i += 2) {
      newMatches.push({
        id: 'badm_match_' + Date.now() + '_' + i,
        category: selectedCategory,
        gameMode: gameMode,
        round: roundName,
        teamAId: teams[i].id,
        teamBId: teams[i + 1].id,
        teamAScore: 0,
        teamBScore: 0,
        completed: false
      });
    }
    onUpdateSportState({ matches: [...(sportState.matches || []), ...newMatches], activeTab: 'fixtures' });
  };

  const handleUpdateMatch = (matchId, teamAScore, teamBScore) => {
    const allMatches = sportState.matches || [];
    const updatedMatches = allMatches.map(m => {
      if (m.id === matchId) {
        return { ...m, teamAScore, teamBScore, completed: true };
      }
      return m;
    });

    onUpdateSportState({ matches: updatedMatches });
  };

  const handleDeleteMatch = (matchId) => {
    const allMatches = sportState.matches || [];
    onUpdateSportState({ matches: allMatches.filter(m => m.id !== matchId) });
  };

  const leaderboardEntries = teams.map(t => {
    let scoreSum = 0;
    let wins = 0;
    let played = 0;

    matches.forEach(m => {
      if (m.completed && (m.teamAId === t.id || m.teamBId === t.id)) {
        played++;
        if (m.teamAId === t.id) {
          scoreSum += Number(m.teamAScore || 0);
          if (Number(m.teamAScore || 0) > Number(m.teamBScore || 0)) wins++;
        } else {
          scoreSum += Number(m.teamBScore || 0);
          if (Number(m.teamBScore || 0) > Number(m.teamAScore || 0)) wins++;
        }
      }
    });

    return {
      ...t,
      matchesPlayed: played,
      matchesWon: wins,
      totalScore: scoreSum
    };
  }).sort((a, b) => b.matchesWon - a.matchesWon || b.totalScore - a.totalScore);

  const topLeader = leaderboardEntries[0];
  const isGrandFinaleCompleted = matches.some(m => m.round === 'Grand Finale' && m.completed && m.category === selectedCategory);
  const finaleMatch = matches.find(m => m.round === 'Grand Finale' && m.category === selectedCategory);
  let finaleWinner = null;
  if (isGrandFinaleCompleted && finaleMatch) {
    if (finaleMatch.teamAScore > finaleMatch.teamBScore) {
      finaleWinner = teams.find(t => t.id === finaleMatch.teamAId)?.name;
    } else if (finaleMatch.teamBScore > finaleMatch.teamAScore) {
      finaleWinner = teams.find(t => t.id === finaleMatch.teamBId)?.name;
    } else {
      finaleWinner = 'Tie Breaker Winner';
    }
  }

  return (
    <div className="space-y-6 bg-stone-50 min-h-full p-2 md:p-4 text-slate-900 rounded-2xl">
      {isGrandFinaleCompleted && (
        <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 p-6 rounded-2xl text-slate-950 text-center font-black shadow-xl animate-pulse space-y-2 border-2 border-amber-300">
          <div className="text-3xl">🎆 🏆 BADMINTON GRAND FINALE CHAMPIONS ({selectedCategory}) 🏆 🎇</div>
          <div className="text-xl tracking-wider uppercase">Winner: {finaleWinner}</div>
          <p className="text-xs font-bold text-slate-900">Outstanding performance through all rounds to claim the championship title!</p>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h3 className="text-sm font-black text-amber-700">🏸 Badminton Tournament Categories & Modes</h3>
            <p className="text-xs text-slate-600">Select category combination and game format. Registered players cannot be re-selected in the same category.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Game Format:</span>
            <select
              value={gameMode}
              onChange={(e) => handleGameModeChange(e.target.value)}
              className="bg-stone-50 border border-slate-300 text-xs font-black text-amber-800 p-2 rounded-xl outline-none shadow-inner"
            >
              <option value="Single">Singles (1 vs 1)</option>
              <option value="Double">Doubles (2 vs 2)</option>
              <option value="MixDouble">Mixed Doubles (1M + 1F per team)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
          {categoriesList.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition shadow-sm ${selectedCategory === cat ? 'bg-amber-500 text-slate-950 shadow' : 'bg-stone-100 text-slate-700 hover:bg-stone-200 border border-slate-200'}`}
            >
              🏷️ {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <button
          onClick={() => setSportTab('teams')}
          className={`px-4 py-2 rounded-lg text-xs font-black transition ${activeTab === 'teams' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-stone-100 text-slate-700 hover:bg-stone-200'}`}
        >
          🛡️ Category Entries / Teams ({teams.length})
        </button>
        <button
          onClick={() => setSportTab('fixtures')}
          className={`px-4 py-2 rounded-lg text-xs font-black transition ${activeTab === 'fixtures' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-stone-100 text-slate-700 hover:bg-stone-200'}`}
        >
          🏸 Single-Set Matches ({matches.length})
        </button>
        <button
          onClick={() => setSportTab('leaderboard')}
          className={`px-4 py-2 rounded-lg text-xs font-black transition ${activeTab === 'leaderboard' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-stone-100 text-slate-700 hover:bg-stone-200'}`}
        >
          🏆 Category Leaderboard
        </button>
      </div>

      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
            <h3 className="text-sm font-black text-amber-700">Add {gameMode === 'Single' ? 'Single Player' : gameMode === 'Double' ? 'Doubles Team' : 'Mixed Doubles Team'} ({selectedCategory})</h3>
            <form onSubmit={handleCreateEntry} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">{gameMode === 'Single' ? 'Player Display Name' : 'Team / Pair Name'}</label>
                <input
                  type="text"
                  placeholder={gameMode === 'Single' ? 'e.g., John Doe' : 'e.g., Smash Titans'}
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full bg-stone-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-900 outline-none shadow-inner"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">{gameMode === 'Single' ? 'Select Participant' : 'Player 1'}</label>
                <select
                  value={selectedPlayer1Id}
                  onChange={(e) => setSelectedPlayer1Id(e.target.value)}
                  className="w-full bg-stone-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-900 outline-none shadow-inner"
                >
                  <option value="">-- Choose Available Participant --</option>
                  {availableParticipants.map(p => {
                    const pId = p.id || p.regId || p.Registration_ID;
                    return (
                      <option key={pId} value={pId}>
                        {p.name} ({p.gender || 'General'}, {p.flat || p.ageGroup || 'General'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {gameMode !== 'Single' && (
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    {gameMode === 'MixDouble' ? 'Player 2 (Mandatory Opposite Gender)' : 'Player 2'}
                  </label>
                  <select
                    value={selectedPlayer2Id}
                    onChange={(e) => setSelectedPlayer2Id(e.target.value)}
                    className="w-full bg-stone-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-900 outline-none shadow-inner"
                  >
                    <option value="">-- Choose Player 2 --</option>
                    {availableParticipants.map(p => {
                      const pId = p.id || p.regId || p.Registration_ID;
                      return (
                        <option key={pId} value={pId}>
                          {p.name} ({p.gender || 'General'}, {p.flat || p.ageGroup || 'General'})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black p-2.5 rounded-xl text-xs transition shadow-sm">
                + Register Entry for {selectedCategory}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {teams.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs font-bold shadow-sm">
                No entries found for category "{selectedCategory}". Add entries on the left.
              </div>
            ) : (
              teams.map((team) => (
                <div key={team.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-black text-amber-800">{team.name}</h4>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] bg-stone-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">{team.gameMode || 'Single'}</span>
                        <span className="text-[10px] text-amber-700 font-bold">Wins: {team.matchesWon} | Played: {team.matchesPlayed}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm"
                    >
                      Delete Entry
                    </button>
                  </div>

                  <div className="bg-stone-50 p-3 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Assigned Players:</span>
                    <div className="flex flex-wrap gap-2">
                      {team.players && team.players.map((pl, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold text-slate-800 shadow-sm">
                          {pl.name} <span className="text-[10px] text-amber-600 font-normal">({pl.gender || 'Player'})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'fixtures' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap justify-between items-center gap-4 shadow-sm">
            <div>
              <h3 className="text-sm font-black text-amber-700">Single-Set Matches ({selectedCategory})</h3>
              <p className="text-[10px] text-slate-600">All matches decided on a single set (14 to 22 points range).</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => generateFixtures('League Round')}
                className="bg-stone-100 hover:bg-stone-200 text-amber-800 border border-slate-200 px-3 py-2 rounded-xl text-xs font-black shadow-sm"
              >
                + Generate League Fixtures
              </button>
              <button
                onClick={() => generateKnockoutStage('Quarter Finals')}
                className="bg-stone-100 hover:bg-stone-200 text-amber-800 border border-slate-200 px-3 py-2 rounded-xl text-xs font-black shadow-sm"
              >
                + Quarter Finals
              </button>
              <button
                onClick={() => generateKnockoutStage('Semi Finals')}
                className="bg-stone-100 hover:bg-stone-200 text-amber-800 border border-slate-200 px-3 py-2 rounded-xl text-xs font-black shadow-sm"
              >
                + Semi Finals
              </button>
              <button
                onClick={() => generateKnockoutStage('Grand Finale')}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-2 rounded-xl text-xs font-black shadow-sm"
              >
                + Grand Finale
              </button>
            </div>
          </div>

          {matches.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs font-bold shadow-sm">
              No matches generated for category "{selectedCategory}". Click above to generate fixtures.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {matches.map((match) => {
                const teamA = teams.find(t => t.id === match.teamAId) || { name: 'Entry A (Deleted)' };
                const teamB = teams.find(t => t.id === match.teamBId) || { name: 'Entry B (Deleted)' };

                return (
                  <BadmMatchCard
                    key={match.id}
                    match={match}
                    teamA={teamA}
                    teamB={teamB}
                    onSaveMatch={(aScore, bScore) => handleUpdateMatch(match.id, aScore, bScore)}
                    onDeleteMatch={() => handleDeleteMatch(match.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-black text-amber-700">🏆 Badminton Leaderboard ({selectedCategory})</h3>
              <p className="text-xs text-slate-600">Cumulative performance ranking based on single-set victories and total points in {selectedCategory}.</p>
            </div>
            {topLeader && (
              <div className="bg-stone-100 px-4 py-2 rounded-xl border border-slate-200 text-right shadow-sm">
                <span className="text-[10px] text-amber-700 font-bold block">Category Leader</span>
                <span className="text-xs font-black text-slate-900">{topLeader.name} ({topLeader.matchesWon} Wins)</span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase">
                  <th className="py-3 px-3">Rank</th>
                  <th className="py-3 px-3">Entry / Team / Player Name</th>
                  <th className="py-3 px-3">Format</th>
                  <th className="py-3 px-3 text-center">Matches Played</th>
                  <th className="py-3 px-3 text-center">Matches Won</th>
                  <th className="py-3 px-3 text-center">Total Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaderboardEntries.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-500 italic text-xs">
                      No records for this category yet. Record match scores in fixtures.
                    </td>
                  </tr>
                ) : (
                  leaderboardEntries.map((entry, idx) => (
                    <tr key={entry.id} className="hover:bg-stone-50">
                      <td className="py-3 px-3 font-black text-amber-700">#{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{entry.name}</td>
                      <td className="py-3 px-3 text-slate-600">{entry.gameMode || 'Single'}</td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-700">{entry.matchesPlayed}</td>
                      <td className="py-3 px-3 text-center font-black text-amber-700">{entry.matchesWon}</td>
                      <td className="py-3 px-3 text-center font-black text-cyan-700">{entry.totalScore} pts</td>
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

function BadmMatchCard({ match, teamA, teamB, onSaveMatch, onDeleteMatch }) {
  const [teamAScore, setTeamAScore] = useState(match.teamAScore || 0);
  const [teamBScore, setTeamBScore] = useState(match.teamBScore || 0);

  const handleSave = () => {
    onSaveMatch(Number(teamAScore) || 0, Number(teamBScore) || 0);
    alert('Badminton single-set match score saved successfully!');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <span className="bg-amber-500 text-slate-950 text-xs font-black px-2.5 py-1 rounded-lg uppercase shadow-sm">{match.round}</span>
          <span className="text-xs text-slate-600">{match.completed ? '✅ Completed' : '⚔️ Live / Pending'}</span>
        </div>
        <button onClick={onDeleteMatch} className="text-red-600 hover:text-red-700 text-xs font-bold">Delete Match</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-stone-50 p-5 rounded-xl border border-slate-200">
        <div className="space-y-2 text-center md:text-left border-b md:border-b-0 md:border-r border-slate-200 pb-4 md:pb-0 md:pr-4">
          <h4 className="text-sm font-black text-amber-800">{teamA.name}</h4>
          <div className="flex items-center justify-center md:justify-start gap-3">
            <span className="text-xs text-slate-600">Single Set Points (14-22):</span>
            <input
              type="number"
              min="0"
              max="30"
              value={teamAScore}
              onChange={(e) => setTeamAScore(e.target.value)}
              className="w-20 bg-white border border-slate-300 p-2 rounded-xl text-center text-sm font-black text-amber-800 outline-none shadow-inner"
            />
          </div>
        </div>

        <div className="space-y-2 text-center md:text-right pt-2 md:pt-0">
          <h4 className="text-sm font-black text-amber-800">{teamB.name}</h4>
          <div className="flex items-center justify-center md:justify-end gap-3">
            <input
              type="number"
              min="0"
              max="30"
              value={teamBScore}
              onChange={(e) => setTeamBScore(e.target.value)}
              className="w-20 bg-white border border-slate-300 p-2 rounded-xl text-center text-sm font-black text-amber-800 outline-none shadow-inner"
            />
            <span className="text-xs text-slate-600">Single Set Points (14-22):</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs transition shadow-sm"
        >
          💾 Save Single-Set Match Score
        </button>
      </div>
    </div>
  );
}