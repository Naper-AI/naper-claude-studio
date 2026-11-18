#!/usr/bin/env node
// Reedição natural: junta TRECHOS de vídeos (da própria criadora) em um vídeo vertical novo. Só cortes:
// nada desenhado por cima, o visual dos originais fica como veio. Fade de áudio curto em cada corte.
// Uso: node kit-reedicao/ferramentas/reeditar.mjs kit-reedicao/receitas/minha-receita.json
// Receita: { "trabalho": "2026-11-20_produto_tiktok_v1", "titulo": "Produto · gancho de escassez", "redes": ["tiktok"],
//            "saida": "../../estudio/editados/2026-11-20_produto_tiktok_v1.mp4",
//            "trechos": [ { "arquivo": "../../estudio/brutos/video-a.mp4", "ini": 0.0, "fim": 4.92, "frase": "..." } ] }
// Corte sempre no FIM de uma frase (use o .frases.json do transcrever). Caminhos relativos à pasta da receita.
// Registra o progresso no painel (Galeria e "Ver o editor"): cortando -> conferindo (com a folha de quadros pronta).
// Depois de olhar a folha, o Claude marca: node painel/registrar.mjs etapa <trabalho> pronto "..."
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import * as E from '../../painel/lib/estado.mjs';

const arq = process.argv[2];
if (!arq) {
  console.log('Uso: node kit-reedicao/ferramentas/reeditar.mjs <receita.json>');
  process.exit(1);
}
const r = JSON.parse(fs.readFileSync(arq, 'utf8'));
const pasta = path.dirname(path.resolve(arq));
const de = (p) => path.resolve(pasta, p);
const saida = de(r.saida);
const id = r.trabalho || path.basename(saida).replace(/\.[^.]+$/, '');
const dirTrab = path.join(E.DIR_TRABALHOS, id);
fs.mkdirSync(dirTrab, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reedicao-'));
const reg = (campos) => {
  try {
    E.registrarProgresso(id, campos);
  } catch (e) {
    console.error('(painel) ' + e.message);
  }
};
const falhar = (msg) => {
  reg({ etapa: 'em_fila', mensagem: 'Parou: ' + msg });
  console.error(msg);
  process.exit(1);
};
const ff = (a) => {
  const x = spawnSync('ffmpeg', ['-y', '-v', 'error', ...a], { encoding: 'utf8', windowsHide: true });
  if (x.status !== 0) falhar('ffmpeg falhou: ' + (x.stderr || x.error || '').toString().slice(-600));
};

E.salvarTrabalho(id, {
  titulo: r.titulo || id, tipo: 'video', redes: r.redes, produto: r.produto,
  arquivo: E.relativo(saida), receita: E.relativo(path.resolve(arq)),
});
reg({
  etapa: 'cortando', trechoAtual: 0,
  trechos: r.trechos.map((t) => ({ arquivo: path.basename(t.arquivo), ini: t.ini, fim: t.fim, frase: t.frase || '' })),
  mensagem: 'Cortando ' + r.trechos.length + ' trechos no fim das frases',
});

const VF = 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p';
const linhas = [];
r.trechos.forEach((t, i) => {
  const d = Number((t.fim - t.ini).toFixed(3));
  if (!(d > 0.3)) falhar('trecho ' + (i + 1) + ': duração inválida');
  const out = path.join(tmp, 't' + i + '.mp4');
  const af = 'aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=0.03,afade=t=out:st=' + (d - 0.05).toFixed(3) + ':d=0.05';
  ff(['-ss', String(t.ini), '-t', String(d), '-i', de(t.arquivo), '-vf', VF, '-af', af,
    '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-c:a', 'aac', '-b:a', '160k', out]);
  // Último quadro do trecho, para o "Ver o editor" do painel (miniatura pequena, fica na pasta do trabalho).
  const quadro = path.join(dirTrab, 'quadro.jpg');
  spawnSync('ffmpeg', ['-y', '-v', 'error', '-sseof', '-0.2', '-i', out, '-frames:v', '1', '-vf', 'scale=270:-2', quadro], { windowsHide: true });
  reg({ trechoAtual: i + 1, ultimoQuadro: fs.existsSync(quadro) ? E.relativo(quadro) : undefined, mensagem: 'Trecho ' + (i + 1) + ' cortado: "' + (t.frase || '').slice(0, 80) + '"' });
  linhas.push("file '" + out.split(path.sep).join('/') + "'");
  console.log(String(i + 1).padStart(2) + '. ' + path.basename(t.arquivo) + ' ' + t.ini + '-' + t.fim + (t.frase ? '  "' + t.frase + '"' : ''));
});
fs.writeFileSync(path.join(tmp, 'lista.txt'), linhas.join('\n'));
fs.mkdirSync(path.dirname(saida), { recursive: true });
reg({ mensagem: 'Juntando os trechos' });
ff(['-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'lista.txt'), '-c:v', 'libx264', '-crf', '20', '-preset', 'medium',
  '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', saida]);
fs.rmSync(tmp, { recursive: true, force: true });
const dur = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', saida], { encoding: 'utf8', windowsHide: true }).stdout.trim());

// Folha de quadros para conferir SEM abrir o vídeo.
const folha = saida.replace(/\.[^.\\/]+$/, '') + '.folha.png';
spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', saida, '-vf', 'fps=10/' + dur + ',scale=216:-1,tile=10x1', '-frames:v', '1', folha], { windowsHide: true });
const temFolha = fs.existsSync(folha);
E.salvarTrabalho(id, { duracao: Number(dur.toFixed(1)), folha: temFolha ? E.relativo(folha) : undefined });
reg({ etapa: 'conferindo', folha: temFolha ? E.relativo(folha) : undefined, mensagem: 'Vídeo montado (' + dur.toFixed(1) + ' s). Conferindo pela folha de quadros.' });
console.log('pronto: ' + saida + ' (' + dur.toFixed(1) + ' s)');
if (temFolha) console.log('folha: ' + folha);
console.log('painel: trabalho ' + id + ' em "conferindo". Depois de olhar a folha: node painel/registrar.mjs etapa ' + id + ' pronto "..."');
