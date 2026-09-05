/** Domain model. Mirrors the on-chain accounts of the `creator_fund` Anchor program
 *  (see ../../program/programs/creator-fund/src/lib.rs). */

export type Currency = 'USDC' | 'SOL'

export type TierKey = 'supporter' | 'insider' | 'producer' | 'executive'

/** Campaign lifecycle — identical to `CampaignState` in the Solana program. */
export type CampaignState =
  | 'live' // средства блокируются в смарт-контракте
  | 'successful' // цель достигнута, ждёт выплаты
  | 'claimed' // средства переведены блогеру и команде
  | 'failed' // цель не достигнута — доступен возврат
  | 'refunded' // все возвраты выполнены

export type ProjectCategory = 'film' | 'series' | 'music' | 'game' | 'podcast' | 'education' | 'merch'

export type ArtScene = 'mountains' | 'city' | 'studio' | 'space' | 'stage' | 'desert' | 'code'

export interface Creator {
  handle: string
  name: string
  wallet: string
  avatarHue: number
  followers: number
  verified: boolean
  bio?: string
}

export interface TeamMember {
  name: string
  role: string
  /** доля от собранных средств после комиссии платформы, в базисных пунктах (10000 = 100%) */
  shareBps: number
  wallet: string
}

export interface PollOption {
  id: string
  label: string
  hint?: string
}

export interface Poll {
  id: string
  question: string
  options: PollOption[]
  /** минимальный уровень Pass для участия */
  minTier: TierKey
  closesAt: string
  closed?: boolean
}

export interface BackstagePost {
  id: string
  title: string
  body: string
  minTier: TierKey
  publishedAt: string
  kind: 'update' | 'video' | 'photo' | 'call'
}

export interface MerchItem {
  id: string
  title: string
  priceUsd: number
  kind: 'digital' | 'physical'
  emoji: string
  minTier?: TierKey
  stock?: number
}

export interface Project {
  id: string
  slug: string
  title: string
  tagline: string
  description: string
  category: ProjectCategory
  art: ArtScene
  creator: Creator
  goalUsd: number
  /** сколько уже заблокировано в смарт-контракте (пересчитывается из вкладов) */
  seedRaisedUsd: number
  seedBackers: number
  currency: Currency
  createdAt: string
  deadline: string
  state: CampaignState
  vault: string
  campaignPda: string
  team: TeamMember[]
  partners: { name: string; shareBps: number; wallet: string }[]
  polls: Poll[]
  backstage: BackstagePost[]
  merch: MerchItem[]
  milestones: { label: string; pct: number }[]
  featured?: boolean
}

export interface Contribution {
  id: string
  projectId: string
  wallet: string
  amountUsd: number
  currency: Currency
  tier: TierKey | null
  createdAt: string
  signature: string
  refunded?: boolean
  anonymous?: boolean
}

export interface CreatorPass {
  id: string
  projectId: string
  projectTitle: string
  wallet: string
  tier: TierKey
  mint: string
  contributedUsd: number
  issuedAt: string
  signature: string
}

export type TxKind =
  | 'create_campaign'
  | 'contribute'
  | 'mint_pass'
  | 'finalize'
  | 'claim_funds'
  | 'payout'
  | 'refund'
  | 'vote'
  | 'message'
  | 'merch'
  | 'platform_fee'
  | 'airdrop'

export interface OnchainTx {
  signature: string
  kind: TxKind
  projectId?: string
  wallet: string
  amountUsd?: number
  currency?: Currency
  slot: number
  ts: string
  memo?: string
  cluster: ClusterId
  real?: boolean
}

export interface Vote {
  id: string
  pollId: string
  projectId: string
  wallet: string
  optionId: string
  weight: number
  createdAt: string
  signature: string
}

export interface PaidMessage {
  id: string
  projectId: string
  wallet: string
  handle: string
  text: string
  amountUsd: number
  createdAt: string
  signature: string
  tier: TierKey | null
}

export interface MerchOrder {
  id: string
  projectId: string
  itemId: string
  wallet: string
  amountUsd: number
  createdAt: string
  signature: string
}

export type ClusterId = 'simnet' | 'devnet'

export interface TxStep {
  label: string
  status: 'pending' | 'active' | 'done' | 'error'
}
