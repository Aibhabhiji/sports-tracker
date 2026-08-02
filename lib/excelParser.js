import * as XLSX from 'xlsx';

// Determine age group bucket based on numeric age
export function calculateAgeGroup(rawAge) {
  const age = parseFloat(String(rawAge).replace(/[^0-9.]/g, ''));
  if (isNaN(age)) return 'Adults (18+)';
  if (age < 12) return 'Under 12 (U-12)';
  if (age <= 17) return 'Teens (12-17)';
  return 'Adults (18+)';
}

export async function parseCleanCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const parsedData = rawRows.map((row, index) => {
          const ageStr = String(row['Age'] || '').trim();
          return {
            id: index + 1,
            name: String(row['Name'] || '').trim(),
            sport: String(row['Sport'] || '').trim(),
            phase: String(row['Phase'] || 'Phase 1').trim(),
            category: String(row['Category'] || 'General').trim(),
            age: ageStr,
            ageGroup: calculateAgeGroup(ageStr),
            flat: String(row['Flat'] || '').trim(),
            phone: String(row['Phone'] || '').trim(),
          };
        });

        resolve(parsedData);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

export async function fetchDefaultSportsData() {
  try {
    const response = await fetch('/sports_data.csv');
    if (!response.ok) throw new Error('Failed to fetch sports_data.csv');
    const blob = await response.blob();
    return await parseCleanCSV(blob);
  } catch (err) {
    console.error('Error auto-loading CSV:', err);
    return [];
  }
}