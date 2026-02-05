/**
 * (C) Symbol Contributors 2022
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {expect} from "chai";

// internal dependencies
import {
    EncryptedPayload,
    EncryptionService,
} from "../../index";

const LegacyCryptoJS = require("crypto-js-411");

const legacyEncrypt = (data: string, password: string): EncryptedPayload => {
    const salt = LegacyCryptoJS.lib.WordArray.random(32);
    const key = LegacyCryptoJS.PBKDF2(password, salt, {
        keySize: 8,
        iterations: 2000,
    });
    const iv = LegacyCryptoJS.lib.WordArray.random(16);
    const encrypted = LegacyCryptoJS.AES.encrypt(data, key,  {
        iv: iv,
        padding: LegacyCryptoJS.pad.Pkcs7,
        mode: LegacyCryptoJS.mode.CBC,
    });
    const ciphertext = iv.toString() + encrypted.toString();
    const used_salt = LegacyCryptoJS.enc.Hex.stringify(salt);
    return new EncryptedPayload(ciphertext, used_salt);
};

const legacyEncryptWithParams = (
    data: string,
    password: string,
    saltHex: string,
    ivHex: string,
): EncryptedPayload => {
    const salt = LegacyCryptoJS.enc.Hex.parse(saltHex);
    const key = LegacyCryptoJS.PBKDF2(password, salt, {
        keySize: 8,
        iterations: 2000,
    });
    const iv = LegacyCryptoJS.enc.Hex.parse(ivHex);
    const encrypted = LegacyCryptoJS.AES.encrypt(data, key,  {
        iv: iv,
        padding: LegacyCryptoJS.pad.Pkcs7,
        mode: LegacyCryptoJS.mode.CBC,
    });
    const ciphertext = iv.toString() + encrypted.toString();
    const used_salt = LegacyCryptoJS.enc.Hex.stringify(salt);
    return new EncryptedPayload(ciphertext, used_salt);
};

const legacyDecrypt = (payload: EncryptedPayload, password: string): string => {
    const salt = LegacyCryptoJS.enc.Hex.parse(payload.salt);
    const priv = payload.ciphertext;
    const iv = LegacyCryptoJS.enc.Hex.parse(priv.substr(0, 32));
    const cipher = priv.substr(32);
    const key = LegacyCryptoJS.PBKDF2(password, salt, {
        keySize: 8,
        iterations: 2000,
    });
    const decrypted = LegacyCryptoJS.AES.decrypt(cipher, key, {
        iv: iv,
        padding: LegacyCryptoJS.pad.Pkcs7,
        mode: LegacyCryptoJS.mode.CBC,
    });
    return decrypted.toString(LegacyCryptoJS.enc.Utf8);
};

describe('EncryptionService -->', () => {

    describe('encrypt() should', () => {

        it('should create encrypted payload with salt', () => {
            // Arrange:
            const data = 'this will be encrypted.';
            const pass = 'password';

            // Act
            const encrypted = EncryptionService.encrypt(data, pass);

            // Assert
            expect(encrypted.ciphertext).to.not.be.undefined;
            expect(encrypted.salt).to.not.be.undefined;
            expect(encrypted.salt).to.have.lengthOf(64);
        });

        it('should create correctly sized ciphertext and salt', () => {
            // Arrange:
            const data = 'this will be encrypted.';
            const pass = 'password';

            // Act
            const encrypted = EncryptionService.encrypt(data, pass);

            // Assert
            expect(encrypted.ciphertext).to.have.lengthOf(76);
            expect(encrypted.salt).to.have.lengthOf(64);
        });

        it('should always create different ciphertext with salt', () => {
            // Arrange:
            const data = 'this will be encrypted.';
            const pass = 'password';

            // Act
            const encrypted_1 = EncryptionService.encrypt(data, pass);
            const encrypted_2 = EncryptionService.encrypt(data, pass);
            const encrypted_3 = EncryptionService.encrypt(data, pass);

            // Assert
            expect(encrypted_1).to.not.be.equal(encrypted_2);
            expect(encrypted_1).to.not.be.equal(encrypted_3);
            expect(encrypted_2).to.not.be.equal(encrypted_3);
            expect(encrypted_1.salt).to.have.lengthOf(64);
            expect(encrypted_2.salt).to.have.lengthOf(64);
            expect(encrypted_3.salt).to.have.lengthOf(64);
        });
    });

    describe('decrypt() should', () => {

        it('should decrypt ciphertext correctly', () => {
            // Arrange:
            const data = 'this will be encrypted';
            const pass = 'password';

            // Act
            const encrypted = EncryptionService.encrypt(data, pass);
            const decrypted = EncryptionService.decrypt(encrypted, pass);

            // Assert
            expect(decrypted).to.be.equal(data);
        });

        it('should decrypt payload encrypted by crypto-js@4.1.1', () => {
            // Arrange:
            const data = 'legacy encrypted payload';
            const pass = 'password';

            // Act
            const legacyEncrypted = legacyEncrypt(data, pass);
            const decrypted = EncryptionService.decrypt(legacyEncrypted, pass);

            // Assert
            expect(decrypted).to.be.equal(data);
        });
    });

    describe('compatibility should', () => {
        it('allow crypto-js@4.1.1 to decrypt new payloads', () => {
            // Arrange:
            const data = 'new encrypted payload';
            const pass = 'password';

            // Act
            const encrypted = EncryptionService.encrypt(data, pass);
            const decrypted = legacyDecrypt(encrypted, pass);

            // Assert
            expect(decrypted).to.be.equal(data);
        });

        it('match crypto-js@4.1.1 ciphertext with fixed params', () => {
            // Arrange:
            const data = 'deterministic payload';
            const pass = 'password';
            const saltHex = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
            const ivHex = '0f0e0d0c0b0a09080706050403020100';

            // Act
            const legacyEncrypted = legacyEncryptWithParams(data, pass, saltHex, ivHex);
            const nobleEncrypted = (EncryptionService as any)._encryptWithParams(data, pass, saltHex, ivHex);

            // Assert
            expect(nobleEncrypted.ciphertext).to.be.equal(legacyEncrypted.ciphertext);
            expect(nobleEncrypted.salt).to.be.equal(legacyEncrypted.salt);
        });
    });

});
