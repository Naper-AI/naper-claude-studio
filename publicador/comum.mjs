// Peças comuns do publicador: porta, perfil, conexão ao Chrome do Naper Studio (CDP) e argumentos.
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

export const PORTA_PADRAO = 9333;

export function args(argv = process.argv.slice(2)) {
  const flags = {}; const resto = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const prox = argv[i + 1];
      if (prox !== undefined && !prox.startsWith('--')) { flags[k] = prox; i++; } else flags[k] = true;
    } else resto.push(a);
  }
  return { flags, resto };
}

export function porta(flags = {}) {
  return Number(flags.porta || process.env.NAPER_STUDIO_PORTA || PORTA_PADRAO);
}

export function pastaPerfil(flags = {}) {
  if (flags.perfil && flags.perfil !== true) return path.resolve(flags.perfil);
  if (process.platform === 'win32') return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'NaperStudio', 'chrome');
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'NaperStudio', 'chrome');
  return path.join(os.homedir(), '.config', 'NaperStudio', 'chrome');
}

export function acharChrome() {
  const cands = [];
  if (process.platform === 'win32') {
    for (const base of [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA]) {
      if (base) cands.push(path.join(base, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    }
  } else if (process.platform === 'darwin') {
    cands.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    cands.push(path.join(os.homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'));
  } else {
    cands.push('/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium');
  }
  return cands.find((c) => fs.existsSync(c)) || null;
}

export async function estaRodando(p) {
  try {
    const r = await fetch(`http://127.0.0.1:${p}/json/version`, { signal: AbortSignal.timeout(2500) });
    return r.ok;
  } catch { return false; }
}

export async function conectar(p) {
  if (!(await estaRodando(p))) {
    throw new Error(`O Chrome do Naper Studio não está aberto na porta ${p}. Rode antes: node publicador/chrome.mjs`);
  }
  const { chromium } = await import('playwright-core');
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${p}`, { timeout: 30000 });
  const ctx = browser.contexts()[0] || (await browser.newContext());
  return { browser, ctx };
}

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * QUEM ESTA LOGADO, E SE A SONDA RESPONDEU (26/11/2026). Devolve `{ username, respondeu }`.
 *
 * Antes isto era um fetch so, e TODO tropeco virava `null`: rede instavel, 429 do TikTok, pagina de erro em HTML (o
 * `.json()` estoura), resposta lenta. O chamador leu `null` como "nao esta logado" e a criadora ouviu "a permissao
 * caiu" com a permissao boa (visto em producao em 26/11, contas 12 e 62). Entao:
 *
 *  - tenta 3 vezes, com 1,5 s entre elas: um tropeco nao e um logout;
 *  - separa "a sonda respondeu e nao ha ninguem logado" (`respondeu: true`) de "a sonda nao respondeu"
 *    (`respondeu: false`), para quem chama nao poder confundir as duas.
 */
export async function sessaoDoTikTok(page) {
  for (let t = 1; t <= 3; t++) {
    const r = await page.evaluate(async () => {
      try {
        const res = await fetch('/passport/web/account/info/', { credentials: 'include' });
        const j = await res.json();
        return { respondeu: true, username: j?.data?.username || null };
      } catch { return { respondeu: false, username: null }; }
    }).catch(() => ({ respondeu: false, username: null }));
    if (r.username) return r;
    // Respondeu dizendo que nao ha ninguem logado: isso e resposta, nao falha — nao insiste.
    if (r.respondeu) return r;
    if (t < 3) await esperar(1500);
  }
  return { respondeu: false, username: null };
}

/** O nome de quem esta logado, ou `null`. Mantido para quem so quer o nome (`conta.mjs`). */
export async function usernameTikTok(page) {
  return (await sessaoDoTikTok(page)).username;
}
