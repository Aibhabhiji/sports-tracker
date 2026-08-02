'use client';

import React, { useState } from 'react';

export default function TableTennisModule({ participants, sportState, onUpdateSportState }) {
  // sportState structure: { categories: [], teams: [], matches: [], activeTab: 'teams' }
  const categoriesList = sportState.categories || ['Open / All Categories', 'Under 12', 'Under 16', '18-49 Age Group'];
  const selectedCategory = sportState.selectedCategory || categoriesList[0];
  const gameMode = sportState.gameMode || 'Single'; // 'Single', 'Double', 'MixDouble'

  const rawTeams = sportState.teams || [];
  const teams = rawTeams.filter(t => !selectedCategory || t.category === selectedCategory);
  
  const matches = (sportState.matches || []).filter(m => !selectedCategory || m.category === selectedCategory);
  const activeTab = sportState.activeTab || 'teams'; // 'teams', 'fixtures', 'leaderboard'

  // Form states for creating entries/teams
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedPlayer1Id, setSelectedPlayer1Id] = useState('');
  const [selectedPlayer2Id, setSelectedPlayer2Id] = useState('');
  const [activeTeamId, setActiveTeamId] = useState(null);

  const setSportTab = (tab) => {
    onUpdateSportState({ activeTab: tab });
  };

  const handleCategoryChange = (cat) => {
    onUpdateSportState({ selectedCategory: cat });
  };

  const handleGameModeChange = (mode) => {
    onUpdateSportState({ gameMode: mode });
  };

  // Add Entry / Team based on Mode
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
      id: 'tt_team_' + Date.now(),
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

  // Generate Fixtures for Selected Category
  const generateFixtures = (roundName = 'League Round') => {
    if (teams.length < 2) {
      alert('Please create at least 2 entries/teams in this category to generate fixtures.');
      return;
    }
    const newMatches = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        newMatches.push({
          id: 'tt_match_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          category: selectedCategory,
          gameMode: gameMode,
          round: roundName,
          teamAId: teams[i].id,
          teamBId: teams[j].id,
          teamAScore: 0,
          teamBScore: 0,
          sets: [], // Array of set scores [{setNo: 1, teamAScore: 11, teamBScore: 9}]
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
        id: 'tt_match_' + Date.now() + '_' + i,
        category: selectedCategory,
        gameMode: gameMode,
        round: roundName,
        teamAId: teams[i].id,
        teamBId: teams[i + 1].id,
        teamAScore: 0,
        teamBScore: 0,
        sets: [],
        completed: false
      });
    }
    onUpdateSportState({ matches: [...(sportState.matches || []), ...newMatches], activeTab: 'fixtures' });
  };

  // Update Match Score & Sets
  const handleUpdateMatch = (matchId, teamAScore, teamBScore, sets) => {
    const allMatches = sportState.matches || [];
    const updatedMatches = allMatches.map(m => {
      if (m.id === matchId) {
        return { ...m, teamAScore, teamBScore, sets, completed: true };
      }
      return m;
    });

    onUpdateSportState({ matches: updatedMatches });
  };

  const handleDeleteMatch = (matchId) => {
    const allMatches = sportState.matches || [];
    onUpdateSportState({ matches: allMatches.filter(m => m.id !== matchId) });
  };

  // Leaderboard calculation for current category
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
    <div className="space-y-6">
      {/* Grand Finale Fireworks Banner */}
      {isGrandFinaleCompleted && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 p-6 rounded-2xl text-slate-950 text-center font-black shadow-2xl animate-pulse space-y-2 border-4 border-emerald-300">
          <div className="text-3xl">🎆 🏆 TABLE TENNIS GRAND FINALE CHAMPIONS ({selectedCategory}) 🏆 🎇</div>
          <div className="text-xl tracking-wider uppercase">Winner: {finaleWinner}</div>
          <p className="text-xs font-bold text-slate-900">Outstanding performance through all rounds to claim the championship title!</p>
        </div>
      )}

      {/* Category Selection & Filtering Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3 shadow-xl">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h3 className="text-sm font-black text-emerald-400">🏓 Table Tennis Tournament Categories & Modes</h3>
            <p className="text-xs text-slate-400">Select category combination and game format to manage participants, draws, and matches.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300">Game Format:</span>
            <select
              value={gameMode}
              onChange={(e) => handleGameModeChange(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs font-black text-emerald-300 p-2 rounded-xl outline-none"
            >
              <option value="Single">Singles (1 vs 1)</option>
              <option value="Double">Doubles (2 vs 2)</option>
              <option value="MixDouble">Mixed Doubles (1M + 1F per team)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
          {categoriesList.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition ${selectedCategory === cat ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'}`}
            >
              🏷️ {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
        <button
          onClick={() => setSportTab('teams')}
          className={`px-4 py-2 rounded-lg text-xs font-black transition ${activeTab === 'teams' ? 'bg-emerald-400 text-slate-950' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'}`}
        >
          🛡️ Category Entries / Teams ({teams.length})
        </button>
        <button
          onClick={() => setSportTab('fixtures')}
          className={`px-4 py-2 rounded-lg text-xs font-black transition ${activeTab === 'fixtures' ? 'bg-emerald-400 text-slate-950' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'}`}
        >
          🏓 Matches & Side-by-Side Scoring ({matches.length})
        </button>
        <button
          onClick={() => setSportTab('leaderboard')}
          className={`px-4 py-2 rounded-lg text-xs font-black transition ${activeTab === 'leaderboard' ? 'bg-emerald-400 text-slate-950' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'}`}
        >
          🏆 Category Leaderboard
        </button>
      </div>

      {/* TAB 1: TEAMS & ENTRIES */}
      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-black text-emerald-400">Add {gameMode === 'Single' ? 'Single Player' : gameMode === 'Double' ? 'Doubles Team' : 'Mixed Doubles Team'} ({selectedCategory})</h3>
            <form onSubmit={handleCreateEntry} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">{gameMode === 'Single' ? 'Player Display Name' : 'Team / Pair Name'}</label>
                <input
                  type="text"
                  placeholder={gameMode === 'Single' ? 'e.g., John Doe' : 'e.g., Smash Titans'}
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs font-bold text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">{gameMode === 'Single' ? 'Select Participant' : 'Player 1'}</label>
                <select
                  value={selectedPlayer1Id}
                  onChange={(e) => setSelectedPlayer1Id(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs font-bold text-slate-200 outline-none"
                >
                  <option value="">-- Choose Participant --</option>
                  {participants.map(p => {
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
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    {gameMode === 'MixDouble' ? 'Player 2 (Mandatory Opposite Gender)' : 'Player 2'}
                  </label>
                  <select
                    value={selectedPlayer2Id}
                    onChange={(e) => setSelectedPlayer2Id(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs font-bold text-slate-200 outline-none"
                  >
                    <option value="">-- Choose Player 2 --</option>
                    {participants.map(p => {
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

              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black p-2.5 rounded-xl text-xs transition shadow">
                + Register Entry for {selectedCategory}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {teams.length === 0 ? (
              <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs font-bold">
                No entries found for category "{selectedCategory}". Add entries on the left.
              </div>
            ) : (
              teams.map((team) => (
                <div key={team.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-black text-emerald-300">{team.name}</h4>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded text-slate-400 border border-slate-800">{team.gameMode || 'Single'}</span>
                        <span className="text-[10px] text-emerald-400 font-bold">Wins: {team.matchesWon} | Played: {team.matchesPlayed}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-900/60 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                    >
                      Delete Entry
                    </button>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Players:</span>
                    <div className="flex flex-wrap gap-2">
                      {team.players && team.players.map((pl, idx) => (
                        <div key={idx} className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg text-xs font-bold text-slate-200">
                          {pl.name} <span className="text-[10px] text-emerald-400 font-normal">({pl.gender || 'Player'})</span>
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

      {/* TAB 2: FIXTURES & SIDE-BY-SIDE SET SCORING */}
      {activeTab === 'fixtures' && (
        <div className="space-y-6">
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-wrap justify-between items-center gap-4">
            <div>
              <h3 className="text-sm font-black text-emerald-400">Tournament Stages & Fixtures ({selectedCategory})</h3>
              <p className="text-[10px] text-slate-400">Generate matches for League, Quarter Finals, Semi Finals, and Grand Finale.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => generateFixtures('League Round')}
                className="bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-800 px-3 py-2 rounded-xl text-xs font-black shadow"
              >
                + Generate League Fixtures
              </button>
              <button
                onClick={() => generateKnockoutStage('Quarter Finals')}
                className="bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-800 px-3 py-2 rounded-xl text-xs font-black shadow"
              >
                + Quarter Finals
              </button>
              <button
                onClick={() => generateKnockoutStage('Semi Finals')}
                className="bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-800 px-3 py-2 rounded-xl text-xs font-black shadow"
              >
                + Semi Finals
              </button>
              <button
                onClick={() => generateKnockoutStage('Grand Finale')}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-2 rounded-xl text-xs font-black shadow"
              >
                + Grand Finale
              </button>
            </div>
          </div>

          {matches.length === 0 ? (
            <div className="bg-slate-900 p-12 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs font-bold">
              No matches generated for category "{selectedCategory}". Click above to generate fixtures.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {matches.map((match) => {
                const teamA = teams.find(t => t.id === match.teamAId) || { name: 'Entry A (Deleted)' };
                const teamB = teams.find(t => t.id === match.teamBId) || { name: 'Entry B (Deleted)' };

                return (
                  <TTMatchCard
                    key={match.id}
                    match={match}
                    teamA={teamA}
                    teamB={teamB}
                    onSaveMatch={(aScore, bScore, sets) => handleUpdateMatch(match.id, aScore, bScore, sets)}
                    onDeleteMatch={() => handleDeleteMatch(match.id)}
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
              <h3 className="text-base font-black text-emerald-400">🏆 Table Tennis Leaderboard ({selectedCategory})</h3>
              <p className="text-xs text-slate-400">Cumulative performance ranking based on matches won and total scores in {selectedCategory}.</p>
            </div>
            {topLeader && (
              <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-right">
                <span className="text-[10px] text-emerald-400 font-bold block">Category Leader</span>
                <span className="text-xs font-black text-slate-100">{topLeader.name} ({topLeader.matchesWon} Wins)</span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                  <th className="py-3 px-3">Rank</th>
                  <th className="py-3 px-3">Entry / Team / Player Name</th>
                  <th className="py-3 px-3">Format</th>
                  <th className="py-3 px-3 text-center">Matches Played</th>
                  <th className="py-3 px-3 text-center">Matches Won</th>
                  <th className="py-3 px-3 text-center">Total Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leaderboardEntries.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-500 italic text-xs">
                      No records for this category yet. Record match scores in fixtures.
                    </td>
                  </tr>
                ) : (
                  leaderboardEntries.map((entry, idx) => (
                    <tr key={entry.id} className="hover:bg-slate-950/40">
                      <td className="py-3 px-3 font-black text-emerald-400">#{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-100">{entry.name}</td>
                      <td className="py-3 px-3 text-slate-400">{entry.gameMode || 'Single'}</td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-300">{entry.matchesPlayed}</td>
                      <td className="py-3 px-3 text-center font-black text-emerald-400">{entry.matchesWon}</td>
                      <td className="py-3 px-3 text-center font-black text-cyan-400">{entry.totalScore} pts</td>
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

function TTMatchCard({ match, teamA, teamB, onSaveMatch, onDeleteMatch }) {
  const [teamAScore, setTeamAScore] = useState(match.teamAScore || 0);
  const [teamBScore, setTeamBScore] = useState(match.teamBScore || 0);
  const [sets, setSets] = useState(match.sets || [
    { setNo: 1, teamAScore: 0, teamBScore: 0 },
    { setNo: 2, teamAScore: 0, teamBScore: 0 },
    { setNo: 3, teamAScore: 0, teamBScore: 0 }
  ]);

  const handleSetScoreChange = (index, field, val) => {
    const updatedSets = [...sets];
    updatedSets[index][field] = Number(val) || 0;
    setSets(updatedSets);

    // Auto calculate match total sets won or cumulative score
    let aTotal = 0;
    let bTotal = 0;
    updatedSets.forEach(s => {
      if (s.teamAScore > s.teamBScore) aTotal++;
      else if (s.teamBScore > s.teamAScore) bTotal++;
    });
    setTeamAScore(aTotal);
    setTeamBScore(bTotal);
  };

  const handleAddSet = () => {
    setSets([...sets, { setNo: sets.length + 1, teamAScore: 0, teamBScore: 0 }]);
  };

  const handleRemoveSet = (index) => {
    const updatedSets = sets.filter((_, i) => i !== index);
    setSets(updatedSets);
  };

  const handleSave = () => {
    onSaveMatch(teamAScore, teamBScore, sets);
    alert('Table tennis match score saved successfully!');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <span className="bg-emerald-400 text-slate-950 text-xs font-black px-2.5 py-1 rounded-lg uppercase">{match.round}</span>
          <span className="text-xs text-slate-400">{match.completed ? '✅ Completed' : '⚔️ Live / Pending'}</span>
        </div>
        <button onClick={onDeleteMatch} className="text-red-400 hover:text-red-300 text-xs font-bold">Delete Match</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
        <div className="text-center md:text-left space-y-1 border-b md:border-b-0 md:border-r border-slate-800 pb-4 md:pb-0 md:pr-4">
          <h4 className="text-sm font-black text-emerald-300">{teamA.name}</h4>
          <div className="text-2xl font-black text-emerald-400">{teamAScore} <span className="text-xs text-slate-400 font-normal">Sets Won</span></div>
        </div>
        <div className="text-center md:text-right space-y-1 pt-2 md:pt-0">
          <h4 className="text-sm font-black text-emerald-300">{teamB.name}</h4>
          <div className="text-2xl font-black text-emerald-400">{teamBScore} <span className="text-xs text-slate-400 font-normal">Sets Won</span></div>
        </div>
      </div>

      {/* Side-by-Side Set Score Capture */}
      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex justify-between items-center">
          <h5 className="text-xs font-black text-slate-300">🏓 Side-by-Side Set Score Tracker (Standard 11-point sets)</h5>
          <button
            onClick={handleAddSet}
            className="bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 px-3 py-1 rounded-lg text-xs font-bold"
          >
            + Add Set
          </button>
        </div>

        <div className="space-y-2">
          {sets.map((setObj, idx) => (
            <div key={idx} className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs font-black text-emerald-300 w-16">Set #{setObj.setNo || idx + 1}</span>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">{teamA.name}:</span>
                <input
                  type="number"
                  min="0"
                  value={setObj.teamAScore}
                  onChange={(e) => handleSetScoreChange(idx, 'teamAScore', e.target.value)}
                  className="w-16 bg-slate-950 border border-slate-800 p-1.5 rounded-lg text-center text-xs font-bold text-emerald-400 outline-none"
                />
              </div>

              <span className="text-slate-600 font-bold">vs</span>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">{teamB.name}:</span>
                <input
                  type="number"
                  min="0"
                  value={setObj.teamBScore}
                  onChange={(e) => handleSetScoreChange(idx, 'teamBScore', e.target.value)}
                  className="w-16 bg-slate-950 border border-slate-800 p-1.5 rounded-lg text-center text-xs font-bold text-emerald-400 outline-none"
                />
              </div>

              <button
                onClick={() => handleRemoveSet(idx)}
                className="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs transition shadow"
        >
          💾 Save Match Score & Sets
        </button>
      </div>
    </div>
  );
}