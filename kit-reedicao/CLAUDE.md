# Kit de reedição Naper · regras para o Claude

O padrão aprovado é **vídeo natural**: só cortes e recombinação dos vídeos que MAIS VENDERAM da própria criadora, com a cara deles. Exemplo de receita boa: o gancho de escassez de um vídeo, a prova de caimento de outro, a prova social das vendas e o fechamento, tudo cortado no fim das frases. Dá para usar trechos do MEIO e do FIM de vídeos mais fracos do mesmo produto.

**Nunca** acrescente nada por cima: cartão de produto, selo, contagem, "Comente QUERO" desenhado, legenda nova, vidro fosco, cartão final, música. O visual dos originais fica como veio (as legendas pequenas e o selo "Responder ao comentário" do TikTok fazem parte do natural). **Nunca abra** vídeo, imagem ou navegador na tela dela sem ela pedir: mostre o caminho do arquivo e confira pela folha de quadros.

## O fluxo (comandos rodados da raiz do Naper-Studio)
1. **Quais vídeos:** os que mais venderam, pelos dados do TikTok dela na Naper (`tiktok_videos`, `ganhos_ver`, `relatorio_ver`). O produto de um vídeo é o anexado ou o que tem 20% ou mais dos pedidos dele. Prefira juntar vídeos do MESMO produto.
2. **Os arquivos:** vídeos já postados (campeões) em `estudio/campeoes/`; vídeo cru que ela gravou em `estudio/brutos/`. Ela traz pela Naper (no app: Criar › Importar do TikTok) ou salva no app do TikTok. Se o vídeo está num rascunho da Naper, veja a mídia com `rascunho_ver` e baixe para `estudio/campeoes/`.
3. **Registrar o trabalho:** `node painel/registrar.mjs trabalho <id> --titulo "..." --tipo video --redes "tiktok" --status em_fila`.
4. **Transcrever** cada vídeo: `node kit-reedicao/ferramentas/transcrever.mjs <video> --trabalho <id>` (gera `<video>.frases.json` com início e fim de cada frase).
5. **Montar a receita** (marque antes `node painel/registrar.mjs etapa <id> escolhendo "..."`) em `kit-reedicao/receitas/<id>.json` (veja `receitas/exemplo.json`): 3 a 6 trechos, 20 a 45 s no total, cada trecho começa e termina numa frase inteira. Estilos que funcionam: escassez primeiro; prova social primeiro; pergunta da cliente ("Respondendo a") e a resposta com o melhor trecho de outro vídeo; curto e direto (15 a 22 s); dois looks.
6. **Reeditar:** `node kit-reedicao/ferramentas/reeditar.mjs kit-reedicao/receitas/<id>.json` (saída em `estudio/editados/AAAA-MM-DD_produto_rede_vN.mp4`; registra `cortando` e `conferindo` e já faz a folha de quadros).
7. **Conferir sem abrir:** olhe a folha `<video>.folha.png` (ou `node kit-reedicao/ferramentas/folha.mjs <video> 10 --trabalho <id>`): produto aparecendo, nenhum corte brusco da mesma pessoa, nenhuma frase cortada. Ok: `node painel/registrar.mjs etapa <id> pronto "Conferido pela folha"`.
8. **Entregar:** o caminho do arquivo, a receita em 1 linha por trecho e 2 ou 3 variações de ordem (ganchos diferentes). Publicar só com o "pode" dela: Instagram/Facebook/grupos pela Naper; TikTok vai para a caixa de entrada do app, onde ela vincula o produto.

## Cuidados
- Só vídeos DELA. Vídeo de outra criadora é referência de roteiro, nunca trecho.
- Pessoa que aparece no vídeo e não é ela: confirme que tem autorização.
- Preço falado no vídeo antigo pode estar velho: avise.
- Precisa de Node 20+ e FFmpeg (o onboarding instala). A transcrição usa o whisper.cpp no computador (o vídeo não vai para a internet).
