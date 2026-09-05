'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight, Bell, Check, ChevronRight, CircleCheck, Compass, Copy,
  ExternalLink, Film, Flame, Globe, Lock, Menu, MessageCircle, Music,
  Palette, Plus, Search, Shield, Sparkles, Star, Ticket, User, Wallet,
  X, Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

type Project = {
  id: number; title: string; creator: string; initials: string; category: string;
  description: string; raised: number; goal: number; supporters: number; days: number;
  accent: string; icon: typeof Music; featured?: boolean;
};

const projects: Project[] = [
  { id: 1, title: 'Neon Echoes', creator: 'Maya Nova', initials: 'MN', category: 'Music', description: 'A visual album where every track unlocks a new fragment of the story.', raised: 742, goal: 950, supporters: 184, days: 12, accent: 'from-[#8b5cf6] via-[#6d5dfc] to-[#10d9c4]', icon: Music, featured: true },
  { id: 2, title: 'The Last Lighthouse', creator: 'Artem Ray', initials: 'AR', category: 'Film', description: 'An atmospheric short film about memory, water and finding home.', raised: 420, goal: 800, supporters: 96, days: 21, accent: 'from-[#13b8ff] via-[#2256ff] to-[#6e43ff]', icon: Film },
  { id: 3, title: 'Synthetic Garden', creator: 'Lina Vale', initials: 'LV', category: 'Digital art', description: 'A living collection shaped by the choices of its supporters.', raised: 288, goal: 500, supporters: 73, days: 8, accent: 'from-[#12d6a0] via-[#08b8c7] to-[#1e6cff]', icon: Palette },
];

const passes = [
  { name: 'Supporter', amount: 5, color: '#9b6cff', perks: ['Backstage feed'] },
  { name: 'Insider', amount: 20, color: '#28d3ee', perks: ['Backstage feed', 'Community votes'] },
  { name: 'Producer', amount: 50, color: '#f15bf7', perks: ['Everything in Insider', 'Credits', 'Private releases'] },
  { name: 'Executive', amount: 100, color: '#30e7b2', perks: ['Everything in Producer', 'Closed sessions', 'Event invite'] },
];

function Brand() {
  return <div className="brand" aria-label="CoCreate"><span className="brand-mark" aria-hidden="true"><i/><i/><i/></span><span><b>CO</b><em>CREATE</em></span></div>;
}

function SolanaBadge() {
  return <span className="solana-badge"><span className="solana-mini" aria-hidden="true"><i/><i/><i/></span>Solana devnet</span>;
}

export default function HomePage() {
  const [active, setActive] = useState('Discover');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<Project | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletLabel, setWalletLabel] = useState('Connect wallet');
  const [fundOpen, setFundOpen] = useState(false);
  const [amount, setAmount] = useState(20);
  const [fundStep, setFundStep] = useState<'choose' | 'confirm' | 'success'>('choose');
  const [mobileNav, setMobileNav] = useState(false);

  const visibleProjects = useMemo(() => category === 'All' ? projects : projects.filter((project) => project.category === category), [category]);
  const currentPass = [...passes].reverse().find((pass) => amount >= pass.amount) ?? passes[0];

  useEffect(() => {
    const context = (document as Document & {
      modelContext?: {
        registerTool: (tool: {
          name: string; title: string; description: string; inputSchema: object;
          execute: (input: unknown) => unknown; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
        }, options: { signal: AbortSignal }) => void | Promise<void>;
      };
    }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tool = {
      name: 'start_project_support',
      title: 'Start project support',
      description: 'Open the Solana contribution flow for a CoCreate project and preselect an amount in SOL. This stages the contribution but does not submit a transaction.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'number', enum: projects.map((project) => project.id) },
          amountSol: { type: 'number', minimum: 1, maximum: 10000 },
        },
        required: ['projectId', 'amountSol'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const value = input as { projectId?: number; amountSol?: number };
        const project = projects.find((item) => item.id === value.projectId);
        if (!project || typeof value.amountSol !== 'number' || value.amountSol < 1 || value.amountSol > 10000) {
          throw new Error('A valid projectId and amountSol between 1 and 10000 are required.');
        }
        setSelected(project);
        setAmount(value.amountSol);
        setFundStep('choose');
        setFundOpen(true);
        return { status: 'staged', project: project.title, amountSol: value.amountSol, nextAction: 'wallet_confirmation_required' };
      },
    };
    try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined); } catch { /* Unsupported preview contexts may throw synchronously. */ }
    return () => lifecycle.abort();
  }, []);

  async function connectWallet() {
    const provider = (window as Window & { solana?: { connect: () => Promise<{ publicKey?: { toString(): string } }> } }).solana;
    if (provider) {
      try {
        const response = await provider.connect();
        const key = response.publicKey?.toString() ?? '';
        setWalletLabel(key ? `${key.slice(0, 4)}…${key.slice(-4)}` : 'Connected');
        setWalletConnected(true);
        return;
      } catch { return; }
    }
    setWalletConnected(true);
    setWalletLabel('7tNz…B83');
  }

  function openFunding(project: Project) {
    setSelected(project); setAmount(20); setFundStep('choose'); setFundOpen(true);
  }

  function confirmFunding() {
    if (!walletConnected) { void connectWallet(); return; }
    setFundStep('confirm');
    window.setTimeout(() => setFundStep('success'), 900);
  }

  return (
    <main className="app-shell">
      <aside className={`side-nav ${mobileNav ? 'is-open' : ''}`}>
        <div className="side-top"><Brand/><button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={20}/></button></div>
        <nav aria-label="Main navigation">
          {([['Discover', Compass], ['My passes', Ticket], ['Create', Plus], ['Wallet', Wallet], ['Profile', User]] as const).map(([label, Icon]) => (
            <button key={label} className={active === label ? 'active' : ''} onClick={() => { setActive(label); setMobileNav(false); }}><Icon size={19}/><span>{label}</span>{label === 'My passes' && <small>2</small>}</button>
          ))}
        </nav>
        <div className="network-card"><div><span className="pulse-dot"/>Network online</div><strong>Solana Devnet</strong><p>Fast, verifiable and built for creators.</p></div>
        <button className="profile-mini"><span className="avatar avatar-small">AK</span><span><b>Alex Kim</b><small>Supporter</small></span><ChevronRight size={16}/></button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={21}/></button>
          <div className="search-box"><Search size={18}/><input aria-label="Search projects" placeholder="Search creators and projects"/><kbd>⌘ K</kbd></div>
          <div className="top-actions"><button className="icon-button" aria-label="Notifications"><Bell size={19}/><i/></button><Button className="wallet-button" onClick={() => void connectWallet()}><Wallet size={17}/>{walletLabel}</Button></div>
        </header>

        {active === 'Discover' && <div className="page-content">
          <section className="welcome-row"><div><p className="eyebrow"><Sparkles size={14}/> Back ideas before they break through</p><h1>Discover what gets created next.</h1><p>Support original work in SOL and earn a permanent place in its story.</p></div><SolanaBadge/></section>

          <section className="featured-card" aria-label="Featured project">
            <div className="featured-art"><span className="grid-haze"/><span className="orb orb-one"/><span className="orb orb-two"/><Music size={54} strokeWidth={1.35}/><span className="live-pill"><Flame size={13}/> Project of the week</span></div>
            <div className="featured-copy">
              <div className="creator-line"><span className="avatar">MN</span><span><b>Maya Nova</b><small><CircleCheck size={13}/> Verified creator</small></span></div>
              <Badge className="category-badge">Music · Visual album</Badge><h2>Neon Echoes</h2><p>An audiovisual album shaped together with the people who believe in it first.</p>
              <div className="funding-stats"><span><strong>742 SOL</strong><small>raised of 950 SOL</small></span><span><strong>78%</strong><small>funded</small></span><span><strong>184</strong><small>supporters</small></span></div>
              <Progress value={78} className="neon-progress" aria-label="78 percent funded"/>
              <div className="featured-actions"><Button onClick={() => openFunding(projects[0])} className="primary-cta">Support project <ArrowUpRight size={17}/></Button><button className="text-link" onClick={() => setSelected(projects[0])}>View story <ChevronRight size={16}/></button></div>
            </div>
          </section>

          <section className="explore-section"><div className="section-heading"><div><p className="eyebrow">Open campaigns</p><h2>Projects to watch</h2></div><button>See all <ArrowUpRight size={15}/></button></div>
            <fieldset className="filter-row"><legend className="sr-only">Project categories</legend>{['All', 'Music', 'Film', 'Digital art'].map((item) => <button type="button" key={item} onClick={() => setCategory(item)} className={category === item ? 'active' : ''}>{item}</button>)}</fieldset>
            <div className="project-grid">{visibleProjects.map((project) => { const Icon = project.icon; const progress = Math.round((project.raised / project.goal) * 100); return <article className="project-card" key={project.id}>
              <button className={`project-cover bg-gradient-to-br ${project.accent}`} onClick={() => setSelected(project)}><span className="cover-grid"/><Icon size={42} strokeWidth={1.4}/><span>{project.category}</span></button>
              <div className="project-body"><div className="project-creator"><span className="avatar avatar-tiny">{project.initials}</span>{project.creator}<CircleCheck size={13}/></div><h3>{project.title}</h3><p>{project.description}</p><Progress value={progress} className="card-progress"/><div className="project-meta"><span><b>{project.raised} SOL</b><small>{progress}% funded</small></span><span><b>{project.days} days</b><small>remaining</small></span></div><Button variant="outline" onClick={() => openFunding(project)}>Support with SOL</Button></div>
            </article>; })}</div>
          </section>

          <section className="trust-strip"><div><Shield/><span><b>Funds stay protected</b><small>Program-controlled escrow until the goal is reached.</small></span></div><div><Zap/><span><b>Fast and low-cost</b><small>Every contribution settles on Solana.</small></span></div><div><Globe/><span><b>Open by design</b><small>Campaign progress is independently verifiable.</small></span></div></section>
        </div>}

        {active === 'My passes' && <PassesView/>}
        {active === 'Wallet' && <WalletView connected={walletConnected} onConnect={() => void connectWallet()}/>}
        {active === 'Create' && <CreateView/>}
        {active === 'Profile' && <ProfileView/>}
      </section>

      <Dialog open={Boolean(selected) && !fundOpen} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="project-dialog" showCloseButton>{selected && <><div className={`detail-hero bg-gradient-to-br ${selected.accent}`}><selected.icon size={62}/></div><DialogHeader><DialogTitle>{selected.title}</DialogTitle><DialogDescription>by {selected.creator} · {selected.category}</DialogDescription></DialogHeader><p>{selected.description} Supporters receive access, voting rights and collectible proof of participation based on their contribution.</p><div className="detail-ledger"><Lock size={17}/><span><b>On-chain escrow</b><small>Campaign CF-00{selected.id} · Solana Devnet</small></span><ExternalLink size={16}/></div><Button className="primary-cta" onClick={() => openFunding(selected)}>Support with SOL</Button></>}</DialogContent>
      </Dialog>

      <Dialog open={fundOpen} onOpenChange={setFundOpen}>
        <DialogContent className="fund-dialog" showCloseButton={fundStep !== 'confirm'}>
          {selected && fundStep === 'choose' && <><DialogHeader><span className="dialog-kicker"><span className="solana-mini"><i/><i/><i/></span> Solana contribution</span><DialogTitle>Support {selected.title}</DialogTitle><DialogDescription>Your SOL stays in program-controlled escrow until the campaign closes.</DialogDescription></DialogHeader><div className="amount-display"><span>{amount}</span><b>SOL</b></div><div className="amount-grid">{[5,20,50,100].map((value) => <button key={value} onClick={() => setAmount(value)} className={amount === value ? 'active' : ''}>{value} SOL</button>)}</div><label htmlFor="custom-sol-amount" className="custom-amount">Custom amount</label><Input id="custom-sol-amount" className="custom-amount-input" type="number" min="1" value={amount} onChange={(event) => setAmount(Math.max(1, Number(event.target.value)))}/><div className="pass-preview" style={{ '--pass-color': currentPass.color } as React.CSSProperties}><span><Ticket size={21}/></span><div><small>Your access level</small><b>{currentPass.name} Pass</b><p>{currentPass.perks.join(' · ')}</p></div><Star size={18}/></div><div className="fund-summary"><span>Network fee</span><b>≈ 0.000005 SOL</b><span>Total</span><strong>{amount} SOL</strong></div><Button className="primary-cta full" onClick={confirmFunding}>{walletConnected ? `Confirm ${amount} SOL` : 'Connect wallet to continue'}<ArrowUpRight size={17}/></Button><p className="security-note"><Shield size={14}/> Demo uses Solana Devnet. No real funds are requested.</p></>}
          {fundStep === 'confirm' && <div className="confirm-state"><span className="tx-spinner"><span className="solana-mini"><i/><i/><i/></span></span><DialogTitle>Confirming on Solana</DialogTitle><DialogDescription>Your contribution is being recorded by the campaign program.</DialogDescription><div className="confirmation-steps"><span className="done"><Check size={14}/> Wallet approved</span><span className="active"><i/> Finalizing transaction</span><span><i/> Minting Creator Pass</span></div></div>}
          {fundStep === 'success' && <div className="success-state"><span className="success-icon"><Check size={34}/></span><p className="eyebrow">Contribution confirmed</p><DialogTitle>You are part of the story.</DialogTitle><DialogDescription>{amount} SOL was added to {selected?.title}. Your {currentPass.name} Pass is ready.</DialogDescription><div className="minted-pass" style={{ '--pass-color': currentPass.color } as React.CSSProperties}><span className="solana-mini"><i/><i/><i/></span><div><small>CREATOR PASS</small><b>{currentPass.name.toUpperCase()}</b><p>{selected?.title} · #{1184 + amount}</p></div><Ticket size={38}/></div><button className="tx-link">5mNa…4Kq2 <Copy size={14}/> <ExternalLink size={14}/></button><Button className="primary-cta full" onClick={() => { setFundOpen(false); setActive('My passes'); }}>View my passes</Button></div>}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function PassesView() {
  return <div className="subpage page-content"><div className="subpage-heading"><div><p className="eyebrow">Your participation</p><h1>Creator Passes</h1><p>Every pass is a verifiable record of the work you helped bring to life.</p></div><SolanaBadge/></div><div className="pass-collection">{[passes[1], passes[2]].map((pass, index) => <article key={pass.name} className="collection-pass" style={{ '--pass-color': pass.color } as React.CSSProperties}><span className="solana-mini"><i/><i/><i/></span><small>CREATOR PASS · DEVNET</small><Ticket size={50}/><h2>{pass.name}</h2><p>{index === 0 ? 'Neon Echoes' : 'Synthetic Garden'}</p><div><span>Contribution</span><b>{pass.amount} SOL</b></div></article>)}</div><div className="activity-card"><div className="section-heading"><div><p className="eyebrow">On-chain activity</p><h2>Participation history</h2></div></div>{[['Neon Echoes','20 SOL','Insider Pass'],['Synthetic Garden','50 SOL','Producer Pass']].map((row) => <div className="activity-row" key={row[0]}><span className="activity-icon"><Check size={16}/></span><span><b>{row[0]}</b><small>Contribution confirmed</small></span><b>{row[1]}</b><Badge>{row[2]}</Badge><button aria-label={`Open ${row[0]} transaction`}><ExternalLink size={15}/></button></div>)}</div></div>;
}

function WalletView({ connected, onConnect }: { connected: boolean; onConnect: () => void }) {
  return <div className="subpage centered-page page-content"><div className="wallet-panel"><span className="wallet-orb"><Wallet size={34}/></span><p className="eyebrow">Solana wallet</p><h1>{connected ? '7tNz…B83 is connected' : 'Connect your wallet'}</h1><p>{connected ? 'Your demo balance and Creator Passes are synced on Devnet.' : 'Use Phantom or another compatible wallet to support creators and collect passes.'}</p><Button className="primary-cta" onClick={onConnect}>{connected ? 'Wallet connected' : 'Connect wallet'}<ArrowUpRight size={17}/></Button><div className="wallet-facts"><span><Shield/><b>Non-custodial</b><small>You always approve transactions.</small></span><span><Zap/><b>Devnet safe</b><small>No real SOL is used in this demo.</small></span></div></div></div>;
}

function CreateView() {
  return <div className="subpage centered-page page-content"><div className="create-panel"><span className="wallet-orb"><Plus size={34}/></span><p className="eyebrow">Creator studio</p><h1>Turn an idea into a transparent campaign.</h1><p>Set a goal, define your supporter passes and anchor the campaign on Solana.</p><div className="create-steps"><span><i>1</i><b>Project story</b><small>Tell people what you are making.</small></span><span><i>2</i><b>Funding rules</b><small>Goal, deadline and escrow policy.</small></span><span><i>3</i><b>Creator Passes</b><small>Choose access for each level.</small></span></div><Button className="primary-cta">Start a draft <ArrowUpRight size={17}/></Button></div></div>;
}

function ProfileView() {
  return <div className="subpage page-content"><div className="profile-hero"><span className="avatar profile-avatar">AK</span><div><p className="eyebrow">Community member</p><h1>Alex Kim</h1><p>Backing independent music, film and digital art since 2026.</p></div><Button variant="outline">Edit profile</Button></div><div className="profile-stats"><span><b>70 SOL</b><small>Total supported</small></span><span><b>2</b><small>Creator Passes</small></span><span><b>2</b><small>Projects backed</small></span></div><div className="activity-card"><div className="section-heading"><div><p className="eyebrow">Proof of participation</p><h2>Public impact</h2></div></div><p className="impact-copy">Your support is linked to your wallet, making your contribution history portable, verifiable and yours.</p><div className="impact-actions"><Button variant="outline"><Globe size={16}/> Public profile</Button><Button variant="outline"><MessageCircle size={16}/> Share impact</Button></div></div></div>;
}
