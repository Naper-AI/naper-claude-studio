#!/usr/bin/env node
// Folha de quadros: uma imagem com N quadros do vídeo lado a lado, para o Claude conferir os cortes SEM abrir o vídeo.
// Uso: node kit-reedicao/ferramentas/folha.mjs <video> [quadros=10] [--trabalho <id>]   -> <video>.folha.png
import { spawnSync } from 'node:child_process';
import * as E from '../../painel/lib/estado.mjs';

const args = process.argv.slice(2);
const trabalho = args.includes('--trabalho') ? args[args.indexOf('--trabalho') + 1] : null;
const [video, n = '10'] = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--trabalho');
if (!video) {
  console.log('Uso: node kit-reedicao/ferramentas/folha.mjs <video> [quadros] [--trabalho <id>]');
  process.exit(1);
}
const dur = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video], { encoding: 'utf8', windowsHide: true }).stdout.trim());
const saida = video.replace(/\.[^.\\/]+$/, '') + '.folha.png';
const x = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', video, '-vf', 'fps=' + n + '/' + dur + ',scale=216:-1,tile=' + n + 'x1', '-frames:v', '1', saida], { encoding: 'utf8', windowsHide: true });
if (x.status !== 0) {
  console.error(x.stderr);
  process.exit(1);
}
if (trabalho) {
  try {
    E.salvarTrabalho(trabalho, { folha: E.relativo(saida) });
    E.registrarProgresso(trabalho, { folha: E.relativo(saida), mensagem: 'Folha de quadros pronta' });
  } catch (e) {
    console.error('(painel) ' + e.message);
  }
}
console.log('folha: ' + saida);
