import { generateMnemonic, keyPairFromMnemonic } from './keys.js';
/**
 * Wallet class for managing cryptographic keys and mnemonic phrases
 */
export class Wallet {
    keyPair;
    mnemonic;
    /**
     * Generates a new, cryptographically valid 12-word mnemonic phrase.
     * This is a static method, so it can be called without creating an instance of the Wallet.
     * e.g., Wallet.generateMnemonic()
     */
    static generateMnemonic() {
        return generateMnemonic();
    }
    constructor(mnemonic) {
        this.mnemonic = mnemonic;
        this.keyPair = keyPairFromMnemonic(mnemonic);
    }
    /**
     * Get the wallet's key pair
     */
    getKeyPair() {
        return this.keyPair;
    }
    /**
     * Get the wallet's mnemonic phrase
     */
    getMnemonic() {
        return this.mnemonic;
    }
    /**
     * Get the wallet's public key hex string
     */
    getPublicKeyHex() {
        return this.keyPair.publicKey.hex;
    }
    /**
     * Get the wallet's private key hex string
     */
    getPrivateKeyHex() {
        return this.keyPair.privateKey.hex;
    }
}
//# sourceMappingURL=Wallet.js.map