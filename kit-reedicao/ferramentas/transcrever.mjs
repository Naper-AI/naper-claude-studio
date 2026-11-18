#!/usr/bin/env node
// Transcreve um vídeo (português) e lista as FRASES com o tempo de início e fim, para cortar sem quebrar a fala.
// Uso: node kit-reedicao/ferramentas/transcrever.mjs <video> [--modelo small] [--trabalho <id>]
// Com --trabalho, o painel mostra "transcrevendo" no "Ver o editor".
// Saída: <video>.frases.json  [{ "ini": 0.00, "fim": 4.86, "texto": "..." }]  e o texto na tela.
// Usa o whisper.cpp no computador (o vídeo não vai para a internet). Na 1ª vez baixa o programa (Windows, ~9 MB,
// github.com/ggml-org/whisper.cpp) e o modelo (~470 MB, huggingface.co/ggerganov/whisper.cpp). No Mac: brew install whisper-cpp.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import * as E from '../../painel/lib/estado.mjs';

const args = process.argv.slice(2);
const video = args.find((a, i) => !a.startsWith('--') && !['--modelo', '--trabalho'].includes(args[i - 1]));
const trabalho = args.includes('--trabalho') ? args[args.indexOf('--trabalho') + 1] : null;
const reg = (campos) => {
  if (!trabalho) return;
  try {
    E.registrarProgresso(trabalho, campos);
  } catch (e) {
    console.error('(painel) ' + e.message);
  }
};
const modelo = args.includes('--modelo') ? args[args.indexOf('--modelo') + 1] : 'small';
if (!video) {
  console.log('Uso: node kit-reedicao/ferramentas/transcrever.mjs <video> [--modelo small] [--trabalho <id>]');
  process.exit(1);
}
const CACHE = path.join(os.homedir(), '.cache', 'naper-reedicao');
fs.mkdirSync(CACHE, { recursive: true });

function rodar(cmd, a) {
  const r = spawnSync(cmd, a, { encoding: 'utf8', windowsHide: true });
  if (r.status !== 0) {
    console.error((r.stderr || '').slice(-1500));
    throw new Error(cmd + ' falhou');
  }
  return r;
}
async function baixar(url, dest) {
  console.log('baixando ' + path.basename(dest) + ' (só na 1ª vez)...');
  const r = await fetch(url, { headers: { 'user-agent': 'kit-reedicao-naper' } });
  if (!r.ok) throw new Error('download falhou: ' + r.status + ' ' + url);
  fs.writeFileSync(dest + '.parcial', Buffer.from(await r.arrayBuffer()));
  fs.renameSync(dest + '.parcial', dest);
}
function acharExe(dir) {
  if (!fs.existsSync(dir)) return null;
  const pilha = [dir];
  while (pilha.length) {
    const d = pilha.pop();
    for (const n of fs.readdirSync(d)) {
      const f = path.join(d, n);
      if (fs.statSync(f).isDirectory()) pilha.push(f);
      else if (/^whisper-cli\.exe$/i.test(n)) return f;
    }
  }
  return null;
}
async function whisper() {
  if (process.env.WHISPER_CLI) return process.env.WHISPER_CLI;
  if (process.platform !== 'win32') {
    for (const c of ['whisper-cli', 'whisper-cpp']) {
      const t = spawnSync(c, ['--help']);
      if (!t.error) return c;
    }
    throw new Error('Instale o whisper.cpp: brew install whisper-cpp');
  }
  const dir = path.join(CACHE, 'whisper');
  let exe = acharExe(dir);
  if (exe) return exe;
  fs.mkdirSync(dir, { recursive: true });
  // A versão mais nova pode não ter o pacote do Windows: procura nas últimas versões a que tem.
  const r = await fetch('https://api.github.com/repos/ggml-org/whisper.cpp/releases?per_page=10', { headers: { 'user-agent': 'kit-reedicao-naper' } });
  const rels = await r.json();
  const asset = rels.flatMap((x) => x.assets || []).find((a) => a.name === 'whisper-bin-x64.zip');
  if (!asset) throw new Error('não achei o whisper-bin-x64.zip nas versões do whisper.cpp; defina WHISPER_CLI');
  const zip = path.join(dir, 'whisper-bin-x64.zip');
  await baixar(asset.browser_download_url, zip);
  // PowerShell e não tar: no Git Bash o "tar" é o do MSYS, que lê "C:" como servidor remoto.
  rodar('powershell.exe', ['-NoProfile', '-Command', "Expand-Archive -Force -LiteralPath '" + zip + "' -DestinationPath '" + dir + "'"]);
  exe = acharExe(dir);
  if (!exe) throw new Error('não achei o whisper-cli.exe depois de descompactar');
  return exe;
}
async function arquivoDoModelo() {
  const nome = 'ggml-' + modelo + '.bin';
  const lugares = [path.join(CACHE, nome)];
  for (const c of lugares) if (fs.existsSync(c)) return c;
  await baixar('https://huggingface.co/ggerganov/whisper.cpp/resolve/main/' + nome, lugares[0]);
  return lugares[0];
}

reg({ etapa: 'transcrevendo', mensagem: 'Transcrevendo ' + path.basename(video) });
const carimbo = Date.now();
const wav = path.join(CACHE, 'audio-' + carimbo + '.wav');
rodar('ffmpeg', ['-y', '-v', 'error', '-i', video, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
const base = path.join(CACHE, 'saida-' + carimbo);
rodar(await whisper(), ['-m', await arquivoDoModelo(), '-f', wav, '-l', 'pt', '-oj', '-of', base, '-np']);
const j = JSON.parse(fs.readFileSync(base + '.json', 'utf8'));
const seg = (t) => {
  const [h, m, s] = t.replace(',', '.').split(':');
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
};
const frases = (j.transcription || [])
  .map((s) => ({ ini: Number(seg(s.timestamps.from).toFixed(2)), fim: Number(seg(s.timestamps.to).toFixed(2)), texto: s.text.trim() }))
  .filter((f) => f.texto);
const saida = video.replace(/\.[^.\\/]+$/, '') + '.frases.json';
fs.writeFileSync(saida, JSON.stringify(frases, null, 1));
for (const f of [wav, base + '.json']) fs.rmSync(f, { force: true });
console.log('== ' + path.basename(video));
for (const f of frases) console.log(f.ini.toFixed(2).padStart(6) + ' - ' + f.fim.toFixed(2).padStart(6) + '  ' + f.texto);
console.log('frases: ' + saida);
reg({ mensagem: path.basename(video) + ': ' + frases.length + ' frases' });
