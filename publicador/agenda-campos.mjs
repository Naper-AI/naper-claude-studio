// A VARIANTE "CAMPOS" DO AGENDAMENTO NO TIKTOK STUDIO (26/11/2026).
//
// Há duas telas de "When to post" no TikTok Studio, e a conta decide qual aparece:
//   • a ANTIGA mostra a data e a hora como TEXTO ("Nov 26, 2026", "19:35") e a lista de horas com opções acessíveis
//     ("Hours 21", "Minutes 30");
//   • a NOVA (vista primeiro numa conta real em 26/11/2026) usa CAMPOS de formulário somente-leitura ("2026-11-26",
//     "19:35"), um seletor de hora de DUAS COLUNAS sem nome acessível (.tiktok-timepicker-left / -right, minutos de 5 em
//     5) e um calendário com título "November / 2026", duas setas e os dias numerados.
//
// O kit só conhecia a antiga: na nova ele não achava a hora, dizia que "a lista de horas não abriu" (ela abria) e pulava
// a data. A conferência final segurava — nada saía errado —, mas nenhum agendamento dessas contas saía.
//
// Este módulo cuida SÓ da variante nova. Quem decide qual variante é a tela é o `tiktok.mjs` (há campos HH:MM na seção?).
// Nunca clica em publicar nem em agendar: só preenche data e hora e devolve o que ficou nos campos, para a conferência.

/** A variante pela própria tela: os valores dos campos da seção "When to post". */
export async function valoresDosCampos(secao) {
  return secao.locator('input').evaluateAll((els) => els.map((e) => String(e.value ?? ''))).catch(() => []);
}

export const ehHora = (v) => /^\d{2}:\d{2}$/.test(v);
export const ehDataIso = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/** A data do pedido no formato que a variante nova mostra no campo. */
export const dataIso = (alvo) => `${alvo.ano}-${String(alvo.mes).padStart(2, '0')}-${String(alvo.dia).padStart(2, '0')}`;

const MESES_LONGO = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/**
 * Preenche data e hora na variante de CAMPOS. `secao` é o bloco da seção "When to post" (onde estão os campos).
 * Devolve `{ ok: true, agendamento, confere }` ou `{ ok: false, motivo }` — o motivo já diz que nada foi postado.
 */
export async function agendarPorCampos(page, secao, alvo, { esperar = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const alvoIso = dataIso(alvo);
  const alvoHora = `${alvo.hh}:${alvo.mm}`;
  if (Number(alvo.mm) % 5 !== 0) {
    return { ok: false, motivo: `o TikTok só agenda de 5 em 5 minutos, e o pedido é para ${alvoHora}. Nada foi postado.` };
  }
  const campos = secao.locator('input');
  const indice = async (teste) => (await valoresDosCampos(secao)).findIndex(teste);

  // 1) A DATA: o calendário abre no mês do campo; anda pelas setas até o mês pedido e clica no dia.
  const iData = await indice(ehDataIso);
  if (iData < 0) return { ok: false, motivo: 'o campo da data do agendamento não apareceu no TikTok. Nada foi postado.' };
  if ((await campos.nth(iData).inputValue().catch(() => '')) !== alvoIso) {
    await campos.nth(iData).click(); await esperar(1000);
    const cal = page.locator('.calendar-wrapper:visible').first();
    if (!(await cal.count())) return { ok: false, motivo: 'o calendário do agendamento do TikTok não abriu. Nada foi postado.' };
    for (let i = 0; i < 14; i++) {
      const titulo = (await cal.locator('.month-header-wrapper').innerText().catch(() => '')).toLowerCase();
      if (titulo.includes(MESES_LONGO[alvo.mes - 1]) && titulo.includes(String(alvo.ano))) break;
      // As duas setas do cabeçalho: a primeira volta, a ÚLTIMA avança (o agendamento é sempre para frente).
      await cal.locator('.month-header-wrapper .arrow').last().click().catch(() => {}); await esperar(500);
    }
    await cal.locator('.day-span-container').filter({ hasText: new RegExp(`^${alvo.dia}$`) }).first().click().catch(() => {});
    await esperar(900);
  }

  // 2) A HORA: o seletor de duas colunas (horas à esquerda, minutos à direita).
  const iHora = await indice(ehHora);
  if (iHora < 0) return { ok: false, motivo: 'o campo da hora do agendamento não apareceu no TikTok. Nada foi postado.' };
  // A lista ABERTA; se escolher a hora a fechou, abre de novo antes do minuto (não se sabe se o TikTok fecha).
  const listaAberta = async () => {
    const visivel = () => page.locator('.tiktok-timepicker-time-picker-container:visible').first();
    if (await visivel().count()) return visivel();
    await campos.nth(iHora).click(); await esperar(1200);
    return (await visivel().count()) ? visivel() : null;
  };
  for (const [lado, valor, nome] of [['left', alvo.hh, 'hora'], ['right', alvo.mm, 'minuto']]) {
    const seletor = await listaAberta();
    if (!seletor) return { ok: false, motivo: 'a lista de horas do TikTok não abriu (variante de campos). Nada foi postado.' };
    const alvoItem = seletor.locator(`.tiktok-timepicker-${lado}`).filter({ hasText: new RegExp(`^${valor}$`) }).first();
    if (!(await alvoItem.count())) return { ok: false, motivo: `o ${nome} ${valor} não está na lista do TikTok. Nada foi postado.` };
    await alvoItem.scrollIntoViewIfNeeded().catch(() => {});
    await alvoItem.click(); await esperar(600);
  }

  // 3) O que ficou nos campos é o que vale (o texto da seção não tem os valores dos inputs).
  const valores = await valoresDosCampos(secao);
  const data = valores.find(ehDataIso) ?? '';
  const hora = valores.find(ehHora) ?? '';
  return { ok: true, agendamento: `${data} ${hora}`.trim(), confere: data === alvoIso && hora === alvoHora };
}
