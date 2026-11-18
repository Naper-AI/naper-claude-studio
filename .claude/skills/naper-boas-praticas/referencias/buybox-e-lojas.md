# Buy box, lojas e ofertas

## A ideia
O seguidor decide melhor (e compra mais) quando vê **o mesmo produto em mais de uma loja**, cada uma com o preço e o link de afiliada dela. A Naper chama de **buy box**. Seu trabalho é garantir o máximo de opções, **sem trocar o produto por um parecido**.

## Como funciona no app
- Na **ficha do produto do TikTok** (Radar, Achados, Bio), as linhas **Amazon** e **Shopee** mostram "Ofertas · preço · comissão" do item achado na loja.
- Ao tocar, abre o par para ela conferir: "É o mesmo produto? O link é seu, com a sua comissão". Ela confirma ("É este — copiar meu link") ou recusa.
- **Favoritar um produto do TikTok dispara a busca nas outras lojas em segundo plano.** O ícone da loja só aparece se ela já aprovou o par e tem o link dela.
- Falta a tag da Amazon ou a conta da Shopee: o app avisa e leva para as contas de afiliada. Sem a conta da loja, não há link dela.
- O item achado só pelo nome é **sugestão**: precisa do OK dela. Fica na lista **Confirmar ofertas** (botão de aviso na Vitrine). Há o ajuste "Aprovar ofertas automaticamente" (o achado com sinais fortes entra sozinho): é escolha dela, no app.

## O que o conector faz e não faz
- **Lê:** `favoritos_tiktok` (traz as outras lojas de cada favorito), `favoritos_lojas`, `lojas_ver`, `lojas_sugestoes`, `lojas_buscar`, `vitrine_ofertas_para_confirmar`, `produto_ficha`, `produto_familia` (tamanhos, cores, voltagens).
- **Escreve:** `favorito_tiktok` (dá ou tira o coração; mande título e foto vistos, senão o produto não aparece na página).
- **Não faz:** confirmar ou recusar o par, vincular lojas e rodar a busca do buy box. Isso é no app. Diga a ela o caminho e espere o "pronto".

## Vincular lojas da mesma marca entre marketplaces
Quando ela vende a marca X no TikTok e também na Amazon e na Shopee, vincule as lojas: o app passa a mostrar a marca em todos os marketplaces.
- No app: na busca (a lupa), aba **Lojas**, toque em **Vincular** na loja. A folha "Vincular a mesma marca nas suas lojas" tem as abas **Vinculadas** e **Buscar nas lojas**. Vinculada aparece com o selo de cada marketplace.
- Você prepara: `lojas_sugestoes` (lojas que ela já divulga, com o motivo e os pares para juntar), `lojas_buscar` (acha a loja pelo nome nos marketplaces), `lojas_ver` (o que já está vinculado). Proponha os pares e peça para ela vincular.

## Passo a passo para dar "o máximo de opções"
1. Produto escolhido (do Radar, Achados ou busca): `produto_ficha` e `links_buscar`.
2. Peça para **favoritar** (ou use `favorito_tiktok` com o "pode") para o app buscar as outras lojas.
3. Procure o mesmo item nas outras lojas: `oportunidades_amazon_ofertas`, `oportunidades_shopee_ofertas`, `catalogo_awin_buscar`, `lojas_buscar`. Compare marca, modelo e variação (`produto_familia`). **Só é o mesmo produto se marca, modelo e versão batem.**
4. Se achou: ponha as lojas na **coleção** (`colecao_criar` com `links`, ou `colecao_adicionar`) ou peça para ela confirmar o par na ficha.
5. Liste o que sobrou em `vitrine_ofertas_para_confirmar` e ajude a decidir, um a um.
6. Divulgue pela coleção ou pelo link do produto na página: o seguidor vê todas as lojas.

## Boas práticas
- Prefira loja com **comissão e preço** melhores, mas mostre todas: o seguidor escolhe.
- Amazon e Mercado Livre não informam venda: compare por preço e comissão, não por "mais vendido".
- O link de cada loja é o dela (com a tag e a conta dela). Nunca monte link de afiliada à mão.
- Produto em variação (cor, tamanho) tem de bater com o anexado no TikTok (`referencias/redes.md`).

## Erros comuns
- Tratar produto "parecido" como o mesmo e perder a confiança do seguidor.
- Esquecer a tag da Amazon: o link sai sem comissão.
- Pedir para vincular loja sem favoritar antes: o app favorita junto, mas explique.
- Prometer que o buy box roda sozinho em todos os produtos: ele roda no que ela favorita e no que o app já buscou.
