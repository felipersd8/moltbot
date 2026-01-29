#!/bin/bash
# Railway Deployment Helper Script

set -e

echo "🦞 Moltbot Railway Deployment Helper"
echo "====================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Função para gerar token
generate_token() {
    if command_exists openssl; then
        openssl rand -hex 32
    else
        cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1
    fi
}

# Menu principal
echo "Choose an option:"
echo "1) Test locally with Docker"
echo "2) Deploy to Railway (via CLI)"
echo "3) Generate secure GATEWAY_AUTH_TOKEN"
echo "4) View deployment checklist"
echo "5) Exit"
echo ""
read -p "Option: " option

case $option in
    1)
        echo ""
        echo -e "${YELLOW}Testing locally with Docker...${NC}"
        
        # Verificar se .env.railway existe
        if [ ! -f .env.railway ]; then
            echo -e "${RED}Error: .env.railway not found!${NC}"
            echo "Creating from example..."
            cp .env.railway.example .env.railway
            echo -e "${YELLOW}Please edit .env.railway with your credentials and run again${NC}"
            exit 1
        fi
        
        # Carregar variáveis
        export $(cat .env.railway | grep -v '^#' | xargs)
        
        echo "Building Docker image..."
        docker-compose -f docker-compose.railway.yml build
        
        echo ""
        echo -e "${GREEN}Starting Moltbot container...${NC}"
        docker-compose -f docker-compose.railway.yml up -d
        
        echo ""
        echo -e "${GREEN}✅ Container started!${NC}"
        echo ""
        echo "Access the panel at: http://localhost:18789"
        echo "Auth token: ${GATEWAY_AUTH_TOKEN}"
        echo ""
        echo "View logs: docker-compose -f docker-compose.railway.yml logs -f"
        echo "Stop: docker-compose -f docker-compose.railway.yml down"
        ;;
        
    2)
        echo ""
        echo -e "${YELLOW}Deploying to Railway...${NC}"
        
        # Verificar Railway CLI
        if ! command_exists railway; then
            echo -e "${RED}Error: Railway CLI not installed!${NC}"
            echo "Install with: npm install -g @railway/cli"
            exit 1
        fi
        
        # Login
        echo "Checking Railway authentication..."
        railway whoami || railway login
        
        # Verificar se projeto existe
        if [ ! -d .railway ]; then
            echo ""
            echo "No Railway project found. Creating new project..."
            railway init
        fi
        
        echo ""
        echo -e "${YELLOW}Deploying...${NC}"
        railway up --detach
        
        echo ""
        echo -e "${GREEN}✅ Deployment started!${NC}"
        echo ""
        echo "View logs: railway logs"
        echo "Open dashboard: railway open"
        echo "Get domain: railway domain"
        ;;
        
    3)
        echo ""
        echo -e "${YELLOW}Generating secure token...${NC}"
        TOKEN=$(generate_token)
        echo ""
        echo -e "${GREEN}Your secure GATEWAY_AUTH_TOKEN:${NC}"
        echo ""
        echo "  $TOKEN"
        echo ""
        echo "Add this to your Railway environment variables:"
        echo "  railway variables set GATEWAY_AUTH_TOKEN=$TOKEN"
        echo ""
        ;;
        
    4)
        echo ""
        echo "📋 Deployment Checklist:"
        echo ""
        echo "Pre-deployment:"
        echo "  [ ] Created .env.railway with credentials"
        echo "  [ ] Tested locally with Docker"
        echo "  [ ] Generated GATEWAY_AUTH_TOKEN"
        echo "  [ ] Created Telegram bot via @BotFather"
        echo "  [ ] Have OPENAI_API_KEY or ANTHROPIC_API_KEY"
        echo ""
        echo "Railway setup:"
        echo "  [ ] Railway CLI installed (npm install -g @railway/cli)"
        echo "  [ ] Logged in to Railway (railway login)"
        echo "  [ ] Created project (railway init)"
        echo "  [ ] Configured variables (railway variables set ...)"
        echo "  [ ] Created volume for /root/.clawdbot"
        echo "  [ ] Deployed (railway up)"
        echo ""
        echo "Post-deployment:"
        echo "  [ ] Generated domain (railway domain)"
        echo "  [ ] Accessed panel web"
        echo "  [ ] Connected WhatsApp via QR Code"
        echo "  [ ] Tested Telegram bot"
        echo "  [ ] Verified logs (railway logs)"
        echo ""
        ;;
        
    5)
        echo "Goodbye! 🦞"
        exit 0
        ;;
        
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac
