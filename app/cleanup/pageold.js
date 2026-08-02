'use client';

import React, { useState } from 'react';
import { parseExcelFile } from '@/lib/excelParser';

const SPORT_CONFIG = {
  Badminton: { type: 'head_to_head', teamType: 'doubles' },
  'Table Tennis': { type: 'head_to_head', teamType: 'doubles' },
  Chess: { type: 'head_to_head', teamType: 'singles' },
  Cricket: { type: 'head_to_head', teamType: 'team' },
  Football: { type: 'head_to_head', teamType: 'team' },
  Carrom: { type: 'head_to_head', teamType: 'singles' },
  Swimming: { type: 'timed_distance', unit: 'Time (s)', sortOrder: 'asc' },
  Running: { type: 'timed_distance', unit: 'Time (s)', sortOrder: 'asc' },
};

export default function MainApp() {
  const [activeSport, setActiveSport] = useState('Badminton');
  const [activeCategory, setActiveCategory] = useState('Under 18');
  const [activeGender, setActiveGender] = useState('Male');
  const [activeStage, setActiveStage] = useState('group');

  // Participants
  const [participants, setParticipants] = useState([
    { id: '1', name: 'Alpha Team / Pair 1' },
    { id: '2', name: 'Beta Team / Pair 2' },
    { id: '3', name: 'Gamma Team / Pair 3' },
    { id: '4', name: 'Delta Team / Pair 4' },
  ]);

  // Standings
  const [standings, setStandings] = useState([
    { id: 'p1', name: 'Alpha Pair', played: 0, won: 0, drawn: 0, lost: 0, points: 0 },
    { id: 'p2', name: 'Beta Pair', played: 0, won: 0, drawn: 0, lost: 0, points: 0 },
    { id: 'p3', name: 'Gamma Pair', played: 0, won: 0, drawn: 0, lost: 0, points: 0 },
    { id: 'p4', name: 'Delta Pair', played: 0, won: 0, drawn: 0, lost: 0, points: 0 },
  ]);

  // Matches
  const [matches, setMatches] = useState([
    { id: 1, p1: 'Alpha Pair', p2: 'Beta Pair', score1: '', score2: '', completed: false },
    { id: 2, p1: 'Gamma Pair', p2: 'Delta Pair', score1: '', score2: '', completed: false },
    { id: 3, p1: 'Alpha Pair', p2: 'Gamma Pair', score1: '', score2: '', completed: false },
    { id: 4, p1: 'Beta Pair', p2: 'Delta Pair', score1: '', score2: '', completed: false },
  ]);

  // Knockouts
  const [knockoutBracket, setKnockoutBracket] = useState({
    semis: [
      { id: 'sf1', label: 'Semi-Final 1', p1: 'TBD', p2: 'TBD', score1: '', score2: '', winner: null },
      { id: 'sf2', label: 'Semi-Final 2', p1: 'TBD', p2: 'TBD', score1: '', score2: '', winner: null },
    ],
    final: { id: 'f1', label: 'Championship Final', p1: 'Winner SF1', p2: 'Winner SF2', score1: '', score2: '', winner: null }
  });

  // Timed Events
  const [timedParticipants, setTimedParticipants] = useState([
    { id: 1, name: 'John Doe', metric: 54.21 },
    { id: 2, name: 'Alex Smith', metric: 52.10 },
    { id: 3, name: 'Michael Ray', metric: 55.80 },
  ]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const rawData = await parseExcelFile(file);
      const loadedNames = rawData.map((row, idx) => ({
        id: String(idx + 1),
        name: row['Player Name'] || row['Team Name'] || row['Name'] || `Participant ${idx + 1}`
      }));

      setParticipants(loadedNames);
      
      const initialStandings = loadedNames.map((p) => ({
        id: p.id,
        name: p.name,
        played: 0, won: 0, drawn: 0, lost: 0, points: 0
      }));
      setStandings(initialStandings);

      setTimedParticipants(loadedNames.map((p, idx) => ({
        id: idx + 1,
        name: p.name,
        metric: 0
      })));

      alert(`Successfully imported ${loadedNames.length} participants!`);
    } catch (err) {
      alert('Error parsing Excel file. Please ensure column names are clear.');
    }
  };

  const updateMatchScore = (matchId, s1Val, s2Val) => {
    const s1 = parseInt(s1Val);
    const s2 = parseInt(s2Val);

    const updatedMatches = matches.map(m => {
      if (m.id === matchId) {
        return {
          ...m,
          score1: isNaN(s1) ? '' : s1,
          score2: isNaN(s2) ? '' : s2,
          completed: !isNaN(s1) && !isNaN(s2)
        };
      }
      return m;
    });

    setMatches(updatedMatches);
    recalculateStandings(updatedMatches);
  };

  const recalculateStandings = (currentMatches) => {
    const stats = {};
    standings.forEach(p => {
      stats[p.name] = { id: p.id, name: p.name, played: 0, won: 0, drawn: 0, lost: 0, points: 0 };
    });

    currentMatches.forEach(m => {
      if (m.completed && stats[m.p1] && stats[m.p2]) {
        stats[m.p1].played += 1;
        stats[m.p2].played += 1;

        if (m.score1 > m.score2) {
          stats[m.p1].won += 1;
          stats[m.p1].points += 2;
          stats[m.p2].lost += 1;
        } else if (m.score2 > m.score1) {
          stats[m.p2].won += 1;
          stats[m.p2].points += 2;
          stats[m.p1].lost += 1;
        } else {
          stats[m.p1].drawn += 1;
          stats[m.p1].points += 1;
          stats[m.p2].drawn += 1;
          stats[m.p2].points += 1;
        }
      }
    });

    setStandings(Object.values(stats));
  };

  const seedKnockouts = () => {
    const sorted = [...standings].sort((a, b) => b.points - a.points);
    if (sorted.length < 4) {
      alert("Need at least 4 participants to seed Semi-Finals!");
      return;
    }

    setKnockoutBracket(prev => ({
      ...prev,
      semis: [
        { ...prev.semis[0], p1: sorted[0].name, p2: sorted[3].name, winner: null },
        { ...prev.semis[1], p1: sorted[1].name, p2: sorted[2].name, winner: null }
      ],
      final: { ...prev.final, p1: 'Winner SF1', p2: 'Winner SF2', winner: null }
    }));
    setActiveStage('knockout');
  };

  const handleKnockoutScoreChange = (stage, matchIdx, field, value) => {
    const val = parseInt(value) || 0;
    
    if (stage === 'semis') {
      const updatedSemis = [...knockoutBracket.semis];
      updatedSemis[matchIdx][field] = val;

      const m = updatedSemis[matchIdx];
      if (m.score1 !== '' && m.score2 !== '' && m.score1 !== m.score2) {
        m.winner = m.score1 > m.score2 ? m.p1 : m.p2;
      }

      const updatedFinal = { ...knockoutBracket.final };
      if (updatedSemis[0].winner) updatedFinal.p1 = updatedSemis[0].winner;
      if (updatedSemis[1].winner) updatedFinal.p2 = updatedSemis[1].winner;

      setKnockoutBracket({ semis: updatedSemis, final: updatedFinal });
    } else {
      const updatedFinal = { ...knockoutBracket.final };
      updatedFinal[field] = val;
      if (updatedFinal.score1 !== '' && updatedFinal.score2 !== '' && updatedFinal.score1 !== updatedFinal.score2) {
        updatedFinal.winner = updatedFinal.score1 > updatedFinal.score2 ? updatedFinal.p1 : updatedFinal.p2;
      }
      setKnockoutBracket({ ...knockoutBracket, final: updatedFinal });
    }
  };

  const isTimedSport = SPORT_CONFIG[activeSport].type === 'timed_distance';

  return (
    <main className="p-6 bg-slate-900 min-h-screen text-slate-100 font-sans">
      {/* Header */}
      <header className="mb-6 flex flex-wrap justify-between items-center border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-emerald-400">Sports Tournament Manager</h1>
          <p className="text-slate-400 text-sm">Group Round-Robin (+2 Win, +1 Draw) &amp; Automated Knockouts</p>
        </div>

        {!isTimedSport && (
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button 
              onClick={() => setActiveStage('group')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${activeStage === 'group' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'}`}
            >
              Group Stage
            </button>
            <button 
              onClick={() => setActiveStage('knockout')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${activeStage === 'knockout' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'}`}
            >
              Knockout Stage
            </button>
          </div>
        )}
      </header>

      {/* Sport Navigation Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.keys(SPORT_CONFIG).map((sport) => (
          <button
            key={sport}
            onClick={() => {
              setActiveSport(sport);
              setActiveStage(SPORT_CONFIG[sport].type === 'timed_distance' ? 'timed' : 'group');
            }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeSport === sport ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {sport}
          </button>
        ))}
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap gap-4 mb-8 bg-slate-800/80 p-4 rounded-xl border border-slate-700 items-center justify-between">
        <div className="flex gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Age Category</label>
            <select value={activeCategory} onChange={(e) => setActiveCategory(e.target.value)} className="bg-slate-700 rounded px-3 py-1.5 text-sm">
              <option>Under 12</option>
              <option>Under 18</option>
              <option>Under 60</option>
              <option>Senior Citizen</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Gender Division</label>
            <select value={activeGender} onChange={(e) => setActiveGender(e.target.value)} className="bg-slate-700 rounded px-3 py-1.5 text-sm">
              <option>Male</option>
              <option>Female</option>
              <option>Mixed Division</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Import Roster (.xlsx)</label>
          <input 
            type="file" 
            accept=".xlsx, .csv" 
            onChange={handleFileUpload} 
            className="text-sm text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer" 
          />
        </div>
      </div>

      {/* VIEW: TIMED / DISTANCE SPORTS */}
      {isTimedSport ? (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl font-bold mb-4 text-emerald-300">{activeSport} Leaderboard ({SPORT_CONFIG[activeSport].unit})</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="pb-3">Rank</th>
                <th className="pb-3">Participant Name</th>
                <th className="pb-3">{SPORT_CONFIG[activeSport].unit}</th>
              </tr>
            </thead>
            <tbody>
              {[...timedParticipants]
                .sort((a, b) => a.metric - b.metric)
                .map((p, index) => (
                  <tr key={p.id} className="border-b border-slate-700/50">
                    <td className="py-3 font-bold text-emerald-400">#{index + 1}</td>
                    <td className="py-3 font-semibold">{p.name}</td>
                    <td className="py-3">
                      <input 
                        type="number" 
                        step="0.01"
                        value={p.metric}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setTimedParticipants(timedParticipants.map(item => item.id === p.id ? { ...item, metric: val } : item));
                        }}
                        className="bg-slate-900 border border-slate-600 rounded px-3 py-1 w-28 text-emerald-300 font-mono"
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : activeStage === 'group' ? (

        /* VIEW: GROUP STAGE & MATCH ENTRY */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
            <h2 className="text-xl font-bold mb-4 text-emerald-300">Match Results Entry</h2>
            {matches.map((m) => (
              <div key={m.id} className="flex items-center justify-between bg-slate-900 p-3 rounded-lg mb-3 border border-slate-700">
                <span className="font-semibold text-sm">{m.p1} vs {m.p2}</span>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={m.score1}
                    placeholder="0"
                    onChange={(e) => updateMatchScore(m.id, e.target.value, m.score2)}
                    className="w-12 bg-slate-800 text-center border border-slate-600 rounded p-1 text-sm font-bold"
                  />
                  <span className="text-slate-500">-</span>
                  <input 
                    type="number" 
                    value={m.score2}
                    placeholder="0"
                    onChange={(e) => updateMatchScore(m.id, m.score1, e.target.value)}
                    className="w-12 bg-slate-800 text-center border border-slate-600 rounded p-1 text-sm font-bold"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-emerald-300">Group Standings</h2>
              <button 
                onClick={seedKnockouts}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition"
              >
                Seed Top 4 into Knockouts →
              </button>
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="pb-2">Rank</th>
                  <th className="pb-2">Player/Team</th>
                  <th className="pb-2">P</th>
                  <th className="pb-2">W</th>
                  <th className="pb-2">D</th>
                  <th className="pb-2">L</th>
                  <th className="pb-2 text-emerald-400">PTS</th>
                </tr>
              </thead>
              <tbody>
                {[...standings]
                  .sort((a, b) => b.points - a.points)
                  .map((p, idx) => (
                    <tr key={p.id} className="border-b border-slate-700/50">
                      <td className="py-2 text-slate-400 font-bold">#{idx + 1}</td>
                      <td className="py-2 font-medium">{p.name}</td>
                      <td>{p.played}</td>
                      <td>{p.won}</td>
                      <td>{p.drawn}</td>
                      <td>{p.lost}</td>
                      <td className="font-bold text-emerald-400">{p.points}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (

        /* VIEW: KNOCKOUT BRACKET */
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl font-bold mb-6 text-emerald-300">Knockout Stage Bracket</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Semi-Finals</h3>
              {knockoutBracket.semis.map((match, idx) => (
                <div key={match.id} className="bg-slate-900 p-4 rounded-xl mb-4 border border-slate-700">
                  <div className="text-xs text-emerald-400 font-semibold mb-2">{match.label}</div>
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm ${match.winner === match.p1 ? 'text-emerald-400 font-bold' : 'text-slate-200'}`}>
                      {match.p1}
                    </span>
                    <input 
                      type="number" 
                      onChange={(e) => handleKnockoutScoreChange('semis', idx, 'score1', e.target.value)}
                      className="w-12 bg-slate-800 border border-slate-600 rounded text-center p-1 text-sm font-bold"
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${match.winner === match.p2 ? 'text-emerald-400 font-bold' : 'text-slate-200'}`}>
                      {match.p2}
                    </span>
                    <input 
                      type="number" 
                      onChange={(e) => handleKnockoutScoreChange('semis', idx, 'score2', e.target.value)}
                      className="w-12 bg-slate-800 border border-slate-600 rounded text-center p-1 text-sm font-bold"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col justify-center">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-4">Championship Final</h3>
              <div className="bg-slate-900 p-5 rounded-xl border-2 border-amber-500 shadow-lg">
                <div className="text-xs text-amber-400 font-bold mb-3">GRAND FINALS</div>
                
                <div className="flex justify-between items-center mb-3">
                  <span className={`text-sm font-bold ${knockoutBracket.final.winner === knockoutBracket.final.p1 ? 'text-amber-400' : 'text-slate-200'}`}>
                    {knockoutBracket.final.p1}
                  </span>
                  <input 
                    type="number" 
                    onChange={(e) => handleKnockoutScoreChange('final', 0, 'score1', e.target.value)}
                    className="w-12 bg-slate-800 border border-slate-600 rounded text-center p-1 text-sm font-bold"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className={`text-sm font-bold ${knockoutBracket.final.winner === knockoutBracket.final.p2 ? 'text-amber-400' : 'text-slate-200'}`}>
                    {knockoutBracket.final.p2}
                  </span>
                  <input 
                    type="number" 
                    onChange={(e) => handleKnockoutScoreChange('final', 0, 'score2', e.target.value)}
                    className="w-12 bg-slate-800 border border-slate-600 rounded text-center p-1 text-sm font-bold"
                  />
                </div>

                {knockoutBracket.final.winner && (
                  <div className="mt-4 p-2 bg-amber-500/20 border border-amber-500 rounded text-center text-amber-300 font-extrabold text-sm">
                    🏆 Champion: {knockoutBracket.final.winner}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}