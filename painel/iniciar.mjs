#!/usr/bin/env node
// Roda no começo de toda sessão do Claude nesta pasta (hook SessionStart em .claude/settings.json).
// 1) atualiza o Naper Studio de forma segura; 2) sobe o painel se não estiver no ar (sem janela);
// 3) abre http://localhost:4747 no navegador UMA vez por sessão; 4) conta ao Claude onde o onboarding está.
// NUNCA falha a sessão: qualquer erro vira uma linha de aviso e o processo sai com 0.
// Uso manual: node painel/iniciar.mjs [--abrir] [--sem-atualizar]   (NAPER_NAO_ABRIR=1 não abre o navegador)
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.NAPER_STUDIO_PORTA || 4747);
const URL_PAINEL = 'http://localhost:' + PORTA;
const args = process.argv.slice(2);
const linhas = [];
setTimeout(() => sair(), 40000).unref();

function sair() {
  try {
    process.stdout.write('[Naper Studio] ' + linhas.join(' · ') + '\n');
  } catch {}
  process.exit(0);
}
function lerEntrada(ms) {
  return new Promise((ok) => {
    if (process.stdin.isTTY) return ok({});
    let s = '';
    const t = setTimeout(() => ok({}), ms);
    process.stdin.on('data', (c) => (s += c));
    process.stdin.on('end', () => {
      clearTimeout(t);
      try {
        ok(JSON.parse(s || '{}'));
      } catch {
        ok({});
      }
    });
    process.stdin.on('error', () => ok({}));
  });
}
async function saude() {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 800);
  try {
    const r = await fetch(URL_PAINEL + '/api/saude', { signal: c.signal });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
function versaoLocal() {
  try {
    return fs.readFileSync(path.join(RAIZ, 'VERSAO'), 'utf8').trim();
  } catch {
    return '0.0.0';
  }
}
function subirServidor() {
  const filho = spawn(process.execPath, [path.join(RAIZ, 'painel', 'servidor.mjs')], {
    cwd: RAIZ, detached: true, stdio: 'ignore', windowsHide: true,
  });
  filho.unref();
}
function abrirNavegador() {
  const op = process.platform === 'win32'
    ? ['rundll32.exe', ['url.dll,FileProtocolHandler', URL_PAINEL]]
    : process.platform === 'darwin' ? ['open', [URL_PAINEL]] : ['xdg-open', [URL_PAINEL]];
  const f = spawn(op[0], op[1], { detached: true, stdio: 'ignore', windowsHide: true });
  f.on('error', () => {});
  f.unref();
}
function resumoOnboarding() {
  try {
    const o = JSON.parse(fs.readFileSync(path.join(RAIZ, 'estado', 'onboarding.json'), 'utf8'));
    if (o.validado) return 'onboarding validado: atenda os pedidos da Biblioteca';
    const feitos = Object.entries(o.passos || {}).filter(([, v]) => ['ok', 'pulado'].includes(v.status)).map(([k]) => k);
    return 'onboarding em andamento (' + feitos.length + ' de 9 feitos: ' + (feitos.join(', ') || 'nenhum') + '): continue pelo CLAUDE.md';
  } catch {
    return 'onboarding NÃO começou: siga o CLAUDE.md (Onboarding) desde o primeiro passo';
  }
}

(async () => {
  try {
    const entrada = await lerEntrada(1500);
    const fonte = entrada.source || 'manual';

    if (!args.includes('--sem-atualizar') && ['startup', 'manual'].includes(fonte)) {
      try {
        const { atualizar } = await import('./atualizar.mjs');
        const r = await atualizar();
        linhas.push('atualização: ' + r.msg);
      } catch (e) {
        linhas.push('atualização: não deu (' + e.message + ')');
      }
    }

    let s = await saude();
    if (s && s.app === 'naper-studio' && s.versao !== versaoLocal()) {
      // O painel no ar é de uma versão antiga: reinicia com a nova.
      try {
        await fetch(URL_PAINEL + '/api/desligar', { method: 'POST' });
      } catch {}
      await esperar(400);
      s = null;
    }
    if (!s) {
      subirServidor();
      for (let i = 0; i < 15 && !s; i++) {
        await esperar(200);
        s = await saude();
      }
    }
    if (!s) linhas.push('painel: não subiu (rode node painel/servidor.mjs para ver o erro)');
    else if (s.app !== 'naper-studio') linhas.push('painel: a porta ' + PORTA + ' está ocupada por outro programa');
    else linhas.push('painel no ar em ' + URL_PAINEL);

    // Abre o navegador uma vez por sessão (na abertura da sessão, ou quando pedido com --abrir).
    const marca = path.join(RAIZ, 'estado', 'ultima-abertura.json');
    let ultima = {};
    try {
      ultima = JSON.parse(fs.readFileSync(marca, 'utf8'));
    } catch {}
    const sessao = entrada.session_id || 'manual-' + new Date().toISOString().slice(0, 13);
    const querAbrir = args.includes('--abrir') || (fonte === 'startup' && ultima.sessao !== sessao);
    if (s && s.app === 'naper-studio' && querAbrir && !process.env.NAPER_NAO_ABRIR) {
      abrirNavegador();
      fs.mkdirSync(path.dirname(marca), { recursive: true });
      fs.writeFileSync(marca, JSON.stringify({ sessao, quando: new Date().toISOString() }));
      linhas.push('aberto no navegador dela agora (não abra de novo nesta sessão)');
    } else if (s) linhas.push('não abri o navegador (já aberto nesta sessão ou retomada)');

    linhas.push(resumoOnboarding());
    if (fs.existsSync(path.join(RAIZ, 'estado', 'pedido-pendente.json'))) linhas.push('há um pedido da Biblioteca esperando em estado/pedido-pendente.json');
  } catch (e) {
    linhas.push('aviso: ' + (e && e.message ? e.message : e));
  }
  sair();
})();
