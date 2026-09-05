export type CampaignState = {
  campaignId: number;
  creator: string;
  goalLamports: bigint;
  raisedLamports: bigint;
  deadlineUnix: number;
};

export type ContributionEvent = {
  campaign: string;
  supporter: string;
  amountLamports: bigint;
  totalRaised: bigint;
  signature: string;
};

export type PassTier = 'Supporter' | 'Insider' | 'Producer' | 'Executive';

export function passTierForLamports(lamports: bigint): PassTier {
  const sol = lamports / 1_000_000_000n;
  if (sol >= 100n) return 'Executive';
  if (sol >= 50n) return 'Producer';
  if (sol >= 20n) return 'Insider';
  return 'Supporter';
}

export function campaignProgress(campaign: CampaignState): number {
  if (campaign.goalLamports <= 0n) return 0;
  return Math.min(100, Number((campaign.raisedLamports * 10_000n) / campaign.goalLamports) / 100);
}

export function normalizeContribution(event: ContributionEvent) {
  return {
    campaign: event.campaign,
    supporter: event.supporter,
    amountSol: Number(event.amountLamports) / 1_000_000_000,
    totalRaisedSol: Number(event.totalRaised) / 1_000_000_000,
    passTier: passTierForLamports(event.amountLamports),
    signature: event.signature,
  };
}

