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
4. Connect a compatible Solana wallet.
5. Approve a Devnet contribution.
6. View the pass and on-chain participation history.

## Funding policy

- Campaign contributions are denominated in SOL.
- Funds are held by a campaign PDA until the campaign outcome is known.
- A successful campaign can release funds to its creator.
- A campaign that misses its goal enables supporter refunds after its deadline.
- CoCreate’s planned platform fee is 5% of successfully completed campaigns.

## Demo safety

The presentation build detects an injected wallet but simulates transaction finalization. It is labeled Devnet throughout and never requests mainnet funds.

