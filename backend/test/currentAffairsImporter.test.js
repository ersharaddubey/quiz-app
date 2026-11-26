const test = require('node:test');
const assert = require('node:assert/strict');
const { parseRss, allowedFeed, decodeXml } = require('../services/currentAffairsImporter');

test('parses RSS item fields and CDATA safely', () => {
  const xml = '<rss><channel><item><title><![CDATA[Budget &amp; Economy]]></title><description>GDP &lt; forecast</description><link>https://pib.gov.in/item/1</link><pubDate>Wed, 25 Nov 2026 10:00:00 GMT</pubDate></item></channel></rss>';
  const [item] = parseRss(xml);
  assert.equal(item.title, 'Budget & Economy');
  assert.equal(item.description, 'GDP < forecast');
  assert.equal(item.link, 'https://pib.gov.in/item/1');
});
test('rejects non-HTTPS, unlisted and malformed feed URLs', () => {
  assert.equal(allowedFeed('https://pib.gov.in/rss.xml', ['pib.gov.in']), true);
  assert.equal(allowedFeed('http://pib.gov.in/rss.xml', ['pib.gov.in']), false);
  assert.equal(allowedFeed('https://evil.example/rss.xml', ['pib.gov.in']), false);
  assert.equal(allowedFeed('not-a-url', ['pib.gov.in']), false);
});
test('decodes XML entities', () => assert.equal(decodeXml('A &amp; B &#39;C&#39;'), "A & B 'C'"));
