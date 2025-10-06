"use client";

// --- IMPORTANT ---
// This is a simplified, non-cryptographic "hashing" function for prototyping.
// In a real-world application, a robust library like bcrypt or the Web Crypto API (for Argon2/PBKDF2) should be used.
// This implementation is for demonstrating the workflow and is NOT secure for production.
const simpleHash = (input: string, salt: string): string => {
  const saltedInput = input + salt;
  let hash = 0;
  for (let i = 0; i < saltedInput.length; i++) {
    const char = saltedInput.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  // Convert to a hex string for storage
  return 'simulated_hash_' + (hash >>> 0).toString(16);
};

const getSaltForIndex = (index: number): string => {
  // Use a unique, predictable "salt" for each phone number index for this prototype.
  // In a real app, these would be securely and randomly generated and stored.
  const salts = ["salt_one_A!b", "salt_two_C@d", "salt_three_E#f", "salt_four_G$h"];
  return salts[index % salts.length];
};

export const createPasswordHash = (pin: string): string => {
  // A simple, static salt for the main password hash in this prototype.
  return simpleHash(pin, "main_password_salt_KKS");
};

export const createFamilyHashSet = (phoneNumbers: string[]): string[] => {
  return phoneNumbers.map((num, index) => simpleHash(num, getSaltForIndex(index)));
};

export const verifyPhoneNumber = (inputNumber: string, storedHashes: string[]): boolean => {
  // Attempt to verify the input number against each of the four possible "salts".
  for (let i = 0; i < 4; i++) {
    const inputHash = simpleHash(inputNumber, getSaltForIndex(i));
    if (storedHashes.includes(inputHash)) {
      return true;
    }
  }
  return false;
};
