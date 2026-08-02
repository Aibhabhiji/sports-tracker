'use client';

import { useState, useEffect } from 'react';
import { fetchDefaultSportsData } from '../lib/excelParser';

const SPORT_FORMATS = {
  Chess: 'Round Robin',
  Carrom: 'Round Robin',
  Quiz: 'Round Robin',
  'Table Tennis': 'Round Robin',
  Cricket: 'Knockout',
  Football: 'Knockout',
  Badminton: 'Knockout',
  'Tug of War': 'Knockout',
};

const AGE_GROUPS = ['Under 12 (U-12)', 'Teens (12-17)', 'Adults (18+)'];

export default function SportsDashboard() {
  const [players, setPlayers] = useState([]);
  const [activeTab, setActiveTab] = useState('rr_groups'); // 'players' | 'rr_groups' | 'rr_matches' | 'rr_standings' | 'rr_knockouts'
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSport, setSelectedSport] = useState('Chess');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('Under 12 (U-12)');
  const [groupSize, setGroupSize] = useState(4);
  const [qualifiersPerGroup, setQualifiersPerGroup] = useState(2); // Top 2 or Top 3

  // Round Robin State
  const [groups, setGroups] = useState({}); // { [key]: [{ id: 'Group A', members: [] }] }
  const [rrMatches, setRrMatches] = useState({}); // { [key]: [{ id, groupName, playerA, playerB, scoreA, scoreB, winner, status }] }
  const [knockoutMatches, setKnockoutMatches] = useState({}); // { [key]: [{ id, roundLabel, roundIndex, playerA, playerB, scoreA, scoreB, winner, status }] }

  const currentKey = `${selectedSport}_${selectedAgeGroup}`;
  const currentFormat = SPORT_FORMATS[selectedSport] || 'Round Robin';

  // Load Dataset
  useEffect(() => {
    async function loadData() {
      const data = await fetchDefaultSportsData();
      setPlayers(data);
      setLoading(false);
    }
    loadData();
  }, []);

  const sportsList = Array.from(new Set(players.map((p) => p.sport))).sort();

  // 1. Generate Groups & Intra-Group Individual Matches
  const handleGenerateGroupsAndFixtures = () => {
    const pool = players.filter(
      (p) => p.sport === selectedSport && p.ageGroup === selectedAgeGroup
    );

    if (pool.length === 0) {
      alert(`No players found for ${selectedSport} in ${selectedAgeGroup}`);
      return;
    }

    const generatedGroups = [];
    let groupIdx = 0;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (let i = 0; i < pool.length; i += groupSize) {
      const chunk = pool.slice(i, i + groupSize);
      const groupLetter = alphabet[groupIdx % 26];
      generatedGroups.push({
        id: `Group_${groupLetter}`,
        name: `Group ${groupLetter}`,
        members: chunk,
      });
      groupIdx++;
    }

    // Generate 1-on-1 matches inside each group
    const generatedMatches = [];
    let matchIdCount = 1;

    generatedGroups.forEach((group) => {
      const members = group.members;
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          generatedMatches.push({
            id: `M_RR_${currentKey}_${matchIdCount}`,
            groupId: group.id,
            groupName: group.name,
            playerA: members[i],
            playerB: members[j],
            scoreA: 0,
            scoreB: 0,
            status: 'Scheduled',
            winner: null,
          });
          matchIdCount++;
        }
      }
    });

    setGroups((prev) => ({ ...prev, [currentKey]: generatedGroups }));
    setRrMatches((prev) => ({ ...prev, [currentKey]: generatedMatches }));
    setKnockoutMatches((prev) => ({ ...prev, [currentKey]: [] }));
    setActiveTab('rr_matches');
  };

  // 2. Record Score for Individual Round Robin Match
  const handleSaveRrScore = (matchId, sA, sB) => {
    const scoreA = parseInt(sA, 10) || 0;
    const scoreB = parseInt(sB, 10) || 0;

    setRrMatches((prev) => {
      const updatedList = (prev[currentKey] || []).map((m) => {
        if (m.id === matchId) {
          let winner = null;
          let winnerPlayerId = null;
          if (scoreA > scoreB) {
            winner = m.playerA.name;
            winnerPlayerId = m.playerA.id;
          } else if (scoreB > scoreA) {
            winner = m.playerB.name;
            winnerPlayerId = m.playerB.id;
          } else {
            winner = 'Draw';
          }
          return { ...m, scoreA, scoreB, status: 'Completed', winner, winnerPlayerId };
        }
        return m;
      });
      return { ...prev, [currentKey]: updatedList };
    });
  };

  // 3. Compute Group Standings for Individual Players
  const getGroupStandings = (groupId) => {
    const groupMatches = (rrMatches[currentKey] || []).filter(
      (m) => m.groupId === groupId && m.status === 'Completed'
    );
    const group = (groups[currentKey] || []).find((g) => g.id === groupId);
    if (!group) return [];

    const stats = {};
    group.members.forEach((p) => {
      stats[p.id] = { player: p, played: 0, won: 0, lost: 0, drawn: 0, points: 0 };
    });

    groupMatches.forEach((m) => {
      const pA = m.playerA.id;
      const pB = m.playerB.id;
      if (stats[pA] && stats[pB]) {
        stats[pA].played += 1;
        stats[pB].played += 1;

        if (m.scoreA > m.scoreB) {
          stats[pA].won += 1;
          stats[pA].points += 3;
          stats[pB].lost += 1;
        } else if (m.scoreB > m.scoreA) {
          stats[pB].won += 1;
          stats[pB].points += 3;
          stats[pA].lost += 1;
        } else {
          stats[pA].drawn += 1;
          stats[pA].points += 1;
          stats[pB].drawn += 1;
          stats[pB].points += 1;
        }
      }
    });

    return Object.values(stats).sort((a, b) => b.points - a.points);
  };

  // 4. Advance Top Qualifiers to Next Stage (Knockouts)
  const handleAdvanceToKnockouts = () => {
    const currentGroupList = groups[currentKey] || [];
    if (currentGroupList.length === 0) {
      alert('Please generate groups and play matches first.');
      return;
    }

    let qualifiedPlayers = [];

    currentGroupList.forEach((g) => {
      const standings = getGroupStandings(g.id);
      const topN = standings.slice(0, qualifiersPerGroup).map((s) => s.player);
      qualifiedPlayers = [...qualifiedPlayers, ...topN];
    });

    if (qualifiedPlayers.length < 2) {
      alert('Not enough qualified players to form knockout rounds.');
      return;
    }

    // Build Round 1 of Knockouts
    const round1Matches = [];
    let matchIdx = 1;

    for (let i = 0; i < qualifiedPlayers.length; i += 2) {
      if (i + 1 < qualifiedPlayers.length) {
        round1Matches.push({
          id: `KO_${currentKey}_R1_${matchIdx}`,
          roundLabel: qualifiedPlayers.length <= 4 ? 'Semi-Finals' : 'Quarter-Finals / Round 1',
          roundIndex: 1,
          matchIndex: matchIdx,
          playerA: qualifiedPlayers[i],
          playerB: qualifiedPlayers[i + 1],
          scoreA: 0,
          scoreB: 0,
          status: 'Scheduled',
          winner: null,
          winnerPlayer: null,
        });
        matchIdx++;
      }
    }

    setKnockoutMatches((prev) => ({ ...prev, [currentKey]: round1Matches }));
    setActiveTab('rr_knockouts');
  };

  // 5. Update Knockout Match Score & Auto-Advance
  const handleSaveKnockoutScore = (matchId, sA, sB) => {
    const scoreA = parseInt(sA, 10) || 0;
    const scoreB = parseInt(sB, 10) || 0;

    setKnockoutMatches((prev) => {
      const currentList = prev[currentKey] || [];
      const updated = currentList.map((m) => {
        if (m.id === matchId) {
          let winner = null;
          let winnerPlayer = null;
          if (scoreA > scoreB) {
            winner = m.playerA.name;
            winnerPlayer = m.playerA;
          } else if (scoreB > scoreA) {
            winner = m.playerB.name;
            winnerPlayer = m.playerB;
          }
          return { ...m, scoreA, scoreB, status: 'Completed', winner, winnerPlayer };
        }
        return m;
      });

      // Check if current round is complete to trigger next round
      const targetMatch = updated.find((m) => m.id === matchId);
      if (targetMatch && targetMatch.winnerPlayer) {
        checkAndBuildNextKnockoutRound(updated, targetMatch.roundIndex);
      }

      return { ...prev, [currentKey]: updated };
    });
  };

  const checkAndBuildNextKnockoutRound = (allKnockoutMatches, currentRoundIndex) => {
    const roundMatches = allKnockoutMatches.filter((m) => m.roundIndex === currentRoundIndex);
    const isComplete = roundMatches.every((m) => m.status === 'Completed');
    if (!isComplete) return;

    const nextRoundIndex = currentRoundIndex + 1;
    const alreadyExists = allKnockoutMatches.some((m) => m.roundIndex === nextRoundIndex);
    if (alreadyExists) return;

    const winners = roundMatches.map((m) => m.winnerPlayer).filter(Boolean);
    if (winners.length < 2) return; // Champion crowned!

    const label = winners.length === 2 ? 'Final' : 'Semi-Finals';
    let matchIdx = 1;

    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        allKnockoutMatches.push({
          id: `KO_${currentKey}_R${nextRoundIndex}_${matchIdx}`,
          roundLabel: label,
          roundIndex: nextRoundIndex,
          matchIndex: matchIdx,
          playerA: winners[i],
          playerB: winners[i + 1],
          scoreA: 0,
          scoreB: 0,
          status: 'Scheduled',
          winner: null,
          winnerPlayer: null,
        });
        matchIdx++;
      }
    }
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Top Header */}
      <header style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
            Sanvi Olympics Tournament Portal
          </h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>
            Selected Sport: <strong>{selectedSport}</strong> ({currentFormat}) | Division: <strong>{selectedAgeGroup}</strong>
          </p>
        </div>

        {/* Global Selectors */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', color: '#475569' }}>SPORT</label>
            <select value={selectedSport} onChange={(e) => setSelectedSport(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>
              {sportsList.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', color: '#475569' }}>AGE DIVISION</label>
            <select value={selectedAgeGroup} onChange={(e) => setSelectedAgeGroup(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold', background: '#eff6ff' }}>
              {AGE_GROUPS.map((ag) => (
                <option key={ag} value={ag}>{ag}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Primary Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
        {[
          { id: 'players', label: '👥 Player Directory' },
          { id: 'rr_groups', label: '🧩 1. Group Setup' },
          { id: 'rr_matches', label: '⚔️ 2. Intra-Group Matches' },
          { id: 'rr_standings', label: '📊 3. Group Standings & Qualifiers' },
          { id: 'rr_knockouts', label: '🏆 4. Knockout Stage' },
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

      {/* TAB 1: PLAYER DIRECTORY */}
      {activeTab === 'players' && (
        <div style={{ background: '#fff', borderRadius: '8px', overflowX: 'auto', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px' }}>Name</th>
                <th style={{ padding: '10px' }}>Sport</th>
                <th style={{ padding: '10px' }}>Age</th>
                <th style={{ padding: '10px' }}>Age Division</th>
                <th style={{ padding: '10px' }}>Flat</th>
                <th style={{ padding: '10px' }}>Phone</th>
              </tr>
            </thead>
            <tbody>
              {players
                .filter((p) => p.sport === selectedSport && p.ageGroup === selectedAgeGroup)
                .map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px', fontWeight: '600' }}>{p.name}</td>
                    <td style={{ padding: '10px' }}>{p.sport}</td>
                    <td style={{ padding: '10px' }}>{p.age}</td>
                    <td style={{ padding: '10px' }}>{p.ageGroup}</td>
                    <td style={{ padding: '10px' }}>{p.flat}</td>
                    <td style={{ padding: '10px' }}>{p.phone}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: GROUP SETUP */}
      {activeTab === 'rr_groups' && (
        <div>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                PLAYERS PER GROUP
              </label>
              <input
                type="number"
                min="2"
                max="8"
                value={groupSize}
                onChange={(e) => setGroupSize(parseInt(e.target.value, 10) || 4)}
                style={{ width: '80px', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                TOP QUALIFIERS PER GROUP TO ADVANCE
              </label>
              <select
                value={qualifiersPerGroup}
                onChange={(e) => setQualifiersPerGroup(parseInt(e.target.value, 10))}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value={1}>Top 1 Player</option>
                <option value={2}>Top 2 Players</option>
                <option value={3}>Top 3 Players</option>
              </select>
            </div>

            <button
              onClick={handleGenerateGroupsAndFixtures}
              style={{ background: '#16a34a', color: '#fff', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
            >
              ⚡ Generate Groups & 1-on-1 Round Robin Matches
            </button>
          </div>

          {/* Group View */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {(groups[currentKey] || []).map((group) => (
              <div key={group.id} style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#2563eb', borderBottom: '2px solid #f1f5f9', paddingBottom: '6px' }}>
                  {group.name} ({group.members.length} Players)
                </h3>
                <ol style={{ paddingLeft: '20px', margin: 0, fontSize: '14px' }}>
                  {group.members.map((m) => (
                    <li key={m.id} style={{ marginBottom: '6px' }}>
                      <strong>{m.name}</strong> <span style={{ color: '#64748b' }}>({m.flat})</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: INTRA-GROUP MATCHES */}
      {activeTab === 'rr_matches' && (
        <div>
          <div style={{ background: '#eff6ff', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', color: '#1e40af', borderLeft: '4px solid #2563eb' }}>
            <strong>Intra-Group Matches:</strong> Each player in a group plays 1-on-1 against all other members in their group.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(rrMatches[currentKey] || []).map((match) => (
              <div key={match.id} style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#2563eb', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>
                    {match.groupName}
                  </span>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '6px' }}>
                    {match.playerA.name} <span style={{ color: '#dc2626' }}>({match.scoreA})</span> vs {match.playerB.name} <span style={{ color: '#dc2626' }}>({match.scoreB})</span>
                  </div>
                  {match.winner && <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 'bold', marginTop: '4px' }}>Winner: {match.winner}</div>}
                </div>

                {/* Score Input Form */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="number" placeholder="P1 Score" defaultValue={match.scoreA} id={`sA_${match.id}`} style={{ width: '70px', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                  <span>-</span>
                  <input type="number" placeholder="P2 Score" defaultValue={match.scoreB} id={`sB_${match.id}`} style={{ width: '70px', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                  <button
                    onClick={() => {
                      const scoreA = document.getElementById(`sA_${match.id}`).value;
                      const scoreB = document.getElementById(`sB_${match.id}`).value;
                      handleSaveRrScore(match.id, scoreA, scoreB);
                    }}
                    style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Save Score
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: GROUP STANDINGS & QUALIFIERS */}
      {activeTab === 'rr_standings' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '20px' }}>
              Group Leaderboards ({selectedSport} - {selectedAgeGroup})
            </h2>

            <button
              onClick={handleAdvanceToKnockouts}
              style={{ background: '#2563eb', color: '#fff', padding: '10px 18px', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
            >
              🚀 Advance Top {qualifiersPerGroup} Qualifiers to Knockout Stage
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' }}>
            {(groups[currentKey] || []).map((group) => {
              const standings = getGroupStandings(group.id);
              return (
                <div key={group.id} style={{ background: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>{group.name} Leaderboard</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '6px' }}>Rank</th>
                        <th style={{ padding: '6px' }}>Player</th>
                        <th style={{ padding: '6px' }}>MP</th>
                        <th style={{ padding: '6px' }}>W</th>
                        <th style={{ padding: '6px' }}>L</th>
                        <th style={{ padding: '6px' }}>D</th>
                        <th style={{ padding: '6px' }}>PTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((row, idx) => {
                        const isQualified = idx < qualifiersPerGroup;
                        return (
                          <tr key={row.player.id} style={{ borderBottom: '1px solid #f1f5f9', background: isQualified ? '#f0fdf4' : '#fff' }}>
                            <td style={{ padding: '6px', fontWeight: 'bold' }}>
                              #{idx + 1} {isQualified && '✅'}
                            </td>
                            <td style={{ padding: '6px', fontWeight: 'bold' }}>{row.player.name}</td>
                            <td style={{ padding: '6px' }}>{row.played}</td>
                            <td style={{ padding: '6px', color: '#16a34a' }}>{row.won}</td>
                            <td style={{ padding: '6px', color: '#dc2626' }}>{row.lost}</td>
                            <td style={{ padding: '6px', color: '#d97706' }}>{row.drawn}</td>
                            <td style={{ padding: '6px', fontWeight: 'bold', color: '#2563eb' }}>{row.points}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: KNOCKOUT STAGE */}
      {activeTab === 'rr_knockouts' && (
        <div>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>
            🏆 Knockout Bracket for Top Qualifiers ({selectedSport})
          </h2>

          <div style={{ display: 'flex', gap: '24px', overflowX: 'auto', paddingBottom: '16px' }}>
            {Array.from(new Set((knockoutMatches[currentKey] || []).map((m) => m.roundIndex)))
              .sort()
              .map((roundIdx) => {
                const roundList = (knockoutMatches[currentKey] || []).filter((m) => m.roundIndex === roundIdx);
                const roundTitle = roundList[0]?.roundLabel || `Round ${roundIdx}`;

                return (
                  <div key={roundIdx} style={{ minWidth: '300px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <h3 style={{ textAlign: 'center', margin: '0 0 16px 0', color: '#2563eb' }}>{roundTitle}</h3>

                    {roundList.map((m) => (
                      <div key={m.id} style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '12px' }}>
                        <div style={{ fontWeight: m.winner === m.playerA.name ? 'bold' : 'normal', color: m.winner === m.playerA.name ? '#16a34a' : '#1e293b' }}>
                          {m.playerA.name} ({m.scoreA})
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0' }}>VS</div>
                        <div style={{ fontWeight: m.winner === m.playerB.name ? 'bold' : 'normal', color: m.winner === m.playerB.name ? '#16a34a' : '#1e293b' }}>
                          {m.playerB.name} ({m.scoreB})
                        </div>

                        {/* Knockout Match Score Inputs */}
                        <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                          <input type="number" placeholder="P1" defaultValue={m.scoreA} id={`ko_A_${m.id}`} style={{ width: '50px', padding: '4px', fontSize: '12px' }} />
                          <input type="number" placeholder="P2" defaultValue={m.scoreB} id={`ko_B_${m.id}`} style={{ width: '50px', padding: '4px', fontSize: '12px' }} />
                          <button
                            onClick={() => {
                              const sA = document.getElementById(`ko_A_${m.id}`).value;
                              const sB = document.getElementById(`ko_B_${m.id}`).value;
                              handleSaveKnockoutScore(m.id, sA, sB);
                            }}
                            style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}