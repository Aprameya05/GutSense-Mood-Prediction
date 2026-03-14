import * as SQLite from 'expo-sqlite';
import { DailyLog, MealEntry } from '../types/models';

let db: SQLite.SQLiteDatabase | null = null;

export const initDb = async () => {
  try {
    db = await SQLite.openDatabaseAsync('gutsense.db');
    
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS daily_logs (
        date TEXT PRIMARY KEY,
        log_data TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS meals (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        meal_id TEXT,
        food_items TEXT,
        calories INTEGER,
        mood_score REAL,
        gut_score REAL
      );
    `);
    console.log('[SQLite] Initialized database and tables');
  } catch (err) {
    console.error('[SQLite] Failed to init DB', err);
  }
};

export const saveDailyLogToSqlite = async (log: DailyLog) => {
  if (!db) return;
  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO daily_logs (date, log_data) VALUES (?, ?)`,
      [log.date, JSON.stringify(log)]
    );

    // Save derived meals for querying
    for (const meal of log.meals) {
      await db.runAsync(
        `INSERT OR REPLACE INTO meals (id, date, meal_id, food_items, calories, mood_score, gut_score) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          `${log.date}_${meal.meal_id}`,
          log.date,
          meal.meal_id,
          JSON.stringify(meal?.stage1?.food_items || []),
          meal?.stage2?.totals?.calories_kcal || 0,
          meal?.stage4?.mood_score || 0,
          log?.daily_gut?.microbiome_diversity_index || 0 // roughly using daily MDI as gut_score approx
        ]
      );
    }
  } catch (err) {
    console.error('[SQLite] Failed to save log', err);
  }
};

export const getDailyLogFromSqlite = async (date: string): Promise<DailyLog | null> => {
  if (!db) return null;
  const row = await db.getFirstAsync<{ log_data: string }>(`SELECT log_data FROM daily_logs WHERE date = ?`, [date]);
  return row ? JSON.parse(row.log_data) : null;
};
