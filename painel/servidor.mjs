#!/usr/bin/env node
// Painel do Naper Studio: http://localhost:4747 (só no computador dela; escuta apenas em 127.0.0.1).
// Node puro, sem dependências. Serve painel/web/ e uma API JSON que lê o estado do onboarding e dos trabalhos.
// Uso: node painel/servidor.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import * as E from './lib/estado.mjs';

const WEB = path.join(E.RAIZ, 'painel', 'web');
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/quicktime', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.webm': 'video/webm',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
};
const HOSTS = new Set(['localhost:' + E.PORTA, '127.0.0.1:' + E.PORTA]);

function json(res, codigo, dados) {
  res.writeHead(codigo, { 'content-type': TIPOS['.json'], 'cache-control': 'no-store' });
  res.end(JSON.stringify(dados));
}
function arquivo(res, arq) {
  fs.stat(arq, (err, st) => {
    if (err || !st.isFile()) return json(res, 404, { erro: 'não encontrado' });
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(arq).pipe(res);
  });
}
// Só imagens de dentro de estudio/ e relatorios/ (miniaturas e folhas de quadros). Nunca vídeo, nunca fora da pasta.
function caminhoSeguro(rel) {
  if (!rel) return null;
  const alvo = path.resolve(E.RAIZ, rel);
  const ok = ['estudio', 'relatorios'].some((d) => alvo.startsWith(path.join(E.RAIZ, d) + path.sep));
  if (!ok || !/\.(png|jpe?g|webp)$/i.test(alvo)) return null;
  return alvo;
}
// Vídeos, imagens, markdown, json e texto de dentro de estudio/ e relatorios/ (só lá), com Range para o player pular no vídeo.
// O caminho é relativo à pasta do Naper Studio (ex.: /midia/estudio/editados/x.mp4, /midia/relatorios/semana.md).
function caminhoMidia(rel) {
  let r;
  try {
    r = decodeURIComponent(rel);
  } catch {
    return null;
  }
  if (!r || r.includes('\0')) return null;
  const alvo = path.resolve(E.RAIZ, r.replace(/^[\\/]+/, ''));
  const ok = ['estudio', 'relatorios'].some((d) => alvo.startsWith(path.join(E.RAIZ, d) + path.sep));
  if (!ok || !/\.(mp4|m4v|mov|webm|png|jpe?g|webp|md|txt|json)$/i.test(alvo)) return null;
  return alvo;
}
function midia(req, res, alvo) {
  fs.stat(alvo, (err, st) => {
    if (err || !st.isFile()) return json(res, 404, { erro: 'não encontrado' });
    const tipo = TIPOS[path.extname(alvo).toLowerCase()] || 'application/octet-stream';
    const cab = { 'content-type': tipo, 'accept-ranges': 'bytes', 'cache-control': 'no-store' };
    const m = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
    if (!m || (m[1] === '' && m[2] === '')) {
      res.writeHead(200, { ...cab, 'content-length': st.size });
      return req.method === 'HEAD' ? res.end() : fs.createReadStream(alvo).pipe(res);
    }
    const ini = m[1] === '' ? Math.max(0, st.size - Number(m[2])) : Number(m[1]);
    const fim = m[1] === '' || m[2] === '' ? st.size - 1 : Math.min(Number(m[2]), st.size - 1);
    if (ini > fim || ini >= st.size) {
      res.writeHead(416, { 'content-range': 'bytes */' + st.size });
      return res.end();
    }
    res.writeHead(206, { ...cab, 'content-range': 'bytes ' + ini + '-' + fim + '/' + st.size, 'content-length': fim - ini + 1 });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(alvo, { start: ini, end: fim }).pipe(res);
  });
}
function trabalhoAtual(lista) {
  const ativo = lista.find((t) => t.status === 'editando') || lista.find((t) => t.status === 'em_fila') || lista[0];
  if (!ativo) return null;
  return { ...ativo, progresso: E.progresso(ativo.id) };
}
function lerCorpo(req) {
  return new Promise((ok) => {
    let s = '';
    req.on('data', (c) => {
      s += c;
      if (s.length > 100000) req.destroy();
    });
    req.on('end', () => {
      try {
        ok(JSON.parse(s || '{}'));
      } catch {
        ok({});
      }
    });
  });
}

const servidor = http.createServer(async (req, res) => {
  // Protege contra páginas de fora tentando falar com o painel (DNS rebinding e pedidos de outro site).
  if (!HOSTS.has(String(req.headers.host || ''))) return json(res, 403, { erro: 'host' });
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  try {
    if (req.method === 'POST') {
      const origem = String(req.headers.origin || '');
      if (origem && !HOSTS.has(origem.replace(/^https?:\/\//, ''))) return json(res, 403, { erro: 'origem' });
      if (p === '/api/pedido') {
        const { texto, funcao } = await lerCorpo(req);
        if (!texto || typeof texto !== 'string') return json(res, 400, { erro: 'texto vazio' });
        E.gravar(path.join(E.RAIZ, 'estado', 'pedido-pendente.json'), { funcao: funcao || '', texto: texto.slice(0, 20000), quando: new Date().toISOString() });
        return json(res, 200, { ok: true });
      }
      const mf = /^\/api\/feedback\/([^/]+)(?:\/(\d+)\/(feito|desfeito|apagar))?$/.exec(p);
      if (mf) {
        const id = decodeURIComponent(mf[1]);
        if (!E.trabalhos().some((t) => t.id === id)) return json(res, 404, { erro: 'trabalho não encontrado' });
        try {
          if (!mf[2]) {
            const { t, texto, trecho } = await lerCorpo(req);
            E.feedbackAdicionar(id, t, texto, trecho);
          } else if (mf[3] === 'apagar') E.feedbackApagar(id, mf[2]);
          else E.feedbackMarcar(id, mf[2], mf[3] === 'feito');
        } catch (e) {
          return json(res, 400, { erro: e.message });
        }
        return json(res, 200, E.feedback(id));
      }
      const ms = /^\/api\/trabalho\/([^/]+)\/status$/.exec(p);
      if (ms) {
        const id = decodeURIComponent(ms[1]);
        try {
          const { status } = await lerCorpo(req);
          return json(res, 200, E.moverTrabalho(id, String(status || '')));
        } catch (e) {
          return json(res, 400, { erro: e.message });
        }
      }
      if (p === '/api/desligar') {
        json(res, 200, { ok: true });
        setTimeout(() => process.exit(0), 100);
        return;
      }
      return json(res, 404, { erro: 'não encontrado' });
    }
    if (p === '/api/saude') return json(res, 200, { ok: true, app: 'naper-studio', versao: E.versao(), pid: process.pid });
    if (p === '/api/funcoes') return json(res, 200, { funcoes: E.funcoesProprias() });
    if (p === '/api/estado') {
      const lista = E.trabalhos();
      return json(res, 200, {
        versao: E.versao(),
        pasta: E.RAIZ,
        onboarding: E.onboarding(),
        trabalhos: lista.map((t) => ({ ...t, feedbackPendentes: E.feedbackPendentes(t.id) })),
        atual: trabalhoAtual(lista),
        etapas: E.ETAPAS,
        temMarca: fs.existsSync(path.join(E.RAIZ, 'marca', 'minha-marca.md')),
      });
    }
    if (p.startsWith('/api/trabalho/')) {
      const id = decodeURIComponent(p.slice('/api/trabalho/'.length));
      const item = E.trabalhos().find((t) => t.id === id);
      if (!item) return json(res, 404, { erro: 'trabalho não encontrado' });
      return json(res, 200, { ...item, progresso: E.progresso(id) });
    }
    if (p.startsWith('/midia/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { erro: 'método' });
      const alvo = caminhoMidia(p.slice('/midia/'.length));
      if (!alvo) return json(res, 403, { erro: 'só arquivos de estudio/ e relatorios/' });
      return midia(req, res, alvo);
    }
    if (p.startsWith('/api/feedback/')) {
      const id = decodeURIComponent(p.slice('/api/feedback/'.length));
      if (!/^[a-z0-9][a-z0-9._-]{0,80}$/i.test(id)) return json(res, 400, { erro: 'id inválido' });
      return json(res, 200, E.feedback(id));
    }
    if (p === '/arquivo') {
      const alvo = caminhoSeguro(url.searchParams.get('c'));
      if (!alvo) return json(res, 403, { erro: 'só imagens de estudio/ e relatorios/' });
      return arquivo(res, alvo);
    }
    const rel = p === '/' ? 'index.html' : p.replace(/^\/+/, '');
    const alvo = path.resolve(WEB, rel);
    if (!alvo.startsWith(WEB + path.sep)) return json(res, 403, { erro: 'caminho' });
    return arquivo(res, alvo);
  } catch (e) {
    return json(res, 500, { erro: String(e && e.message ? e.message : e) });
  }
});

servidor.on('error', (e) => {
  console.error(e.code === 'EADDRINUSE' ? 'A porta ' + E.PORTA + ' já está em uso (o painel já está no ar?).' : String(e));
  process.exit(1);
});
servidor.listen(E.PORTA, '127.0.0.1', () => {
  console.log('Painel do Naper Studio no ar: http://localhost:' + E.PORTA);
});
