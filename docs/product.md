# Product specification

## Purpose

CoCreate helps independent creators turn early supporters into participants while keeping campaign funding and authorship evidence verifiable on Solana.

## Audiences

- Creators publish projects, define a goal and offer meaningful access.
- Supporters discover work, contribute SOL and receive Creator Passes.
- Production teams get a transparent financing and payout layer.
- Brand partners can discover aligned projects and verify support.

## Core journey

1. Discover a campaign.
2. Understand the creator, goal, deadline and current progress.
3. Choose an amount and preview the resulting Creator Pass.
4. Choose the built-in demo wallet or a compatible Wallet Standard wallet.
5. Simulate the contribution safely or approve a Devnet proof transaction.
6. View the pass and on-chain participation history.

## Funding policy

- Campaign contributions are denominated in SOL.
- Funds are held by a campaign PDA until the campaign outcome is known.
- A successful campaign can release funds to its creator.
- A campaign that misses its goal enables supporter refunds after its deadline.
- CoCreate’s planned platform fee is 5% of successfully completed campaigns.

## Demo safety

The presentation build never connects to mainnet. Demo mode runs entirely in the browser and requests no wallet approval. Devnet mode supports Phantom, Solflare, Backpack and other Wallet Standard wallets. It submits a real memo transaction as public proof, but keeps the displayed campaign amount in the demo ledger until the escrow program is deployed and audited.

## Демонстрация за 2 минуты

Перед выступлением откройте сайт и убедитесь, что в левом блоке выбран режим **Demo**. Это самый надёжный сценарий: расширение кошелька и интернет-транзакция не понадобятся.

### 0:00–0:20 — проблема и главная идея

Покажите стартовый экран **Discover**.

Скажите: «CoCreate помогает авторам собирать финансирование на проекты. Поддержка превращается не просто в донат: участник получает Creator Pass, доступ к материалам и подтверждаемую историю участия».

### 0:20–0:40 — прозрачная кампания

Нажмите **View story** у проекта **Neon Echoes**.

Скажите: «У каждой кампании видны автор, цель, уже собранная сумма и срок. В рабочей версии средства контролируются программой Solana: успешный сбор разрешает выплату, а неуспешный — возврат».

Закройте карточку или сразу нажмите **Support with SOL**.

### 0:40–1:05 — кошелёк

Если кошелёк ещё не подключён, нажмите **Connect wallet to continue**, затем **Demo wallet**.

Скажите: «Для презентации есть безопасный демо-кошелёк. В Devnet можно подключить Phantom, Solflare, Backpack или другой Wallet Standard кошелёк. Сервис не хранит секретную фразу и не может подписать операцию за пользователя».

### 1:05–1:30 — вклад и Creator Pass

Выберите **20 SOL**. Покажите блок **Insider Pass** и нажмите **Confirm 20 SOL**.

Скажите: «Размер вклада определяет уровень Pass. Сейчас правила escrow применяются в безопасном симуляторе, поэтому реальные средства не списываются».

Дождитесь экрана успеха.

### 1:30–1:50 — результат

Нажмите **View my passes**.

Скажите: «Creator Pass сохраняет уровень участия и будущие привилегии: backstage, голосования, титры или закрытые релизы. Ниже хранится история вкладов».

### 1:50–2:00 — техническое завершение

Скажите: «CoCreate объединяет привычный интерфейс, некастодиальные Solana-кошельки, прозрачный escrow и проверяемое авторство. Demo показывает весь путь безопасно, а Devnet позволяет подтвердить реальную подпись в Solana Explorer».

### Если попросят показать настоящую Solana-транзакцию

1. Откройте раздел **Wallet**.
2. Подключите установленный Phantom, Solflare или Backpack.
3. Переключите режим на **Devnet**.
4. При необходимости нажмите **Airdrop 1 SOL**.
5. Поддержите проект и подтвердите запрос в кошельке.
6. На экране успеха нажмите **View transaction** — откроется Solana Explorer.

Не используйте этот дополнительный сценарий внутри основных двух минут: подтверждение кошелька и публичный Devnet RPC могут задержаться.
