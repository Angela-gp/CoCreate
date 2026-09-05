# CoCreate

> A Solana-powered platform where creators fund original work, supporters earn meaningful access, and authorship stays verifiable.

[Live demo](https://cocreate-demo.gelya-privalova.chatgpt.site) · [Architecture](docs/architecture.md) · [Solana program](programs/cocreate/src/lib.rs)

## The problem

The creative economy is growing, but early-stage creators still lack one place to finance ambitious work, build a committed audience and protect ownership. Traditional donations are disconnected from the finished project, while blockchain products often expose users to wallet, token and fee complexity before they understand the value.

## The solution

CoCreate turns a contribution into participation:

1. A creator publishes a campaign with a funding goal, deadline and content fingerprint.
2. Supporters contribute SOL to program-controlled escrow.
3. Their contribution level unlocks a Creator Pass with access, voting or credit benefits.
4. When the goal is reached, funds can be released to the creator; unsuccessful campaigns remain refundable.
5. Content hashes and license metadata can be registered on Solana as durable evidence of authorship.

## Demo flow

- Explore realistic music, film and digital-art campaigns.
- Open a project and choose 5, 20, 50 or 100 SOL.
- Connect an injected Solana wallet such as Phantom, or continue with the safe demo wallet.
- Confirm the simulated Devnet contribution.
- Receive a tiered Creator Pass and inspect participation history.

The hosted demo never asks for mainnet funds. Wallet detection is real; transaction finalization is intentionally simulated until a deployed program ID and treasury policy are supplied.

## Why Solana

- Fast settlement keeps support flows close to familiar checkout experiences.
- Low fees make small contributions viable.
- Program-derived accounts provide transparent campaign escrow.
- Public content fingerprints and contribution events make authorship and funding auditable.
- The same wallet carries identity, access and proof of participation across the ecosystem.

## Creator Pass tiers

| Tier | Contribution | Core access |
| --- | ---: | --- |
| Supporter | 5 SOL | Backstage feed |
| Insider | 20 SOL | Backstage feed and community votes |
| Producer | 50 SOL | Credits and private releases |
| Executive | 100 SOL | Closed sessions and event invitations |

## Repository layout

```text
.
├── .github/workflows/ci.yml     # Automated web + program checks
├── assets/
│   ├── .gitkeep
│   └── project.jpg              # Project presentation preview
├── backend/src/index.ts         # Indexed campaign read model
├── docs/
│   ├── api.md
│   ├── architecture.md
│   ├── product.md
│   └── roadmap.md
├── frontend/src/
│   ├── App.tsx                  # Interactive product demo
│   └── index.tsx
├── programs/cocreate/src/lib.rs # Anchor escrow and authorship program
├── scripts/deploy.ts            # Guarded Devnet deployment helper
├── tests/                       # Product-model tests
├── app/                         # Vinext route + visual system
├── .env.example
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

## Run locally

Requirements: Node.js 22+ and npm.

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

Production validation:

```bash
npm run typecheck
npm run build
```

## Solana program

The Anchor program implements deterministic campaign accounts, SOL escrow, tracked contributor receipts, goal-based creator release, deadline-based refunds, immutable content fingerprints and contribution events.

Before a real deployment, generate a dedicated program keypair, replace the example program ID in `declare_id!`, `Anchor.toml` and `.env`, then complete an independent security review.

## Tech stack

- React 19, TypeScript and Vinext
- Tailwind CSS and accessible Shadcn primitives
- Solana + Anchor smart contract workspace
- Cloudflare-compatible OpenAI Sites deployment

## Business model

CoCreate takes a 5% fee only from successfully completed campaigns. There are no hidden user fees in the product model.

## Status

Hackathon MVP. The interface and demo journey are complete; the Anchor program is included for Devnet deployment and audit. Mainnet use is out of scope until the contract, pass-minting policy and legal terms have been reviewed.

## Team

- Adelina Myazova — Founder
- Angelina Evgenievna — Developer

## License

MIT
