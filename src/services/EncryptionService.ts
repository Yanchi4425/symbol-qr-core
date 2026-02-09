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
import {cbc, gcm} from "@noble/ciphers/aes.js";
import {pbkdf2} from "@noble/hashes/pbkdf2.js";
import {sha1} from "@noble/hashes/legacy.js";
import {sha256} from "@noble/hashes/sha2.js";

// internal dependencies
import {
    EncryptedPayload,
} from '../../index';

/**
 * Class `EncryptionService` describes a high level service
 * for encryption/decryption of data.
 *
 * Implemented algorithms for encryption/decryption include:
 * - v3: AES-CBC with PBKDF2-SHA1 (legacy)
 * - v4: AES-GCM with PBKDF2-SHA256 (modern)
 *
 * @since 0.3.0
 */
class EncryptionService {

    private static readonly SALT_BYTES_V3 = 32;
    private static readonly IV_BYTES_V3 = 16;
    private static readonly KEY_BYTES_V3 = 32;
    private static readonly PBKDF2_ITERATIONS_V3 = 2000;
    private static readonly SALT_BYTES_V4 = 32;
    private static readonly NONCE_BYTES_V4 = 12;
    private static readonly KEY_BYTES_V4 = 32;
    private static readonly PBKDF2_ITERATIONS_V4 = 600000;
    private static readonly VERSION_V4 = 4;
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
        return EncryptionService.encryptV4(data, password);
    }

    /**
     * The `encryptV4` method will encrypt given `data` raw string
     * with given `password` password using the modern profile.
     *
     * - KDF: PBKDF2-HMAC-SHA-256 (high iteration)
     * - Cipher: AES-256-GCM
     */
    public static encryptV4(
        data: string,
        password: string,
    ): EncryptedPayload {
        const salt = EncryptionService.randomBytes(EncryptionService.SALT_BYTES_V4);
        const nonce = EncryptionService.randomBytes(EncryptionService.NONCE_BYTES_V4);
        return EncryptionService.encryptWithParamsV4(data, password, salt, nonce);
    }

    /**
     * @deprecated Use encryptV4 instead.
     */
    public static encryptV3(
        data: string,
        password: string,
    ): EncryptedPayload {
        const salt = EncryptionService.randomBytes(EncryptionService.SALT_BYTES_V3);
        const iv = EncryptionService.randomBytes(EncryptionService.IV_BYTES_V3);
        return EncryptionService.encryptWithParamsV3(data, password, salt, iv);
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
        if (payload.version === EncryptionService.VERSION_V4) {
            return EncryptionService.decryptV4(payload, password);
        }
        return EncryptionService.decryptV3(payload, password);
    }

    /**
     * Decrypts data encrypted with the modern profile (v4).
     */
    public static decryptV4(
        payload: EncryptedPayload,
        password: string,
    ): string {
        const salt = EncryptionService.hexToBytes(payload.salt);
        const priv = payload.ciphertext;
        const nonceHex = priv.substr(0, EncryptionService.NONCE_BYTES_V4 * 2);
        const cipherBase64 = priv.substr(EncryptionService.NONCE_BYTES_V4 * 2);
        const nonce = EncryptionService.hexToBytes(nonceHex);
        const cipherBytes = EncryptionService.base64ToBytes(cipherBase64);
        const key = EncryptionService.deriveKeyV4(password, salt);
        const decryptedBytes = gcm(key, nonce).decrypt(cipherBytes);
        const decryptedText = EncryptionService.bytesToUtf8(decryptedBytes);
        if (!decryptedText) {
            throw Error('Empty decrypted text!!');
        }
        return decryptedText;
    }

    /**
     * Decrypts data encrypted with the legacy profile (v3).
     */
    public static decryptV3(
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
        const key = EncryptionService.deriveKeyV3(password, salt);

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
        return EncryptionService.encryptWithParamsV3(data, password, salt, iv);
    }

    private static encryptWithParamsV3(
        data: string,
        password: string,
        salt: Uint8Array,
        iv: Uint8Array,
    ): EncryptedPayload {
        const key = EncryptionService.deriveKeyV3(password, salt);
        const dataBytes = EncryptionService.utf8ToBytes(data);
        const encryptedBytes = cbc(key, iv).encrypt(dataBytes);

        // create our `EncryptedPayload` (16 bytes iv as hex || cipher text)
        const ciphertext = EncryptionService.bytesToHex(iv) + EncryptionService.bytesToBase64(encryptedBytes);
        const usedSalt = EncryptionService.bytesToHex(salt);
        return new EncryptedPayload(ciphertext, usedSalt);
    }

    private static encryptWithParamsV4(
        data: string,
        password: string,
        salt: Uint8Array,
        nonce: Uint8Array,
    ): EncryptedPayload {
        const key = EncryptionService.deriveKeyV4(password, salt);
        const dataBytes = EncryptionService.utf8ToBytes(data);
        const encryptedBytes = gcm(key, nonce).encrypt(dataBytes);
        const ciphertext = EncryptionService.bytesToHex(nonce) + EncryptionService.bytesToBase64(encryptedBytes);
        const usedSalt = EncryptionService.bytesToHex(salt);
        return new EncryptedPayload(ciphertext, usedSalt, EncryptionService.VERSION_V4);
    }

    private static deriveKeyV3(
        password: string,
        salt: Uint8Array,
    ): Uint8Array {
        const passwordBytes = EncryptionService.utf8ToBytes(password);
        return pbkdf2(sha1, passwordBytes, salt, {
            c: EncryptionService.PBKDF2_ITERATIONS_V3,
            dkLen: EncryptionService.KEY_BYTES_V3,
        });
    }

    private static deriveKeyV4(
        password: string,
        salt: Uint8Array,
    ): Uint8Array {
        const passwordBytes = EncryptionService.utf8ToBytes(password);
        return pbkdf2(sha256, passwordBytes, salt, {
            c: EncryptionService.PBKDF2_ITERATIONS_V4,
            dkLen: EncryptionService.KEY_BYTES_V4,
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
