'use client';

import { useState, useEffect } from 'react';
import { parseCleanCSV, fetchDefaultSportsData } from '../lib/excelParser';

const DEFAULT_TEAM_SIZES = {
  'Chess': 4,
  'Cricket': 8,
  'Football': 8,
  'Tug of War': 8,
  'Quiz': 4,
  'Badminton': 2,
  'Table Tennis': 2,
  'Carrom': 2,
  'Marathon': 1,
  'Swimming': 1,
  'Walking': 1,
};

export default function SportsDashboard() {
  const [players, setPlayers] = useState([]);
  const [activeTab, setActiveTab] = useState('players'); // 'players' | 'teams' | 'matches' | 'leaderboard'
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSport, setSelectedSport] = useState('Chess');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPhase, setSelectedPhase] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Team & Match Management State
  const [teamSizes, setTeamSizes] = useState(DEFAULT_TEAM_SIZES);
  const [teams, setTeams] = useState({}); // { [sport]: [{ id, name, sport, members: [] }] }
  const [matches, setMatches] = useState([]); // [{ id, sport, teamA, teamB, scoreA, scoreB, status, winner }]
  const [selectedTeamA, setSelectedTeamA] = useState('');
  const [selectedTeamB, setSelectedTeamB] = useState('');

  // Load data on startup
  useEffect(() => {
    async function loadData() {
      const data = await fetchDefaultSportsData();
      setPlayers(data);
      setLoading(false);
    }
    loadData();
  }, []);

  const sportsList = Array.from(new Set(players.map((p) => p.sport))).sort();
  const categoriesList = ['All', ...Array.from(new Set(players.map((p) => p.category))).sort()];
  const phasesList = ['All', 'Phase 1', 'Phase 2'];

  // 1. Auto-Generate Teams/Groups
  const handleGenerateTeams = (sport) => {
    const size = teamSizes[sport] || 4;
    const sportPlayers = players.filter((p) => {
      const matchesSport = p.sport === sport;
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesPhase = selectedPhase === 'All' || p.phase === selectedPhase;
      return matchesSport && matchesCategory && matchesPhase;
    });

    const generatedTeams = [];
    let teamCount = 1;

    for (let i = 0; i < sportPlayers.length; i += size) {
      const chunk = sportPlayers.slice(i, i + size);
      generatedTeams.push({
        id: `${sport}_T${teamCount}`,
        name: `Team ${teamCount} (${chunk.length} players)`,
        sport,
        members: chunk,
      });
      teamCount++;
    }

    setTeams((prev) => ({ ...prev, [sport]: generatedTeams }));
  };

  // 2. Schedule Match
  const handleScheduleMatch = () => {
    if (!selectedTeamA || !selectedTeamB || selectedTeamA === selectedTeamB) {
      alert('Please select two different teams.');
      return;
    }
    const teamAObj = teams[selectedSport]?.find((t) => t.id === selectedTeamA);
    const teamBObj = teams[selectedSport]?.find((t) => t.id === selectedTeamB);

    const newMatch = {
      id: `MATCH_${Date.now()}`,
      sport: selectedSport,
      teamAId: selectedTeamA,
      teamBId: selectedTeamB,
      teamAName: teamAObj?.name || selectedTeamA,
      teamBName: teamBObj?.name || selectedTeamB,
      scoreA: 0,
      scoreB: 0,
      status: 'Scheduled', // 'Scheduled' | 'Completed'
      winner: null,
    };

    setMatches((prev) => [...prev, newMatch]);
    setSelectedTeamA('');
    setSelectedTeamB('');
  };

  // 3. Log Score & Complete Match
  const handleUpdateScore = (matchId, scoreA, scoreB) => {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          const sA = parseInt(scoreA, 10) || 0;
          const sB = parseInt(scoreB, 10) || 0;
          let winner = 'Draw';
          if (sA > sB) winner = m.teamAName;
          else if (sB > sA) winner = m.teamBName;

          return { ...m, scoreA: sA, scoreB: sB, status: 'Completed', winner };
        }
        return m;
      })
    );
  };

  // 4. Calculate Standings
  const calculateStandings = (sport) => {
    const sportTeams = teams[sport] || [];
    const sportMatches = matches.filter((m) => m.sport === sport && m.status === 'Completed');

    const stats = {};
    sportTeams.forEach((t) => {
      stats[t.id] = { id: t.id, name: t.name, played: 0, won: 0, lost: 0, drawn: 0, points: 0 };
    });

    sportMatches.forEach((m) => {
      if (stats[m.teamAId] && stats[m.teamBId]) {
        stats[m.teamAId].played += 1;
        stats[m.teamBId].played += 1;

        if (m.scoreA > m.scoreB) {
          stats[m.teamAId].won += 1;
          stats[m.teamAId].points += 3;
          stats[m.teamBId].lost += 1;
        } else if (m.scoreB > m.scoreA) {
          stats[m.teamBId].won += 1;
          stats[m.teamBId].points += 3;
          stats[m.teamAId].lost += 1;
        } else {
          stats[m.teamAId].drawn += 1;
          stats[m.teamAId].points += 1;
          stats[m.teamBId].drawn += 1;
          stats[m.teamBId].points += 1;
        }
      }
    });

    return Object.values(stats).sort((a, b) => b.points - a.points);
  };

  const filteredPlayers = players.filter((p) => {
    const matchesSport = selectedSport === 'All' || p.sport === selectedSport;
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesPhase = selectedPhase === 'All' || p.phase === selectedPhase;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.flat.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery);

    return matchesSport && matchesCategory && matchesPhase && matchesSearch;
  });

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
            Sanvi Olympics Tournament Portal
          </h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>
            Total Players: <strong>{players.length}</strong> | Active Sport: <strong>{selectedSport}</strong>
          </p>
        </div>

        {/* Global Controls */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <select value={selectedSport} onChange={(e) => setSelectedSport(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>
            {sportsList.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
        {[
          { id: 'players', label: '👥 Players Directory' },
          { id: 'teams', label: '🛡️ Teams & Groups' },
          { id: 'matches', label: '⚔️ Match Tracker' },
          { id: 'leaderboard', label: '🏆 Leaderboard & Standings' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px',
              fontWeight: '600',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #2563eb' : '3px solid transparent',
              background: 'none',
              color: activeTab === tab.id ? '#2563eb' : '#64748b',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: PLAYERS DIRECTORY */}
      {activeTab === 'players' && (
        <div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', background: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>CATEGORY</label>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ display: 'block', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                {categoriesList.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>PHASE</label>
              <select value={selectedPhase} onChange={(e) => setSelectedPhase(e.target.value)} style={{ display: 'block', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                {phasesList.map((ph) => <option key={ph} value={ph}>{ph}</option>)}
              </select>
            </div>
            <div style={{ flexGrow: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>SEARCH</label>
              <input type="text" placeholder="Search by name, flat, or phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ display: 'block', width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: '8px', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '10px' }}>Name</th>
                  <th style={{ padding: '10px' }}>Sport</th>
                  <th style={{ padding: '10px' }}>Category</th>
                  <th style={{ padding: '10px' }}>Age</th>
                  <th style={{ padding: '10px' }}>Phase</th>
                  <th style={{ padding: '10px' }}>Flat</th>
                  <th style={{ padding: '10px' }}>Phone</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px', fontWeight: '600' }}>{p.name}</td>
                    <td style={{ padding: '10px' }}><span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', fontSize: '12px' }}>{p.sport}</span></td>
                    <td style={{ padding: '10px' }}>{p.category}</td>
                    <td style={{ padding: '10px' }}>{p.age}</td>
                    <td style={{ padding: '10px' }}><span style={{ background: p.phase === 'Phase 1' ? '#dcfce7' : '#fef3c7', color: p.phase === 'Phase 1' ? '#15803d' : '#b45309', padding: '3px 8px', borderRadius: '4px', fontSize: '12px' }}>{p.phase}</span></td>
                    <td style={{ padding: '10px' }}>{p.flat}</td>
                    <td style={{ padding: '10px' }}>{p.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TEAMS & GROUPS */}
      {activeTab === 'teams' && (
        <div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>
                PLAYERS PER TEAM / GROUP FOR {selectedSport.toUpperCase()}
              </label>
              <input
                type="number"
                min="1"
                max="15"
                value={teamSizes[selectedSport] || 4}
                onChange={(e) => setTeamSizes({ ...teamSizes, [selectedSport]: parseInt(e.target.value, 10) || 1 })}
                style={{ width: '100px', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
              <span style={{ marginLeft: '10px', fontSize: '12px', color: '#64748b' }}>
                (e.g., 4 for Chess, 7-10 for Cricket/Football)
              </span>
            </div>

            <button
              onClick={() => handleGenerateTeams(selectedSport)}
              style={{ background: '#16a34a', color: '#fff', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
            >
              ⚡ Auto-Generate Teams ({filteredPlayers.length} Players)
            </button>
          </div>

          {/* Display Generated Teams */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {(teams[selectedSport] || []).map((team) => (
              <div key={team.id} style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  {team.name}
                </h3>
                <ol style={{ paddingLeft: '20px', margin: 0, fontSize: '13px' }}>
                  {team.members.map((m, idx) => (
                    <li key={idx} style={{ marginBottom: '6px' }}>
                      <strong>{m.name}</strong> <span style={{ color: '#64748b' }}>({m.flat} | {m.category})</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MATCH TRACKER */}
      {activeTab === 'matches' && (
        <div>
          {/* Schedule Match Bar */}
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Schedule a {selectedSport} Match</h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <select value={selectedTeamA} onChange={(e) => setSelectedTeamA(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', flex: 1 }}>
                <option value="">Select Team A</option>
                {(teams[selectedSport] || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>

              <strong style={{ color: '#64748b' }}>VS</strong>

              <select value={selectedTeamB} onChange={(e) => setSelectedTeamB(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', flex: 1 }}>
                <option value="">Select Team B</option>
                {(teams[selectedSport] || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>

              <button onClick={handleScheduleMatch} style={{ background: '#2563eb', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                Schedule Match
              </button>
            </div>
          </div>

          {/* List Matches */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {matches.filter((m) => m.sport === selectedSport).map((match) => (
              <div key={match.id} style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>{match.sport} MATCH</span>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>
                    {match.teamAName} <span style={{ color: '#dc2626' }}>({match.scoreA})</span> vs {match.teamBName} <span style={{ color: '#dc2626' }}>({match.scoreB})</span>
                  </div>
                  {match.winner && <div style={{ fontSize: '12px', color: '#16a3a4', marginTop: '4px' }}>Winner: {match.winner}</div>}
                </div>

                {/* Score Input Form */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="Team A Score"
                    defaultValue={match.scoreA}
                    id={`scoreA_${match.id}`}
                    style={{ width: '80px', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                  <span>-</span>
                  <input
                    type="number"
                    placeholder="Team B Score"
                    defaultValue={match.scoreB}
                    id={`scoreB_${match.id}`}
                    style={{ width: '80px', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                  <button
                    onClick={() => {
                      const sA = document.getElementById(`scoreA_${match.id}`).value;
                      const sB = document.getElementById(`scoreB_${match.id}`).value;
                      handleUpdateScore(match.id, sA, sB);
                    }}
                    style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Save Result
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>🏆 Standings: {selectedSport}</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px' }}>Rank</th>
                <th style={{ padding: '10px' }}>Team</th>
                <th style={{ padding: '10px' }}>Played (MP)</th>
                <th style={{ padding: '10px' }}>Won (W)</th>
                <th style={{ padding: '10px' }}>Lost (L)</th>
                <th style={{ padding: '10px' }}>Drawn (D)</th>
                <th style={{ padding: '10px' }}>Points (PTS)</th>
              </tr>
            </thead>
            <tbody>
              {calculateStandings(selectedSport).map((team, rank) => (
                <tr key={team.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>#{rank + 1}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{team.name}</td>
                  <td style={{ padding: '10px' }}>{team.played}</td>
                  <td style={{ padding: '10px', color: '#16a34a' }}>{team.won}</td>
                  <td style={{ padding: '10px', color: '#dc2626' }}>{team.lost}</td>
                  <td style={{ padding: '10px', color: '#d97706' }}>{team.drawn}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#2563eb' }}>{team.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}