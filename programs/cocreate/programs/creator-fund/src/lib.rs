//! Creator Fund — эскроу-программа для краудфандинга контент-проектов.
//!
//! Логика полностью повторяет продуктовые правила из ТЗ:
//!   * блогер создаёт кампанию с целью и дедлайном;
//!   * аудитория вносит SOL или SPL-токен (USDC) — средства блокируются в PDA-хранилище;
//!   * цель достигнута  → `finalize` открывает выплату, `settle_*` распределяет
//!     средства между блогером, командой, партнёрами и платформой (комиссия 5%);
//!   * цель не достигнута к дедлайну → каждый участник сам забирает вклад через `refund_*`;
//!   * вклад выдаёт участнику Creator Pass (уровень) и вес голоса в голосованиях проекта.
//!
//! Все инструкции, меняющие деньги, permissionless в том смысле, что их может
//! вызвать любой: правила проверяет программа, а не оператор платформы.

use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer as SplTransfer};

declare_id!("99exy144EKNqoRWKn9S1Eu3AvySgPnwrbuSrX5zrxdsi");

pub const PLATFORM_SEED: &[u8] = b"platform";
pub const CAMPAIGN_SEED: &[u8] = b"campaign";
pub const VAULT_SEED: &[u8] = b"vault";
pub const CONTRIBUTION_SEED: &[u8] = b"contribution";
pub const PASS_SEED: &[u8] = b"pass";
pub const POLL_SEED: &[u8] = b"poll";
pub const VOTE_SEED: &[u8] = b"vote";

/// Максимум получателей выплаты (команда + партнёры), кроме самого блогера.
pub const MAX_PAYEES: usize = 6;
pub const MAX_OPTIONS: usize = 4;
pub const MAX_ID_LEN: usize = 32;
pub const MAX_URI_LEN: usize = 180;
pub const TIER_COUNT: usize = 4;

/// Вес голоса по уровню Pass: Supporter / Insider / Producer / Executive.
pub const VOTE_WEIGHTS: [u16; TIER_COUNT] = [0, 1, 3, 6];

/// Комиссия платформы по умолчанию — 5% (500 базисных пунктов).
pub const DEFAULT_FEE_BPS: u16 = 500;
/// Жёсткий предел комиссии: платформа не может поднять её выше 10%.
pub const MAX_FEE_BPS: u16 = 1_000;
pub const BPS_DENOMINATOR: u64 = 10_000;

#[program]
pub mod creator_fund {
    use super::*;

    /// Однократная инициализация платформы: адрес казны и размер комиссии.
    pub fn initialize_platform(ctx: Context<InitializePlatform>, fee_bps: u16) -> Result<()> {
        require!(fee_bps <= MAX_FEE_BPS, CreatorFundError::FeeTooHigh);
        let platform = &mut ctx.accounts.platform;
        platform.authority = ctx.accounts.authority.key();
        platform.treasury = ctx.accounts.treasury.key();
        platform.fee_bps = fee_bps;
        platform.campaign_count = 0;
        platform.bump = ctx.bumps.platform;
        Ok(())
    }

    pub fn set_fee(ctx: Context<SetFee>, fee_bps: u16) -> Result<()> {
        require!(fee_bps <= MAX_FEE_BPS, CreatorFundError::FeeTooHigh);
        ctx.accounts.platform.fee_bps = fee_bps;
        Ok(())
    }

    /// Кампания в нативном SOL. `vault` — системный PDA, который держит лампорты.
    pub fn create_campaign_native(
        ctx: Context<CreateCampaignNative>,
        args: CreateCampaignArgs,
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        args.validate(now)?;

        let campaign = &mut ctx.accounts.campaign;
        campaign.init(
            ctx.accounts.creator.key(),
            ctx.accounts.platform.key(),
            Currency::Native,
            &args,
            ctx.bumps.campaign,
            ctx.bumps.vault,
        )?;

        // PDA-хранилище должно остаться rent-exempt на всё время жизни кампании,
        // поэтому создатель сразу вносит неснижаемый остаток.
        let rent = Rent::get()?.minimum_balance(0);
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.creator.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            rent,
        )?;
        campaign.vault_reserve = rent;

        ctx.accounts.platform.campaign_count += 1;
        emit!(CampaignCreated {
            campaign: campaign.key(),
            creator: campaign.creator,
            goal_amount: campaign.goal_amount,
            deadline: campaign.deadline,
            currency_mint: None,
        });
        Ok(())
    }

    /// Кампания в SPL-токене (например, USDC). `vault_token` принадлежит PDA `vault`.
    pub fn create_campaign_spl(
        ctx: Context<CreateCampaignSpl>,
        args: CreateCampaignArgs,
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        args.validate(now)?;

        let campaign = &mut ctx.accounts.campaign;
        campaign.init(
            ctx.accounts.creator.key(),
            ctx.accounts.platform.key(),
            Currency::SplToken {
                mint: ctx.accounts.mint.key(),
            },
            &args,
            ctx.bumps.campaign,
            ctx.bumps.vault,
        )?;
        campaign.vault_reserve = 0;

        ctx.accounts.platform.campaign_count += 1;
        emit!(CampaignCreated {
            campaign: campaign.key(),
            creator: campaign.creator,
            goal_amount: campaign.goal_amount,
            deadline: campaign.deadline,
            currency_mint: Some(ctx.accounts.mint.key()),
        });
        Ok(())
    }

    /// Вклад в SOL: лампорты уходят в PDA-хранилище и учитываются в аккаунте вклада.
    pub fn contribute_native(ctx: Context<ContributeNative>, amount: u64) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let campaign = &mut ctx.accounts.campaign;
        campaign.assert_accepting(now)?;
        require!(amount > 0, CreatorFundError::AmountZero);
        require!(
            matches!(campaign.currency, Currency::Native),
            CreatorFundError::CurrencyMismatch
        );

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.backer.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            amount,
        )?;

        register_contribution(
            campaign,
            &mut ctx.accounts.contribution,
            &mut ctx.accounts.pass,
            ctx.accounts.backer.key(),
            amount,
            ctx.bumps.contribution,
            ctx.bumps.pass,
            now,
        )
    }

    /// Вклад в SPL-токене: перевод с токен-аккаунта участника в хранилище кампании.
    pub fn contribute_spl(ctx: Context<ContributeSpl>, amount: u64) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let campaign = &mut ctx.accounts.campaign;
        campaign.assert_accepting(now)?;
        require!(amount > 0, CreatorFundError::AmountZero);
        require!(
            campaign.currency_mint() == Some(ctx.accounts.mint.key()),
            CreatorFundError::CurrencyMismatch
        );

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                SplTransfer {
                    from: ctx.accounts.backer_token.to_account_info(),
                    to: ctx.accounts.vault_token.to_account_info(),
                    authority: ctx.accounts.backer.to_account_info(),
                },
            ),
            amount,
        )?;

        register_contribution(
            campaign,
            &mut ctx.accounts.contribution,
            &mut ctx.accounts.pass,
            ctx.accounts.backer.key(),
            amount,
            ctx.bumps.contribution,
            ctx.bumps.pass,
            now,
        )
    }

    /// Финализация: цель достигнута → Successful, срок истёк без цели → Failed.
    /// Вызвать может кто угодно — это «кранк», а не привилегия платформы.
    pub fn finalize(ctx: Context<Finalize>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let campaign = &mut ctx.accounts.campaign;
        require!(
            campaign.state == CampaignState::Funding,
            CreatorFundError::CampaignNotFunding
        );

        if campaign.raised_amount >= campaign.goal_amount {
            campaign.state = CampaignState::Successful;
        } else {
            require!(now >= campaign.deadline, CreatorFundError::DeadlineNotReached);
            campaign.state = CampaignState::Failed;
        }
        campaign.finalized_at = now;

        emit!(CampaignFinalized {
            campaign: campaign.key(),
            state: campaign.state,
            raised_amount: campaign.raised_amount,
        });
        Ok(())
    }

    /// Выплата успешной кампании в SOL.
    ///
    /// `remaining_accounts` — кошельки получателей ровно в том порядке, в котором
    /// они записаны в `campaign.payees`; программа сверяет каждый адрес.
    pub fn settle_native<'info>(
        ctx: Context<'_, '_, 'info, 'info, SettleNative<'info>>,
    ) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        require!(
            campaign.state == CampaignState::Successful,
            CreatorFundError::CampaignNotSuccessful
        );
        require!(
            matches!(campaign.currency, Currency::Native),
            CreatorFundError::CurrencyMismatch
        );
        require_keys_eq!(
            ctx.accounts.creator.key(),
            campaign.creator,
            CreatorFundError::CreatorMismatch
        );
        require_keys_eq!(
            ctx.accounts.treasury.key(),
            ctx.accounts.platform.treasury,
            CreatorFundError::TreasuryMismatch
        );

        let raised = campaign.raised_amount;
        let fee = split_fee(raised, ctx.accounts.platform.fee_bps)?;
        let net = raised.checked_sub(fee).ok_or(CreatorFundError::MathOverflow)?;

        let campaign_key = campaign.key();
        let vault_bump = campaign.vault_bump;
        let seeds: &[&[u8]] = &[VAULT_SEED, campaign_key.as_ref(), &[vault_bump]];

        if fee > 0 {
            transfer_from_vault(
                &ctx.accounts.vault,
                &ctx.accounts.treasury.to_account_info(),
                fee,
                &ctx.accounts.system_program,
                seeds,
            )?;
        }

        let mut distributed: u64 = 0;
        require!(
            ctx.remaining_accounts.len() == campaign.payees.len(),
            CreatorFundError::PayeeAccountsMismatch
        );
        for (i, payee) in campaign.payees.iter().enumerate() {
            let account = &ctx.remaining_accounts[i];
            require_keys_eq!(
                account.key(),
                payee.wallet,
                CreatorFundError::PayeeAccountsMismatch
            );
            let amount = share_of(net, payee.share_bps)?;
            if amount == 0 {
                continue;
            }
            transfer_from_vault(
                &ctx.accounts.vault,
                account,
                amount,
                &ctx.accounts.system_program,
                seeds,
            )?;
            distributed = distributed
                .checked_add(amount)
                .ok_or(CreatorFundError::MathOverflow)?;
        }

        // Остаток (в т.ч. копейки от округления долей) уходит автору проекта.
        let creator_amount = net
            .checked_sub(distributed)
            .ok_or(CreatorFundError::MathOverflow)?;
        if creator_amount > 0 {
            transfer_from_vault(
                &ctx.accounts.vault,
                &ctx.accounts.creator.to_account_info(),
                creator_amount,
                &ctx.accounts.system_program,
                seeds,
            )?;
        }

        campaign.state = CampaignState::Settled;
        campaign.paid_out_amount = net;
        campaign.fee_amount = fee;

        emit!(CampaignSettled {
            campaign: campaign_key,
            paid_out: net,
            fee,
        });
        Ok(())
    }

    /// Выплата успешной кампании в SPL-токене.
    pub fn settle_spl<'info>(
        ctx: Context<'_, '_, 'info, 'info, SettleSpl<'info>>,
    ) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        require!(
            campaign.state == CampaignState::Successful,
            CreatorFundError::CampaignNotSuccessful
        );
        require!(
            campaign.currency_mint() == Some(ctx.accounts.mint.key()),
            CreatorFundError::CurrencyMismatch
        );
        require_keys_eq!(
            ctx.accounts.treasury_token.owner,
            ctx.accounts.platform.treasury,
            CreatorFundError::TreasuryMismatch
        );

        let raised = campaign.raised_amount;
        let fee = split_fee(raised, ctx.accounts.platform.fee_bps)?;
        let net = raised.checked_sub(fee).ok_or(CreatorFundError::MathOverflow)?;

        let campaign_key = campaign.key();
        let vault_bump = campaign.vault_bump;
        let seeds: &[&[u8]] = &[VAULT_SEED, campaign_key.as_ref(), &[vault_bump]];
        let signer: &[&[&[u8]]] = &[seeds];

        if fee > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    SplTransfer {
                        from: ctx.accounts.vault_token.to_account_info(),
                        to: ctx.accounts.treasury_token.to_account_info(),
                        authority: ctx.accounts.vault.to_account_info(),
                    },
                    signer,
                ),
                fee,
            )?;
        }

        let mut distributed: u64 = 0;
        require!(
            ctx.remaining_accounts.len() == campaign.payees.len(),
            CreatorFundError::PayeeAccountsMismatch
        );
        for (i, payee) in campaign.payees.iter().enumerate() {
            let dest = &ctx.remaining_accounts[i];
            let parsed = Account::<TokenAccount>::try_from(dest)?;
            require_keys_eq!(
                parsed.owner,
                payee.wallet,
                CreatorFundError::PayeeAccountsMismatch
            );
            require_keys_eq!(
                parsed.mint,
                ctx.accounts.mint.key(),
                CreatorFundError::CurrencyMismatch
            );
            let amount = share_of(net, payee.share_bps)?;
            if amount == 0 {
                continue;
            }
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    SplTransfer {
                        from: ctx.accounts.vault_token.to_account_info(),
                        to: dest.clone(),
                        authority: ctx.accounts.vault.to_account_info(),
                    },
                    signer,
                ),
                amount,
            )?;
            distributed = distributed
                .checked_add(amount)
                .ok_or(CreatorFundError::MathOverflow)?;
        }

        let creator_amount = net
            .checked_sub(distributed)
            .ok_or(CreatorFundError::MathOverflow)?;
        if creator_amount > 0 {
            require_keys_eq!(
                ctx.accounts.creator_token.owner,
                campaign.creator,
                CreatorFundError::CreatorMismatch
            );
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    SplTransfer {
                        from: ctx.accounts.vault_token.to_account_info(),
                        to: ctx.accounts.creator_token.to_account_info(),
                        authority: ctx.accounts.vault.to_account_info(),
                    },
                    signer,
                ),
                creator_amount,
            )?;
        }

        campaign.state = CampaignState::Settled;
        campaign.paid_out_amount = net;
        campaign.fee_amount = fee;

        emit!(CampaignSettled {
            campaign: campaign_key,
            paid_out: net,
            fee,
        });
        Ok(())
    }

    /// Возврат вклада в SOL после неудачной кампании. Комиссия не берётся.
    pub fn refund_native(ctx: Context<RefundNative>) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        require!(
            campaign.state == CampaignState::Failed,
            CreatorFundError::RefundNotAvailable
        );
        require!(
            matches!(campaign.currency, Currency::Native),
            CreatorFundError::CurrencyMismatch
        );

        let contribution = &mut ctx.accounts.contribution;
        require!(!contribution.refunded, CreatorFundError::AlreadyRefunded);
        let amount = contribution.amount;
        require!(amount > 0, CreatorFundError::AmountZero);

        let campaign_key = campaign.key();
        let vault_bump = campaign.vault_bump;
        let seeds: &[&[u8]] = &[VAULT_SEED, campaign_key.as_ref(), &[vault_bump]];
        transfer_from_vault(
            &ctx.accounts.vault,
            &ctx.accounts.backer.to_account_info(),
            amount,
            &ctx.accounts.system_program,
            seeds,
        )?;

        contribution.refunded = true;
        campaign.refunded_amount = campaign
            .refunded_amount
            .checked_add(amount)
            .ok_or(CreatorFundError::MathOverflow)?;
        // Pass отзывается: участие в проекте не состоялось.
        ctx.accounts.pass.tier = 0;
        ctx.accounts.pass.total_contributed = 0;

        emit!(Refunded {
            campaign: campaign_key,
            backer: ctx.accounts.backer.key(),
            amount,
        });
        Ok(())
    }

    /// Возврат вклада в SPL-токене после неудачной кампании.
    pub fn refund_spl(ctx: Context<RefundSpl>) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        require!(
            campaign.state == CampaignState::Failed,
            CreatorFundError::RefundNotAvailable
        );
        require!(
            campaign.currency_mint() == Some(ctx.accounts.mint.key()),
            CreatorFundError::CurrencyMismatch
        );

        let contribution = &mut ctx.accounts.contribution;
        require!(!contribution.refunded, CreatorFundError::AlreadyRefunded);
        let amount = contribution.amount;
        require!(amount > 0, CreatorFundError::AmountZero);

        let campaign_key = campaign.key();
        let vault_bump = campaign.vault_bump;
        let seeds: &[&[u8]] = &[VAULT_SEED, campaign_key.as_ref(), &[vault_bump]];
        let signer: &[&[&[u8]]] = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                SplTransfer {
                    from: ctx.accounts.vault_token.to_account_info(),
                    to: ctx.accounts.backer_token.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        contribution.refunded = true;
        campaign.refunded_amount = campaign
            .refunded_amount
            .checked_add(amount)
            .ok_or(CreatorFundError::MathOverflow)?;
        ctx.accounts.pass.tier = 0;
        ctx.accounts.pass.total_contributed = 0;

        emit!(Refunded {
            campaign: campaign_key,
            backer: ctx.accounts.backer.key(),
            amount,
        });
        Ok(())
    }

    /// Голосование участников: автор публикует вопрос и варианты.
    pub fn create_poll(
        ctx: Context<CreatePoll>,
        poll_id: String,
        question: String,
        options: Vec<String>,
        min_tier: u8,
        closes_at: i64,
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        require!(poll_id.len() <= MAX_ID_LEN, CreatorFundError::StringTooLong);
        require!(question.len() <= MAX_URI_LEN, CreatorFundError::StringTooLong);
        require!(
            options.len() >= 2 && options.len() <= MAX_OPTIONS,
            CreatorFundError::InvalidOptions
        );
        require!(min_tier as usize <= TIER_COUNT, CreatorFundError::InvalidTier);
        require!(closes_at > now, CreatorFundError::InvalidDeadline);

        let poll = &mut ctx.accounts.poll;
        poll.campaign = ctx.accounts.campaign.key();
        poll.poll_id = poll_id;
        poll.question = question;
        poll.min_tier = min_tier;
        poll.closes_at = closes_at;
        poll.total_weight = 0;
        poll.bump = ctx.bumps.poll;
        poll.options = options
            .into_iter()
            .map(|label| PollOption {
                label,
                weight: 0,
                voters: 0,
            })
            .collect();
        Ok(())
    }

    /// Голос участника. Вес определяется уровнем Creator Pass.
    pub fn cast_vote(ctx: Context<CastVote>, option_index: u8) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let poll = &mut ctx.accounts.poll;
        require!(now < poll.closes_at, CreatorFundError::PollClosed);
        require!(
            (option_index as usize) < poll.options.len(),
            CreatorFundError::InvalidOptions
        );

        let pass = &ctx.accounts.pass;
        require!(pass.tier >= poll.min_tier, CreatorFundError::TierTooLow);
        require!(pass.tier > 0, CreatorFundError::TierTooLow);
        let weight = VOTE_WEIGHTS[(pass.tier - 1) as usize];
        require!(weight > 0, CreatorFundError::TierTooLow);

        let record = &mut ctx.accounts.vote_record;
        // Повторный голос переносит вес с прежнего варианта на новый.
        if record.weight > 0 {
            let prev = record.option_index as usize;
            let option = &mut poll.options[prev];
            option.weight = option.weight.saturating_sub(record.weight);
            option.voters = option.voters.saturating_sub(1);
            poll.total_weight = poll.total_weight.saturating_sub(record.weight as u64);
        } else {
            record.poll = poll.key();
            record.voter = ctx.accounts.voter.key();
            record.bump = ctx.bumps.vote_record;
        }

        let option = &mut poll.options[option_index as usize];
        option.weight = option
            .weight
            .checked_add(weight)
            .ok_or(CreatorFundError::MathOverflow)?;
        option.voters += 1;
        poll.total_weight = poll
            .total_weight
            .checked_add(weight as u64)
            .ok_or(CreatorFundError::MathOverflow)?;

        record.option_index = option_index;
        record.weight = weight;
        record.voted_at = now;

        emit!(VoteCast {
            poll: poll.key(),
            voter: record.voter,
            option_index,
            weight,
        });
        Ok(())
    }

    /// Автор может обновить только off-chain метаданные (описание, медиа).
    /// Цель, дедлайн и доли после публикации неизменяемы — это правила эскроу.
    pub fn update_metadata(ctx: Context<UpdateMetadata>, metadata_uri: String) -> Result<()> {
        require!(
            metadata_uri.len() <= MAX_URI_LEN,
            CreatorFundError::StringTooLong
        );
        ctx.accounts.campaign.metadata_uri = metadata_uri;
        Ok(())
    }
}

/* ------------------------------------------------------------------ helpers */

fn register_contribution<'info>(
    campaign: &mut Account<'info, Campaign>,
    contribution: &mut Account<'info, Contribution>,
    pass: &mut Account<'info, CreatorPass>,
    backer: Pubkey,
    amount: u64,
    contribution_bump: u8,
    pass_bump: u8,
    now: i64,
) -> Result<()> {
    if contribution.backer == Pubkey::default() {
        contribution.campaign = campaign.key();
        contribution.backer = backer;
        contribution.bump = contribution_bump;
        contribution.created_at = now;
        campaign.backers_count += 1;
    }
    require!(!contribution.refunded, CreatorFundError::AlreadyRefunded);

    contribution.amount = contribution
        .amount
        .checked_add(amount)
        .ok_or(CreatorFundError::MathOverflow)?;
    contribution.updated_at = now;

    campaign.raised_amount = campaign
        .raised_amount
        .checked_add(amount)
        .ok_or(CreatorFundError::MathOverflow)?;

    if pass.owner == Pubkey::default() {
        pass.campaign = campaign.key();
        pass.owner = backer;
        pass.issued_at = now;
        pass.bump = pass_bump;
    }
    pass.total_contributed = contribution.amount;
    pass.tier = campaign.tier_for(contribution.amount);

    emit!(ContributionMade {
        campaign: campaign.key(),
        backer,
        amount,
        total: contribution.amount,
        tier: pass.tier,
    });
    Ok(())
}

/// Перевод из системного PDA-хранилища с подписью seeds самого хранилища.
fn transfer_from_vault<'info>(
    vault: &SystemAccount<'info>,
    to: &AccountInfo<'info>,
    amount: u64,
    system_program: &Program<'info, System>,
    seeds: &[&[u8]],
) -> Result<()> {
    let available = vault
        .to_account_info()
        .lamports()
        .saturating_sub(Rent::get()?.minimum_balance(0));
    require!(available >= amount, CreatorFundError::InsufficientVault);

    system_program::transfer(
        CpiContext::new_with_signer(
            system_program.to_account_info(),
            system_program::Transfer {
                from: vault.to_account_info(),
                to: to.clone(),
            },
            &[seeds],
        ),
        amount,
    )
}

fn split_fee(amount: u64, fee_bps: u16) -> Result<u64> {
    Ok((amount as u128)
        .checked_mul(fee_bps as u128)
        .ok_or(CreatorFundError::MathOverflow)?
        .checked_div(BPS_DENOMINATOR as u128)
        .ok_or(CreatorFundError::MathOverflow)? as u64)
}

fn share_of(net: u64, share_bps: u16) -> Result<u64> {
    Ok((net as u128)
        .checked_mul(share_bps as u128)
        .ok_or(CreatorFundError::MathOverflow)?
        .checked_div(BPS_DENOMINATOR as u128)
        .ok_or(CreatorFundError::MathOverflow)? as u64)
}

/* ------------------------------------------------------------------- state */

#[account]
#[derive(InitSpace)]
pub struct Platform {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub fee_bps: u16,
    pub campaign_count: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum Currency {
    Native,
    SplToken { mint: Pubkey },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum CampaignState {
    /// Идёт сбор, средства заблокированы.
    Funding,
    /// Цель достигнута — доступна выплата.
    Successful,
    /// Выплата исполнена.
    Settled,
    /// Цель не достигнута — доступен возврат.
    Failed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct Payee {
    pub wallet: Pubkey,
    /// Доля от суммы после комиссии платформы, в базисных пунктах.
    pub share_bps: u16,
}

#[account]
#[derive(InitSpace)]
pub struct Campaign {
    pub creator: Pubkey,
    pub platform: Pubkey,
    #[max_len(MAX_ID_LEN)]
    pub campaign_id: String,
    #[max_len(MAX_URI_LEN)]
    pub metadata_uri: String,
    pub currency: Currency,
    pub goal_amount: u64,
    pub raised_amount: u64,
    pub paid_out_amount: u64,
    pub refunded_amount: u64,
    pub fee_amount: u64,
    pub vault_reserve: u64,
    pub deadline: i64,
    pub finalized_at: i64,
    pub backers_count: u32,
    pub state: CampaignState,
    /// Пороги уровней Pass в базовых единицах валюты кампании.
    pub tier_thresholds: [u64; TIER_COUNT],
    #[max_len(MAX_PAYEES)]
    pub payees: Vec<Payee>,
    pub bump: u8,
    pub vault_bump: u8,
}

impl Campaign {
    fn init(
        &mut self,
        creator: Pubkey,
        platform: Pubkey,
        currency: Currency,
        args: &CreateCampaignArgs,
        bump: u8,
        vault_bump: u8,
    ) -> Result<()> {
        self.creator = creator;
        self.platform = platform;
        self.campaign_id = args.campaign_id.clone();
        self.metadata_uri = args.metadata_uri.clone();
        self.currency = currency;
        self.goal_amount = args.goal_amount;
        self.raised_amount = 0;
        self.paid_out_amount = 0;
        self.refunded_amount = 0;
        self.fee_amount = 0;
        self.deadline = args.deadline;
        self.finalized_at = 0;
        self.backers_count = 0;
        self.state = CampaignState::Funding;
        self.tier_thresholds = args.tier_thresholds;
        self.payees = args.payees.clone();
        self.bump = bump;
        self.vault_bump = vault_bump;
        Ok(())
    }

    fn assert_accepting(&self, now: i64) -> Result<()> {
        require!(
            self.state == CampaignState::Funding,
            CreatorFundError::CampaignNotFunding
        );
        require!(now < self.deadline, CreatorFundError::CampaignExpired);
        Ok(())
    }

    fn currency_mint(&self) -> Option<Pubkey> {
        match self.currency {
            Currency::SplToken { mint } => Some(mint),
            Currency::Native => None,
        }
    }

    /// Уровень Pass: 0 — нет уровня, далее 1..4 по порогам кампании.
    fn tier_for(&self, total: u64) -> u8 {
        let mut tier = 0u8;
        for (i, threshold) in self.tier_thresholds.iter().enumerate() {
            if *threshold > 0 && total >= *threshold {
                tier = (i + 1) as u8;
            }
        }
        tier
    }
}

#[account]
#[derive(InitSpace)]
pub struct Contribution {
    pub campaign: Pubkey,
    pub backer: Pubkey,
    pub amount: u64,
    pub created_at: i64,
    pub updated_at: i64,
    pub refunded: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct CreatorPass {
    pub campaign: Pubkey,
    pub owner: Pubkey,
    pub total_contributed: u64,
    pub issued_at: i64,
    /// 0 — нет уровня, 1 Supporter, 2 Insider, 3 Producer, 4 Executive.
    pub tier: u8,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct PollOption {
    #[max_len(48)]
    pub label: String,
    pub weight: u16,
    pub voters: u16,
}

#[account]
#[derive(InitSpace)]
pub struct Poll {
    pub campaign: Pubkey,
    #[max_len(MAX_ID_LEN)]
    pub poll_id: String,
    #[max_len(MAX_URI_LEN)]
    pub question: String,
    #[max_len(MAX_OPTIONS)]
    pub options: Vec<PollOption>,
    pub min_tier: u8,
    pub closes_at: i64,
    pub total_weight: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct VoteRecord {
    pub poll: Pubkey,
    pub voter: Pubkey,
    pub option_index: u8,
    pub weight: u16,
    pub voted_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateCampaignArgs {
    pub campaign_id: String,
    pub metadata_uri: String,
    pub goal_amount: u64,
    pub deadline: i64,
    pub tier_thresholds: [u64; TIER_COUNT],
    pub payees: Vec<Payee>,
}

impl CreateCampaignArgs {
    fn validate(&self, now: i64) -> Result<()> {
        require!(
            !self.campaign_id.is_empty() && self.campaign_id.len() <= MAX_ID_LEN,
            CreatorFundError::StringTooLong
        );
        require!(
            self.metadata_uri.len() <= MAX_URI_LEN,
            CreatorFundError::StringTooLong
        );
        require!(self.goal_amount > 0, CreatorFundError::AmountZero);
        require!(self.deadline > now, CreatorFundError::InvalidDeadline);
        require!(
            self.payees.len() <= MAX_PAYEES,
            CreatorFundError::TooManyPayees
        );
        let total: u32 = self.payees.iter().map(|p| p.share_bps as u32).sum();
        // Автору должно остаться хотя бы 5% суммы после комиссии платформы.
        require!(total <= 9_500, CreatorFundError::SharesTooHigh);
        let mut prev = 0u64;
        for threshold in self.tier_thresholds.iter() {
            require!(*threshold >= prev, CreatorFundError::InvalidTier);
            prev = *threshold;
        }
        Ok(())
    }
}

/* ------------------------------------------------------------------ events */

#[event]
pub struct CampaignCreated {
    pub campaign: Pubkey,
    pub creator: Pubkey,
    pub goal_amount: u64,
    pub deadline: i64,
    pub currency_mint: Option<Pubkey>,
}

#[event]
pub struct ContributionMade {
    pub campaign: Pubkey,
    pub backer: Pubkey,
    pub amount: u64,
    pub total: u64,
    pub tier: u8,
}

#[event]
pub struct CampaignFinalized {
    pub campaign: Pubkey,
    pub state: CampaignState,
    pub raised_amount: u64,
}

#[event]
pub struct CampaignSettled {
    pub campaign: Pubkey,
    pub paid_out: u64,
    pub fee: u64,
}

#[event]
pub struct Refunded {
    pub campaign: Pubkey,
    pub backer: Pubkey,
    pub amount: u64,
}

#[event]
pub struct VoteCast {
    pub poll: Pubkey,
    pub voter: Pubkey,
    pub option_index: u8,
    pub weight: u16,
}

/* ---------------------------------------------------------------- contexts */

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Platform::INIT_SPACE,
        seeds = [PLATFORM_SEED],
        bump
    )]
    pub platform: Account<'info, Platform>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: адрес казны платформы, произвольный кошелёк
    pub treasury: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetFee<'info> {
    #[account(
        mut,
        seeds = [PLATFORM_SEED],
        bump = platform.bump,
        has_one = authority
    )]
    pub platform: Account<'info, Platform>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(args: CreateCampaignArgs)]
pub struct CreateCampaignNative<'info> {
    #[account(mut, seeds = [PLATFORM_SEED], bump = platform.bump)]
    pub platform: Account<'info, Platform>,
    #[account(
        init,
        payer = creator,
        space = 8 + Campaign::INIT_SPACE,
        seeds = [CAMPAIGN_SEED, creator.key().as_ref(), args.campaign_id.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(
        mut,
        seeds = [VAULT_SEED, campaign.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(args: CreateCampaignArgs)]
pub struct CreateCampaignSpl<'info> {
    #[account(mut, seeds = [PLATFORM_SEED], bump = platform.bump)]
    pub platform: Account<'info, Platform>,
    #[account(
        init,
        payer = creator,
        space = 8 + Campaign::INIT_SPACE,
        seeds = [CAMPAIGN_SEED, creator.key().as_ref(), args.campaign_id.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(seeds = [VAULT_SEED, campaign.key().as_ref()], bump)]
    pub vault: SystemAccount<'info>,
    #[account(
        init,
        payer = creator,
        token::mint = mint,
        token::authority = vault
    )]
    pub vault_token: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ContributeNative<'info> {
    #[account(mut, seeds = [CAMPAIGN_SEED, campaign.creator.as_ref(), campaign.campaign_id.as_bytes()], bump = campaign.bump)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut, seeds = [VAULT_SEED, campaign.key().as_ref()], bump = campaign.vault_bump)]
    pub vault: SystemAccount<'info>,
    #[account(
        init_if_needed,
        payer = backer,
        space = 8 + Contribution::INIT_SPACE,
        seeds = [CONTRIBUTION_SEED, campaign.key().as_ref(), backer.key().as_ref()],
        bump
    )]
    pub contribution: Account<'info, Contribution>,
    #[account(
        init_if_needed,
        payer = backer,
        space = 8 + CreatorPass::INIT_SPACE,
        seeds = [PASS_SEED, campaign.key().as_ref(), backer.key().as_ref()],
        bump
    )]
    pub pass: Account<'info, CreatorPass>,
    #[account(mut)]
    pub backer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ContributeSpl<'info> {
    #[account(mut, seeds = [CAMPAIGN_SEED, campaign.creator.as_ref(), campaign.campaign_id.as_bytes()], bump = campaign.bump)]
    pub campaign: Account<'info, Campaign>,
    #[account(seeds = [VAULT_SEED, campaign.key().as_ref()], bump = campaign.vault_bump)]
    pub vault: SystemAccount<'info>,
    #[account(mut, token::mint = mint, token::authority = vault)]
    pub vault_token: Account<'info, TokenAccount>,
    #[account(mut, token::mint = mint, token::authority = backer)]
    pub backer_token: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = backer,
        space = 8 + Contribution::INIT_SPACE,
        seeds = [CONTRIBUTION_SEED, campaign.key().as_ref(), backer.key().as_ref()],
        bump
    )]
    pub contribution: Account<'info, Contribution>,
    #[account(
        init_if_needed,
        payer = backer,
        space = 8 + CreatorPass::INIT_SPACE,
        seeds = [PASS_SEED, campaign.key().as_ref(), backer.key().as_ref()],
        bump
    )]
    pub pass: Account<'info, CreatorPass>,
    #[account(mut)]
    pub backer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Finalize<'info> {
    #[account(mut, seeds = [CAMPAIGN_SEED, campaign.creator.as_ref(), campaign.campaign_id.as_bytes()], bump = campaign.bump)]
    pub campaign: Account<'info, Campaign>,
    /// Кранк может вызвать любой кошелёк.
    pub cranker: Signer<'info>,
}

#[derive(Accounts)]
pub struct SettleNative<'info> {
    #[account(seeds = [PLATFORM_SEED], bump = platform.bump)]
    pub platform: Account<'info, Platform>,
    #[account(mut, seeds = [CAMPAIGN_SEED, campaign.creator.as_ref(), campaign.campaign_id.as_bytes()], bump = campaign.bump)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut, seeds = [VAULT_SEED, campaign.key().as_ref()], bump = campaign.vault_bump)]
    pub vault: SystemAccount<'info>,
    /// CHECK: сверяется с campaign.creator
    #[account(mut)]
    pub creator: UncheckedAccount<'info>,
    /// CHECK: сверяется с platform.treasury
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,
    pub cranker: Signer<'info>,
    pub system_program: Program<'info, System>,
    // remaining_accounts: кошельки получателей в порядке campaign.payees
}

#[derive(Accounts)]
pub struct SettleSpl<'info> {
    #[account(seeds = [PLATFORM_SEED], bump = platform.bump)]
    pub platform: Account<'info, Platform>,
    #[account(mut, seeds = [CAMPAIGN_SEED, campaign.creator.as_ref(), campaign.campaign_id.as_bytes()], bump = campaign.bump)]
    pub campaign: Account<'info, Campaign>,
    #[account(seeds = [VAULT_SEED, campaign.key().as_ref()], bump = campaign.vault_bump)]
    pub vault: SystemAccount<'info>,
    #[account(mut, token::mint = mint, token::authority = vault)]
    pub vault_token: Account<'info, TokenAccount>,
    #[account(mut, token::mint = mint)]
    pub creator_token: Account<'info, TokenAccount>,
    #[account(mut, token::mint = mint)]
    pub treasury_token: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    pub cranker: Signer<'info>,
    pub token_program: Program<'info, Token>,
    // remaining_accounts: токен-аккаунты получателей в порядке campaign.payees
}

#[derive(Accounts)]
pub struct RefundNative<'info> {
    #[account(mut, seeds = [CAMPAIGN_SEED, campaign.creator.as_ref(), campaign.campaign_id.as_bytes()], bump = campaign.bump)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut, seeds = [VAULT_SEED, campaign.key().as_ref()], bump = campaign.vault_bump)]
    pub vault: SystemAccount<'info>,
    #[account(
        mut,
        seeds = [CONTRIBUTION_SEED, campaign.key().as_ref(), backer.key().as_ref()],
        bump = contribution.bump,
        has_one = backer
    )]
    pub contribution: Account<'info, Contribution>,
    #[account(
        mut,
        seeds = [PASS_SEED, campaign.key().as_ref(), backer.key().as_ref()],
        bump = pass.bump
    )]
    pub pass: Account<'info, CreatorPass>,
    #[account(mut)]
    pub backer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RefundSpl<'info> {
    #[account(mut, seeds = [CAMPAIGN_SEED, campaign.creator.as_ref(), campaign.campaign_id.as_bytes()], bump = campaign.bump)]
    pub campaign: Account<'info, Campaign>,
    #[account(seeds = [VAULT_SEED, campaign.key().as_ref()], bump = campaign.vault_bump)]
    pub vault: SystemAccount<'info>,
    #[account(mut, token::mint = mint, token::authority = vault)]
    pub vault_token: Account<'info, TokenAccount>,
    #[account(mut, token::mint = mint, token::authority = backer)]
    pub backer_token: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        seeds = [CONTRIBUTION_SEED, campaign.key().as_ref(), backer.key().as_ref()],
        bump = contribution.bump,
        has_one = backer
    )]
    pub contribution: Account<'info, Contribution>,
    #[account(
        mut,
        seeds = [PASS_SEED, campaign.key().as_ref(), backer.key().as_ref()],
        bump = pass.bump
    )]
    pub pass: Account<'info, CreatorPass>,
    #[account(mut)]
    pub backer: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(poll_id: String)]
pub struct CreatePoll<'info> {
    #[account(
        seeds = [CAMPAIGN_SEED, campaign.creator.as_ref(), campaign.campaign_id.as_bytes()],
        bump = campaign.bump,
        has_one = creator
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(
        init,
        payer = creator,
        space = 8 + Poll::INIT_SPACE,
        seeds = [POLL_SEED, campaign.key().as_ref(), poll_id.as_bytes()],
        bump
    )]
    pub poll: Account<'info, Poll>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(seeds = [CAMPAIGN_SEED, campaign.creator.as_ref(), campaign.campaign_id.as_bytes()], bump = campaign.bump)]
    pub campaign: Account<'info, Campaign>,
    #[account(
        mut,
        seeds = [POLL_SEED, campaign.key().as_ref(), poll.poll_id.as_bytes()],
        bump = poll.bump,
        constraint = poll.campaign == campaign.key() @ CreatorFundError::PollCampaignMismatch
    )]
    pub poll: Account<'info, Poll>,
    #[account(
        seeds = [PASS_SEED, campaign.key().as_ref(), voter.key().as_ref()],
        bump = pass.bump,
        constraint = pass.owner == voter.key() @ CreatorFundError::TierTooLow
    )]
    pub pass: Account<'info, CreatorPass>,
    #[account(
        init_if_needed,
        payer = voter,
        space = 8 + VoteRecord::INIT_SPACE,
        seeds = [VOTE_SEED, poll.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,
    #[account(mut)]
    pub voter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateMetadata<'info> {
    #[account(
        mut,
        seeds = [CAMPAIGN_SEED, campaign.creator.as_ref(), campaign.campaign_id.as_bytes()],
        bump = campaign.bump,
        has_one = creator
    )]
    pub campaign: Account<'info, Campaign>,
    pub creator: Signer<'info>,
}

/* ------------------------------------------------------------------ errors */

#[error_code]
pub enum CreatorFundError {
    #[msg("Комиссия платформы выше допустимого предела")]
    FeeTooHigh,
    #[msg("Сумма должна быть больше нуля")]
    AmountZero,
    #[msg("Дедлайн должен быть в будущем")]
    InvalidDeadline,
    #[msg("Строка превышает допустимую длину")]
    StringTooLong,
    #[msg("Слишком много получателей выплаты")]
    TooManyPayees,
    #[msg("Сумма долей получателей слишком велика")]
    SharesTooHigh,
    #[msg("Пороги уровней должны возрастать")]
    InvalidTier,
    #[msg("Кампания не в состоянии сбора средств")]
    CampaignNotFunding,
    #[msg("Срок кампании истёк")]
    CampaignExpired,
    #[msg("Дедлайн ещё не наступил")]
    DeadlineNotReached,
    #[msg("Кампания не в состоянии успешного сбора")]
    CampaignNotSuccessful,
    #[msg("Возврат средств недоступен")]
    RefundNotAvailable,
    #[msg("Вклад уже возвращён")]
    AlreadyRefunded,
    #[msg("Валюта кампании не совпадает с переданной")]
    CurrencyMismatch,
    #[msg("Недостаточно средств в хранилище кампании")]
    InsufficientVault,
    #[msg("Список получателей не совпадает с аккаунтами транзакции")]
    PayeeAccountsMismatch,
    #[msg("Адрес автора не совпадает с кампанией")]
    CreatorMismatch,
    #[msg("Адрес казны не совпадает с платформой")]
    TreasuryMismatch,
    #[msg("Некорректный набор вариантов голосования")]
    InvalidOptions,
    #[msg("Голосование закрыто")]
    PollClosed,
    #[msg("Голосование относится к другой кампании")]
    PollCampaignMismatch,
    #[msg("Уровень Creator Pass не даёт права голоса")]
    TierTooLow,
    #[msg("Арифметическое переполнение")]
    MathOverflow,
}
