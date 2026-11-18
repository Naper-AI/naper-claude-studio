#!/usr/bin/env node
// O Claude usa este comando para atualizar o painel (ela nunca precisa rodar nada).
//   node painel/registrar.mjs passo <id> <falta|fazendo|precisa_voce|ok|pulado|erro> ["nota de 1 linha"]
//   node painel/registrar.mjs validar                  (só passa se todos os passos estão ok ou pulados)
//   node painel/registrar.mjs trabalho <id> --titulo "..." [--tipo video|carrossel|relatorio|legenda]
//        [--produto "..."] [--redes "tiktok,instagram"] [--status em_fila|editando|pronto_para_aprovar|agendado|publicado]
//        [--arquivo estudio/editados/x.mp4] [--folha estudio/editados/x.folha.png] [--nota "..."] [--quando "2026-11-20 19:00"]
//        [--novo sim]   (status também: ajustar, aprovado)   (ao CRIAR uma peça: falha se o id já existe, para não sobrescrever outra conversa)
//   node painel/registrar.mjs remover <id>            (tira o item da Galeria; não apaga arquivos)
//   node painel/registrar.mjs etapa <id> <em_fila|transcrevendo|escolhendo|cortando|conferindo|pronto> ["mensagem"]
//        [--quadro estudio/...png] [--folha estudio/...png]
//   node painel/registrar.mjs feedback <id>           (imprime os comentários pendentes da Galeria: tempo + texto)
//   node painel/registrar.mjs feedback-feito <id> <n|todos>   (marca comentário(s) como feito, depois de ajustar)
//   node painel/registrar.mjs ver
import * as E from './lib/estado.mjs';

const [cmd, ...resto] = process.argv.slice(2);
const opcoes = {};
const posicionais = [];
for (let i = 0; i < resto.length; i++) {
  if (resto[i].startsWith('--')) opcoes[resto[i].slice(2)] = resto[++i];
  else posicionais.push(resto[i]);
}
try {
  if (cmd === 'passo') {
    E.marcarPasso(posicionais[0], posicionais[1], posicionais[2] || '');
    console.log('passo ' + posicionais[0] + ' = ' + posicionais[1]);
  } else if (cmd === 'validar') {
    E.validar();
    console.log('onboarding validado: o painel agora mostra a Biblioteca');
  } else if (cmd === 'trabalho') {
    const item = E.salvarTrabalho(posicionais[0], {
      titulo: opcoes.titulo, tipo: opcoes.tipo, produto: opcoes.produto, status: opcoes.status, nota: opcoes.nota, quando: opcoes.quando,
      redes: opcoes.redes ? opcoes.redes.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      arquivo: opcoes.arquivo ? E.relativo(opcoes.arquivo) : undefined,
      folha: opcoes.folha ? E.relativo(opcoes.folha) : undefined,
    }, { novo: Boolean(opcoes.novo) });
    console.log('trabalho ' + item.id + ' (' + item.status + ')');
  } else if (cmd === 'remover') {
    E.removerTrabalho(posicionais[0]);
    console.log('removido da Galeria: ' + posicionais[0]);
  } else if (cmd === 'etapa') {
    if (!E.ETAPAS.includes(posicionais[1])) throw new Error('etapa inválida (use: ' + E.ETAPAS.join(', ') + ')');
    E.registrarProgresso(posicionais[0], {
      etapa: posicionais[1], mensagem: posicionais[2],
      ultimoQuadro: opcoes.quadro ? E.relativo(opcoes.quadro) : undefined,
      folha: opcoes.folha ? E.relativo(opcoes.folha) : undefined,
    });
    console.log('trabalho ' + posicionais[0] + ': ' + posicionais[1]);
  } else if (cmd === 'feedback') {
    const f = E.feedback(posicionais[0]).comentarios.filter((c) => !c.feito).sort((a, b) => (a.t == null ? 1e9 : a.t) - (b.t == null ? 1e9 : b.t));
    const mmss = (x) => String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(Math.floor(x % 60)).padStart(2, '0');
    if (!f.length) console.log('nenhum comentário pendente em ' + posicionais[0]);
    for (const c of f) console.log('[' + c.n + '] ' + (c.t == null ? 'geral' : mmss(c.t) + ' (' + c.t + ' s)') + (c.trecho ? ' · trecho «' + c.trecho + '»' : '') + ' · ' + c.texto);
  } else if (cmd === 'feedback-feito') {
    const alvo = posicionais[1] === 'todos' ? E.feedback(posicionais[0]).comentarios.filter((c) => !c.feito).map((c) => c.n) : [Number(posicionais[1])];
    for (const n of alvo) E.feedbackMarcar(posicionais[0], n, true);
    console.log('feito: ' + (alvo.join(', ') || 'nenhum'));
  } else if (cmd === 'ver') {
    console.log(JSON.stringify({ onboarding: E.onboarding(), trabalhos: E.trabalhos() }, null, 2));
  } else {
    console.log('Uso: veja o começo de painel/registrar.mjs');
    process.exit(1);
  }
} catch (e) {
  console.error('erro: ' + e.message);
  process.exit(1);
}
