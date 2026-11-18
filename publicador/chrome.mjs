// Abre (se ainda não estiver aberto) o Chrome PRÓPRIO do Naper Studio, com porta de depuração.
// Nunca mexe no perfil normal do Chrome. Uso: node publicador/chrome.mjs [--login tiktok|youtube|instagram] [--porta 9333] [--headless]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { args, porta as qualPorta, pastaPerfil, acharChrome, estaRodando, esperar } from './comum.mjs';

const LOGINS = {
  tiktok: 'https://www.tiktok.com/login?lang=en',
  youtube: 'https://studio.youtube.com/',
  instagram: 'https://www.instagram.com/accounts/login/',
};

export async function abrirChrome({ porta, perfil, login, headless } = {}) {
  const p = porta;
  const urls = (login ? String(login).split(',') : []).map((l) => {
    if (!LOGINS[l]) throw new Error(`--login desconhecido: ${l} (use tiktok, youtube ou instagram)`);
    return LOGINS[l];
  });
  if (await estaRodando(p)) return { rodando: true, jaEstava: true, porta: p, perfil };
  const exe = acharChrome();
  if (!exe) throw new Error('Não achei o Google Chrome instalado. Instale em google.com/chrome e rode de novo.');
  fs.mkdirSync(perfil, { recursive: true });
  const a = [
    `--remote-debugging-port=${p}`, '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${perfil}`, '--no-first-run', '--no-default-browser-check',
    '--disable-features=Translate', '--window-size=1440,1000',
  ];
  if (headless) a.push('--headless=new');
  a.push(...(urls.length ? urls : ['about:blank']));
  const filho = spawn(exe, a, { detached: true, stdio: 'ignore' });
  filho.unref();
  for (let i = 0; i < 40; i++) { await esperar(500); if (await estaRodando(p)) return { rodando: true, jaEstava: false, porta: p, perfil, abriuLogin: urls }; }
  throw new Error(`Abri o Chrome, mas a porta ${p} não respondeu. Se já existe um Chrome usando esse perfil, feche-o.`);
}

if (process.argv[1]?.endsWith('chrome.mjs')) {
  const { flags } = args();
  try {
    const r = await abrirChrome({ porta: qualPorta(flags), perfil: pastaPerfil(flags), login: flags.login, headless: !!flags.headless });
    console.log(JSON.stringify({ ok: true, ...r, mensagem: r.jaEstava ? 'O Chrome do Naper Studio já está rodando.' : 'Chrome do Naper Studio aberto.' }, null, 1));
  } catch (e) { console.log(JSON.stringify({ ok: false, erro: e.message })); process.exit(1); }
}
