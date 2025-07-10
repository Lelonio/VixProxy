// scraper-server.js
import express from 'express';
import puppeteer from 'puppeteer';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());

function getPlaylistUrlFromPage(url) {
  return new Promise(async (resolve, reject) => {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({ Referer: 'https://vixsrc.to' });

      const timeout = setTimeout(() => reject('Timeout'), 15000);

      page.on('requestfinished', request => {
        const u = request.url();
        if (u.includes('/playlist/') && u.includes('token=') && u.includes('h=1')) {
          clearTimeout(timeout);
          resolve(u);
        }
      });

      await page.goto(url, { waitUntil: 'domcontentloaded' });
    } catch (err) {
      reject(err);
    } finally {
      setTimeout(() => browser.close(), 5000);
    }
  });
}

// Movie endpoint
app.get('/getStream/movie/:id', async (req, res) => {
  const { id } = req.params;
  const url = `https://vixsrc.to/movie/${id}?lang=it`;

  try {
    const playlistUrl = await getPlaylistUrlFromPage(url);
    res.json({ url: playlistUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore durante l\'estrazione del film' });
  }
});

// Serie endpoint
app.get('/getStream/series/:id/:season/:episode', async (req, res) => {
  const { id, season, episode } = req.params;
  const url = `https://vixsrc.to/tv/${id}/${season}/${episode}?lang=it`;

  try {
    const playlistUrl = await getPlaylistUrlFromPage(url);
    res.json({ url: playlistUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore durante l\'estrazione episodio' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Scraper server attivo su http://localhost:${PORT}`);
});
