import express from 'express';
import puppeteer from 'puppeteer';

const app = express();
const PORT = process.env.PORT || 3000;

// Riduci l'uso di memoria di Puppeteer
const browserConfig = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage', // Importante per evitare memory issues
    '--single-process' // Riduce l'uso di memoria
  ],
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
};

// Middleware per limitare le richieste
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Endpoint semplificato
app.get('/get-url/:type/:id', async (req, res) => {
  let browser;
  try {
    const { type, id } = req.params;
    const url = `https://vixsrc.to/${type}/${id}?lang=it`;
    
    browser = await puppeteer.launch(browserConfig);
    const page = await browser.newPage();
    
    await page.setExtraHTTPHeaders({
      'Referer': 'https://vixsrc.to',
      'User-Agent': 'Mozilla/5.0'
    });

    const playlistUrl = await new Promise((resolve, reject) => {
      page.on('requestfinished', request => {
        const url = request.url();
        if (url.includes('/playlist/') && url.includes('token=')) {
          resolve(url);
        }
      });
      
      page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 })
        .catch(reject);
    });

    res.json({ url: playlistUrl });
    
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

// Gestione errori globale
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Gestione corretta dello shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});