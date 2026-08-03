'use client';

import React, { useState } from 'react';

export default function TableTennisModule({ sportName = 'Table Tennis', participants = [], sportState = {}, onUpdateSportState }) {
  // Existing Category setup
  const categories = ['All', ...new Set((participants || []).map(p => p.category || 'General'))];
  const [selectedCategory, setSelectedCategory] = useState(categories[1] || categories[0] || 'General');

  // Match Type selection for Tournament Engine (Singles, Doubles, Mixed Doubles)
  const [selectedMatchType, setSelectedMatchType] = useState('singles'); // 'singles' | 'doubles' | 'mixed'

  // Existing Teams State
  const allTeams = sportState.teams || {};
  const categoryTeams = allTeams[selectedCategory] || { singles: [], doubles: [], mixed: [] };
  const [teams, setTeams] = useState(categoryTeams);

  // Existing Matches State
  const matches = sportState.matches || [];
  const [matchList, setMatchList] = useState(matches);

  // Tournament Engine State (stored per category & match type key: "Category_matchType")
  const categoryRoundsMap = sportState.categoryRounds || {};
  const roundKey = `${selectedCategory}_${selectedMatchType}`;
  const currentCategoryData = categoryRoundsMap[roundKey] || { rounds: [], currentRoundIndex: 0 };
  const rounds = currentCategoryData.rounds;
  const currentRoundIndex = currentCategoryData.currentRoundIndex;

  const [advancementCount, setAdvancementCount] = useState(2);
  const [groupSize, setGroupSize] = useState(4);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  // ----------------------------------------------------
  // Existing Handlers (Preserved 100%)
  // ----------------------------------------------------
  const updateTeamsState = (newCategoryTeams) => {
    const updatedAll = { ...allTeams, [selectedCategory]: newCategoryTeams };
    setTeams(newCategoryTeams);
    onUpdateSportState({ teams: updatedAll, matches: matchList, categoryRounds: categoryRoundsMap });
  };

  const updateMatchesState = (newMatches) => {
    setMatchList(newMatches);
    onUpdateSportState({ teams: allTeams, matches: newMatches, categoryRounds: categoryRoundsMap });
  };

  const updateTournamentState = (newRounds, newRoundIndex) => {
    const updatedMap = {
      ...categoryRoundsMap,
      [roundKey]: {
        rounds: newRounds !== undefined ? newRounds : rounds,
        currentRoundIndex: newRoundIndex !== undefined ? newRoundIndex : currentRoundIndex,
      }
    };
    onUpdateSportState({ teams: allTeams, matches: matchList, categoryRounds: updatedMap });
  };

  const catParticipants = participants.filter(p => selectedCategory === 'All' || (p.category || 'General') === selectedCategory);

  const getSelectedPlayerIds = () => {
    const selected = new Set();
    ['singles', 'doubles', 'mixed'].forEach(type => {
      if (Array.isArray(teams[type])) {
        teams[type].forEach(item => {
          if (item.player1) selected.add(item.player1);
          if (item.player2) selected.add(item.player2);
        });
      }
    });
    return selected;
  };

  const selectedIds = getSelectedPlayerIds();

  const handleAutoDistribute = () => {
    let pool = [...catParticipants];
    pool.sort(() => Math.random() - 0.5);

    const newSingles = [];
    const newDoubles = [];
    const newMixed = [];

    while (pool.length >= 1 && newSingles.length < 4) {
      const p = pool.shift();
      newSingles.push({ id: 's_' + Date.now() + Math.random(), player1: p.id || p.regId || p.Registration_ID, name1: p.name });
    }

    while (pool.length >= 2 && newDoubles.length < 3) {
      const p1 = pool.shift();
      const p2 = pool.shift();
      newDoubles.push({ 
        id: 'd_' + Date.now() + Math.random(), 
        player1: p1.id || p1.regId || p1.Registration_ID, name1: p1.name,
        player2: p2.id || p2.regId || p2.Registration_ID, name2: p2.name 
      });
    }

    while (pool.length >= 2 && newMixed.length < 3) {
      const p1 = pool.shift();
      const p2 = pool.shift();
      newMixed.push({ 
        id: 'm_' + Date.now() + Math.random(), 
        player1: p1.id || p1.regId || p1.Registration_ID, name1: p1.name,
        player2: p2.id || p2.regId || p2.Registration_ID, name2: p2.name 
      });
    }

    const updated = { singles: newSingles, doubles: newDoubles, mixed: newMixed };
    updateTeamsState(updated);
  };

  const handlePlayerChange = (type, index, field, playerId) => {
    const updatedList = [...teams[type]];
    updatedList[index] = { ...updatedList[index], [field]: playerId };
    updateTeamsState({ ...teams, [type]: updatedList });
  };

  const handleAddRow = (type) => {
    const updatedList = [...(teams[type] || []), { id: type + '_' + Date.now(), player1: '', player2: '' }];
    updateTeamsState({ ...teams, [type]: updatedList });
  };

  const handleRemoveRow = (type, index) => {
    const updatedList = teams[type].filter((_, i) => i !== index);
    updateTeamsState({ ...teams, [type]: updatedList });
  };

  const handleUpdateMatch = (id, field, value) => {
    const updated = matchList.map(m => m.id === id ? { ...m, [field]: value } : m);
    updateMatchesState(updated);
  };

  const handleAddMatch = (e) => {
    e.preventDefault();
    const newMatch = {
      id: 'm_' + Date.now(),
      round: 'Quarter Final',
      player1: '',
      player2: '',
      date: '',
      time: '',
      score: '',
      status: 'Scheduled'
    };
    updateMatchesState([...matchList, newMatch]);
  };

  const handleRemoveMatch = (id) => {
    updateMatchesState(matchList.filter(m => m.id !== id));
  };

  // ----------------------------------------------------
  // Tournament Engine & Leaderboard Logic
  // ----------------------------------------------------
  const getTournamentEntities = () => {
    const currentDraws = teams[selectedMatchType] || [];
    
    if (selectedMatchType === 'singles') {
      if (currentDraws.length > 0) {
        return currentDraws
          .map(d => {
            const found = catParticipants.find(p => (p.id || p.regId || p.Registration_ID) === d.player1);
            return found ? { id: found.id || found.regId || d.id, name: found.name, flat: found.flat || 'General' } : null;
          })
          .filter(Boolean);
      }
      return catParticipants.map(p => ({ id: p.id || p.regId || p.Registration_ID, name: p.name, flat: p.flat || 'General' }));
    } else {
      return currentDraws
        .map(d => {
          const p1 = catParticipants.find(p => (p.id || p.regId || p.Registration_ID) === d.player1);
          const p2 = catParticipants.find(p => (p.id || p.regId || p.Registration_ID) === d.player2);
          if (!p1 && !p2) return null;
          const name1 = p1 ? p1.name : 'TBD';
          const name2 = p2 ? p2.name : 'TBD';
          return {
            id: d.id || `${d.player1}_${d.player2}`,
            name: `${name1} & ${name2}`,
            flat: `${p1?.flat || ''}${p1 && p2 ? ' / ' : ''}${p2?.flat || ''}` || 'General'
          };
        })
        .filter(Boolean);
    }
  };

  const handleInitializeRound1 = () => {
    const tournamentEntities = getTournamentEntities();
    if (tournamentEntities.length < 2) {
      alert(`Not enough participants or teams configured in category "${selectedCategory}" (${selectedMatchType.toUpperCase()}) to start Round 1.`);
      return;
    }

    const shuffled = [...tournamentEntities].sort(() => 0.5 - Math.random());
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
        lost: 0,
        points: 0,
      }));

      const groupMatches = [];
      for (let x = 0; x < standings.length; x++) {
        for (let y = x + 1; y < standings.length; y++) {
          groupMatches.push({
            id: `TT_${roundKey}_${groupName}_${x}_${y}_${Date.now()}`,
            playerA: standings[x],
            playerB: standings[y],
            scoreA: null,
            scoreB: null,
            isLocked: false,
          });
        }
      }

      initialGroups.push({ groupName, standings, matches: groupMatches });
    }

    const newRounds = [{ roundName: 'Round 1 (Group Stage)', groups: initialGroups }];
    updateTournamentState(newRounds, 0);
    alert(`Round 1 initialized for ${selectedCategory} [${selectedMatchType.toUpperCase()}] with ${initialGroups.length} group(s)!`);
  };

  const updateMatchScore = (groupIndex, matchId, scoreA, scoreB) => {
    const currentRound = rounds[currentRoundIndex];
    if (!currentRound) return;

    const numA = Number(scoreA);
    const numB = Number(scoreB);

    const updatedGroups = currentRound.groups.map((grp, gIdx) => {
      if (gIdx !== groupIndex) return grp;

      const updatedMatches = grp.matches.map(m => {
        if (m.id === matchId) {
          return { ...m, scoreA: numA, scoreB: numB, isLocked: true };
        }
        return m;
      });

      const newStandings = grp.standings.map(s => ({
        ...s,
        played: 0,
        won: 0,
        lost: 0,
        points: 0,
      }));

      updatedMatches.forEach(m => {
        if (m.isLocked && m.scoreA !== null && m.scoreB !== null) {
          const pA = newStandings.find(s => s.id === m.playerA.id);
          const pB = newStandings.find(s => s.id === m.playerB.id);
          if (pA && pB) {
            const sA = Number(m.scoreA);
            const sB = Number(m.scoreB);
            pA.played += 1;
            pB.played += 1;
            if (sA > sB) {
              pA.won += 1; pA.points += 1;
              pB.lost += 1;
            } else if (sB > sA) {
              pB.won += 1; pB.points += 1;
              pA.lost += 1;
            }
          }
        }
      });

      return { ...grp, standings: newStandings, matches: updatedMatches };
    });

    const updatedRounds = [...rounds];
    updatedRounds[currentRoundIndex] = { ...currentRound, groups: updatedGroups };
    updateTournamentState(updatedRounds, currentRoundIndex);
  };

  const handleAdvanceToNextRound = () => {
    const currentRound = rounds[currentRoundIndex];
    if (!currentRound) return;

    const hasUncompletedMatches = currentRound.groups.some(grp =>
      grp.matches.some(m => !m.isLocked || m.scoreA === null || m.scoreB === null)
    );

    if (hasUncompletedMatches) {
      alert('❌ Cannot advance to the next round until ALL matches in the active round are completed and scored!');
      return;
    }

    let qualifiedPlayers = [];
    currentRound.groups.forEach(grp => {
      const sorted = [...grp.standings].sort((a, b) => b.points - a.points || b.won - a.won);
      const topN = sorted.slice(0, advancementCount);
      qualifiedPlayers.push(...topN);
    });

    const qSeenIds = new Set();
    const uniqueQualified = qualifiedPlayers.filter(p => {
      if (qSeenIds.has(p.id)) return false;
      qSeenIds.add(p.id);
      return true;
    });

    if (uniqueQualified.length < 2) {
      alert('Not enough qualified participants to form the next round.');
      return;
    }

    let nextRoundName = 'Next Round';
    if (uniqueQualified.length === 8) nextRoundName = 'Quarter Finals';
    else if (uniqueQualified.length === 4) nextRoundName = 'Semi Finals';
    else if (uniqueQualified.length <= 2) nextRoundName = 'Grand Finals 🏆';

    const shuffled = [...uniqueQualified].sort(() => 0.5 - Math.random());
    const nextGroups = [];
    let groupCharCode = 65;
    const currentGroupSize = uniqueQualified.length <= 4 ? uniqueQualified.length : groupSize;

    for (let i = 0; i < shuffled.length; i += currentGroupSize) {
      const groupPlayers = shuffled.slice(i, i + currentGroupSize);
      const groupName = uniqueQualified.length <= 4 ? nextRoundName : `Group ${String.fromCharCode(groupCharCode++)}`;
      
      const standings = groupPlayers.map(p => ({
        id: p.id,
        name: p.name,
        flat: p.flat,
        played: 0,
        won: 0,
        lost: 0,
        points: 0,
      }));

      const groupMatches = [];
      for (let x = 0; x < standings.length; x++) {
        for (let y = x + 1; y < standings.length; y++) {
          groupMatches.push({
            id: `TT_${roundKey}_${groupName}_${x}_${y}_${Date.now()}`,
            playerA: standings[x],
            playerB: standings[y],
            scoreA: null,
            scoreB: null,
            isLocked: false,
          });
        }
      }

      nextGroups.push({ groupName, standings, matches: groupMatches });
    }

    const updatedRounds = [...rounds, { roundName: nextRoundName, groups: nextGroups }];
    updateTournamentState(updatedRounds, rounds.length);
    alert(`Successfully advanced ${uniqueQualified.length} teams to ${nextRoundName} for ${selectedCategory} (${selectedMatchType.toUpperCase()})!`);
  };

  const verifyAdminPassword = (e) => {
    e.preventDefault();
    if (adminPasswordInput === 'admin123' || adminPasswordInput === 'tt2026') {
      setIsAdminUnlocked(true);
      setAdminPasswordInput('');
      alert('Admin unlocked! You can now override match results.');
    } else {
      alert('Incorrect admin password.');
    }
  };

  const currentRound = rounds[currentRoundIndex];
  const isGrandFinale = currentRound?.roundName?.toLowerCase().includes('grand finals');

  let grandChampion = null;
  if (isGrandFinale && currentRound.groups.length > 0) {
    const allStandings = currentRound.groups.flatMap(g => g.standings);
    allStandings.sort((a, b) => b.points - a.points || b.won - a.won);
    grandChampion = allStandings[0];
  }

  return (
    <div className="space-y-6">
      {/* Module Top Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-base font-black text-slate-900">🏓 {sportName} - Team Distribution & Tournament Suite</h3>
          <p className="text-xs text-slate-500 mt-0.5">Category-wise automatic team distribution, round progression, leaderboard score tracking, & match scheduler.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setTeams(allTeams[cat] || { singles: [], doubles: [], mixed: [] });
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedCategory === cat ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Auto Distribute Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <h4 className="font-black text-slate-900 text-sm">Active Category: <span className="text-amber-600">{selectedCategory}</span></h4>
          <p className="text-xs text-slate-500">Available participants: {catParticipants.length}</p>
        </div>
        <button
          onClick={handleAutoDistribute}
          className="bg-amber-500 hover:bg-amber-600 text-white font-black px-5 py-2.5 rounded-xl text-xs shadow transition flex items-center gap-2"
        >
          ⚡ Auto Distribute Teams
        </button>
      </div>

      {/* Singles Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-black text-slate-900 text-sm">👤 Singles Draws</h4>
          <button onClick={() => handleAddRow('singles')} className="text-xs font-bold text-amber-600 hover:underline">+ Add Singles Slot</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(teams.singles || []).map((item, idx) => (
            <div key={item.id || idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Singles #{idx + 1}</span>
                <button onClick={() => handleRemoveRow('singles', idx)} className="text-red-500 font-bold hover:underline">Remove</button>
              </div>
              <select
                value={item.player1 || ''}
                onChange={(e) => handlePlayerChange('singles', idx, 'player1', e.target.value)}
                className="w-full bg-white border border-slate-200 p-2 rounded-lg font-bold outline-none"
              >
                <option value="">Select Player</option>
                {catParticipants.map(p => {
                  const pid = p.id || p.regId || p.Registration_ID;
                  const isAssigned = selectedIds.has(pid) && item.player1 !== pid;
                  return (
                    <option key={pid} value={pid} disabled={isAssigned}>
                      {p.name} ({p.flat || 'General'}) {isAssigned ? '[Assigned]' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Doubles Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-black text-slate-900 text-sm">👥 Doubles Draws</h4>
          <button onClick={() => handleAddRow('doubles')} className="text-xs font-bold text-amber-600 hover:underline">+ Add Doubles Slot</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(teams.doubles || []).map((item, idx) => (
            <div key={item.id || idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Doubles Team #{idx + 1}</span>
                <button onClick={() => handleRemoveRow('doubles', idx)} className="text-red-500 font-bold hover:underline">Remove</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={item.player1 || ''}
                  onChange={(e) => handlePlayerChange('doubles', idx, 'player1', e.target.value)}
                  className="bg-white border border-slate-200 p-2 rounded-lg font-bold outline-none"
                >
                  <option value="">Player 1</option>
                  {catParticipants.map(p => {
                    const pid = p.id || p.regId || p.Registration_ID;
                    const isAssigned = selectedIds.has(pid) && item.player1 !== pid;
                    return (
                      <option key={pid} value={pid} disabled={isAssigned}>
                        {p.name} {isAssigned ? '[Assigned]' : ''}
                      </option>
                    );
                  })}
                </select>
                <select
                  value={item.player2 || ''}
                  onChange={(e) => handlePlayerChange('doubles', idx, 'player2', e.target.value)}
                  className="bg-white border border-slate-200 p-2 rounded-lg font-bold outline-none"
                >
                  <option value="">Player 2</option>
                  {catParticipants.map(p => {
                    const pid = p.id || p.regId || p.Registration_ID;
                    const isAssigned = selectedIds.has(pid) && item.player2 !== pid;
                    return (
                      <option key={pid} value={pid} disabled={isAssigned}>
                        {p.name} {isAssigned ? '[Assigned]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mixed Doubles Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-black text-slate-900 text-sm">👫 Mixed Doubles Draws</h4>
          <button onClick={() => handleAddRow('mixed')} className="text-xs font-bold text-amber-600 hover:underline">+ Add Mixed Doubles Slot</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(teams.mixed || []).map((item, idx) => (
            <div key={item.id || idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Mixed Team #{idx + 1}</span>
                <button onClick={() => handleRemoveRow('mixed', idx)} className="text-red-500 font-bold hover:underline">Remove</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={item.player1 || ''}
                  onChange={(e) => handlePlayerChange('mixed', idx, 'player1', e.target.value)}
                  className="bg-white border border-slate-200 p-2 rounded-lg font-bold outline-none"
                >
                  <option value="">Player 1</option>
                  {catParticipants.map(p => {
                    const pid = p.id || p.regId || p.Registration_ID;
                    const isAssigned = selectedIds.has(pid) && item.player1 !== pid;
                    return (
                      <option key={pid} value={pid} disabled={isAssigned}>
                        {p.name} {isAssigned ? '[Assigned]' : ''}
                      </option>
                    );
                  })}
                </select>
                <select
                  value={item.player2 || ''}
                  onChange={(e) => handlePlayerChange('mixed', idx, 'player2', e.target.value)}
                  className="bg-white border border-slate-200 p-2 rounded-lg font-bold outline-none"
                >
                  <option value="">Player 2</option>
                  {catParticipants.map(p => {
                    const pid = p.id || p.regId || p.Registration_ID;
                    const isAssigned = selectedIds.has(pid) && item.player2 !== pid;
                    return (
                      <option key={pid} value={pid} disabled={isAssigned}>
                        {p.name} {isAssigned ? '[Assigned]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ==================================================== */}
      {/* TOURNAMENT ROUND PROGRESSION & LEADERBOARD ENGINE */}
      {/* ==================================================== */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-white shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h3 className="text-sm font-black text-amber-400">🏆 Table Tennis Tournament & Leaderboards</h3>
            <p className="text-xs text-slate-400">Score tracking, multi-round group stage, strict progression validation, and finals celebration.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 font-bold">Format:</span>
              <select
                value={selectedMatchType}
                onChange={(e) => setSelectedMatchType(e.target.value)}
                className="bg-slate-900 text-amber-400 font-bold rounded p-1 outline-none uppercase"
              >
                <option value="singles">Singles</option>
                <option value="doubles">Doubles</option>
                <option value="mixed">Mixed Doubles</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 font-bold">Top Advance:</span>
              <select
                value={advancementCount}
                onChange={(e) => setAdvancementCount(Number(e.target.value))}
                className="bg-slate-900 text-amber-400 font-bold rounded p-1 outline-none"
              >
                <option value={2}>Top 2</option>
                <option value={3}>Top 3</option>
                <option value={1}>Top 1</option>
              </select>
            </div>

            {rounds.length === 0 && (
              <button
                onClick={handleInitializeRound1}
                className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow"
              >
                🚀 Start Tournament ({selectedCategory} - {selectedMatchType.toUpperCase()})
              </button>
            )}
          </div>
        </div>

        {/* Security Bar */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">Admin Override Security:</span>
            {isAdminUnlocked ? (
              <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-black border border-emerald-500/20">Unlocked 🔓</span>
            ) : (
              <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-black border border-amber-500/20">Locked 🔒</span>
            )}
          </div>
          {!isAdminUnlocked && (
            <form onSubmit={verifyAdminPassword} className="flex gap-2">
              <input
                type="password"
                placeholder="Admin Password"
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                className="bg-slate-900 text-slate-200 px-2 py-1 rounded border border-slate-800 text-xs outline-none"
              />
              <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold px-3 py-1 rounded border border-slate-800">
                Unlock
              </button>
            </form>
          )}
        </div>

        {/* Round Tabs */}
        {rounds.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 items-center">
            <span className="text-xs font-bold text-amber-300 mr-2">[{selectedCategory} - {selectedMatchType.toUpperCase()} Rounds]:</span>
            {rounds.map((r, idx) => (
              <button
                key={idx}
                onClick={() => updateTournamentState(undefined, idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap border transition ${
                  currentRoundIndex === idx ? 'bg-amber-500 text-slate-950 border-amber-400 shadow' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                {r.roundName}
              </button>
            ))}
          </div>
        )}

        {/* Tournament Groups & Match Matrix */}
        {currentRound ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">
                {selectedCategory} ({selectedMatchType.toUpperCase()}) — {currentRound.roundName}
              </h4>

              {!isGrandFinale ? (
                <button onClick={handleAdvanceToNextRound} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded-xl text-xs shadow">
                  ⚡ Regroup & Advance Top {advancementCount}
                </button>
              ) : (
                <span className="text-xs bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-xl font-black border border-amber-500/20">
                  🏆 Grand Finale Stage — Tournament Conclusion
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {currentRound.groups.map((grp, gIdx) => (
                <div key={grp.groupName} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h5 className="font-black text-amber-400 text-xs">{grp.groupName}</h5>
                    <span className="text-[10px] text-slate-400">Leaderboard & Standings</span>
                  </div>

                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-2">Rank & Player/Team</th>
                        <th className="pb-2">Flat</th>
                        <th className="pb-2">P</th>
                        <th className="pb-2">W</th>
                        <th className="pb-2">L</th>
                        <th className="pb-2 text-amber-400 font-black">Pts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {grp.standings.sort((a, b) => b.points - a.points || b.won - a.won).map((s, rank) => (
                        <tr key={s.id} className={rank < advancementCount ? 'bg-emerald-950/20' : ''}>
                          <td className="py-2.5 font-bold text-slate-100 flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                              rank < advancementCount ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {rank + 1}
                            </span>
                            {s.name}
                          </td>
                          <td className="py-2.5 text-slate-400">{s.flat}</td>
                          <td className="py-2.5 text-slate-300">{s.played}</td>
                          <td className="py-2.5 text-emerald-400">{s.won}</td>
                          <td className="py-2.5 text-rose-400">{s.lost}</td>
                          <td className="py-2.5 font-black text-amber-300">{s.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Score Matrix */}
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Match Score Grid</span>
                    {grp.matches.map((m) => (
                      <div key={m.id} className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
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
                              onChange={(e) => {
                                const valA = Number(e.target.value);
                                const valB = valA === 1 ? 0 : 1;
                                updateMatchScore(gIdx, m.id, valA, valB);
                              }}
                              className="bg-slate-950 text-amber-400 font-bold text-xs p-1.5 rounded border border-slate-800 outline-none"
                            >
                              <option value="" disabled>Winner Option</option>
                              <option value={1}>1 (Win)</option>
                              <option value={0}>0 (Loss)</option>
                            </select>

                            <span className="text-slate-500 font-bold">-</span>

                            <select
                              value={m.scoreB !== null ? m.scoreB : ''}
                              onChange={(e) => {
                                const valB = Number(e.target.value);
                                const valA = valB === 1 ? 0 : 1;
                                updateMatchScore(gIdx, m.id, valA, valB);
                              }}
                              className="bg-slate-950 text-amber-400 font-bold text-xs p-1.5 rounded border border-slate-800 outline-none"
                            >
                              <option value="" disabled>Winner Option</option>
                              <option value={1}>1 (Win)</option>
                              <option value={0}>0 (Loss)</option>
                            </select>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Grand Finale Box */}
              {isGrandFinale && (
                <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-yellow-950/30 p-8 rounded-2xl border-2 border-amber-500/50 shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
                  <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 rounded-full flex items-center justify-center text-3xl font-black shadow-lg shadow-amber-500/40 mb-3 animate-bounce">
                    👑
                  </div>
                  <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-3 py-1 rounded-full uppercase tracking-widest mb-2">
                    Grand Champion ({selectedCategory} - {selectedMatchType.toUpperCase()}) 🎆
                  </span>
                  <h3 className="text-xl font-black text-amber-300 mt-2">
                    {grandChampion ? grandChampion.name : 'Waiting for Final Result...'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 font-bold">
                    {grandChampion ? `Flat: ${grandChampion.flat} • Total Wins: ${grandChampion.won}` : 'Complete the Grand Finale match grid to reveal the champion.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-10 bg-slate-950 rounded-xl border border-slate-800 text-slate-400 space-y-3">
            <p>No active tournament round initialized for: <strong className="text-amber-400">{selectedCategory} [{selectedMatchType.toUpperCase()}]</strong>.</p>
            <button
              onClick={handleInitializeRound1}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow"
            >
              🚀 Start Round 1
            </button>
          </div>
        )}
      </div>

      {/* Match Scheduler & Rescheduling Hub */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-black text-slate-900 text-sm">📅 Match Scheduler & Rescheduling Hub</h4>
          <button onClick={handleAddMatch} className="bg-amber-500 hover:bg-amber-600 text-white font-black px-4 py-2 rounded-xl text-xs shadow transition">
            + Add Match Draw
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                <th className="p-3">Round / Draw</th>
                <th className="p-3">Player 1 / Team 1</th>
                <th className="p-3">Player 2 / Team 2</th>
                <th className="p-3">Date</th>
                <th className="p-3">Time</th>
                <th className="p-3">Score / Result</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matchList.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-4 text-center text-slate-400 italic">No matches scheduled yet. Click "+ Add Match Draw" to begin.</td>
                </tr>
              ) : (
                matchList.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/80">
                    <td className="p-3">
                      <input
                        type="text"
                        value={m.round || ''}
                        onChange={(e) => handleUpdateMatch(m.id, 'round', e.target.value)}
                        className="bg-slate-50 border border-slate-200 p-1.5 rounded w-28 font-bold text-amber-700 outline-none"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        placeholder="Player 1"
                        value={m.player1 || ''}
                        onChange={(e) => handleUpdateMatch(m.id, 'player1', e.target.value)}
                        className="bg-slate-50 border border-slate-200 p-1.5 rounded w-32 outline-none font-medium"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        placeholder="Player 2"
                        value={m.player2 || ''}
                        onChange={(e) => handleUpdateMatch(m.id, 'player2', e.target.value)}
                        className="bg-slate-50 border border-slate-200 p-1.5 rounded w-32 outline-none font-medium"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="date"
                        value={m.date || ''}
                        onChange={(e) => handleUpdateMatch(m.id, 'date', e.target.value)}
                        className="bg-slate-50 border border-slate-200 p-1.5 rounded text-xs outline-none focus:border-amber-500"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="time"
                        value={m.time || ''}
                        onChange={(e) => handleUpdateMatch(m.id, 'time', e.target.value)}
                        className="bg-slate-50 border border-slate-200 p-1.5 rounded text-xs outline-none focus:border-amber-500"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        placeholder="e.g. 11-9, 11-7"
                        value={m.score || ''}
                        onChange={(e) => handleUpdateMatch(m.id, 'score', e.target.value)}
                        className="bg-slate-50 border border-slate-200 p-1.5 rounded w-28 outline-none font-mono"
                      />
                    </td>
                    <td className="p-3">
                      <select
                        value={m.status || 'Scheduled'}
                        onChange={(e) => handleUpdateMatch(m.id, 'status', e.target.value)}
                        className="bg-slate-50 border border-slate-200 p-1.5 rounded text-xs font-bold outline-none"
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="Rescheduled">Rescheduled</option>
                        <option value="Live">Live</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <button onClick={() => handleRemoveMatch(m.id)} className="text-red-500 font-bold hover:underline text-xs">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}