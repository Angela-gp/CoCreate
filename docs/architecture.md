# CoCreate architecture

## Product surface

The web application is a single responsive working surface. It keeps the demo fast while preserving the key product domains: discovery, campaign detail, wallet connection, contribution, Creator Passes, creator setup and a public participation profile.

```text
Creator / supporter
        │
        ▼
React product UI ───── injected Solana wallet
        │                        │
        ├── campaign reads       ├── identity + approval
        ├── contribution flow    └── signed transaction
        └── pass + history
                 │
                 ▼
          CoCreate Anchor program
        ├── Campaign PDA (escrow)
        ├── Contribution PDA
        ├── ContentRecord PDA
        └── contribution events
                 │
          optional indexer/IPFS
```

## On-chain accounts

### Campaign

Seed: `campaign + creator + campaign_id`

Stores the creator, goal, raised amount, deadline, content fingerprint and lifecycle flags. The PDA owns campaign escrow until release or refund rules are met.

### Contribution

Seed: `contribution + campaign + supporter`

Stores each supporter’s cumulative contribution. A future pass-minting instruction can derive tier and metadata from this account without trusting an application database.

### ContentRecord

Seed: `content + creator + content_hash`

Anchors a SHA-256-style content fingerprint, registration time, metadata URI and license URI to the creator’s signature.

## Trust boundaries

- The wallet is non-custodial and must approve state-changing transactions.
- UI totals are presentational; program account balances and events are canonical.
- Off-chain media should be content-addressed. The chain stores fingerprints and URIs, not large files.
- Creator Pass media and perks may evolve, but eligibility must derive from the contribution account.
- The program must be audited before mainnet deployment.

## MVP versus production

| Capability | MVP | Production path |
| --- | --- | --- |
| Project discovery | Realistic local data | Indexed program accounts + moderation |
| Wallet connection | Injected wallet detection | Wallet Standard adapter set |
| Contribution UX | Safe simulated Devnet confirmation | Serialized Anchor instruction + confirmation polling |
| Escrow logic | Anchor source included | Deployed, audited program and upgrade policy |
| Creator Pass | Tiered demo artifact | Token-2022 / compressed NFT or soulbound receipt |
| Content rights | Hash registry instruction | IPFS metadata, licensing templates and dispute process |
