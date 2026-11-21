// The token radar's model: one snapshot of the protocol universe in, one ranked board out.
//
// The board covers every slug in the snapshot's watchlist (the floor, never a ceiling) and adds the
// strongest pre-token protocols below that floor: the early rows the radar exists to find. A protocol
// is pre-token when its record carries no token (no market cap, no CoinGecko id, no symbol). Protocols
// that already trade are kept apart and shown at the market's own values, never mixed into the ranking.
//
// Implied value is grounded in the snapshot itself. Protocols that already trade reveal what the
// market pays per dollar of TVL in each line of business, so the model derives a market-cap/TVL
// multiple per category from them (a median, shrunk toward the global median in log space so a
// category with one loud sample cannot shout; sibling labels for one business — the curator and
// allocator categories, the staking family — are pooled into one sample), then applies that multiple
// to a pre-token protocol's TVL with four adjustments, each a function of the protocol's own record:
//
//   base        = tvl_usd x category_multiple(category)
//   growthMult  = 1 + clamp(change_7d, -50, 100) / 100 x 0.6     (seven-day TVL momentum)
//   maturityMult= 0.70 + 0.30 x min(age_days, 1460) / 1460       (years run with no token)
//   breadthMult = 1 + 0.04 x min(chains - 1, 5)                  (multi-chain reach)
//   scaleFactor = (2e9 / tvl) ^ 0.10 when tvl > $2B, else 1      (very large TVL earns a thinner multiple)
//   implied     = round(base x growthMult x maturityMult x breadthMult x scaleFactor)
//
// Exact ties after rounding are stepped down a dollar at a time so the ranking is total; the pre-tie
// figure is kept on the row as model_value_usd. No protocol name is ever special-cased: the same
// function scores every row, and the dashboard states every constant it uses.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelParams {
  shrink_k: number;
  multiple_floor: number;
  multiple_cap: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_multiplier: number;
  breadth_per_chain: number;
  breadth_cap_chains: number;
  scale_threshold_usd: number;
  scale_exponent: number;
}

export const MODEL: ModelParams = {
  shrink_k: 4,
  multiple_floor: 0.03,
  multiple_cap: 2.5,
  growth_weight: 0.6,
  growth_floor: -50,
  growth_cap: 100,
  maturity_floor: 0.7,
  maturity_range: 0.3,
  maturity_days: 1460,
  unknown_age_multiplier: 0.82,
  breadth_per_chain: 0.04,
  breadth_cap_chains: 5,
  scale_threshold_usd: 2_000_000_000,
  scale_exponent: 0.1,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-2';

/** How many pre-token protocols below the watchlist floor the early radar carries, by implied value. */
export const EARLY_ROWS = 150;

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** One derivation group's multiple: the raw median of its trading protocols, and the shrunk figure used. */
export interface CategoryMultiple {
  category: string;
  samples: number;
  median_raw: number | null;
  multiple: number;
}

/** The model's working parts for one protocol: every factor the dashboard shows. */
export interface ScoreParts {
  category_multiple: number;
  multiple_group: string;
  category_samples: number;
  base_value_usd: number;
  growth_pct: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  breadth_multiplier: number;
  scale_factor: number;
  model_value_usd: number;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  watchlist: boolean;
  age_days: number | null;
  implied_value_usd: number;
  model: ScoreParts;
  farm_steps: string[];
}

/** The dashboard's view of one row: the board row's figures, its model's parts and its farm plan. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_days: number | null;
  watchlist: boolean;
  implied_value_usd: number;
  model_value_usd: number;
  category_multiple: number;
  multiple_group: string;
  category_samples: number;
  base_value_usd: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  breadth_multiplier: number;
  scale_factor: number;
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** The model's public statement: the constants and the multiples the snapshot produced. */
export interface ModelStatement {
  global_multiple: number;
  trading_protocols: number;
  shrink_k: number;
  multiple_floor: number;
  multiple_cap: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  breadth_per_chain: number;
  scale_threshold_usd: number;
  scale_exponent: number;
  categories: CategoryMultiple[];
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelStatement;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The median of a non-empty list. */
function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * DefiLlama sometimes splits one business across sibling labels (a vault curator is filed as a Risk
 * Curator, an Onchain Capital Allocator or a Liquidity Manager depending on the listing). The model
 * prices the business, not the label: these categories derive their multiple from one pooled sample.
 * Every other category derives under its own name.
 */
const MULTIPLE_GROUPS: Record<string, string> = {
  'Risk Curators': 'Curators & allocators',
  'Onchain Capital Allocator': 'Curators & allocators',
  'Liquidity Manager': 'Curators & allocators',
  'CDP': 'CDP',
  'CDP Manager': 'CDP',
  'Liquid Staking': 'Staking',
  'Liquid Restaking': 'Staking',
  'Restaked BTC': 'Staking',
  'Staking Pool': 'Staking',
  'Anchor BTC': 'Staking',
  'Yield': 'Yield',
  'Yield Aggregator': 'Yield',
  'Bridge': 'Bridges',
  'Canonical Bridge': 'Bridges',
  'Cross Chain Bridge': 'Bridges',
};

/** The derivation group one category prices under: its pooled family, or its own name. */
export function multipleGroupOf(category: string | null): string {
  const key = category ?? 'Uncategorised';
  return MULTIPLE_GROUPS[key] ?? key;
}

/**
 * The multiples the snapshot itself implies: for every derivation group, the median market-cap/TVL
 * ratio of the protocols in it that already trade, shrunk toward the global median in log space with
 * `shrink_k` pseudo-samples, then clamped to a sane band. A group with no trading protocol falls back
 * to the global median outright.
 */
export function deriveMultiples(snapshot: Snapshot, params: ModelParams = MODEL): { global: number; trading: number; byCategory: Map<string, CategoryMultiple> } {
  const ratios = new Map<string, number[]>();
  const all: number[] = [];
  for (const p of snapshot.protocols) {
    if (p.mcap_usd === null || p.tvl_usd <= 0) continue;
    const ratio = Math.max(p.mcap_usd / p.tvl_usd, 1e-4);
    all.push(ratio);
    const key = multipleGroupOf(p.category);
    const list = ratios.get(key);
    if (list === undefined) ratios.set(key, [ratio]);
    else list.push(ratio);
  }
  const global = all.length > 0 ? median(all) : 0.17;
  const logGlobal = Math.log(Math.max(global, 1e-4));
  const byCategory = new Map<string, CategoryMultiple>();
  const clamp = (v: number): number => Math.min(params.multiple_cap, Math.max(params.multiple_floor, v));
  for (const [category, list] of ratios) {
    const raw = median(list);
    const shrunk = Math.exp((list.length * Math.log(Math.max(raw, 1e-4)) + params.shrink_k * logGlobal) / (list.length + params.shrink_k));
    byCategory.set(category, { category, samples: list.length, median_raw: round4(raw), multiple: round4(clamp(shrunk)) });
  }
  return { global: round4(global), trading: all.length, byCategory };
}

/** The multiple one category scores with: its group's shrunk figure, or the global median as fallback. */
function multipleFor(category: string | null, derived: { global: number; byCategory: Map<string, CategoryMultiple> }): CategoryMultiple {
  const key = multipleGroupOf(category);
  const found = derived.byCategory.get(key);
  if (found !== undefined) return found;
  return { category: key, samples: 0, median_raw: null, multiple: derived.global };
}

/** Every factor of one protocol's implied value, and the value itself before any tie step. */
export function scoreProtocol(p: SnapshotProtocol, asOf: string, derived: { global: number; byCategory: Map<string, CategoryMultiple> }, params: ModelParams = MODEL): { parts: ScoreParts; age: number | null } {
  const age = ageDays(asOf, p.listed_at);
  const mult = multipleFor(p.category, derived);
  const base = p.tvl_usd * mult.multiple;
  const growthPct = Math.min(params.growth_cap, Math.max(params.growth_floor, finite(p.change_7d, 0)));
  const growthMult = 1 + (growthPct / 100) * params.growth_weight;
  const maturityMult = age === null
    ? params.unknown_age_multiplier
    : params.maturity_floor + (Math.min(Math.max(age, 0), params.maturity_days) / params.maturity_days) * params.maturity_range;
  const breadthMult = 1 + params.breadth_per_chain * Math.min(Math.max(p.chains.length - 1, 0), params.breadth_cap_chains);
  const scaleFactor = p.tvl_usd > params.scale_threshold_usd ? Math.pow(params.scale_threshold_usd / p.tvl_usd, params.scale_exponent) : 1;
  const modelValue = Math.max(1, Math.round(base * growthMult * maturityMult * breadthMult * scaleFactor));
  return {
    age,
    parts: {
      category_multiple: mult.multiple,
      multiple_group: mult.category,
      category_samples: mult.samples,
      base_value_usd: Math.round(base),
      growth_pct: growthPct,
      growth_multiplier: round4(growthMult),
      maturity_multiplier: round4(maturityMult),
      breadth_multiplier: round4(breadthMult),
      scale_factor: round4(scaleFactor),
      model_value_usd: modelValue,
    },
  };
}

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Categories that are products of another protocol (a wrapped, staked or bridged form of it). */
const DERIVATIVE_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'Anchor BTC', 'Decentralized BTC', 'Stablecoin Wrapper']);

/** Names that mark a wrapped or staked product, or begin with an exchange's own name. */
const PRODUCT_NAME = /\b(wrapped|staked|staking)\b/i;
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;

/**
 * Whether a protocol is one the early radar may rank: pre-token, and a candidate for a launch of its
 * own — not an exchange, not a versioned pool, and not a wrapped, staked or bridged product of a
 * protocol whose token already trades (the same exclusions the house's watchlist rule draws).
 */
export function isRankable(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (p.category === 'CEX') return false;
  if (p.category !== null && DERIVATIVE_CATEGORIES.has(p.category)) return false;
  if (VERSIONED.test(p.name) || PRODUCT_NAME.test(p.name) || EXCHANGE_PREFIX.test(p.name)) return false;
  return true;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The headline sentence's figures: how many watchlist slugs, how many rows, how many live protocols. */
export interface BoardSummary {
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
}

/** The protocols the board ranks, strongest first, with ranks 1..n and strictly stepped values. */
export function buildBoard(snapshot: Snapshot, params: ModelParams = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const derived = deriveMultiples(snapshot, params);
  const watchlist = new Set(snapshot.watchlist);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, scored by the same function as every other row.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: rankable pre-token protocols below the floor, scored, the strongest EARLY_ROWS of
  // them carried. Never a replacement for a watchlist row: a chosen protocol stays chosen.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p) && p.tvl_usd < snapshot.floor_usd)
    .map((p) => ({ p, score: scoreProtocol(p, snapshot.as_of, derived, params) }))
    .sort((a, b) => b.score.parts.model_value_usd - a.score.parts.model_value_usd || b.p.tvl_usd - a.p.tvl_usd || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0))
    .slice(0, EARLY_ROWS);
  for (const e of early) chosen.set(e.p.slug, e.p);

  const scored = [...chosen.values()].map((p) => ({ p, ...scoreProtocol(p, snapshot.as_of, derived, params) }));
  scored.sort((a, b) => b.parts.model_value_usd - a.parts.model_value_usd || b.p.tvl_usd - a.p.tvl_usd || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  // Step exact ties down so the ranking is total: each row's implied value is below the row above it.
  let ceiling = Number.POSITIVE_INFINITY;
  return scored.map((s, i) => {
    const implied = Math.max(1, Math.min(s.parts.model_value_usd, ceiling));
    ceiling = implied - 1;
    return {
      rank: i + 1,
      slug: s.p.slug,
      name: s.p.name,
      category: s.p.category,
      chains: s.p.chains,
      tvl_usd: s.p.tvl_usd,
      change_7d: s.p.change_7d,
      mcap_usd: s.p.mcap_usd,
      listed_at: s.p.listed_at,
      gecko_id: s.p.gecko_id,
      symbol: s.p.symbol,
      token_status: 'pre-token' as const,
      watchlist: watchlist.has(s.p.slug),
      age_days: s.age,
      implied_value_usd: implied,
      model: s.parts,
      farm_steps: farmSteps(s.p, s.age),
    };
  });
}

/* ------------------------------------------------------------------ farm plans */

/** A small deterministic hash of a slug, so template families vary by protocol, never by run. */
function slugHash(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** The second chain, when the protocol runs on more than one. */
function secondChainOf(p: SnapshotProtocol): string | null {
  return p.chains.length > 1 ? p.chains[1]! : null;
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 500;
  if (p.tvl_usd >= 1_000_000_000) return 250;
  if (p.tvl_usd >= 100_000_000) return 100;
  if (p.tvl_usd >= 10_000_000) return 50;
  return 25;
}

/** What one transaction costs on the protocol's first chain: mainnet is dear, the rest are not. */
function gasFor(p: SnapshotProtocol): string {
  const first = (p.chains[0] ?? '').toLowerCase();
  if (first === 'ethereum') return '$10 to $20 of mainnet gas';
  if (first === 'solana') return 'under $1 of network fees';
  if (first === 'bitcoin') return '$2 to $6 of miner fees';
  return '$1 to $3 of gas';
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 45;
  if (age < 180) return 60;
  if (age < 365) return 45;
  if (age < 730) return 30;
  return 21;
}

/** The category family a protocol farms as. */
type FarmFamily = 'lending' | 'dex' | 'staking' | 'trading' | 'vault' | 'rwa' | 'prediction' | 'launchpad' | 'nft' | 'insurance' | 'payments' | 'stable' | 'generic';

function familyOf(p: SnapshotProtocol): FarmFamily {
  const c = (p.category ?? '').toLowerCase();
  if (c.includes('lend') || c.includes('cdp') || c.includes('uncollateralized')) return 'lending';
  if (c.includes('liquid staking') || c.includes('staking pool') || c === 'staking') return 'staking';
  if (c.includes('restak')) return 'staking';
  if (c.includes('dex')) return 'dex';
  if (c.includes('derivative') || c.includes('option') || c.includes('synthetic') || c.includes('perpetual')) return 'trading';
  if (c.includes('prediction')) return 'prediction';
  if (c.includes('launchpad')) return 'launchpad';
  if (c.includes('nft')) return 'nft';
  if (c.includes('insurance')) return 'insurance';
  if (c.includes('rwa')) return 'rwa';
  if (c.includes('payment') || c.includes('card')) return 'payments';
  if (c.includes('stable') || c.includes('algo')) return 'stable';
  if (c.includes('yield') || c.includes('curator') || c.includes('allocator') || c.includes('liquidity manager') || c.includes('leveraged farm') || c.includes('basis') || c.includes('farm') || c.includes('index')) return 'vault';
  return 'generic';
}

/** The family's core position: the one action that makes a wallet count as a user of this protocol. */
function coreAction(family: FarmFamily, p: SnapshotProtocol, capital: number, chain: string): string {
  const name = p.name;
  switch (family) {
    case 'lending': return `Supply $${capital} of USDC to ${name} on ${chain} as your base position, in the market with the deepest liquidity.`;
    case 'dex': return `Provide $${capital} split between ETH and USDC to ${name}'s deepest pool on ${chain}, in the pool's active range if it is concentrated.`;
    case 'staking': return `Stake $${capital} of the chain's native asset through ${name} on ${chain} and keep the liquid receipt token in the same wallet.`;
    case 'trading': return `Deposit $${capital} of USDC as margin on ${name} and open one small position you can hold overnight, rather than a trade you close in minutes.`;
    case 'vault': return `Deposit $${capital} of USDC into ${name}'s flagship vault or curated market on ${chain} and keep the vault shares in the wallet.`;
    case 'rwa': return `Complete ${name}'s onboarding on ${chain} and subscribe $${capital} to its flagship real-world-asset vault or note.`;
    case 'prediction': return `Fund the wallet with $${capital} of USDC and take one position on ${name} in a market that settles within the month.`;
    case 'launchpad': return `Register the wallet on ${name}, complete any identity check it asks for, and commit $${capital} to the next sale it opens.`;
    case 'nft': return `Buy one floor listing on ${name} for about $${capital} and hold it; a held collection piece counts for more than a flipped one.`;
    case 'insurance': return `Buy $${capital} of cover from ${name} on ${chain} against a protocol you actually use, and keep the policy to expiry.`;
    case 'payments': return `Order or activate ${name}'s card or payment account, load $${capital}, and route one real purchase a week through it.`;
    case 'stable': return `Mint or deposit $${capital} of ${name}'s stable asset on ${chain} through its own app, not a third-party wrapper.`;
    default: return `Deposit $${capital} of USDC into ${name} on ${chain} through its own app and complete its core action once, end to end.`;
  }
}

/** The family's second action: the behaviour that separates a user from a drive-by deposit. */
function secondAction(family: FarmFamily, p: SnapshotProtocol, capital: number, chain: string): string {
  const name = p.name;
  const second = secondChainOf(p);
  switch (family) {
    case 'lending': return `Borrow about 30% against the position once and repay it a week later, so the wallet shows both sides of ${name}'s market.`;
    case 'dex': return `Route your ordinary swaps through ${name} on ${chain} as well: two or three swaps a week of $20 to $50 alongside the liquidity position.`;
    case 'staking': return `Use the receipt token once in a lending market or pool the protocol itself links to, then return it to the farming wallet.`;
    case 'trading': return `Keep a resting limit order or a small hedge open on ${name} between sessions, so the account reads as a trader, not a visitor.`;
    case 'vault': return `Claim and re-deposit any rewards the vault pays each week, compounding the position instead of letting rewards idle.`;
    case 'rwa': return `Read one of ${name}'s asset reports and hold through a full distribution cycle before judging the position.`;
    case 'prediction': return `Take a position in a second, unrelated market on ${name} each week; breadth across markets is what its activity record rewards.`;
    case 'launchpad': return `Hold the wallet's balance steady between sales on ${name}: snapshots for allocations punish wallets that empty out.`;
    case 'nft': return `List one item you own on ${name} at a fair price and leave the listing up; makers count alongside buyers.`;
    case 'insurance': return `Stake a small amount, about $${Math.max(10, Math.round(capital / 5))}, in ${name}'s underwriting pool if it offers one, separate from the cover.`;
    case 'payments': return `Set one recurring payment or top-up through ${name} so the account shows a habit, not a single test transaction.`;
    case 'stable': return `Hold the minted asset for the full hold period and use it once as collateral or liquidity where ${name} itself integrates it.`;
    default: return second !== null
      ? `Repeat the core action once on ${second}, ${name}'s second chain, so the wallet is visible in more than one of its markets.`
      : `Repeat the core action a second time two weeks later, so the wallet's history on ${name} is a pattern, not a single visit.`;
  }
}

/**
 * A protocol's farm plan: seven steps, each an action with what it costs and how long it takes. The
 * plan is derived from the protocol's own record — its category family, its chains, its TVL tier and
 * its age — and the wording family rotates by slug so no two categories read as the same boilerplate.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): string[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const gas = gasFor(p);
  const hold = holdDaysFor(age);
  const family = familyOf(p);
  const variant = slugHash(p.slug) % 3;
  const name = p.name;

  const walletStep = [
    `Start with one fresh wallet funded only with the $${capital} you mean to farm plus gas money, and keep its seed phrase offline. Cost: ${gas} for the funding move. Time: 10 minutes.`,
    `Use a dedicated wallet for ${name} that holds only the farming funds; never farm from the wallet that holds your savings. Cost: ${gas} to fund it. Time: 10 minutes.`,
    `Set up a clean wallet for this farm and label it with the protocol and the start date, so its history is auditable later. Cost: ${gas} to fund it. Time: 10 minutes.`,
  ][variant]!;
  const coreStep = `${coreAction(family, p, capital, chain)} Cost: $${capital} of capital and ${gas}. Time: 20 minutes to set up.`;
  const secondStep = `${secondAction(family, p, capital, chain)} Cost: about ${gas} a week. Time: 10 minutes a week.`;
  const cadenceStep = [
    `Keep a weekly rhythm: one qualifying action on ${name} every week, on roughly the same day, for the whole season. Cost: about ${gas} a week. Time: 10 minutes a week.`,
    `Return to ${name} weekly and repeat a small action — a deposit top-up, a swap, a vote — so no week in the window is empty. Cost: about ${gas} a week. Time: 10 minutes a week.`,
    `Make the wallet a regular: one interaction with ${name} each week, varied between its main actions, never twelve in one day. Cost: about ${gas} a week. Time: 10 minutes a week.`,
  ][variant]!
  const presenceStep = [
    `Take part once in ${name}'s governance or community process — a forum post, a snapshot vote or a feedback form — under the same wallet or handle. Cost: nothing but the post. Time: 30 minutes, once.`,
    `Join ${name}'s forum or Discord, read the current proposal thread and leave one substantive comment tied to your wallet's activity. Cost: nothing but the post. Time: 30 minutes, once.`,
    `Watch ${name}'s governance page and vote in the next proposal with the farming wallet if it holds voting power, or comment if it does not. Cost: nothing but the post. Time: 30 minutes, once.`,
  ][variant]!
  const holdStep = `Hold the position for at least ${hold} days without withdrawing, so the activity survives more than one eligibility snapshot, and check the protocol's own points or rewards page before you exit. Cost: the $${capital} stays committed. Time: ${hold} days.`;
  const launchStep = [
    `If a token launches, claim only from the link ${name} itself publishes, then decide in tranches: sell a third, hold a third, keep a third working in the protocol. Cost: never pay anyone to claim for you. Time: 1 hour on the day.`,
    `After any launch, keep using ${name} for two more weeks before unwinding: post-launch activity is often part of the next distribution. Cost: the position stays open. Time: 2 weeks.`,
    `Keep a farm log for ${name} — wallet, dates, amounts, transaction hashes — and review it before any claim window opens, so nothing you earned expires unclaimed. Cost: nothing but the log. Time: 15 minutes a month.`,
  ][variant]!

  return [walletStep, coreStep, secondStep, cadenceStep, presenceStep, holdStep, launchStep].map((s) => {
    const t = s.trim();
    if (t.length > 600) return `${t.slice(0, 596)}...`;
    if (t.length < 20) return `${t} Hold the position and check the protocol's own page.`;
    return t;
  });
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js: everything the dashboard renders, farm plan included. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    listed_at: row.listed_at,
    age_days: row.age_days,
    watchlist: row.watchlist,
    implied_value_usd: row.implied_value_usd,
    model_value_usd: row.model.model_value_usd,
    category_multiple: row.model.category_multiple,
    multiple_group: row.model.multiple_group,
    category_samples: row.model.category_samples,
    base_value_usd: row.model.base_value_usd,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    breadth_multiplier: row.model.breadth_multiplier,
    scale_factor: row.model.scale_factor,
    farm_steps: row.farm_steps,
  };
}

/** The model's public statement: its constants and the multiples this snapshot produced. */
export function modelStatement(snapshot: Snapshot, params: ModelParams = MODEL): ModelStatement {
  const derived = deriveMultiples(snapshot, params);
  const used = new Map<string, CategoryMultiple>();
  for (const p of snapshot.protocols) {
    if (!isPreToken(p)) continue;
    const cm = multipleFor(p.category, derived);
    if (!used.has(cm.category)) used.set(cm.category, cm);
  }
  return {
    global_multiple: derived.global,
    trading_protocols: derived.trading,
    shrink_k: params.shrink_k,
    multiple_floor: params.multiple_floor,
    multiple_cap: params.multiple_cap,
    growth_weight: params.growth_weight,
    growth_floor: params.growth_floor,
    growth_cap: params.growth_cap,
    maturity_floor: params.maturity_floor,
    maturity_range: params.maturity_range,
    maturity_days: params.maturity_days,
    breadth_per_chain: params.breadth_per_chain,
    scale_threshold_usd: params.scale_threshold_usd,
    scale_exponent: params.scale_exponent,
    categories: [...used.values()].sort((a, b) => (a.category < b.category ? -1 : a.category > b.category ? 1 : 0)),
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, params: ModelParams = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, params);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !r.watchlist).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model: modelStatement(snapshot, params),
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  if (board.length < 100 || board.length > 4000) return `the board holds ${board.length} rows, outside the gate's 100 to 4,000`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) {
      const t = s.trim();
      if (t.length < 20 || t.length > 600) return `${r.slug} has a farm step of ${t.length} trimmed characters`;
      if (t !== s) return `${r.slug} has a farm step with padding the gate trims away`;
    }
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
