const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());
dotenv.config();

const CONFIG_PATH = path.join(__dirname, 'config.json');
const DESCRIPTION_PATH = path.join(__dirname, 'description.txt');
const RESULT_PATH = path.join(__dirname, 'result.html');


if (!fs.existsSync(CONFIG_PATH)) {
  console.error('config.json is missing. please re-clone it.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

config.token = process.env.TOKEN || config.token;
config.cookie = process.env.COOKIE || config.cookie;
config.listingId = process.env.LISTING_ID || config.listingId;

if (!config.listingId) {
  console.error('listingId is missing in config.json or environment');
  process.exit(1);
}

if (!config.cookie) {
  console.error('cookie is missing in config.json or environment');
  process.exit(1);
}

config.hourlyRate = config.hourlyRate || 50;
config.updateIntervalMs = config.updateIntervalMs || 15000;
config.tutorType = config.tutorType || 'University Student';
config.tutoringTypes = config.tutoringTypes || { onlineHelp: true, oneOnOne: true };

let updateCounter = 0;
let browser;
let page;
async function initBrowser() {
  console.log('Starting headless chrome...');
  browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });

  page = await browser.newPage();

  const cookies = config.cookie.split(';')
    .map(pair => {
      const parts = pair.trim().split('=');
      if (parts.length < 2) return null;
      return {
        name: parts[0].trim(),
        value: parts.slice(1).join('=').trim(),
        domain: '.highschooltutors.com.au',
        path: '/'
      };
    })
    .filter(Boolean);

  if (cookies.length > 0) {
    await page.setCookie(...cookies);
  }

  console.log('[*] Session established. Navigating to edit page...');
  await page.goto(`https://highschooltutors.com.au/listings/${config.listingId}/edit`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  if ((await page.title()).includes('Cloudflare')) {
    console.log('[!] We hit a Cloudflare JS Challenge. Waiting 10s for it to solve itself...');
    await new Promise(r => setTimeout(r, 10000));
  }
}

async function updateListing() {
  if (!page || page.isClosed()) return;

  const timestamp = new Date().toISOString();

  let description = fs.existsSync(DESCRIPTION_PATH)
    ? fs.readFileSync(DESCRIPTION_PATH, 'utf-8')
    : "Placeholder description.";
  updateCounter++;
  if (updateCounter % 2 === 1) {
    description += ".";
  } else {
    description = description.slice(0, -1);
  }

  try {
    const result = await page.evaluate(async (cfg, desc) => {
      if (document.title.includes('Cloudflare')) {
        return { success: false, status: 403, error: 'Challenge visible', html: document.body.innerHTML };
      }

      const domToken = document.querySelector('input[name="_token"]')?.value;
      const finalToken = domToken || cfg.token;

      if (!finalToken) {
        return { success: false, status: 0, error: 'Missing _token in DOM and config.json', html: document.body.innerHTML };
      }

      const payload = new URLSearchParams({
        _token: finalToken,
        _method: 'PUT',
        type: cfg.tutorType,
        hourly_rate: cfg.hourlyRate.toString(),
        description: desc
      });

      const typeMap = {
        oneOnOne: 'one_on_one_tutoring',
        group: 'group_tutoring',
        homeVisits: 'home_visits',
        teachingStudio: 'teaching_studio',
        phoneHelp: 'phone_help',
        onlineHelp: 'online_help',
        inPerson: 'in_person'
      };

      for (const [key, backendField] of Object.entries(typeMap)) {
        payload.append(backendField, '0');
        if (cfg.tutoringTypes[key]) {
          payload.append(backendField, '1');
        }
      }

      const res = await fetch(`https://highschooltutors.com.au/listings/${cfg.listingId}`, {
        method: 'POST',
        headers: {
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: payload.toString()
      });

      return {
        success: res.ok,
        status: res.status,
        html: await res.text()
      };
    }, config, description);

    if (result.success) {
      console.log(`[${timestamp}] Updated listing ${config.listingId} (Status: ${result.status})`);
    } else {
      console.log(`[${timestamp}] Failed to update listing ${config.listingId}. Status: ${result.status}`);
      if (result.error) console.log(`Error: ${result.error}`);

      if (result.html?.includes('Cloudflare') || result.status === 403) {
        console.log(`Cloudflare challenge encountered. Reloading page natively...`);
        await page.reload({ waitUntil: 'domcontentloaded' });
      } else if (result.html?.includes('<title>Sign in')) {
        console.log(`expired session - cookies are invalid or expired. update config.json`);
      }
    }

  } catch (err) {
    console.error(`[${timestamp}] Execution Error: ${err.message}`);
    if (err.message.includes('Session closed') || err.message.includes('Target closed')) {
      console.log(`Restarting completely...`);
      await initBrowser();
    }
  }
}

async function start() {
  console.log(`
  HighSchoolTutors Profile Booster
    Listing ID: ${config.listingId}
    Hourly Rate: $${config.hourlyRate}
    Update Interval: ${config.updateIntervalMs}ms
  `);

  try {
    await initBrowser();
    await updateListing();
    setInterval(updateListing, config.updateIntervalMs);
  } catch (err) {
    console.error('\n startup crash:', err);
    if (browser) await browser.close();
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('\n shutting down...');
  if (browser) await browser.close();
  process.exit(0);
});

start();