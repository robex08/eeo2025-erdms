/**
 * Bitcoin API Routes - External data proxy
 * Obchází CORS omezení pro externí APIs
 */

const express = require('express');
const https = require('https');
const router = express.Router();

/**
 * GET /bitcoinPrice
 * Stáhne Bitcoin cenová data z Yahoo Finance API
 * Vrací historická data od 2021 s týdenními intervaly
 */
router.get('/bitcoinPrice', async (req, res) => {
  console.log('🟢 Bitcoin API: bitcoinPrice endpoint called');
  
  try {
    // Parametry pro Yahoo Finance API
    const fromDate = Math.floor(new Date('2021-01-01').getTime() / 1000);
    const toDate = Math.floor(Date.now() / 1000);
    const symbol = 'BTC-USD';
    const interval = '1wk'; // týdenní data
    
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${fromDate}&period2=${toDate}&interval=${interval}`;
    
    console.log(`🔗 Fetching from Yahoo Finance: ${yahooUrl}`);
    
    // Proveď HTTP request na Yahoo Finance
    const data = await fetchYahooFinanceData(yahooUrl);
    
    if (!data.chart?.result?.[0]?.timestamp) {
      throw new Error('Invalid Yahoo Finance response format');
    }
    
    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const prices = result.indicators.quote[0].close;
    
    // Zpracuj data pro frontend
    const processedData = timestamps.map((timestamp, index) => ({
      date: new Date(timestamp * 1000).toISOString(),
      price: Math.round(prices[index] || 0)
    })).filter(point => point.price > 0); // Odfiltruj null hodnoty
    
    const currentPrice = processedData.length > 0 
      ? processedData[processedData.length - 1].price 
      : null;
    
    console.log(`✅ Bitcoin API: Loaded ${processedData.length} price points, current: $${currentPrice}`);
    
    // Vrať odpověď ve standardním formátu
    res.json({
      success: true,
      data: processedData,
      currentPrice: currentPrice,
      source: 'Yahoo Finance',
      symbol: symbol,
      interval: interval,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Bitcoin API error:', error);
    
    // Vrať chybu ve standardním formátu
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch Bitcoin data from Yahoo Finance',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Pomocná funkce - HTTP request na Yahoo Finance
 * @param {string} url - Yahoo Finance API URL
 * @returns {Promise<Object>} - Parsed JSON response
 */
function fetchYahooFinanceData(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ERDMS-API/1.0)',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate'
      }
    }, (response) => {
      let data = '';
      
      // Zpracuj compressed response
      const { createGunzip } = require('zlib');
      const decoder = response.headers['content-encoding'] === 'gzip' 
        ? createGunzip() 
        : response;
      
      if (response.headers['content-encoding'] === 'gzip') {
        response.pipe(decoder);
      } else {
        decoder = response;
      }
      
      decoder.on('data', chunk => {
        data += chunk;
      });
      
      decoder.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (parseError) {
          reject(new Error(`JSON parse error: ${parseError.message}`));
        }
      });
      
      decoder.on('error', (error) => {
        reject(new Error(`Decompression error: ${error.message}`));
      });
    });
    
    request.on('error', (error) => {
      reject(new Error(`HTTP request error: ${error.message}`));
    });
    
    request.setTimeout(10000, () => {
      request.abort();
      reject(new Error('Request timeout (10s)'));
    });
  });
}

module.exports = router;