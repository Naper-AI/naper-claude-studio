# Regras por rede

## TikTok Shop (primeiro)
- **A pauta nasce dos dados do TikTok dela** (`tiktok_videos`, `ganhos_ver`, `tiktok_perfil`), não de anúncios do Instagram. Ordene por **comissão**, não por visualização.
- **Produto ativo e com estoque antes de postar.** `produto_ficha` mostra o produto e a situação dela com ele; o estoque dos produtos da vitrine do TikTok dela está em `tiktok_vitrine`. Sem estoque ou sem comissão: avise e sugira outro.
- **O produto do vídeo é o produto anexado.** Para medir de qual produto um vídeo vendeu, use o anexado ou, na falta, o que tem 20% ou mais dos pedidos do vídeo. O que aparece na imagem tem de ser o produto vinculado (cada cor ou variação também). Vídeo com produto diferente do anexado atrapalha a promoção.
- **Como sai:** `publicar` manda para a **caixa de entrada** do app do TikTok (uma notificação). Ela abre no celular, vincula o produto do TikTok Shop (Adicionar link › Produtos) e posta. Post direto só se ela escolheu e a conta aceita (`tiktok_opcoes_de_postar` mostra as opções). Vídeo com produto passa por revisão.
- **Legenda:** frase curta, o @ da marca (quando ela divulgar a marca) e 4 hashtags reais. Gancho no primeiro segundo e o produto aparecendo.
- **Amostras:** `tiktok_amostras` e `plano_amostras` (prazo do vídeo). Grave primeiro o que tem prazo.
- **Comentários do TikTok:** o conector não lê. Para isso, só pelo navegador dela e com o "pode".
- **Vitrine do TikTok:** o coração (`favorito_tiktok`) põe o produto na página dela e na fila de amostras.

## Instagram
- Pela Naper: **Reels, carrossel e stories**. Instagram = Reels com **EU QUERO** (`eu-quero-e-dm.md`).
- Reels de 15 a 30 segundos, gancho forte no começo, chamada falada e escrita ("comente a palavra").
- Carrossel de coleção: `colecao_post` (um produto por página, até 8).
- Conecte pelo app. Várias contas: a principal é a usada quando ninguém diz qual (`conexao_principal`, `conexao_ordem`).

## YouTube
- **A Naper não publica no YouTube.** Entregue o arquivo e o texto (título curto com o nome do produto, descrição de 3 linhas com o **link da página ou da coleção**) e deixe que ela envie. Se ela quiser ajuda no YouTube Studio, só pelo Claude no Chrome dela, parando antes de Publicar ou Agendar.
- Shorts: vertical, até 60 segundos. Vídeo horizontal: use o **QR code** de produto, coleção ou grupo no fim (`links-e-qr.md`).
- Link por escrito na descrição sempre, além do QR.

## Facebook (Página)
- `facebook_publicar`: reels (vídeo em pé de 3 a 90 segundos), post (fotos ou 1 vídeo) ou stories; agenda até alguns dias à frente. `facebook_publicacoes` mostra o que saiu e o que está agendado; `facebook_cancelar` desfaz o agendado.
- É **Página**, não perfil pessoal. Confira `facebook_paginas` (estado, qual a principal).
- Depende de a rede estar liberada para a conta.

## Pinterest
- `pinterest_pastas` (as pastas públicas), `pinterest_pasta_criar`, `pinterest_publicar`, `pinterest_pins`, `pinterest_cancelar`.
- Pin = 1 foto, carrossel ou vídeo numa pasta, **com o link da página dela**. Agenda de 10 minutos a 30 dias.
- **Regras contra repetição:** até 5 pins novos por dia (somando as contas), o mesmo link só 1 vez a cada 7 dias e **texto nunca repetido**. Escreva legenda diferente para cada pin.

## Em todas
- Nada de "parceiro oficial" ou "aprovado pelo TikTok/Meta" e nenhuma promessa de ganho.
- Música só licenciada. Preço só o real, com a data.
- Vídeo de outra criadora é referência de roteiro, nunca trecho.
