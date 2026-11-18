#!/usr/bin/env node
// Hook UserPromptSubmit: quando ela clica "Mandar para o Claude" no painel, o pedido fica em
// estado/pedido-pendente.json. Se a mensagem seguinte dela for curta ("vai", "pode", "faz"), este script
// entrega o pedido ao Claude como contexto. Mensagem longa (ela colou o pedido) = não entrega, para não duplicar.
// Nunca falha a sessão.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARQ = path.join(RAIZ, 'estado', 'pedido-pendente.json');

let s = '';
const t = setTimeout(fim, 1500);
process.stdin.on('data', (c) => (s += c));
process.stdin.on('end', fim);
process.stdin.on('error', fim);

function fim() {
  clearTimeout(t);
  try {
    if (!fs.existsSync(ARQ)) return process.exit(0);
    let entrada = {};
    try {
      entrada = JSON.parse(s || '{}');
    } catch {}
    const prompt = String(entrada.prompt || '').trim();
    const p = JSON.parse(fs.readFileSync(ARQ, 'utf8'));
    const velho = Date.now() - new Date(p.quando).getTime() > 6 * 3600 * 1000;
    if (velho) {
      fs.rmSync(ARQ, { force: true });
      return process.exit(0);
    }
    if (prompt.length > 60) return process.exit(0);
    const pasta = path.join(RAIZ, 'estado', 'pedidos');
    fs.mkdirSync(pasta, { recursive: true });
    fs.renameSync(ARQ, path.join(pasta, new Date().toISOString().replace(/[:.]/g, '-') + '.json'));
    process.stdout.write('[Naper Studio] Ela mandou este pedido pela Biblioteca do painel (é o que ela quer agora):\n\n' + p.texto + '\n');
  } catch {}
  process.exit(0);
}
