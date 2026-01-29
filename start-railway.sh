#!/bin/bash

# Panic sleep function to keep container alive for debugging
panic_sleep() {
    echo ""
    echo "❌ FATAL ERROR DETECTED"
    echo "😴 Entering panic sleep mode (1 hour) to allow log inspection..."
    echo "   Use Railway Shell to investigate: railway shell"
    sleep 3600
    exit 1
}

# Trap any errors and panic sleep
trap 'panic_sleep' ERR

set -e

echo "🦞 Moltbot Railway Startup Script"
echo "=================================="

# Verificar variáveis de ambiente obrigatórias
if [ -z "$OPENAI_API_KEY" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "❌ ERROR: Neither OPENAI_API_KEY nor ANTHROPIC_API_KEY is set!"
    panic_sleep
fi

# Configurar diretório de estado
STATE_DIR="/data"
export CONFIG_FILE="$STATE_DIR/moltbot.json"

echo "📝 Generating configuration using node script..."
node /app/generate-config.cjs || {
    echo "❌ Config generation failed!"
    panic_sleep
}

# Criar diretórios necessários
mkdir -p "$STATE_DIR/credentials"
mkdir -p "$STATE_DIR/media"
mkdir -p "$STATE_DIR/devices"

echo "🚀 Starting Moltbot Gateway..."
echo ""

# Iniciar o gateway com panic sleep em caso de falha
node /app/dist/index.js gateway \
  --allow-unconfigured \
  --bind 0.0.0.0 \
  --port ${PORT:-18789} \
  --verbose || {
    echo "❌ Gateway crashed with exit code $?"
    echo "😴 Sleeping for 1 hour to allow log inspection..."
    sleep 3600
}
