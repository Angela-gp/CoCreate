# CoCreate API

CoCreate’s canonical write API is the Anchor program. The web demo intentionally avoids a private database dependency; production reads can be served by any Solana indexer using the events and account layouts below.

## Program instructions

### `create_campaign`

Creates a deterministic campaign PDA from `creator + campaign_id`.

Inputs: `campaign_id`, `goal_lamports`, `deadline`, `content_hash`.

### `contribute`

Transfers lamports from a supporter into the campaign PDA through a system-program CPI, updates the supporter contribution PDA and emits `ContributionRecorded`.

Input: `amount_lamports`.

### `release_funds`

Allows the creator to close a funded campaign after the goal or deadline condition is satisfied. Closing the PDA transfers its balance to the creator.

### `refund`

Returns a supporter’s tracked amount after an unsuccessful campaign deadline and closes the contribution receipt.

### `register_content`

Creates a content record PDA controlled by the creator’s signature.

Inputs: `content_hash`, `metadata_uri`, `license_uri`.

## Indexed read model

The backend module converts raw contribution events into JSON-friendly records:

```ts
{
  campaign: string;
  supporter: string;
  amountSol: number;
  totalRaisedSol: number;
  passTier: 'Supporter' | 'Insider' | 'Producer' | 'Executive';
  signature: string;
}
```

## WebMCP action

The frontend exposes `start_project_support` in browsers that implement `document.modelContext`. It stages the visible support flow with `projectId` and `amountSol`; it never confirms a wallet transaction on the user’s behalf.

