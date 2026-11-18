# Grupos de ofertas no WhatsApp

## O que é
Grupos (ou canais) do WhatsApp dela que **a Naper abastece com ofertas** nos horários que ela define, sempre com o link da página dela. É o caminho seguro para escalar no WhatsApp: a Naper cuida do número e do ritmo.
Regras do WhatsApp pessoal dela (ler, resumir, rascunhar) estão no `CLAUDE.md`: nunca envio em massa e nunca servidor "WhatsApp MCP" não oficial.

## Ferramentas (nomes exatos)
- Ver: `grupos_listar`, `grupo_ver` (lojas, filtros, ofertas por dia, link do grupo), `grupo_fila`, `grupo_enviados` (hoje e ontem, cliques, o que falhou), `grupos_alertas` (o que precisa dela), `grupos_tarefas`, `grupos_bloqueios`, `grupo_periodo` (vagas das próximas 12 ou 24 horas), `whatsapp_ver`, `whatsapp_destinos`.
- Montar o dia: `grupo_buscar_ofertas` (grátis, não agenda) → `grupo_ao_vivo` (as candidatas) → `grupo_plano_salvar` (a ordem e as que ficam fora) → `grupo_aprovar` (`tipo: agendar` ou `aprovar`). `grupo_descartar_busca` se ela desistir.
- Mexer na fila (grátis): `grupo_fila_pular`, `grupo_fila_trocar`, `grupo_fila_adiar`, `grupo_fila_mover`, `grupo_fila_tirar`, `grupo_fila_juntar`, `grupo_fila_separar`, `grupo_fila_ordem`, `grupo_fila_tirar_da_mensagem`, `grupo_fila_desfazer_pulo`, `grupo_fila_dispensar_sugestao`.
- Mandar agora: `grupo_fila_agora`, `grupo_enviar` (produto), `grupo_enviar_colecao`, `grupo_enviar_video` (vídeo do TikTok dela).
- Configurar: `grupo_criar`, `grupo_configurar`, `grupo_mudar`, `grupo_desativar`, `grupos_bloquear`, `grupos_desbloquear`, `grupo_ajuste_do_nicho`, `grupo_previa_dos_filtros`.
- Resultados: `numeros_grupos`.

## Rotina boa
1. Comece por `grupos_alertas` e `grupo_enviados`: falha de envio, número desconectado, sem crédito.
2. Para as próximas 24 horas: `grupo_buscar_ofertas` → mostre a tabela (oferta, loja, preço, desconto, horário). Tire as **fracas e repetidas**, **junte numa só mensagem de 2 a 4 ofertas da mesma loja** (`grupo_fila_juntar`; 1 envio, 1 crédito) e ponha as melhores primeiro. Roteiro pronto no conector: `ofertas_do_grupo`.
3. **"Pode" dela**, e então `grupo_plano_salvar` e `grupo_aprovar`. Cada oferta que sai gasta 1 crédito.
4. Depois: `numeros_grupos` (cliques, pedidos, comissão) e ajuste lojas e filtros (`grupo_configurar` com o que muda).

## Boas práticas
- **Menos e melhor:** poucas ofertas boas por dia e com horários espaçados rendem mais que muitas.
- **Coleção no grupo:** `grupo_enviar_colecao` com o tema da semana. Ocupa uma oferta do dia.
- **Vídeo que vendeu:** `grupo_enviar_video` (não conta nas ofertas do dia); `grupo_videos_que_nao_foram` mostra os que ficaram de fora e por quê.
- **Bloqueie** o que ela não divulga (marca, loja, termo) com `grupos_bloquear`: vale para todos os grupos.
- **Mesmo produto em outra loja:** as "tarefas dos grupos" (`grupos_tarefas`) pedem para confirmar se é o mesmo produto e para juntar ofertas. Responda com ela: dá mais opções por mensagem.
- **Grupo na página e no QR:** `pagina_grupo` põe o botão de entrar na página; o QR do grupo está em `links-e-qr.md`.
- Agendado vai até 24 horas à frente. Buscar é limitado por dia, por grupo.

## Erros comuns
- Agendar sem o "pode" (cada oferta é crédito).
- Plano sem a opção de grupos: `PLANO_NECESSARIO`.
- Número limitado ou desconectado: conectar é só no app (`whatsapp_ver` mostra o estado).
- `grupo_configurar` recebe só o que muda, mas a lista `lojas` vai **inteira**: leia `grupo_ver` antes e mande todas.
