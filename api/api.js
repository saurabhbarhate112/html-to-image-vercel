import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Handle GET request (health check)
  if (req.method === 'GET') {
    return res.status(200).json({
      message: 'HTML to Image API is running on Vercel!',
      usage: 'Send POST request with { "html": "<html>...</html>" }',
      parameters: {
        html: 'Required - HTML content to convert',
        width: 'Optional - Image width (default: 1024)',
        height: 'Optional - Image height (default: 1024)',
        format: 'Optional - png or jpeg (default: png)'
      }
    });
  }

  try {
    const { html, width = 800, height = 600, format = 'png' } = req.body;

    if (!html) {
      return res.status(400).json({ error: 'HTML content is required' });
    }

    // Launch browser with Vercel-optimized settings
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ 
      width: parseInt(width), 
      height: parseInt(height) 
    });

    // Set HTML content with shorter timeout for Vercel
    await page.setContent(html, { 
      waitUntil: 'domcontentloaded',
      timeout: 8000 
    });

    // Take screenshot
    const screenshot = await page.screenshot({
      type: format === 'jpeg' ? 'jpeg' : 'png',
      fullPage: true,
      encoding: 'base64',
      quality: format === 'jpeg' ? 90 : undefined
    });

    await browser.close();

    // Return response
    res.status(200).json({
      success: true,
      image: `data:image/${format};base64,${screenshot}`,
      format: format,
      width: parseInt(width),
      height: parseInt(height)
    });

  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({
      error: 'Failed to convert HTML to image',
      details: error.message,
      tip: 'Try simpler HTML or smaller dimensions'
    });
  }
}
