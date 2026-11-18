// Publica (ou agenda) um post no TikTok Shop pelo TikTok Studio, COM o produto no carrinho.
// Uso: node publicador/tiktok.mjs <post.json> [--porta 9333]
// post.json: {arquivo, legenda, marca, hashtags, produtoId, nomeProduto, capa?, quando?: "agora"|"AAAA-MM-DD HH:mm" (Brasília),
//             conteudoDeMarca?: true, contaEsperada?: "@usuario", seco?: true}
// Saída: um JSON com o que foi feito. Código de saída 0 só se o post foi concluído (ou, em "seco", montado até o fim).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { args, porta as qualPorta, conectar, esperar, usernameTikTok } from './comum.mjs';

const { flags, resto } = args();
const r = { etapas: [] };
const log = (m) => { r.etapas.push(m); process.stderr.write('· ' + m + '\n'); };
const fim = (code, extra = {}) => { Object.assign(r, extra); console.log(JSON.stringify(r, null, 1)); process.exit(code); };
const escRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

if (!resto[0]) fim(2, { ok: false, erro: 'Uso: node publicador/tiktok.mjs <post.json>' });
let c;
try { c = JSON.parse(fs.readFileSync(resto[0], 'utf8')); } catch (e) { fim(2, { ok: false, erro: 'Não consegui ler o JSON do post: ' + e.message }); }
for (const k of ['arquivo', 'legenda', 'produtoId', 'nomeProduto']) if (!c[k]) fim(2, { ok: false, erro: `Falta "${k}" no JSON do post.` });
if (!fs.existsSync(c.arquivo)) fim(2, { ok: false, erro: 'Vídeo não encontrado: ' + c.arquivo });
if (c.capa && !fs.existsSync(c.capa)) fim(2, { ok: false, erro: 'Capa não encontrada: ' + c.capa });
c.produtoId = String(c.produtoId);
if (c.nomeProduto.length > 30) { c.nomeProduto = c.nomeProduto.slice(0, 30); log('nomeProduto cortado em 30 caracteres'); }
const hashtags = (Array.isArray(c.hashtags) ? c.hashtags : String(c.hashtags || '').split(/\s+/)).filter(Boolean).map((t) => (t.startsWith('#') ? t : '#' + t));
const agendar = !!c.quando && c.quando !== 'agora';
let alvo = null;
if (agendar) {
  const m = String(c.quando).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!m) fim(2, { ok: false, erro: '"quando" deve ser "agora" ou "AAAA-MM-DD HH:mm" (horário de Brasília).' });
  alvo = { ano: +m[1], mes: +m[2], dia: +m[3], hh: m[4], mm: m[5] };
}
r.video = path.basename(c.arquivo);

const MESES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MESES_LONGO = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const rx = (...ts) => new RegExp('^\\s*(' + ts.join('|') + ')\\s*$', 'i');
// Textos do TikTok Studio em inglês (?lang=en); alternativas em português quando conhecidas.
const T = {
  uploaded: /Uploaded|Enviado|Carregado/i,
  addLink: /Add link|Adicionar link/i,
  add: rx('\\+?\\s*Add', 'Adicionar'), next: rx('Next', 'Avançar', 'Próximo'), cancel: rx('Cancel', 'Cancelar'),
  select: rx('Select', 'Selecionar'), products: rx('Products', 'Produtos'),
  discard: rx('Discard', 'Descartar'), save: rx('Save', 'Salvar'), post: rx('Post', 'Publicar'), schedule: rx('Schedule', 'Agendar'),
  editCover: /Edit cover|Editar capa/i, uploadCover: /Upload cover|Enviar capa|Carregar capa/i,
  showMore: rx('Show more', 'Mostrar mais'), disclose: /Disclose post content|Divulgar conte[uú]do/i, branded: /Branded content|Conte[uú]do de marca/i,
  checking: /Checking in progress|Verificação em andamento|Verificando/i, checkLite: /Content check lite|Verifica[cç][aã]o de conte[uú]do/i,
  quemVe: /Who can see this post|Quem pode ver/i, quando: /When to post|Quando postar/i,
};

let browser; let ctx; let page;
async function limpar() { try { if (page && !flags.manter) await page.close(); } catch { /* ok */ } try { await browser?.close(); } catch { /* ok */ } }
async function parar(code, extra) { await limpar(); fim(code, extra); }

async function fecharAvisos(p) {
  for (const nome of ['Turn on', 'Got it', 'Allow', 'Ativar', 'Entendi', 'Permitir']) {
    const b = p.getByRole('button', { name: new RegExp('^' + nome + '$', 'i') }).last();
    if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); await esperar(1200); }
  }
}
async function descartar(p) {
  const d = p.getByRole('button', { name: T.discard }).first();
  if (await d.isVisible().catch(() => false)) {
    await d.click(); await esperar(1200);
    const cf = p.getByRole('button', { name: T.discard }).last();
    if (await cf.isVisible().catch(() => false)) await cf.click().catch(() => {});
  }
}
async function foto(nome) {
  const dir = path.join(os.tmpdir(), 'naper-studio'); fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, nome); await page.screenshot({ path: f, fullPage: true }).catch(() => {}); return f;
}
function gerarCapa() {
  const dur = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', c.arquivo], { encoding: 'utf8' });
  const d = parseFloat((dur.stdout || '').trim());
  if (!(d > 0)) return null;
  const out = path.join(os.tmpdir(), 'naper-studio', 'capa-' + Date.now() + '.jpg'); fs.mkdirSync(path.dirname(out), { recursive: true });
  const f = spawnSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(d / 2), '-i', c.arquivo, '-frames:v', '1', '-q:v', '2', out], { encoding: 'utf8' });
  return f.status === 0 && fs.existsSync(out) ? out : null;
}

try { ({ browser, ctx } = await conectar(qualPorta(flags))); } catch (e) { fim(1, { ok: false, erro: e.message }); }

try {
  page = await ctx.newPage();
  await page.setViewportSize({ width: 1440, height: 1000 }).catch(() => {});

  // 0) Conta: confere antes de tudo.
  await page.goto('https://www.tiktok.com/tiktokstudio/upload?lang=en', { waitUntil: 'domcontentloaded' });
  await esperar(6000);
  const quem = await usernameTikTok(page);
  r.conta = quem ? '@' + quem : null;
  if (!quem) await parar(3, { ok: false, parou: 'sem login: o TikTok não está logado neste Chrome. Rode "node publicador/chrome.mjs --login tiktok", entre na conta e tente de novo. Nada foi postado.' });
  if (c.contaEsperada && c.contaEsperada.replace(/^@/, '').toLowerCase() !== quem.toLowerCase()) {
    await parar(3, { ok: false, parou: `conta errada: logada @${quem}, esperada ${c.contaEsperada}. Nada foi postado.` });
  }
  log('conta @' + quem);

  // 1) Upload.
  await page.locator('input[type=file]').first().setInputFiles(c.arquivo);
  let subiu = false;
  for (let i = 0; i < 150; i++) { await esperar(2000); if (T.uploaded.test(await page.locator('body').innerText().catch(() => ''))) { subiu = true; break; } }
  if (!subiu) await parar(4, { ok: false, parou: 'o upload do vídeo não terminou em 5 minutos. Nada foi postado.' });
  await esperar(2500); await fecharAvisos(page); log('vídeo enviado');

  // 2) Produto primeiro: precisa estar Active e com estoque.
  await page.getByText(T.addLink).first().scrollIntoViewIfNeeded().catch(() => {});
  await page.locator('button').filter({ hasText: T.add }).first().click();
  await esperar(2000);
  await page.locator('[role=dialog]').last().getByText(T.select).click();
  await esperar(900);
  await page.getByText(T.products).last().click();
  await esperar(700);
  await page.locator('[role=dialog]').last().getByRole('button', { name: T.next }).click();
  await esperar(4000);
  const dlg = page.locator('[role=dialog]').last();
  const busca = dlg.locator('input[type=text], input:not([type])').first();
  await busca.fill(c.produtoId); await busca.press('Enter').catch(() => {}); await esperar(3500);
  const linha = dlg.locator('tr, [class*=row]').filter({ hasText: c.produtoId }).first();
  const textoLinha = (await linha.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  r.produtoNoSeletor = textoLinha || 'NÃO ENCONTRADO';
  const estoque = Number((textoLinha.match(/R\$ [\d.,]+\s+(\d[\d.]*)\s/) || [])[1]?.replace(/\./g, '') || 0);
  if (!textoLinha || !/Active|Ativo/i.test(textoLinha) || !(estoque > 0)) {
    await dlg.getByRole('button', { name: T.cancel }).click().catch(() => {}); await esperar(1000);
    await descartar(page);
    await parar(5, { ok: false, parou: 'produto indisponível (não encontrado, inativo ou sem estoque): nada foi postado' });
  }
  const marca = linha.locator('input[type=radio], input[type=checkbox], [role=radio], [role=checkbox], label').first();
  if (await marca.count()) await marca.click({ force: true }); else await linha.click();
  await esperar(700);
  await dlg.getByRole('button', { name: T.next }).click(); await esperar(2500);
  const d2 = page.locator('[role=dialog]').last();
  await d2.locator('input, textarea').first().fill(c.nomeProduto); await esperar(400);
  await d2.getByRole('button', { name: T.add }).click(); await esperar(2500);
  r.produtoNoPost = (await page.getByText(T.addLink).first().locator('xpath=ancestor::div[2]').innerText().catch(() => '')).replace(/\s+/g, ' ').replace(/Add link Add|Adicionar link Adicionar/i, '').trim() || c.nomeProduto;
  log('produto no carrinho: ' + r.produtoNoPost);

  // 3) Legenda: texto + @marca (da lista) + hashtags (da lista), para virarem entidades de verdade.
  const ed = page.locator('.public-DraftEditor-content').first();
  await ed.scrollIntoViewIfNeeded();
  await ed.click(); await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace'); await esperar(400);
  await page.keyboard.type(c.legenda + ' ', { delay: 25 });
  const marcaNome = (c.marca || '').replace(/^@/, '');
  if (marcaNome) {
    await page.keyboard.type('@' + marcaNome, { delay: 140 });
    const item = page.getByText(new RegExp('^' + escRx(marcaNome) + ' · ', 'i')).first();
    let achou = false;
    for (let i = 0; i < 16 && !achou; i++) { await esperar(500); achou = await item.isVisible().catch(() => false); }
    if (achou) await item.click();
    r.mencao = achou ? '@' + marcaNome + ' (escolhida na lista)' : 'NÃO ACHEI @' + marcaNome + ' na lista';
    await esperar(800);
  }
  r.hashtags = [];
  for (const t of hashtags) {
    await page.keyboard.type(' ' + t, { delay: 110 }); await esperar(2500);
    const sug = page.locator('div, span').filter({ hasText: new RegExp('^#?' + escRx(t.replace('#', '')) + '$', 'i') });
    let ok = false;
    for (let i = (await sug.count()) - 1; i >= 0; i--) {
      const s = sug.nth(i);
      if (await s.isVisible().catch(() => false)) { const box = await s.boundingBox(); if (box && box.y > 380) { await s.click(); ok = true; break; } }
    }
    if (!ok) await page.keyboard.press('Escape').catch(() => {});
    r.hashtags.push({ tag: t, escolhidaNaLista: ok });
    await esperar(600);
  }
  r.descricao = (await ed.innerText()).trim();
  r.entidades = ((await ed.innerHTML()).match(/class="mention"/g) || []).length;
  r.entidadesEsperadas = (marcaNome ? 1 : 0) + hashtags.length;
  if (r.entidades < r.entidadesEsperadas) log(`ATENÇÃO: só ${r.entidades} de ${r.entidadesEsperadas} menções/hashtags viraram entidades`);

  // 4) Capa: a da criadora, ou um quadro do meio do vídeo (ffmpeg).
  let capa = c.capa; let capaGerada = false;
  if (!capa) { capa = gerarCapa(); capaGerada = !!capa; if (!capa) log('sem capa: ffmpeg indisponível, ficou a capa padrão do TikTok'); }
  if (capa) {
    await page.getByText(T.editCover).first().click(); await esperar(3500);
    const cap = page.locator('[role=dialog]').last();
    const [fc] = await Promise.all([page.waitForEvent('filechooser', { timeout: 15000 }), cap.getByText(T.uploadCover).first().click()]);
    await fc.setFiles(capa); await esperar(4500);
    await cap.getByRole('button', { name: T.save }).click(); await esperar(2500);
    r.capa = path.basename(capa) + (capaGerada ? ' (quadro do meio do vídeo)' : '');
  }

  // 5) Conteúdo de marca.
  const mais = page.getByText(T.showMore).first();
  if (await mais.isVisible().catch(() => false)) { await mais.click(); await esperar(1200); }
  if (c.conteudoDeMarca) {
    const sw = page.getByText(T.disclose).first().locator('xpath=ancestor::div[1]').locator('[role=switch], input[type=checkbox]').first();
    if (await sw.count()) await sw.click({ force: true });
    else await page.getByText(T.disclose).first().locator('xpath=following::*[@role="switch" or self::input][1]').click({ force: true });
    await esperar(1200);
    const bc = page.getByText(T.branded).first();
    await bc.locator('xpath=preceding::input[@type="checkbox"][1]').click({ force: true }); await esperar(1200);
    r.conteudoDeMarca = await bc.locator('xpath=ancestor::*[.//input[@type="checkbox"]][1]//input[@type="checkbox"]').first().isChecked().catch(() => null);
  }

  // 6) Quando.
  if (agendar) {
    await page.getByText(T.schedule).first().click(); await esperar(1800); await fecharAvisos(page);
    const alvoTxt = `${MESES[alvo.mes - 1]} ${alvo.dia}, ${alvo.ano}`;
    const campoData = page.getByText(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/).first();
    if (await campoData.count()) {
      const atual = (await campoData.innerText()).trim();
      if (atual !== alvoTxt) {
        await campoData.click(); await esperar(1000);
        for (let i = 0; i < 14; i++) {
          const cab = (await page.locator('[class*=calendar], [role=dialog], [role=grid]').allInnerTexts().catch(() => [])).join(' ').toLowerCase();
          if (cab.includes(MESES_LONGO[alvo.mes - 1]) && cab.includes(String(alvo.ano))) break;
          const prox = page.locator('[class*=arrow-right], [class*=next], [aria-label*=ext]').last();
          if (!(await prox.count())) break;
          await prox.click().catch(() => {}); await esperar(500);
        }
        await page.locator('[class*=calendar] [class*=day], [role=gridcell]').filter({ hasText: new RegExp('^' + alvo.dia + '$') }).first().click().catch(() => {});
        await esperar(900);
      }
    }
    await page.getByText(/^\d{2}:\d{2}$/).first().click(); await esperar(1200);
    const h = page.getByRole('option', { name: 'Hours ' + alvo.hh }); await h.scrollIntoViewIfNeeded(); await h.click(); await esperar(600);
    const m = page.getByRole('option', { name: 'Minutes ' + alvo.mm }); await m.scrollIntoViewIfNeeded(); await m.click(); await esperar(900);
    await page.getByText(T.quemVe).first().click().catch(() => {}); await esperar(700);
    r.agendamento = (await page.getByText(T.quando).first().locator('xpath=ancestor::div[3]').innerText().catch(() => '')).replace(/\s+/g, ' ').replace(/When to post Now Schedule /i, '').trim();
    r.agendamentoConfere = r.agendamento.includes(alvoTxt) && r.agendamento.includes(`${alvo.hh}:${alvo.mm}`);
    if (!r.agendamentoConfere) { r.foto = await foto('agendamento-errado.png'); await parar(6, { ok: false, parou: `o agendamento no TikTok ("${r.agendamento}") não bate com o pedido (${c.quando}). Nada foi postado.` }); }
  } else r.agendamento = 'agora';
  r.quemVe = await page.getByText(T.quemVe).first().locator('xpath=following::*[1]').innerText().catch(() => '?');
  const botao = page.locator('button').filter({ hasText: agendar ? T.schedule : T.post }).first();
  r.botao = await botao.innerText().catch(() => '?');
  r.foto = await foto('conferencia.png');

  if (c.seco) await parar(0, { ok: true, seco: true, resultado: 'modo seco: tudo montado; parei antes de clicar em "' + r.botao + '". O rascunho foi fechado sem postar.' });

  // 7) Esperar a checagem do TikTok terminar (nunca postar antes) e confirmar.
  const esperarChecagem = async (min) => {
    const limite = Date.now() + min * 60000; let st = '';
    const cancel = page.locator('[role=dialog]').last().getByRole('button', { name: T.cancel });
    if (await cancel.isVisible().catch(() => false)) { await cancel.click(); await esperar(1000); }
    while (Date.now() < limite) {
      st = (await page.getByText(T.checkLite).first().locator('xpath=ancestor::div[2]').innerText().catch(() => '')).replace(/\s+/g, ' ');
      if (!T.checking.test(st)) break;
      await esperar(15000);
    }
    return st.slice(0, 200) || '(sem painel de checagem)';
  };
  let concluido = false;
  for (let tentativa = 1; tentativa <= 3 && !concluido; tentativa++) {
    r.checagem = await esperarChecagem(14);
    if (T.checking.test(r.checagem)) continue;
    await botao.click();
    for (let i = 0; i < 20; i++) {
      await esperar(1500);
      if (/tiktokstudio\/content/.test(page.url())) { concluido = true; break; }
      const dtxt = await page.locator('[role=dialog]').last().innerText().catch(() => '');
      if (/Continue to post|Continuar/i.test(dtxt)) { log('o TikTok perguntou "Continue to post?": o clique não valeu; esperando a checagem'); break; }
    }
  }
  if (!concluido) await parar(7, { ok: false, parou: 'não consegui confirmar: a checagem não terminou ou o TikTok não levou à lista de posts. Confira em https://www.tiktok.com/tiktokstudio/content antes de tentar de novo (não duplique o post).', foto: await foto('nao-confirmado.png') });

  // 8) Só vale como postado quando aparece na lista.
  await esperar(7000);
  const corpo = await page.locator('body').innerText().catch(() => '');
  r.naLista = corpo.includes(c.legenda.slice(0, 25));
  r.ondeConferir = 'https://www.tiktok.com/tiktokstudio/content';
  r.foto = await foto('lista-posts.png');
  await parar(r.naLista ? 0 : 8, { ok: r.naLista, resultado: r.naLista ? (agendar ? 'agendado: apareceu na lista de posts' : 'postado: apareceu na lista de posts') : 'voltou para a lista mas ainda não vi o post nela; confira em ' + r.ondeConferir });
} catch (e) {
  let f = null; try { f = await foto('erro.png'); } catch { /* ok */ }
  await parar(1, { ok: false, erro: String(e.message).split('\n')[0], foto: f, dica: 'Nada foi confirmado. Confira a aba do TikTok Studio antes de repetir.' });
}
