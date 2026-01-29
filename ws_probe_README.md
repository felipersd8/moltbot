# ws_probe.cjs - WebSocket Handshake Probe

## ✅ Status: PRONTO

Script Node.js para testar handshake WebSocket do Moltbot Gateway em produção.

## Uso

### Modo A: Token apenas

```bash
export CLAWDBOT_GATEWAY_TOKEN="your-valid-token-here"
node ws_probe.cjs
```

### Modo B: Device signature (Ed25519)

```bash
export CLAWDBOT_GATEWAY_TOKEN="your-token" # Opcional
node ws_probe.cjs --with-device
```

## O que foi corrigido

### 1. instanceId null → UUID string

**Antes**: `instanceId: null` causava erro de validação  
**Depois**: Sempre gera UUID v4 válido

### 2. client.id whitelist

**Antes**: `moltbot-control-ui` exigia HTTPS  
**Depois**: Usa `moltbot-probe` (whitelistado, sem restrição)

### 3. WebSocket API Node 22

**Antes**: `.on()` (EventEmitter API) falhava  
**Depois**: `.addEventListener()` (EventTarget API)

### 4. Device signature Ed25519

**Antes**: ECDSA P-256 com JWK object  
**Depois**: Ed25519 com base64url string (igual control-ui)

## Resultado dos Testes

### ✅ Modo A (test-token):

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "unauthorized: gateway token mismatch"
  }
}
```

**Status**: Schema validation PASSOU. Falha de auth é esperada com token inválido.

### ✅ Modo B (device signature):

```json
{
  "device": {
    "id": "8dffcd5ad3b746d89a5cfb4f009a4dd80d208a9f57f3adae6c0c0eb6910d4a75",
    "publicKey": "vFoA5TEtO5UtFYGTeszdfouMUaL9uUM9d5NsVa17IKw",
    "signature": "pxU7HsUT6Mt326GA1tJY_gJScxtRcDK6xCNtkDMT2Wj...",
    "signedAt": 1769660112227,
    "nonce": "06e5f5e8-fa6e-40de-ab4a-066fad1f872f"
  }
}
```

**Status**: Assinatura Ed25519 gerada com sucesso. Schema validation PASSOU.

## Próximos Passos

1. **Com token válido**: Export `CLAWDBOT_GATEWAY_TOKEN` correto e rode
2. **Sem token**: Modo B pode funcionar se o gateway aceitar device pairing
3. **Deploy**: Script roda em qualquer Node.js 22+ sem dependências npm

## Dependências

- ✅ Node.js 22+ (WebSocket e Ed25519 nativos)
- ✅ Nenhuma dependência npm necessária
- ✅ Crypto builtin (webcrypto para SHA-256, crypto para Ed25519)
