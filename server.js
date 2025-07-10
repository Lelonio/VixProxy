import express from 'express';
import puppeteer from 'puppeteer';

const app = express();
const PORT = 3000;

// Configurazione CORS minima
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// Configurazione base di Puppeteer
const launchOptions = {
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  timeout: 10000
};

async function findPlaylistUrl(url) {
  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  try {
    await page.setExtraHTTPHeaders({
      'Referer': 'https://vixsrc.to',
      'User-Agent': 'Mozilla/5.0'
    });

    // 1. Tentativo: Monitoraggio richieste di rete
    const playlistUrl = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject('Timeout'), 10000);

      page.on('requestfinished', (request) => {
        const url = request.url();
        if (url.includes('/playlist/') && url.includes('token=')) {
          clearTimeout(timeout);
          resolve(url);
        }
      });

      page.goto(url).catch(reject);
    });

    return playlistUrl;

  } finally {
    await browser.close();
  }
}

// Endpoint per film
app.get('/get/movie/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const targetUrl = `https://vixsrc.to/movie/${id}?lang=it`;
    
    const playlistUrl = await findPlaylistUrl(targetUrl);
    res.json({ url: playlistUrl });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint per serie TV
app.get('/get/series/:id/:season/:episode', async (req, res) => {
  try {
    const { id, season, episode } = req.params;
    const targetUrl = `https://vixsrc.to/tv/${id}/${season}/${episode}?lang=it`;
    
    const playlistUrl = await findPlaylistUrl(targetUrl);
    res.json({ url: playlistUrl });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔍 Playlist Finder avviato su http://0.0.0.0:${PORT}`);
});