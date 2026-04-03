/**
 * API Client - Drop-in replacement for supabaseClient.js
 * All frontend components import from this file instead of supabaseClient.
 */

const IS_PROD = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');

// Detect if we should use the local MySQL API or the real Supabase
// In production (.pages.dev), we default to Supabase unless a public VITE_API_URL is provided
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const USE_MYSQL = !IS_PROD || (API_BASE && !API_BASE.includes('localhost'));

// Real Supabase fallback for production
import { createClient } from '@supabase/supabase-js';
const realSupabase = (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) 
    ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
    : null;

// ============================================
// Token Management
// ============================================
let _token = localStorage.getItem('bb_auth_token') || null;
let _authListeners = [];

export function setToken(token) {
    _token = token;
    if (token) localStorage.setItem('bb_auth_token', token);
    else localStorage.removeItem('bb_auth_token');
}

export function getToken() {
    return _token;
}

function headers() {
    const h = { 'Content-Type': 'application/json' };
    if (_token) h['Authorization'] = `Bearer ${_token}`;
    return h;
}

// ============================================
// Auth API (replaces supabase.auth)
// ============================================
export const auth = {
    async signInWithPassword({ email, password }) {
        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const json = await res.json();
            if (!res.ok) return { data: {}, error: { message: json.error || 'Login failed' } };
            
            setToken(json.session.access_token);
            _authListeners.forEach(fn => fn('SIGNED_IN', json.session));
            return { data: json, error: null };
        } catch (err) {
            return { data: {}, error: { message: err.message } };
        }
    },

    async getSession() {
        if (!_token) return { data: { session: null }, error: null };
        try {
            const res = await fetch(`${API_BASE}/api/auth/session`, { headers: headers() });
            if (!res.ok) {
                setToken(null);
                return { data: { session: null }, error: null };
            }
            const json = await res.json();
            return { data: { session: json.session }, error: null };
        } catch (err) {
            return { data: { session: null }, error: null };
        }
    },

    async signOut() {
        setToken(null);
        _authListeners.forEach(fn => fn('SIGNED_OUT', null));
        return { error: null };
    },

    onAuthStateChange(callback) {
        _authListeners.push(callback);
        // Check initial state
        if (_token) {
            auth.getSession().then(({ data }) => {
                if (data.session) callback('SIGNED_IN', data.session);
                else callback('SIGNED_OUT', null);
            });
        }
        return { data: { subscription: { unsubscribe: () => {
            _authListeners = _authListeners.filter(fn => fn !== callback);
        }}}};
    }
};

// ============================================
// Database Query Builder (replaces supabase.from())
// ============================================
export function from(table) {
    return new QueryBuilder(table);
}

class QueryBuilder {
    constructor(table) {
        this._table = table;
        this._filters = {};
        this._orderCol = null;
        this._orderAsc = false;
        this._rangeFrom = null;
        this._rangeTo = null;
        this._selectFields = '*';
        this._countMode = false;
        this._single = false;
        this._inFilters = {};
        this._orFilter = null;
        this._likeFilters = {};
        this._limitCount = null;
    }

    select(fields = '*', opts = {}) {
        this._selectFields = fields;
        if (opts?.count === 'exact') this._countMode = true;
        return this;
    }

    eq(col, val) { this._filters[col] = val; return this; }
    
    in(col, vals) { this._inFilters[col] = vals; return this; }
    
    or(conditions) { this._orFilter = conditions; return this; }

    order(col, { ascending = false } = {}) {
        this._orderCol = col;
        this._orderAsc = ascending;
        return this;
    }

    range(from, to) {
        this._rangeFrom = from;
        this._rangeTo = to;
        return this;
    }

    limit(count) {
        this._limitCount = count;
        return this;
    }

    single() { this._single = true; return this; }

    // Execute SELECT or other queued action
    async then(resolve, reject) {
        try {
            let result;
            if (this._action === 'update') result = await this._executeUpdate();
            else if (this._action === 'delete') result = await this._executeDelete();
            else if (this._action === 'upsert' || this._action === 'insert') result = await this._executeInsert();
            else result = await this._executeSelect();
            resolve(result);
        } catch (err) {
            resolve({ data: null, error: err, count: 0 });
        }
    }

    async _executeSelect() {
        const params = new URLSearchParams();
        
        // Map table to API endpoint
        const endpoint = this._getEndpoint();
        
        // Apply filters
        for (const [k, v] of Object.entries(this._filters)) {
            params.set(k, v);
        }
        
        // Map specific query patterns
        if (this._table === 'products') {
            if (this._filters.status) params.set('status', this._filters.status);
            if (this._filters.id) params.set('id', this._filters.id);
            if (this._inFilters.category) params.set('category', this._inFilters.category[0]);
            if (this._inFilters.id) params.set('ids', this._inFilters.id.join(','));
            if (this._orFilter) {
                // Extract search from or filter like "name.ilike.%query%,description.ilike.%query%"
                const match = this._orFilter.match(/name\.ilike\.%(.+?)%/);
                if (match) params.set('search', match[1]);
            }
        }
        
        if (this._table === 'orders') {
            if (this._orFilter) params.set('search', this._extractSearchFromOr());
        }
        
        if (this._table === 'site_settings') {
            if (this._filters.key) params.set('key', this._filters.key);
        }
        
        if (this._table === 'reviews') {
            if (this._filters.product_id) params.set('product_id', this._filters.product_id);
        }
        
        if (this._orderCol) {
            params.set('order_by', this._orderCol);
            params.set('ascending', String(this._orderAsc));
        }
        
        if (this._limitCount !== null) {
            params.set('limit', this._limitCount);
        }
        
        if (this._rangeFrom !== null) {
            const limit = this._rangeTo - this._rangeFrom + 1;
            const page = Math.floor(this._rangeFrom / limit);
            params.set('page', page);
            params.set('limit', limit);
        }
        
        const url = `${API_BASE}${endpoint}?${params.toString()}`;
        const res = await fetch(url, { headers: headers() });
        const json = await res.json();
        
        if (!res.ok) return { data: null, error: { message: json.error }, count: 0 };

        let data = json.data;
        const count = json.count || (Array.isArray(data) ? data.length : (data ? 1 : 0));
        
        if (this._single) {
            data = Array.isArray(data) ? data[0] || null : data;
        }
        
        return { data, error: null, count };
    }

    // Lazy action queueing
    insert(records) { this._action = 'insert'; this._records = records; return this; }
    upsert(records) { this._action = 'upsert'; this._records = records; return this; }
    update(values) { this._action = 'update'; this._values = values; return this; }
    delete() { this._action = 'delete'; return this; }

    // Internal Executors
    async _executeInsert() {
        const endpoint = this._getEndpoint();
        const items = Array.isArray(this._records) ? this._records : [this._records];
        const results = [];
        for (const item of items) {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify(item)
            });
            const json = await res.json();
            if (!res.ok) return { data: null, error: { message: json.error } };
            results.push(json.data);
        }
        return { data: results.length === 1 ? results[0] : results, error: null };
    }

    async _executeUpdate() {
        const id = this._filters.id;
        if (!id) return { data: null, error: { message: 'No ID filter for update' } };
        const endpoint = this._getEndpoint();
        const res = await fetch(`${API_BASE}${endpoint}/${id}`, {
            method: 'PUT',
            headers: headers(),
            body: JSON.stringify(this._values)
        });
        const json = await res.json();
        if (!res.ok) return { data: null, error: { message: json.error } };
        return { data: json.data, error: null };
    }

    async _executeDelete() {
        const id = this._filters.id;
        const key = this._filters.key;
        const status = this._filters.status;
        if (!id && !key && !status) return { data: null, error: { message: 'No filter for delete' } };
        const endpoint = this._getEndpoint();
        let url = `${API_BASE}${endpoint}`;
        if (id) url += `/${id}`;
        else if (key) url += `/${key}`;
        else if (status) url += `?status=${status}`;

        const res = await fetch(url, { method: 'DELETE', headers: headers() });
        const json = await res.json();
        if (!res.ok) return { data: null, error: { message: json.error } };
        return { data: null, error: null };
    }

    _getEndpoint() {
        const map = {
            products: '/api/products',
            orders: '/api/orders',
            reviews: '/api/reviews',
            site_settings: '/api/settings'
        };
        return map[this._table] || `/api/${this._table}`;
    }

    _extractSearchFromOr() {
        if (!this._orFilter) return '';
        // Extract first ilike pattern
        const match = this._orFilter.match(/\.ilike\.%(.+?)%/);
        return match ? match[1] : '';
    }
}

// ============================================
// Storage API (replaces supabase.storage)
// ============================================
export const storage = {
    from(bucket) {
        return {
            async upload(filePath, file) {
                const formData = new FormData();
                formData.append('file', file);
                
                const res = await fetch(`${API_BASE}/api/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${_token}` },
                    body: formData
                });
                const json = await res.json();
                if (!res.ok) return { data: null, error: { message: json.error } };
                return { data: { path: json.data.path, fullPath: json.data.publicUrl }, error: null };
            },
            getPublicUrl(filePath) {
                // If it's already a full URL, return it
                if (filePath.startsWith('http')) return { data: { publicUrl: filePath } };
                return { data: { publicUrl: `${API_BASE}/uploads/${filePath}` } };
            }
        };
    }
};

// ============================================
// Backward-compatible export (matches supabase import pattern)
// ============================================
// On dev environments (localhost), we use our custom MySQL logic.
// On production (pages.dev), we fall back to the real Supabase client
// so the live site continues to work even if the local API is unreachable.
export const supabase = (USE_MYSQL || !realSupabase) 
    ? { auth, from, storage } 
    : realSupabase;

export default supabase;
