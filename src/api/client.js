/**
 * API Client — all data goes through the Cloudflare Pages Function / TiDB backend.
 * Supabase has been fully removed. This file is the single source of truth for
 * auth, database queries, and storage — imported everywhere via supabaseClient.js.
 */

const IS_NODE = typeof process !== 'undefined' && process.env && !process.env.VITE;
const IS_PROD = !IS_NODE && import.meta.env.PROD;

// Production: empty string = same-origin Cloudflare Pages Function (/api/...)
// Local dev:  VITE_API_URL=http://localhost:3001 (set in .env.local)
const devBase = (typeof window !== 'undefined' ? `http://${window.location.hostname}:3001` : 'http://localhost:3001');
export const API_URL = IS_PROD 
    ? '' 
    : (typeof process !== 'undefined' && process.env.VITE_API_URL ? process.env.VITE_API_URL : (typeof import.meta.env !== 'undefined' && import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : devBase)).replace(/\/$/, '');
const API_BASE = API_URL;

// ============================================
// Token Management
// ============================================
let _token = (typeof localStorage !== 'undefined' ? localStorage.getItem('bb_auth_token') : null) || null;
let _authListeners = [];

export function setToken(token) {
    _token = token;
    if (typeof localStorage !== 'undefined') {
        if (token) localStorage.setItem('bb_auth_token', token);
        else localStorage.removeItem('bb_auth_token');
    }
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
// Auth API (replaces bigBazarApi.auth)
// ============================================
export const auth = {
    async signUp({ name, email, mobile, password }) {
        try {
            const res = await fetch(`${API_BASE}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, mobile, password })
            });
            const json = await res.json();
            if (!res.ok) return { data: {}, error: { message: json.error || 'Signup failed' } };
            
            setToken(json.session.access_token);
            _authListeners.forEach(fn => fn('SIGNED_IN', json.session));
            return { data: json, error: null };
        } catch (err) {
            return { data: {}, error: { message: err.message } };
        }
    },

    async signInWithPassword({ email, mobile, password }) {
        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, mobile, password })
            });
            const json = await res.json();
            if (!res.ok) return { data: {}, error: { message: json.error || 'Login failed' } };
            if (json.step === 2) return { data: json, error: null }; // Admin 2FA — caller handles step 2

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
// Database Query Builder (replaces bigBazarApi.from())
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
    async then(resolve, _reject) {
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
// Storage API (replaces bigBazarApi.storage)
// ============================================
export const storage = {
    from(_bucket) {
        return {
            async upload(_filePath, file) {
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
// Single export — all traffic goes through the Cloudflare / TiDB backend
// ============================================
export const bigBazarApi = { auth, from, storage };

export default bigBazarApi;
