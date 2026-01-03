/**
 * System Info Service
 * Načítá informace o prostředí z API
 */

const SYSTEM_INFO_KEY = 'eeo_system_info';
const SYSTEM_INFO_EXPIRY = 'eeo_system_info_expiry';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hodina

class SystemInfoService {
    
    /**
     * Načte systémové informace z API nebo cache
     */
    static async getSystemInfo() {
        try {
            // Zkus načíst z cache
            const cached = this.getCachedInfo();
            if (cached) {
                return cached;
            }

            // Načti z API
            const info = await this.fetchFromAPI();
            this.setCachedInfo(info);
            return info;
            
        } catch (error) {
            console.warn('Failed to load system info:', error);
            // Fallback na základní info
            return this.getDefaultInfo();
        }
    }

    /**
     * Načte informace z API
     */
    static async fetchFromAPI() {
        const apiBase = process.env.REACT_APP_API2_BASE_URL || '/dev/api.eeo/';
        
        // Získání autentizačních údajů (pokud jsou k dispozici)
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');
        
        // Pokud nejsou credentials, vrátíme fallback
        if (!token || !username) {
            return this.getDefaultInfo();
        }
        
        try {
            const response = await fetch(`${apiBase}endpoints/system-info.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token,
                    username
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.status !== 'success') {
                throw new Error(result.message || 'API error');
            }
            
            return result.data;
        } catch (error) {
            console.warn('Failed to fetch from API, using fallback:', error);
            return this.getDefaultInfo();
        }
    }

    /**
     * Získá cached informace
     */
    static getCachedInfo() {
        try {
            const expiry = localStorage.getItem(SYSTEM_INFO_EXPIRY);
            const now = Date.now();
            
            if (expiry && now < parseInt(expiry)) {
                const cached = localStorage.getItem(SYSTEM_INFO_KEY);
                if (cached) {
                    return JSON.parse(cached);
                }
            }
        } catch (error) {
            console.warn('Failed to load cached system info:', error);
        }
        return null;
    }

    /**
     * Uloží informace do cache
     */
    static setCachedInfo(info) {
        try {
            const expiry = Date.now() + CACHE_DURATION;
            localStorage.setItem(SYSTEM_INFO_KEY, JSON.stringify(info));
            localStorage.setItem(SYSTEM_INFO_EXPIRY, expiry.toString());
        } catch (error) {
            console.warn('Failed to cache system info:', error);
        }
    }

    /**
     * Vymaže cache (refresh)
     */
    static clearCache() {
        localStorage.removeItem(SYSTEM_INFO_KEY);
        localStorage.removeItem(SYSTEM_INFO_EXPIRY);
    }

    /**
     * Fallback informace
     */
    static getDefaultInfo() {
        const apiBase = process.env.REACT_APP_API2_BASE_URL || '/dev/api.eeo/';
        const isDev = apiBase.includes('/dev/');
        const dbName = isDev ? 'eeo2025-dev' : 'eeo2025';
        
        return {
            database: {
                name: dbName,
                display_name: dbName.toUpperCase()
            },
            environment: {
                is_dev: isDev,
                type: isDev ? 'development' : 'production'
            },
            api: {
                version: '1.95',
                host: window.location.hostname
            }
        };
    }
}

export default SystemInfoService;