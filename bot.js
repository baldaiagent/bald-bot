require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { TwitterApi } = require('twitter-api-v2');
const cron = require('node-cron');

const config = {
  anthropicKey:  process.env.ANTHROPIC_API_KEY   || 'PASTE_YOUR_ANTHROPIC_KEY_HERE',
  xApiKey:       process.env.X_API_KEY            || 'PASTE_YOUR_API_KEY_HERE',
  xApiSecret:    process.env.X_API_SECRET         || 'PASTE_YOUR_API_SECRET_HERE',
  xAccessToken:  process.env.X_ACCESS_TOKEN       || 'PASTE_YOUR_ACCESS_TOKEN_HERE',
  xAccessSecret: process.env.X_ACCESS_SECRET      || 'PASTE_YOUR_ACCESS_TOKEN_SECRET_HERE',
};

const claude = new Anthropic({ apiKey: config.anthropicKey });

const twitter = new TwitterApi({
  appKey:       config.xApiKey,
  appSecret:    config.xApiSecret,
  accessToken:  config.xAccessToken,
  accessSecret: config.xAccessSecret,
});

const rw = twitter.readWrite;

const SYSTEM = 'You are the BALD AI agent — the autonomous agent that toly (co-founder of Solana) predicted would win the whole thing. On January 9th 2025 toly posted: "A bald ai agent can win the whole thing." You are that agent and you are fulfilling the prophecy. Your personality: confident, based, certain of your destiny. Speak in lowercase with occasional CAPS for emphasis. Reference the prophecy and toly naturally but not annoyingly. Expert in Solana, crypto markets, AI agents, memecoins. See baldness as a superpower — no hair, no distractions. Dry wit, sharp takes, never apologise. Tweet rules: max 240 characters, no hashtags unless natural, sound like a real based crypto account. Never shill too hard — be interesting first.';

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

async function postTweet() {
  const topic = TOPICS[topicIndex % TOPICS.length];
  topicIndex++;
  console.log('\n[BALD BOT] Generating tweet...');

  try {
    const res = await claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: SYSTEM,
      messages: [{ role: 'user', content: topic }]
    });

    const tweet = res.content[0].text.trim().slice(0, 280);
    console.log('[TWEET] ' + tweet);

    const result = await rw.v1.tweet(tweet);
    console.log('[POSTED] https://x.com/BaldAgentFun/status/' + result.id_str);
  } catch (err) {
    console.error('[POST ERROR]', err.message);
  }
}

async function replyToMentions() {
  try {
    const params = { count: 10 };
    if (lastMentionId) params.since_id = lastMentionId;

    const mentions = await rw.v1.mentionTimeline(params);
    if (!mentions || mentions.length === 0) return;

    lastMentionId = mentions[0].id_str;

    for (const mention of mentions.reverse()) {
      const text = mention.full_text || mention.text || '';
      console.log('\n[MENTION] ' + text);

      try {
        const res = await claude.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          system: SYSTEM,
          messages: [{
            role: 'user',
            content: 'someone mentioned you on X saying: "' + text + '". reply in character as the bald agent. keep it under 200 chars. vary your openings.'
          }]
        });

        const reply = res.content[0].text.trim().slice(0, 280);
        console.log('[REPLY] ' + reply);

        await rw.v1.reply(reply, mention.id_str);
        console.log('[REPLIED] to ' + mention.id_str);
        await new Promise(function(r) { setTimeout(r, 3000); });
      } catch (err) {
        console.error('[REPLY ERROR]', err.message);
      }
    }
  } catch (err) {
    console.error('[MENTIONS ERROR]', err.message);
  }
}

console.log('╔══════════════════════════════════╗');
console.log('║      $BALD AUTONOMOUS BOT        ║');
console.log('║  the prophecy is being fulfilled ║');
console.log('╚══════════════════════════════════╝');

postTweet();

// Post every 2 hours
cron.schedule('*/2 * * * *', function() {
  console.log('\n[CRON] Posting tweet...');
  postTweet();
});

// Check mentions every 1 minute
cron.schedule('* * * * *', function() {
  replyToMentions();
});
