import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const isMock = !process.env.SUPABASE_URL ||
  process.env.SUPABASE_URL.includes('YOUR_PROJECT') ||
  process.env.SUPABASE_URL === 'https://placeholder.supabase.co' ||
  !process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_KEY === 'placeholder';

let supabaseClientInstance;

if (!isMock) {
  console.log('🔌 Connecting to real Supabase database...');
  supabaseClientInstance = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
} else {
  console.log('⚠️ Supabase credentials not configured. Using local JSON Database (db.json)');
  
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dbPath = path.resolve(__dirname, '../../db.json');

  const readDb = () => {
    if (!fs.existsSync(dbPath)) {
      const initialDb = {
        users: [],
        attendance: [],
        tasks: [],
        daily_reports: [],
        recruitment_pipeline: [],
        bd_clients: [],
        invoices: [],
        documents: [],
        announcements: []
      };
      fs.writeFileSync(dbPath, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }
    try {
      return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    } catch (err) {
      return {
        users: [],
        attendance: [],
        tasks: [],
        daily_reports: [],
        recruitment_pipeline: [],
        bd_clients: [],
        invoices: [],
        documents: [],
        announcements: []
      };
    }
  };

  const writeDb = (data) => {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  };

  const mapRelationships = (items, selectStr, db) => {
    const dbUsers = db.users || [];
    const dbClients = db.bd_clients || [];

    return items.map(item => {
      const newItem = { ...item };

      if (selectStr.includes('users(') || selectStr.includes('users!')) {
        const user_id = item.user_id || item.created_by || item.marked_by;
        const u = dbUsers.find(x => x.id === user_id);
        if (u) {
          newItem.users = { full_name: u.full_name, role: u.role, company: u.company };
        }
      }

      if (selectStr.includes('assigned_to_user')) {
        const u = dbUsers.find(x => x.id === item.assigned_to);
        newItem.assigned_to_user = u ? { id: u.id, full_name: u.full_name, role: u.role } : null;
      }

      if (selectStr.includes('assigned_by_user')) {
        const u = dbUsers.find(x => x.id === item.assigned_by);
        newItem.assigned_by_user = u ? { id: u.id, full_name: u.full_name, role: u.role } : null;
      }

      if (selectStr.includes('intern:users')) {
        const u = dbUsers.find(x => x.id === item.user_id);
        newItem.intern = u ? {
          id: u.id,
          full_name: u.full_name,
          role: u.role,
          company: u.company,
          batch_start: u.batch_start,
          batch_end: u.batch_end,
          stipend: u.stipend || 'N/A',
          internship_mode: u.internship_mode || 'full_time',
          custom_timing: u.custom_timing || '10:00 AM – 7:00 PM, Mon–Sat',
          travel_allowance: u.travel_allowance || 'N/A',
          custom_position: u.custom_position || ''
        } : null;
      }

      if (selectStr.includes('generated_by_user')) {
        const u = dbUsers.find(x => x.id === item.generated_by);
        newItem.generated_by_user = u ? { full_name: u.full_name } : null;
      }

      if (selectStr.includes('client:bd_clients')) {
        const c = dbClients.find(x => x.id === item.client_id);
        newItem.client = c ? { company_name: c.company_name, contact_person: c.contact_person, email: c.email, phone: c.phone, service_interest: c.service_interest } : null;
      }

      if (selectStr.includes('creator:users')) {
        const creatorId = item.created_by;
        const u = dbUsers.find(x => x.id === creatorId);
        newItem.creator = u ? { full_name: u.full_name } : null;
      }

      if (selectStr.includes('managed_by_user')) {
        const u = dbUsers.find(x => x.id === item.managed_by);
        newItem.managed_by_user = u ? { id: u.id, full_name: u.full_name } : null;
      }

      return newItem;
    });
  };

  class MockQueryBuilder {
    constructor(tableName) {
      this.tableName = tableName;
      this.filters = [];
      this.orderClause = null;
      this.limitCount = null;
      this.selectFields = '*';
      this.countOption = null;
      this.singleOption = false;
      this.action = 'select';
      this.payload = null;
      this.upsertOptions = null;
    }

    select(fields, options) {
      if (this.action === 'select') {
        this.action = 'select';
      }
      this.selectFields = fields || '*';
      this.countOption = options;
      return this;
    }

    eq(column, value) {
      this.filters.push(item => item[column] === value);
      return this;
    }

    neq(column, value) {
      this.filters.push(item => item[column] !== value);
      return this;
    }

    gt(column, value) {
      this.filters.push(item => item[column] > value);
      return this;
    }

    gte(column, value) {
      this.filters.push(item => item[column] >= value);
      return this;
    }

    lt(column, value) {
      this.filters.push(item => item[column] < value);
      return this;
    }

    lte(column, value) {
      this.filters.push(item => item[column] <= value);
      return this;
    }

    in(column, valuesArray) {
      this.filters.push(item => valuesArray.includes(item[column]));
      return this;
    }

    not(column, operator, value) {
      if (operator === 'in') {
        const cleaned = value.replace(/[()"]/g, '');
        const arr = cleaned.split(',').map(s => s.trim());
        this.filters.push(item => !arr.includes(item[column]));
      } else {
        this.filters.push(item => item[column] !== value);
      }
      return this;
    }

    or(orExpression) {
      const terms = orExpression.split(',');
      const parsedTerms = terms.map(term => {
        const parts = term.split('.');
        const col = parts[0];
        const op = parts[1];
        const val = parts[2];
        return { col, op, val };
      });

      this.filters.push(item => {
        return parsedTerms.some(term => {
          const itemVal = item[term.col];
          if (term.op === 'is' && term.val === 'null') {
            return itemVal === null || itemVal === undefined;
          }
          if (term.op === 'eq') {
            return String(itemVal) === String(term.val);
          }
          return false;
        });
      });
      return this;
    }

    order(column, options) {
      this.orderClause = { column, ascending: options?.ascending !== false };
      return this;
    }

    limit(count) {
      this.limitCount = count;
      return this;
    }

    single() {
      this.singleOption = true;
      return this;
    }

    insert(payload) {
      this.action = 'insert';
      this.payload = payload;
      return this;
    }

    update(payload) {
      this.action = 'update';
      this.payload = payload;
      return this;
    }

    upsert(payload, options) {
      this.action = 'upsert';
      this.payload = payload;
      this.upsertOptions = options;
      return this;
    }

    delete() {
      this.action = 'delete';
      return this;
    }

    async then(onFulfilled, onRejected) {
      try {
        const db = readDb();
        if (!db[this.tableName]) {
          db[this.tableName] = [];
        }
        let tableData = db[this.tableName];

        let data = null;
        let error = null;
        let count = undefined;

        const selectStr = typeof this.selectFields === 'string' ? this.selectFields : '*';

        if (this.action === 'select') {
          let filtered = tableData.filter(item => {
            return this.filters.every(filterFn => filterFn(item));
          });

          if (this.countOption && this.countOption.count === 'exact') {
            count = filtered.length;
          }

          if (this.orderClause) {
            const { column, ascending } = this.orderClause;
            filtered.sort((a, b) => {
              let valA = a[column];
              let valB = b[column];
              if (valA === undefined || valA === null) return ascending ? -1 : 1;
              if (valB === undefined || valB === null) return ascending ? 1 : -1;
              if (typeof valA === 'string') {
                return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
              }
              return ascending ? valA - valB : valB - valA;
            });
          }

          if (this.limitCount !== null) {
            filtered = filtered.slice(0, this.limitCount);
          }

          const mapped = mapRelationships(filtered, selectStr, db);

          if (this.singleOption) {
            if (mapped.length === 0) {
              data = null;
              error = { message: 'Row not found' };
            } else {
              data = mapped[0];
            }
          } else {
            data = mapped;
          }

        } else if (this.action === 'insert') {
          const payloads = Array.isArray(this.payload) ? this.payload : [this.payload];
          const newRecords = [];

          for (const p of payloads) {
            const rec = {
              id: p.id || uuidv4(),
              created_at: p.created_at || new Date().toISOString(),
              updated_at: p.updated_at || new Date().toISOString(),
              ...p
            };
            newRecords.push(rec);
            tableData.push(rec);
          }

          writeDb(db);

          const mappedRecords = mapRelationships(newRecords, selectStr, db);

          if (this.singleOption || !Array.isArray(this.payload)) {
            data = mappedRecords[0];
          } else {
            data = mappedRecords;
          }

        } else if (this.action === 'update') {
          let updatedCount = 0;
          const updatedRecords = [];

          tableData.forEach((item, idx) => {
            const matches = this.filters.every(filterFn => filterFn(item));
            if (matches) {
              const updatedItem = {
                ...item,
                ...this.payload,
                updated_at: new Date().toISOString()
              };
              tableData[idx] = updatedItem;
              updatedRecords.push(updatedItem);
              updatedCount++;
            }
          });

          if (updatedCount > 0) {
            writeDb(db);
          }

          const mappedRecords = mapRelationships(updatedRecords, selectStr, db);

          if (this.singleOption) {
            data = mappedRecords[0] || null;
          } else {
            data = mappedRecords;
          }

        } else if (this.action === 'upsert') {
          const payloads = Array.isArray(this.payload) ? this.payload : [this.payload];
          const onConflictCol = this.upsertOptions?.onConflict || 'id';
          const upsertedRecords = [];

          for (const p of payloads) {
            const conflictVal = p[onConflictCol];
            const idx = tableData.findIndex(item => item[onConflictCol] === conflictVal);

            if (idx !== -1) {
              const updatedItem = {
                ...tableData[idx],
                ...p,
                updated_at: new Date().toISOString()
              };
              tableData[idx] = updatedItem;
              upsertedRecords.push(updatedItem);
            } else {
              const newItem = {
                id: p.id || uuidv4(),
                created_at: p.created_at || new Date().toISOString(),
                updated_at: p.updated_at || new Date().toISOString(),
                ...p
              };
              tableData.push(newItem);
              upsertedRecords.push(newItem);
            }
          }

          writeDb(db);

          const mappedRecords = mapRelationships(upsertedRecords, selectStr, db);

          if (this.singleOption || !Array.isArray(this.payload)) {
            data = mappedRecords[0];
          } else {
            data = mappedRecords;
          }

        } else if (this.action === 'delete') {
          const remaining = tableData.filter(item => {
            return !this.filters.every(filterFn => filterFn(item));
          });

          db[this.tableName] = remaining;
          writeDb(db);
          data = null;
        }

        return onFulfilled({ data, error, count });
      } catch (err) {
        console.error('Mock DB error:', err);
        return onFulfilled({ data: null, error: { message: err.message } });
      }
    }
  }

  supabaseClientInstance = {
    from: (tableName) => new MockQueryBuilder(tableName)
  };
}

export const supabase = supabaseClientInstance;
export default supabase;
