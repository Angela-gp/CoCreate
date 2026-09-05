/**
 * Интеграционные тесты программы creator_fund: полный жизненный цикл кампании,
 * выплата с комиссией платформы, возврат средств и голосование по уровню Pass.
 *
 * Запуск: anchor test  (нужны Rust, Solana CLI и Anchor 0.30.1)
 */
import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from '@solana/web3.js'
import { assert } from 'chai'
import type { CreatorFund } from '../target/types/creator_fund'

const enc = (s: string) => Buffer.from(s, 'utf8')
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('creator_fund', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const program = anchor.workspace.CreatorFund as Program<CreatorFund>
  const connection = provider.connection

  const authority = (provider.wallet as anchor.Wallet).payer
  const treasury = Keypair.generate()
  const creator = Keypair.generate()
  const teammate = Keypair.generate()
  const backerA = Keypair.generate()
  const backerB = Keypair.generate()

  const platformPda = PublicKey.findProgramAddressSync([enc('platform')], program.programId)[0]

  const TIERS: anchor.BN[] = [
    new anchor.BN(0.05 * LAMPORTS_PER_SOL), // Supporter
    new anchor.BN(0.2 * LAMPORTS_PER_SOL), // Insider
    new anchor.BN(0.5 * LAMPORTS_PER_SOL), // Producer
    new anchor.BN(1 * LAMPORTS_PER_SOL), // Executive
  ]

  const campaignPda = (creatorKey: PublicKey, id: string) =>
    PublicKey.findProgramAddressSync([enc('campaign'), creatorKey.toBuffer(), enc(id)], program.programId)[0]
  const vaultPda = (campaign: PublicKey) =>
    PublicKey.findProgramAddressSync([enc('vault'), campaign.toBuffer()], program.programId)[0]
  const contributionPda = (campaign: PublicKey, backer: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [enc('contribution'), campaign.toBuffer(), backer.toBuffer()],
      program.programId,
    )[0]
  const passPda = (campaign: PublicKey, owner: PublicKey) =>
    PublicKey.findProgramAddressSync([enc('pass'), campaign.toBuffer(), owner.toBuffer()], program.programId)[0]
  const pollPda = (campaign: PublicKey, pollId: string) =>
    PublicKey.findProgramAddressSync([enc('poll'), campaign.toBuffer(), enc(pollId)], program.programId)[0]

  const fund = async (to: PublicKey, sol: number) => {
    const sig = await connection.requestAirdrop(to, sol * LAMPORTS_PER_SOL)
    const bh = await connection.getLatestBlockhash()
    await connection.confirmTransaction({ signature: sig, ...bh })
  }

  before(async () => {
    await Promise.all([fund(creator.publicKey, 5), fund(backerA.publicKey, 5), fund(backerB.publicKey, 5)])
  })

  it('инициализирует платформу с комиссией 5%', async () => {
    await program.methods
      .initializePlatform(500)
      .accounts({
        platform: platformPda,
        authority: authority.publicKey,
        treasury: treasury.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    const platform = await program.account.platform.fetch(platformPda)
    assert.equal(platform.feeBps, 500)
    assert.ok(platform.treasury.equals(treasury.publicKey))
  })

  it('проводит успешную кампанию: сбор → финализация → выплата', async () => {
    const id = 'uzb-film'
    const campaign = campaignPda(creator.publicKey, id)
    const vault = vaultPda(campaign)
    const goal = new anchor.BN(1.5 * LAMPORTS_PER_SOL)
    const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 3600)

    await program.methods
      .createCampaignNative({
        campaignId: id,
        metadataUri: 'https://creator.fund/p/uzb-film',
        goalAmount: goal,
        deadline,
        tierThresholds: TIERS,
        // 15% оператору съёмки, остальное автору
        payees: [{ wallet: teammate.publicKey, shareBps: 1500 }],
      })
      .accounts({
        platform: platformPda,
        campaign,
        vault,
        creator: creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc()

    // Вклад 1 SOL → уровень Executive (4), вклад 0.2 SOL → Insider (2)
    for (const [backer, amount] of [
      [backerA, 1],
      [backerB, 0.2],
    ] as const) {
      await program.methods
        .contributeNative(new anchor.BN(amount * LAMPORTS_PER_SOL))
        .accounts({
          campaign,
          vault,
          contribution: contributionPda(campaign, backer.publicKey),
          pass: passPda(campaign, backer.publicKey),
          backer: backer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([backer])
        .rpc()
    }

    assert.equal((await program.account.creatorPass.fetch(passPda(campaign, backerA.publicKey))).tier, 4)
    assert.equal((await program.account.creatorPass.fetch(passPda(campaign, backerB.publicKey))).tier, 2)

    // Цель ещё не достигнута — финализация должна упасть
    try {
      await program.methods
        .finalize()
        .accounts({ campaign, cranker: authority.publicKey })
        .rpc()
      assert.fail('финализация не должна проходить до достижения цели')
    } catch (e) {
      assert.include((e as Error).toString(), 'DeadlineNotReached')
    }

    // Добираем цель: ещё 0.4 SOL от backerB (итого 1.6 SOL ≥ 1.5)
    await program.methods
      .contributeNative(new anchor.BN(0.4 * LAMPORTS_PER_SOL))
      .accounts({
        campaign,
        vault,
        contribution: contributionPda(campaign, backerB.publicKey),
        pass: passPda(campaign, backerB.publicKey),
        backer: backerB.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([backerB])
      .rpc()

    // Доплата подняла уровень: 0.6 SOL → Producer (3)
    assert.equal((await program.account.creatorPass.fetch(passPda(campaign, backerB.publicKey))).tier, 3)

    await program.methods.finalize().accounts({ campaign, cranker: authority.publicKey }).rpc()
    let state = await program.account.campaign.fetch(campaign)
    assert.ok(state.state.successful !== undefined)
    assert.equal(state.backersCount, 2)

    const before = {
      creator: await connection.getBalance(creator.publicKey),
      teammate: await connection.getBalance(teammate.publicKey),
      treasury: await connection.getBalance(treasury.publicKey),
    }

    await program.methods
      .settleNative()
      .accounts({
        platform: platformPda,
        campaign,
        vault,
        creator: creator.publicKey,
        treasury: treasury.publicKey,
        cranker: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts([{ pubkey: teammate.publicKey, isWritable: true, isSigner: false }])
      .rpc()

    const raised = 1.6 * LAMPORTS_PER_SOL
    const fee = raised * 0.05
    const net = raised - fee
    const teammateShare = net * 0.15

    const after = {
      creator: await connection.getBalance(creator.publicKey),
      teammate: await connection.getBalance(teammate.publicKey),
      treasury: await connection.getBalance(treasury.publicKey),
    }

    assert.equal(after.treasury - before.treasury, fee, 'платформа получает ровно 5%')
    assert.equal(after.teammate - before.teammate, teammateShare, 'команда получает свою долю')
    assert.equal(after.creator - before.creator, net - teammateShare, 'остальное уходит автору')

    state = await program.account.campaign.fetch(campaign)
    assert.ok(state.state.settled !== undefined)
    assert.equal(state.feeAmount.toNumber(), fee)
  })

  it('возвращает средства, если цель не достигнута к дедлайну', async () => {
    const id = 'merch-drop'
    const campaign = campaignPda(creator.publicKey, id)
    const vault = vaultPda(campaign)

    await program.methods
      .createCampaignNative({
        campaignId: id,
        metadataUri: 'https://creator.fund/p/merch-drop',
        goalAmount: new anchor.BN(10 * LAMPORTS_PER_SOL),
        deadline: new anchor.BN(Math.floor(Date.now() / 1000) + 3),
        tierThresholds: TIERS,
        payees: [],
      })
      .accounts({
        platform: platformPda,
        campaign,
        vault,
        creator: creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc()

    const amount = 0.5 * LAMPORTS_PER_SOL
    await program.methods
      .contributeNative(new anchor.BN(amount))
      .accounts({
        campaign,
        vault,
        contribution: contributionPda(campaign, backerA.publicKey),
        pass: passPda(campaign, backerA.publicKey),
        backer: backerA.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([backerA])
      .rpc()

    await sleep(4000)
    await program.methods.finalize().accounts({ campaign, cranker: authority.publicKey }).rpc()
    assert.ok((await program.account.campaign.fetch(campaign)).state.failed !== undefined)

    const before = await connection.getBalance(backerA.publicKey)
    await program.methods
      .refundNative()
      .accounts({
        campaign,
        vault,
        contribution: contributionPda(campaign, backerA.publicKey),
        pass: passPda(campaign, backerA.publicKey),
        backer: backerA.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([backerA])
      .rpc()

    const after = await connection.getBalance(backerA.publicKey)
    assert.isAtLeast(after - before, amount - 10_000, 'вклад возвращается полностью, без комиссии')
    assert.equal((await program.account.creatorPass.fetch(passPda(campaign, backerA.publicKey))).tier, 0)

    // Повторный возврат невозможен
    try {
      await program.methods
        .refundNative()
        .accounts({
          campaign,
          vault,
          contribution: contributionPda(campaign, backerA.publicKey),
          pass: passPda(campaign, backerA.publicKey),
          backer: backerA.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([backerA])
        .rpc()
      assert.fail('двойной возврат должен быть запрещён')
    } catch (e) {
      assert.include((e as Error).toString(), 'AlreadyRefunded')
    }
  })

  it('учитывает вес голоса по уровню Creator Pass', async () => {
    const id = 'poll-campaign'
    const campaign = campaignPda(creator.publicKey, id)
    const vault = vaultPda(campaign)
    const pollId = 'location'

    await program.methods
      .createCampaignNative({
        campaignId: id,
        metadataUri: 'https://creator.fund/p/poll-campaign',
        goalAmount: new anchor.BN(50 * LAMPORTS_PER_SOL),
        deadline: new anchor.BN(Math.floor(Date.now() / 1000) + 3600),
        tierThresholds: TIERS,
        payees: [],
      })
      .accounts({
        platform: platformPda,
        campaign,
        vault,
        creator: creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc()

    // backerA → Executive (вес 6), backerB → Supporter (вес 0, голосовать нельзя)
    await program.methods
      .contributeNative(new anchor.BN(1 * LAMPORTS_PER_SOL))
      .accounts({
        campaign,
        vault,
        contribution: contributionPda(campaign, backerA.publicKey),
        pass: passPda(campaign, backerA.publicKey),
        backer: backerA.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([backerA])
      .rpc()
    await program.methods
      .contributeNative(new anchor.BN(0.05 * LAMPORTS_PER_SOL))
      .accounts({
        campaign,
        vault,
        contribution: contributionPda(campaign, backerB.publicKey),
        pass: passPda(campaign, backerB.publicKey),
        backer: backerB.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([backerB])
      .rpc()

    const poll = pollPda(campaign, pollId)
    await program.methods
      .createPoll(
        pollId,
        'Выберите локацию для следующей серии',
        ['Самарканд', 'Бухара', 'Ташкент'],
        2, // от Insider
        new anchor.BN(Math.floor(Date.now() / 1000) + 3600),
      )
      .accounts({ campaign, poll, creator: creator.publicKey, systemProgram: SystemProgram.programId })
      .signers([creator])
      .rpc()

    const voteRecord = (voter: PublicKey) =>
      PublicKey.findProgramAddressSync([enc('vote'), poll.toBuffer(), voter.toBuffer()], program.programId)[0]

    await program.methods
      .castVote(1)
      .accounts({
        campaign,
        poll,
        pass: passPda(campaign, backerA.publicKey),
        voteRecord: voteRecord(backerA.publicKey),
        voter: backerA.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([backerA])
      .rpc()

    let pollState = await program.account.poll.fetch(poll)
    assert.equal(pollState.options[1].weight, 6, 'Executive голосует с весом 6')
    assert.equal(pollState.totalWeight.toNumber(), 6)

    // Смена голоса переносит вес
    await program.methods
      .castVote(0)
      .accounts({
        campaign,
        poll,
        pass: passPda(campaign, backerA.publicKey),
        voteRecord: voteRecord(backerA.publicKey),
        voter: backerA.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([backerA])
      .rpc()

    pollState = await program.account.poll.fetch(poll)
    assert.equal(pollState.options[1].weight, 0)
    assert.equal(pollState.options[0].weight, 6)
    assert.equal(pollState.totalWeight.toNumber(), 6, 'общий вес не удваивается при смене голоса')

    // Supporter не имеет права голоса
    try {
      await program.methods
        .castVote(2)
        .accounts({
          campaign,
          poll,
          pass: passPda(campaign, backerB.publicKey),
          voteRecord: voteRecord(backerB.publicKey),
          voter: backerB.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([backerB])
        .rpc()
      assert.fail('Supporter не должен голосовать')
    } catch (e) {
      assert.include((e as Error).toString(), 'TierTooLow')
    }
  })
})
