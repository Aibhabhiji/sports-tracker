'use client';

import React, { useState, useEffect } from 'react';
import { getInitialParticipants, parseCSVParticipants } from '@/lib/participantStore';
import TeamAuctionModule from '@/components/sports/TeamAuctionModule';
import ChessCarromModule from '@/components/sports/ChessCarromModule';
import ChessAdvancedModule from '@/components/sports/ChessAdvancedModule';
import MarathonModule from '@/components/sports/MarathonModule';
import CricketModule from '@/components/sports/CricketModule';
import FootballModule from '@/components/sports/FootballModule';
import TableTennisModule from '@/components/sports/TableTennisModule';
import BadmintonModule from '@/components/sports/BadmintonModule';
import AdminModule from '@/components/AdminModule';

const SPORTS_LIST = [
  { id: 'cricket', name: 'Cricket', type: 'AUCTION_TEAM' },
  { id: 'football', name: 'Football', type: 'FOOTBALL_CUSTOM' },
  { id: 'badminton', name: 'Badminton', type: 'BADMINTON_CUSTOM' },
  { id: 'table_tennis', name: 'Table Tennis', type: 'TABLE_TENNIS_CUSTOM' },
  { id: 'tug_of_war', name: 'Tug of War', type: 'AUCTION_TEAM' },
  { id: 'chess', name: 'Chess', type: 'ADVANCED_CHESS' },
  { id: 'carrom', name: 'Carrom', type: 'ROUND_ROBIN' },
  { id: 'marathon', name: 'Marathon', type: 'MARATHON' },
  { id: 'walking', name: 'Walking', type: 'RACE' },
  { id: 'swimming', name: 'Swimming', type: 'RACE' },
  { id: 'quiz', name: 'Quiz', type: 'AUCTION_TEAM' },
];

export default function SanviOlympicsPortal() {
  const [activeSport, setActiveSport] = useState(SPORTS_LIST[1]); // Default to Football
  const [activeSubTab, setActiveSubTab] = useState('participants');
  const [participants, setParticipants] = useState([]);
  const [sportsData, setSportsData] = useState({});

  const [filterByGameChoice, setFilterByGameChoice] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState('All Phases');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('All Age Groups');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isConfiguringSponsors, setIsConfiguringSponsors] = useState(false);
  
  // Centralized Admin Protection
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminModuleState, setAdminModuleState] = useState({ admins: [], isAdmin: false });

  // Sponsors State
  const [sponsors, setSponsors] = useState([
    { id: '1', title: 'Sponsor 1', image: null, text: '', effect: 'none' },
    { id: '2', title: 'Sponsor 2', image: null, text: '', effect: 'none' },
    { id: '3', title: 'Sponsor 3', image: null, text: '', effect: 'none' },
  ]);

  // Load data from Server DB, with localStorage Fallback for localhost
  useEffect(() => {
    async function fetchCentralData() {
      let loadedServerData = false;
      try {
        const res = await fetch('/api/portal-data');
        if (res.ok) {
          const json = await res.json();
          if (json.participants && json.participants.length > 0) {
            setParticipants(json.participants);
            loadedServerData = true;
          }
          if (json.sportsData) setSportsData(json.sportsData);
          if (json.sponsors && json.sponsors.length > 0) setSponsors(json.sponsors);
        }
      } catch (e) {
        console.warn('Server API unavailable, switching to local storage mode:', e);
      }

      // LocalStorage Fallback if server fetch fails or returns empty
      if (!loadedServerData) {
        try {
          const localPart = localStorage.getItem('sanvi_participants');
          const localSports = localStorage.getItem('sanvi_sportsData');
          const localSponsors = localStorage.getItem('sanvi_sponsors');

          if (localPart) setParticipants(JSON.parse(localPart));
          else setParticipants(getInitialParticipants());

          if (localSports) setSportsData(JSON.parse(localSports));
          if (localSponsors) setSponsors(JSON.parse(localSponsors));
        } catch (err) {
          setParticipants(getInitialParticipants());
        }
      }
      setIsLoaded(true);
    }
    fetchCentralData();
  }, []);

  const verifyAdminAndExecute = (actionCallback) => {
    if (!isAdminMode) {
      const pin = prompt('🔒 Admin Password Required to Edit/Save Changes:\n(Enter admin passcode)');
      if (pin === 'admin123' || pin === 'sanvi2026') {
        setIsAdminMode(true);
        actionCallback();
      } else if (pin !== null) {
        alert('❌ Incorrect admin password. Changes cannot be saved.');
      }
    } else {
      actionCallback();
    }
  };

  // Resilient Save Handler: Attempts Server Sync, Falls Back to LocalStorage without intrusive alerts
  const saveToCentralServer = async (updatedParticipants, updatedSportsData, updatedSponsors) => {
    verifyAdminAndExecute(async () => {
      // 1. Always save locally first so user never loses progress
      try {
        localStorage.setItem('sanvi_participants', JSON.stringify(updatedParticipants));
        localStorage.setItem('sanvi_sportsData', JSON.stringify(updatedSportsData));
        localStorage.setItem('sanvi_sponsors', JSON.stringify(updatedSponsors));
      } catch (e) {
        console.error('LocalStorage write error:', e);
      }

      // 2. Try saving to central server API silently
      try {
        const res = await fetch('/api/portal-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participants: updatedParticipants,
            sportsData: updatedSportsData,
            sponsors: updatedSponsors,
          }),
        });
        if (!res.ok) {
          console.warn('Server DB update skipped on local environment.');
        }
      } catch (e) {
        console.warn('Server endpoint unreachable on localhost. Saved to local storage.');
      }
    });
  };

  const currentSportState = sportsData[activeSport.id] || {};

  const updateSportState = (updatedFields) => {
    verifyAdminAndExecute(() => {
      const updatedSportsData = {
        ...sportsData,
        [activeSport.id]: {
          ...currentSportState,
          ...updatedFields,
        },
      };
      setSportsData(updatedSportsData);
      saveToCentralServer(participants, updatedSportsData, sponsors);
    });
  };

  // 1. Initial Filtering
  const rawFilteredParticipants = participants.filter((p) => {
    const pSport = p.gameChoice || p.sport || '';

    const matchGame = !filterByGameChoice || pSport.trim().toLowerCase() === activeSport.name.trim().toLowerCase();
    
    // Robust Phase Filter Match
    const matchPhase = selectedPhase === 'All Phases' || (() => {
      const rawPhase = p.phase ?? p.Phase ?? p.PHASE ?? p.phaseNo ?? p.PhaseNo ?? '';
      if (rawPhase === null || rawPhase === undefined || rawPhase === '') return false;

      const pPhaseStr = rawPhase.toString().trim().toLowerCase();
      const selPhaseStr = selectedPhase.trim().toLowerCase();

      if (pPhaseStr === selPhaseStr) return true;

      const selDigit = selPhaseStr.match(/\d+/)?.[0];
      const pDigit = pPhaseStr.match(/\d+/)?.[0];

      if (selDigit && pDigit) {
        return selDigit === pDigit;
      }

      return pPhaseStr.includes(selPhaseStr) || selPhaseStr.includes(pPhaseStr);
    })();

    const matchCat = selectedCategory === 'All Categories' || p.category === selectedCategory;
    
    // Age Range Filter Evaluation
    const matchAge = selectedAgeGroup === 'All Age Groups' || (() => {
      const rawAgeVal = p.age ?? p.Age ?? p.ageGroup ?? p.AgeGroup ?? p.AGE ?? '';
      
      let numAge = null;
      if (typeof rawAgeVal === 'number') {
        numAge = rawAgeVal;
      } else if (rawAgeVal !== null && rawAgeVal !== undefined) {
        const digits = rawAgeVal.toString().match(/\d+/);
        if (digits) numAge = parseInt(digits[0], 10);
      }

      if (numAge === null || isNaN(numAge)) {
        const pAgeStr = rawAgeVal.toString().trim().toLowerCase();
        if (selectedAgeGroup === 'Under 12 Kids') return pAgeStr.includes('under 12') || pAgeStr.includes('kids');
        if (selectedAgeGroup === '12 - 17 years Teens') return pAgeStr.includes('12') || pAgeStr.includes('teen');
        if (selectedAgeGroup === '18 - 55 years Adults') return pAgeStr.includes('18') || pAgeStr.includes('adult');
        if (selectedAgeGroup === '55+ years Seniors') return pAgeStr.includes('55') || pAgeStr.includes('senior');
        return false;
      }

      switch (selectedAgeGroup) {
        case 'Under 12 Kids': return numAge < 12;
        case '12 - 17 years Teens': return numAge >= 12 && numAge <= 17;
        case '18 - 55 years Adults': return numAge >= 18 && numAge <= 55;
        case '55+ years Seniors': return numAge >= 55;
        default: return true;
      }
    })();
    
    return matchGame && matchPhase && matchCat && matchAge;
  });

  // 2. Deduplication Filter (Removes duplicate registrations based on Name + Flat + Sport)
  const seenParticipants = new Set();
  const filteredParticipants = rawFilteredParticipants.filter((p) => {
    const nameKey = (p.name || '').trim().toLowerCase();
    const flatKey = (p.flat || p.Flat || p.flatNo || p.FlatNo || '').trim().toLowerCase();
    const sportKey = (p.gameChoice || p.sport || '').trim().toLowerCase();
    const compositeKey = `${nameKey}_${flatKey}_${sportKey}`;

    if (seenParticipants.has(compositeKey)) {
      return false; // Skip duplicate record
    }
    seenParticipants.add(compositeKey);
    return true;
  });

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    verifyAdminAndExecute(() => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const parsed = parseCSVParticipants(text);
        if (parsed.length > 0) {
          setParticipants(parsed);
          saveToCentralServer(parsed, sportsData, sponsors);
          alert(`Successfully imported ${parsed.length} registration records!`);
        } else {
          alert('Could not parse CSV.');
        }
      };
      reader.readAsText(file);
    });
  };

  const exportDatabaseBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ participants, sportsData, sponsors }));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sanvi_olympics_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importDatabaseBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    verifyAdminAndExecute(() => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const backup = JSON.parse(event.target.result);
          if (backup.participants) setParticipants(backup.participants);
          if (backup.sportsData) setSportsData(backup.sportsData);
          if (backup.sponsors) setSponsors(backup.sponsors);
          saveToCentralServer(backup.participants || participants, backup.sportsData || sportsData, backup.sponsors || sponsors);
          alert('Database restored successfully!');
        } catch (err) {
          alert('Invalid backup JSON file.');
        }
      };
      reader.readAsText(file);
    });
  };

  const handleResetGameData = () => {
    verifyAdminAndExecute(() => {
      if (window.confirm('Are you sure you want to reset all transaction and game data?')) {
        setSportsData({});
        saveToCentralServer(participants, {}, sponsors);
        alert('All transactional game data has been reset.');
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 font-sans space-y-6 transition-colors duration-200">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-amber-600 tracking-wide">🏆 SANVI OLYMPICS PORTAL</h1>
            <button
              onClick={() => {
                if (isAdminMode) {
                  setIsAdminMode(false);
                } else {
                  const pin = prompt('Enter Admin Passcode / Password to Unlock Write Access:');
                  if (pin === 'admin123' || pin === 'sanvi2026') {
                    setIsAdminMode(true);
                  } else if (pin !== null) {
                    alert('Incorrect passcode.');
                  }
                }
              }}
              title={isAdminMode ? "Admin Mode Unlocked (Click to Lock)" : "Click to Unlock Admin Controls"}
              className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition ${
                isAdminMode ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-slate-100 text-slate-400 border-slate-200 hover:text-slate-600'
              }`}
            >
              {isAdminMode ? '🔓 Admin Unlocked' : '🔒'}
            </button>
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
            <span>Active Sport: <strong className="text-amber-700">{activeSport.name}</strong></span>
            <span>|</span>
            <span className="text-emerald-600 font-bold">Total Records: {participants.length}</span>
            <span>|</span>
            <span className={isAdminMode ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
              {isAdminMode ? "Access: Read / Write Enabled" : "Access: Public Read-Only"}
            </span>
          </div>
        </div>

        {isAdminMode && (
          <div className="flex flex-wrap items-center gap-2 bg-amber-50 p-2 rounded-xl border border-amber-200">
            <span className="text-[10px] font-black text-amber-800 uppercase px-1">ADMIN CONTROLS:</span>
            <label className="cursor-pointer bg-amber-500 hover:bg-amber-600 text-white font-black px-3 py-1.5 rounded-lg text-xs shadow-sm transition">
              📁 Import CSV
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
            <button onClick={exportDatabaseBackup} className="bg-white hover:bg-slate-100 text-amber-700 border border-slate-200 font-black px-3 py-1.5 rounded-lg text-xs shadow-sm transition">
              💾 Backup JSON
            </button>
            <label className="cursor-pointer bg-white hover:bg-slate-100 text-emerald-700 border border-slate-200 font-black px-3 py-1.5 rounded-lg text-xs shadow-sm transition">
              📂 Restore JSON
              <input type="file" accept=".json" className="hidden" onChange={importDatabaseBackup} />
            </label>
            <button onClick={handleResetGameData} className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-black px-3 py-1.5 rounded-lg text-xs shadow-sm transition">
              🔄 Reset
            </button>
          </div>
        )}
      </header>

      {isAdminMode && (
        <AdminModule 
          currentUser={{ email: 'admin@example.com' }} 
          onAdminStateChange={(state) => setAdminModuleState(state)} 
        />
      )}

      {/* Official Event Sponsors Banner */}
      <div className="bg-gradient-to-r from-white via-slate-50 to-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-1 gap-3">
          <span className="text-[10px] font-black tracking-widest text-amber-600 uppercase">🌟 OFFICIAL EVENT SPONSORS & PARTNERS</span>
          {isAdminMode && (
            <button onClick={() => setIsConfiguringSponsors(true)} className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1">
              Configure Sponsors →
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sponsors.map((sponsor) => (
            <div key={sponsor.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden min-h-32 flex flex-col justify-between relative shadow-sm p-2">
              <div className="w-full flex-1 flex items-center justify-center overflow-hidden my-auto min-h-[80px]">
                {sponsor.image ? (
                  <img src={sponsor.image} alt={sponsor.title} className="w-full h-auto max-h-28 object-contain" />
                ) : (
                  <span className="text-xs text-slate-400 font-bold">{sponsor.title}</span>
                )}
              </div>
              {sponsor.text && (
                <div className="w-full overflow-hidden whitespace-nowrap bg-slate-50 rounded px-2 py-0.5 border border-slate-100 mt-1">
                  <marquee className="text-[11px] font-bold text-amber-700">{sponsor.text}</marquee>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-slate-300">
        {SPORTS_LIST.map((sport) => (
          <button
            key={sport.id}
            onClick={() => setActiveSport(sport)}
            className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wider whitespace-nowrap transition shadow-sm ${
              activeSport.id === sport.id
                ? 'bg-amber-500 text-white shadow-amber-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {sport.name}
          </button>
        ))}
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1.5">Game Choice Matching</label>
          <button
            onClick={() => setFilterByGameChoice(!filterByGameChoice)}
            className={`w-full p-2.5 rounded-xl text-xs font-black border transition shadow-sm ${
              filterByGameChoice ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            {filterByGameChoice ? `✓ Filtering "${activeSport.name}"` : 'Showing All Registrations'}
          </button>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1.5">Age Group Segregation</label>
          <select value={selectedAgeGroup} onChange={(e) => setSelectedAgeGroup(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 outline-none shadow-inner">
            <option>All Age Groups</option>
            <option>Under 12 Kids</option>
            <option>12 - 17 years Teens</option>
            <option>18 - 55 years Adults</option>
            <option>55+ years Seniors</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1.5">Phase Filter</label>
          <select value={selectedPhase} onChange={(e) => setSelectedPhase(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 outline-none shadow-inner">
            <option>All Phases</option>
            <option>Phase 1</option>
            <option>Phase 2</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1.5">Category Filter</label>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 outline-none shadow-inner">
            <option>All Categories</option>
            <option>Kids</option>
            <option>Male</option>
            <option>Female</option>
          </select>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200 pb-3">
        <button onClick={() => setActiveSubTab('participants')} className={`text-xs font-black pb-1 transition ${activeSubTab === 'participants' ? 'text-amber-600 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-800'}`}>
          🛡️ Participants ({filteredParticipants.length})
        </button>
        <button onClick={() => setActiveSubTab('scores')} className={`text-xs font-black pb-1 transition ${activeSubTab === 'scores' ? 'text-amber-600 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-800'}`}>
          ⚔️ Tournament & Scoring Hub ({activeSport.name})
        </button>
      </div>

      {activeSubTab === 'participants' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredParticipants.map((p) => {
            const rawAge = p.age ?? p.Age ?? p.AGE ?? p.ageGroup ?? p.AgeGroup ?? '';
            let displayAge = '';
            const digits = rawAge.toString().match(/\d+/);
            if (digits) {
              displayAge = `Age: ${digits[0]}`;
            } else {
              displayAge = rawAge ? `Age: ${rawAge}` : 'Age: N/A';
            }

            return (
              <div key={p.id || p.regId || p.Registration_ID} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow transition">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-900 text-sm">{p.name}</h4>
                  <span className="text-[10px] bg-slate-100 text-amber-700 px-2 py-0.5 rounded border border-slate-200 font-semibold">ID: {p.regId || p.Registration_ID}</span>
                </div>
                <p className="text-xs text-amber-700 mt-1 font-medium">{p.flat || p.Flat} • {p.gameChoice || p.sport}</p>
                <div className="mt-3 flex justify-between text-[10px] text-slate-500 border-t border-slate-100 pt-2">
                  <span className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-amber-800 font-black">
                    {displayAge}
                  </span>
                  <span className="text-emerald-600 font-bold">{p.phase || p.Phase}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeSubTab === 'scores' && (
        <div>
          {activeSport.type === 'FOOTBALL_CUSTOM' && (
            <FootballModule participants={filteredParticipants} sportState={currentSportState} onUpdateSportState={updateSportState} />
          )}
          {activeSport.type === 'AUCTION_TEAM' && activeSport.id === 'cricket' && (
            <CricketModule participants={filteredParticipants} sportState={currentSportState} onUpdateSportState={updateSportState} />
          )}
          {activeSport.type === 'TABLE_TENNIS_CUSTOM' && (
            <TableTennisModule participants={filteredParticipants} sportState={currentSportState} onUpdateSportState={updateSportState} />
          )}
          {activeSport.type === 'BADMINTON_CUSTOM' && (
            <BadmintonModule participants={filteredParticipants} sportState={currentSportState} onUpdateSportState={updateSportState} />
          )}
          {activeSport.type === 'ADVANCED_CHESS' && (
            <ChessAdvancedModule participants={filteredParticipants} sportState={currentSportState} onUpdateSportState={updateSportState} />
          )}
          {activeSport.type === 'ROUND_ROBIN' && (
            <ChessCarromModule sportName={activeSport.name} participants={filteredParticipants} sportState={currentSportState} onUpdateSportState={updateSportState} />
          )}
          {activeSport.type === 'AUCTION_TEAM' && activeSport.id !== 'cricket' && activeSport.id !== 'table_tennis' && activeSport.id !== 'badminton' && (
            <TeamAuctionModule sportName={activeSport.name} participants={filteredParticipants} sportState={currentSportState} onUpdateSportState={updateSportState} />
          )}
          {activeSport.type === 'MARATHON' && (
            <MarathonModule sportName={activeSport.name} participants={filteredParticipants} sportState={currentSportState} onUpdateSportState={updateSportState} />
          )}
        </div>
      )}

      {/* Sponsor Configuration Modal */}
      {isAdminMode && isConfiguringSponsors && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">🌟 Sponsor Configuration Hub</h3>
                <p className="text-xs text-slate-500 mt-0.5">Upload images, marquee text, and animation effects.</p>
              </div>
              <button onClick={() => setIsConfiguringSponsors(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition">
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {sponsors.map((sponsor, index) => (
                <div key={sponsor.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-amber-700 uppercase">{sponsor.title}</h4>
                    {sponsor.image && (
                      <button
                        onClick={() => {
                          const updated = [...sponsors];
                          updated[index].image = null;
                          setSponsors(updated);
                        }}
                        className="text-[10px] text-red-600 hover:underline font-bold"
                      >
                        Remove Image
                      </button>
                    )}
                  </div>

                  <div className="w-full h-28 bg-white border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center relative shadow-inner p-2">
                    {sponsor.image ? (
                      <img src={sponsor.image} alt={sponsor.title} className="w-full h-auto max-h-24 object-contain" />
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">No Image Set</span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-600">Browse Image / GIF</label>
                    <input
                      type="file"
                      accept="image/*,.gif"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const updated = [...sponsors];
                            updated[index].image = reader.result;
                            setSponsors(updated);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-amber-500 file:text-white hover:file:bg-amber-600 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-600">Marquee Display Text</label>
                    <input
                      type="text"
                      value={sponsor.text || ''}
                      placeholder="Enter marquee text..."
                      onChange={(e) => {
                        const updated = [...sponsors];
                        updated[index].text = e.target.value;
                        setSponsors(updated);
                      }}
                      className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs text-slate-800 outline-none shadow-inner"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button 
                onClick={() => {
                  saveToCentralServer(participants, sportsData, sponsors);
                  setIsConfiguringSponsors(false);
                }} 
                className="bg-amber-500 hover:bg-amber-600 text-white font-black px-6 py-2.5 rounded-xl text-xs shadow transition"
              >
                Save & Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}