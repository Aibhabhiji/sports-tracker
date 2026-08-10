'use client';

import React, { useState, useEffect } from 'react';
import { getInitialParticipants, parseCSVParticipants } from '@/lib/participantStore';
import TeamAuctionModule from '@/components/sports/TeamAuctionModule';
import CarromAdvancedModule from '@/components/sports/CarromAdvancedModule';
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
  { id: 'carrom', name: 'Carrom', type: 'ADVANCED_CARROM' },
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

  // 10 Placeholders for Official Event Sponsors & Partners
  const [sponsors, setSponsors] = useState([
    { id: '1', title: 'Sponsor 1', image: null, text: '', effect: 'none' },
    { id: '2', title: 'Sponsor 2', image: null, text: '', effect: 'none' },
    { id: '3', title: 'Sponsor 3', image: null, text: '', effect: 'none' },
    { id: '4', title: 'Sponsor 4', image: null, text: '', effect: 'none' },
    { id: '5', title: 'Sponsor 5', image: null, text: '', effect: 'none' },
    { id: '6', title: 'Sponsor 6', image: null, text: '', effect: 'none' },
    { id: '7', title: 'Sponsor 7', image: null, text: '', effect: 'none' },
    { id: '8', title: 'Sponsor 8', image: null, text: '', effect: 'none' },
    { id: '9', title: 'Sponsor 9', image: null, text: '', effect: 'none' },
    { id: '10', title: 'Sponsor 10', image: null, text: '', effect: 'none' },
  ]);

  // Fetch central database data on load
  useEffect(() => {
    async function fetchCentralData() {
      try {
        const res = await fetch('/api/portal-data');
        if (res.ok) {
          const json = await res.json();
          if (json.participants && json.participants.length > 0) {
            setParticipants(json.participants);
          } else {
            setParticipants(getInitialParticipants());
          }
          if (json.sportsData) setSportsData(json.sportsData);
          if (json.sponsors && json.sponsors.length > 0) setSponsors(json.sponsors);
        }
      } catch (e) {
        console.error('Failed to load central data, falling back to defaults', e);
        setParticipants(getInitialParticipants());
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

  const saveToCentralServer = async (updatedParticipants, updatedSportsData, updatedSponsors) => {
    verifyAdminAndExecute(async () => {
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
          throw new Error('Failed to save to server database.');
        }
      } catch (e) {
        console.error('Server sync error:', e);
        alert('⚠️ Error syncing with the central database server.');
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

  // Dynamic Filtering & Automatic Participant Deduplication Logic
  const seenKeys = new Set();
  const filteredParticipants = participants.filter((p) => {
    const pName = (p.name || p.Name || '').toString().trim().toLowerCase();
    const pFlat = (p.flat || p.Flat || '').toString().trim().toLowerCase();
    const pSport = (p.gameChoice || p.sport || p.Sport || '').toString().trim().toLowerCase();
    const pId = (p.id || p.regId || p.Registration_ID || '').toString().trim();

    const compositeKey = (pName && pFlat) ? `${pName}_${pFlat}_${pSport}` : null;

    if ((pId && seenKeys.has(`id:${pId}`)) || (compositeKey && seenKeys.has(`comp:${compositeKey}`))) {
      return false;
    }

    const matchGame = !filterByGameChoice || pSport === activeSport.name.trim().toLowerCase();

    const rawPhase = (p.phase || p.Phase || p['Phase'] || p['phase'] || '').toString().trim();
    const matchPhase = (() => {
      if (selectedPhase === 'All Phases') return true;
      if (!rawPhase) return false;
      const normRaw = rawPhase.toLowerCase();
      const normSel = selectedPhase.toLowerCase();
      if (normRaw === normSel) return true;
      const selNum = normSel.replace(/\D+/g, '');
      const rawNum = normRaw.replace(/\D+/g, '');
      if (selNum && rawNum && selNum === rawNum) return true;
      return normRaw.includes(normSel) || normSel.includes(normRaw);
    })();

    const rawCat = (p.category || p.Category || '').toString().trim().toLowerCase();
    const matchCat = selectedCategory === 'All Categories' || rawCat === selectedCategory.toLowerCase();

    const rawAgeVal = p.age ?? p.Age ?? p.ageGroup ?? p.AgeGroup ?? p['Age Group'] ?? p['Age'] ?? '';
    const rawAgeStr = rawAgeVal.toString().trim().toLowerCase();

    const matchAge = (() => {
      if (selectedAgeGroup === 'All Age Groups') return true;
      if (!rawAgeStr) return false;

      if (rawAgeStr === selectedAgeGroup.trim().toLowerCase()) return true;

      const ageNumMatch = rawAgeStr.match(/\d+/);
      if (ageNumMatch) {
        const num = parseInt(ageNumMatch[0], 10);
        if (selectedAgeGroup === 'Under 12 Kids') return num < 12;
        if (selectedAgeGroup === '12 - 17 years Teens') return num >= 12 && num <= 17;
        if (selectedAgeGroup === '18 - 55 years Adults') return num >= 18 && num <= 55;
        if (selectedAgeGroup === '55+ years Seniors') return num >= 55;
      }

      if (selectedAgeGroup === 'Under 12 Kids') return rawAgeStr.includes('kids') || rawAgeStr.includes('under 12');
      if (selectedAgeGroup === '12 - 17 years Teens') return rawAgeStr.includes('teen');
      if (selectedAgeGroup === '18 - 55 years Adults') return rawAgeStr.includes('adult');
      if (selectedAgeGroup === '55+ years Seniors') return rawAgeStr.includes('senior');

      return false;
    })();

    const matchesAll = matchGame && matchPhase && matchCat && matchAge;
    if (matchesAll) {
      if (pId) seenKeys.add(`id:${pId}`);
      if (compositeKey) seenKeys.add(`comp:${compositeKey}`);
    }
    return matchesAll;
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
        alert('All transactional game data has been reset centrally.');
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

        <div className="flex items-center gap-3 md:ml-auto">
          <span className="text-[10px] font-bold text-slate-400">Connect:</span>
          <div className="flex items-center gap-2">
            <a href="https://www.facebook.com/share/1GUem7jeuc/" target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-full bg-slate-800 hover:bg-amber-600 text-white flex items-center justify-center transition shadow-sm" title="Facebook">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="https://www.instagram.com/sanviolympics/?hl=en" target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-full bg-slate-800 hover:bg-amber-600 text-white flex items-center justify-center transition shadow-sm" title="Instagram">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            <a href="https://x.com/SanviOlympics" target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-full bg-slate-800 hover:bg-amber-600 text-white flex items-center justify-center transition shadow-sm" title="X">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-full bg-slate-800 hover:bg-amber-600 text-white flex items-center justify-center transition shadow-sm" title="YouTube">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
          </div>
        </div>
      </header>

      {isAdminMode && (
        <AdminModule 
          currentUser={{ email: 'admin@example.com' }} 
          onAdminStateChange={(state) => setAdminModuleState(state)} 
        />
      )}

      {/* Official Event Sponsors Banner — 10 Placeholders in 3 Rows x 4 Columns Square Grid */}
      <div className="bg-gradient-to-r from-white via-slate-50 to-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-1 gap-3">
          <span className="text-[10px] font-black tracking-widest text-amber-600 uppercase">🌟 OFFICIAL EVENT SPONSORS & PARTNERS</span>
          {isAdminMode && (
            <button onClick={() => setIsConfiguringSponsors(true)} className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1">
              Configure Sponsors →
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sponsors.map((sponsor) => (
            <div key={sponsor.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between relative shadow-sm p-3 hover:shadow-md transition">
              <div className="w-full aspect-square flex items-center justify-center overflow-hidden my-auto bg-slate-50 rounded-lg border border-slate-100 p-2">
                {sponsor.image ? (
                  <img src={sponsor.image} alt={sponsor.title} className="w-full h-full object-contain rounded-md" />
                ) : (
                  <span className="text-xs text-slate-400 font-bold">{sponsor.title}</span>
                )}
              </div>
              {sponsor.text && (
                <div className="w-full overflow-hidden whitespace-nowrap bg-slate-50 rounded px-2 py-0.5 border border-slate-100 mt-2">
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

            const pid = p.id || p.regId || p.Registration_ID;
            const playerSchedule = (pid && sportsData?.chess?.playerSchedules?.[pid]) || (pid && currentSportState?.playerSchedules?.[pid]);

            return (
              <div key={pid} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow transition">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-900 text-sm">{p.name}</h4>
                  <span className="text-[10px] bg-slate-100 text-amber-700 px-2 py-0.5 rounded border border-slate-200 font-semibold">ID: {p.regId || p.Registration_ID}</span>
                </div>
                <p className="text-xs text-amber-700 mt-1 font-medium">{p.flat || p.Flat} • {p.gameChoice || p.sport}</p>
                
                {playerSchedule && (
                  <div className="mt-2.5 bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                    <span>📅</span>
                    <span>{playerSchedule.text || playerSchedule.scheduledText}</span>
                  </div>
                )}

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
          {activeSport.type === 'ADVANCED_CARROM' && (
            <CarromAdvancedModule participants={filteredParticipants} sportState={currentSportState} onUpdateSportState={updateSportState} />
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
          <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">🌟 Sponsor Configuration Hub</h3>
                <p className="text-xs text-slate-500 mt-0.5">Upload square images, marquee text, and animation effects for all 10 placeholders.</p>
              </div>
              <button onClick={() => setIsConfiguringSponsors(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition">
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {sponsors.map((sponsor, index) => (
                <div key={sponsor.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3 shadow-sm">
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
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="w-full aspect-square bg-white border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center relative shadow-inner p-1">
                    {sponsor.image ? (
                      <img src={sponsor.image} alt={sponsor.title} className="w-full h-full object-contain rounded" />
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">No Image Set</span>
                    )}
                  </div>

                  <div className="space-y-1">
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
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-amber-500 file:text-white hover:file:bg-amber-600 cursor-pointer"
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