// Estado do Naper Studio: onboarding (estado/onboarding.json) e trabalhos (estudio/trabalhos.json e
// estudio/trabalhos/<id>/progresso.json). Tudo em arquivos locais, nada vai para a internet.
// Usado pelo painel (servidor.mjs), pelo registrar.mjs e pelo kit de reedição.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PORTA = Number(process.env.NAPER_STUDIO_PORTA || 4747);
export const ARQ_ONBOARDING = path.join(RAIZ, 'estado', 'onboarding.json');
export const ARQ_TRABALHOS = path.join(RAIZ, 'estudio', 'trabalhos.json');
export const DIR_TRABALHOS = path.join(RAIZ, 'estudio', 'trabalhos');

// Os passos do onboarding, na ordem. "dela" = o que só ela pode fazer (o resto o Claude faz).
export const PASSOS = [
  { id: 'claude', titulo: 'Claude Code funcionando', explica: 'O Claude abriu nesta pasta e já trabalha por você.', dela: '' },
  { id: 'repositorio', titulo: 'Naper Studio instalado e atualizando', explica: 'A pasta Documentos/Naper-Studio se atualiza sozinha toda vez que você abre o Claude.', dela: '' },
  { id: 'ferramentas', titulo: 'Node e FFmpeg', explica: 'Os programas que cortam e juntam os seus vídeos. O Claude avisa e instala sozinho.', dela: 'Clicar em Sim se o computador pedir permissão.' },
  { id: 'transcricao', titulo: 'Transcrição dos vídeos (whisper)', explica: 'Lê a fala dos seus vídeos no seu computador, para cortar sempre no fim da frase.', dela: '' },
  { id: 'naper', titulo: 'Naper conectada', explica: 'Liga o Claude à sua conta da Naper: vendas, vídeos, produtos, grupos e publicação.', dela: 'No app do Claude: Plugins (barra da esquerda) › Adicionar › Adicionar conector personalizado › Nome "Naper" › URL https://api.naper.ai/mcp › Continuar › Adicionar › Continuar conectando › entrar na Naper › Autorizar › Abrir Claude.' },
  { id: 'teste_naper', titulo: 'Teste da Naper', explica: 'O Claude puxa o seu panorama para confirmar que a conexão funciona.', dela: '' },
  { id: 'marca', titulo: 'A sua marca', explica: 'Seus @, nicho, lojas, tom de voz e marcas sim/não. O Claude sugere pelos seus dados; você confirma.', dela: 'Responder perguntas curtas.' },
  { id: 'whatsapp', titulo: 'WhatsApp', explica: 'Grupos de ofertas pela Naper. WhatsApp pessoal pelo Claude no Chrome é opcional: você aprova cada mensagem.', dela: 'Dizer se quer usar o WhatsApp pessoal (opcional).' },
  { id: 'publicacao', titulo: 'Chrome de publicação', explica: 'Um Chrome só do Naper Studio, onde você entra uma vez no TikTok e no YouTube. Com ele, o Claude posta sozinho com o produto no carrinho.', dela: 'Entrar uma vez no seu TikTok (e YouTube, se usa) no Chrome que o Claude abrir.' },
  { id: 'validacao', titulo: 'Validação', explica: 'O Claude faz um teste de ponta a ponta (Naper, vídeo e painel) e libera a Biblioteca.', dela: '' },
];
export const STATUS_PASSO = ['falta', 'fazendo', 'precisa_voce', 'ok', 'pulado', 'erro'];

export const ETAPAS = ['em_fila', 'transcrevendo', 'escolhendo', 'cortando', 'conferindo', 'pronto'];
export const STATUS_TRABALHO = ['em_fila', 'editando', 'pronto_para_aprovar', 'ajustar', 'aprovado', 'agendado', 'publicado'];

export function ler(arq, padrao) {
  try {
    return JSON.parse(fs.readFileSync(arq, 'utf8'));
  } catch {
    return padrao;
  }
}
// Grava de forma atômica (arquivo temporário + rename) para o painel nunca ler um JSON pela metade.
export function gravar(arq, dados) {
  fs.mkdirSync(path.dirname(arq), { recursive: true });
  const tmp = arq + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(dados, null, 2));
  try {
    fs.renameSync(tmp, arq);
  } catch {
    fs.writeFileSync(arq, JSON.stringify(dados, null, 2));
    fs.rmSync(tmp, { force: true });
  }
}
const agora = () => new Date().toISOString();

export function onboarding() {
  const o = ler(ARQ_ONBOARDING, {});
  const passos = PASSOS.map((p) => ({ ...p, status: 'falta', nota: '', ...(o.passos?.[p.id] || {}) }));
  return { validado: !!o.validado, validadoEm: o.validadoEm || null, passos };
}
export function marcarPasso(id, status, nota = '') {
  if (!PASSOS.some((p) => p.id === id)) throw new Error('passo desconhecido: ' + id + ' (use: ' + PASSOS.map((p) => p.id).join(', ') + ')');
  if (!STATUS_PASSO.includes(status)) throw new Error('status inválido: ' + status + ' (use: ' + STATUS_PASSO.join(', ') + ')');
  const o = ler(ARQ_ONBOARDING, {});
  o.passos = o.passos || {};
  o.passos[id] = { status, nota, quando: agora() };
  gravar(ARQ_ONBOARDING, o);
}
export function validar() {
  const ob = onboarding();
  const faltam = ob.passos.filter((p) => p.id !== 'validacao' && !['ok', 'pulado'].includes(p.status));
  if (faltam.length) throw new Error('ainda faltam: ' + faltam.map((p) => p.id).join(', '));
  const o = ler(ARQ_ONBOARDING, {});
  o.passos = o.passos || {};
  o.passos.validacao = { status: 'ok', nota: 'Teste de ponta a ponta feito.', quando: agora() };
  o.validado = true;
  o.validadoEm = agora();
  gravar(ARQ_ONBOARDING, o);
}

export function trabalhos() {
  const t = ler(ARQ_TRABALHOS, { trabalhos: [] });
  return Array.isArray(t.trabalhos) ? t.trabalhos : [];
}
// Cria ou atualiza um trabalho (item da Galeria). Campos: titulo, tipo, produto, redes, status, arquivo, folha, nota.
export function salvarTrabalho(id, campos, { novo = false } = {}) {
  if (!/^[a-z0-9][a-z0-9._-]{0,80}$/i.test(id)) throw new Error('id inválido (use letras, números, - e _): ' + id);
  if (campos.status && !STATUS_TRABALHO.includes(campos.status)) throw new Error('status inválido: ' + campos.status + ' (use: ' + STATUS_TRABALHO.join(', ') + ')');
  const t = ler(ARQ_TRABALHOS, { trabalhos: [] });
  t.trabalhos = Array.isArray(t.trabalhos) ? t.trabalhos : [];
  let item = t.trabalhos.find((x) => x.id === id);
  // --novo: quem cria uma peça nova nunca reaproveita o id de outra conversa (duas funções podem rodar juntas).
  if (item && novo) throw new Error('já existe um trabalho com o id ' + id + ' (de outra conversa?): escolha outro id');
  if (!item) {
    item = { id, titulo: id, tipo: 'video', status: 'em_fila', criadoEm: agora() };
    t.trabalhos.unshift(item);
  }
  for (const [k, v] of Object.entries(campos)) if (v !== undefined) item[k] = v;
  item.atualizadoEm = agora();
  gravar(ARQ_TRABALHOS, t);
  return item;
}
// Tira um item da Galeria (e o progresso dele). Os arquivos em estudio/ não são apagados.
export function removerTrabalho(id) {
  const t = ler(ARQ_TRABALHOS, { trabalhos: [] });
  const antes = Array.isArray(t.trabalhos) ? t.trabalhos.length : 0;
  t.trabalhos = (t.trabalhos || []).filter((x) => x.id !== id);
  if (t.trabalhos.length === antes) throw new Error('não achei o trabalho ' + id);
  gravar(ARQ_TRABALHOS, t);
  fs.rmSync(path.join(DIR_TRABALHOS, id), { recursive: true, force: true });
}
export function arqProgresso(id) {
  return path.join(DIR_TRABALHOS, id, 'progresso.json');
}
export function progresso(id) {
  return ler(arqProgresso(id), null);
}
// Registra a etapa do trabalho ao vivo (o "Ver o editor" do painel lê isto a cada 2 s).
export function registrarProgresso(id, campos) {
  const p = ler(arqProgresso(id), { id, etapa: 'em_fila', trechos: [], log: [] });
  for (const [k, v] of Object.entries(campos)) if (v !== undefined && k !== 'mensagem') p[k] = v;
  if (campos.mensagem) {
    p.log = [...(p.log || []), { quando: agora(), etapa: p.etapa, texto: campos.mensagem }].slice(-40);
  }
  p.atualizadoEm = agora();
  gravar(arqProgresso(id), p);
  const status = p.etapa === 'pronto' ? 'pronto_para_aprovar' : p.etapa === 'em_fila' ? 'em_fila' : 'editando';
  const atual = trabalhos().find((x) => x.id === id);
  const manter = atual && ['aprovado', 'agendado', 'publicado'].includes(atual.status);
  salvarTrabalho(id, { status: manter ? atual.status : status, etapa: p.etapa });
  return p;
}
// Caminho relativo à raiz, com barras normais (é o que o painel mostra e usa nas miniaturas).
export function relativo(arq) {
  if (!arq) return arq;
  return path.relative(RAIZ, path.resolve(arq)).split(path.sep).join('/');
}
export function versao() {
  try {
    return fs.readFileSync(path.join(RAIZ, 'VERSAO'), 'utf8').trim();
  } catch {
    return '0.0.0';
  }
}

// ---------- Feedback na linha do tempo do vídeo (estudio/trabalhos/<id>/feedback.json) ----------
// Cada comentário: { n, t (segundos), texto, feito, criadoEm }. "n" é fixo (não muda quando outro é apagado).
const ID_OK = /^[a-z0-9][a-z0-9._-]{0,80}$/i;
export function arqFeedback(id) {
  if (!ID_OK.test(String(id))) throw new Error('id inválido: ' + id);
  return path.join(DIR_TRABALHOS, id, 'feedback.json');
}
export function feedback(id) {
  const f = ler(arqFeedback(id), { comentarios: [] });
  return { comentarios: Array.isArray(f.comentarios) ? f.comentarios : [] };
}
// t = segundos (vídeo) ou null (comentário geral, em relatório/imagem). trecho = parte do texto escolhida (opcional).
export function feedbackAdicionar(id, t, texto, trecho) {
  const geral = t === null || t === undefined || t === '';
  const seg = geral ? null : Number(t);
  const txt = String(texto || '').trim().slice(0, 2000);
  if (!geral && (!Number.isFinite(seg) || seg < 0 || seg > 86400)) throw new Error('tempo inválido');
  if (!txt) throw new Error('comentário vazio');
  const f = feedback(id);
  const n = f.comentarios.reduce((m, c) => Math.max(m, c.n || 0), 0) + 1;
  const c = { n, t: geral ? null : Math.round(seg * 10) / 10, texto: txt, feito: false, criadoEm: agora() };
  if (trecho && typeof trecho === 'string') c.trecho = trecho.trim().slice(0, 400);
  f.comentarios.push(c);
  gravar(arqFeedback(id), f);
  return c;
}
export function feedbackMarcar(id, n, feito = true) {
  const f = feedback(id);
  const c = f.comentarios.find((x) => x.n === Number(n));
  if (!c) throw new Error('não achei o comentário ' + n);
  c.feito = !!feito;
  c.feitoEm = feito ? agora() : undefined;
  gravar(arqFeedback(id), f);
  return c;
}
export function feedbackApagar(id, n) {
  const f = feedback(id);
  const antes = f.comentarios.length;
  f.comentarios = f.comentarios.filter((x) => x.n !== Number(n));
  if (f.comentarios.length === antes) throw new Error('não achei o comentário ' + n);
  gravar(arqFeedback(id), f);
}
// Quantos comentários pendentes cada trabalho tem (para o selo da Galeria).
export function feedbackPendentes(id) {
  try {
    return feedback(id).comentarios.filter((c) => !c.feito).length;
  } catch {
    return 0;
  }
}

// ---------- Aprovação (Galeria) ----------
// O que a criadora pode fazer pelo painel: aprovar, pedir ajuste ou voltar atrás. O resto (agendar, publicar) é do Claude.
const MOVER = { pronto_para_aprovar: ['aprovado', 'ajustar'], aprovado: ['pronto_para_aprovar', 'ajustar'], ajustar: ['pronto_para_aprovar'] };
export function moverTrabalho(id, status) {
  const item = trabalhos().find((x) => x.id === id);
  if (!item) throw new Error('não achei o trabalho ' + id);
  if (!STATUS_TRABALHO.includes(status)) throw new Error('status inválido: ' + status);
  if (!(MOVER[item.status] || []).includes(status)) throw new Error('não dá para ir de ' + item.status + ' para ' + status + ' por aqui');
  const campos = { status };
  if (status === 'aprovado') Object.assign(campos, { aprovado: true, aprovadoEm: agora() });
  else Object.assign(campos, { aprovado: false, aprovadoEm: null });
  return salvarTrabalho(id, campos);
}

// ---------- Funções próprias (minhas-funcoes/<slug>.json + <slug>.md) ----------
export const DIR_FUNCOES = path.join(RAIZ, 'minhas-funcoes');
const txt = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
// Lê a pasta e devolve só as funções válidas (JSON inválido ou fora do formato é ignorado).
export function funcoesProprias() {
  let nomes = [];
  try {
    nomes = fs.readdirSync(DIR_FUNCOES).filter((n) => /^[a-z0-9][a-z0-9-]{0,60}\.json$/.test(n));
  } catch {
    return [];
  }
  const lista = [];
  for (const n of nomes.sort()) {
    const slug = n.replace(/\.json$/, '');
    const j = ler(path.join(DIR_FUNCOES, n), null);
    if (!j || typeof j !== 'object') continue;
    const titulo = txt(j.titulo, 120);
    const pedido = txt(j.pedido, 4000);
    if (!titulo || !pedido || !Array.isArray(j.campos) || j.campos.length > 20) continue;
    const campos = [];
    const vistos = new Set();
    let ok = true;
    for (const c of j.campos) {
      const id = c && typeof c.id === 'string' ? c.id : '';
      const tipo = c && c.tipo;
      if (!/^[a-z][a-z0-9_]{0,30}$/.test(id) || vistos.has(id) || !['texto', 'escolha', 'marcar'].includes(tipo)) {
        ok = false;
        break;
      }
      vistos.add(id);
      const opcoes = Array.isArray(c.opcoes) ? c.opcoes.map((o) => txt(String(o), 80)).filter(Boolean).slice(0, 20) : [];
      if (tipo !== 'texto' && !opcoes.length) {
        ok = false;
        break;
      }
      campos.push({ id, rotulo: txt(c.rotulo, 120) || id, tipo, opcoes, exemplo: txt(c.exemplo, 120) });
    }
    if (!ok) continue;
    lista.push({ slug, id: slug, titulo, descricao: txt(j.descricao, 600), campos, pedido, temPassoAPasso: fs.existsSync(path.join(DIR_FUNCOES, slug + '.md')) });
  }
  return lista;
}
