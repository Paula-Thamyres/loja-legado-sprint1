#!/usr/bin/env node
// Placar de sessões do Claude Code a partir da saída em stream-json:
//   claude -p "<prompt>" --output-format stream-json --verbose > docs/sessoes/<nome>.jsonl
// Uso: node scripts/placar.mjs docs/sessoes/*.jsonl
// Custo é a estimativa a preço de tabela que o próprio Claude Code calcula (total_cost_usd).
import fs from 'node:fs';
import path from 'node:path';

const arquivos = process.argv.slice(2);
if (arquivos.length === 0) {
  console.error('Uso: node scripts/placar.mjs <sessao.jsonl> [...]');
  process.exit(1);
}

const lerEventos = (arquivo) =>
  fs.readFileSync(arquivo, 'utf8').split('\n').filter((l) => l.startsWith('{')).map((l) => JSON.parse(l));

function medir(eventos) {
  const resultados = eventos.filter((e) => e.type === 'result');
  const usos = eventos.filter((e) => e.type === 'assistant' && e.message?.usage).map((e) => e.message.usage);
  const ferramentas = eventos.filter((e) => e.type === 'assistant').flatMap((e) => e.message?.content ?? []).filter((c) => c.type === 'tool_use');
  const hooks = eventos.filter((e) => e.type === 'system' && e.subtype === 'hook_response');
  const ultimoUso = usos.at(-1);
  const negadas = new Set(resultados.flatMap((r) => (r.permission_denials ?? []).map((d) => d.tool_use_id)));

  return {
    turnos: resultados.reduce((soma, r) => soma + (r.num_turns ?? 0), 0),
    custo: Math.max(0, ...resultados.map((r) => r.total_cost_usd ?? 0)),
    segundos: resultados.reduce((soma, r) => soma + (r.duration_ms ?? 0), 0) / 1000,
    contexto: ultimoUso ? ultimoUso.input_tokens + ultimoUso.cache_read_input_tokens + ultimoUso.cache_creation_input_tokens : 0,
    editsVermelhos: hooks.filter((h) => h.hook_event === 'PostToolUse' && h.exit_code === 2).length,
    voltasStopGate: hooks.filter((h) => h.hook_event === 'Stop' && h.exit_code === 2).length,
    bloqueios: negadas.size,
    perguntas: ferramentas.filter((f) => f.name === 'AskUserQuestion').length,
  };
}

const num = (n, casas = 0) => n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

console.log('| Sessão | Turnos | Custo estimado | Duração | Contexto no fim | Edições com teste vermelho | Voltas do stop-gate | Ações bloqueadas | Perguntas ao dev |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const arquivo of arquivos) {
  const m = medir(lerEventos(arquivo));
  console.log(`| ${path.basename(arquivo, '.jsonl')} | ${m.turnos} | US$ ${num(m.custo, 2)} | ${num(m.segundos)} s | ${num(m.contexto)} tok | ${m.editsVermelhos} | ${m.voltasStopGate} | ${m.bloqueios} | ${m.perguntas} |`);
}
