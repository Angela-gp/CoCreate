import { PublicKey } from '@solana/web3.js'

/** Program ID программы creator_fund (см. program/programs/creator-fund/src/lib.rs). */
export const PROGRAM_ID = new PublicKey('99exy144EKNqoRWKn9S1Eu3AvySgPnwrbuSrX5zrxdsi')

/** Devnet USDC (SPL) — используется, когда кампания принимает USDC on-chain. */
export const USDC_DEVNET = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')

const enc = (s: string) => new TextEncoder().encode(s)

export const platformPda = () => PublicKey.findProgramAddressSync([enc('platform')], PROGRAM_ID)[0]

/** PDA кампании: seeds = ["campaign", creator, campaign_id]. */
export function campaignPda(creator: PublicKey, campaignId: string) {
  return PublicKey.findProgramAddressSync(
    [enc('campaign'), creator.toBytes(), enc(campaignId).slice(0, 32)],
    PROGRAM_ID,
  )[0]
}

/** PDA хранилища средств кампании: seeds = ["vault", campaign]. */
export function vaultPda(campaign: PublicKey) {
  return PublicKey.findProgramAddressSync([enc('vault'), campaign.toBytes()], PROGRAM_ID)[0]
}

/** PDA вклада участника: seeds = ["contribution", campaign, backer]. */
export function contributionPda(campaign: PublicKey, backer: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [enc('contribution'), campaign.toBytes(), backer.toBytes()],
    PROGRAM_ID,
  )[0]
}

/** Детерминированное хранилище проекта в devnet-режиме — по строковому id проекта. */
export function devnetVaultFor(projectId: string) {
  return PublicKey.findProgramAddressSync(
    [enc('vault'), enc(projectId).slice(0, 32)],
    PROGRAM_ID,
  )[0]
}

export const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
