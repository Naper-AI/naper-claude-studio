# Instalar o Naper Studio no meu Claude

> **Para você, criadora:** no app do Claude, abra a aba **Code**, escolha uma pasta qualquer (pode ser Documentos), cole este texto inteiro (ou arraste este arquivo para a conversa) e aperte **Enter**. Você não digita nenhum comando: só responde e aprova o que o Claude pedir.

---

## Para o Claude

Você vai instalar o **Naper Studio** para esta criadora de conteúdo e afiliada (TikTok Shop, Amazon, Shopee, Awin). Ela **não é técnica**: português do Brasil, frases curtas, um passo por vez, e **você faz tudo** (nunca peça para ela digitar comandos). Quando aparecer um pedido de permissão, diga em uma linha o que é e que ela pode aprovar.

Diga primeiro, em 2 linhas: "Vou instalar o Naper Studio na sua pasta Documentos e abrir o seu painel no navegador. Leva uns minutos; quando eu precisar de você, eu aviso."

### 1. Onde instalar
- A pasta é **`Documentos/Naper-Studio`** dentro da pasta do usuário. Windows: descubra a pasta Documentos real com PowerShell `[Environment]::GetFolderPath('MyDocuments')` (pode estar no OneDrive). Mac: `~/Documents/Naper-Studio`.
- Se a pasta **já existe** e tem `VERSAO` e `CLAUDE.md`: não baixe de novo; vá ao passo 3 (o painel atualiza sozinho).

### 2. Baixar o repositório
- **Com git** (`git --version` funciona): `git clone https://github.com/Naper-AI/naper-claude-studio "<Documentos>/Naper-Studio"`.
- **Sem git:** baixe o zip `https://github.com/Naper-AI/naper-claude-studio/archive/refs/heads/main.zip` e descompacte, deixando o conteúdo de `naper-claude-studio-main/` dentro de `<Documentos>/Naper-Studio`.
  - Windows (PowerShell): `Invoke-WebRequest -Uri <zip> -OutFile "$env:TEMP\naper-studio.zip"`, depois `Expand-Archive -Force "$env:TEMP\naper-studio.zip" "$env:TEMP\naper-studio"` e mova `"$env:TEMP\naper-studio\naper-claude-studio-main"` para `<Documentos>\Naper-Studio`.
  - Mac: `curl -L -o /tmp/naper-studio.zip <zip>`, `unzip -q -o /tmp/naper-studio.zip -d /tmp/naper-studio` e mova `/tmp/naper-studio/naper-claude-studio-main` para `~/Documents/Naper-Studio`.
- Não instale o git só para isso: sem git o Naper Studio se atualiza pelo zip.

### 3. Node, painel e onboarding
1. Confira `node --version` (precisa 20 ou mais). Faltou: peça licença e instale (Windows: `winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements` e recarregue o PATH na sessão; Mac: `brew install node`, ou o instalador oficial de nodejs.org se não houver Homebrew).
2. Suba o painel e abra no navegador dela: `node "<Documentos>/Naper-Studio/painel/iniciar.mjs" --abrir`. Diga: "Abri o seu painel no navegador. Ele mostra o que eu estou fazendo."
3. Marque no painel: `node "<Documentos>/Naper-Studio/painel/registrar.mjs" passo claude ok "Claude Code funcionando"` e `... passo repositorio ok "Instalado em Documentos/Naper-Studio"`.
4. **Leia `<Documentos>/Naper-Studio/CLAUDE.md` inteiro e siga o Onboarding de lá**, a partir do passo `ferramentas`. Rode os comandos com a pasta `Naper-Studio` como diretório (por exemplo `cd` para ela, ou caminhos absolutos).

### 4. Abrir no lugar certo
Esta conversa foi aberta em outra pasta. Quando o passo `naper` pedir uma conversa nova, ou no fim do onboarding, diga:
> "Daqui para frente, abra o Claude sempre na pasta **Naper-Studio**: na aba **Code**, escolha a pasta **Documentos › Naper-Studio** e comece uma conversa nova. Assim eu me atualizo sozinho e abro o seu painel toda vez."

Se o app pedir para **confiar na pasta**, diga que ela pode confiar (é o que deixa o Naper Studio se atualizar e abrir o painel sozinho).
