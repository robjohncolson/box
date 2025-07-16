import type { KeyPair } from '../types/index.js';
/**
 * Wallet class for managing cryptographic keys and mnemonic phrases
 */
export declare class Wallet {
    private keyPair;
    private mnemonic;
    /**
     * Generates a new, cryptographically valid 12-word mnemonic phrase.
     * This is a static method, so it can be called without creating an instance of the Wallet.
     * e.g., Wallet.generateMnemonic()
     */
    static generateMnemonic(): string;
    constructor(mnemonic: string);
    /**
     * Get the wallet's key pair
     */
    getKeyPair(): KeyPair;
    /**
     * Get the wallet's mnemonic phrase
     */
    getMnemonic(): string;
    /**
     * Get the wallet's public key hex string
     */
    getPublicKeyHex(): string;
    /**
     * Get the wallet's private key hex string
     */
    getPrivateKeyHex(): string;
}
//# sourceMappingURL=Wallet.d.ts.map