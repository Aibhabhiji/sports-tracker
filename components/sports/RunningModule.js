'use client';

import React from 'react';

export default function RunningModule({ teams, sportState, onUpdateSportState }) {
  const heatResults = sportState?.heatResults || {};

  const handleRunnerStatChange = (heatId, runnerId, field, value) => {
    const currentHeat = heatResults[heatId];
    if (!currentHeat || currentHeat.isLocked) return;

    const updatedRunners = currentHeat.runners.map((r) =>
      r.id === runnerId ? { ...r, [field]: value } : r
    );

    const updatedHeats = {
      ...heatResults,
      [heatId]: { ...currentHeat, runners: updatedRunners },
    };

    onUpdateSportState({ heatResults: updatedHeats });
  };

  const handleLockHeat = (heatId) => {
    const currentHeat = heatResults[heatId];
    if (!currentHeat) return;

    const updatedHeats = {
      ...heatResults,
      [heatId]: { ...currentHeat, isLocked: true },
    };

    onUpdateSportState({ heatResults: updatedHeats });
  };

  return (
    <div className="space-y-6">
      {Object.entries(heatResults).map(([heatId, heat]) => (
        <div key={heatId} className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-md">
          <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
            <h3 className="font-extrabold text-amber-400 text-lg">{heat.heatName}</h3>
            {heat.isLocked && (
              <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-700 px-3 py-1 rounded-full font-black">
                🔒 Heat Results Saved
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="p-3">Participant Name</th>
                  <th className="p-3">Flat No.</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {heat.runners.map((runner) => (
                  <tr key={runner.id}>
                    <td className="p-3 font-bold text-slate-100">{runner.name}</td>
                    <td className="p-3 text-slate-400">{runner.flat || 'N/A'}</td>
                    <td className="p-3">
                      <input
                        type="text"
                        placeholder="12.4s"
                        disabled={heat.isLocked}
                        value={runner.time || ''}
                        onChange={(e) => handleRunnerStatChange(heatId, runner.id, 'time', e.target.value)}
                        className="bg-slate-900 p-2 rounded border border-slate-700 font-bold text-amber-400 text-xs w-28"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        placeholder="1st"
                        disabled={heat.isLocked}
                        value={runner.rank || ''}
                        onChange={(e) => handleRunnerStatChange(heatId, runner.id, 'rank', e.target.value)}
                        className="bg-slate-900 p-2 rounded border border-slate-700 font-bold text-emerald-400 text-xs w-24"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!heat.isLocked && (
            <button
              onClick={() => handleLockHeat(heatId)}
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md"
            >
              🔒 Lock Heat Results
            </button>
          )}
        </div>
      ))}
    </div>
  );
}