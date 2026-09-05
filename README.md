# Creator Fund

Creator Fund — краудфандинговая платформа для авторов на Solana. Средства кампании учитываются через escrow-модель, участники получают Creator Pass и голосуют за развитие проекта с весом, зависящим от уровня Pass.

[Сайт](https://cocreate-demo.gelya-privalova.chatgpt.site) · [Архитектура](docs/architecture.md) · [Сценарий показа](docs/product.md) · [Anchor-программа](programs/cocreate/programs/creator-fund/src/lib.rs)

## Что работает

- Phantom, Backpack и Solflare через Wallet Standard;
- локальный демо-кошелёк и переключение Demo / Devnet;
- подпись и отправка реальных Devnet-транзакций, ссылки на Solana Explorer;
- запрос тестового SOL через airdrop;
- кампании в SOL и USDC;
- успешная кампания: выплата с комиссией платформы 5%;
- неуспешная кампания: возврат участникам;
- четыре уровня Creator Pass и голосование с разным весом;
- локальная история транзакций, кабинет автора и кабинет участника;
- создание новой кампании через пошаговую форму.

## Блокчейн

Anchor-программа является главным источником правил движения денег. Она содержит инструкции:

| Инструкция | Назначение |
| --- | --- |
| `initialize_platform` | Создать настройки платформы и комиссию |
| `create_campaign_native` / `create_campaign_spl` | Создать SOL- или SPL-кампанию |
| `contribute_native` / `contribute_spl` | Заблокировать вклад в PDA escrow |
| `finalize` | Зафиксировать успех или неуспех после достижения цели/дедлайна |
| `settle_native` / `settle_spl` | Распределить успешный сбор и удержать 5% |
| `refund_native` / `refund_spl` | Вернуть вклад при неуспешной кампании |
| `create_poll` / `cast_vote` | Создать голосование и записать взвешенный голос |

PDA: `Platform`, `Campaign`, `Vault`, `Contribution`, `CreatorPass`, `Poll`, `VoteRecord`.

Program ID: `99exy144EKNqoRWKn9S1Eu3AvySgPnwrbuSrX5zrxdsi`.

Важно: исходники и интеграционные тесты программы находятся в репозитории, но эта версия программы ещё не развернута в Devnet. Поэтому текущий режим Devnet действительно просит подпись кошелька и отправляет SOL/SPL-транзакцию с memo, а продуктовые состояния дополнительно показывает клиентский ledger. Перед mainnet нужны деплой Anchor-программы, подключение frontend к её инструкциям и аудит.

## Структура

Верхнеуровневая архитектура исходного репозитория сохранена:

```text
frontend/                         React/Vite сайт и интеграция кошельков
programs/cocreate/                Anchor workspace
  programs/creator-fund/          Solana-программа
  tests/                          Anchor-интеграционные тесты
backend/                          место для индексатора/API
docs/                             архитектура, сценарий и roadmap
tests/                            тесты клиентской модели
assets/                           материалы проекта
scripts/                          вспомогательные сценарии
```

Android-обёртка Rustem не переносилась: существующая папка `frontend/android` сохранена как технический ориентир. Приватный `program-keypair.json`, `node_modules` и готовые сборки в Git не добавляются.

## Запуск сайта

```bash
cd frontend
npm ci
npm run dev
```

Проверка и production-сборка:

```bash
npm run typecheck
npm run test:model
npm run build
npm run preview
```

Необязательный RPC задаётся через `VITE_SOLANA_RPC_URL`; пример находится в `.env.example`.

## Проверка Anchor-программы

Нужны Rust, Solana CLI, Anchor 0.30.1 и Yarn:

```bash
cd programs/cocreate
yarn install
anchor build
anchor test
```

## Стек

React 18, TypeScript, Vite, Zustand, Solana Wallet Adapter/Wallet Standard, `@solana/web3.js`, SPL Token, Rust и Anchor 0.30.1.
