# 🔷 Master-JEV Hook Gateway

[![🇺🇸 English](https://img.shields.io/badge/%F0%9F%87%BA%F0%9F%87%B8-English-blue.svg)](README.md) [![🇧🇷 Português (Brasil)](https://img.shields.io/badge/%F0%9F%87%A7%F0%9F%87%B7-Portugu%C3%AAs%20(Brasil)-green.svg)](README.pt-BR.md)

Serviço local em Node.js que leva as decisões do JEV ao agente. Ele expõe as ferramentas MCP de decisão (`bin/master-jev-mcp.mjs`), atende as rotas HTTP do Master-JEV Hook, roteia a escolha de ferramentas de clientes LLM (Codex, Claude Code, OpenCode, Gemini) e serve um painel em `/dashboard`.

Visão geral, instalação e uso: [README principal](../README.pt-BR.md).

## 📋 Pré-requisitos

- Node.js 22.15 ou mais recente (`engines` em `package.json`).
- pnpm 10.33.3 (`packageManager` em `package.json`).

## 🧭 Uso

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm typecheck      # checagem de tipos
pnpm build          # compila para dist/ e copia o painel
pnpm test           # testes (vitest)
pnpm start          # sobe o gateway a partir de dist/
pnpm dev            # modo de desenvolvimento, recarrega ao salvar
pnpm smoke:install  # instalação empacotada (depois do build)
```

## 🎛️ Configuração

Variáveis de ambiente: veja [.env.example](.env.example). As variáveis principais, com os padrões, estão no [README principal](../README.pt-BR.md).

## 🧪 Testes

| Categoria | Testes |
| --- | --- |
| Gateway, TypeScript (`test/`, 25 arquivos) | 281 |

Contagens de `pnpm exec vitest list --json` em `gateway/`, no commit `b382309`, 2026-10-21. Só coleta; nenhum teste rodou.

## 📄 Licença

Apache License 2.0. Veja [LICENSE](../LICENSE) e [NOTICE](../NOTICE); o código originalmente derivado do jev-gateway, sob licença MIT, está descrito em [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
