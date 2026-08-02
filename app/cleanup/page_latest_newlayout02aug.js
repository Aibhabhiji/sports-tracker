'use client';

import React, { useState } from 'react';

// 12 Mandatory Sports
const SPORTS_LIST = [
  { id: 'chess', name: 'Chess', type: 'ROUND_ROBIN', defaultGroupSize: 4, points: { win: 2, draw: 1, loss: 0 } },
  { id: 'carrom', name: 'Carrom', type: 'ROUND_ROBIN', defaultGroupSize: 4, points: { win: 2, draw: 1, loss: 0 } },
  { id: 'cricket', name: 'Cricket', type: 'KNOCKOUT', defaultGroupSize: 8, hasAuction: true },
  { id: 'football', name: 'Football', type: 'KNOCKOUT', defaultGroupSize: 8, hasAuction: true },
  { id: 'running', name: 'Running', type: 'HEAT_RACE', defaultGroupSize: 6 },
  { id: 'walking', name: 'Walking', type: 'HEAT_RACE', defaultGroupSize: 6 },
  { id: 'swimming', name: 'Swimming', type: 'HEAT_RACE', defaultGroupSize: 4 },
  { id: 'tt', name: 'Table Tennis', type: 'KNOCKOUT', defaultGroupSize: 2 },
  { id: 'badminton', name: 'Badminton', type: 'KNOCKOUT', defaultGroupSize: 2 },
  { id: 'tugofwar', name: 'Tug Of War', type: 'KNOCKOUT', defaultGroupSize: 8 },
  { id: 'quiz', name: 'Quiz', type: 'ROUND_ROBIN', defaultGroupSize: 4, points: { win: 2, draw: 1, loss: 0 } },
  { id: 'nan', name: 'General / Other', type: 'ROUND_ROBIN', defaultGroupSize: 4, points: { win: 2, draw: 1, loss: 0 } },
];

const PHASES = ['Combine', 'Phase 1', 'Phase 2'];
const AGE_CATEGORIES = ['Under 12', '12-17 years', '17+ years', 'Senior Citizens'];
const GENDER_CATEGORIES = ['Mix', 'Male', 'Female'];

// Sample mock seed data
const INITIAL_PLAYERS = [
  { id: 1, name: 'Aarav Sharma', age: 10, phase: 'Phase 1', gender: 'Male', flat: 'A-101' },
  { id: 2, name: 'Ananya Patel', age: 11, phase: 'Phase 1', gender: 'Female', flat: 'A-102' },
  { id: 3, name: 'Rohan Gupta', age: 9, phase: 'Phase 2', gender: 'Male', flat: 'B-201' },
  { id: 4, name: 'Diya Verma', age: 10, phase: 'Phase 2', gender: 'Female', flat: 'B-202' },
  { id: 5, name: 'Vikram Singh', age: 35, phase: 'Phase 1', gender: 'Male', flat: 'C-301' },
  { id: 6, name: 'Priya Nair', age: 32, phase: 'Phase 1', gender: 'Female', flat: 'C-302' },
  { id: 7, name: 'Rajesh Kumar', age: 65, phase: 'Combine', gender: 'Male', flat: 'D-401' },
  { id: 8, name: 'Sunita Reddy', age: 62, phase: 'Combine', gender: 'Female', flat: 'D-402' },
];

export default function SanviOlympicsPortal() {
  const [activeSport, setActiveSport] = useState(SPORTS_LIST[0]);
  const [activeTab, setActiveTab] = useState('groups'); // 'groups' | 'matches' | 'standings' | 'auction'
  
  // Categorization Filters
  const [selectedPhase, setSelectedPhase] = useState('Combine');
  const [selectedAge, setSelectedAge] = useState('Under 12');
  const [selectedGender, setSelectedGender] = useState('Mix');
  const [groupSize, setGroupSize] = useState(activeSport.defaultGroupSize);

  // App State
  const [players, setPlayers] = useState(INITIAL_PLAYERS);
  const [groups, setGroups] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);

  // Sync group size defaults when switching sports
  const handleSportChange = (sport) => {
    setActiveSport(sport);
    setGroupSize(sport.defaultGroupSize);
    setGroups([]);
    setMatches([]);
    setSelectedMatch(null);
  };

  // 1. Auto-Categorize & Group Generation Logic
  const handleGenerateGroups = () => {
    // Filter players based on selected categories
    const filtered = players.filter((p) => {
      const matchPhase = selectedPhase === 'Combine' || p.phase === selectedPhase;
      const matchGender = selectedGender === 'Mix' || p.gender === selectedGender;
      
      let matchAge = false;
      if (selectedAge === 'Under 12') matchAge = p.age < 12;
      else if (selectedAge === '12-17 years') matchAge = p.age >= 12 && p.age <= 17;
      else if (selectedAge === '17+ years') matchAge = p.age > 17 && p.age < 60;
      else if (selectedAge === 'Senior Citizens') matchAge = p.age >= 60;

      return matchPhase && matchGender && matchAge;
    });

    if (filtered.length === 0) {
      alert(`No players found for ${selectedPhase} | ${selectedAge} | ${selectedGender}`);
      return;
    }

    const newGroups = [];
    let groupIdx = 1;
    for (let i = 0; i < filtered.length; i += groupSize) {
      newGroups.push({
        id: `GRP_${groupIdx}`,
        name: `Group ${String.fromCharCode(64 + groupIdx)}`,
        members: filtered.slice(i, i + groupSize),
      });
      groupIdx++;
    }

    setGroups(newGroups);
    generateFixtures(newGroups, activeSport);
  };

  // 2. Generate Match Fixtures
  const generateFixtures = (groupList, sport) => {
    const fixtureList = [];
    let matchCounter = 1;

    if (sport.type === 'ROUND_ROBIN') {
      groupList.forEach((group) => {
        const mems = group.members;
        for (let i = 0; i < mems.length; i++) {
          for (let j = i + 1; j < mems.length; j++) {
            fixtureList.push({
              id: `M_${matchCounter++}`,
              groupName: group.name,
              playerA: mems[i],
              playerB: mems[j],
              scoreA: 0,
              scoreB: 0,
              status: 'Scheduled',
              winner: null,
            });
          }
        }
      });
    } else {
      // Knockout or Heat/Race
      for (let i = 0; i < groupList.length; i += 2) {
        if (i + 1 < groupList.length) {
          fixtureList.push({
            id: `M_KO_${matchCounter++}`,
            groupName: 'Elimination Round 1',
            teamA: groupList[i],
            teamB: groupList[i + 1],
            scoreA: 0,
            scoreB: 0,
            status: 'Scheduled',
            winner: null,
          });
        }
      }
    }

    setMatches(fixtureList);
  };

  // 3. Manual Swap / Player Group Reassignment
  const handleMovePlayer = (playerId, sourceGroupId, targetGroupId) => {
    setGroups((prevGroups) => {
      let movedPlayer = null;
      const updated = prevGroups.map((g) => {
        if (g.id === sourceGroupId) {
          movedPlayer = g.members.find((m) => m.id === playerId);
          return { ...g, members: g.members.filter((m) => m.id !== playerId) };
        }
        return g;
      });

      return updated.map((g) => {
        if (g.id === targetGroupId && movedPlayer) {
          return { ...g, members: [...g.members, movedPlayer] };
        }
        return g;
      });
    });
  };

  // 4. Scorekeeper Button Click Handlers
  const handleScoreUpdate = (matchId, deltaA, deltaB) => {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          const newScoreA = Math.max(0, m.scoreA + deltaA);
          const newScoreB = Math.max(0, m.scoreB + deltaB);
          let winner = null;
          if (newScoreA > newScoreB) winner = m.playerA ? m.playerA.name : m.teamA.name;
          else if (newScoreB > newScoreA) winner = m.playerB ? m.playerB.name : m.teamB.name;
          else winner = 'Draw';

          return { ...m, scoreA: newScoreA, scoreB: newScoreB, winner, status: 'In_Progress' };
        }
        return m;
      })
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-6">
      {/* Top Title Banner */}
      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-amber-400 tracking-tight">
            🏆 SANVI OLYMPICS
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Tournament Management & Real-Time Scoring Portal
          </p>
        </div>
        <div className="mt-3 md:mt-0 flex gap-2">
          <span className="bg-amber-400/10 text-amber-400 text-xs px-3 py-1.5 rounded-full font-bold border border-amber-400/20">
            Active: {activeSport.name} ({activeSport.type})
          </span>
        </div>
      </header>

      {/* Sport Selector Tabs (Scrollable across mobile screens) */}
      <nav className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-thin scrollbar-thumb-amber-400">
        {SPORTS_LIST.map((sport) => (
          <button
            key={sport.id}
            onClick={() => handleSportChange(sport)}
            className={`px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200 ${
              activeSport.id === sport.id
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 scale-105'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
            }`}
          >
            {sport.name}
          </button>
        ))}
      </nav>

      {/* Filters & Control Panel */}
      <section className="bg-slate-800 p-5 rounded-xl border border-slate-700 mb-6 shadow-md">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
          Categorization & Auto-Group Configuration
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Phase</label>
            <select
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
            >
              {PHASES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Age Category</label>
            <select
              value={selectedAge}
              onChange={(e) => setSelectedAge(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
            >
              {AGE_CATEGORIES.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Gender Category</label>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
            >
              {GENDER_CATEGORIES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">Players per Group</label>
            <input
              type="number"
              min="2"
              max="12"
              value={groupSize}
              onChange={(e) => setGroupSize(parseInt(e.target.value, 10) || 2)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleGenerateGroups}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
          >
            ⚡ Generate Groups & Auto-Schedule
          </button>

          {activeSport.hasAuction && (
            <button
              onClick={() => setActiveTab('auction')}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-all shadow-lg shadow-purple-600/20 active:scale-95"
            >
              🔨 Open Player Auction Module
            </button>
          )}
        </div>
      </section>

      {/* Sub Navigation Tabs */}
      <div className="flex border-b border-slate-700 mb-6">
        {[
          { id: 'groups', label: '🧩 Groups & Reassignment' },
          { id: 'matches', label: '⚔️ Match Scorekeeper (Big Buttons)' },
          { id: 'standings', label: '📊 Leaderboard & Standings' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-bold text-sm border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-amber-400 text-amber-400 bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: GROUPS & MANUAL REASSIGNMENT */}
      {activeTab === 'groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div key={group.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md">
              <h3 className="font-bold text-amber-400 text-lg border-b border-slate-700 pb-2 mb-3">
                {group.name} ({group.members.length} Players)
              </h3>
              <ul className="space-y-2">
                {group.members.map((m) => (
                  <li key={m.id} className="bg-slate-900 p-2.5 rounded-lg flex justify-between items-center text-sm">
                    <div>
                      <span className="font-bold text-slate-200">{m.name}</span>
                      <span className="text-xs text-slate-400 block">{m.flat} | Age: {m.age}</span>
                    </div>

                    {/* Manual Reassignment Selector */}
                    <select
                      onChange={(e) => handleMovePlayer(m.id, group.id, e.target.value)}
                      defaultValue={group.id}
                      className="bg-slate-800 text-xs border border-slate-600 rounded p-1 text-slate-300"
                    >
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          Move to {g.name}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: MOBILE TOUCH SCOREKEEPER (BIG BUTTONS) */}
      {activeTab === 'matches' && (
        <div className="space-y-4 max-w-3xl mx-auto">
          {matches.map((match) => (
            <div key={match.id} className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-xl">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider bg-amber-400/10 px-2.5 py-1 rounded">
                  {match.groupName}
                </span>
                <span className="text-xs text-slate-400 font-semibold">{match.status}</span>
              </div>

              {/* Player / Team Names & Current Score */}
              <div className="grid grid-cols-2 gap-4 text-center mb-6">
                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700">
                  <h4 className="font-bold text-lg text-slate-100 truncate">
                    {match.playerA ? match.playerA.name : match.teamA.name}
                  </h4>
                  <div className="text-4xl font-black text-amber-400 mt-2">{match.scoreA}</div>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700">
                  <h4 className="font-bold text-lg text-slate-100 truncate">
                    {match.playerB ? match.playerB.name : match.teamB.name}
                  </h4>
                  <div className="text-4xl font-black text-amber-400 mt-2">{match.scoreB}</div>
                </div>
              </div>

              {/* Big Touch Score Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleScoreUpdate(match.id, 1, 0)}
                    className="flex-1 bg-emerald-600 active:bg-emerald-700 text-white text-xl font-black py-4 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => handleScoreUpdate(match.id, -1, 0)}
                    className="w-14 bg-slate-700 active:bg-slate-600 text-slate-300 text-lg font-bold py-4 rounded-xl active:scale-95 transition-all"
                  >
                    -1
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleScoreUpdate(match.id, 0, 1)}
                    className="flex-1 bg-emerald-600 active:bg-emerald-700 text-white text-xl font-black py-4 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => handleScoreUpdate(match.id, 0, -1)}
                    className="w-14 bg-slate-700 active:bg-slate-600 text-slate-300 text-lg font-bold py-4 rounded-xl active:scale-95 transition-all"
                  >
                    -1
                  </button>
                </div>
              </div>

              {match.winner && (
                <div className="mt-4 text-center font-bold text-emerald-400 text-sm bg-emerald-500/10 py-2 rounded-lg">
                  Current Winner: {match.winner}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: LEADERBOARD & STANDINGS */}
      {activeTab === 'standings' && (
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 overflow-x-auto shadow-md">
          <h3 className="font-bold text-lg text-slate-200 mb-4">
            Live Standings: {activeSport.name} ({selectedPhase} - {selectedAge})
          </h3>
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 bg-slate-900/50">
                <th className="p-3">Match ID</th>
                <th className="p-3">Group</th>
                <th className="p-3">Player / Team A</th>
                <th className="p-3">Player / Team B</th>
                <th className="p-3">Score</th>
                <th className="p-3">Status / Winner</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="p-3 font-mono text-xs text-amber-400">{m.id}</td>
                  <td className="p-3">{m.groupName}</td>
                  <td className="p-3 font-bold">{m.playerA ? m.playerA.name : m.teamA.name}</td>
                  <td className="p-3 font-bold">{m.playerB ? m.playerB.name : m.teamB.name}</td>
                  <td className="p-3 font-extrabold text-amber-400">{m.scoreA} - {m.scoreB}</td>
                  <td className="p-3">
                    <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-1 rounded font-bold">
                      {m.winner || 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}