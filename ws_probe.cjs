#!/usr/bin/env node
/**
 * WebSocket Probe Script for Moltbot Gateway
 * 
 * Purpose: Debug and test WebSocket handshake with proper connect parameters
 * 
 * Usage:
 *   export CLAWDBOT_GATEWAY_TOKEN="your_token"
 *   node ws_probe.cjs [--with-device]
 * 
 * Modes:
 *   - Default (Mode A): Token-based auth without device signature
 *   - --with-device (Mode B): Full device signature (ECDSA P-256)
 */

const { webcrypto } = require('node:crypto');
const { subtle } = webcrypto;

// === Configuration ===
const GATEWAY_URL = 'wss://moltbot-production-50a1.up.railway.app/';
const GATEWAY_TOKEN = process.env.CLAWDBOT_GATEWAY_TOKEN;
const WITH_DEVICE = process.argv.includes('--with-device');

// === Utility Functions ===
function base64UrlEncode(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return Buffer.from(binary, 'binary')
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/g, '');
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function fingerprintPublicKey(publicKeyBytes) {
  const hashBuffer = await subtle.digest('SHA-256', publicKeyBytes);
  return bytesToHex(new Uint8Array(hashBuffer));
}

function generateInstanceId() {
  // Generate a unique instance ID (UUID v4 format)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function maskToken(token) {
  if (!token) return '<not set>';
  if (token.length < 12) return '***';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

async function generateDeviceKeys() {
  // Use Ed25519 (same as control-ui with @noble/ed25519)
  // For Node.js, we'll use the built-in crypto module with Ed25519
  try {
    const { generateKeyPairSync } = require('node:crypto');
    
    const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'der' }
    });

    // Extract raw keys (Ed25519 raw public key is 32 bytes, starts at offset 12 in SPKI)
    const publicKeyRaw = publicKey.slice(-32);
    const privateKeyRaw = privateKey.slice(-32);

    // Generate device ID as fingerprint of public key
    const deviceId = await fingerprintPublicKey(publicKeyRaw);

    return {
      deviceId,
      publicKey: base64UrlEncode(publicKeyRaw),
      privateKey: base64UrlEncode(privateKeyRaw),
      privateKeyDER: privateKey  // Store full DER key for signing
    };
  } catch (error) {
    console.error('❌ Failed to generate Ed25519 keys:', error.message);
    throw error;
  }
}

function buildSigningString(params, nonce) {
  const {
    version = 'v2',
    deviceId,
    clientId,
    clientMode,
    role,
    scopes,
    signedAt,
    token
  } = params;

  // Signing string format from control-ui:
  // [version, deviceId, clientId, clientMode, role, scopesCSV, signedAtMs, tokenOrEmpty]
  // + (if v2) [nonce]
  
  const scopesCSV = scopes.join(',');
  const tokenOrEmpty = token || '';
  
  let parts = [
    version,
    deviceId,
    clientId,
    clientMode,
    role,
    scopesCSV,
    String(signedAt),
    tokenOrEmpty
  ];

  if (version === 'v2' && nonce) {
    parts.push(nonce);
  }

  return parts.join('|');
}

async function signMessage(message, privateKeyDER) {
  // For Ed25519, use Node.js crypto.sign with proper key
  const { sign, createPrivateKey } = require('node:crypto');
  
  const data = Buffer.from(message, 'utf-8');
  
  // Create proper private key object from DER
  const privateKeyObject = createPrivateKey({
    key: privateKeyDER,
    format: 'der',
    type: 'pkcs8'
  });
  
  // Sign the data
  const signature = sign(null, data, privateKeyObject);

  return base64UrlEncode(new Uint8Array(signature));
}

// === WebSocket Client ===
class MoltbotWSProbe {
  constructor() {
    this.ws = null;
    this.connectNonce = null;
    this.reqId = 0;
    this.device = null;
  }

  generateReqId() {
    return `probe-${++this.reqId}-${Date.now()}`;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log('\n🔌 Connecting to:', GATEWAY_URL);
      console.log('🔑 Token:', maskToken(GATEWAY_TOKEN));
      console.log('🔧 Mode:', WITH_DEVICE ? 'B (with device signature)' : 'A (token only)');
      
      // Use native WebSocket from Node 22 (undici)
      this.ws = new WebSocket(GATEWAY_URL, {
        headers: {
          'Origin': 'https://moltbot-production-50a1.up.railway.app'
        }
      });

      this.ws.addEventListener('open', () => {
        console.log('✅ WebSocket connected\n');
        resolve();
      });

      this.ws.addEventListener('message', (event) => {
        this.handleMessage(event.data);
      });

      this.ws.addEventListener('error', (error) => {
        console.error('❌ WebSocket error:', error.message || 'Connection failed');
        reject(error);
      });

      this.ws.addEventListener('close', (event) => {
        console.log(`\n🔌 Connection closed: ${event.code} - ${event.reason || 'No reason'}`);
      });
    });
  }

  async handleMessage(data) {
    try {
      const msg = JSON.parse(data);
      console.log('📥 Received:', JSON.stringify(msg, null, 2));

      if (msg.type === 'event' && msg.event === 'connect.challenge') {
        this.connectNonce = msg.payload?.nonce;
        console.log(`\n🔐 Challenge nonce: ${this.connectNonce}`);
        
        // Wait a bit before sending connect
        setTimeout(() => {
          this.sendConnect();
        }, 100);
      } else if (msg.type === 'res') {
        console.log('\n✅ Connect response:', JSON.stringify(msg, null, 2));
        
        if (msg.ok) {
          console.log('\n🎉 SUCCESS! Handshake completed.');
        } else {
          console.log('\n❌ FAILED:', msg.error?.message || 'Unknown error');
        }
        
        // Close after response
        setTimeout(() => {
          this.ws?.close();
        }, 500);
      }
    } catch (error) {
      console.error('❌ Failed to parse message:', error.message);
      console.log('Raw data:', data);
    }
  }

  async sendConnect() {
    console.log('\n📤 Preparing connect request...\n');

    const instanceId = generateInstanceId();
    const clientId = 'moltbot-probe';  // Whitelisted ID from CLIENT_IDS enum
    const clientMode = 'webchat';
    const role = 'operator';
    const scopes = ['operator.admin', 'operator.approvals', 'operator.pairing'];

    // Base params
    const params = {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: clientId,
        version: 'dev',
        platform: process.platform,
        mode: clientMode,
        instanceId: instanceId  // ✅ Always a string, never null
      },
      role: role,
      scopes: scopes,
      userAgent: `Node.js ${process.version}`,
      locale: 'en-US'
    };

    // Add auth if token exists
    if (GATEWAY_TOKEN) {
      params.auth = {
        token: GATEWAY_TOKEN
      };
    }

    // Mode B: Add device signature
    if (WITH_DEVICE && this.connectNonce) {
      console.log('🔐 Generating device signature...');
      
      // Generate keys if not already done
      if (!this.device) {
        this.device = await generateDeviceKeys();
        console.log(`📱 Device ID: ${this.device.deviceId}`);
        console.log(`🔑 Public Key (base64url): ${this.device.publicKey}`);
      }

      const signedAt = Date.now();
      
      // Build signing string
      const signingString = buildSigningString({
        version: 'v2',
        deviceId: this.device.deviceId,
        clientId: clientId,
        clientMode: clientMode,
        role: role,
        scopes: scopes,
        signedAt: signedAt,
        token: GATEWAY_TOKEN || ''
      }, this.connectNonce);

      console.log(`📝 Signing string:\n${signingString}\n`);

      // Sign
      const signature = await signMessage(signingString, this.device.privateKeyDER);
      console.log(`✍️  Signature (base64url): ${signature.slice(0, 40)}...\n`);

      // Add device to params
      params.device = {
        id: this.device.deviceId,
        publicKey: this.device.publicKey,  // ✅ Base64url string, not JWK
        signature: signature,
        signedAt: signedAt,
        nonce: this.connectNonce
      };
    }

    const request = {
      type: 'req',
      id: this.generateReqId(),
      method: 'connect',
      params: params
    };

    // Mask token in logs
    const logRequest = JSON.parse(JSON.stringify(request));
    if (logRequest.params?.auth?.token) {
      logRequest.params.auth.token = maskToken(logRequest.params.auth.token);
    }

    console.log('📤 Sending connect request:');
    console.log(JSON.stringify(logRequest, null, 2));
    console.log('');

    this.ws.send(JSON.stringify(request));
  }

  async run() {
    try {
      await this.connect();
    } catch (error) {
      console.error('❌ Failed to run probe:', error.message);
      process.exit(1);
    }
  }
}

// === Main ===
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     Moltbot WebSocket Handshake Probe                 ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  if (!GATEWAY_TOKEN && WITH_DEVICE) {
    console.warn('⚠️  Warning: No CLAWDBOT_GATEWAY_TOKEN set, device signature will use empty token');
  }

  const probe = new MoltbotWSProbe();
  await probe.run();
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
