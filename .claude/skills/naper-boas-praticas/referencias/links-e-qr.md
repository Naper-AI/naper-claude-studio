# Links e QR codes

## Os links que existem
Todos abrem a **página dela** (`naper.ai/br/` + o @ dela). Confira com `pagina_ver` se a página está ligada: desligada, não há link nem QR (ligar é no app, no Perfil).

| Para divulgar | De onde vem o link |
|---|---|
| A página inteira | `pagina_ver` ou `pagina_links` |
| Uma coleção (inclusive a "só para vínculo") | `colecao_criar`, `colecao_ver` e `colecoes_listar` devolvem o link público |
| Um produto (a ficha dele na página) | precisa estar na vitrine: ache a `chave` em `vitrine_da_pagina` |
| Um grupo de ofertas | `grupo_ver` mostra o link do grupo (a Naper conta os cliques) |
| Produto do TikTok com comissão dela | `link_afiliado` (pede o TikTok com vendas conectado) |
| Produto da loja do TikTok vira vínculo de rascunho | `link_por_url` |

Por quê: link da página conta clique e venda, mostra todas as lojas ao seguidor e continua valendo se um produto sair do ar.

## QR code: `pagina_qr`
- Passe `colecaoId` (de `colecoes_listar`) **ou** `chave` (de `vitrine_da_pagina`). Só um dos dois.
- Volta: o card com o QR, o link que o QR abre, o nome do arquivo e a tela do app que baixa e compartilha.
- **Pelo conector a imagem vem reduzida (só para você ver).** Para usar de verdade, peça que ela baixe o PNG inteiro no app: Bio › a coleção (ou a ficha do produto) › Compartilhar › card com QR Code.
- O card leva o nome, a foto (ou a grade de fotos da coleção) e "aponte a câmera".
- Nada é gravado nem publicado: é leitura. Não gasta crédito.

### QR de grupo de ofertas
`pagina_qr` hoje gera o card de **produto e coleção**, não de grupo. Para o grupo: pegue o link do grupo em `grupo_ver`, gere um QR simples desse endereço exato (fundo branco, margem em volta) e **teste**. Se ela já tem o grupo na página (`pagina_grupo`), o QR da própria página também leva ao botão de entrar. Não prometa um card de grupo pronto.

## QR em vídeo horizontal do YouTube (produto, coleção ou grupo)
Quem assiste no computador ou na TV não clica no link da descrição: o QR leva a pessoa ao celular em um segundo.

1. **Escolha um alvo por vídeo.** Vídeo sobre um produto: QR do produto. Vídeo de lista, review de vários ou "achados do mês": QR da coleção. Vídeo de ofertas do dia: QR do grupo.
2. Gere o card (`pagina_qr`) e peça o PNG inteiro no app (a imagem do conector é pequena demais para ler da tela).
3. Mostre a ela onde o QR entra e por quanto tempo, e espere o "pode".
4. Monte o vídeo só com **cortes** dos vídeos dela (kit de reedição). O card de QR é a única coisa por cima: imagem pronta da Naper, sem animação. Coloque quando você falar do produto e nos últimos segundos, grande o bastante para a câmera ler da tela (comece por cerca de 30% da altura do quadro) e sem cobrir o rosto nem o produto.
5. **Teste:** exporte um quadro, abra o QR com a câmera do celular dela (ou leia o quadro por programa) e confira que abre a coleção, o produto ou o grupo certo.
6. Escreva o título e a descrição com o **mesmo link por escrito** (o QR não ajuda quem assiste no celular). A Naper não publica no YouTube: publique pelo publicador (`node publicador/youtube.mjs`, beta) ou, se ele falhar, entregue o arquivo e o texto para ela enviar.

Sacada: a coleção "só para vínculo" serve bem para vídeo: ela abre pelo link sem poluir a lista da Bio (`referencias/colecoes.md`).

## Erros comuns
- QR de produto que não está na vitrine: o link abriria a página sem a ficha. Ponha na vitrine antes (`vitrine_adicionar`, com o "pode").
- Produto de catálogo da Awin: não abre por ficha; o QR dele fica no app.
- Página desligada: o conector recusa (`PAGE_OFF`). Peça para ela ligar no Perfil.
- Usar a imagem reduzida do conector no vídeo: o QR fica borrado e não lê.
- Entregar sem testar com a câmera.
