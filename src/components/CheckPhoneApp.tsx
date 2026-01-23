"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { DataService } from '@/lib/dataService';
import { ImeiService } from '@/lib/imeiService';
import { Operator, Device, DeviceSpecification } from '@/lib/types';
import { Search, Smartphone, Globe, Radio, CheckCircle2, XCircle, Info, Activity, RotateCcw, Book, HelpCircle, Hash, Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CheckPhoneApp() {
    const [operators, setOperators] = useState<Operator[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAbout, setShowAbout] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    const [selectedCountry, setSelectedCountry] = useState('');
    const [countrySearch, setCountrySearch] = useState('');
    const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
    const [deviceSearch, setDeviceSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [filterType, setFilterType] = useState<'all' | 'esim_only' | 'esim' | 'satellite'>('all'); // Filter state

    const [selectedBrand, setSelectedBrand] = useState('');
    const [isCountrySearchFocused, setIsCountrySearchFocused] = useState(false);

    const [selectionMethod, setSelectionMethod] = useState<'manual' | 'imei'>('manual');
    const [imeiInput, setImeiInput] = useState('');
    const [imeiError, setImeiError] = useState('');
    const [tacDatabase, setTacDatabase] = useState<Record<string, string>>({});

    // Debounce search input to prevent lag during typing
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(deviceSearch);
        }, 300);
        return () => clearTimeout(timer);
    }, [deviceSearch]);

    const handleReset = () => {
        setSelectedCountry('');
        setCountrySearch('');
        setSelectedOperator(null);
        setDeviceSearch('');
        setDebouncedSearch('');
        setSelectedDevice(null);
        setFilterType('all');
        setSelectedBrand('');
        setImeiInput('');
        setImeiError('');
    };

    useEffect(() => {
        async function init() {
            try {
                // Parallel fetch of operators and local (curated) devices
                // This is much faster than waiting for the 2MB external database
                const [ops, localDevs, tacDb] = await Promise.all([
                    DataService.fetchOperators(),
                    DataService.fetchLocalDevices(),
                    DataService.fetchTacDatabase()
                ]);
                setOperators(ops);
                setDevices(localDevs);
                setTacDatabase(tacDb);

                // Set loading to false as soon as core data & curated devices are ready
                setLoading(false);

                // Fetch full external database in the background
                DataService.fetchDevices().then(allDevs => {
                    setDevices(allDevs);
                });

                // Refresh TAC DB just in case
                DataService.fetchTacDatabase().then(db => setTacDatabase(db));
            } catch (error) {
                console.error("Init error:", error);
                setLoading(false);
            }
        }
        init();
    }, []);

    useEffect(() => {
        if (selectionMethod === 'imei' && imeiInput.length >= 8) {
            const deviceId = ImeiService.lookupDevice(imeiInput);
            if (deviceId) {
                const device = devices.find(d => d.id === deviceId);
                if (device) {
                    setSelectedDevice(device);
                    setImeiError('');
                    return;
                }
            }

            // Fallback: Check the larger Osmocom database
            const tac = imeiInput.substring(0, 8);
            const genericName = tacDatabase[tac];
            if (genericName) {
                const gn = genericName.toLowerCase();
                const gnClean = gn.replace(/[^a-z0-9\s]/g, ' ');

                // Try strict match first
                let existingMatch = devices.find(d =>
                    d.name.toLowerCase() === gn ||
                    gn.includes(d.name.toLowerCase()) ||
                    d.name.toLowerCase().includes(gn)
                );

                // Fallback to word-based matching if no strict match
                if (!existingMatch) {
                    const words = gnClean.split(/\s+/).filter(w => w.length > 2 && w !== 'apple' && w !== 'samsung' && w !== 'google');
                    const brand = gn.split(/\s+/)[0];

                    if (words.length > 0) {
                        const candidates = devices
                            .filter(d => d.name.toLowerCase().includes(brand))
                            .map(d => {
                                const dName = d.name.toLowerCase();
                                const score = words.filter(word => dName.includes(word)).length;
                                return { device: d, score };
                            })
                            .filter(m => m.score > 0)
                            .sort((a, b) => b.score - a.score);

                        if (candidates.length > 0 && candidates[0].score >= 1) {
                            existingMatch = candidates[0].device;
                        }
                    }
                }

                if (existingMatch) {
                    setSelectedDevice(existingMatch);
                    setImeiError(`Detected: ${genericName}`);
                } else {
                    setSelectedDevice(null);
                    setImeiError(`Recognized: ${genericName}. Specs not found in current database.`);
                }
            } else {
                setSelectedDevice(null);
                if (imeiInput.length >= 15) {
                    if (ImeiService.validate(imeiInput)) {
                        setImeiError('Valid IMEI, but device model not in our database.');
                    } else {
                        setImeiError('Invalid IMEI checksum. Please check the digits.');
                    }
                } else {
                    setImeiError('Device not recognized. Enter full IMEI for verification.');
                }
            }
        } else {
            if (selectionMethod === 'imei') {
                setSelectedDevice(null);
                setImeiError('');
            }
        }
    }, [imeiInput, selectionMethod, devices, tacDatabase]);


    const countries = useMemo(() => DataService.getCountries(operators), [operators]);
    const brands = useMemo(() => DataService.getBrands(devices), [devices]);

    const filteredCountries = useMemo(() => {
        if (!countrySearch) return [];
        const query = countrySearch.toLowerCase().trim();

        // Improved Logic: If single character (like from Alphabet chips), match strictly by start
        if (query.length === 1) {
            return countries.filter((c: string) => c && c.toLowerCase().startsWith(query));
        }

        return countries.filter((c: string) => c && c.toLowerCase().includes(query)).slice(0, 50);
    }, [countries, countrySearch]);

    const alphabets = useMemo(() => {
        const unique = new Set(countries.filter((c: string) => c && c.length > 0).map((c: string) => c[0].toUpperCase()));
        return Array.from(unique).sort();
    }, [countries]);

    const filteredOperators = useMemo(() =>
        selectedCountry ? DataService.getOperatorsByCountry(operators, selectedCountry) : []
        , [operators, selectedCountry]);

    const searchedDevices = useMemo(() => {
        // If no text search, no brand selected, and filter is 'all', show nothing
        if (filterType === 'all' && !selectedBrand && debouncedSearch.length < 2) return [];

        const query = debouncedSearch.toLowerCase().replace(/\s+/g, '');

        let matches = devices;

        // Apply Brand Filter
        if (selectedBrand) {
            matches = matches.filter(d => d.name.toLowerCase().startsWith(selectedBrand.toLowerCase()));
        }

        // Apply Capability Filter
        if (filterType === 'esim') {
            matches = matches.filter(d => {
                const specs = d.specifications.toLowerCase();
                return (specs.includes('esim') || specs.includes('embedded-sim')) && !specs.includes('esim only');
            });
        } else if (filterType === 'esim_only') {
            matches = matches.filter(d => d.specifications.toLowerCase().includes('esim only'));
        } else if (filterType === 'satellite') {
            matches = matches.filter(d => d.specifications.toLowerCase().includes('satellite'));
        }

        // Apply Text Search
        if (debouncedSearch.length > 0) {
            matches = matches.filter(d => {
                const name = d.normalizedName || d.name.toLowerCase().replace(/\s+/g, '');
                return name.includes(query);
            });
        }

        // If filtering by type or brand, we can show more results
        const limit = (filterType !== 'all' || selectedBrand) ? 100 : 15;

        // Prioritize curated devices (those with IDs like 'ip16p' etc)
        return matches.sort((a, b) => {
            const aIsCurated = a.id.length < 10;
            const bIsCurated = b.id.length < 10;
            if (aIsCurated && !bIsCurated) return -1;
            if (!aIsCurated && bIsCurated) return 1;
            return 0;
        }).slice(0, limit);
    }, [devices, debouncedSearch, filterType, selectedBrand]);

    const compatibility = useMemo(() => {
        if (!selectedDevice || !selectedOperator) return null;

        let deviceSpecs: DeviceSpecification = {};
        try {
            deviceSpecs = JSON.parse(selectedDevice.specifications);
        } catch (e) {
            console.error("Failed to parse device specs", e);
        }

        const opBands = DataService.parseBands(selectedOperator.bands || '');

        // Combine all device bands for matching
        const devBands = [
            deviceSpecs["2G bands"] || '',
            deviceSpecs["3G bands"] || '',
            deviceSpecs["4G bands"] || '',
            deviceSpecs["5G bands"] || '',
            deviceSpecs["Technology"] || ''
        ].join(' ');

        const devBandsList = DataService.parseBands(devBands);

        return DataService.checkCompatibility(devBandsList, opBands);
    }, [selectedDevice, selectedOperator]);

    const simInfo = useMemo(() => {
        if (!selectedDevice) return { hasEsim: false, isEsimOnly: false };
        const specs = selectedDevice.specifications.toLowerCase();
        const isEsimOnly = specs.includes('esim only');
        const hasEsim = specs.includes('esim') || specs.includes('embedded-sim');
        return { hasEsim, isEsimOnly };
    }, [selectedDevice]);

    const handleShare = async () => {
        if (!selectedDevice || !selectedOperator || !compatibility) return;

        const status = compatibility.missing.length === 0 ? "✅ Full Support" : "⚠️ Partial Support";
        const supportedCount = compatibility.supported.length;
        const missingCount = compatibility.missing.length;

        let simStatus = "⚪ Physical SIM";
        if (simInfo.isEsimOnly) simStatus = "🟣 eSIM Only";
        else if (simInfo.hasEsim) simStatus = "🟢 eSIM Ready";

        const text = `📱 Check My Phone Report
-----------------------
Device: ${selectedDevice.name}
SIM Type: ${simStatus}
Carrier: ${selectedOperator.brand || selectedOperator.operator} (${selectedOperator.mcc}-${selectedOperator.mnc})
Country: ${selectedCountry}

${status}
📶 Bands: ${supportedCount} Supported / ${missingCount} Missing
✅ Supported: ${compatibility.supported.join(', ') || 'None'}
${compatibility.missing.length > 0 ? `❌ Missing: ${compatibility.missing.join(', ')}` : '✨ All operator bands supported!'}

Check your phone at: check-my-phone.vercel.app`;

        try {
            await navigator.clipboard.writeText(text);
            setIsSharing(true);
            setTimeout(() => setIsSharing(false), 2000);
        } catch (err) {
            console.error("Failed to copy", err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="mb-4"
                >
                    <Activity className="w-12 h-12 text-blue-500" />
                </motion.div>
                <p className="text-xl font-medium animate-pulse">Loading Global Network Data...</p>
                <p className="text-slate-400 mt-2 text-sm">Synchronizing 200+ countries & 10,000+ devices</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-blue-500/30">
            {/* Background Gradients */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-600/10 blur-[120px] rounded-full" />
                <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[120px] rounded-full" />
            </div>

            <main className="relative z-10 max-w-5xl mx-auto px-4 py-12 md:py-20">
                <header className="text-center mb-16">
                    <div className="flex flex-col items-center gap-6 mb-6 md:mb-10">

                        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
                            <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowAbout(true)}
                                className="text-xs text-slate-400 hover:text-white flex items-center gap-2 transition-colors font-medium border-r border-slate-800 pr-6 last:border-0"
                            >
                                <Info className="w-4 h-4 text-blue-400" /> About
                            </motion.button>

                            <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowHelp(true)}
                                className="text-xs text-slate-400 hover:text-white flex items-center gap-2 transition-colors font-medium border-r border-slate-800 pr-6 last:border-0"
                            >
                                <Book className="w-4 h-4 text-indigo-400" /> User Manual
                            </motion.button>

                            <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                whileHover={{ scale: 1.05, color: '#f8fafc' }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleReset}
                                className="text-xs text-slate-400 hover:text-white flex items-center gap-2 transition-colors font-medium"
                            >
                                <RotateCcw className="w-4 h-4 text-red-400" /> Reset All
                            </motion.button>
                        </div>
                    </div>
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400 mb-4 md:mb-6 tracking-tight pb-2"
                    >
                        Check My Phone
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-400 text-base md:text-xl max-w-2xl mx-auto px-4"
                    >
                        Instantly determine if your device supports the network bands of any carrier worldwide.
                    </motion.p>
                </header>

                <div className="grid md:grid-cols-2 gap-4 md:gap-8">
                    {/* Step 1: Device Selection */}
                    <motion.section
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 md:p-8 relative z-30"
                    >
                        <div className="flex items-center gap-3 mb-6 md:mb-8">
                            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                <Smartphone className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                            </div>
                            <h2 className="text-xl md:text-2xl font-semibold">Your Device</h2>
                        </div>

                        <p className="text-xs text-slate-500 mb-6 -mt-4 pl-1">
                            Tip: If you cannot find your device by IMEI, try the <strong>Search by Model</strong> option below.
                        </p>

                        <div className="flex flex-col gap-4 mb-8">
                            <div className="flex p-1 bg-slate-950/80 border border-slate-800 rounded-2xl">
                                <button
                                    onClick={() => {
                                        setSelectionMethod('manual');
                                        setSelectedDevice(null);
                                        setImeiInput('');
                                    }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${selectionMethod === 'manual' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <Search className="w-3.5 h-3.5" /> Search by Model
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectionMethod('imei');
                                        setSelectedDevice(null);
                                        setDeviceSearch('');
                                    }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${selectionMethod === 'imei' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <Hash className="w-3.5 h-3.5" /> Instant IMEI Lookup
                                </button>
                            </div>

                            {selectionMethod === 'manual' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-2"
                                >
                                    <button
                                        onClick={() => setFilterType('all')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${filterType === 'all'
                                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setFilterType('esim_only')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 ${filterType === 'esim_only'
                                            ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        <Smartphone className="w-3 h-3" /> eSIM Only
                                    </button>
                                    <button
                                        onClick={() => setFilterType('esim')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 ${filterType === 'esim'
                                            ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        <CheckCircle2 className="w-3 h-3" /> eSIM
                                    </button>
                                    <button
                                        onClick={() => setFilterType('satellite')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 ${filterType === 'satellite'
                                            ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        <Radio className="w-3 h-3" /> Satellite
                                    </button>
                                </motion.div>
                            )}
                        </div>

                        {selectionMethod === 'manual' ? (
                            <div className="flex gap-4 mb-4">
                                <div className="relative w-1/3 min-w-[120px]">
                                    <select
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3.5 pl-4 pr-8 outline-none focus:border-blue-500/50 transition-all text-white appearance-none text-xs md:text-sm font-medium"
                                        value={selectedBrand}
                                        onChange={(e) => {
                                            setSelectedBrand(e.target.value);
                                            setDeviceSearch(''); // Clear text search when switching brands
                                            setSelectedDevice(null);
                                        }}
                                    >
                                        <option value="">All Brands</option>
                                        {brands.map((brand: string) => (
                                            <option key={brand} value={brand}>{brand}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 1L5 5L9 1" />
                                        </svg>
                                    </div>
                                </div>

                                <div className="relative w-2/3">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder={
                                            filterType === 'esim_only' ? "Search eSIM Only..." :
                                                filterType === 'esim' ? "Search eSIM..." :
                                                    filterType === 'satellite' ? "Search Satellite..." :
                                                        selectedBrand ? `Search ${selectedBrand}...` :
                                                            "Search Model..."
                                        }
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-blue-500/50 transition-all text-white placeholder:text-slate-600 text-sm md:text-base"
                                        value={deviceSearch}
                                        onChange={(e) => {
                                            setDeviceSearch(e.target.value);
                                            if (selectedDevice) setSelectedDevice(null);
                                        }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 mb-6">
                                <div className="relative">
                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        type="text"
                                        maxLength={15}
                                        placeholder="Enter 15-digit IMEI..."
                                        className={`w-full bg-slate-950/50 border ${imeiError ? 'border-red-500/50' : 'border-slate-800'} rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-500/50 transition-all text-white placeholder:text-slate-600 text-base md:text-lg font-mono tracking-widest`}
                                        value={imeiInput}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 15);
                                            setImeiInput(val);
                                        }}
                                    />
                                </div>
                                {imeiError && (
                                    <div className="space-y-2">
                                        <motion.p
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`text-xs px-2 py-2 rounded-xl flex items-center gap-2 ${imeiError.includes('Detected') || imeiError.includes('Recognized')
                                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                }`}
                                        >
                                            {imeiError.includes('Detected') || imeiError.includes('Recognized') ? (
                                                <Search className="w-3.5 h-3.5 shrink-0" />
                                            ) : (
                                                <XCircle className="w-3.5 h-3.5 shrink-0" />
                                            )}
                                            <span className="flex-1">{imeiError}</span>
                                        </motion.p>

                                        {imeiError.includes('Specs not found') && (
                                            <motion.button
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                onClick={() => {
                                                    const match = imeiError.match(/Recognized: (.*)\. Specs/);
                                                    if (match && match[1]) {
                                                        setSelectionMethod('manual');
                                                        setDeviceSearch(match[1]);
                                                    }
                                                }}
                                                className="w-full py-2.5 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest shadow-lg shadow-blue-600/20"
                                            >
                                                <Search className="w-3.5 h-3.5" /> Search database for this model
                                            </motion.button>
                                        )}
                                    </div>
                                )}
                                {!selectedDevice && !imeiError && (
                                    <p className="text-slate-500 text-[10px] md:text-xs px-2 leading-relaxed">
                                        💡 Tip: Dial <span className="text-indigo-400 font-bold">*#06#</span> on your phone to find your IMEI instantly. Only the first 8 digits are used for identification.
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="relative mb-4 md:mb-6">
                            <AnimatePresence>
                                {(deviceSearch.length >= 2 || filterType !== 'all' || selectedBrand !== '') && !selectedDevice && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-0 left-0 right-0 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden z-50 shadow-2xl max-h-60 overflow-y-auto"
                                    >
                                        {deviceSearch !== debouncedSearch ? (
                                            <div className="px-6 py-8 text-center">
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                    className="inline-block mb-2"
                                                >
                                                    <Activity className="w-5 h-5 text-blue-500" />
                                                </motion.div>
                                                <p className="text-slate-500 text-sm">Searching global database...</p>
                                            </div>
                                        ) : searchedDevices.length > 0 ? (
                                            searchedDevices.map(d => (
                                                <button
                                                    key={d.id}
                                                    onClick={() => {
                                                        setSelectedDevice(d);
                                                        setDeviceSearch(d.name);
                                                        setDebouncedSearch(d.name);
                                                    }}
                                                    className="w-full px-6 py-3.5 text-left hover:bg-blue-500/10 transition-colors flex items-center justify-between group border-b border-slate-800 last:border-0"
                                                >
                                                    <span className="font-medium">{d.name}</span>
                                                    <div className="flex gap-2">
                                                        {d.specifications.toLowerCase().includes('esim only') ? (
                                                            <span className="text-[10px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20 font-bold uppercase">eSIM ONLY</span>
                                                        ) : (d.specifications.toLowerCase().includes('esim') || d.specifications.toLowerCase().includes('embedded-sim')) && filterType !== 'esim' && (
                                                            <span className="text-[10px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded border border-green-500/20 font-bold uppercase">eSIM</span>
                                                        )}
                                                        {d.specifications.toLowerCase().includes('satellite') && filterType !== 'satellite' && (
                                                            <span className="text-[10px] bg-sky-500/10 text-sky-500 px-1.5 py-0.5 rounded border border-sky-500/20 font-bold uppercase">Sat</span>
                                                        )}
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-6 py-6 text-center space-y-4">
                                                <p className="text-slate-500 text-sm italic">
                                                    No {filterType !== 'all' ? filterType : ''} devices found {selectedBrand ? `in ${selectedBrand}` : ''} matching &quot;{deviceSearch}&quot;
                                                </p>
                                                <a
                                                    href={`https://www.gsmarena.com/res.php3?sSearch=${encodeURIComponent(deviceSearch)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
                                                >
                                                    <Search className="w-3.5 h-3.5" /> Search on GSMArena
                                                </a>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {selectedDevice && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-blue-400">{selectedDevice.name}</h3>
                                            <div className="flex gap-2">
                                                {simInfo.isEsimOnly ? (
                                                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1">
                                                        <Smartphone className="w-2.5 h-2.5" /> eSIM Only
                                                    </span>
                                                ) : simInfo.hasEsim && (
                                                    <span className="px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-[10px] font-bold text-green-400 uppercase tracking-widest flex items-center gap-1">
                                                        <CheckCircle2 className="w-2.5 h-2.5" /> eSIM Ready
                                                    </span>
                                                )}
                                                {selectedDevice.specifications.toLowerCase().includes('satellite') && (
                                                    <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/30 text-[10px] font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1">
                                                        <Radio className="w-2.5 h-2.5" /> Satellite
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1 uppercase tracking-tight">Technical Profile Active</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedDevice(null);
                                            setDeviceSearch('');
                                        }}
                                        className="text-xs text-slate-500 hover:text-white underline underline-offset-4"
                                    >
                                        Change Device
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </motion.section>

                    {/* Step 2: Destination Selection */}
                    <motion.section
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 md:p-8 relative z-20"
                    >
                        <div className="flex items-center gap-3 mb-6 md:mb-8">
                            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                <Globe className="w-5 h-5 md:w-6 md:h-6 text-indigo-400" />
                            </div>
                            <h2 className="text-xl md:text-2xl font-semibold">Carrier Location</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="relative">
                                <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Destination Country</label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Type Country Name..."
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3.5 md:py-4 pl-11 pr-4 outline-none focus:border-indigo-500/50 transition-all text-white placeholder:text-slate-600 text-sm md:text-base"
                                        value={countrySearch}
                                        onChange={(e) => {
                                            setCountrySearch(e.target.value);
                                            if (selectedCountry) setSelectedCountry('');
                                        }}
                                        onFocus={() => {
                                            setIsCountrySearchFocused(true);
                                            if (selectedCountry) {
                                                setCountrySearch('');
                                                setSelectedCountry('');
                                            }
                                        }}
                                        onBlur={() => {
                                            // Delay blur to allow item click
                                            setTimeout(() => setIsCountrySearchFocused(false), 200);
                                        }}
                                    />
                                </div>

                                <AnimatePresence>
                                    {!selectedCountry && (isCountrySearchFocused || countrySearch.length > 0) && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden z-[60] shadow-2xl max-h-72 flex flex-col"
                                        >
                                            <div className="p-3 bg-slate-950/50 border-b border-slate-800 flex flex-wrap gap-1 items-center justify-center">
                                                {alphabets.map(char => (
                                                    <button
                                                        key={char}
                                                        onClick={() => setCountrySearch(char)}
                                                        className={`w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-bold transition-colors ${countrySearch.toUpperCase() === char ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                                    >
                                                        {char}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="overflow-y-auto custom-scrollbar">
                                                {(countrySearch ? filteredCountries : countries).map((c: string) => (
                                                    <button
                                                        key={c}
                                                        onClick={() => {
                                                            setSelectedCountry(c);
                                                            setCountrySearch(c);
                                                            setSelectedOperator(null);
                                                        }}
                                                        className="w-full px-6 py-3 text-left hover:bg-indigo-500/10 transition-colors flex items-center justify-between group border-b border-slate-800 last:border-0"
                                                    >
                                                        <span className="text-sm font-medium">{c}</span>
                                                        <span className="text-[10px] text-slate-500 group-hover:text-indigo-400 uppercase tracking-widest font-bold">Select</span>
                                                    </button>
                                                ))}
                                                {countrySearch && filteredCountries.length === 0 && (
                                                    <div className="px-6 py-8 text-center text-slate-500 text-sm italic">
                                                        No countries found matching &quot;{countrySearch}&quot;
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <AnimatePresence>
                                {selectedCountry && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                    >
                                        <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Local Carrier</label>
                                        <div className="relative">
                                            <Radio className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <select
                                                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3.5 md:py-4 pl-11 pr-4 outline-none focus:border-indigo-500/50 transition-all text-white appearance-none text-sm md:text-base"
                                                value={selectedOperator?.uniqueId || ''}
                                                onChange={(e) => {
                                                    const op = filteredOperators.find(o => o.uniqueId === e.target.value);
                                                    setSelectedOperator(op || null);
                                                }}
                                            >
                                                <option value="">Select Carrier...</option>
                                                {filteredOperators.map((o: Operator) => {
                                                    const displayName = o.brand && o.brand.trim() !== o.operator.trim() && !o.operator.includes(o.brand) ? `${o.brand} (${o.operator})` : o.operator;

                                                    // Smart Recommendation Logic
                                                    let statusIcon = '';
                                                    let statusLabel = '';

                                                    if (selectedDevice) {
                                                        const opBands = DataService.parseBands(o.bands || '');
                                                        let deviceSpecs: DeviceSpecification = {};
                                                        try {
                                                            deviceSpecs = JSON.parse(selectedDevice.specifications);
                                                        } catch { }

                                                        const devBands = [
                                                            deviceSpecs["2G bands"] || '',
                                                            deviceSpecs["3G bands"] || '',
                                                            deviceSpecs["4G bands"] || '',
                                                            deviceSpecs["5G bands"] || '',
                                                            deviceSpecs["Technology"] || ''
                                                        ].join(' ');
                                                        const devBandsList = DataService.parseBands(devBands);

                                                        const { missing } = DataService.checkCompatibility(devBandsList, opBands);

                                                        if (missing.length === 0) {
                                                            statusIcon = '✅';
                                                            statusLabel = '100% Match';
                                                        } else if (missing.length < opBands.length) {
                                                            statusIcon = '⚠️';
                                                            statusLabel = 'Partial';
                                                        } else {
                                                            statusIcon = '❌';
                                                            statusLabel = 'Incompatible';
                                                        }
                                                    }

                                                    return (
                                                        <option key={o.uniqueId} value={o.uniqueId}>
                                                            {statusIcon} {displayName} {statusLabel ? `(${statusLabel})` : `(${o.mcc}-${o.mnc})`}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.section>
                </div>

                {/* Results Section */}
                <AnimatePresence>
                    {compatibility && (
                        <motion.section
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 40 }}
                            className="mt-8 md:mt-12"
                        >
                            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-12 overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-12 opacity-5 hidden md:block">
                                    <Radio className="w-64 h-64 rotate-12" />
                                </div>

                                <div className="relative z-10">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-8 md:mb-12">
                                        <div>
                                            <h3 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Compatibility Report</h3>
                                            <p className="text-slate-400 text-sm md:text-base">
                                                Analysis for {selectedDevice?.name} on {selectedOperator?.brand || selectedOperator?.operator} ({selectedOperator?.mcc}-{selectedOperator?.mnc})
                                            </p>
                                        </div>
                                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                                            <div className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md w-fit">
                                                <span className="text-slate-400 text-xs md:text-sm">Status</span>
                                                <span className={`font-bold px-2 md:px-3 py-0.5 md:py-1 rounded-lg text-xs md:text-sm ${compatibility.missing.length === 0 ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                    {compatibility.missing.length === 0 ? 'Full Support' : 'Partial Support'}
                                                </span>
                                            </div>
                                            <button
                                                onClick={handleShare}
                                                className={`flex items-center gap-2 px-5 py-2.5 md:py-3 rounded-2xl transition-all font-bold text-xs md:text-sm uppercase tracking-widest ${isSharing ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'}`}
                                            >
                                                {isSharing ? (
                                                    <><CheckCircle2 className="w-4 h-4" /> Copied!</>
                                                ) : (
                                                    <><RotateCcw className="w-4 h-4" /> Share Report</>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-3 gap-8">
                                        {/* Services */}
                                        <div className="col-span-1 space-y-4">
                                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                <Activity className="w-4 h-4" /> Available Services
                                            </h4>
                                            <div className="space-y-3">
                                                <ServiceItem label="Voice Calls" supported={true} />
                                                <ServiceItem label="Text Messaging (SMS)" supported={true} />
                                                <ServiceItem label="Mobile Data" supported={compatibility.supported.some(b => b.includes('LTE') || b.includes('UMTS'))} />
                                                <ServiceItem label="High Speed (4G/5G)" supported={compatibility.supported.some(b => b.includes('LTE') || b.includes('5G'))} />
                                            </div>
                                        </div>

                                        {/* Band Analysis */}
                                        <div className="col-span-2">
                                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                                                <Radio className="w-4 h-4" /> Frequency Bands Breakdown
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-4">
                                                    <p className="text-xs font-semibold text-green-500/70 border-b border-green-500/10 pb-2 uppercase italic">Supported Bands</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {compatibility.supported.map((b: string) => (
                                                            <span key={b} className="px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium flex items-center gap-1.5">
                                                                <CheckCircle2 className="w-3 h-3" /> {b}
                                                            </span>
                                                        ))}
                                                        {compatibility.supported.length === 0 && <span className="text-slate-600 text-sm italic">No shared bands found</span>}
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <p className="text-xs font-semibold text-red-500/70 border-b border-red-500/10 pb-2 uppercase italic">Unsupported Bands</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {compatibility.missing.map((b: string) => (
                                                            <span key={b} className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-center gap-1.5">
                                                                <XCircle className="w-3 h-3" /> {b}
                                                            </span>
                                                        ))}
                                                        {compatibility.missing.length === 0 && <span className="text-slate-600 text-sm italic">None (Excellent coverage!)</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-3 text-sm text-slate-400 items-start">
                                                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                                <p>
                                                    Carrier networks use specific bands like <span className="text-white font-mono">B1, B3, B20</span> etc.
                                                    Your phone must have hardware supporting these exact frequencies to connect.
                                                    Partial support means you may experience slower speeds or lack of coverage in certain areas.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.section>
                    )}
                </AnimatePresence>
            </main >

            <footer className="max-w-5xl mx-auto px-4 py-12 border-t border-slate-900 text-center">
                <p className="text-slate-400 text-sm mb-2">
                    For any comments & feedback reach out to Mahesh Thakkar. <i>If you are using this app, you know how to reach him</i> 😉
                </p>
                <p className="text-slate-400 text-xs font-medium">
                    This is an independent community project. Data is provided &quot;as-is&quot; via public and community records. &copy; {new Date().getFullYear()}. For more details, read the disclaimer in the <strong>About</strong> section.
                </p>
            </footer>

            <AnimatePresence>
                {showAbout && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAbout(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-slate-900 border border-slate-800 w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-[2rem] p-6 md:p-10 shadow-2xl custom-scrollbar"
                        >
                            <button
                                onClick={() => setShowAbout(false)}
                                className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 transition-colors"
                            >
                                <XCircle className="w-6 h-6 text-slate-500" />
                            </button>

                            <h2 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">About Check My Phone</h2>

                            <div className="space-y-6 text-slate-300">
                                <section>
                                    <h3 className="text-xl font-semibold text-white mb-2">The &quot;Will it Work?&quot; Solution</h3>
                                    <p>Mobile frequencies are complicated—different countries and carriers use different &quot;bands.&quot; Check My Phone removes the guesswork from global roaming by analyzing your specific hardware against over 2,000 mobile carriers worldwide.</p>
                                </section>

                                <section className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-5">
                                    <h3 className="text-lg font-semibold text-blue-400 mb-2 flex items-center gap-2">
                                        <Globe className="w-5 h-5" /> Why it’s essential for Travelers
                                    </h3>
                                    <ul className="list-disc list-inside space-y-2 text-sm">
                                        <li><strong>Pre-travel Validation:</strong> Verify if your phone supports 4G/5G in your destination before you even pack.</li>
                                        <li><strong>Avoid Dead Zones:</strong> Identify &quot;Partial Support&quot; to know if you&apos;ll experience slower speeds or patchy coverage.</li>
                                        <li><strong>Confidence in Buying:</strong> Check if an international phone model will work on your home carrier.</li>
                                    </ul>
                                </section>

                                <section className="grid sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
                                        <h4 className="font-bold text-white mb-1">10,000+ Devices</h4>
                                        <p className="text-xs text-slate-400">Comprehensive indexing from flagship iPhones to reliable budget models from the last 7 years.</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
                                        <h4 className="font-bold text-white mb-1">Community Sourced</h4>
                                        <p className="text-xs text-slate-400">Data aggregated from free, open-source records and community contributions.</p>
                                    </div>
                                </section>

                                <section className="p-5 rounded-2xl bg-red-500/5 border border-red-500/10">
                                    <h3 className="text-lg font-semibold text-red-400 mb-2 flex items-center gap-2">
                                        <Info className="w-5 h-5" /> Legal Disclaimer
                                    </h3>
                                    <div className="text-xs space-y-2 text-slate-400 leading-relaxed uppercase">
                                        <p>THIS APPLICATION IS PROVIDED &quot;AS IS&quot; FOR INFORMATIONAL PURPOSES ONLY. THE DATA IS SOURCED FROM MULTIPLE PUBLIC AND COMMUNITY RESOURCES, INCLUDING BUT NOT LIMITED TO GSMA, FCC, OSMOCOM, AND VARIOUS OPEN-SOURCE NETWORK DATABASES.</p>
                                        <p>THE DATA MAY BE INCOMPLETE, OUTDATED, OR INACCURATE. THE DEVELOPER MAKES NO WARRANTIES REGARDING NETWORK COMPATIBILITY. WE STRONGLY RECOMMEND VERIFYING SPECIFICATIONS WITH YOUR CARRIER OR DEVICE MANUFACTURER BEFORE MAKING PURCHASES OR TRAVEL ARRANGEMENTS.</p>
                                        <p>UNDER NO CIRCUMSTANCES SHALL THE DEVELOPER BE LIABLE FOR ANY DIRECT, INDIRECT, OR CONSEQUENTIAL LOSSES, INCLUDING BUT NOT LIMITED TO NETWORK CONNECTION ISSUES, ROAMING COSTS, OR HARDWARE INCOMPATIBILITY.</p>
                                    </div>
                                </section>

                                <p className="text-sm italic text-slate-500 text-center pt-4">Built with accuracy and traveler freedom in mind.</p>

                                <button
                                    onClick={() => setShowAbout(false)}
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-bold text-white hover:opacity-90 transition-opacity"
                                >
                                    Got it, thanks!
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showHelp && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowHelp(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] p-8 md:p-10 shadow-2xl"
                        >
                            <button
                                onClick={() => setShowHelp(false)}
                                className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 transition-colors"
                            >
                                <XCircle className="w-6 h-6 text-slate-500" />
                            </button>

                            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 text-white">
                                <Book className="w-6 h-6 text-indigo-400" />
                                User Manual
                            </h2>

                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">1</div>
                                    <div>
                                        <p className="font-semibold text-white mb-1">Search Your Phone</p>
                                        <p className="text-sm text-slate-400">Choose between <strong>Search by Model</strong> or <strong>Instant IMEI Lookup</strong>. Dial <code className="text-blue-400 font-mono">*#06#</code> on your phone to find your IMEI instantly.</p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">2</div>
                                    <div>
                                        <p className="font-semibold text-white mb-1">Pick a Destination</p>
                                        <p className="text-sm text-slate-400">Select the country you are visiting and your preferred local carrier from our global list.</p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 font-bold text-sm">3</div>
                                    <div>
                                        <p className="font-semibold text-white mb-1">Check Compatibility</p>
                                        <p className="text-sm text-slate-400">Instantly see if your hardware supports the carrier&apos;s frequency bands (3G/4G/5G).</p>
                                    </div>
                                </div>

                                <div className="mt-8 space-y-3">
                                    <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex gap-3 text-xs text-blue-200/60 leading-relaxed">
                                        <Info className="w-4 h-4 flex-shrink-0" />
                                        <span>Pro Tip: If IMEI lookup doesn&apos;t recognize your device, try the Manual Search to find it by model name.</span>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-3 text-xs text-amber-200/60 leading-relaxed">
                                        <Smartphone className="w-4 h-4 flex-shrink-0" />
                                        <span>Satellite Mode: Use the filter buttons to find devices compatible with Thuraya satellite networks.</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowHelp(false)}
                                    className="w-full mt-4 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl font-bold text-white transition-all shadow-lg shadow-blue-500/20"
                                >
                                    Start Checking
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
}

function ServiceItem({ label, supported }: { label: string; supported: boolean }) {
    return (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-colors">
            <span className="font-medium text-slate-300">{label}</span>
            {supported ? (
                <div className="flex items-center gap-1.5 text-green-400 text-xs font-bold uppercase tracking-widest">
                    <CheckCircle2 className="w-4 h-4" /> Support
                </div>
            ) : (
                <div className="flex items-center gap-1.5 text-red-400 text-xs font-bold uppercase tracking-widest">
                    <XCircle className="w-4 h-4" /> Limited
                </div>
            )}
        </div>
    );
}
