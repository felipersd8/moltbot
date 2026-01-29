# 🦞 Moltbot Railway Deployment Guide

Deploy completo do Moltbot no Railway com painel de controle acessível.

## 🚀 Quick Start

### 1️⃣ Preparação Local

```bash
cd /home/felipe/Documentos/apps/moltbot

# Criar arquivo de variáveis de ambiente
cp .env.railway.example .env.railway

# Editar e preencher suas credenciais
nano .env.railway
```

### 2️⃣ Teste Local com Docker

Antes de fazer deploy, teste localmente:

```bash
# Carregar variáveis de ambiente
export $(cat .env.railway | xargs)

# Build e executar
docker-compose -f docker-compose.railway.yml up --build

# Acessar painel
open http://localhost:18789
```

### 3️⃣ Deploy no Railway

#### Opção A: Via GitHub (Recomendado)

```bash
# 1. Criar branch de deploy
git checkout -b railway-deploy

# 2. Adicionar arquivos
git add Dockerfile.railway railway.json start-railway.sh docker-compose.railway.yml .env.railway.example
git commit -m "Add Railway deployment configuration"

# 3. Push para GitHub
git push origin railway-deploy

# 4. No Railway Dashboard:
# - New Project > Deploy from GitHub
# - Selecionar repositório moltbot/moltbot
# - Selecionar branch railway-deploy
# - Railway detectará o Dockerfile automaticamente
```

#### Opção B: Via Railway CLI

```bash
# 1. Instalar CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Criar projeto
railway init

# 4. Deploy
railway up --detach
```

### 4️⃣ Configurar Variáveis de Ambiente no Railway

No Railway Dashboard > Variables, adicione:

**Obrigatórias:**

```bash
# AI Provider (escolha um)
OPENAI_API_KEY=sk-proj-...
# OU
ANTHROPIC_API_KEY=sk-ant-...

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABCDEF...

# Segurança do painel
GATEWAY_AUTH_TOKEN=$(openssl rand -hex 32)  # Gere um token forte
```

**Opcionais:**

```bash
AI_PROVIDER=openai  # ou: anthropic
AI_MODEL=openai/gpt-4o  # ou: anthropic/claude-opus-4
WHATSAPP_MESSAGE_PREFIX=[Meu Bot]
WHATSAPP_ALLOWLIST=["*"]
```

### 5️⃣ Configurar Volume Persistente

**IMPORTANTE:** Para WhatsApp, você precisa de um volume persistente!

No Railway Dashboard:

1. Ir em **Storage** > **New Volume**
2. **Mount Path:** `/root/.clawdbot`
3. **Size:** 1GB (suficiente)
4. Salvar

### 6️⃣ Configurar Domínio

```bash
# Via CLI
railway domain

# Ou no Dashboard: Settings > Networking > Generate Domain
```

Você receberá algo como: `https://moltbot-production-abc123.up.railway.app`

### 7️⃣ Acessar Painel de Controle

1. Abrir URL do Railway
2. Fazer login com o `GATEWAY_AUTH_TOKEN` que você configurou
3. Você verá o dashboard do Moltbot!

---

## 📱 Configurar Canais

### WhatsApp

1. No painel web, ir em **Channels** > **WhatsApp**
2. Clicar em **Login** ou **Connect**
3. Um QR Code aparecerá na tela
4. Abrir WhatsApp > **Configurações** > **Aparelhos conectados**
5. Escanear o QR Code
6. Aguardar confirmação ✅

**Importante:** As credenciais são salvas no volume persistente. Não delete o volume!

### Telegram

Já configurado automaticamente! Só precisa:

1. Procurar seu bot pelo username no Telegram
2. Enviar `/start`
3. Pronto! 🎉

---

## 🔧 Comandos Úteis

### Railway CLI

```bash
# Ver logs em tempo real
railway logs

# Ver status
railway status

# Abrir painel Railway
railway open

# Abrir aplicação
railway open --service

# Redeploy
railway up

# Ver variáveis
railway variables

# Adicionar variável
railway variables set KEY=value
```

### Docker Local

```bash
# Build
docker-compose -f docker-compose.railway.yml build

# Executar
docker-compose -f docker-compose.railway.yml up -d

# Ver logs
docker-compose -f docker-compose.railway.yml logs -f

# Parar
docker-compose -f docker-compose.railway.yml down

# Limpar volumes
docker-compose -f docker-compose.railway.yml down -v
```

---

## 🐛 Troubleshooting

### Bot não inicia

```bash
# Ver logs detalhados
railway logs --tail 100

# Verificar se todas as variáveis estão configuradas
railway variables
```

**Checklist:**

- [ ] `OPENAI_API_KEY` ou `ANTHROPIC_API_KEY` está configurado?
- [ ] `TELEGRAM_BOT_TOKEN` está correto?
- [ ] Volume está montado em `/root/.clawdbot`?
- [ ] Porta 18789 está exposta?

### WhatsApp não conecta

1. Verificar se volume persistente está configurado
2. Tentar reconectar via painel web
3. Ver logs: `railway logs | grep whatsapp`
4. Se necessário, deletar credenciais antigas:
   ```bash
   # No Railway Shell
   rm -rf /root/.clawdbot/credentials/whatsapp*
   ```

### Painel não acessível

1. Verificar se porta está exposta: `railway variables | grep PORT`
2. Verificar domínio: `railway domain`
3. Verificar se `GATEWAY_AUTH_TOKEN` está configurado
4. Tentar acessar `/health` primeiro: `curl https://seu-projeto.railway.app/health`

### Erro de build

```bash
# Verificar logs de build
railway logs --deployment

# Build localmente para testar
docker build -f Dockerfile.railway -t moltbot-test .
```

---

## 💰 Custos Estimados

**Railway Hobby Plan ($5/mês):**

- CPU: ~0.5 vCPU
- RAM: ~512MB
- Storage: 1GB (volume)
- Banda: Ilimitada (fair use)

**Total:** ~$5-7/mês (dependendo do uso)

---

## 🔒 Segurança

### Recomendações

1. **GATEWAY_AUTH_TOKEN:**
   - Use token forte: `openssl rand -hex 32`
   - Não compartilhe publicamente
   - Troque periodicamente

2. **Allowlist do WhatsApp:**
   - Evite usar `["*"]` em produção
   - Configure lista específica de números autorizados

3. **Backup:**
   - Faça backup periódico do volume
   - Exporte credenciais importantes
   - Documente tokens e configurações

4. **Logs:**
   - Monitore logs regularmente
   - Configure alertas para erros
   - Revise acessos suspeitos

---

## 📊 Monitoramento

### Métricas Railway

No Dashboard:

- **CPU Usage**: Deve ficar < 50% em idle
- **Memory**: ~512MB normal
- **Network**: Depende do uso

### Logs Importantes

```bash
# Erros
railway logs | grep ERROR

# WhatsApp
railway logs | grep whatsapp

# Telegram
railway logs | grep telegram

# Conexões
railway logs | grep gateway
```

### Alertas (Railway Pro)

Configure alertas para:

- High CPU (> 80%)
- High Memory (> 90%)
- Deployment failures
- Health check failures

---

## 🎯 Próximos Passos

Após deploy bem-sucedido:

1. **Testar funcionalidades:**
   - Enviar mensagem via WhatsApp
   - Testar comandos no Telegram
   - Explorar painel web

2. **Customizar:**
   - Ajustar allowlists
   - Configurar mensagem de boas-vindas
   - Adicionar skills customizadas

3. **Otimizar:**
   - Monitorar uso de recursos
   - Ajustar rate limiting se necessário
   - Configurar backups automáticos

4. **Expandir:**
   - Adicionar Discord/Slack
   - Criar comandos customizados
   - Integrar com APIs externas

---

## 📚 Links Úteis

- **Railway Dashboard:** https://railway.app/dashboard
- **Railway Docs:** https://docs.railway.app
- **Moltbot Docs:** https://docs.molt.bot
- **GitHub Issues:** https://github.com/moltbot/moltbot/issues

---

## ✅ Checklist de Deploy

- [ ] Arquivos criados (Dockerfile.railway, etc)
- [ ] Variáveis de ambiente configuradas
- [ ] Volume persistente criado
- [ ] Deploy realizado com sucesso
- [ ] Domínio configurado
- [ ] Painel web acessível
- [ ] WhatsApp conectado via QR Code
- [ ] Telegram funcionando
- [ ] Testes de mensagens realizados
- [ ] Backup configurado
- [ ] Monitoramento ativo

🎉 **Pronto! Seu Moltbot está rodando no Railway!**
