const CurrentAffair = require('../models/CurrentAffair');

function decodeXml(value = '') {
  return String(value).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}
function tagValue(xml, tag) {
  const match = xml.match(new RegExp('<(?:[\\w-]+:)?' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?' + tag + '>', 'i'));
  return match ? decodeXml(match[1]).trim() : '';
}
function parseRss(xml) {
  return [...String(xml).matchAll(/<(?:[\w-]+:)?item(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w-]+:)?item>/gi)].map(match => ({
    title: tagValue(match[1], 'title'),
    description: tagValue(match[1], 'description') || tagValue(match[1], 'content:encoded'),
    link: tagValue(match[1], 'link') || tagValue(match[1], 'guid'),
    date: tagValue(match[1], 'pubDate') || tagValue(match[1], 'published') || tagValue(match[1], 'updated')
  })).filter(item => item.title && /^https?:\/\//i.test(item.link));
}
function allowedFeed(url, allowedHosts) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && allowedHosts.includes(parsed.hostname.toLowerCase());
  } catch (_) { return false; }
}
async function createQuestionFromItem(item, sourceName) {
  const endpoint = process.env.QUESTION_AI_API_URL;
  const apiKey = process.env.QUESTION_AI_API_KEY;
  if (!endpoint || !apiKey) throw new Error('Question AI provider is not configured');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: String(process.env.QUESTION_AI_MODEL || 'openai/gpt-oss-20b').trim(),
      temperature: 0.1, max_tokens: 1100,
      messages: [
        { role: 'system', content: 'Create one factual Indian government-exam current-affairs MCQ strictly from supplied source text. If source text does not support a clear answer, return {"skip":true}. Never infer missing facts. Return JSON only, no markdown. Provide English and Hindi. Schema: {"skip":false,"title":"...","summary":"...","question":"...","options":["...","...","...","..."],"correctAnswer":0,"explanation":"...","topic":"National|International|Economy|Science|Sports|Other","hi":{"title":"...","summary":"...","question":"...","options":["...","...","...","..."],"explanation":"..."}}' },
        { role: 'user', content: JSON.stringify({ title: item.title, description: item.description.slice(0, 5000), source: item.link, sourceDate: item.date }) }
      ]
    }),
    signal: AbortSignal.timeout(25000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || 'AI generation request failed');
  const raw = payload.choices?.[0]?.message?.content || '';
  const json = JSON.parse(raw.replace(/^\s*\x60{3}(?:json)?/i, '').replace(/\x60{3}\s*$/i, '').trim());
  if (json.skip) return null;
  if (!json.question || !Array.isArray(json.options) || json.options.length !== 4 || !Number.isInteger(json.correctAnswer) || json.correctAnswer < 0 || json.correctAnswer > 3) {
    throw new Error('AI returned an invalid MCQ structure');
  }
  const sourceDate = item.date && !Number.isNaN(Date.parse(item.date)) ? new Date(item.date) : new Date();
  const base = { title: json.title || item.title, summary: json.summary || '', question: json.question, options: json.options, correctAnswer: json.correctAnswer, explanation: json.explanation || '', topic: json.topic || 'Other', sourceName, sourceUrl: item.link, sourceDate, status: 'draft' };
  const created = [];
  const exists = await CurrentAffair.findOne({ sourceUrl: item.link, language: 'en' }).select('_id');
  if (!exists) {
    const en = await CurrentAffair.create({ ...base, language: 'en' });
    created.push(en);
  }
  if (json.hi && json.hi.question && Array.isArray(json.hi.options) && json.hi.options.length === 4 && Number.isInteger(json.hi.correctAnswer ?? json.correctAnswer)) {
    const hiExists = await CurrentAffair.findOne({ sourceUrl: item.link, language: 'hi' }).select('_id');
    if (!hiExists) {
      const hi = await CurrentAffair.create({ ...base, ...json.hi, correctAnswer: Number.isInteger(json.hi.correctAnswer) ? json.hi.correctAnswer : json.correctAnswer, language: 'hi' });
      created.push(hi);
    }
  }
  return created;
}
async function fetchFeedXml(feedUrl) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(feedUrl, {
        headers: {
          Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
          'User-Agent': 'QuizApp-GovernmentExam-FeedImporter/1.0'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(25000)
      });
      if (!response.ok) throw new Error('Feed HTTP ' + response.status);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 1500));
    }
  }
  throw lastError || new Error('Feed request failed');
}

async function importCurrentAffairs() {
  const feeds = (process.env.CURRENT_AFFAIRS_FEED_URLS || '').split(',').map(v => v.trim()).filter(Boolean);
  const hosts = (process.env.CURRENT_AFFAIRS_ALLOWED_HOSTS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
  const stats = { status: 'ok', feeds: 0, items: 0, drafts: 0, skipped: 0, errors: [] };
  if (!feeds.length || !hosts.length) {
    return { ...stats, status: 'skipped', reason: 'No permitted Current Affairs RSS/Atom feeds configured; see GOVERNMENT-DATA-AUTOMATION.md.' };
  }
  for (const feedUrl of feeds) {
    if (!allowedFeed(feedUrl, hosts)) { stats.errors.push('Blocked feed URL: ' + feedUrl); continue; }
    try {
      const xml = await fetchFeedXml(feedUrl);
      const items = parseRss(xml).slice(0, 30);
      stats.feeds++; stats.items += items.length;
      const host = new URL(feedUrl).hostname;
      for (const item of items) {
        try {
          const result = await createQuestionFromItem(item, host);
          if (result) stats.drafts += result.length; else stats.skipped++;
        } catch (error) { stats.errors.push(item.link + ': ' + error.message); }
      }
    } catch (error) { stats.errors.push(feedUrl + ': ' + error.message); }
  }
  return stats;
}
module.exports = { decodeXml, tagValue, parseRss, allowedFeed, fetchFeedXml, importCurrentAffairs };
