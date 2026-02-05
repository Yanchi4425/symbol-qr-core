# Symbol QR v3 実態調査（qr-library）

このドキュメントは、現行 qr-library の実装から読み取れる v3 QR の仕様（事実上の仕様）を整理したものです。
SIP Phase1 の「既存 v3 を規格化する」に向けたリサーチ結果として利用することを想定しています。

---

## 1. 共通フォーマット（全QR共通）

すべての QR は以下の共通 JSON フィールドを持つ。

```json
{
  "v": 3,
  "type": 1,
  "network_id": 104,
  "chain_id": "57F7D0E6B9...",
  "data": { }
}
```

- `v`: 固定値 `3`
- `type`: `QRCodeType` の数値（後述）
- `network_id`: ネットワーク種別（`NetworkType` の数値）
- `chain_id`: generation hash
- `data`: QRごとのペイロード

`v:3` は `QRCodeDataSchema.VERSION = 3` に固定されているため、現行実装では常に v3 が出力される。

---

## 2. QR種類一覧と JSON サンプル

### 2.1 type 定義（`QRCodeType`）

- `1`: AddContact（連絡先の公開鍵を共有する）
- `2`: ExportAccount（秘密鍵をエクスポートする）
- `3`: RequestTransaction（トランザクション作成依頼を共有する）
- `4`: RequestCosignature（アグリゲート署名の依頼を共有する）
- `5`: ExportMnemonic（ニーモニックをエクスポートする）
- `6`: ExportObject（任意の JSON を共有する）
- `7`: ExportAddress（アドレス帳用途の住所共有）
- `8`: SignedTransaction（署名済みトランザクションを共有する）
- `9`: CosignatureSignedTransaction（コサイン情報を共有する）

### 2.2 AddContact（type: 1）

用途: 連絡先情報（名前・公開鍵）の共有。

```json
{
  "v": 3,
  "type": 1,
  "network_id": 104,
  "chain_id": "57F7D0E6B9...",
  "data": {
    "name": "Alice",
    "publicKey": "ABCDEF..."
  }
}
```

### 2.3 ExportAccount（type: 2）

用途: アカウント秘密鍵のエクスポート（任意で暗号化）。

平文（暗号化なし）
```json
{
  "v": 3,
  "type": 2,
  "network_id": 104,
  "chain_id": "57F7D0E6B9...",
  "data": {
    "privateKey": "ABCDEF..."
  }
}
```

暗号化あり
```json
{
  "v": 3,
  "type": 2,
  "network_id": 104,
  "chain_id": "57F7D0E6B9...",
  "data": {
    "ciphertext": "<IV_HEX><CIPHERTEXT_BASE64>",
    "salt": "<SALT_HEX>"
  }
}
```

### 2.4 RequestTransaction（type: 3）

用途: トランザクションの署名依頼を共有。

```json
{
  "v": 3,
  "type": 3,
  "network_id": 104,
  "chain_id": "57F7D0E6B9...",
  "data": {
    "payload": "<TX_PAYLOAD_HEX>"
  }
}
```

### 2.5 RequestCosignature（type: 4）

用途: アグリゲートトランザクションのコサイン依頼。

```json
{
  "v": 3,
  "type": 4,
  "network_id": 104,
  "chain_id": "57F7D0E6B9...",
  "data": {
    "payload": "<AGGREGATE_TX_PAYLOAD_HEX>"
  }
}
```

### 2.6 ExportMnemonic（type: 5）

用途: ニーモニックのエクスポート（任意で暗号化）。

平文（暗号化なし）
```json
{
  "v": 3,
  "type": 5,
  "network_id": 104,
  "chain_id": "57F7D0E6B9...",
  "data": {
    "plainMnemonic": "legal winner thank year wave sausage worth useful legal winner thank yellow"
  }
}
```

暗号化あり
```json
{
  "v": 3,
  "type": 5,
  "network_id": 104,
  "chain_id": "57F7D0E6B9...",
  "data": {
    "ciphertext": "<IV_HEX><CIPHERTEXT_BASE64>",
    "salt": "<SALT_HEX>"
  }
}
```

### 2.7 ExportObject（type: 6）

用途: 任意 JSON の共有（アプリ依存）。

`data` は任意の JSON オブジェクト。

```json
{
  "v": 3,
  "type": 6,
  "network_id": 104,
  "chain_id": "57F7D0E6B9...",
  "data": {
    "any": "object",
    "is": "allowed"
  }
}
```

### 2.8 ExportAddress（type: 7）

用途: アドレス帳用の住所共有。

```json
{
  "v": 3,
  "type": 7,
  "network_id": 104,
  "chain_id": "57F7D0E6B9...",
  "data": {
    "name": "Alice",
    "address": "TALICE..."
  }
}
```

### 2.9 SignedTransaction（type: 8）

用途: 署名済みトランザクションの共有。

`payload` は `SignedTransaction.toDTO()` の戻り値。実体は SDK 実装に依存するオブジェクト。

```json
{
  "v": 3,
  "type": 8,
  "network_id": 104,
  "chain_id": "57F7D0E6B9...",
  "data": {
    "payload": {
      "payload": "<SIGNED_TX_PAYLOAD_HEX>",
      "hash": "<HASH_HEX>",
      "signerPublicKey": "<PUBKEY_HEX>",
      "type": 16724,
      "network": 104
    }
  }
}
```

### 2.10 CosignatureSignedTransaction（type: 9）

用途: コサイン情報の共有。

`payload` は `CosignatureSignedTransactionQR` の `singedTransaction` をそのまま格納。実体は SDK 実装に依存。

```json
{
  "v": 3,
  "type": 9,
  "network_id": 104,
  "chain_id": "57F7D0E6B9...",
  "data": {
    "payload": {
      "parentHash": "<HASH_HEX>",
      "signature": "<SIG_HEX>",
      "signerPublicKey": "<PUBKEY_HEX>"
    }
  }
}
```

---

## 3. 暗号化・復号の仕様（v3 / Legacy）

暗号化が行われる QR は以下。
- ExportAccount
- ExportMnemonic

暗号化アルゴリズム（実装準拠）

1. `salt` を 32 bytes 生成
2. PBKDF2 で鍵導出
   - hasher: SHA-1
   - iterations: 2000
   - keySize: 8 words（= 32 bytes, 256-bit）
3. `iv` を 16 bytes 生成
4. AES-CBC + PKCS7 padding で暗号化
5. 暗号文フォーマット
   - `ciphertext = HEX(iv) + AES(ciphertext)`
   - `salt` は HEX 文字列として別フィールドに格納

復号は同じパラメータで PBKDF2 を再計算し、AES-CBC で復号。

---

## 4. 追加で SIP に含めると良い情報

- `v:3` は実装固定値であり、現時点で明示仕様が存在しない
- `type` は整数値であり、文字列ではない
- 暗号化の有無は `data` に `ciphertext` と `salt` があるかどうかで判定される
- `SignedTransaction` / `CosignatureSignedTransaction` は payload の中身が SDK 実装依存
  - 仕様化する場合は JSON の shape を SIP 側で固定化する必要がある
  - 具体案: `payload` の必須キーを列挙して固定する
    - `SignedTransaction`: `payload`, `hash`, `signerPublicKey`, `type`, `network`
    - `CosignatureSignedTransaction`: `parentHash`, `signature`, `signerPublicKey`
  - 具体案: 文字列の表現形式（HEX/BASE64）とフィールド長を明記する
  - 具体案: SDK 依存を避けたいなら `payload` は raw 文字列（HEX）に限定し、付随情報は別フィールドとして仕様化する

---

## 5. Phase2 に向けた論点整理（参考）

### 5.1 推奨暗号アルゴリズム案（v4）

暗号化対象は v3 と同じく `ExportAccount` / `ExportMnemonic` を想定し、v4 では以下を推奨とする案。

- KDF: Argon2id
  - メモリコスト: 64 MiB 以上
  - 時間コスト: 2〜3 以上
  - 並列度: 1 以上
  - salt: 16 bytes 以上
- 代替: PBKDF2-HMAC-SHA256
  - iterations: 100,000 以上（環境に応じて引き上げ）
  - salt: 16 bytes 以上
- Cipher: AES-256-GCM
  - iv/nonce: 12 bytes
  - tag: 16 bytes

注意: WebCrypto 互換を重視する場合は PBKDF2 + AES-GCM の組合せが実装容易。

### 5.2 v4 で固定すべき仕様項目

- 暗号アルゴリズムだけでなく、暗号文フォーマット・KDF パラメータ・エンコード方式を固定する
- 旧方式と共存させるために `version`/`profile` の識別子を追加する
- 暗号化対象は現時点では ExportAccount / ExportMnemonic のみだが、SIP で範囲を明示する

### 5.3 各論点の具体的な対応例

- 仕様の固定例
  - `kdf`: `argon2id` / `pbkdf2-sha256` を列挙
  - `kdfParams`: `timeCost`, `memoryCost`, `parallelism`, `salt` を明示
  - `cipher`: `aes-256-gcm`
  - `cipherParams`: `iv`, `tag`, `ciphertext` の形式を固定

- バージョン識別子の例
  - `data` に `profile: "v4"` を追加
  - もしくは `v:4` に上げて v3/v4 を明示

- 暗号文フォーマットの例
  - JSON 形式
    ```json
    {
      "ciphertext": "<BASE64>",
      "iv": "<HEX>",
      "salt": "<HEX>",
      "tag": "<HEX>",
      "kdf": "argon2id",
      "kdfParams": {"timeCost": 3, "memoryCost": 65536, "parallelism": 1}
    }
    ```
  - もしくはバイナリ連結フォーマットを定義し、各フィールド長を固定

- 互換維持の例
  - `decrypt` 実装は `profile`/`v` を見て v3/v4 を判定
  - `profile` が無い場合は v3 として扱う
