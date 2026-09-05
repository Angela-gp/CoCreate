use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWxTWqkZB2BeZ7FEfcYkgMQhgV6a");

#[program]
pub mod cocreate {
    use super::*;

    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        campaign_id: u64,
        goal_lamports: u64,
        deadline: i64,
        content_hash: [u8; 32],
    ) -> Result<()> {
        require!(goal_lamports > 0, CreatorFundError::InvalidGoal);
        require!(deadline > Clock::get()?.unix_timestamp, CreatorFundError::InvalidDeadline);

        let campaign = &mut ctx.accounts.campaign;
        campaign.creator = ctx.accounts.creator.key();
        campaign.campaign_id = campaign_id;
        campaign.goal_lamports = goal_lamports;
        campaign.raised_lamports = 0;
        campaign.deadline = deadline;
        campaign.content_hash = content_hash;
        campaign.released = false;
        campaign.bump = ctx.bumps.campaign;
        Ok(())
    }

    pub fn contribute(ctx: Context<Contribute>, amount_lamports: u64) -> Result<()> {
        require!(amount_lamports > 0, CreatorFundError::InvalidAmount);
        require!(Clock::get()?.unix_timestamp < ctx.accounts.campaign.deadline, CreatorFundError::CampaignClosed);
        require!(!ctx.accounts.campaign.released, CreatorFundError::CampaignClosed);

        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.supporter.to_account_info(),
                    to: ctx.accounts.campaign.to_account_info(),
                },
            ),
            amount_lamports,
        )?;

        let contribution = &mut ctx.accounts.contribution;
        contribution.campaign = ctx.accounts.campaign.key();
        contribution.supporter = ctx.accounts.supporter.key();
        contribution.amount_lamports = contribution
            .amount_lamports
            .checked_add(amount_lamports)
            .ok_or(CreatorFundError::MathOverflow)?;
        contribution.bump = ctx.bumps.contribution;

        let campaign = &mut ctx.accounts.campaign;
        campaign.raised_lamports = campaign
            .raised_lamports
            .checked_add(amount_lamports)
            .ok_or(CreatorFundError::MathOverflow)?;
        emit!(ContributionRecorded {
            campaign: campaign.key(),
            supporter: ctx.accounts.supporter.key(),
            amount_lamports,
            total_raised: campaign.raised_lamports,
        });
        Ok(())
    }

    pub fn release_funds(ctx: Context<ReleaseFunds>) -> Result<()> {
        let campaign = &ctx.accounts.campaign;
        let goal_reached = campaign.raised_lamports >= campaign.goal_lamports;
        let deadline_passed = Clock::get()?.unix_timestamp >= campaign.deadline;
        require!(goal_reached || deadline_passed, CreatorFundError::CampaignStillActive);
        require!(goal_reached, CreatorFundError::GoalNotReached);
        Ok(())
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        require!(Clock::get()?.unix_timestamp >= campaign.deadline, CreatorFundError::CampaignStillActive);
        require!(campaign.raised_lamports < campaign.goal_lamports, CreatorFundError::GoalAlreadyReached);
        require!(ctx.accounts.contribution.amount_lamports > 0, CreatorFundError::NothingToRefund);

        let amount = ctx.accounts.contribution.amount_lamports;
        **campaign.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.supporter.to_account_info().try_borrow_mut_lamports()? += amount;
        campaign.raised_lamports = campaign.raised_lamports.saturating_sub(amount);
        ctx.accounts.contribution.amount_lamports = 0;
        Ok(())
    }

    pub fn register_content(
        ctx: Context<RegisterContent>,
        content_hash: [u8; 32],
        metadata_uri: String,
        license_uri: String,
    ) -> Result<()> {
        require!(metadata_uri.len() <= 160, CreatorFundError::UriTooLong);
        require!(license_uri.len() <= 160, CreatorFundError::UriTooLong);
        let record = &mut ctx.accounts.content_record;
        record.creator = ctx.accounts.creator.key();
        record.content_hash = content_hash;
        record.registered_at = Clock::get()?.unix_timestamp;
        record.metadata_uri = metadata_uri;
        record.license_uri = license_uri;
        record.bump = ctx.bumps.content_record;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(campaign_id: u64)]
pub struct CreateCampaign<'info> {
    #[account(mut)] pub creator: Signer<'info>,
    #[account(init, payer = creator, space = 8 + Campaign::INIT_SPACE, seeds = [b"campaign", creator.key().as_ref(), &campaign_id.to_le_bytes()], bump)]
    pub campaign: Account<'info, Campaign>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Contribute<'info> {
    #[account(mut)] pub supporter: Signer<'info>,
    #[account(mut, seeds = [b"campaign", campaign.creator.as_ref(), &campaign.campaign_id.to_le_bytes()], bump = campaign.bump)]
    pub campaign: Account<'info, Campaign>,
    #[account(init_if_needed, payer = supporter, space = 8 + Contribution::INIT_SPACE, seeds = [b"contribution", campaign.key().as_ref(), supporter.key().as_ref()], bump)]
    pub contribution: Account<'info, Contribution>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReleaseFunds<'info> {
    #[account(mut)] pub creator: Signer<'info>,
    #[account(mut, has_one = creator, close = creator, seeds = [b"campaign", creator.key().as_ref(), &campaign.campaign_id.to_le_bytes()], bump = campaign.bump)]
    pub campaign: Account<'info, Campaign>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)] pub supporter: Signer<'info>,
    #[account(mut, seeds = [b"campaign", campaign.creator.as_ref(), &campaign.campaign_id.to_le_bytes()], bump = campaign.bump)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut, close = supporter, has_one = supporter, has_one = campaign, seeds = [b"contribution", campaign.key().as_ref(), supporter.key().as_ref()], bump = contribution.bump)]
    pub contribution: Account<'info, Contribution>,
}

#[derive(Accounts)]
#[instruction(content_hash: [u8; 32])]
pub struct RegisterContent<'info> {
    #[account(mut)] pub creator: Signer<'info>,
    #[account(init, payer = creator, space = 8 + ContentRecord::INIT_SPACE, seeds = [b"content", creator.key().as_ref(), content_hash.as_ref()], bump)]
    pub content_record: Account<'info, ContentRecord>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Campaign {
    pub creator: Pubkey,
    pub campaign_id: u64,
    pub goal_lamports: u64,
    pub raised_lamports: u64,
    pub deadline: i64,
    pub content_hash: [u8; 32],
    pub released: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Contribution {
    pub campaign: Pubkey,
    pub supporter: Pubkey,
    pub amount_lamports: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ContentRecord {
    pub creator: Pubkey,
    pub content_hash: [u8; 32],
    pub registered_at: i64,
    #[max_len(160)] pub metadata_uri: String,
    #[max_len(160)] pub license_uri: String,
    pub bump: u8,
}

#[event]
pub struct ContributionRecorded {
    pub campaign: Pubkey,
    pub supporter: Pubkey,
    pub amount_lamports: u64,
    pub total_raised: u64,
}

#[error_code]
pub enum CreatorFundError {
    #[msg("The funding goal must be greater than zero.")] InvalidGoal,
    #[msg("The campaign deadline must be in the future.")] InvalidDeadline,
    #[msg("The contribution amount must be greater than zero.")] InvalidAmount,
    #[msg("The campaign is closed.")] CampaignClosed,
    #[msg("The campaign is still active.")] CampaignStillActive,
    #[msg("The campaign goal has not been reached.")] GoalNotReached,
    #[msg("The campaign goal has already been reached.")] GoalAlreadyReached,
    #[msg("There is nothing to refund.")] NothingToRefund,
    #[msg("Arithmetic overflow.")] MathOverflow,
    #[msg("Metadata URI is too long.")] UriTooLong,
}
