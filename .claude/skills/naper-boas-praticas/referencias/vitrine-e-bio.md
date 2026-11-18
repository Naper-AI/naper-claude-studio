# Vitrine, Bio e página

## O que é
A **página pública** dela (`naper.ai/br/` + o @ dela) é o destino do link da bio. No app, a aba **Bio** a organiza: marcas, coleções e vitrine. Muda na hora e **todo mundo vê**: sempre mostre e espere o "pode".

## Partes da página
- **Vitrine:** os produtos. Linhas por fonte (`mais-vendidos`, `favoritos`, `amostras`, `todos`), cada uma com fileiras de 4 produtos.
- **Coleções:** temas com link próprio (`referencias/colecoes.md`).
- **Marcas:** a ordem e o cupom de cada marca.
- **Meus links:** links livres (título + endereço https), até 12 hoje.
- **Meus grupos e posts com EU QUERO:** o botão de entrar no grupo e os posts que ela quer mostrar.
- **Bio:** o texto curto (até 160 letras hoje) e os blocos que ela esconde.

## Ferramentas (nomes exatos)
- Ler: `pagina_ver`, `vitrine_da_pagina` (a vitrine como o público vê, com a `chave` de cada produto), `vitrine_itens`, `vitrine_ver`, `pagina_links`, `pagina_marcas`, `pagina_posts`, `pagina_grupos`, `pagina_vitrine_linhas`.
- Mudar a vitrine: `vitrine_adicionar` (um por vez, vai ao topo), `vitrine_subir`, `vitrine_remover`, `pagina_vitrine_linhas_salvar` (as linhas, a ordem e quantas fileiras).
- Mudar a página: `pagina_editar` (bio e blocos escondidos), `pagina_links_salvar` (a lista inteira), `pagina_marcas_ordem`, `pagina_cupom_da_marca`, `pagina_post`, `pagina_grupo`.
- Favoritar: `favorito_tiktok` (o coração aparece na vitrine da página e entra na fila de amostras).

## Boas práticas
1. **Os que mais venderam no topo.** Cruze `vitrine_da_pagina` com `ganhos_ver`: o que vende sobe; o que não vende há semanas, ficou sem estoque ou sem comissão sai. Por quê: o seguidor decide nos primeiros produtos que vê.
2. **A vitrine é do que vende; o tema é da coleção.** Não deixe 40 produtos soltos: agrupe em coleções.
3. **Bio com palavra de busca** (o que ela vende e para quem), dentro do limite de letras. Mostre antes e depois.
4. **`pagina_links_salvar` substitui a lista inteira:** leia `pagina_links` antes, mande a lista completa com a mudança. Lista vazia só com `apagarTodos`.
5. **Cupom da marca** (`pagina_cupom_da_marca`) aparece na página da marca com botão de copiar: use quando ela tiver código próprio.
6. **Grupo na página** (`pagina_grupo`): mostrar pede o link de convite do grupo. É o caminho para o QR levar a pessoa a entrar (`referencias/links-e-qr.md`).
7. **Proponha em tabela** (o que sobe, o que sai, o que agrupa) e só execute depois do "pode".
8. Confira no app: Bio › vitrine, coleções e marcas em linhas. Cada resposta traz o "Abrir no app".

## Erros comuns
- Tirar produto da vitrine sem avisar que ele **não volta sozinho**: `vitrine_remover` vale para qualquer origem até ela pôr de novo (o favorito continua favorito).
- Produto que a página não mostra: não tem link de ficha nem QR. Ponha na vitrine antes.
- Mexer na página com ela sem plano ou com a página desligada (ligar e desligar é no app).
- Perfil e @ (`perfil_editar`): o @ novo vira o endereço da página e o antigo leva ao novo. Confira antes com `perfil_arroba_disponivel`.
