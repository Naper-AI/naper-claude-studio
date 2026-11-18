// Diz quais contas estão logadas no Chrome do Naper Studio (TikTok e YouTube Studio). Só lê.
// Uso: node publicador/conta.mjs [--porta 9333]
import { args, porta as qualPorta, conectar, esperar, usernameTikTok } from './comum.mjs';

const { flags } = args();
const { browser, ctx } = await conectar(qualPorta(flags)).catch((e) => { console.log(JSON.stringify({ ok: false, erro: e.message })); process.exit(1); });
const out = { ok: true };
const p = await ctx.newPage();
try {
  await p.goto('https://www.tiktok.com/tiktokstudio?lang=en', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await esperar(4000);
  const u = await usernameTikTok(p);
  out.tiktok = u ? { logada: true, usuario: '@' + u } : { logada: false };
  await p.goto('https://studio.youtube.com/', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await esperar(5000);
  const url = p.url();
  const logada = /studio\.youtube\.com/.test(url) && !/accounts\.google|signin|ServiceLogin/.test(url);
  out.youtube = { logada, ...(logada ? { canal: (await p.title().catch(() => '')).replace(/\s*-\s*YouTube Studio.*/i, '') || null } : {}) };
} finally {
  await p.close().catch(() => {});
  await browser.close().catch(() => {});
}
console.log(JSON.stringify(out, null, 1));
