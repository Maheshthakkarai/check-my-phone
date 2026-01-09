"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { DataService } from '@/lib/dataService';
import { Operator, Device, DeviceSpecification } from '@/lib/types';
import { Search, Smartphone, Globe, Radio, CheckCircle2, XCircle, Info, Activity, Menu, RotateCcw, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CheckPhoneApp() {
    const [operators, setOperators] = useState<Operator[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAbout, setShowAbout] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    const [selectedCountry, setSelectedCountry] = useState('');
    const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
    const [deviceSearch, setDeviceSearch] = useState('');
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

    const handleReset = () => {
        setSelectedCountry('');
        setSelectedOperator(null);
        setDeviceSearch('');
        setSelectedDevice(null);
    };

    useEffect(() => {
        async function init() {
            try {
                const [ops, devs] = await Promise.all([
                    DataService.fetchOperators(),
                    DataService.fetchDevices()
                ]);
                setOperators(ops);
                setDevices(devs);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, []);

    const countries = useMemo(() => DataService.getCountries(operators), [operators]);

    const filteredOperators = useMemo(() =>
        selectedCountry ? DataService.getOperatorsByCountry(operators, selectedCountry) : []
        , [operators, selectedCountry]);

    const searchedDevices = useMemo(() => {
        if (deviceSearch.length < 2) return [];

        const query = deviceSearch.toLowerCase().replace(/\s+/g, '');

        const matches = devices.filter(d => {
            const name = d.name.toLowerCase().replace(/\s+/g, '');
            return name.includes(query);
        });

        // Prioritize curated devices (those with IDs like 'ip16p' etc)
        return matches.sort((a, b) => {
            const aIsCurated = a.id.length < 10;
            const bIsCurated = b.id.length < 10;
            if (aIsCurated && !bIsCurated) return -1;
            if (!aIsCurated && bIsCurated) return 1;
            return 0;
        }).slice(0, 15);
    }, [devices, deviceSearch]);

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
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs md:text-sm font-medium"
                        >
                            <Activity className="w-4 h-4" />
                            Global Real-Time Database
                        </motion.div>

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
                                <HelpCircle className="w-4 h-4 text-indigo-400" /> Help
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
                        className="text-4xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400 mb-4 md:mb-6 tracking-tight"
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

                        <div className="relative mb-4 md:mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search Make/Model..."
                                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3.5 md:py-4 pl-12 pr-4 outline-none focus:border-blue-500/50 transition-all text-white placeholder:text-slate-600 text-sm md:text-base"
                                value={deviceSearch}
                                onChange={(e) => {
                                    setDeviceSearch(e.target.value);
                                    if (selectedDevice) setSelectedDevice(null);
                                }}
                            />

                            <AnimatePresence>
                                {deviceSearch.length >= 2 && !selectedDevice && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden z-50 shadow-2xl max-h-60 overflow-y-auto"
                                    >
                                        {searchedDevices.length > 0 ? (
                                            searchedDevices.map(d => (
                                                <button
                                                    key={d.id}
                                                    onClick={() => {
                                                        setSelectedDevice(d);
                                                        setDeviceSearch(d.name);
                                                    }}
                                                    className="w-full px-6 py-3.5 text-left hover:bg-blue-500/10 transition-colors flex items-center justify-between group border-b border-slate-800 last:border-0"
                                                >
                                                    <span className="font-medium">{d.name}</span>
                                                    <span className="text-xs text-slate-500 group-hover:text-blue-400 uppercase tracking-widest font-bold">Select</span>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-6 py-6 text-center space-y-4">
                                                <p className="text-slate-500 text-sm italic">
                                                    No devices found matching "{deviceSearch}"
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
                                    <div>
                                        <h3 className="font-bold text-blue-400">{selectedDevice.name}</h3>
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
                            <div>
                                <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Destination Country</label>
                                <select
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3.5 md:py-4 px-4 outline-none focus:border-indigo-500/50 transition-all text-white appearance-none text-sm md:text-base"
                                    value={selectedCountry}
                                    onChange={(e) => {
                                        setSelectedCountry(e.target.value);
                                        setSelectedOperator(null);
                                    }}
                                >
                                    <option value="">Select Country...</option>
                                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <AnimatePresence>
                                {selectedCountry && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                    >
                                        <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Local Carrier</label>
                                        <select
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3.5 md:py-4 px-4 outline-none focus:border-indigo-500/50 transition-all text-white appearance-none text-sm md:text-base"
                                            value={selectedOperator?.operator || ''}
                                            onChange={(e) => {
                                                const op = filteredOperators.find(o => o.operator === e.target.value);
                                                setSelectedOperator(op || null);
                                            }}
                                        >
                                            <option value="">Select Carrier...</option>
                                            {filteredOperators.map(o => (
                                                <option key={`${o.mcc}-${o.mnc}`} value={o.operator}>
                                                    {o.brand ? `${o.brand} (${o.operator})` : o.operator}
                                                </option>
                                            ))}
                                        </select>
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
                                            <p className="text-slate-400 text-sm md:text-base">Analysis for {selectedDevice?.name} on {selectedOperator?.brand || selectedOperator?.operator}</p>
                                        </div>
                                        <div className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md w-fit">
                                            <span className="text-slate-400 text-xs md:text-sm">Status</span>
                                            <span className={`font-bold px-2 md:px-3 py-0.5 md:py-1 rounded-lg text-xs md:text-sm ${compatibility.missing.length === 0 ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                {compatibility.missing.length === 0 ? 'Full Support' : 'Partial Support'}
                                            </span>
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
                                                        {compatibility.supported.map(b => (
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
                                                        {compatibility.missing.map(b => (
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
            </main>

            <footer className="max-w-5xl mx-auto px-4 py-12 border-t border-slate-900 text-center">
                <p className="text-slate-600 text-sm">
                    Check My Phone &copy; {new Date().getFullYear()} &bull; Open-source data via GSMA & FCC Public Records.
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
                                    <h3 className="text-xl font-semibold text-white mb-2">The "Will it Work?" Solution</h3>
                                    <p>Mobile frequencies are complicated—different countries and carriers use different "bands." Check My Phone removes the guesswork from global roaming by analyzing your specific hardware against over 2,000 mobile carriers worldwide.</p>
                                </section>

                                <section className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-5">
                                    <h3 className="text-lg font-semibold text-blue-400 mb-2 flex items-center gap-2">
                                        <Globe className="w-5 h-5" /> Why it’s essential for Travelers
                                    </h3>
                                    <ul className="list-disc list-inside space-y-2 text-sm">
                                        <li><strong>Pre-travel Validation:</strong> Verify if your phone supports 4G/5G in your destination before you even pack.</li>
                                        <li><strong>Avoid Dead Zones:</strong> Identify "Partial Support" to know if you'll experience slower speeds or patchy coverage.</li>
                                        <li><strong>Confidence in Buying:</strong> Check if an international phone model will work on your home carrier.</li>
                                    </ul>
                                </section>

                                <section className="grid sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
                                        <h4 className="font-bold text-white mb-1">10,000+ Devices</h4>
                                        <p className="text-xs text-slate-400">Comprehensive indexing from flagship iPhones to reliable budget models from the last 7 years.</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
                                        <h4 className="font-bold text-white mb-1">Real-Time Data</h4>
                                        <p className="text-xs text-slate-400">Regularly updated carrier records ensuring accurate technical frequency mappings.</p>
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

                            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                                <HelpCircle className="w-6 h-6 text-indigo-400" />
                                How to Use
                            </h2>

                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">1</div>
                                    <div>
                                        <p className="font-semibold text-white mb-1">Search Your Phone</p>
                                        <p className="text-sm text-slate-400">Type your phone's name (e.g., "iPhone 15") and select it from the list.</p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">2</div>
                                    <div>
                                        <p className="font-semibold text-white mb-1">Pick a Destination</p>
                                        <p className="text-sm text-slate-400">Select the country you are visiting and your preferred local carrier.</p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 font-bold text-sm">3</div>
                                    <div>
                                        <p className="font-semibold text-white mb-1">Check Compatibility</p>
                                        <p className="text-sm text-slate-400">Instantly see if your phone supports the carrier's network bands.</p>
                                    </div>
                                </div>

                                <div className="mt-8 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-3 text-xs text-amber-200/60 leading-relaxed">
                                    <Info className="w-4 h-4 flex-shrink-0" />
                                    <span>Tip: If your phone isn't listed, use the GSMArena search button in the search results.</span>
                                </div>

                                <button
                                    onClick={() => setShowHelp(false)}
                                    className="w-full mt-4 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-white transition-colors"
                                >
                                    Start Checking
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
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
