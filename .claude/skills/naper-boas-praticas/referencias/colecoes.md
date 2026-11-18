# Coleções

## O que é
Uma lista de produtos com um **link só**. Pode juntar TikTok Shop, Amazon, Shopee, Awin e links de outras lojas. Aparece na página dela (Bio › Coleções) e abre pelo link.

## Quando usar
- Todo tema que tenha mais de um produto: "presentes até X", "skincare da semana", "achados de cozinha".
- Todo post com EU QUERO que fale de vários produtos: a DM leva à coleção.
- Todo vídeo de lista, QR em vídeo, story e grupo de WhatsApp.

## Boas práticas
1. **Um tema, um nome curto.** O nome vira o título do card e do link. Por quê: quem vê o card entende em 1 segundo.
2. **Só produto com comissão dela.** A vitrine recusa o que não tem; na coleção, escolha com o mesmo critério.
3. **Misture lojas** quando fizer sentido: mais opções, mais chance de o seguidor achar o que serve. Veja `buybox-e-lojas.md`.
4. **Os melhores primeiro.** A ordem da coleção é a ordem do carrossel e da página (`colecao_editar` com `ordem`).
5. **Divulgue a coleção, não 10 links soltos.** Depois, quando o assunto for um item, use o link do **produto dentro da coleção** (a ficha dele na página, pela `chave` de `vitrine_da_pagina` ou `colecao_ver`): o seguidor cai direto no item e ainda vê as lojas.
6. **Coleção "só para vínculo"** (`visibilidade: so-vinculo`): não entra na lista da página, mas abre pelo link. Use para EU QUERO, vídeo, QR e grupo sem encher a Bio.
7. **Não repita** o mesmo produto em coleções parecidas sem querer: veja `colecoes_listar` antes de criar.
8. **Capa:** ela sobe a capa no app (a coleção, dentro da Bio). Sem capa, o card usa a grade das fotos dos produtos.

## Passo a passo (nomes exatos)
1. Ver o que já existe: `colecoes_listar`, `vitrine_da_pagina`.
2. Achar os produtos: `links_buscar`, `radar_semana`, `achados_dia`, `catalogo_awin_buscar` (traz a chave `p:<id>`), `oportunidades_amazon_ofertas`, `oportunidades_shopee_ofertas`, ou links que ela colar.
3. Mostrar a tabela (produto, loja, preço, comissão em % e em reais, por que entrou) e o nome sugerido. **Esperar o "pode".**
4. `colecao_criar` (1 a 30 produtos; `produtos` = ids do TikTok, `daVitrine` = chaves, `links` = outras lojas ou oferta manual; `publica` ou `so-vinculo`). Devolve o link.
5. Ajustar: `colecao_adicionar` (um por vez, no fim), `colecao_editar` (nome, visibilidade, ordem, remover), `colecao_editar_item` (nome e foto de um produto; na oferta manual também preço e link), `pagina_colecoes_ordem` (a ordem das coleções na página), `colecao_apagar`.
6. Divulgar: `colecao_post` (card da coleção vira rascunho de fotos com EU QUERO levando a ela), `grupo_enviar_colecao`, `pagina_qr`.

## Divulgar a coleção
- **Instagram:** `colecao_post` monta o rascunho: carrossel (um produto por página, até 8), vitrine (4 produtos) ou achado (1). Depois `textos_gerar` ou legenda sua, `rascunho_dm` e `publicar`. Roteiro pronto no conector: `colecao_eu_quero`.
- **Grupo de WhatsApp:** `grupo_enviar_colecao` (texto, capa e link; vale também para a "só para vínculo"). Ocupa uma oferta do dia.
- **YouTube e eventos:** QR (`referencias/links-e-qr.md`).
- **Stories:** o link da coleção (Compartilhar, no app) ou o card com QR.

## Erros comuns
- Coleção com 3 produtos que não combinam: o seguidor não entende o tema.
- Mandar o link da loja em vez do link da coleção.
- Esquecer o teto: o conector avisa quando passa (hoje, até 30 produtos por coleção e 200 coleções por conta).
- Coleção vazia: ela nunca fica sem produto; para sair, `colecao_apagar`.
- Oferta manual (link de outra loja) pede o plano que a tem, e o aceite do termo é dela, só no app.
