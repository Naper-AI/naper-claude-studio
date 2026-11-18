// Painel do Naper Studio. Lê /api/estado a cada 2 s. Sem bibliotecas.
'use strict';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const img = (rel) => '/arquivo?c=' + encodeURIComponent(rel) + '&t=' + Date.now();
let estado = null;
let abaAtual = 'biblioteca';
let filtro = 'todos';
let escolhido = '';
const vistos = {};

const ROT_PASSO = { falta: 'Na fila', fazendo: 'O Claude está fazendo', precisa_voce: 'Sua vez', ok: 'Pronto', pulado: 'Pulado', erro: 'Precisa de atenção' };
const ROT_STATUS = { em_fila: 'Em fila', editando: 'Editando', pronto_para_aprovar: 'Pronto para aprovar', ajustar: 'Ajustar', aprovado: 'Aprovado', agendado: 'Agendado', publicado: 'Publicado' };
const ETAPAS = [
  ['transcrevendo', 'Transcrevendo'], ['escolhendo', 'Escolhendo trechos'], ['cortando', 'Cortando'], ['conferindo', 'Conferindo'], ['pronto', 'Pronto'],
];

// ---------- Onboarding ----------
const DETALHE_NAPER = `<ol>
<li>No app do Claude, clique em <b>Plugins</b> (barra da esquerda) › botão <b>Adicionar</b>.</li>
<li>Escolha <b>Adicionar conector personalizado</b>. (Em versões mais antigas do app: Configurações › Conectores.)</li>
<li>Nome: <b>Naper</b> · URL: <code>https://api.naper.ai/mcp</code> · clique em <b>Continuar</b> e depois em <b>Adicionar</b>.</li>
<li>O navegador abre: clique em <b>Continuar conectando</b> e entre na Naper com o seu número de WhatsApp (chega um código).</li>
<li>Deixe a sua conta marcada e clique em <b>Autorizar</b>. Clique em <b>Abrir Claude</b> e diga <b>pronto</b> na conversa.</li>
</ol>
<p style="margin:8px 0 0">Na tela da Naper, deixe <b>os dois interruptores ligados</b>: <b>Publicar, agendar e mandar nos grupos sem aprovação</b> (o Claude publica quando você disser "pode" na conversa) e <b>Ligar automações (EU QUERO, DMs)</b> (o Claude configura o EU QUERO e as DMs por você).</p>
<p style="margin:6px 0 0" class="mudo">Se estiver no Claude pelo terminal: digite <code>/mcp</code> › <b>naper</b> › <b>Authenticate</b>.</p>`;

function renderOnboarding(ob) {
  const feitos = ob.passos.filter((p) => ['ok', 'pulado'].includes(p.status)).length;
  $('#barra-in').style.width = Math.round((feitos / ob.passos.length) * 100) + '%';
  $('#barra-txt').textContent = feitos + ' de ' + ob.passos.length + ' prontos';
  $('#passos').innerHTML = ob.passos.map((p, i) => {
    const mostraDela = p.dela && !['ok', 'pulado'].includes(p.status) && (p.status === 'precisa_voce' || p.id === 'naper');
    const dela = mostraDela ? '<div class="dela"><b>O que você faz:</b> ' + (p.id === 'naper' ? DETALHE_NAPER : esc(p.dela)) + '</div>' : '';
    const ic = p.status === 'ok' ? '✓' : p.status === 'pulado' ? '–' : p.status === 'erro' ? '!' : String(i + 1);
    return '<li class="passo ' + p.status + '"><div class="ic">' + ic + '</div><div><h4>' + esc(p.titulo) + '</h4><p>' + esc(p.explica) + '</p>' +
      (p.nota ? '<p class="nota">' + esc(p.nota) + '</p>' : '') + dela + '</div><span class="etq ' + p.status + '">' + ROT_PASSO[p.status] + '</span></li>';
  }).join('');
  $('#rodape-ob').innerHTML = ob.validado ? 'Tudo validado em ' + new Date(ob.validadoEm).toLocaleString('pt-BR') + '.' :
    'A Biblioteca abre aqui sozinha quando o Claude terminar a validação. Esta página se atualiza sozinha.';
}

// ---------- Biblioteca ----------
const REDES = [['tiktok', 'TikTok'], ['reels', 'Instagram Reels'], ['stories', 'Stories'], ['facebook', 'Facebook'], ['pinterest', 'Pinterest'], ['shorts', 'YouTube Shorts'], ['grupos', 'Grupos de WhatsApp']];
const marcas = (nome, lista, marcados) => '<div class="marcas">' + lista.map(([v, r]) =>
  '<label><input type="checkbox" name="' + nome + '" value="' + v + '"' + (marcados.includes(v) ? ' checked' : '') + '>' + r + '</label>').join('') + '</div>';
const FUNCOES = [
  {
    id: 'analise', num: '01', titulo: 'Faça uma análise do meu perfil',
    desc: 'TikTok primeiro: vendas, vídeos e produtos campeões, formatos que vendem, raio-x do produto nº 1, Instagram e EU QUERO, e a meta.',
    sai: 'Um relatório em <b>relatorios/</b> com as 3 ações da semana.',
    campos: `<div class="duplo"><div class="campo"><label>Período</label><select name="periodo"><option value="7">Últimos 7 dias</option><option value="30" selected>Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select></div>
      <div class="campo"><label>Tamanho do relatório</label><select name="tamanho"><option>Resumo de 1 página</option><option>Completo</option></select></div></div>
      <div class="campo"><label>O que mais te preocupa agora (opcional)</label><input type="text" name="foco" placeholder="ex.: minhas vendas caíram em moda"></div>
      <div class="campo"><span class="rot">Incluir</span>` + marcas('incluir', [['instagram', 'Instagram e EU QUERO'], ['meta', 'Meta do mês'], ['concorrentes', 'Quem mais vende na minha categoria']], ['instagram', 'meta']) + '</div>',
    pedido: (f) => [
      'Naper Studio · Função 1 · Análise do meu perfil (siga a skill naper-studio, função 1).',
      'Período: últimos ' + f.periodo + ' dias. Relatório: ' + f.tamanho + '.',
      f.foco ? 'O que mais me preocupa: ' + f.foco + '.' : '',
      'Comece pelo TikTok: panorama, vídeos e produtos campeões, formatos que vendem e o raio-x do produto nº 1.',
      f.incluir.length ? 'Inclua também: ' + f.incluir.map((x) => ({ instagram: 'Instagram e EU QUERO', meta: 'a meta do mês', concorrentes: 'quem mais vende na minha categoria' }[x])).join(', ') + '.' : '',
      'Salve o relatório em relatorios/ e registre na Galeria. Termine com as 3 ações que mais aumentam minhas vendas esta semana. Só leia: não publique nem gaste crédito.',
    ],
  },
  {
    id: 'brutos', num: '02', titulo: 'Use os meus brutos e crie conteúdo para todas as redes',
    desc: 'Os vídeos e fotos que você gravou viram uma peça para cada rede que você usa, com legenda e agenda proposta.',
    sai: '1 peça por rede em <b>estudio/editados/</b> + legendas + agenda. Publica só com o seu "pode".',
    campos: `<div class="campo"><label>Produto ou assunto</label><input type="text" name="produto" placeholder="ex.: calça jeans wide da loja X"></div>
      <div class="campo"><label>Detalhes (preço, cupom, diferencial)</label><textarea name="detalhes" placeholder="ex.: tem do 36 ao 48, cupom de 10%, tecido que não amassa"></textarea></div>
      <div class="campo"><span class="rot">Redes que você usa</span>` + marcas('redes', REDES, ['tiktok', 'reels', 'stories']) + `</div>
      <div class="duplo"><div class="campo"><label>Tom</label><select name="tom"><option>O meu de sempre</option><option>Animado</option><option>Direto ao ponto</option><option>Especialista</option><option>Engraçado</option></select></div>
      <div class="campo"><label>Chamada (CTA)</label><select name="cta"><option>Carrinho laranja (TikTok Shop)</option><option>Comente QUERO (EU QUERO)</option><option>Link na bio</option><option>Entre no meu grupo</option></select></div></div>`,
    pedido: (f) => [
      'Naper Studio · Função 2 · Use os meus brutos e crie conteúdo para todas as redes (siga a skill naper-studio, função 2).',
      'Produto/assunto: ' + (f.produto || 'veja os brutos e me diga qual produto aparece') + '.',
      f.detalhes ? 'Detalhes: ' + f.detalhes + '.' : '',
      'Redes: ' + (f.redes.map((r) => REDES.find((x) => x[0] === r)[1]).join(', ') || 'TikTok') + '. Tom: ' + f.tom + '. Chamada: ' + f.cta + '.',
      'Use os meus brutos em estudio/brutos. Só cortes do que eu gravei, nada desenhado por cima. 1 peça por rede, legendas e uma agenda proposta. Registre cada peça na Galeria.',
      'Mostre tudo antes e só publique ou agende depois do meu "pode".',
    ],
  },
  {
    id: 'campeoes', num: '03', titulo: 'Use os meus vídeos campeões e gere novos',
    desc: 'O Claude acha os seus vídeos que mais venderam e monta versões novas e naturais, só com cortes: o melhor gancho de um, a prova do outro.',
    sai: 'Versões novas em <b>estudio/editados/</b>, conferidas pela folha de quadros. Você acompanha em "Ver o editor".',
    campos: `<div class="campo"><label>Produto (vazio = o que mais vendeu)</label><input type="text" name="produto" placeholder="ex.: o meu produto nº 1"></div>
      <div class="duplo"><div class="campo"><label>Quantas versões</label><select name="versoes"><option>1</option><option>2</option><option selected>3</option><option>4</option><option>5</option></select></div>
      <div class="campo"><label>Duração</label><select name="duracao"><option>Curto (15 a 22 s)</option><option selected>Médio (20 a 40 s)</option><option>Longo (40 a 60 s)</option></select></div></div>
      <div class="campo"><span class="rot">Redes</span>` + marcas('redes', REDES.slice(0, 6), ['tiktok', 'reels']) + `</div>
      <div class="campo"><span class="rot">Ganchos para testar</span>` + marcas('ganchos', [['escassez', 'Escassez primeiro'], ['prova', 'Prova social primeiro'], ['pergunta', 'Pergunta da cliente'], ['curto', 'Curto e direto'], ['looks', 'Dois looks']], ['escassez', 'prova', 'pergunta']) + '</div>',
    pedido: (f) => [
      'Naper Studio · Função 3 · Use os meus vídeos campeões e gere novos (siga a skill naper-studio, função 3).',
      'Produto: ' + (f.produto || 'o que mais vendeu para mim no TikTok') + '. Versões: ' + f.versoes + '. Duração: ' + f.duracao + '.',
      'Redes: ' + (f.redes.map((r) => REDES.find((x) => x[0] === r)[1]).join(', ') || 'TikTok') + '.',
      f.ganchos.length ? 'Ganchos para testar: ' + f.ganchos.map((g) => ({ escassez: 'escassez primeiro', prova: 'prova social primeiro', pergunta: 'pergunta da cliente', curto: 'curto e direto', looks: 'dois looks' }[g])).join(', ') + '.' : '',
      'Reedição natural: só cortes e recombinação dos meus vídeos que mais venderam, corte no fim da frase, pode usar o meio e o fim dos vídeos mais fracos do mesmo produto. Nada desenhado por cima.',
      'Confira pela folha de quadros, não abra o vídeo na minha tela, registre o progresso no painel e não publique sem o meu "pode".',
    ],
  },
  {
    id: 'oportunidades', num: '04', titulo: 'Me passe as melhores oportunidades de produtos e marcas para o meu perfil',
    desc: 'Radar da sua categoria, Achados do dia, lojas e marcas com a melhor comissão, amostras, e ofertas da Amazon, Shopee e Awin que combinam com você.',
    sai: 'Uma lista curta, com o porquê de cada uma e o próximo passo.',
    campos: `<div class="campo"><span class="rot">Lojas</span>` + marcas('lojas', [['tiktok', 'TikTok Shop'], ['amazon', 'Amazon'], ['shopee', 'Shopee'], ['awin', 'Awin']], ['tiktok', 'amazon', 'shopee']) + `</div>
      <div class="duplo"><div class="campo"><label>Preço até (R$, opcional)</label><input type="number" name="preco" min="0" placeholder="ex.: 150"></div>
      <div class="campo"><label>Comissão mínima (%)</label><input type="number" name="comissao" min="0" max="100" placeholder="ex.: 10"></div></div>
      <div class="campo"><span class="rot">Preferências</span>` + marcas('pref', [['amostra', 'Com amostra grátis'], ['poucas', 'Poucas criadoras vendendo'], ['marcas', 'Marcas conhecidas']], ['poucas']) + `</div>
      <div class="campo"><label>Observação (opcional)</label><input type="text" name="obs" placeholder="ex.: nada de suplemento"></div>`,
    pedido: (f) => [
      'Naper Studio · Função 4 · Me passe as melhores oportunidades de produtos e marcas para o meu perfil (siga a skill naper-studio, função 4).',
      'Lojas: ' + (f.lojas.map((l) => ({ tiktok: 'TikTok Shop', amazon: 'Amazon', shopee: 'Shopee', awin: 'Awin' }[l])).join(', ') || 'TikTok Shop') + '.',
      f.preco ? 'Preço até R$ ' + f.preco + '.' : '', f.comissao ? 'Comissão mínima de ' + f.comissao + '%.' : '',
      f.pref.length ? 'Preferências: ' + f.pref.map((p) => ({ amostra: 'com amostra grátis', poucas: 'poucas criadoras vendendo', marcas: 'marcas conhecidas' }[p])).join(', ') + '.' : '',
      f.obs ? 'Observação: ' + f.obs + '.' : '',
      'Use o meu nicho (marca/minha-marca.md) e as minhas vendas para medir o encaixe. Diga o porquê de cada uma, com o período e a fonte dos números, e o próximo passo. Só leia: não mexa na vitrine nem gaste crédito.',
    ],
  },
];

function lerForm(form) {
  const f = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') {
      f[el.name] = f[el.name] || [];
      if (el.checked) f[el.name].push(el.value);
    } else f[el.name] = el.value.trim();
  }
  return f;
}
// Funções próprias: vêm de minhas-funcoes/*.json (GET /api/funcoes) e viram cards iguais às 4 primeiras.
let proprias = [];
const CRIAR = {
  id: 'criar', rotulo: '+ NOVA', titulo: 'Criar minha função',
  desc: 'Diga o que você quer que o Claude faça e ele cria uma função nova aqui na Biblioteca, seguindo as boas práticas (só lê até o seu "pode", registra na Galeria).',
  sai: 'Um card novo na Biblioteca, com o briefing que você precisa preencher.',
  campos: `<div class="campo"><label>Nome da função</label><input type="text" name="nome" placeholder="ex.: Relatório de amostras da semana"></div>
    <div class="campo"><label>O que o Claude deve fazer</label><textarea name="descricao" placeholder="ex.: todo domingo, listar as amostras que pedi e as que chegaram, e dizer qual vídeo gravar primeiro"></textarea></div>
    <div class="campo"><label>Com que frequência (opcional)</label><input type="text" name="freq" placeholder="ex.: toda semana"></div>
    <div class="campo"><span class="rot">Redes ou lojas (opcional)</span>` + marcas('redes', REDES, []) + `</div>
    <div class="campo"><label>O que eu preencho no briefing (opcional)</label><input type="text" name="briefing" placeholder="ex.: o produto e o período"></div>`,
  pedido: (f) => [
    'Naper Studio · Criar uma função nova na minha Biblioteca: ' + (f.nome || '(dê um nome)') + ' — ' + (f.descricao || '(descreva o que quer)') + '.',
    f.freq ? 'Frequência: ' + f.freq + '.' : '', f.redes.length ? 'Redes e lojas: ' + f.redes.map((r) => (REDES.find((x) => x[0] === r) || [0, r])[1]).join(', ') + '.' : '',
    f.briefing ? 'No briefing eu preencho: ' + f.briefing + '.' : '',
    'Siga as boas práticas da skill naper-studio (seção Funções próprias).',
  ],
};
function funcaoPropria(p) {
  const campos = (p.campos || []).map((c) => c.tipo === 'escolha'
    ? '<div class="campo"><label>' + esc(c.rotulo) + '</label><select name="' + esc(c.id) + '">' + (c.opcoes || []).map((o) => '<option>' + esc(o) + '</option>').join('') + '</select></div>'
    : c.tipo === 'marcar'
      ? '<div class="campo"><span class="rot">' + esc(c.rotulo) + '</span>' + marcas(c.id, (c.opcoes || []).map((o) => [o, o]), []) + '</div>'
      : '<div class="campo"><label>' + esc(c.rotulo) + '</label><input type="text" name="' + esc(c.id) + '" placeholder="' + esc(c.exemplo ? 'ex.: ' + c.exemplo : '') + '"></div>').join('');
  return {
    id: p.slug, propria: true, rotulo: 'MINHA FUNÇÃO', titulo: p.titulo, desc: p.descricao, sai: 'O passo a passo está em minhas-funcoes/' + p.slug + '.md.', campos,
    pedido: (f) => {
      let m = p.pedido;
      for (const c of p.campos) m = m.split('{' + c.id + '}').join(Array.isArray(f[c.id]) ? f[c.id].join(', ') : (f[c.id] || ''));
      return ['Naper Studio · Minha função ' + p.titulo + ' (siga minhas-funcoes/' + p.slug + '.md): ' + m];
    },
  };
}
function renderBiblioteca() {
  const todas = [...FUNCOES, ...proprias.map(funcaoPropria), CRIAR];
  $('#funcoes').innerHTML = todas.map((fn) => `<form class="funcao${fn.propria ? ' propria' : ''}" data-id="${esc(fn.id)}" onsubmit="return false">
    <span class="num">${fn.rotulo || 'FUNÇÃO ' + fn.num}</span>${fn.propria ? '<button type="button" class="btn sec peq editar" data-editar="' + esc(fn.id) + '">Editar</button>' : ''}<h2>${fn.titulo}</h2><p class="desc">${fn.desc}</p><p class="sai">${fn.sai}</p>
    <div class="campos">${fn.campos}</div>
    <details class="ver-pedido"><summary>Ver o pedido</summary><pre></pre></details>
    <div class="botoes"><button class="btn pri" data-acao="copiar">Copiar pedido</button><button class="btn sec" data-acao="mandar">Mandar para o Claude</button></div>
  </form>`).join('');
  document.querySelectorAll('.funcao').forEach((form) => {
    const fn = todas.find((x) => x.id === form.dataset.id);
    const texto = () => fn.pedido(lerForm(form)).filter(Boolean).join('\n');
    const atualiza = () => (form.querySelector('pre').textContent = texto());
    form.addEventListener('input', atualiza);
    atualiza();
    form.querySelector('[data-acao=copiar]').onclick = async () => {
      await copiar(texto());
      avisar('Pedido copiado. No Claude (aba Code, pasta Naper-Studio), cole com Ctrl+V (no Mac, Cmd+V) e aperte Enter.');
    };
    form.querySelector('[data-acao=mandar]').onclick = async () => {
      await copiar(texto());
      const r = await fetch('/api/pedido', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ funcao: fn.id, texto: texto() }) }).catch(() => null);
      avisar(r && r.ok ? 'Pedido entregue. Volte ao Claude e escreva só "vai" e Enter (ou cole com Ctrl+V).' : 'Não consegui entregar: o pedido está copiado, cole no Claude com Ctrl+V.');
    };
  });
}
async function copiar(t) {
  try {
    await navigator.clipboard.writeText(t);
  } catch {
    const a = document.createElement('textarea');
    a.value = t;
    document.body.appendChild(a);
    a.select();
    document.execCommand('copy');
    a.remove();
  }
}
let tAviso;
function avisar(t) {
  const a = $('#aviso');
  a.textContent = t;
  a.classList.add('on');
  clearTimeout(tAviso);
  tAviso = setTimeout(() => a.classList.remove('on'), 6000);
}

// ---------- Galeria ----------
let visao = 'grade';
function cardHtml(t, kanban) {
  const pend = t.feedbackPendentes ? '<span class="rede pend" title="Comentários de feedback ainda sem ajuste">' + t.feedbackPendentes + (t.feedbackPendentes === 1 ? ' ajuste pendente' : ' ajustes pendentes') + '</span>' : '';
  const miniatura = t.folha ? '<img alt="Folha de quadros" src="' + img(t.folha) + '">'
    : tipoArq(t.arquivo) === 'imagem' && abrivel(t) ? '<img alt="" src="' + midiaUrl(t.arquivo) + '">'
      : '<span>' + (t.tipo === 'relatorio' ? 'relatório' : 'sem miniatura ainda') + '</span>';
  const acoes = [
    t.status === 'pronto_para_aprovar' ? '<button class="btn pri peq" data-ap="aprovar" data-id="' + esc(t.id) + '">Aprovar</button><button class="btn sec peq" data-ap="ajuste" data-id="' + esc(t.id) + '">Pedir ajuste</button>' : '',
    t.status === 'aprovado' ? '<button class="btn sec peq" data-pedido-aprovado="' + esc(t.id) + '">Pedido para agendar</button>' : '',
    abrivel(t) ? '<button class="btn ' + (t.status === 'pronto_para_aprovar' ? 'sec' : 'pri') + ' peq" data-abrir="' + esc(t.id) + '">Abrir</button>' : '',
    t.arquivo && !kanban ? '<button class="btn sec peq" data-cam="' + esc(t.arquivo) + '">Copiar caminho</button>' : '',
    '<button class="btn sec peq" data-ver="' + esc(t.id) + '">Ver o editor</button>',
  ].join('');
  return `<article class="item${kanban ? ' kb' : ''}" data-id="${esc(t.id)}" data-status="${esc(t.status)}"${kanban && MOVER[t.status] ? ' draggable="true"' : ''}>
    ${kanban ? '' : '<div class="mini">' + miniatura + '</div>'}
    <div class="corpo"><h4>${esc(t.titulo)}</h4>
      <div class="meta">${kanban ? '' : '<span class="st ' + t.status + '">' + (ROT_STATUS[t.status] || t.status) + '</span>'}${(t.redes || []).map((r) => '<span class="rede">' + esc(r) + '</span>').join('')}${pend}${t.duracao ? '<span class="rede">' + t.duracao + ' s</span>' : ''}${t.quando ? '<span class="rede">' + esc(t.quando) + '</span>' : ''}</div>
      ${t.nota && !kanban ? '<div class="mudo" style="font-size:13px">' + esc(t.nota) + '</div>' : ''}
      ${t.arquivo && !kanban ? '<div class="cam">' + esc(t.arquivo) + '</div>' : ''}
      <div class="rodape">${kanban ? '' : '<span>' + new Date(t.atualizadoEm || t.criadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) + '</span>'}<span class="acoes-card">${acoes}</span></div>
    </div></article>`;
}
function renderGaleria(lista) {
  const cont = { todos: lista.length };
  for (const t of lista) cont[t.status] = (cont[t.status] || 0) + 1;
  const alterna = '<span class="visoes"><button data-visao="grade" class="' + (visao === 'grade' ? 'ativa' : '') + '">Grade</button><button data-visao="kanban" class="' + (visao === 'kanban' ? 'ativa' : '') + '">Kanban</button></span>';
  $('#chips').innerHTML = alterna + (visao === 'kanban' ? '' : [['todos', 'Todos'], ...Object.entries(ROT_STATUS)].map(([k, r]) =>
    '<button data-f="' + k + '" class="' + (filtro === k ? 'ativa' : '') + '">' + r + ' · ' + (cont[k] || 0) + '</button>').join(''));
  if (visao === 'kanban') return renderKanban(lista);
  $('#grade').className = 'grade';
  const vis = lista.filter((t) => filtro === 'todos' || t.status === filtro);
  $('#grade').innerHTML = vis.length ? vis.map((t) => cardHtml(t, false)).join('') : '<div class="vazio">Nada aqui ainda. Peça na Biblioteca e o Claude registra cada peça nesta Galeria.</div>';
}

// ---------- Editor ----------
function renderEditor(est) {
  const lista = est.trabalhos;
  const sel = $('#ed-escolha');
  const opcoes = lista.map((t) => '<option value="' + esc(t.id) + '">' + esc(t.titulo) + '</option>').join('');
  if (sel.dataset.o !== opcoes) {
    sel.innerHTML = opcoes;
    sel.dataset.o = opcoes;
  }
  sel.hidden = lista.length < 2;
  const alvo = lista.find((t) => t.id === escolhido) || est.atual;
  if (!alvo) {
    $('#ed-titulo').textContent = 'Nenhum trabalho em andamento';
    $('#ed-sub').textContent = 'Quando o Claude começar uma edição, você acompanha aqui cada etapa.';
    $('#etapas').innerHTML = ETAPAS.map(([, r], i) => '<li><span class="b">' + (i + 1) + '</span>' + r + '</li>').join('');
    $('#trechos').innerHTML = '';
    $('#log').innerHTML = '';
    return;
  }
  sel.value = alvo.id;
  const carregar = alvo.progresso !== undefined ? Promise.resolve(alvo) : fetch('/api/trabalho/' + encodeURIComponent(alvo.id)).then((r) => r.json());
  carregar.then((t) => {
    const p = t.progresso || { etapa: 'em_fila', trechos: [], log: [] };
    $('#ed-titulo').textContent = t.titulo;
    $('#ed-sub').innerHTML = '<span class="st ' + t.status + '">' + (ROT_STATUS[t.status] || t.status) + '</span> ' + (t.arquivo ? '<span class="cam">' + esc(t.arquivo) + '</span>' : '');
    const idx = ETAPAS.findIndex(([k]) => k === p.etapa);
    $('#etapas').innerHTML = ETAPAS.map(([k, r], i) => {
      const cls = idx > i || p.etapa === 'pronto' ? 'feita' : idx === i ? 'agora' : '';
      return '<li class="' + cls + '"><span class="b">' + (cls === 'feita' ? '✓' : i + 1) + '</span>' + r + '</li>';
    }).join('');
    const tr = p.trechos || [];
    $('#ed-qtd').textContent = tr.length ? '· ' + tr.length + ' trechos' : '';
    $('#trechos').innerHTML = tr.length ? tr.map((x, i) => {
      const cls = p.etapa === 'cortando' ? (i < (p.trechoAtual || 0) ? 'feito' : i === (p.trechoAtual || 0) ? 'agora' : '') : ['conferindo', 'pronto'].includes(p.etapa) ? 'feito' : '';
      return '<li class="' + cls + '"><span class="n">' + (i + 1) + '</span><div><div class="frase">"' + esc(x.frase || '…') + '"</div><div class="de">' + esc(x.arquivo) + ' · ' + Number(x.ini).toFixed(2) + ' s → ' + Number(x.fim).toFixed(2) + ' s</div></div></li>';
    }).join('') : '<li><span class="n">·</span><div class="mudo">Os trechos aparecem quando o Claude escolher as frases.</div></li>';
    const q = p.ultimoQuadro ? '<img alt="Último quadro" src="' + img(p.ultimoQuadro) + '">' : '<span class="mudo">ainda sem quadro</span>';
    if ($('#quadro').dataset.k !== (p.ultimoQuadro || '') + p.atualizadoEm) {
      $('#quadro').innerHTML = q;
      $('#quadro').dataset.k = (p.ultimoQuadro || '') + p.atualizadoEm;
    }
    const fo = p.folha || t.folha;
    if ($('#folha').dataset.k !== (fo || '')) {
      $('#folha').innerHTML = fo ? '<img alt="Folha de quadros" src="' + img(fo) + '">' : '<span class="mudo">sai quando o vídeo estiver montado</span>';
      $('#folha').dataset.k = fo || '';
    }
    $('#log').innerHTML = (p.log || []).slice().reverse().map((l) => '<li><time>' + new Date(l.quando).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '</time><span>' + esc(l.texto) + '</span></li>').join('') || '<li class="mudo">—</li>';
  });
}

// ---------- Navegação e ciclo ----------
function mostrar(aba) {
  abaAtual = aba;
  for (const s of ['onboarding', 'biblioteca', 'galeria', 'editor']) $('#' + s).hidden = s !== aba;
  document.querySelectorAll('#abas button').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === aba));
  if (location.hash.slice(1) !== aba) history.replaceState(null, '', '#' + aba);
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.aba) mostrar(b.dataset.aba);
  if (b.dataset.f) {
    filtro = b.dataset.f;
    renderGaleria(estado.trabalhos);
  }
  if (b.dataset.cam) copiar(estado.pasta.replace(/\\/g, '/') + '/' + b.dataset.cam).then(() => avisar('Caminho copiado.'));
  if (b.dataset.ver) {
    escolhido = b.dataset.ver;
    mostrar('editor');
    renderEditor(estado);
  }
});
$('#ed-escolha').addEventListener('change', (e) => {
  escolhido = e.target.value;
  renderEditor(estado);
});

async function ciclo() {
  try {
    const r = await fetch('/api/estado', { cache: 'no-store' });
    estado = await r.json();
    $('#vivo').className = 'vivo ok';
    $('#vivo-txt').textContent = 'ao vivo · v' + estado.versao;
    const ob = estado.onboarding;
    const k1 = JSON.stringify(ob);
    if (vistos.ob !== k1) {
      vistos.ob = k1;
      renderOnboarding(ob);
    }
    $('#abas').hidden = !ob.validado;
    if (!ob.validado && abaAtual !== 'onboarding') mostrar('onboarding');
    if (ob.validado && vistos.validado === false) mostrar('biblioteca');
    vistos.validado = ob.validado;
    const rf = await fetch('/api/funcoes', { cache: 'no-store' }).then((x) => x.json()).catch(() => null);
    if (rf && JSON.stringify(rf.funcoes) !== vistos.fn) {
      vistos.fn = JSON.stringify(rf.funcoes);
      proprias = rf.funcoes;
      renderBiblioteca();
    }
    const k2 = JSON.stringify(estado.trabalhos);
    if (vistos.tr !== k2) {
      vistos.tr = k2;
      renderGaleria(estado.trabalhos);
    }
    if (abaAtual === 'editor') renderEditor(estado);
  } catch {
    $('#vivo').className = 'vivo erro';
    $('#vivo-txt').textContent = 'painel desligado · peça ao Claude para abrir de novo';
  }
}
renderBiblioteca();
const inicial = location.hash.slice(1);
if (['onboarding', 'biblioteca', 'galeria', 'editor'].includes(inicial)) abaAtual = inicial;
mostrar(abaAtual);
// O endereço mudou (link, favorito ou o Claude abrindo #editor): troca de aba sem recarregar.
window.addEventListener('hashchange', () => {
  const aba = location.hash.slice(1);
  if (['onboarding', 'biblioteca', 'galeria', 'editor'].includes(aba) && aba !== abaAtual) mostrar(aba);
});
ciclo().then(() => {
  if (estado && estado.onboarding.validado && abaAtual === 'onboarding' && inicial !== 'onboarding') mostrar('biblioteca');
});
setInterval(ciclo, 2000);

// ---------- Abrir: vídeo (linha do tempo), imagem, relatório em Markdown, texto ----------
function tipoArq(rel) {
  const e = (String(rel || '').match(/\.([a-z0-9]+)$/i) || [])[1];
  const x = String(e || '').toLowerCase();
  if (['mp4', 'm4v', 'mov', 'webm'].includes(x)) return 'video';
  if (['png', 'jpg', 'jpeg', 'webp'].includes(x)) return 'imagem';
  if (x === 'md') return 'md';
  if (['txt', 'json'].includes(x)) return 'texto';
  return '';
}
const abrivel = (t) => !!t.arquivo && !!tipoArq(t.arquivo) && /^(estudio|relatorios)\//.test(t.arquivo);
const midiaUrl = (rel) => '/midia/' + String(rel).split('/').map(encodeURIComponent).join('/');
const mmss = (s) => {
  s = Math.max(0, Math.round(Number(s) || 0));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};

// Conversor de Markdown simples (títulos, listas, negrito, itálico, tabelas, links, código, citação). Escapa todo HTML.
function mdInline(t) {
  const cod = [];
  t = t.replace(/`([^`]+)`/g, (_, c) => {
    cod.push('<code>' + esc(c) + '</code>');
    return '' + (cod.length - 1) + '';
  });
  t = esc(t);
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/__([^_]+)__/g, '<b>$1</b>');
  t = t.replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>').replace(/(^|[\s(])_([^_\s][^_]*)_(?=[\s).,;:!?]|$)/g, '$1<i>$2</i>');
  t = t.replace(/~~([^~]+)~~/g, '<s>$1</s>');
  return t.replace(/(\d+)/g, (_, i) => cod[Number(i)]);
}
function mdParaHtml(src) {
  const L = String(src).replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  const celulas = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const ehTabela = (k) => k + 1 < L.length && /\|/.test(L[k]) && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(L[k + 1]);
  const item = (l) => /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(l);
  while (i < L.length) {
    const l = L[i];
    if (!l.trim()) { i++; continue; }
    if (/^\s*```/.test(l)) {
      const cod = [];
      i++;
      while (i < L.length && !/^\s*```/.test(L[i])) cod.push(L[i++]);
      i++;
      out.push('<pre class="md-cod"><code>' + esc(cod.join('\n')) + '</code></pre>');
      continue;
    }
    let m = /^(#{1,6})\s+(.*)$/.exec(l);
    if (m) { out.push('<h' + m[1].length + '>' + mdInline(m[2].replace(/\s+#+\s*$/, '')) + '</h' + m[1].length + '>'); i++; continue; }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)) { out.push('<hr>'); i++; continue; }
    if (/^\s*>/.test(l)) {
      const q = [];
      while (i < L.length && /^\s*>/.test(L[i])) q.push(L[i++].replace(/^\s*>\s?/, ''));
      out.push('<blockquote>' + mdParaHtml(q.join('\n')) + '</blockquote>');
      continue;
    }
    if (ehTabela(i)) {
      const cab = celulas(l);
      i += 2;
      const linhas = [];
      while (i < L.length && L[i].trim() && /\|/.test(L[i])) linhas.push(celulas(L[i++]));
      out.push('<div class="md-tab"><table><thead><tr>' + cab.map((c) => '<th>' + mdInline(c) + '</th>').join('') + '</tr></thead><tbody>' +
        linhas.map((r) => '<tr>' + cab.map((_, k) => '<td>' + mdInline(r[k] || '') + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
      continue;
    }
    if (item(l)) {
      const pilha = [];
      let html = '';
      while (i < L.length && item(L[i])) {
        const [, ind, marca, txt] = item(L[i]);
        const nivel = Math.floor(ind.replace(/\t/g, '  ').length / 2);
        const tag = /\d/.test(marca) ? 'ol' : 'ul';
        while (pilha.length > nivel + 1) html += '</li></' + pilha.pop() + '>';
        if (pilha.length === nivel + 1 && pilha[nivel] !== tag) {
          html += '</li></' + pilha[nivel] + '><' + tag + '>';
          pilha[nivel] = tag;
        } else if (pilha.length === nivel + 1) html += '</li>';
        else while (pilha.length < nivel + 1) { html += '<' + tag + '>'; pilha.push(tag); }
        html += '<li>' + mdInline(txt.replace(/^\[( |x|X)\]\s+/, (_, c) => (c === ' ' ? '☐ ' : '☑ ')));
        i++;
      }
      while (pilha.length) html += '</li></' + pilha.pop() + '>';
      out.push(html);
      continue;
    }
    const par = [];
    while (i < L.length && L[i].trim() && !/^(#{1,6}\s|\s*```|\s*>|\s*([-*+]|\d+[.)])\s)/.test(L[i]) && !ehTabela(i)) par.push(L[i++]);
    if (!par.length) { par.push(L[i++]); }
    out.push('<p>' + par.map(mdInline).join('<br>') + '</p>');
  }
  return out.join('\n');
}

let vid = null; // { trabalho, comentarios, tipo, trecho }
function abrirItem(id) {
  const t = estado.trabalhos.find((x) => x.id === id);
  if (!t || !abrivel(t)) return;
  const tipo = tipoArq(t.arquivo);
  vid = { trabalho: t, comentarios: [], tipo, trecho: '' };
  let m = $('#modal-video');
  if (!m) {
    m = document.createElement('div');
    m.id = 'modal-video';
    m.className = 'modal';
    document.body.appendChild(m);
  }
  m.hidden = false;
  document.body.style.overflow = 'hidden';
  const url = midiaUrl(t.arquivo) + '?t=' + Date.now();
  const aprova = t.status === 'pronto_para_aprovar'
    ? '<button class="btn pri peq" data-ap="aprovar" data-id="' + esc(t.id) + '">Aprovar</button> <button class="btn sec peq" data-ap="ajuste" data-id="' + esc(t.id) + '">Pedir ajuste</button> ' : '';
  const painel = tipo === 'video'
    ? `<div class="player"><video id="v-player" controls playsinline preload="metadata" src="${url}"></video>
        <div class="linha-tempo" id="v-linha" title="Clique para ir até este ponto"><div class="lt-prog" id="v-prog"></div><div id="v-marcas"></div></div>
        <div class="lt-tempo"><span id="v-agora">00:00</span><span id="v-total">00:00</span></div></div>`
    : tipo === 'imagem' ? `<div class="doc doc-img"><img src="${url}" alt="${esc(t.titulo)}"></div>`
      : `<div class="doc ${tipo === 'md' ? 'md' : 'txt'}" id="v-doc"><p class="mudo">Abrindo…</p></div>`;
  const quando = tipo === 'video' ? 'Pause no ponto que quer mudar e escreva o que ajustar.'
    : tipo === 'imagem' ? 'Escreva o que ajustar nesta imagem.'
      : 'Escreva o que ajustar. Para falar de um trecho, selecione o texto antes.';
  m.innerHTML = `<div class="modal-cx ${tipo === 'video' ? '' : 'larga'}" role="dialog" aria-label="Abrir">
    <div class="modal-topo"><div><h3>${esc(t.titulo)}</h3><span class="cam">${esc(t.arquivo)}</span></div><div class="topo-acoes">${aprova}<button class="btn sec peq" data-fechar-video>Fechar</button></div></div>
    <div class="modal-corpo">${painel}
      <div class="fb">
        <h4>Feedback</h4>
        <p class="mudo" style="margin:0 0 8px;font-size:13px">${quando}</p>
        <div class="trecho-sel" id="v-trecho" hidden></div>
        <textarea id="v-texto" rows="3" placeholder="O que mudar${tipo === 'video' ? ' neste ponto' : ''}?"></textarea>
        <div class="botoes"><button class="btn pri" id="v-comentar">${tipo === 'video' ? 'Comentar em <span id="v-ponto">00:00</span>' : 'Comentar'}</button></div>
        <ul class="fb-lista" id="v-lista"></ul>
        <div class="botoes"><button class="btn sec" id="v-mandar">Mandar feedback para o Claude</button></div>
      </div>
    </div></div>`;
  const v = $('#v-player');
  const atual = () => (v ? v.currentTime || 0 : 0);
  const dur = () => (v && isFinite(v.duration) && v.duration > 0 ? v.duration : 0);
  if (v) {
    v.addEventListener('timeupdate', () => {
      if (!vid || !$('#v-agora')) return;
      $('#v-agora').textContent = mmss(atual());
      $('#v-ponto').textContent = mmss(atual());
      if (dur()) $('#v-prog').style.width = (100 * atual() / dur()) + '%';
    });
    v.addEventListener('loadedmetadata', () => {
      if (!vid || !$('#v-total')) return;
      $('#v-total').textContent = mmss(dur());
      desenharMarcas();
    });
    $('#v-linha').onclick = (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      if (dur()) v.currentTime = Math.min(dur(), Math.max(0, ((e.clientX - r.left) / r.width) * dur()));
    };
    $('#v-texto').addEventListener('focus', () => v.pause());
  }
  const doc = $('#v-doc');
  if (doc) {
    fetch(url, { cache: 'no-store' }).then((r) => r.text()).then((txt) => {
      if (!vid || vid.trabalho.id !== t.id) return;
      if (tipo === 'md') doc.innerHTML = mdParaHtml(txt);
      else {
        let s = txt;
        if (/\.json$/i.test(t.arquivo)) {
          try {
            s = JSON.stringify(JSON.parse(txt), null, 2);
          } catch { /* mostra como veio */ }
        }
        doc.innerHTML = '<pre>' + esc(s) + '</pre>';
      }
    }).catch(() => (doc.innerHTML = '<p class="mudo">Não consegui abrir este arquivo.</p>'));
    doc.addEventListener('mouseup', () => {
      const s = String(window.getSelection ? window.getSelection() : '').trim();
      if (s && s.length > 2) {
        vid.trecho = s.slice(0, 300);
        const el = $('#v-trecho');
        el.hidden = false;
        el.innerHTML = '<span>Trecho: «' + esc(vid.trecho.slice(0, 120)) + (vid.trecho.length > 120 ? '…' : '') + '»</span> <button class="btn sec peq" data-limpar-trecho>Tirar</button>';
      }
    });
  }
  $('#v-texto').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('#v-comentar').click();
  });
  $('#v-comentar').onclick = async () => {
    const texto = $('#v-texto').value.trim();
    if (!texto) return $('#v-texto').focus();
    if (v) v.pause();
    const corpo = { t: tipo === 'video' ? atual() : null, texto, trecho: vid.trecho || undefined };
    const r = await fetch('/api/feedback/' + encodeURIComponent(t.id), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) }).catch(() => null);
    if (!r || !r.ok) return avisar('Não consegui salvar o comentário.');
    vid.comentarios = (await r.json()).comentarios;
    vid.trecho = '';
    $('#v-trecho').hidden = true;
    $('#v-texto').value = '';
    desenharFeedback();
    ciclo();
  };
  $('#v-mandar').onclick = () => enviarPedido(pedidoAjuste(t), 'feedback', true);
  fetch('/api/feedback/' + encodeURIComponent(t.id), { cache: 'no-store' }).then((r) => r.json()).then((f) => {
    if (!vid || vid.trabalho.id !== t.id) return;
    vid.comentarios = f.comentarios || [];
    desenharFeedback();
  }).catch(() => {});
  desenharFeedback();
}
const pedidoAjuste = (t) => 'Naper Studio · Ajustes ' + (tipoArq(t.arquivo) === 'video' ? 'no vídeo ' : 'em ') + t.titulo + ' (' + t.arquivo + '): siga o feedback da Galeria em estudio/trabalhos/' + t.id + '/feedback.json e faça uma nova versão.';
const pedidoAprovado = (t) => 'Naper Studio · Aprovado: ' + t.titulo + ' (' + (t.arquivo || t.id) + ') — pode agendar como combinado.';
async function enviarPedido(texto, funcao, aviso) {
  await copiar(texto);
  const r = await fetch('/api/pedido', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ funcao, texto }) }).catch(() => null);
  avisar(r && r.ok ? 'Pedido entregue. Volte ao Claude e escreva só "vai" e Enter (ou cole com Ctrl+V).' : 'Pedido copiado. No Claude (aba Code, pasta Naper-Studio), cole com Ctrl+V e aperte Enter.');
  return !!aviso;
}
function fecharVideo() {
  const m = $('#modal-video');
  if (!m) return;
  const v = $('#v-player');
  if (v) {
    v.pause();
    v.removeAttribute('src');
    v.load();
  }
  m.hidden = true;
  m.innerHTML = '';
  document.body.style.overflow = '';
  vid = null;
}
function desenharMarcas() {
  const v = $('#v-player');
  const box = $('#v-marcas');
  if (!v || !box || !vid) return;
  const d = isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
  box.innerHTML = d ? vid.comentarios.filter((c) => c.t != null).map((c) => '<button class="lt-marca' + (c.feito ? ' feita' : '') + '" style="left:' + Math.min(100, 100 * c.t / d) + '%" data-ir="' + c.t + '" title="' + mmss(c.t) + ' · ' + esc(c.texto) + '"></button>').join('') : '';
}
function desenharFeedback() {
  if (!vid) return;
  const lista = vid.comentarios.slice().sort((a, b) => (a.t == null ? 1e9 : a.t) - (b.t == null ? 1e9 : b.t) || a.n - b.n);
  $('#v-lista').innerHTML = lista.length ? lista.map((c) => `<li class="${c.feito ? 'feito' : ''}">
    ${c.t != null ? '<button class="tempo" data-ir="' + c.t + '">' + mmss(c.t) + '</button>' : '<span class="tempo geral">geral</span>'}
    <span class="txt">${c.trecho ? '<q>' + esc(c.trecho) + '</q> ' : ''}${esc(c.texto)}</span>
    <span class="acoes"><button class="btn sec peq" data-fb="${c.feito ? 'desfeito' : 'feito'}" data-n="${c.n}">${c.feito ? 'Reabrir' : 'Feito'}</button><button class="btn sec peq" data-fb="apagar" data-n="${c.n}">Apagar</button></span></li>`).join('')
    : '<li class="mudo">Nenhum comentário ainda.</li>';
  desenharMarcas();
}

// ---------- Aprovação ----------
const MOVER = { pronto_para_aprovar: ['aprovado', 'ajustar'], aprovado: ['pronto_para_aprovar', 'ajustar'], ajustar: ['pronto_para_aprovar'] };
async function moverStatus(id, status) {
  const r = await fetch('/api/trabalho/' + encodeURIComponent(id) + '/status', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) }).catch(() => null);
  if (!r || !r.ok) {
    avisar('Não deu para mudar: ' + ((r && (await r.json().catch(() => ({}))).erro) || 'sem resposta do painel'));
    return null;
  }
  await ciclo();
  return r.json();
}
function mostrarPedido(titulo, texto, funcao) {
  let m = $('#modal-pedido');
  if (!m) {
    m = document.createElement('div');
    m.id = 'modal-pedido';
    m.className = 'modal';
    document.body.appendChild(m);
  }
  m.hidden = false;
  m.innerHTML = '<div class="modal-cx pedido"><div class="modal-topo"><h3>' + esc(titulo) + '</h3><button class="btn sec peq" data-fechar-pedido>Fechar</button></div><div class="modal-corpo um"><div><textarea class="pedido-txt" rows="5"></textarea><div class="botoes"><button class="btn pri" data-pedido="copiar">Copiar pedido</button> <button class="btn sec" data-pedido="mandar">Mandar para o Claude</button></div></div></div></div>';
  const ta = m.querySelector('textarea');
  ta.value = texto;
  m.querySelector('[data-pedido=copiar]').onclick = async () => {
    await copiar(ta.value);
    avisar('Pedido copiado. No Claude (aba Code, pasta Naper-Studio), cole com Ctrl+V e aperte Enter.');
  };
  m.querySelector('[data-pedido=mandar]').onclick = () => enviarPedido(ta.value, funcao);
}
async function aprovar(id) {
  const t = await moverStatus(id, 'aprovado');
  if (!t) return;
  fecharVideo();
  mostrarPedido('Aprovado! Agora é só o Claude agendar', pedidoAprovado(t), 'aprovado');
}
async function pedirAjuste(id) {
  const t = await moverStatus(id, 'ajustar');
  if (!t) return;
  if (abrivel(t)) {
    fecharVideo();
    abrirItem(id);
    avisar('Marcado para ajustar. Comente o que mudar e clique em "Mandar feedback para o Claude".');
  } else mostrarPedido('Pedir ajuste', pedidoAjuste(t), 'feedback');
}

// ---------- Kanban ----------
const COLUNAS = ['em_fila', 'editando', 'pronto_para_aprovar', 'ajustar', 'aprovado', 'agendado', 'publicado'];
function renderKanban(lista) {
  $('#grade').className = 'kanban';
  $('#grade').innerHTML = COLUNAS.map((c) => {
    const itens = lista.filter((t) => t.status === c);
    return '<section class="col" data-col="' + c + '"><h5><span class="st ' + c + '">' + ROT_STATUS[c] + '</span><em>' + itens.length + '</em></h5><div class="col-itens">' +
      (itens.map((t) => cardHtml(t, true)).join('') || '<p class="mudo vazio-col">—</p>') + '</div></section>';
  }).join('');
}
let arrastando = null;
document.addEventListener('dragstart', (e) => {
  const c = e.target.closest && e.target.closest('.item[data-id]');
  if (!c) return;
  arrastando = { id: c.dataset.id, de: c.dataset.status };
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', c.dataset.id);
  document.querySelectorAll('.col').forEach((col) => col.classList.toggle('alvo', (MOVER[arrastando.de] || []).includes(col.dataset.col)));
});
document.addEventListener('dragend', () => {
  arrastando = null;
  document.querySelectorAll('.col').forEach((col) => col.classList.remove('alvo', 'sobre'));
});
document.addEventListener('dragover', (e) => {
  const col = e.target.closest && e.target.closest('.col');
  if (col && arrastando && (MOVER[arrastando.de] || []).includes(col.dataset.col)) {
    e.preventDefault();
    col.classList.add('sobre');
  }
});
document.addEventListener('dragleave', (e) => {
  const col = e.target.closest && e.target.closest('.col');
  if (col && !col.contains(e.relatedTarget)) col.classList.remove('sobre');
});
document.addEventListener('drop', (e) => {
  const col = e.target.closest && e.target.closest('.col');
  if (!col || !arrastando || !(MOVER[arrastando.de] || []).includes(col.dataset.col)) return;
  e.preventDefault();
  const { id } = arrastando;
  if (col.dataset.col === 'aprovado') aprovar(id);
  else if (col.dataset.col === 'ajustar') pedirAjuste(id);
  else moverStatus(id, col.dataset.col);
});

document.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (e.target.id === 'modal-video' || (b && b.hasAttribute('data-fechar-video'))) return fecharVideo();
  if (e.target.id === 'modal-pedido' || (b && b.hasAttribute('data-fechar-pedido'))) {
    $('#modal-pedido').hidden = true;
    return;
  }
  if (!b) return;
  if (b.dataset.abrir) abrirItem(b.dataset.abrir);
  if (b.dataset.visao) {
    visao = b.dataset.visao;
    renderGaleria(estado.trabalhos);
  }
  if (b.dataset.ap === 'aprovar') aprovar(b.dataset.id);
  if (b.dataset.ap === 'ajuste') pedirAjuste(b.dataset.id);
  if (b.dataset.pedidoAprovado) {
    const t = estado.trabalhos.find((x) => x.id === b.dataset.pedidoAprovado);
    if (t) mostrarPedido('Pedido para agendar', pedidoAprovado(t), 'aprovado');
  }
  if (b.hasAttribute('data-limpar-trecho') && vid) {
    vid.trecho = '';
    $('#v-trecho').hidden = true;
  }
  if (b.dataset.ir !== undefined && $('#v-player')) {
    const v = $('#v-player');
    v.currentTime = Number(b.dataset.ir) || 0;
    v.pause();
  }
  if (b.dataset.fb && vid) {
    const r = await fetch('/api/feedback/' + encodeURIComponent(vid.trabalho.id) + '/' + b.dataset.n + '/' + b.dataset.fb, { method: 'POST' }).catch(() => null);
    if (r && r.ok) {
      vid.comentarios = (await r.json()).comentarios;
      desenharFeedback();
      ciclo();
    }
  }
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-editar]');
  if (!b) return;
  const p = proprias.find((x) => x.slug === b.dataset.editar);
  if (!p) return;
  const texto = 'Naper Studio · Ajustar a função ' + p.titulo + ' (minhas-funcoes/' + p.slug + '.json e .md): o que mudar: ';
  mostrarPedido('Ajustar "' + p.titulo + '"', texto, 'ajustar-funcao');
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const p = $('#modal-pedido');
  if (p && !p.hidden) p.hidden = true;
  else if (vid) fecharVideo();
});
