'use client';

import React, { useState, useEffect } from 'react';
import { fetchDefaultSportsData, parseCleanCSV } from '@/lib/csvParser';

const SPORTS_LIST = [
  { id: 'chess', name: 'Chess', type: 'ROUND_ROBIN', defaultGroupSize: 4 },
  { id: 'carrom', name: 'Carrom', type: 'ROUND_ROBIN', defaultGroupSize: 4 },
  { id: 'cricket', name: 'Cricket', type: 'KNOCKOUT', defaultGroupSize: 8, hasAuction: true },
  { id: 'football', name: 'Football', type: 'KNOCKOUT', defaultGroupSize: 8, hasAuction: true },
  { id: 'running', name: 'Running', type: 'HEAT_RACE', defaultGroupSize: 6 },
  { id: 'walking', name: 'Walking', type: 'HEAT_RACE', defaultGroupSize: 6 },
  { id: 'swimming', name: 'Swimming', type: 'HEAT_RACE', defaultGroupSize: 4 },
  { id: 'tt', name: 'Table Tennis', type: 'KNOCKOUT', defaultGroupSize: 2 },
  { id: 'badminton', name: 'Badminton', type: 'KNOCKOUT', defaultGroupSize: 2 },
  { id: 'tugofwar', name: 'Tug Of War', type: 'KNOCKOUT', defaultGroupSize: 8 },
  { id: 'quiz', name: 'Quiz', type: 'ROUND_ROBIN', defaultGroupSize: 4 },
  { id: 'nan', name: 'General / Other', type: 'ROUND_ROBIN', defaultGroupSize: 4 },
];

const PHASES = ['All Phases', 'Phase 1', 'Phase 2', 'Combine'];
const AGE_GROUPS = ['All Age Groups', 'Under 12 (U-12)', 'Teens (12-17)', 'Adults (18+)'];
const CATEGORIES = ['All Categories', 'General', 'Male', 'Female', 'Mix'];

export default function SanviOlympicsPortal() {
  const [activeSport, setActiveSport] = useState(SPORTS_LIST[0]);
  const [activeTab, setActiveTab] = useState('groups');

  // Filters
  const [selectedPhase, setSelectedPhase] = useState('All Phases');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('All Age Groups');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [groupSize, setGroupSize] = useState(activeSport.defaultGroupSize);

  // App State
  const [players, setPlayers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. Auto-load /sports_data.csv on app startup[cite: 2]
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      const defaultData = await fetchDefaultSportsData();
      if (defaultData.length > 0) {
        setPlayers(defaultData);
        // Sync with MySQL
        await savePlayersToDB(defaultData);
      }
      setLoading(false);
    }
    loadInitialData();
  }, []);

  const savePlayersToDB = async (playerList) => {
    try {
      await fetch('/api/players/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: playerList }),
      });
    } catch (err) {
      console.error('Failed to sync players to DB:', err);
    }
  };

  // 2. Manual Excel / CSV File Upload Handler[cite: 2]
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const cleanedData = await parseCleanCSV(file);
      setPlayers(cleanedData);
      await savePlayersToDB(cleanedData);
      alert(`Successfully loaded ${cleanedData.length} records!`);
    } catch (err) {
      alert('Error parsing uploaded file. Please verify sheet headers.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Auto-Group Generation & Categorization Filter
  const handleGenerateGroups = () => {
    if (players.length === 0) {
      alert('No player data available. Please upload a file or check public/sports_data.csv');
      return;
    }

    const filtered = players.filter((p) => {
      // Sport Filter
      const matchSport =
        !p.sport ||
        p.sport.toLowerCase().includes(activeSport.name.toLowerCase()) ||
        activeSport.id === 'nan';

      // Phase Filter
      const matchPhase =
        selectedPhase === 'All Phases' ||
        p.phase.toLowerCase() === selectedPhase.toLowerCase();

      // Age Group Filter[cite: 2]
      const matchAge =
        selectedAgeGroup === 'All Age Groups' ||
        p.ageGroup === selectedAgeGroup;

      // Category Filter
      const matchCategory =
        selectedCategory === 'All Categories' ||
        p.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchSport && matchPhase && matchAge && matchCategory;
    });

    if (filtered.length === 0) {
      alert(`No players found for Sport: ${activeSport.name} | Phase: ${selectedPhase} | Age: ${selectedAgeGroup}`);
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
    }

    setMatches(fixtureList);
  };

  const handleScoreUpdate = (matchId, deltaA, deltaB) => {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          const newScoreA = Math.max(0, m.scoreA + deltaA);
          const newScoreB = Math.max(0, m.scoreB + deltaB);
          let winner = null;
          if (newScoreA > newScoreB) winner = m.playerA.name;
          else if (newScoreB > newScoreA) winner = m.playerB.name;
          else winner = 'Draw';

          return { ...m, scoreA: newScoreA, scoreB: newScoreB, winner, status: 'In_Progress' };
        }
        return m;
      })
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-6">
      {/* Header */}
      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-amber-400">
            🏆 SANVI OLYMPICS
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Total Loaded Registration Records: <span className="text-amber-400 font-bold">{players.length}</span>
          </p>
        </div>

        <div className="mt-3 md:mt-0">
          <label className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold px-4 py-2.5 rounded-lg text-sm cursor-pointer transition-all shadow-md inline-block">
            📁 Import Excel / CSV File
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </header>

      {/* Sport Selector Tabs */}
      <nav className="flex gap-2 overflow-x-auto pb-3 mb-6">
        {SPORTS_LIST.map((sport) => (
          <button
            key={sport.id}
            onClick={() => {
              setActiveSport(sport);
              setGroupSize(sport.defaultGroupSize);
            }}
            className={`px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
              activeSport.id === sport.id
                ? 'bg-amber-400 text-slate-950 scale-105'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {sport.name}
          </button>
        ))}
      </nav>

      {/* Categorization Controls */}
      <section className="bg-slate-800 p-5 rounded-xl border border-slate-700 mb-6">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Categorization Filters
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs text-slate-300 mb-1 block">Phase</label>
            <select
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm"
            >
              {PHASES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-300 mb-1 block">Age Group</label>
            <select
              value={selectedAgeGroup}
              onChange={(e) => setSelectedAgeGroup(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm"
            >
              {AGE_GROUPS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-300 mb-1 block">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-300 mb-1 block">Group Size</label>
            <input
              type="number"
              min="2"
              value={groupSize}
              onChange={(e) => setGroupSize(parseInt(e.target.value, 10) || 2)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm"
            />
          </div>
        </div>

        <button
          onClick={handleGenerateGroups}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-lg text-sm shadow-lg"
        >
          ⚡ Auto-Distribute Filtered Players into Groups
        </button>
      </section>

      {/* Tabs */}
      <div className="flex border-b border-slate-700 mb-6">
        <button
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-3 font-bold text-sm ${
            activeTab === 'groups' ? 'border-b-2 border-amber-400 text-amber-400' : 'text-slate-400'
          }`}
        >
          🧩 Groups ({groups.length})
        </button>
        <button
          onClick={() => setActiveTab('matches')}
          className={`px-4 py-3 font-bold text-sm ${
            activeTab === 'matches' ? 'border-b-2 border-amber-400 text-amber-400' : 'text-slate-400'
          }`}
        >
          ⚔️ Scorekeeper ({matches.length})
        </button>
      </div>

      {/* Display Groups */}
      {activeTab === 'groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div key={group.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <h3 className="font-bold text-amber-400 text-lg border-b border-slate-700 pb-2 mb-3">
                {group.name} ({group.members.length} Players)
              </h3>
              <ul className="space-y-2">
                {group.members.map((m) => (
                  <li key={m.id} className="bg-slate-900 p-2.5 rounded-lg flex justify-between text-sm">
                    <div>
                      <span className="font-bold">{m.name}</span>
                      <span className="text-xs text-slate-400 block">
                        Flat: {m.flat || 'N/A'} | Age: {m.age} ({m.ageGroup})
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Display Matches */}
      {activeTab === 'matches' && (
        <div className="space-y-4 max-w-3xl mx-auto">
          {matches.map((match) => (
            <div key={match.id} className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
              <div className="grid grid-cols-2 gap-4 text-center mb-4">
                <div className="bg-slate-900 p-4 rounded-xl">
                  <h4 className="font-bold text-slate-100">{match.playerA.name}</h4>
                  <div className="text-3xl font-black text-amber-400 mt-1">{match.scoreA}</div>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl">
                  <h4 className="font-bold text-slate-100">{match.playerB.name}</h4>
                  <div className="text-3xl font-black text-amber-400 mt-1">{match.scoreB}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleScoreUpdate(match.id, 1, 0)}
                  className="bg-emerald-600 active:bg-emerald-700 text-white font-black py-3 rounded-xl text-lg"
                >
                  +1 {match.playerA.name}
                </button>
                <button
                  onClick={() => handleScoreUpdate(match.id, 0, 1)}
                  className="bg-emerald-600 active:bg-emerald-700 text-white font-black py-3 rounded-xl text-lg"
                >
                  +1 {match.playerB.name}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}