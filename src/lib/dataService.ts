import { Operator, Device } from './types';

const CARRIERS_URL = 'https://raw.githubusercontent.com/pbakondy/mcc-mnc-list/master/mcc-mnc-list.json';
const DEVICES_URL = 'https://raw.githubusercontent.com/ilyasozkurt/mobilephone-brands-and-models/master/devices.json';

export class DataService {
    private static operators: Operator[] = [];
    private static devices: Device[] = [];
    private static tacDatabase: Record<string, string> | null = null;

    static async fetchTacDatabase(): Promise<Record<string, string>> {
        if (this.tacDatabase) return this.tacDatabase;
        try {
            const res = await fetch('/tac_lite.json');
            if (res.ok) {
                this.tacDatabase = await res.json();
                return this.tacDatabase || {};
            }
        } catch (e) {
            console.warn('TAC database not available');
        }
        return {};
    }

    static async fetchOperators(): Promise<Operator[]> {
        if (this.operators.length > 0) return this.operators;
        try {
            const response = await fetch(CARRIERS_URL);
            this.operators = await response.json();
            return this.operators;
        } catch (error) {
            console.error('Error fetching operators:', error);
            return [];
        }
    }

    static async fetchLocalDevices(): Promise<Device[]> {
        if (this.devices.length > 0) return this.devices;

        try {
            const localRes = await fetch('/devices.json');
            if (localRes.ok) {
                const data = await localRes.json();
                const local = (data.RECORDS || []).map((d: Device) => ({
                    ...d,
                    normalizedName: d.name.toLowerCase().replace(/\s+/g, '')
                }));
                if (this.devices.length === 0) this.devices = local;
                return local;
            }
        } catch {
            console.warn('Local curated list not available');
        }
        return [];
    }

    static async fetchDevices(): Promise<Device[]> {
        const localDevices = await this.fetchLocalDevices();

        try {
            const response = await fetch(DEVICES_URL);
            const data = await response.json();
            const externalDevices = (data.RECORDS || []).map((d: Device) => ({
                ...d,
                normalizedName: d.name.toLowerCase().replace(/\s+/g, '')
            }));

            // Merge with local devices, preferring local ones if names match
            const merged = [...localDevices];
            const deviceNames = new Set(merged.map(d => d.name.toLowerCase()));

            externalDevices.forEach((d: Device) => {
                if (!deviceNames.has(d.name.toLowerCase())) {
                    merged.push(d);
                }
            });

            this.devices = merged;
            return this.devices;
        } catch (error) {
            console.error('Error fetching global device database:', error);
            this.devices = localDevices;
            return this.devices;
        }
    }

    static getCountries(operators: Operator[]): string[] {
        const countries = Array.from(new Set(operators.map(o => o.countryName))).sort();
        return countries;
    }

    static getOperatorsByCountry(operators: Operator[], country: string): Operator[] {
        const countryOps = operators.filter(o => o.countryName === country && o.status === 'Operational');

        // Map for deduplication (Key: unique identifier)
        const uniqueOps = new Map<string, Operator>();

        countryOps.forEach(op => {
            let brand = op.brand || '';
            let name = op.operator || '';

            // Patch for Canada known operators
            if (op.countryName === 'Canada') {
                const b = brand.toLowerCase();
                const n = name.toLowerCase();
                if (b.includes('videotron') || n.includes('videotron') || b.includes('vidéotron') || n.includes('vidéotron')) {
                    brand = '';
                    name = 'Videotron';
                } else if (b.includes('freedom') || n.includes('freedom')) {
                    brand = '';
                    name = 'Freedom Mobile';
                } else if (b.includes('rogers') || n.includes('rogers')) {
                    brand = '';
                    name = 'Rogers';
                } else if (b.includes('bell') || n.includes('bell')) {
                    brand = '';
                    name = 'Bell';
                } else if (b.includes('telus') || n.includes('telus')) {
                    brand = '';
                    name = 'Telus';
                }
            }

            // Formatting cleaner display names and using uniqueId to prevent jumping
            // We use a broader merge key: brand + name + bands to remove true duplicates
            const mergeKey = `${brand}-${name}-${op.bands}`.toLowerCase().replace(/\s+/g, '');
            const uid = `${op.mcc}-${op.mnc}-${brand}-${name}`.toLowerCase().replace(/\s+/g, '');

            if (uniqueOps.has(mergeKey)) {
                // If we have an exact match for name + bands, we don't need another entry
                // Just keep the first one we find
            } else {
                uniqueOps.set(mergeKey, { ...op, uniqueId: uid, brand, operator: name });
            }
        });

        // Add virtual/missing carriers for Canada
        if (country === 'Canada') {
            const rogers = Array.from(uniqueOps.values()).find(o => o.operator === 'Rogers');
            const bell = Array.from(uniqueOps.values()).find(o => o.operator === 'Bell');
            const telus = Array.from(uniqueOps.values()).find(o => o.operator === 'Telus');

            if (rogers && !uniqueOps.has('fido')) {
                uniqueOps.set('fido', { ...rogers, uniqueId: 'fido', operator: 'Fido', brand: 'Fido' });
            }
            if (telus && !uniqueOps.has('koodo')) {
                uniqueOps.set('koodo', { ...telus, uniqueId: 'koodo', operator: 'Koodo', brand: 'Koodo' });
            }
            if (telus && !uniqueOps.has('public-mobile')) {
                uniqueOps.set('public-mobile', { ...telus, uniqueId: 'public-mobile', operator: 'Public Mobile', brand: 'Public Mobile' });
            }
            if (bell && !uniqueOps.has('virgin-plus')) {
                uniqueOps.set('virgin-plus', { ...bell, uniqueId: 'virgin-plus', operator: 'Virgin Plus', brand: 'Virgin Plus' });
            }
        }

        // Convert back to sorted array
        return Array.from(uniqueOps.values()).sort((a, b) => {
            const nameA = (a.brand || a.operator).toLowerCase();
            const nameB = (b.brand || b.operator).toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }

    static getBrands(devices: Device[]): string[] {
        // Note: brand_id mapping is needed if we use brand names. 
        // For now, let's just extract all unique names and group them if possible.
        // The dataset has names like "Nokia 3210".
        const brands = Array.from(new Set(devices.map(d => d.name.split(' ')[0]))).sort();
        return brands;
    }

    static parseBands(bandString: string): string[] {
        if (!bandString) return [];
        return bandString.split(/[\/,;]+/).map(b => b.trim()).filter(b => b && b !== 'Unknown');
    }

    // Common band mappings for matching different naming conventions
    private static bandMap: Record<string, string[]> = {
        'GSM 850': ['Band 5', 'B5', '850 MHz'],
        'GSM 900': ['Band 8', 'B8', '900 MHz'],
        'GSM 1800': ['Band 3', 'B3', '1800 MHz'],
        'GSM 1900': ['Band 2', 'B2', '1900 MHz'],
        'UMTS 2100': ['Band 1', 'B1', '2100 MHz'],
        'UMTS 1900': ['Band 2', 'B2', '1900 MHz'],
        'UMTS 850': ['Band 5', 'B5', '850 MHz'],
        'UMTS 900': ['Band 8', 'B8', '900 MHz'],
        'LTE 2100': ['Band 1', 'B1', '2100'],
        'LTE 1900': ['Band 2', 'B2', '1900'],
        'LTE 1800': ['Band 3', 'B3', '1800'],
        'LTE 1700': ['Band 4', 'B4', '1700'],
        'LTE 850': ['Band 5', 'B5', '850'],
        'LTE 2600': ['Band 7', 'B7', '2600'],
        'LTE 900': ['Band 8', 'B8', '900'],
        'LTE 800': ['Band 20', 'B20', '800'],
        'LTE 700': ['Band 12', 'Band 13', 'Band 17', 'Band 28', 'B12', 'B13', 'B17', 'B28', '700'],
        'LTE 2300': ['Band 40', 'B40', '2300'],
        '5G 3500': ['n78', '3500'],
        '5G 700': ['n28', '700'],
        '5G 2100': ['n1', '2100'],
    };

    static checkCompatibility(deviceBands: string[], operatorBands: string[]) {
        const supported: string[] = [];
        const missing: string[] = [];

        operatorBands.forEach(opBand => {
            const opBandNormalized = opBand.trim();
            const equivalents = this.bandMap[opBandNormalized] || [];

            const isMatch = deviceBands.some(devBand => {
                const db = devBand.toLowerCase();
                const ob = opBand.toLowerCase();

                // Direct match
                if (db.includes(ob) || ob.includes(db)) return true;

                // Map match
                return equivalents.some(eq => db.includes(eq.toLowerCase()));
            });

            if (isMatch) {
                supported.push(opBand);
            } else {
                missing.push(opBand);
            }
        });

        return { supported, missing };
    }
}
