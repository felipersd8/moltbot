const fs = require('fs');

try {
  // Calcular flags booleanas
  const telegramEnabled = !!process.env.TELEGRAM_BOT_TOKEN;
  const allowList = parseAllowList(process.env.WHATSAPP_ALLOWLIST);

  const config = {
    gateway: {
      port: parseInt(process.env.PORT || '18789'),
      mode: 'local',
      bind: '0.0.0.0',
      auth: {
        mode: 'token',
        token: process.env.GATEWAY_AUTH_TOKEN || 'changeme'
      },
      // Trust Railway's proxy network (100.64.0.0/10 - Carrier-grade NAT)
      trustedProxies: ['100.64.0.0/10', '10.0.0.0/8']
    },
    channels: {
      whatsapp: {
        sendReadReceipts: true,
        dmPolicy: 'pairing',
        messagePrefix: process.env.WHATSAPP_MESSAGE_PREFIX || '[Bot]',
        allowFrom: allowList,
        groupPolicy: 'disabled'
      }
    },
    agents: {
      defaults: {
        model: {
          primary: process.env.AI_MODEL || 'openai/gpt-4o'
        },
        maxConcurrent: 4,
        subagents: {
          maxConcurrent: 8
        }
      }
    },
    auth: {
      profiles: {
        default: {
          provider: process.env.AI_PROVIDER || 'openai',
          openai: {
            apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || ''
          }
        }
      }
    },
    messages: {
      ackReactionScope: 'group-mentions'
    }
  };

  // Adicionar telegram se configurado
  if (telegramEnabled) {
    config.channels.telegram = {
      dmPolicy: 'pairing',
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      groupPolicy: 'allowlist',
      streamMode: 'partial'
    };
  }

  const configPath = process.env.CONFIG_FILE || '/data/moltbot.json';
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`✅ Config generated at ${configPath}`);
  console.log(JSON.stringify(config, null, 2));

} catch (err) {
  console.error('❌ Failed to generate config:', err);
  process.exit(1);
}

function parseAllowList(val) {
  if (!val) return ['*'];
  try {
    return JSON.parse(val);
  } catch (e) {
    console.warn(`⚠️ Failed to parse allowed list '${val}', treating as single entry`);
    return [val];
  }
}
