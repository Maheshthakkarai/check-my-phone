export interface Operator {
  uniqueId: string; // Combined MCC-MNC or brand-name
  countryName: string;
  countryCode: string;
  mcc: string;
  mnc: string;
  brand: string;
  operator: string;
  status: string;
  bands: string; // "GSM 900 / GSM 1800 / UMTS 2100 / LTE 800"
  notes: string | null;
}

export interface DeviceSpecification {
  Technology?: string;
  "2G bands"?: string;
  "3G bands"?: string;
  "4G bands"?: string;
  "5G bands"?: string;
  GPRS?: string;
  EDGE?: string;
  [key: string]: string | undefined;
}

export interface Device {
  id: string;
  brand_id: string;
  name: string;
  normalizedName?: string;
  specifications: string; // JSON string of DeviceSpecification
}

export interface CompatibilityResult {
  supported: boolean;
  technology: string;
  bands: string[];
  missingBands: string[];
}
