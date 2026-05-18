import CryptoJS from 'crypto-js';

/**
 * Encrypts plain text using the user's unique secret key (like their password/pin)
 */
export const encryptData = (text: string, secretKey: string): string => {
    return CryptoJS.AES.encrypt(text, secretKey).toString();
};

/**
 * Decrypts scrambled text back into readable prose
 */
export const decryptData = (ciphertext: string, secretKey: string): string => {
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        console.error("Decryption failed. Incorrect key.");
        return "🔒 [Encrypted Content - Could not decrypt]";
    }
};