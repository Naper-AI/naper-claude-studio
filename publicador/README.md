# Publicador do Naper Studio (para o Claude)

Posta sozinho no TikTok Shop COM o produto no carrinho (e Shorts no YouTube, beta). Usa um Chrome com perfil PRÓPRIO (`NaperStudio/chrome`, nunca o Chrome normal da criadora) controlado por Playwright via CDP, porque a API da Naper não anexa produto, o navegador do app não anexa arquivo e a extensão Claude in Chrome limita uploads a 10 MB.

## Quando usar
Quando a criadora pedir para postar/agendar um vídeo no TikTok Shop com produto (ou um Short no YouTube) e o arquivo estiver no computador.

## Comandos (na raiz da pasta)
```
npm install                                   # uma vez (só playwright-core; usa o Chrome instalado)
node publicador/chrome.mjs [--login tiktok|youtube|instagram] [--porta 9333]
node publicador/conta.mjs                     # quais contas estão logadas nesse Chrome
node publicador/tiktok.mjs post.json          # monta, espera a checagem, confirma, confere na lista
node publicador/youtube.mjs post.json         # BETA
```
Primeira vez: `chrome.mjs --login tiktok`, a criadora entra na conta nessa janela (QR code no app do TikTok). A sessão fica salva no perfil do Naper Studio. Saída sempre em JSON (código 0 = concluído).

## post.json (TikTok)
```json
{"arquivo": "C:/.../video.mp4", "legenda": "A calça que mais vendeu no meu perfil", "marca": "riachuelo",
 "hashtags": ["#riachuelo", "#calcajeans"], "produtoId": "1731352381277373661", "nomeProduto": "Calça wide slim Riachuelo",
 "capa": "C:/.../capa.jpg", "quando": "2026-11-20 15:10", "conteudoDeMarca": true, "contaEsperada": "@usuario", "seco": false}
```
- `quando`: `"agora"` ou `"AAAA-MM-DD HH:mm"` em horário de Brasília. `capa` opcional (sem ela, um quadro do meio do vídeo via ffmpeg). `nomeProduto` até 30 caracteres.
- `seco: true` faz tudo e para antes de Post/Schedule. Use para testar; confira a `foto` da saída.

## post.json (YouTube, beta)
`{"arquivo", "titulo", "descricao"?, "quando"?, "seco"?}`. Marca "Não é conteúdo para crianças", adiciona #Shorts, Pública ou agendada. Validado só até o modo seco: confirme no YouTube Studio (Conteúdo › Shorts) antes de dar como feito.

## Regras
1. Sempre passe `contaEsperada`. Se a conta logada não bate, o script para sem postar; não troque de conta sem a criadora pedir.
2. Produto precisa estar Active e com estoque; senão o script para sem postar (avise a criadora e proponha outro produto).
3. Nunca poste se a checagem do TikTok não terminou. O script espera até 14 min; se o TikTok perguntar "Continue to post?", o clique NÃO valeu.
4. Só considere postado quando `ok: true` e `naLista: true` (o post apareceu na lista de https://www.tiktok.com/tiktokstudio/content). Se der erro ou `parou`, confira essa lista antes de repetir, para não duplicar.
5. Antes do primeiro post real numa conta, rode uma vez com `seco: true` e confira você mesmo a `foto` da saída (conta, produto, legenda, capa, horário). Estando certo, siga sem perguntar de novo: a autorização dela já vale para o lote.
6. Autorização de anúncios não existe na web: liga-se no app, no post, depois que sair.
