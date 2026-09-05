# Contributing to CoCreate

## Local setup

1. Install Node.js 22 or newer.
2. Run `cd frontend`.
3. Run `npm ci`.
4. Start the product with `npm run dev`.

## Before a pull request

Run:

```bash
npm run test:model
npm run typecheck
npm run build
cd ..
cargo check --manifest-path programs/cocreate/Cargo.toml
```

Keep contributions focused. Product changes should update the relevant file in `docs/`; smart-contract changes must include tests and a short security rationale.

## Safety

Do not add private keys, seed phrases, mainnet treasury addresses or production RPC credentials. The checked-in `.env.example` contains public Devnet configuration only.
