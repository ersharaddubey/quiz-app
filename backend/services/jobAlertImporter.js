const JobAlert = require('../models/JobAlert');
const { parseRss, allowedFeed } = require('./currentAffairsImporter');

async function normalizeJobItem(item) {
  const endpoint = process.env.QUESTION_AI_API_URL;
  const apiKey = process.env.QUESTION_AI_API_KEY;
  if (!endpoint || !apiKey) throw new Error('Question AI provider is not configured');
  let response;
  let payload;
  for (let attempt = 1; attempt <= 4; attempt++) {
    response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: String(process.env.QUESTION_AI_MODEL || 'openai/gpt-oss-20b').trim(),
      temperature: 0.1, max_tokens: 700,
      messages: [
        { role: 'system', content: 'Extract a government recruitment notice from the supplied official source text. Return JSON only: {"skip":true} if it is not clearly a recruitment/admit-card/result notice. Otherwise {"skip":false,"title":"...","organization":"...","description":"...","vacancies":null,"applicationStart":null,"applicationEnd":null,"examDate":null,"noticeType":"vacancy|admit-card|result|other"}. Dates must be ISO YYYY-MM-DD only when explicitly present; otherwise null. Never invent dates, vacancy counts or eligibility.' },
        { role: 'user', content: JSON.stringify({ title: item.title, description: item.description.slice(0, 5000), officialUrl: item.link, publishedAt: item.date }) }
      ]
    }),
    signal: AbortSignal.timeout(25000)
    });
    payload = await response.json().catch(() => ({}));
    if (response.ok) break;
    const message = payload.error?.message || 'AI provider request failed';
    if (response.status !== 429 || attempt === 4) throw new Error(message);
    const retryMatch = message.match(/try again in ([0-9.]+)s/i);
    const waitMs = Math.max(8000, Math.min(20000, retryMatch ? Number(retryMatch[1]) * 1000 + 1000 : 10000));
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }
  if (!response.ok) throw new Error(payload.error?.message || 'AI provider request failed');
  const raw = payload.choices?.[0]?.message?.content || '';
  return JSON.parse(raw.replace(/^\s*\x60{3}(?:json)?/i, '').replace(/\x60{3}\s*$/i, '').trim());
}
async function importJobAlertDrafts() {
  const feeds = (process.env.JOB_ALERT_FEED_URLS || '').split(',').map(v => v.trim()).filter(Boolean);
  const hosts = (process.env.JOB_ALERT_ALLOWED_HOSTS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
  const stats = { status: 'ok', feeds: 0, items: 0, drafts: 0, skipped: 0, errors: [] };
  if (!feeds.length || !hosts.length) {
    return { ...stats, status: 'skipped', reason: 'No permitted recruitment RSS/Atom feeds configured; see GOVERNMENT-DATA-AUTOMATION.md.' };
  }
  for (const feedUrl of feeds) {
    if (!allowedFeed(feedUrl, hosts)) { stats.errors.push('Blocked feed URL: ' + feedUrl); continue; }
    try {
      const response = await fetch(feedUrl, { headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' }, redirect: 'error', signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error('Feed HTTP ' + response.status);
      const items = parseRss(await response.text()).slice(0, 10);
      stats.feeds++; stats.items += items.length;
      for (const item of items) {
        try {
          if (await JobAlert.exists({ officialUrl: item.link })) { stats.skipped++; continue; }
          const extracted = await normalizeJobItem(item);
          if (!extracted || extracted.skip || !extracted.title || !extracted.organization) { stats.skipped++; continue; }
          await JobAlert.create({
            title: extracted.title,
            organization: extracted.organization,
            description: extracted.description || item.description,
            vacancies: Number.isInteger(extracted.vacancies) && extracted.vacancies >= 0 ? extracted.vacancies : null,
            applicationStart: extracted.applicationStart || null,
            applicationEnd: extracted.applicationEnd || null,
            examDate: extracted.examDate || null,
            officialUrl: item.link,
            status: 'draft',
            sourceVerifiedAt: null
          });
          stats.drafts++;
        } catch (error) { stats.errors.push(item.link + ': ' + error.message); }
      }
    } catch (error) { stats.errors.push(feedUrl + ': ' + error.message); }
  }
  return stats;
}
module.exports = { importJobAlertDrafts, normalizeJobItem };
