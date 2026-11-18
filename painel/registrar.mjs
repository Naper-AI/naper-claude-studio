#!/usr/bin/env node
// O Claude usa este comando para atualizar o painel (ela nunca precisa rodar nada).
//   node painel/registrar.mjs passo <id> <falta|fazendo|precisa_voce|ok|pulado|erro> ["nota de 1 linha"]
//   node painel/registrar.mjs validar                  (só passa se todos os passos estão ok ou pulados)
//   node painel/registrar.mjs trabalho <id> --titulo "..." [--tipo video|carrossel|relatorio|legenda]
//        [--produto "..."] [--redes "tiktok,instagram"] [--status em_fila|editando|pronto_para_aprovar|agendado|publicado]
//        [--arquivo estudio/editados/x.mp4] [--folha estudio/editados/x.folha.png] [--nota "..."] [--quando "2026-11-20 19:00"]
//   node painel/registrar.mjs etapa <id> <em_fila|transcrevendo|escolhendo|cortando|conferindo|pronto> ["mensagem"]
//        [--quadro estudio/...png] [--folha estudio/...png]
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
    });
    console.log('trabalho ' + item.id + ' (' + item.status + ')');
  } else if (cmd === 'etapa') {
    if (!E.ETAPAS.includes(posicionais[1])) throw new Error('etapa inválida (use: ' + E.ETAPAS.join(', ') + ')');
    E.registrarProgresso(posicionais[0], {
      etapa: posicionais[1], mensagem: posicionais[2],
      ultimoQuadro: opcoes.quadro ? E.relativo(opcoes.quadro) : undefined,
      folha: opcoes.folha ? E.relativo(opcoes.folha) : undefined,
    });
    console.log('trabalho ' + posicionais[0] + ': ' + posicionais[1]);
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
