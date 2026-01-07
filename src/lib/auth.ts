"use client";

// --- IMPORTANT ---
// Secure hashing using the Web Crypto API (SHA-256)
const secureHash = async (input: string, salt: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(input + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};


const getSaltForIndex = (index: number): string => {
  // In a real app, these would be securely and randomly generated and stored.
  const salts = ["SALT_ONE_A!B", "SALT_TWO_C@D", "SALT_THREE_E#F", "SALT_FOUR_G$H"];
  return salts[index % salts.length];
};

export const createPasswordHash = async (pin: string): Promise<string> => {
  return secureHash(pin, "MAIN_PASSWORD_SALT_KKS_V2");
};

export const createFamilyHashSet = async (phoneNumbers: string[]): Promise<string[]> => {
  const hashPromises = phoneNumbers.map((num, index) => secureHash(num, getSaltForIndex(index)));
  return Promise.all(hashPromises);
};

export const verifyPhoneNumber = async (inputNumber: string, storedHashes: string[]): Promise<boolean> => {
  for (let i = 0; i < 4; i++) {
    const inputHash = await secureHash(inputNumber, getSaltForIndex(i));
    if (storedHashes.includes(inputHash)) {
      return true;
    }
  }
  return false;
};
