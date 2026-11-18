# Criar, publicar e agendar

## O fluxo (o app chama de Criar)
**Mídia › rascunho › vínculo (produto, coleção) › legenda › DM do EU QUERO › destinos e horário › "pode" › publicar.**

1. **Mídia:** ela sobe pelo app (Criar › Adicionar ou Importar do TikTok) ou por você: `midia_enviar` (devolve o comando de envio) → ela ou você envia o arquivo → `midia_concluir` (cria o rascunho) → `midia_ver` (estado).
2. **Ver:** `rascunhos_listar` (20 por página), `rascunho_ver` (mídia, produto, legenda, destinos, agenda), `publicacoes_estado`.
3. **Vincular** (`rascunho_vincular`): um só entre `produtoId` do TikTok (do Radar, dos achados ou da busca), `colecaoId` (a DM do EU QUERO leva à coleção) ou `linkId` de um vínculo que já existe. Para achar o `linkId` de um produto do TikTok: `link_por_url`. Link de afiliada dela: `link_afiliado`.
4. **Legenda:** `textos_gerar` (IA da Naper, **1 crédito por rede**; avise) ou escreva você no tom dela e grave com `textos_editar` (grátis; mande o texto INTEIRO de `rascunho_ver`, nunca um que termina em "…").
5. **DM do EU QUERO:** `rascunho_dm` e `rascunho_eu_quero` (como ficaria). Ver `eu-quero-e-dm.md`.
6. **Mostrar tudo** (peça, redes, conta, legenda, produto, DM, horário, créditos) e esperar o **"pode"**.
7. **Sair:** `publicar` (Instagram e TikTok juntos, grupos junto: 1 crédito por grupo), `facebook_publicar`, `pinterest_publicar`. Depois, `publicacoes_estado`.
8. **Mudar o que já está agendado:** `agendamento_alterar` (novo horário ou `cancelar: true`; só antes de sair), `publicacao_pular_alvo` (desistir de um destino que falhou), `rascunho_apagar` (o que já saiu continua nas redes).

Roteiro pronto no conector: `criar_post`. Para coleção: `colecao_post` (`colecoes.md`).

## Os dois interruptores (Conta › Claude e API)
- **Publicar, agendar e mandar nos grupos sem aprovação.**
- **Ligar automações (EU QUERO, DMs).**
- **Padrão recomendado: os dois ligados.** Por quê: com eles você faz o trabalho inteiro, e a segurança vem do seu "pode" na conversa. Se ela preferir aprovar tudo no app, desligue o primeiro: aí `publicar` só deixa o rascunho marcado (redes, grupos e horário) para ela aprovar lá.
- **A autorização é uma por lote.** O interruptor dispensa a aprovação no app; na conversa, o pedido dela ("pode publicar"), a aprovação na Galeria ou um "pode" valem para o lote inteiro. Não pergunte de novo a cada post.
- Ela muda a qualquer hora e pode revogar o acesso em Conta › Claude e API (vale em até 30 segundos).
- Ver o estado: `conta_ver`. Interruptor desligado = `ESCOPO_INSUFICIENTE`: diga onde ligar.

## Boas práticas
- **Horário pelo histórico dela** (`tiktok_perfil`, `numeros_instagram`), não pelo palpite. Horários em Brasília (ao agendar, com `-03:00`).
- **Uma peça por rede**, com a duração e a chamada certas (`redes.md`). Mesmo vídeo, legendas diferentes.
- **Legenda:** gancho na 1ª linha, palavra de busca do produto, a chamada do EU QUERO no Instagram, poucas hashtags reais. O que vende: frase curta, o @ da marca e 4 hashtags.
- **Link sempre o da página dela.** Confira o vínculo antes do "pode".
- **Entrega em tabela** (peça · rede · dia · hora · legenda · créditos) quando forem várias peças. Cada peça aprovada vira item da Galeria do painel.
- **Preço no vídeo ou na legenda:** só o real e com a data em que foi visto.
- **Repetição:** repetir a mesma chamada de escrita não publica duas vezes, mas não dependa disso.

## Erros comuns
- Publicar com o rascunho sem produto vinculado (EU QUERO não liga sozinho sem produto no post).
- Legenda de IA sem avisar do crédito.
- Mandar o TikTok para a caixa de entrada quando dá para postar com o produto no carrinho pelo publicador (`redes.md`).
- Agendar item da Galeria que não está `aprovado` nem teve o "pode".
