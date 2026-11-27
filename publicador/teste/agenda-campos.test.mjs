// A variante "campos" do agendamento (26/11/2026), contra uma CÓPIA da estrutura que o TikTok Studio mostrou numa conta real:
// campos somente-leitura ("19:35", "2026-11-26"), seletor de hora de duas colunas sem nome acessível e calendário com
// "November / 2026" e duas setas. Roda num Chrome de verdade (o da máquina); sem Chrome, os testes são pulados.
//   node --test publicador/teste/agenda-campos.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

import { agendarPorCampos, valoresDosCampos } from '../agenda-campos.mjs';

const CHROME = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => p && fs.existsSync(p));

const MESES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** A página de mentira, com a mesma árvore e as mesmas classes da tela de verdade. */
function pagina({ fechaAoEscolherHora = false, listaQuebrada = false } = {}) {
  return `<!doctype html><html><body>
<div style="height:400px"></div>
<div id="secao"><div><span>When to post</span></div>
  <div class="schedule-radio-container"><label><input class="Radio__input" type="radio" name="q" value="post_now">Now</label>
  <label><input class="Radio__input" type="radio" name="q" value="schedule" checked>Schedule</label></div>
  <div class="TUXFormField TUXTextInput" style="position:relative"><div class="TUXInputBox"><div class="TUXTextInputCore"><input id="hora" class="TUXTextInputCore-input" readonly value="19:35"></div></div>
    <div id="tp" class="tiktok-timepicker-time-picker-container" style="display:none;z-index:10;position:absolute;left:0;bottom:36px;background:#fff">
      <div class="tiktok-timepicker-time-scroll-container" id="colH" style="height:120px;overflow:auto"></div>
      <div class="tiktok-timepicker-time-scroll-container" id="colM" style="height:120px;overflow:auto"></div></div></div>
  <div class="TUXFormField TUXTextInput" style="position:relative"><div class="TUXInputBox"><div class="TUXTextInputCore"><input id="data" class="TUXTextInputCore-input" readonly value="2026-11-26"></div></div>
    <div id="cal" class="calendar-wrapper" style="display:none;z-index:10;position:absolute;left:0;bottom:36px;background:#fff">
      <div class="month-header-wrapper"><span class="arrow" id="ant">&lt;</span><span class="title-wrapper"><span class="month-title" id="mes"></span><span>&nbsp;/&nbsp;</span><span class="year-title" id="ano"></span></span><span class="arrow" id="prox">&gt;</span></div>
      <div class="days-wrapper" id="dias"></div></div></div>
</div>
<div style="height:600px"></div><div id="quemVe">Who can see this post</div>
<script>
  const MESES = ${JSON.stringify(MESES)};
  const fecha = ${fechaAoEscolherHora}, quebrada = ${listaQuebrada};
  const hora = document.getElementById('hora'), data = document.getElementById('data');
  const tp = document.getElementById('tp'), cal = document.getElementById('cal');
  const dois = (n) => String(n).padStart(2, '0');
  const item = (lado, txt, ao) => { const d = document.createElement('div'); d.className = 'tiktok-timepicker-option-item';
    const s = document.createElement('span'); s.className = 'tiktok-timepicker-option-text tiktok-timepicker-' + lado; s.textContent = txt; d.appendChild(s); d.onclick = ao; return d; };
  for (let h = 0; h < 24; h++) document.getElementById('colH').appendChild(item('left', dois(h), () => { hora.value = dois(h) + hora.value.slice(2); if (fecha) tp.style.display = 'none'; }));
  for (let m = 0; m < 60; m += 5) document.getElementById('colM').appendChild(item('right', dois(m), () => { hora.value = hora.value.slice(0, 3) + dois(m); }));
  hora.onclick = () => { if (!quebrada) tp.style.display = 'block'; };
  let mes = 10, ano = 2026; // novembro (0-based)
  function desenhar() {
    document.getElementById('mes').textContent = MESES[mes]; document.getElementById('ano').textContent = ano;
    const dias = document.getElementById('dias'); dias.innerHTML = '';
    const n = new Date(ano, mes + 1, 0).getDate();
    for (let d = 1; d <= n; d++) { const s = document.createElement('span'); s.className = 'day-span-container'; s.textContent = String(d);
      s.onclick = () => { data.value = ano + '-' + dois(mes + 1) + '-' + dois(d); cal.style.display = 'none'; }; dias.appendChild(s); }
  }
  document.getElementById('prox').onclick = () => { mes += 1; if (mes > 11) { mes = 0; ano += 1; } desenhar(); };
  document.getElementById('ant').onclick = () => { mes -= 1; if (mes < 0) { mes = 11; ano -= 1; } desenhar(); };
  data.onclick = () => { cal.style.display = 'block'; desenhar(); };
</script></body></html>`;
}

async function comPagina(opcoes, fn) {
  const navegador = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    const page = await navegador.newPage();
    await page.setContent(pagina(opcoes));
    const secao = page.getByText('When to post').first().locator('xpath=ancestor::div[2]');
    return await fn(page, secao);
  } finally { await navegador.close(); }
}

const rapido = { esperar: (ms) => new Promise((r) => setTimeout(r, Math.min(ms, 50))) };

test('🔑 mesmo mês: data e hora ficam nos campos, e a conferência bate', { skip: !CHROME, timeout: 60000 }, async () => {
  await comPagina({}, async (page, secao) => {
    const r = await agendarPorCampos(page, secao, { ano: 2026, mes: 11, dia: 28, hh: '21', mm: '30' }, rapido);
    assert.deepEqual(r, { ok: true, agendamento: '2026-11-28 21:30', confere: true });
    assert.deepEqual((await valoresDosCampos(secao)).slice(2), ['21:30', '2026-11-28']);
  });
});

test('🔑 outro mês: anda pela seta da DIREITA até dezembro e escolhe o dia', { skip: !CHROME, timeout: 60000 }, async () => {
  await comPagina({}, async (page, secao) => {
    const r = await agendarPorCampos(page, secao, { ano: 2026, mes: 12, dia: 2, hh: '08', mm: '05' }, rapido);
    assert.deepEqual(r, { ok: true, agendamento: '2026-12-02 08:05', confere: true });
  });
});

test('🔑 a lista que FECHA ao escolher a hora é aberta de novo para o minuto', { skip: !CHROME, timeout: 60000 }, async () => {
  await comPagina({ fechaAoEscolherHora: true }, async (page, secao) => {
    const r = await agendarPorCampos(page, secao, { ano: 2026, mes: 11, dia: 27, hh: '00', mm: '45' }, rapido);
    assert.deepEqual(r, { ok: true, agendamento: '2026-11-27 00:45', confere: true });
  });
});

test('minuto fora do passo de 5: para ANTES de mexer, e diz que nada foi postado', { skip: !CHROME, timeout: 60000 }, async () => {
  await comPagina({}, async (page, secao) => {
    const r = await agendarPorCampos(page, secao, { ano: 2026, mes: 11, dia: 28, hh: '21', mm: '32' }, rapido);
    assert.equal(r.ok, false);
    assert.match(r.motivo, /5 em 5 minutos.*Nada foi postado/);
    assert.deepEqual((await valoresDosCampos(secao)).slice(2), ['19:35', '2026-11-26']);
  });
});

test('a lista de horas que não abre: para com o motivo legível (e a data já escolhida não vira post)', { skip: !CHROME, timeout: 60000 }, async () => {
  await comPagina({ listaQuebrada: true }, async (page, secao) => {
    const r = await agendarPorCampos(page, secao, { ano: 2026, mes: 11, dia: 28, hh: '21', mm: '30' }, rapido);
    assert.equal(r.ok, false);
    assert.match(r.motivo, /lista de horas do TikTok não abriu.*Nada foi postado/);
  });
});
