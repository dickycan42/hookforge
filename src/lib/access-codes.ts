// Access codes for HookForge paywall.
// Sold via Gumroad / Ko-fi ($19 lifetime). Share one code per buyer manually
// via the platform's delivery email.
// To add more codes: append new "HF-XXXX-XXXX" entries (uppercase A-Z, 0-9)
// to ACCESS_CODES below. Keep them unique.

const ACCESS_CODES: string[] = [
  "HF-0N2Y-W12O",
    "HF-1K5M-X8WM",
    "HF-1XKE-5G5O",
    "HF-2WU1-2ET3",
    "HF-324W-WL8C",
    "HF-3F60-O79C",
    "HF-3K7U-V3BV",
    "HF-4LGT-YTZ1",
    "HF-4UW3-39YI",
    "HF-4XP9-HLWL",
    "HF-5GO4-X8NC",
    "HF-64AI-R9KB",
    "HF-6BQT-796E",
    "HF-6GAF-OBKC",
    "HF-6SDP-QMDL",
    "HF-73R8-7J5W",
    "HF-7YPB-05FH",
    "HF-8HVR-8HYG",
    "HF-8PHA-0GKN",
    "HF-983P-FA3K",
    "HF-AR3X-PN13",
    "HF-AY55-771V",
    "HF-B5QA-3VFB",
    "HF-B806-ZGQO",
    "HF-C7VM-SLTL",
    "HF-DN18-VS27",
    "HF-DWSS-1N8V",
    "HF-E9WB-KEAB",
    "HF-G09E-0H40",
    "HF-HK87-TUEJ",
    "HF-KI2F-ZES2",
    "HF-LPKE-KZ8X",
    "HF-MD6N-MI2P",
    "HF-OEKE-LTBL",
    "HF-OYQI-GAAG",
    "HF-QCIN-7PFK",
    "HF-R44J-6YX4",
    "HF-RMF6-YNOV",
    "HF-RQC8-NM9Q",
    "HF-SGJ9-461G",
    "HF-T8UY-005M",
    "HF-TPXZ-7IAF",
    "HF-UE51-BKFR",
    "HF-VNWN-98XM",
    "HF-VVEA-IBQC",
    "HF-VZRU-29SD",
    "HF-WO8I-2S2E",
    "HF-YGK4-J81Q",
    "HF-ZIE5-GWFY",
    "HF-ZUPI-ZCKO",
];

const codeSet = new Set(ACCESS_CODES.map((c) => c.trim().toUpperCase()));

/** Returns true if the given code is a valid access code (case-insensitive). */
export function isValidAccessCode(code: string): boolean {
  return codeSet.has(code.trim().toUpperCase());
}

/** Total number of issued codes (for admin reference). */
export const ACCESS_CODE_COUNT = ACCESS_CODES.length;
