'use client';

import React, { useState, useEffect } from 'react';

export default function BadmintonModule({ participants = [], sportState = {}, onUpdateSportState }) {
  // Extract format: 'singles', 'doubles', 'mixed_doubles'
  const gameFormat = sportState.gameFormat || 'singles';

  // Synchronized Local State to prevent state loss during browser alert blocks
  const [localSubTab, setLocalSubTab] = useState(sportState.activeSubTab || 'teams');
  const [localMatches, setLocalMatches] = useState(sportState.matches || []);
  const [localTeams, setLocalTeams] = useState(sportState.teams || []);

  // Sync state with parent props when sportState updates
  useEffect(() => {
    if (sportState.activeSubTab) setLocalSubTab(sportState.activeSubTab);
    if (sportState.matches) setLocalMatches(sportState.matches);
    if (sportState.teams) setLocalTeams(sportState.teams);
  }, [sportState.activeSubTab, sportState.matches, sportState.teams]);

  // Unified single-dispatch function to prevent state overwrites in parent
  const updateParentAndLocal = (updatedFields) => {
    if (updatedFields.activeSubTab !== undefined) setLocalSubTab(updatedFields.activeSubTab);
    if (updatedFields.matches !== undefined) setLocalMatches(updatedFields.matches);
    if (updatedFields.teams !== undefined) setLocalTeams(updatedFields.teams);
    if (updatedFields.gameFormat !== undefined) {
      // Keep format updated
    }

    if (onUpdateSportState) {
      onUpdateSportState({
        ...sportState,
        ...updatedFields,
      });
    }
  };

  // Helper to extract player name from any data structure
  const getPlayerName = (p) => {
    if (!p) return 'Player';
    return (
      p.name ||
      p.Name ||
      p.participantName ||
      p.fullName ||
      p['Participant Name'] ||
      p.playerName ||
      `Participant #${p.id || p.regId || ''}`
    );
  };

  // Helper to normalize and extract participant gender accurately
  const getParticipantGender = (p) => {
    if (!p) return 'Female';
    const str = (
      p.category ||
      p.Category ||
      p.gender ||
      p.Gender ||
      JSON.stringify(p)
    )
      .toString()
      .toLowerCase();

    if (str.includes('female') || str.includes('women') || str.includes('girl') || str === 'f') {
      return 'Female';
    }
    if (str.includes('male') || str.includes('men') || str.includes('boy') || str === 'm') {
      return 'Male';
    }
    return 'Female'; // Default fallback
  };

  const setGameFormat = (format) => {
    updateParentAndLocal({ gameFormat: format });
  };

  const setSubTab = (tab) => {
    updateParentAndLocal({ activeSubTab: tab });
  };

  // ==========================================
  // PAIR / TEAM CREATION WITH VALIDATION
  // ==========================================
  const [selectedP1, setSelectedP1] = useState('');
  const [selectedP2, setSelectedP2] = useState('');

  const handleCreatePair = () => {
    if (!selectedP1 || !selectedP2) {
      alert('⚠️ Please select two participants to create a pair.');
      return;
    }

    if (selectedP1 === selectedP2) {
      alert('⚠️ You cannot select the same participant twice for a pair.');
      return;
    }

    const p1Obj = participants.find((p) => String(p.id || p.regId || p.Registration_ID) === String(selectedP1));
    const p2Obj = participants.find((p) => String(p.id || p.regId || p.Registration_ID) === String(selectedP2));

    if (!p1Obj || !p2Obj) {
      alert('⚠️ Invalid participant selection.');
      return;
    }

    const g1 = getParticipantGender(p1Obj);
    const g2 = getParticipantGender(p2Obj);

    // Validation Check 1: Doubles (Male-Male or Female-Female)
    if (gameFormat === 'doubles') {
      if (g1 !== g2) {
        alert(
          `❌ GENDER VALIDATION ERROR:\n\nRegular Doubles requires same-gender pairs (Male+Male or Female+Female).\n\nSelected Players: ${getPlayerName(p1Obj)} (${g1}) & ${getPlayerName(p2Obj)} (${g2}).\n\nFor mixed male-female pairs, please select "Mixed Doubles".`
        );
        return;
      }
    }

    // Validation Check 2: Mixed Doubles (1 Male + 1 Female)
    if (gameFormat === 'mixed_doubles') {
      const isMixed = (g1 === 'Male' && g2 === 'Female') || (g1 === 'Female' && g2 === 'Male');
      if (!isMixed) {
        alert(
          `❌ GENDER VALIDATION ERROR:\n\nMixed Doubles requires exactly 1 Male and 1 Female player.\n\nSelected Players: ${getPlayerName(p1Obj)} (${g1}) & ${getPlayerName(p2Obj)} (${g2}).`
        );
        return;
      }
    }

    const newTeam = {
      id: `pair_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: `${getPlayerName(p1Obj)} & ${getPlayerName(p2Obj)}`,
      p1: p1Obj,
      p2: p2Obj,
      genderType: gameFormat === 'mixed_doubles' ? 'Mixed' : g1,
      format: gameFormat,
    };

    const updatedTeams = [...localTeams, newTeam];
    updateParentAndLocal({ teams: updatedTeams });
    setSelectedP1('');
    setSelectedP2('');
    alert(`✅ Pair successfully created: ${newTeam.name}`);
  };

  const handleDeleteTeam = (teamId) => {
    const updated = localTeams.filter((t) => t.id !== teamId);
    updateParentAndLocal({ teams: updated });
  };

  // ==========================================
  // DRAW GENERATOR (PERSISTENT FIX)
  // ==========================================
  const handleGenerateDraws = () => {
    let createdFixtures = [...localMatches];

    if (gameFormat === 'singles') {
      const males = participants.filter((p) => getParticipantGender(p) === 'Male');
      const females = participants.filter((p) => getParticipantGender(p) === 'Female');

      let matchCount = 0;

      // Male Singles Fixtures
      for (let i = 0; i < males.length - 1; i += 2) {
        const p1 = males[i];
        const p2 = males[i + 1];
        createdFixtures.push({
          id: `match_m_${Date.now()}_${i}`,
          team1Name: getPlayerName(p1),
          team2Name: getPlayerName(p2),
          score1: 0,
          score2: 0,
          winner: null,
          status: 'Scheduled',
          format: 'singles',
          genderCategory: 'Male Singles',
        });
        matchCount++;
      }

      // Female Singles Fixtures
      for (let i = 0; i < females.length - 1; i += 2) {
        const p1 = females[i];
        const p2 = females[i + 1];
        createdFixtures.push({
          id: `match_f_${Date.now()}_${i}`,
          team1Name: getPlayerName(p1),
          team2Name: getPlayerName(p2),
          score1: 0,
          score2: 0,
          winner: null,
          status: 'Scheduled',
          format: 'singles',
          genderCategory: 'Female Singles',
        });
        matchCount++;
      }

      if (matchCount === 0) {
        alert('⚠️ Need at least 2 participants of the same gender in the active filter to generate singles draws.');
        return;
      }
    } else {
      // Doubles & Mixed Doubles
      const eligibleTeams = localTeams.filter((t) => t.format === gameFormat);
      if (eligibleTeams.length < 2) {
        alert(`⚠️ You need at least 2 formed pairs under ${gameFormat.replace('_', ' ').toUpperCase()} to generate draws.`);
        return;
      }

      let matchCount = 0;
      for (let i = 0; i < eligibleTeams.length - 1; i += 2) {
        const t1 = eligibleTeams[i];
        const t2 = eligibleTeams[i + 1];

        if (gameFormat === 'doubles' && t1.genderType !== t2.genderType) {
          continue; // Prevent cross-gender pairing in regular doubles
        }

        createdFixtures.push({
          id: `match_d_${Date.now()}_${i}`,
          team1Name: t1.name,
          team2Name: t2.name,
          score1: 0,
          score2: 0,
          winner: null,
          status: 'Scheduled',
          format: gameFormat,
          genderCategory: t1.genderType === 'Mixed' ? 'Mixed Doubles' : `${t1.genderType} Doubles`,
        });
        matchCount++;
      }

      if (matchCount === 0) {
        alert('⚠️ No valid team match pairings could be created with current formed pairs.');
        return;
      }
    }

    // Single unified dispatch to persist matches and switch tab simultaneously
    updateParentAndLocal({
      matches: createdFixtures,
      activeSubTab: 'matches',
    });

    setTimeout(() => {
      alert('✅ Tournament draws created according to gender and age-group segregation rules!');
    }, 50);
  };

  // Score Management
  const handleScoreChange = (matchId, s1, s2) => {
    const updated = localMatches.map((m) => {
      if (m.id === matchId) {
        const score1 = parseInt(s1, 10) || 0;
        const score2 = parseInt(s2, 10) || 0;
        let winner = null;
        let status = 'In Progress';

        if (score1 > score2 && score1 >= 21) {
          winner = m.team1Name;
          status = 'Completed';
        } else if (score2 > score1 && score2 >= 21) {
          winner = m.team2Name;
          status = 'Completed';
        }

        return { ...m, score1, score2, winner, status };
      }
      return m;
    });

    updateParentAndLocal({ matches: updated });
  };

  const handleClearMatches = () => {
    if (window.confirm('Are you sure you want to clear all Badminton fixtures?')) {
      updateParentAndLocal({ matches: [] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Game Format Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            🏸 Badminton Tournament Setup
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Participant selection aligns with top Age Group & Category segregation filters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-600">Game Format:</label>
          <select
            value={gameFormat}
            onChange={(e) => setGameFormat(e.target.value)}
            className="bg-amber-50 border border-amber-300 text-amber-900 font-bold text-xs rounded-xl p-2.5 outline-none shadow-sm"
          >
            <option value="singles">Singles (1 vs 1)</option>
            <option value="doubles">Doubles (2 vs 2 - Same Gender)</option>
            <option value="mixed_doubles">Mixed Doubles (1 Male + 1 Female)</option>
          </select>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setSubTab('teams')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition ${
            localSubTab === 'teams'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          {gameFormat === 'singles' ? `🏸 Players (${participants.length})` : `👥 Formed Pairs (${localTeams.length})`}
        </button>

        <button
          onClick={() => setSubTab('matches')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition ${
            localSubTab === 'matches'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          ⚔️ Matches & Scoring ({localMatches.length})
        </button>
      </div>

      {/* TAB 1: TEAMS / PLAYERS */}
      {localSubTab === 'teams' && (
        <div className="space-y-6">
          {(gameFormat === 'doubles' || gameFormat === 'mixed_doubles') && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-black text-amber-900 uppercase tracking-wide">
                ➕ Pair Formation ({gameFormat === 'mixed_doubles' ? 'Mixed Doubles: Male + Female' : 'Doubles: Same Gender Only'})
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Select Player 1:</label>
                  <select
                    value={selectedP1}
                    onChange={(e) => setSelectedP1(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="">-- Choose Player 1 --</option>
                    {participants.map((p) => {
                      const id = p.id || p.regId || p.Registration_ID;
                      const gender = getParticipantGender(p);
                      return (
                        <option key={id} value={id}>
                          {getPlayerName(p)} ({gender})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Select Player 2:</label>
                  <select
                    value={selectedP2}
                    onChange={(e) => setSelectedP2(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="">-- Choose Player 2 --</option>
                    {participants.map((p) => {
                      const id = p.id || p.regId || p.Registration_ID;
                      const gender = getParticipantGender(p);
                      return (
                        <option key={id} value={id}>
                          {getPlayerName(p)} ({gender})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleCreatePair}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow transition"
                >
                  ✓ Validate & Form Pair
                </button>
              </div>
            </div>
          )}

          {/* Formed Pairs List */}
          {(gameFormat === 'doubles' || gameFormat === 'mixed_doubles') && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {localTeams
                .filter((t) => t.format === gameFormat)
                .map((t) => (
                  <div key={t.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex justify-between items-center">
                    <div>
                      <h5 className="font-bold text-xs text-slate-900">{t.name}</h5>
                      <span className="text-[10px] bg-slate-100 text-amber-800 font-bold px-2 py-0.5 rounded mt-1 inline-block">
                        Category: {t.genderType}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteTeam(t.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
            </div>
          )}

          {/* Draw Generation Button */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={handleGenerateDraws}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-6 py-3 rounded-xl shadow transition flex items-center gap-2"
            >
              ⚡ Generate Tournament Fixtures
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: MATCHES & SCORING */}
      {localSubTab === 'matches' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-600">Total Fixtures: {localMatches.length}</span>
            {localMatches.length > 0 && (
              <button
                onClick={handleClearMatches}
                className="text-xs text-red-600 hover:underline font-bold"
              >
                Clear All Matches
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {localMatches.map((m) => (
              <div key={m.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-3">
                <div className="flex justify-between items-center text-[11px] border-b border-slate-100 pb-2">
                  <span className="font-black text-amber-700">{m.genderCategory || 'Badminton Match'}</span>
                  <span className={`px-2 py-0.5 rounded font-bold ${m.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                    {m.status}
                  </span>
                </div>

                <div className="flex justify-between items-center gap-2">
                  <div className="flex-1">
                    <p className={`text-xs font-bold ${m.winner === m.team1Name ? 'text-emerald-700 font-black' : 'text-slate-800'}`}>
                      {m.team1Name} {m.winner === m.team1Name && '🏆'}
                    </p>
                  </div>
                  <input
                    type="number"
                    value={m.score1 || 0}
                    onChange={(e) => handleScoreChange(m.id, e.target.value, m.score2)}
                    className="w-14 text-center bg-slate-50 border border-slate-300 font-bold text-xs p-1.5 rounded-lg"
                  />
                  <span className="text-xs font-bold text-slate-400">vs</span>
                  <input
                    type="number"
                    value={m.score2 || 0}
                    onChange={(e) => handleScoreChange(m.id, m.score1, e.target.value)}
                    className="w-14 text-center bg-slate-50 border border-slate-300 font-bold text-xs p-1.5 rounded-lg"
                  />
                  <div className="flex-1 text-right">
                    <p className={`text-xs font-bold ${m.winner === m.team2Name ? 'text-emerald-700 font-black' : 'text-slate-800'}`}>
                      {m.winner === m.team2Name && '🏆 '}
                      {m.team2Name}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}