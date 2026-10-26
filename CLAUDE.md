@AGENTS.md

## Só do Claude Code

- Hooks em `.claude/settings.json`: `guard.sh` bloqueia o `.env` e buscas recursivas na raiz; `test-after-edit.sh` roda `npm test` depois de cada Edit/Write em `src/` ou `test/`; `stop-gate.sh` não deixa encerrar com teste vermelho (até 3 voltas; não roda em plan mode). Se um hook bloquear, leia o motivo e corrija; não contorne.
- Tarefa com spec: plano em `docs/plano.md` antes de implementar. Antes de dizer pronto, peça ao subagente `revisor-codigo` para revisar o diff contra a spec.
