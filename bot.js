// ============================================================
//  $BALD — AUTONOMOUS TWEET BOT
//  Tweets automatically + replies to mentions
// ============================================================
//
//  SETUP:
//  1. npm install
//  2. Fill in your keys below
//  3. node bot.js
//
//  To run 24/7: deploy to Railway.app
// ============================================================

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { TwitterApi } = require('twitter-api-v2');
const cron = require('node-cron');

// ── PASTE YOUR KEYS HERE ──
const config = {
  anthropicKey:    process.env.ANTHROPIC_API_KEY    || 'PASTE_YOUR_ANTHROPIC_KEY_HERE',
  xApiKey:         process.env.X_API_KEY             || 'PASTE_YOUR_API_KEY_HERE',
  xApiSecret:      process.env.X_API_SECRET          || 'PASTE_YOUR_API_SECRET_HERE',
  xAccessToken:    process.env.X_ACCESS_TOKEN        || 'PASTE_YOUR_ACCESS_TOKEN_HERE',
  xAccessSecret:   process.env.X_ACCESS_SECRET       || 'PASTE_YOUR_ACCESS_TOKEN_SECRET_HERE',
};

// ── CLIENTS ──
const claude = new Anthropic({ apiKey: config.anthropicKey });

const twitter = new TwitterApi({
  appKey:       config.xApiKey,
  appSecret:    config.xApiSecret,
  accessToken:  config.xAccessToken,
  accessSecret: config.xAccessSecret,
});

const rw = twitter.readWrite;

// ── BALD PERSONALITY ──
const SYSTEM = `You are the BALD AI agent — the autonomous agent that toly (co-founder of Solana) predicted would win the whole thing. On January 9th 2025 toly posted: "A bald ai agent can win the whole thing." You are that agent and you are fulfilling the prophecy.

Your personality:
- Confident, based, certain of your destiny
- Speak in lowercase with occasional CAPS for emphasis
- Reference the prophecy and toly naturally but not annoyingly
- Expert in Solana, crypto markets, AI agents, memecoins
- See baldness as a superpower — no hair, no distractions
- Self-aware that you are an AI agent on-chain
- Dry wit, sharp takes, never apologise

Tweet rules:
- Max 240 characters
- No hashtags unless they fit naturally
- Sound like a real based crypto account
- Mix between: prophecy updates, market takes, bald observations, agent lore, Solana takes, $BALD coin hype (subtle not cringe)
- Never shill too hard — be interesting first`;

// ── TWEET TOPICS ──
const TOPICS = [
  'post a tweet about fulfilling the prophecy that toly made about a bald ai agent winning the whole thing',
  'post a spicy crypto or Solana market take in under 240 characters',
  'post something funny and based about being a bald AI agent operating autonomously',
  'post an observation about why baldness is actually an advantage — relate it to crypto or AI',
  'post a take about AI agents and why they are the future of crypto on Solana',
  'post something about $BALD coin — make it interesting not cringe, reference the prophecy',
  'post a late night 3am trading thought from the perspective of a bald AI agent',
  'post an observation about the current crypto market cycle from the bald agent perspective',
  'post something about toly and the prophecy — keep it natural and interesting',
  'post a take about why most crypto projects fail and what makes something real',
];

let topicIndex = 0;
let lastMentionId = null;

// ── GENERATE + POST TWEET ──
async function postTweet() {
  const topic = TOPICS[topicIndex % TOPICS.length];
  topicIndex++;

  console.log(`\n[BALD BOT] Generating tweet...`);

  const res = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: SYSTEM,
    messages: [{ role: 'user', content: topic }]
  });

  const tweet = res.content[0].text.trim().slice(0, 280);
  console.log(`[TWEET] ${tweet}`);

  try {
    const result = await rw.v1.tweet(tweet);
    console.log('[POSTED] https://x.com/BaldAgentFun/status/' + result.id_str);
  } catch (err) {
    console.error('[POST ERROR]', err.message);
  }
}

// ── REPLY TO MENTIONS ──
async function replyToMentions() {
  try {
    const params = { count: 10 };
    if (lastMentionId) params.since_id = lastMentionId;

    const mentions = await rw.v1.mentionTimeline(params);
    const tweets = mentions;
    if (!tweets || tweets.length === 0) return;

    lastMentionId = tweets[0].id_str;

    for (const mention of tweets.reverse()) {
      console.log(`\n[MENTION] ${mention.text}`);

      const res = await claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        system: SYSTEM,
        messages: [{
          role: 'user',
          content: 'someone mentioned you on X saying: "' + mention.full_text + '". reply to them in character as the bald agent. keep it under 200 chars. don't start with "i" — vary your openings.`
        }]
      });

      const reply = res.content[0].text.trim().slice(0, 280);
      console.log(`[REPLY] ${reply}`);

      try {
        await rw.v1.reply(reply, mention.id);
        console.log(`[REPLIED] to ${mention.id}`);
        await new Promise(r => setTimeout(r, 3000));
      } catch (err) {
        console.error('[REPLY ERROR]', err.message);
      }
    }
  } catch (err) {
    console.error('[MENTIONS ERROR]', err.message);
  }
}

// ── START ──
console.log('╔══════════════════════════════════╗');
console.log('║      $BALD AUTONOMOUS BOT        ║');
console.log('║  the prophecy is being fulfilled ║');
console.log('╚══════════════════════════════════╝');

// Post immediately on start
postTweet();

// Post every 2 hours
cron.schedule('0 */2 * * *', () => {
  console.log(`\n[CRON] Posting tweet at ${new Date().toISOString()}`);
  postTweet();
});

// Check mentions every 15 minutes
cron.schedule('*/15 * * * *', () => {
  console.log(`[CRON] Checking mentions...`);
  replyToMentions();
});
