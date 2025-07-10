// scraper-server.js
import express from 'express';
import puppeteer from 'puppeteer';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());

// Configurazione condivisa per Puppeteer
const launchOptions = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process'
  ],
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
};

async function getPlaylistUrlFromPage(url) {
  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  try {
    // Configurazione degli header e delle richieste
    await page.setExtraHTTPHeaders({
      'Referer': 'https://vixsrc.to',
      'Origin': 'https://vixsrc.to',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });

    // Abilita il logging delle richieste
    page.on('request', request => {
      console.log('Request:', request.url());
    });

    page.on('response', response => {
      if (response.url().includes('/playlist/') && response.url().includes('token=') && response.url().includes('h=1')) {
        console.log('Playlist found:', response.url());
      }
    });

    // Navigazione con timeout più lungo
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Attesa esplicita per il caricamento dello stream
    const playlistUrl = await page.evaluate(() => {
      const iframe = document.querySelector('iframe');
      return iframe ? iframe.src : null;
    });

    if (!playlistUrl) {
      throw new Error('Playlist URL non trovata nella pagina');
    }

    return playlistUrl;
  } finally {
    await browser.close();
  }
}

// Movie endpoint
app.get('/getStream/movie/:id', async (req, res) => {
  const { id } = req.params;
  const url = `https://vixsrc.to/movie/${id}?lang=it`;

  try {
    console.log(`Scraping movie ${id} from ${url}`);
    const playlistUrl = await getPlaylistUrlFromPage(url);
    console.log(`Found playlist: ${playlistUrl}`);
    res.json({ url: playlistUrl });
  } catch (err) {
    console.error('Error scraping movie:', err);
    res.status(500).json({ 
      error: 'Errore durante l\'estrazione del film',
      details: err.message 
    });
  }
});

// Serie endpoint
app.get('/getStream/series/:id/:season/:episode', async (req, res) => {
  const { id, season, episode } = req.params;
  const url = `https://vixsrc.to/tv/${id}/${season}/${episode}?lang=it`;

  try {
    console.log(`Scraping episode S${season}E${episode} from ${url}`);
    const playlistUrl = await getPlaylistUrlFromPage(url);
    console.log(`Found playlist: ${playlistUrl}`);
    res.json({ url: playlistUrl });
  } catch (err) {
    console.error('Error scraping episode:', err);
    res.status(500).json({ 
      error: 'Errore durante l\'estrazione episodio',
      details: err.message 
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Scraper server attivo su http://localhost:${PORT}`);
});