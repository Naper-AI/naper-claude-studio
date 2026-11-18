#!/usr/bin/env node
// Mantém o Naper Studio atualizado, sem nunca mexer nos dados dela.
// Com git: git pull --ff-only. Sem git: compara VERSAO com a do GitHub e, se mudou, baixa o zip e copia por cima,
// preservando estudio/, marca/, estado/, relatorios/ e as receitas dela.
// Uso: node painel/atualizar.mjs   (o painel/iniciar.mjs chama sozinho a cada sessão)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'Naper-AI/naper-claude-studio';
const URL_VERSAO = 'https://raw.githubusercontent.com/' + REPO + '/main/VERSAO';
const URL_ZIP = 'https://github.com/' + REPO + '/archive/refs/heads/main.zip';
// Nunca sobrescrever (são dela). Caminhos relativos à raiz, com barra normal.
const PRESERVAR = ['estudio', 'marca', 'estado', 'relatorios', 'kit-reedicao/receitas', '.claude/settings.local.json', '.git'];

const lerVersao = () => {
  try {
    return fs.readFileSync(path.join(RAIZ, 'VERSAO'), 'utf8').trim();
  } catch {
    return '0.0.0';
  }
};
const maior = (a, b) => {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
};
async function buscar(url, ms) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal: c.signal, headers: { 'user-agent': 'naper-studio' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r;
  } finally {
    clearTimeout(t);
  }
}
function copiar(de, para, rel = '') {
  for (const n of fs.readdirSync(de)) {
    const r = rel ? rel + '/' + n : n;
    if (PRESERVAR.some((p) => r === p || r.startsWith(p + '/'))) continue;
    const a = path.join(de, n);
    const b = path.join(para, n);
    if (fs.statSync(a).isDirectory()) {
      fs.mkdirSync(b, { recursive: true });
      copiar(a, b, r);
    } else fs.copyFileSync(a, b);
  }
}

export async function atualizar() {
  const antes = lerVersao();
  if (fs.existsSync(path.join(RAIZ, '.git'))) {
    const g = spawnSync('git', ['-C', RAIZ, 'pull', '--ff-only', '--quiet'], { encoding: 'utf8', timeout: 20000, windowsHide: true });
    if (g.error) return { ok: false, antes, depois: antes, msg: 'git indisponível: ' + g.error.code };
    if (g.status !== 0) return { ok: false, antes, depois: antes, msg: 'git pull não foi possível (sem internet ou arquivos mudados): ' + (g.stderr || '').trim().split('\n').pop() };
    const depois = lerVersao();
    return { ok: true, antes, depois, msg: depois !== antes ? 'atualizado de ' + antes + ' para ' + depois : 'já estava na versão mais nova (' + depois + ')' };
  }
  let remota;
  try {
    remota = (await (await buscar(URL_VERSAO, 6000)).text()).trim();
  } catch (e) {
    return { ok: false, antes, depois: antes, msg: 'sem conferir atualização (sem internet?): ' + e.message };
  }
  if (!/^\d+\.\d+\.\d+$/.test(remota) || !maior(remota, antes)) return { ok: true, antes, depois: antes, msg: 'já estava na versão mais nova (' + antes + ')' };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'naper-studio-'));
  try {
    const zip = path.join(tmp, 'main.zip');
    fs.writeFileSync(zip, Buffer.from(await (await buscar(URL_ZIP, 60000)).arrayBuffer()));
    const dest = path.join(tmp, 'x');
    fs.mkdirSync(dest);
    const x = process.platform === 'win32'
      ? spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', "Expand-Archive -Force -LiteralPath '" + zip + "' -DestinationPath '" + dest + "'"], { timeout: 60000, windowsHide: true })
      : spawnSync('unzip', ['-q', '-o', zip, '-d', dest], { timeout: 60000 });
    if (x.status !== 0) throw new Error('não consegui descompactar');
    const dentro = fs.readdirSync(dest).map((n) => path.join(dest, n)).find((d) => fs.statSync(d).isDirectory());
    if (!dentro || !fs.existsSync(path.join(dentro, 'VERSAO'))) throw new Error('zip sem o Naper Studio dentro');
    copiar(dentro, RAIZ);
    return { ok: true, antes, depois: lerVersao(), msg: 'atualizado de ' + antes + ' para ' + lerVersao() + ' (pelo zip)' };
  } catch (e) {
    return { ok: false, antes, depois: antes, msg: 'atualização pelo zip falhou: ' + e.message };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  atualizar().then((r) => console.log(r.msg));
}
