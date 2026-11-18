# Minhas funções (formato)

Aqui ficam as funções que você pediu na Biblioteca ("+ Criar minha função"). O Claude cria os arquivos; você não precisa mexer.
Esta pasta nunca é apagada pela atualização automática.

Cada função tem dois arquivos com o mesmo nome (`<slug>`: letras minúsculas, números e `-`):

- `<slug>.json` — o card da Biblioteca:
  `{ "id": "<slug>", "titulo": "...", "descricao": "...", "campos": [ { "id": "produto", "rotulo": "Produto", "tipo": "texto", "exemplo": "..." }, { "id": "periodo", "rotulo": "Período", "tipo": "escolha", "opcoes": ["7 dias", "30 dias"] }, { "id": "redes", "rotulo": "Redes", "tipo": "marcar", "opcoes": ["TikTok", "Reels"] } ], "pedido": "Faça X para {produto} em {periodo} nas redes {redes}." }`
  Tipos de campo: `texto`, `escolha` (uma opção), `marcar` (várias). `{campo}` no `pedido` vira o que foi preenchido.
- `<slug>.md` — o passo a passo que o Claude segue quando a função roda.
