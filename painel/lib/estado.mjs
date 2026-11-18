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
  { id: 'ferramentas', titulo: 'Node e FFmpeg', explica: 'Os programas que cortam e juntam os seus vídeos. O Claude instala, com a sua licença.', dela: 'Aprovar a instalação quando o Claude pedir.' },
  { id: 'transcricao', titulo: 'Transcrição dos vídeos (whisper)', explica: 'Lê a fala dos seus vídeos no seu computador, para cortar sempre no fim da frase.', dela: '' },
  { id: 'naper', titulo: 'Naper conectada', explica: 'Liga o Claude à sua conta da Naper: vendas, vídeos, produtos, grupos e publicação.', dela: 'No app do Claude: Configurações › Conectores › Adicionar conector personalizado › Nome "Naper" › URL https://api.naper.ai/mcp › Conectar › entrar na Naper › Autorizar.' },
  { id: 'teste_naper', titulo: 'Teste da Naper', explica: 'O Claude puxa o seu panorama para confirmar que a conexão funciona.', dela: '' },
  { id: 'marca', titulo: 'A sua marca', explica: 'Seus @, nicho, lojas, tom de voz e marcas sim/não. O Claude sugere pelos seus dados; você confirma.', dela: 'Responder perguntas curtas.' },
  { id: 'whatsapp', titulo: 'WhatsApp', explica: 'Grupos de ofertas pela Naper. WhatsApp pessoal pelo Claude no Chrome é opcional: você aprova cada mensagem.', dela: 'Dizer se quer usar o WhatsApp pessoal (opcional).' },
  { id: 'validacao', titulo: 'Validação', explica: 'O Claude faz um teste de ponta a ponta (Naper, vídeo e painel) e libera a Biblioteca.', dela: '' },
];
export const STATUS_PASSO = ['falta', 'fazendo', 'precisa_voce', 'ok', 'pulado', 'erro'];

export const ETAPAS = ['em_fila', 'transcrevendo', 'escolhendo', 'cortando', 'conferindo', 'pronto'];
export const STATUS_TRABALHO = ['em_fila', 'editando', 'pronto_para_aprovar', 'agendado', 'publicado'];

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
export function salvarTrabalho(id, campos) {
  if (!/^[a-z0-9][a-z0-9._-]{0,80}$/i.test(id)) throw new Error('id inválido (use letras, números, - e _): ' + id);
  if (campos.status && !STATUS_TRABALHO.includes(campos.status)) throw new Error('status inválido: ' + campos.status + ' (use: ' + STATUS_TRABALHO.join(', ') + ')');
  const t = ler(ARQ_TRABALHOS, { trabalhos: [] });
  t.trabalhos = Array.isArray(t.trabalhos) ? t.trabalhos : [];
  let item = t.trabalhos.find((x) => x.id === id);
  if (!item) {
    item = { id, titulo: id, tipo: 'video', status: 'em_fila', criadoEm: agora() };
    t.trabalhos.unshift(item);
  }
  for (const [k, v] of Object.entries(campos)) if (v !== undefined) item[k] = v;
  item.atualizadoEm = agora();
  gravar(ARQ_TRABALHOS, t);
  return item;
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
  const manter = atual && ['agendado', 'publicado'].includes(atual.status);
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
