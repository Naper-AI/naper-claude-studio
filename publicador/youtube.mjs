// BETA: publica um Short no YouTube Studio pelo Chrome do Naper Studio.
// Funcional até o modo "seco" (upload, título, descrição, público, visibilidade); a publicação final ainda não foi validada ponta a ponta.
// Uso: node publicador/youtube.mjs <post.json> [--porta 9333]
// post.json: {arquivo, titulo, descricao?, quando?: "agora" | "AAAA-MM-DD HH:mm" (Brasília), seco?: true}
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { args, porta as qualPorta, conectar, esperar } from './comum.mjs';

const { flags, resto } = args();
const r = { beta: true, etapas: [] };
const log = (m) => { r.etapas.push(m); process.stderr.write('· ' + m + '\n'); };
const fim = (code, extra = {}) => { Object.assign(r, extra); console.log(JSON.stringify(r, null, 1)); process.exit(code); };

if (!resto[0]) fim(2, { ok: false, erro: 'Uso: node publicador/youtube.mjs <post.json>' });
let c;
try { c = JSON.parse(fs.readFileSync(resto[0], 'utf8')); } catch (e) { fim(2, { ok: false, erro: 'Não consegui ler o JSON do post: ' + e.message }); }
for (const k of ['arquivo', 'titulo']) if (!c[k]) fim(2, { ok: false, erro: `Falta "${k}" no JSON do post.` });
if (!fs.existsSync(c.arquivo)) fim(2, { ok: false, erro: 'Vídeo não encontrado: ' + c.arquivo });
const titulo = c.titulo.slice(0, 100);
let descricao = c.descricao || '';
if (!/#shorts/i.test(titulo + descricao)) descricao = (descricao + '\n\n#Shorts').trim();
const agendar = !!c.quando && c.quando !== 'agora';
let alvo = null;
if (agendar) {
  const m = String(c.quando).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!m) fim(2, { ok: false, erro: '"quando" deve ser "agora" ou "AAAA-MM-DD HH:mm" (horário de Brasília).' });
  alvo = { ano: m[1], mes: m[2], dia: m[3], hh: m[4], mm: m[5] };
}
r.video = path.basename(c.arquivo);

let browser; let ctx; let page;
async function parar(code, extra) { try { if (page && !flags.manter) await page.close(); } catch { /* ok */ } try { await browser?.close(); } catch { /* ok */ } fim(code, extra); }
async function foto(nome) {
  const dir = path.join(os.tmpdir(), 'naper-studio'); fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, nome); await page.screenshot({ path: f }).catch(() => {}); return f;
}

try { ({ browser, ctx } = await conectar(qualPorta(flags))); } catch (e) { fim(1, { ok: false, erro: e.message }); }

try {
  page = await ctx.newPage();
  await page.setViewportSize({ width: 1440, height: 1000 }).catch(() => {});
  await page.goto('https://www.youtube.com/upload', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await esperar(6000);
  if (!/studio\.youtube\.com|youtube\.com\/upload/.test(page.url()) || /accounts\.google|ServiceLogin|signin/.test(page.url())) {
    await parar(3, { ok: false, parou: 'sem login: o YouTube não está logado neste Chrome. Rode "node publicador/chrome.mjs --login youtube", entre e tente de novo. Nada foi postado.' });
  }
  // Se abriu só o Studio sem o diálogo de upload, usa Criar › Enviar vídeos.
  if (!(await page.locator('input[type=file]').count())) {
    await page.locator('#create-icon, [aria-label="Create"], [aria-label="Criar"]').first().click().catch(() => {}); await esperar(1000);
    await page.locator('#text-item-0, tp-yt-paper-item').filter({ hasText: /Upload videos|Enviar v[ií]deos/i }).first().click().catch(() => {}); await esperar(2000);
  }
  const canal = (await page.title().catch(() => '')).replace(/\s*-\s*YouTube Studio.*/i, '');
  r.canal = canal || null;
  await page.locator('input[type=file]').first().setInputFiles(c.arquivo);
  await page.locator('#title-textarea #textbox, ytcp-social-suggestions-textbox #textbox').first().waitFor({ timeout: 120000 });
  await esperar(2000); log('vídeo enviado');

  const campoTitulo = page.locator('#title-textarea #textbox').first();
  await campoTitulo.click(); await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace'); await page.keyboard.type(titulo, { delay: 15 });
  const campoDesc = page.locator('#description-textarea #textbox').first();
  await campoDesc.click(); await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace'); await page.keyboard.type(descricao, { delay: 10 });
  r.titulo = (await campoTitulo.innerText()).trim();
  r.descricao = (await campoDesc.innerText()).trim();

  await page.locator('[name=VIDEO_MADE_FOR_KIDS_NOT_MFK]').first().click();  // "Não, não é conteúdo para crianças"
  r.paraCriancas = false;
  // Detalhes › Elementos do vídeo › Verificações › Visibilidade
  for (let i = 0; i < 3; i++) { await page.locator('#next-button').click(); await esperar(1800); }

  if (agendar) {
    await page.locator('#second-container-expand-button, #schedule-radio-button, [name=SCHEDULE]').first().click().catch(() => {}); await esperar(1000);
    const [ano, mes, dia] = [alvo.ano, alvo.mes, alvo.dia];
    // Formato do campo de data varia com o idioma do Studio; preenche em dd/MM/yyyy e confere depois.
    await page.locator('#datepicker-trigger').click().catch(() => {}); await esperar(700);
    const campoData = page.locator('tp-yt-paper-input#input input, #datepicker-container input').first();
    await campoData.fill(`${dia}/${mes}/${ano}`).catch(() => {}); await page.keyboard.press('Enter').catch(() => {}); await esperar(700);
    const campoHora = page.locator('ytcp-form-input-container#time-of-day-container input, #time-of-day-container input').first();
    await campoHora.fill(`${alvo.hh}:${alvo.mm}`).catch(() => {}); await page.keyboard.press('Enter').catch(() => {}); await esperar(700);
    r.agendamento = (await page.locator('#visibility-title, #schedule-container, ytcp-video-visibility-select').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    log('agendamento digitado; conferir na foto (formato de data depende do idioma do Studio)');
  } else {
    await page.locator('[name=PUBLIC]').first().click(); r.visibilidade = 'Pública';
  }
  r.foto = await foto('youtube-conferencia.png');

  if (c.seco) await parar(0, { ok: true, seco: true, resultado: 'modo seco: tudo montado; parei antes do botão Publicar/Agendar. O envio ficou como rascunho no YouTube Studio (apague-o lá se não for usar).' });

  // Espera as verificações do YouTube e publica.
  for (let i = 0; i < 60; i++) {
    const t = await page.locator('ytcp-video-upload-progress, .progress-label').first().innerText().catch(() => '');
    if (!/Uploading|Enviando|Processing|Processando|Checking|Verificando/i.test(t) || /Checks complete|Verifica[cç][oõ]es conclu[ií]das|No issues/i.test(t)) break;
    await esperar(5000);
  }
  await page.locator('#done-button').click();
  await esperar(5000);
  const dialogo = await page.locator('ytcp-uploads-still-processing-dialog, ytcp-video-share-dialog, #dialog').first().innerText().catch(() => '');
  r.dialogoFinal = dialogo.replace(/\s+/g, ' ').slice(0, 200);
  r.ondeConferir = 'https://studio.youtube.com/ (Conteúdo › Shorts)';
  r.foto = await foto('youtube-final.png');
  await parar(0, { ok: true, resultado: (agendar ? 'agendado' : 'publicado') + ' (beta: confirme em Conteúdo › Shorts antes de considerar feito)' });
} catch (e) {
  let f = null; try { f = await foto('youtube-erro.png'); } catch { /* ok */ }
  await parar(1, { ok: false, erro: String(e.message).split('\n')[0], foto: f, dica: 'Nada foi confirmado. Confira o YouTube Studio antes de repetir.' });
}
