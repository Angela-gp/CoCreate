'use client';

import { useEffect, useMemo, useState } from 'react';
import { Buffer } from 'buffer';
import { ConnectionProvider, useConnection, useWallet, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, useWalletModal } from '@solana/wallet-adapter-react-ui';
import {
  LAMPORTS_PER_SOL, PublicKey, Transaction, TransactionInstruction, clusterApiUrl,
} from '@solana/web3.js';
import {
  AlertTriangle, ArrowUpRight, Bell, Check, ChevronRight, CircleCheck, Compass,
  Droplets, ExternalLink, Film, Flame, Globe, LoaderCircle, Lock, LogOut, Menu,
  MessageCircle, Music, Palette, Plus, Radio, Search, Shield, Sparkles, Star,
  Ticket, User, Wallet, X, Zap,
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

type NetworkMode = 'demo' | 'devnet';
type FundStep = 'choose' | 'confirm' | 'success' | 'error';
type TransactionPhase = 'approval' | 'broadcast' | 'confirmation';
type Participation = {
  id: string; project: string; amount: number; pass: string; network: NetworkMode;
  signature?: string; createdAt: string;
};

const DEVNET_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl('devnet');
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const STORAGE_KEY = 'cocreate-solana-demo-v1';

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

function SolanaBadge({ mode }: { mode: NetworkMode }) {
  return <span className={`solana-badge ${mode}`}><span className="solana-mini" aria-hidden="true"><i/><i/><i/></span>{mode === 'devnet' ? 'Solana Devnet' : 'Safe demo mode'}</span>;
}

function HomePage() {
  const { connection } = useConnection();
  const walletContext = useWallet();
  const { connected, publicKey, wallet } = walletContext;
  const { setVisible: setWalletAdapterVisible } = useWalletModal();
  const [active, setActive] = useState('Discover');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<Project | null>(null);
  const [walletOpen, setWalletOpen] = useState(false);
  const [demoConnected, setDemoConnected] = useState(false);
  const [networkMode, setNetworkMode] = useState<NetworkMode>('demo');
  const [balance, setBalance] = useState<number | null>(null);
  const [walletNotice, setWalletNotice] = useState('');
  const [walletBusy, setWalletBusy] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);
  const [amount, setAmount] = useState(20);
  const [fundStep, setFundStep] = useState<FundStep>('choose');
  const [transactionPhase, setTransactionPhase] = useState<TransactionPhase>('approval');
  const [transactionSignature, setTransactionSignature] = useState('');
  const [transactionError, setTransactionError] = useState('');
  const [participation, setParticipation] = useState<Participation[]>([]);
  const [restored, setRestored] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const visibleProjects = useMemo(() => category === 'All' ? projects : projects.filter((project) => project.category === category), [category]);
  const currentPass = [...passes].reverse().find((pass) => amount >= pass.amount) ?? passes[0];
  const walletConnected = connected || demoConnected;
  const walletLabel = connected && publicKey
    ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}`
    : demoConnected ? 'Demo 7tNz…B83' : 'Connect wallet';
  const explorerUrl = transactionSignature
    ? `https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
    : '';

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as {
          demoConnected?: boolean; networkMode?: NetworkMode; participation?: Participation[];
        };
        setDemoConnected(Boolean(saved.demoConnected));
        if (saved.networkMode === 'demo' || saved.networkMode === 'devnet') setNetworkMode(saved.networkMode);
        if (Array.isArray(saved.participation)) setParticipation(saved.participation);
      } catch { /* Ignore malformed browser state and start safely. */ }
      setRestored(true);
    });
  }, []);

  useEffect(() => {
    if (!restored) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ demoConnected, networkMode, participation }));
  }, [demoConnected, networkMode, participation, restored]);

  useEffect(() => {
    if (!connected || !publicKey) return;
    let activeRequest = true;
    void connection.getBalance(publicKey).then((lamports) => {
      if (activeRequest) setBalance(lamports / LAMPORTS_PER_SOL);
    }).catch(() => { if (activeRequest) setBalance(null); });
    return () => { activeRequest = false; };
  }, [connected, connection, publicKey]);

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

  function openWalletPicker() {
    setWalletNotice('');
    setWalletOpen(true);
  }

  function connectDemoWallet() {
    setDemoConnected(true);
    setNetworkMode('demo');
    setWalletNotice('Demo wallet is ready with 500 USDC and 4 SOL for the presentation.');
    setWalletOpen(false);
  }

  function openInstalledWallets() {
    setWalletOpen(false);
    setWalletAdapterVisible(true);
  }

  async function disconnectWallet() {
    if (connected) await walletContext.disconnect();
    setDemoConnected(false);
    setBalance(null);
    setWalletNotice('Wallet disconnected.');
  }

  async function requestAirdrop() {
    if (!publicKey) { openInstalledWallets(); return; }
    setWalletBusy(true);
    setWalletNotice('Requesting 1 Devnet SOL…');
    try {
      const signature = await connection.requestAirdrop(publicKey, LAMPORTS_PER_SOL);
      const latest = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature, ...latest }, 'confirmed');
      const nextBalance = await connection.getBalance(publicKey);
      setBalance(nextBalance / LAMPORTS_PER_SOL);
      setWalletNotice('1 Devnet SOL received. It has no real monetary value.');
    } catch {
      setWalletNotice('The public faucet is busy. Try again shortly or use faucet.solana.com.');
    } finally { setWalletBusy(false); }
  }

  function openFunding(project: Project) {
    setSelected(project); setAmount(20); setFundStep('choose'); setTransactionError(''); setTransactionSignature(''); setFundOpen(true);
  }

  function saveParticipation(signature?: string) {
    if (!selected) return;
    const entry: Participation = {
      id: signature ?? crypto.randomUUID(), project: selected.title, amount,
      pass: currentPass.name, network: networkMode, signature,
      createdAt: new Date().toISOString(),
    };
    setParticipation((current) => [entry, ...current].slice(0, 12));
  }

  async function confirmFunding() {
    if (!walletConnected) { openWalletPicker(); return; }
    if (networkMode === 'devnet' && (!connected || !publicKey)) {
      setWalletNotice('Connect Phantom, Solflare, Backpack or another Wallet Standard wallet for Devnet.');
      openInstalledWallets();
      return;
    }
    setFundStep('confirm');
    setTransactionPhase('approval');
    setTransactionError('');

    if (networkMode === 'demo') {
      window.setTimeout(() => {
        setTransactionPhase('confirmation');
        saveParticipation();
        setFundStep('success');
      }, 850);
      return;
    }

    try {
      const latest = await connection.getLatestBlockhash();
      const memo = JSON.stringify({ app: 'CoCreate', project: selected?.id, amountSol: amount, pass: currentPass.name });
      const transaction = new Transaction({ feePayer: publicKey!, ...latest }).add(
        new TransactionInstruction({
          keys: [], programId: MEMO_PROGRAM_ID, data: Buffer.from(memo),
        }),
      );
      const signature = await walletContext.sendTransaction(transaction, connection);
      setTransactionSignature(signature);
      setTransactionPhase('broadcast');
      await connection.confirmTransaction({ signature, ...latest }, 'confirmed');
      setTransactionPhase('confirmation');
      saveParticipation(signature);
      setFundStep('success');
      const nextBalance = await connection.getBalance(publicKey!);
      setBalance(nextBalance / LAMPORTS_PER_SOL);
    } catch (error) {
      const message = error instanceof Error && error.message.toLowerCase().includes('reject')
        ? 'The wallet request was declined. Nothing was sent.'
        : 'The Devnet transaction could not be confirmed. Check the wallet balance and try again.';
      setTransactionError(message);
      setFundStep('error');
    }
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
        <div className="network-card">
          <div><span className="pulse-dot"/>Network ready</div>
          <strong>{networkMode === 'devnet' ? 'Solana Devnet' : 'Demo simulator'}</strong>
          <p>{networkMode === 'devnet' ? 'Wallet approvals and transactions are recorded on Devnet.' : 'Explore every flow without real funds or extensions.'}</p>
          <fieldset className="network-toggle"><legend className="sr-only">Solana network mode</legend>
            <button className={networkMode === 'demo' ? 'active' : ''} onClick={() => setNetworkMode('demo')}>Demo</button>
            <button className={networkMode === 'devnet' ? 'active' : ''} onClick={() => setNetworkMode('devnet')}>Devnet</button>
          </fieldset>
        </div>
        <button className="profile-mini"><span className="avatar avatar-small">AK</span><span><b>Alex Kim</b><small>Supporter</small></span><ChevronRight size={16}/></button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={21}/></button>
          <div className="search-box"><Search size={18}/><input aria-label="Search projects" placeholder="Search creators and projects"/><kbd>⌘ K</kbd></div>
          <div className="top-actions"><button className="icon-button" aria-label="Notifications"><Bell size={19}/><i/></button><Button className="wallet-button" onClick={() => walletConnected ? setActive('Wallet') : openWalletPicker()}><Wallet size={17}/>{walletLabel}</Button></div>
        </header>

        {active === 'Discover' && <div className="page-content">
          <section className="welcome-row"><div><p className="eyebrow"><Sparkles size={14}/> Back ideas before they break through</p><h1>Discover what gets created next.</h1><p>Support original work in SOL and earn a permanent place in its story.</p></div><SolanaBadge mode={networkMode}/></section>

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

        {active === 'My passes' && <PassesView mode={networkMode} participation={participation}/>}
        {active === 'Wallet' && <WalletView connected={walletConnected} realWallet={connected} walletName={wallet?.adapter.name} address={publicKey?.toBase58()} balance={balance} mode={networkMode} notice={walletNotice} busy={walletBusy} onConnect={openWalletPicker} onDisconnect={() => void disconnectWallet()} onAirdrop={() => void requestAirdrop()} onModeChange={setNetworkMode}/>}
        {active === 'Create' && <CreateView/>}
        {active === 'Profile' && <ProfileView/>}
      </section>

      <Dialog open={walletOpen} onOpenChange={setWalletOpen}>
        <DialogContent className="wallet-dialog" showCloseButton>
          <DialogHeader>
            <span className="dialog-kicker"><Wallet size={14}/> Choose how to continue</span>
            <DialogTitle>Connect to CoCreate</DialogTitle>
            <DialogDescription>Use an installed Solana wallet for Devnet or enter the safe demo with one click.</DialogDescription>
          </DialogHeader>
          <button className="wallet-choice featured" onClick={connectDemoWallet}>
            <span><Sparkles size={20}/></span><div><b>Demo wallet</b><small>Instant · 500 USDC + 4 demo SOL · no extension</small></div><ChevronRight size={18}/>
          </button>
          <button className="wallet-choice" onClick={openInstalledWallets}>
            <span><Wallet size={20}/></span><div><b>Solana wallets</b><small>Phantom, Solflare, Backpack and Wallet Standard</small></div><ChevronRight size={18}/>
          </button>
          <div className="wallet-dialog-note"><Shield size={15}/><span><b>Non-custodial by design</b><small>CoCreate never receives or stores a wallet recovery phrase.</small></span></div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selected) && !fundOpen} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="project-dialog" showCloseButton>{selected && <><div className={`detail-hero bg-gradient-to-br ${selected.accent}`}><selected.icon size={62}/></div><DialogHeader><DialogTitle>{selected.title}</DialogTitle><DialogDescription>by {selected.creator} · {selected.category}</DialogDescription></DialogHeader><p>{selected.description} Supporters receive access, voting rights and collectible proof of participation based on their contribution.</p><div className="detail-ledger"><Lock size={17}/><span><b>On-chain escrow</b><small>Campaign CF-00{selected.id} · Solana Devnet</small></span><ExternalLink size={16}/></div><Button className="primary-cta" onClick={() => openFunding(selected)}>Support with SOL</Button></>}</DialogContent>
      </Dialog>

      <Dialog open={fundOpen} onOpenChange={setFundOpen}>
        <DialogContent className="fund-dialog" showCloseButton={fundStep !== 'confirm'}>
          {selected && fundStep === 'choose' && <><DialogHeader><span className="dialog-kicker"><span className="solana-mini"><i/><i/><i/></span> {networkMode === 'devnet' ? 'Solana Devnet proof' : 'Safe simulated contribution'}</span><DialogTitle>Support {selected.title}</DialogTitle><DialogDescription>{networkMode === 'devnet' ? 'Your wallet signs a real Devnet memo transaction. The campaign amount stays simulated until the escrow program is deployed.' : 'The complete escrow and Creator Pass journey runs locally without spending funds.'}</DialogDescription></DialogHeader><div className="amount-display"><span>{amount}</span><b>SOL</b></div><div className="amount-grid">{[5,20,50,100].map((value) => <button key={value} onClick={() => setAmount(value)} className={amount === value ? 'active' : ''}>{value} SOL</button>)}</div><label htmlFor="custom-sol-amount" className="custom-amount">Custom amount</label><Input id="custom-sol-amount" className="custom-amount-input" type="number" min="1" value={amount} onChange={(event) => setAmount(Math.max(1, Number(event.target.value)))}/><div className="pass-preview" style={{ '--pass-color': currentPass.color } as React.CSSProperties}><span><Ticket size={21}/></span><div><small>Your access level</small><b>{currentPass.name} Pass</b><p>{currentPass.perks.join(' · ')}</p></div><Star size={18}/></div><div className="fund-summary"><span>{networkMode === 'devnet' ? 'Devnet network fee' : 'Network fee'}</span><b>{networkMode === 'devnet' ? 'paid in test SOL' : '0 SOL'}</b><span>Campaign contribution</span><strong>{amount} SOL</strong></div><Button className="primary-cta full" onClick={() => void confirmFunding()}>{walletConnected ? `Confirm ${amount} SOL` : 'Connect wallet to continue'}<ArrowUpRight size={17}/></Button><p className="security-note"><Shield size={14}/>{networkMode === 'devnet' ? 'Devnet assets have no real monetary value.' : 'Demo mode never opens a wallet approval.'}</p></>}
          {fundStep === 'confirm' && <div className="confirm-state"><span className="tx-spinner"><span className="solana-mini"><i/><i/><i/></span></span><DialogTitle>{networkMode === 'devnet' ? 'Confirming on Solana' : 'Running the escrow simulation'}</DialogTitle><DialogDescription>{networkMode === 'devnet' ? 'Keep the wallet open until the Devnet transaction is confirmed.' : 'Applying campaign rules and issuing your Creator Pass.'}</DialogDescription><div className="confirmation-steps"><span className={transactionPhase !== 'approval' ? 'done' : 'active'}>{transactionPhase !== 'approval' ? <Check size={14}/> : <i/>}{networkMode === 'devnet' ? 'Wallet approval' : 'Contribution accepted'}</span><span className={transactionPhase === 'broadcast' ? 'active' : transactionPhase === 'confirmation' ? 'done' : ''}>{transactionPhase === 'confirmation' ? <Check size={14}/> : <i/>}{networkMode === 'devnet' ? 'Devnet confirmation' : 'Escrow rules applied'}</span><span className={transactionPhase === 'confirmation' ? 'active' : ''}><i/>Issuing Creator Pass</span></div></div>}
          {fundStep === 'error' && <div className="error-state"><span className="error-icon"><AlertTriangle size={31}/></span><p className="eyebrow">Transaction not completed</p><DialogTitle>Nothing was recorded.</DialogTitle><DialogDescription>{transactionError}</DialogDescription><Button className="primary-cta full" onClick={() => setFundStep('choose')}>Try again</Button></div>}
          {fundStep === 'success' && <div className="success-state"><span className="success-icon"><Check size={34}/></span><p className="eyebrow">Contribution confirmed</p><DialogTitle>You are part of the story.</DialogTitle><DialogDescription>{amount} SOL was added to {selected?.title} in {networkMode === 'devnet' ? 'the demo ledger with a Devnet proof' : 'the safe demo ledger'}. Your {currentPass.name} Pass is ready.</DialogDescription><div className="minted-pass" style={{ '--pass-color': currentPass.color } as React.CSSProperties}><span className="solana-mini"><i/><i/><i/></span><div><small>CREATOR PASS · {networkMode.toUpperCase()}</small><b>{currentPass.name.toUpperCase()}</b><p>{selected?.title} · #{1184 + amount}</p></div><Ticket size={38}/></div>{explorerUrl ? <a className="tx-link" href={explorerUrl} target="_blank" rel="noreferrer">View transaction <ExternalLink size={14}/></a> : <span className="tx-link"><Radio size={14}/> Saved in the demo ledger</span>}<Button className="primary-cta full" onClick={() => { setFundOpen(false); setActive('My passes'); }}>View my passes</Button></div>}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function PassesView({ mode, participation }: { mode: NetworkMode; participation: Participation[] }) {
  const records: Participation[] = participation.length ? participation : [
    { id: 'seed-1', project: 'Neon Echoes', amount: 20, pass: 'Insider', network: 'demo', createdAt: new Date().toISOString() },
    { id: 'seed-2', project: 'Synthetic Garden', amount: 50, pass: 'Producer', network: 'demo', createdAt: new Date().toISOString() },
  ];
  return <div className="subpage page-content"><div className="subpage-heading"><div><p className="eyebrow">Your participation</p><h1>Creator Passes</h1><p>Every pass is a portable record of the work you helped bring to life.</p></div><SolanaBadge mode={mode}/></div><div className="pass-collection">{records.slice(0, 2).map((record) => { const pass = passes.find((item) => item.name === record.pass) ?? passes[0]; return <article key={record.id} className="collection-pass" style={{ '--pass-color': pass.color } as React.CSSProperties}><span className="solana-mini"><i/><i/><i/></span><small>CREATOR PASS · {record.network.toUpperCase()}</small><Ticket size={50}/><h2>{record.pass}</h2><p>{record.project}</p><div><span>Contribution</span><b>{record.amount} SOL</b></div></article>; })}</div><div className="activity-card"><div className="section-heading"><div><p className="eyebrow">Participation ledger</p><h2>Contribution history</h2></div></div>{records.map((record) => <div className="activity-row" key={record.id}><span className="activity-icon"><Check size={16}/></span><span><b>{record.project}</b><small>{record.network === 'devnet' ? 'Confirmed with Devnet proof' : 'Confirmed in demo mode'}</small></span><b>{record.amount} SOL</b><Badge>{record.pass} Pass</Badge>{record.signature ? <a aria-label={`Open ${record.project} transaction`} href={`https://explorer.solana.com/tx/${record.signature}?cluster=devnet`} target="_blank" rel="noreferrer"><ExternalLink size={15}/></a> : <span className="demo-ledger-mark">DEMO</span>}</div>)}</div></div>;
}

type WalletViewProps = {
  connected: boolean; realWallet: boolean; walletName?: string; address?: string; balance: number | null;
  mode: NetworkMode; notice: string; busy: boolean; onConnect: () => void; onDisconnect: () => void;
  onAirdrop: () => void; onModeChange: (mode: NetworkMode) => void;
};

function WalletView({ connected, realWallet, walletName, address, balance, mode, notice, busy, onConnect, onDisconnect, onAirdrop, onModeChange }: WalletViewProps) {
  const shortAddress = address ? `${address.slice(0, 5)}…${address.slice(-5)}` : '7tNz…B83';
  return <div className="subpage centered-page page-content"><div className="wallet-panel"><span className="wallet-orb"><Wallet size={34}/></span><p className="eyebrow">Solana access</p><h1>{connected ? `${shortAddress} is connected` : 'Connect your wallet'}</h1><p>{connected ? `${realWallet ? walletName ?? 'Wallet Standard wallet' : 'Safe demo wallet'} is ready. Choose Demo for a no-risk presentation or Devnet to sign a public proof transaction.` : 'Use Phantom, Solflare, Backpack, another Wallet Standard wallet, or the built-in demo wallet.'}</p><fieldset className="wallet-mode-picker"><legend className="sr-only">Transaction mode</legend><button className={mode === 'demo' ? 'active' : ''} onClick={() => onModeChange('demo')}><Sparkles size={15}/>Demo</button><button className={mode === 'devnet' ? 'active' : ''} onClick={() => onModeChange('devnet')}><Radio size={15}/>Devnet</button></fieldset>{connected && <div className="wallet-account"><span><small>Account</small><b>{realWallet ? shortAddress : 'Demo 7tNz…B83'}</b></span><span><small>Balance</small><b>{realWallet ? balance === null ? '—' : `${balance.toFixed(3)} SOL` : '4 SOL · 500 USDC'}</b></span><span><small>Network</small><b>{mode === 'devnet' ? 'Solana Devnet' : 'Local simulator'}</b></span></div>}{notice && <p className="wallet-notice">{notice}</p>}<div className="wallet-actions">{connected ? <><Button className="primary-cta" onClick={onConnect}>Change wallet <ArrowUpRight size={17}/></Button>{realWallet && <Button variant="outline" disabled={busy} onClick={onAirdrop}>{busy ? <LoaderCircle className="spin" size={16}/> : <Droplets size={16}/>}Airdrop 1 SOL</Button>}<Button variant="outline" onClick={onDisconnect}><LogOut size={16}/>Disconnect</Button></> : <Button className="primary-cta" onClick={onConnect}>Connect wallet <ArrowUpRight size={17}/></Button>}</div><div className="wallet-facts"><span><Shield/><b>Non-custodial</b><small>You approve every public transaction.</small></span><span><Zap/><b>Presentation-safe</b><small>Demo mode never spends or requests funds.</small></span></div></div></div>;
}

function CreateView() {
  return <div className="subpage centered-page page-content"><div className="create-panel"><span className="wallet-orb"><Plus size={34}/></span><p className="eyebrow">Creator studio</p><h1>Turn an idea into a transparent campaign.</h1><p>Set a goal, define your supporter passes and anchor the campaign on Solana.</p><div className="create-steps"><span><i>1</i><b>Project story</b><small>Tell people what you are making.</small></span><span><i>2</i><b>Funding rules</b><small>Goal, deadline and escrow policy.</small></span><span><i>3</i><b>Creator Passes</b><small>Choose access for each level.</small></span></div><Button className="primary-cta">Start a draft <ArrowUpRight size={17}/></Button></div></div>;
}

function ProfileView() {
  return <div className="subpage page-content"><div className="profile-hero"><span className="avatar profile-avatar">AK</span><div><p className="eyebrow">Community member</p><h1>Alex Kim</h1><p>Backing independent music, film and digital art since 2026.</p></div><Button variant="outline">Edit profile</Button></div><div className="profile-stats"><span><b>70 SOL</b><small>Total supported</small></span><span><b>2</b><small>Creator Passes</small></span><span><b>2</b><small>Projects backed</small></span></div><div className="activity-card"><div className="section-heading"><div><p className="eyebrow">Proof of participation</p><h2>Public impact</h2></div></div><p className="impact-copy">Your support is linked to your wallet, making your contribution history portable, verifiable and yours.</p><div className="impact-actions"><Button variant="outline"><Globe size={16}/> Public profile</Button><Button variant="outline"><MessageCircle size={16}/> Share impact</Button></div></div></div>;
}

export default function CoCreateApp() {
  return <ConnectionProvider endpoint={DEVNET_ENDPOINT}><WalletProvider wallets={[]} autoConnect><WalletModalProvider><HomePage/></WalletModalProvider></WalletProvider></ConnectionProvider>;
}
