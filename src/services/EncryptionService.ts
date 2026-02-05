/*
 * (C) Symbol Contributors 2022
 *
 * Licensed under the Apache License, Version 2.0 (the "License ");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {cbc} from "@noble/ciphers/aes.js";
import {pbkdf2} from "@noble/hashes/pbkdf2.js";
import {sha1} from "@noble/hashes/legacy.js";

// internal dependencies
import {
    EncryptedPayload,
} from '../../index';

/**
 * Class `EncryptionService` describes a high level service
 * for encryption/decryption of data.
 *
 * Implemented algorithms for encryption/decryption include:
 * - AES with PBKDF2 (Password-Based Key Derivation Function)
 *
 * @since 0.3.0
 */
class EncryptionService {

    private static readonly SALT_BYTES = 32;
    private static readonly IV_BYTES = 16;
    private static readonly KEY_BYTES = 32;
    private static readonly PBKDF2_ITERATIONS = 2000;
    private static readonly textEncoder = new TextEncoder();
    private static readonly textDecoder = new TextDecoder();

    /**
     * The `encrypt` method will encrypt given `data` raw string
     * with given `password` password.
     *
     * First we generate a random salt of 32 bytes, then we iterate
     * 2000 times with PBKDF2 and encrypt with AES.
     *
     * @param password {string}
     * @param data {string}
     */
    public static encrypt(
        data: string,
        password: string,
    ): EncryptedPayload {

        const salt = EncryptionService.randomBytes(EncryptionService.SALT_BYTES);
        const iv = EncryptionService.randomBytes(EncryptionService.IV_BYTES);
        return EncryptionService.encryptWithParams(data, password, salt, iv);
    }

    /**
     * AES_PBKF2_decryption will decrypt privateKey with provided password
     * @param payload the object containing the encrypted data.
     * @param password the password to decrypt the encrypted data
     */
    public static decrypt(
        payload: EncryptedPayload,
        password: string,
    ): string {

        // read payload
        const salt = EncryptionService.hexToBytes(payload.salt);
        const priv = payload.ciphertext;

        // read encryption configuration
        const ivHex = priv.substr(0, 32);
        const cipherBase64 = priv.substr(32);
        const iv = EncryptionService.hexToBytes(ivHex);
        const cipherBytes = EncryptionService.base64ToBytes(cipherBase64);

        // re-generate key (PBKDF2)
        const key = EncryptionService.deriveKey(password, salt);

        // decrypt and return
        const decryptedBytes = cbc(key, iv).decrypt(cipherBytes);
        const decryptedText = EncryptionService.bytesToUtf8(decryptedBytes);
        if (!decryptedText){
            // This happens sometimes when the wrong password is used instead of an Error.
            throw Error('Empty decrypted text!!');
        }
        return decryptedText;
    }

    /**
     * Test-only helper to create a deterministic payload.
     */
    public static _encryptWithParams(
        data: string,
        password: string,
        saltHex: string,
        ivHex: string,
    ): EncryptedPayload {
        const salt = EncryptionService.hexToBytes(saltHex);
        const iv = EncryptionService.hexToBytes(ivHex);
        return EncryptionService.encryptWithParams(data, password, salt, iv);
    }

    private static encryptWithParams(
        data: string,
        password: string,
        salt: Uint8Array,
        iv: Uint8Array,
    ): EncryptedPayload {
        const key = EncryptionService.deriveKey(password, salt);
        const dataBytes = EncryptionService.utf8ToBytes(data);
        const encryptedBytes = cbc(key, iv).encrypt(dataBytes);

        // create our `EncryptedPayload` (16 bytes iv as hex || cipher text)
        const ciphertext = EncryptionService.bytesToHex(iv) + EncryptionService.bytesToBase64(encryptedBytes);
        const usedSalt = EncryptionService.bytesToHex(salt);
        return new EncryptedPayload(ciphertext, usedSalt);
    }

    private static deriveKey(
        password: string,
        salt: Uint8Array,
    ): Uint8Array {
        const passwordBytes = EncryptionService.utf8ToBytes(password);
        return pbkdf2(sha1, passwordBytes, salt, {
            c: EncryptionService.PBKDF2_ITERATIONS,
            dkLen: EncryptionService.KEY_BYTES,
        });
    }

    private static utf8ToBytes(value: string): Uint8Array {
        return EncryptionService.textEncoder.encode(value);
    }

    private static bytesToUtf8(value: Uint8Array): string {
        return EncryptionService.textDecoder.decode(value);
    }

    private static bytesToHex(bytes: Uint8Array): string {
        let out = '';
        for (const b of bytes) {
            out += b.toString(16).padStart(2, '0');
        }
        return out;
    }

    private static hexToBytes(hex: string): Uint8Array {
        if (hex.length % 2 !== 0) {
            throw new Error('Invalid hex string.');
        }
        const out = new Uint8Array(hex.length / 2);
        for (let i = 0; i < out.length; i += 1) {
            out[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return out;
    }

    private static bytesToBase64(bytes: Uint8Array): string {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(bytes).toString('base64');
        }
        let binary = '';
        for (const b of bytes) {
            binary += String.fromCharCode(b);
        }
        return btoa(binary);
    }

    private static base64ToBytes(base64: string): Uint8Array {
        if (typeof Buffer !== 'undefined') {
            return new Uint8Array(Buffer.from(base64, 'base64'));
        }
        const binary = atob(base64);
        const out = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
            out[i] = binary.charCodeAt(i);
        }
        return out;
    }

    private static randomBytes(length: number): Uint8Array {
        const globalCrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
        if (globalCrypto && typeof globalCrypto.getRandomValues === 'function') {
            const out = new Uint8Array(length);
            globalCrypto.getRandomValues(out);
            return out;
        }
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const nodeCrypto = require('crypto');
        return new Uint8Array(nodeCrypto.randomBytes(length));
    }
}

export {EncryptionService};
