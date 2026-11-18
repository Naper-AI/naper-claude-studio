# Naper Studio · Claude + Naper

Deixa o **Claude Code** (no app do Claude para Windows ou Mac) pronto para trabalhar com a **Naper Shop Creator**: análise do perfil, reedição dos vídeos que mais venderam, conteúdo para todas as redes, publicação pela Naper e WhatsApp, com um **painel no navegador** que mostra tudo o que o Claude está fazendo.

Qualquer pessoa pode baixar. Só o time Naper atualiza.

---

## Para você, criadora (3 passos, nenhum comando)

1. **Tenha o Claude Pro ou Max** e o **app do Claude no computador** ([claude.com/download](https://claude.com/download)), com a sua conta entrando.
2. No app, abra a aba **Code** e escolha **uma pasta qualquer** (pode ser Documentos).
3. **Cole o texto do arquivo [`INSTALAR.md`](INSTALAR.md)** na conversa (ou arraste o arquivo para lá) e aperte **Enter**.

Pronto. O Claude instala tudo, abre o seu **painel** no navegador e vai marcando cada item. Você só:
- aprova quando ele pedir permissão;
- conecta a Naper (no app do Claude: **Plugins › Adicionar › Adicionar conector personalizado** · Nome **Naper** · URL `https://api.naper.ai/mcp` · **Continuar** · **Adicionar** · **Continuar conectando** · entrar na Naper · **Autorizar**);
- responde umas perguntas sobre a sua marca.

Depois da validação, o painel mostra a **Biblioteca** com 4 funções:
1. **Faça uma análise do meu perfil**
2. **Use os meus brutos e crie conteúdo para todas as redes**
3. **Use os meus vídeos campeões e gere novos**
4. **Me passe as melhores oportunidades de produtos e marcas para o meu perfil**

Escolha, preencha o briefing e clique em **Copiar pedido** (cole no Claude) ou **Mandar para o Claude** (escreva "vai" no Claude). Na **Galeria** ficam os itens criados e em **Ver o editor** você acompanha a edição ao vivo.

Daqui para frente, abra o Claude sempre na pasta **Documentos › Naper-Studio**: ele se atualiza sozinho e abre o painel.

**Seus dados ficam no seu computador.** Vídeos, marca, relatórios e o estado do painel nunca vão para este repositório. Nada é publicado, enviado, gasto ou apagado sem o seu "pode".

---

## Para o time Naper

### Como funciona
- `INSTALAR.md`: o único arquivo que a criadora entrega ao Claude. Clona (ou baixa o zip) para `Documentos/Naper-Studio`, sobe o painel e manda seguir o `CLAUDE.md`.
- `CLAUDE.md`: o que o Claude faz em toda sessão (atualizar, painel, onboarding, Biblioteca) e as regras de segurança.
- `.claude/settings.json`: hook `SessionStart` → `node painel/iniciar.mjs` (atualiza com `git pull --ff-only` ou, sem git, pelo zip comparando `VERSAO`; sobe o painel em segundo plano; abre `http://localhost:4747` uma vez por sessão; conta ao Claude onde o onboarding está; sempre sai com 0). Hook `UserPromptSubmit` → `node painel/pedido.mjs` (entrega o pedido do botão "Mandar para o Claude").
- `.mcp.json`: o conector da Naper (`https://api.naper.ai/mcp`) para quem usa o terminal (`/mcp` › naper › Authenticate). No app, o caminho é o conector personalizado.
- `.claude/skills/naper-studio/`: as 4 funções passo a passo (com as ferramentas reais do conector) e as tarefas automáticas.
- `painel/`: `servidor.mjs` (Node puro, sem npm, só em 127.0.0.1:4747), `iniciar.mjs`, `atualizar.mjs`, `registrar.mjs` (o Claude marca passos e trabalhos), `pedido.mjs`, `lib/estado.mjs`, `web/` (onboarding, Biblioteca, Galeria, Ver o editor).
- `kit-reedicao/`: transcrição local (whisper.cpp), reedição só com cortes (`reeditar.mjs`, registra o progresso no painel) e folha de quadros.
- Estado (fora do git): `estado/onboarding.json`, `estudio/trabalhos.json`, `estudio/trabalhos/<id>/progresso.json`, `marca/`, `relatorios/`.

### Como atualizar
1. Edite, teste localmente (`node painel/servidor.mjs` e abra `http://localhost:4747`).
2. **Suba o número em `VERSAO`** (ex.: `1.0.0` → `1.0.1`). Sem isso, quem instalou sem git não recebe a atualização.
3. Commit e push na `main`. Na próxima vez que a criadora abrir o Claude na pasta, o hook atualiza e reinicia o painel se a versão mudou.
4. Nunca coloque dados de criadoras (vídeos, IDs de produto, prints, números) no repositório. Ele é público.

Permissões do GitHub: repositório público; escrita só para o time Naper (proteja a `main` e exija revisão de PR).
