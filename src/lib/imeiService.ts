import { TAC_DATABASE } from './tacData';

export const ImeiService = {
    /**
     * Validates an IMEI using the Luhn Algorithm
     */
    validate: (imei: string): boolean => {
        const cleaned = imei.replace(/\D/g, '');
        if (cleaned.length !== 15) return false;

        let sum = 0;
        for (let i = 0; i < 15; i++) {
            let n = parseInt(cleaned[i]);
            if (i % 2 !== 0) {
                n *= 2;
                if (n > 9) n -= 9;
            }
            sum += n;
        }
        return sum % 10 === 0;
    },

    /**
     * Extracts Type Allocation Code (TAC) from IMEI
     */
    getTAC: (imei: string): string => {
        return imei.replace(/\D/g, '').substring(0, 8);
    },

    /**
     * Look up a device ID by IMEI
     */
    lookupDevice: (imei: string): string | null => {
        const tac = ImeiService.getTAC(imei);
        return TAC_DATABASE[tac] || null;
    }
};
