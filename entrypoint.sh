#!/bin/bash
# Entrypoint wrapper para garantir permissões no volume antes de iniciar

set -e

echo "🔧 Moltbot Entrypoint - Volume Permission Fix"
echo "=============================================="

# Diretório do volume
DATA_DIR="/data"

# Verificar se o volume está montado
if [ ! -d "$DATA_DIR" ]; then
    echo "❌ ERROR: $DATA_DIR does not exist!"
    echo "   Volume may not be mounted correctly."
    exit 1
fi

echo "✅ Volume mounted at $DATA_DIR"

# Criar todos os diretórios necessários com permissões corretas
echo "📁 Creating state directories..."

DIRS=(
    "$DATA_DIR/.clawdbot"
    "$DATA_DIR/.moltbot"
    "$DATA_DIR/credentials"
    "$DATA_DIR/media"
    "$DATA_DIR/devices"
)

for dir in "${DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        echo "   Creating: $dir"
        mkdir -p "$dir" || {
            echo "❌ Failed to create $dir"
            # Tentar com sudo se disponível
            if command -v sudo &> /dev/null; then
                echo "   Trying with elevated permissions..."
                sudo mkdir -p "$dir" && sudo chmod 777 "$dir"
            fi
        }
    else
        echo "   ✓ Exists: $dir"
    fi
done

# Garantir permissões de escrita recursivamente
echo "🔐 Setting permissions..."
chmod -R 777 "$DATA_DIR" 2>/dev/null || {
    echo "⚠️  Could not set permissions (may need root)"
    echo "   Checking writability..."
    
    # Testar se consegue escrever
    TEST_FILE="$DATA_DIR/.write_test"
    if touch "$TEST_FILE" 2>/dev/null; then
        rm -f "$TEST_FILE"
        echo "   ✅ Directory is writable"
    else
        echo "   ❌ Directory is NOT writable!"
        echo "   This will likely cause errors."
        
        # Mostrar informações de debug
        echo ""
        echo "Debug info:"
        echo "  Current user: $(whoami)"
        echo "  UID: $(id -u)"
        echo "  GID: $(id -g)"
        echo "  Volume owner: $(stat -c '%U:%G' $DATA_DIR 2>/dev/null || echo 'unknown')"
        echo "  Volume perms: $(stat -c '%a' $DATA_DIR 2>/dev/null || echo 'unknown')"
    fi
}

echo "✅ Volume setup complete"
echo ""

# Executar o script de startup original
exec "$@"
