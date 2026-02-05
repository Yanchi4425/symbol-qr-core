# Symbol QR Encryption — Findings & SIP Proposal (Draft)

This document summarizes the current de-facto encryption behavior used by the Symbol qr-library,
analyzes the differences introduced by crypto-js updates, and proposes how this should be
standardized via SIP without tying the specification to any particular implementation.

------------------------------------------------------------------------------

## 1. Current De-facto Encryption Behavior (Observed in qr-library)

The following behavior is extracted directly from the existing EncryptionService
used by the qr-library.

Encryption flow:

1. Generate random 32-byte salt
2. Derive key using PBKDF2 with:
   - hasher: SHA-1
   - iterations: 2000
   - keySize: 8 words (256-bit)
3. Generate random 16-byte IV
4. Encrypt data using:
   - AES
   - Mode: CBC
   - Padding: PKCS7
5. Payload format:
   ciphertext = HEX(iv) + AES(ciphertext)
   salt stored separately as HEX

Decryption reverses the process using the same parameters.

Important observation:

This is NOT formally specified anywhere.  
This behavior exists only because qr-library implemented it this way.

This is the root cause of long-term incompatibility and maintenance issues.

------------------------------------------------------------------------------

## 2. crypto-js 4.1.1 Behavior (Legacy Reality)

At the time qr-library was written, crypto-js 4.1.1 had the following practical defaults:

- PBKDF2 default hasher: SHA-1
- AES default mode: CBC
- Padding: PKCS7

qr-library explicitly depended on these behaviors.

This effectively created a "hidden cryptographic specification"
without ever declaring it as one.

This is what must be standardized as the Legacy Profile.

------------------------------------------------------------------------------

## 3. crypto-js 4.2.0 Behavior Change (Breaking Compatibility)

crypto-js 4.2.0 introduced security changes:

- PBKDF2 default hasher changed from SHA-1 to SHA-256
- Security advisory (CVE-2023-46233) recommending stronger KDF parameters
- No backward compatibility guarantee for derived keys

Result:

The same qr-library code running under 4.2.0 can no longer decrypt
payloads created under 4.1.1 without explicit configuration.

This is the exact scenario SIP should prevent.

------------------------------------------------------------------------------

## 4. 2026 Cryptographic Reality (Modern Expectations)

crypto-js is no longer considered a modern cryptographic reference.

Modern expectations for password-based encryption:

- KDF:
  - Argon2id (preferred), or
  - PBKDF2 with HMAC-SHA-256/512 and very high iterations

- Cipher:
  - AES-GCM (AEAD, authenticated encryption)

- Hash/MAC:
  - SHA-256 / SHA-3 / BLAKE2

Libraries such as noble and WebCrypto provide reliable modern primitives.

------------------------------------------------------------------------------

## 5. Core Problem Identified

qr-library mixed:

- QR payload format
- Cryptographic parameters
- Implementation details (node-canvas, Node v12, crypto-js behavior)

into one inseparable piece of code.

This must be separated by specification.

------------------------------------------------------------------------------

## 6. SIP Proposal Structure

The goal is NOT to standardize a library.

The goal is to standardize the cryptographic behavior and payload rules
that libraries must follow.

------------------------------------------------------------------------------

### SIP-A: Symbol QR Payload & Legacy Cryptographic Behavior

Purpose:

Canonicalize the currently deployed behavior as an official specification.

Defines:

- JSON payload structure stored in QR
- Encoding rules
- Encryption behavior equivalent to:
  PBKDF2(SHA-1, 2000 iterations) + AES-CBC + PKCS7
- Payload concatenation rule: HEX(iv) + ciphertext, salt separate

Notes:

No implementation guidance. Only behavior.

------------------------------------------------------------------------------

### SIP-B: Symbol QR Modern Cryptographic Profile

Purpose:

Define a forward-looking, secure cryptographic profile.

Defines:

- Versioned profile identifier inside payload
- KDF: Argon2id OR PBKDF2(SHA-256, high iterations)
- Cipher: AES-GCM
- Hash/MAC: SHA-256 or better

This profile coexists with SIP-A, not replaces it.

------------------------------------------------------------------------------

## 7. What is NOT part of SIP

The following MUST NOT be included in SIP:

- Fallback implementations
- Library choices (crypto-js, noble, etc.)
- Node/Browser/Runtime concerns
- Rendering concerns (node-canvas)

Those belong to library implementations.

------------------------------------------------------------------------------

## 8. Intended Outcome

After SIP adoption:

- Any implementation in JS, Rust, Go, mobile, etc. can interoperate
- qr-library is no longer a single point of failure
- Future crypto upgrades become new SIP profiles, not breaking changes
- A modern forked library can act as a reference implementation without being the standard itself

------------------------------------------------------------------------------

## 9. Key SIP Motivation Sentence

The current qr-library tightly couples implementation details with the QR
payload definition, making long-term interoperability and maintenance impossible.
This SIP separates the QR payload and cryptographic behavior from any specific implementation for the first time.
