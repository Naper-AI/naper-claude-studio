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
const ROT_STATUS = { em_fila: 'Em fila', editando: 'Editando', pronto_para_aprovar: 'Pronto para aprovar', agendado: 'Agendado', publicado: 'Publicado' };
const ETAPAS = [
  ['transcrevendo', 'Transcrevendo'], ['escolhendo', 'Escolhendo trechos'], ['cortando', 'Cortando'], ['conferindo', 'Conferindo'], ['pronto', 'Pronto'],
];

// ---------- Onboarding ----------
const DETALHE_NAPER = `<ol>
<li>No app do Claude, abra <b>Configurações › Conectores</b>.</li>
<li>Clique em <b>Adicionar conector personalizado</b>.</li>
<li>Nome: <b>Naper</b> · URL: <code>https://api.naper.ai/mcp</code> · clique em <b>Conectar</b>.</li>
<li>O navegador abre na Naper: entre com o seu número de WhatsApp (chega um código).</li>
<li>Deixe a sua conta marcada e clique em <b>Autorizar</b>. Volte ao Claude e diga <b>pronto</b>.</li>
</ol>
<p style="margin:8px 0 0">Na tela da Naper há dois interruptores. <b>Publicar, agendar e mandar nos grupos sem aprovação</b> vem ligado: o Claude publica quando você disser "pode" na conversa; quem prefere aprovar cada post no app desliga. <b>Ligar automações (EU QUERO, DMs)</b> vem desligado: ligado, o Claude pode configurar o EU QUERO por você.</p>
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
function renderBiblioteca() {
  $('#funcoes').innerHTML = FUNCOES.map((fn) => `<form class="funcao" data-id="${fn.id}" onsubmit="return false">
    <span class="num">FUNÇÃO ${fn.num}</span><h2>${fn.titulo}</h2><p class="desc">${fn.desc}</p><p class="sai">${fn.sai}</p>
    <div class="campos">${fn.campos}</div>
    <details class="ver-pedido"><summary>Ver o pedido</summary><pre></pre></details>
    <div class="botoes"><button class="btn pri" data-acao="copiar">Copiar pedido</button><button class="btn sec" data-acao="mandar">Mandar para o Claude</button></div>
  </form>`).join('');
  document.querySelectorAll('.funcao').forEach((form) => {
    const fn = FUNCOES.find((x) => x.id === form.dataset.id);
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
function renderGaleria(lista) {
  const cont = { todos: lista.length };
  for (const t of lista) cont[t.status] = (cont[t.status] || 0) + 1;
  $('#chips').innerHTML = [['todos', 'Todos'], ...Object.entries(ROT_STATUS)].map(([k, r]) =>
    '<button data-f="' + k + '" class="' + (filtro === k ? 'ativa' : '') + '">' + r + ' · ' + (cont[k] || 0) + '</button>').join('');
  const vis = lista.filter((t) => filtro === 'todos' || t.status === filtro);
  $('#grade').innerHTML = vis.length ? vis.map((t) => `<article class="item">
    <div class="mini">${t.folha ? '<img alt="Folha de quadros" src="' + img(t.folha) + '">' : '<span>' + (t.tipo === 'relatorio' ? 'relatório' : 'sem miniatura ainda') + '</span>'}</div>
    <div class="corpo"><h4>${esc(t.titulo)}</h4>
      <div class="meta"><span class="st ${t.status}">${ROT_STATUS[t.status] || t.status}</span>${(t.redes || []).map((r) => '<span class="rede">' + esc(r) + '</span>').join('')}${t.duracao ? '<span class="rede">' + t.duracao + ' s</span>' : ''}${t.quando ? '<span class="rede">' + esc(t.quando) + '</span>' : ''}</div>
      ${t.nota ? '<div class="mudo" style="font-size:13px">' + esc(t.nota) + '</div>' : ''}
      ${t.arquivo ? '<div class="cam">' + esc(t.arquivo) + '</div>' : ''}
      <div class="rodape"><span>${new Date(t.atualizadoEm || t.criadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
      <span>${t.arquivo ? '<button class="btn sec peq" data-cam="' + esc(t.arquivo) + '">Copiar caminho</button> ' : ''}<button class="btn sec peq" data-ver="${esc(t.id)}">Ver o editor</button></span></div>
    </div></article>`).join('') : '<div class="vazio">Nada aqui ainda. Peça na Biblioteca e o Claude registra cada peça nesta Galeria.</div>';
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
ciclo().then(() => {
  if (estado && estado.onboarding.validado && abaAtual === 'onboarding' && inicial !== 'onboarding') mostrar('biblioteca');
});
setInterval(ciclo, 2000);
