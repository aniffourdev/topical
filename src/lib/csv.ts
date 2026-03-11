import Papa from 'papaparse';

const KEY_COLS = ['Keyword', 'keyword', 'Keywords', 'Search term', 'Search Term'];
const VOL_COLS = ['Avg. monthly searches', 'Monthly searches', 'Search Volume', 'Avg monthly searches', 'Average monthly searches'];

export interface ParsedKeyword { keyword: string; searchVolume: number; }

export function parseKeywordCsv(file: File): Promise<ParsedKeyword[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data as Record<string, string>[];
        const cols = Object.keys(rows[0] || {});
        const keywordColumn = cols.find((c) => KEY_COLS.includes(c));
        const volumeColumn = cols.find((c) => VOL_COLS.includes(c));
        if (!keywordColumn || !volumeColumn) {
          reject(new Error(`Expected columns: ${KEY_COLS.join(', ')} and ${VOL_COLS.join(', ')}`));
          return;
        }
        const parsed = rows
          .map((row) => {
            const keyword = (row[keywordColumn] || '').trim();
            if (!keyword) return null;
            const raw = row[volumeColumn] || '0';
            const normalized = raw.includes('-') ? raw.split('-')[0] : raw;
            const searchVolume = Number((normalized || '0').replace(/[^0-9]/g, '')) || 0;
            return { keyword, searchVolume };
          })
          .filter((v): v is ParsedKeyword => !!v);
        resolve(parsed);
      },
      error: reject,
    });
  });
}

export const batches = <T,>(items: T[], size = 200): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};
