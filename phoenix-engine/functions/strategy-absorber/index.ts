import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Cheerio, load } from 'https://deno.land/x/cheerio@1.0.7/mod.ts'

// Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Rate limiting delay (2-5 seconds)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Logging function
const log = async (message: string, details: any = {}) => {
  console.log(message, details)
  await supabase.from('system_logs').insert({
    log_type: 'strategy_absorber',
    message,
    details
  })
}

// TradingView scraper
class TradingViewScraper {
  private baseUrl = 'https://www.tradingview.com/scripts/'
  
  async scrapeStrategies(): Promise<any[]> {
    const strategies = []
    
    try {
      log('Starting TradingView scraping')
      
      // Get the main scripts page
      const response = await fetch(this.baseUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch TradingView: ${response.status}`)
      }
      
      const html = await response.text()
      const $ = load(html)
      
      // Parse script cards (adjust selectors based on TradingView's actual HTML structure)
      $('.script-card, .tv-script-card, .script-item').each(async (index, element) => {
        try {
          const $card = $(element)
          const title = $card.find('.title, .script-title, h3, h4').first().text().trim()
          const author = $card.find('.author, .username, .by-author').first().text().trim()
          const scriptUrl = $card.find('a').first().attr('href')
          
          if (title && scriptUrl) {
            const fullUrl = scriptUrl.startsWith('http') ? scriptUrl : `https://www.tradingview.com${scriptUrl}`
            
            // Get the script details page
            await delay(3000) // Rate limiting
            const scriptDetails = await this.getScriptDetails(fullUrl)
            
            if (scriptDetails) {
              strategies.push({
                source: 'tradingview',
                source_url: fullUrl,
                title,
                author: author || null,
                raw_content: scriptDetails,
                status: 'pending'
              })
            }
          }
        } catch (error) {
          console.error('Error parsing script card:', error)
        }
      })
      
      log('TradingView scraping completed', { count: strategies.length })
      return strategies
      
    } catch (error) {
      log('TradingView scraping failed', { error: (error as Error).message })
      return []
    }
  }
  
  private async getScriptDetails(url: string): Promise<string | null> {
    try {
      const response = await fetch(url)
      if (!response.ok) return null
      
      const html = await response.text()
      const $ = load(html)
      
      // Try to find the Pine Script code (common patterns)
      const codeElement = $('pre code, .code-container, .script-code, .pine-script').first()
      
      if (codeElement.length > 0) {
        return codeElement.text().trim()
      }
      
      // Fallback: look for any pre tag with code-like content
      const preElement = $('pre').first()
      if (preElement.length > 0) {
        const content = preElement.text().trim()
        // Basic validation for Pine Script
        if (content.includes('study(') || content.includes('strategy(') || content.includes('indicator(')) {
          return content
        }
      }
      
      return null
      
    } catch (error) {
      console.error('Error fetching script details:', error)
      return null
    }
  }
}

// QuantConnect API client
class QuantConnectClient {
  private baseUrl = 'https://www.quantconnect.com/api/v2'
  
  async scrapeStrategies(): Promise<any[]> {
    try {
      log('Starting QuantConnect scraping')
      
      // Get API key from system config
      const { data: config } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'quantconnect_api_key')
        .single()
      
      if (!config || !config.value) {
        log('QuantConnect API key not found, skipping')
        return []
      }
      
      const apiKey = config.value
      const strategies = []
      
      // Fetch popular algorithms
      const popularUrl = `${this.baseUrl}/backtests/popular`
      const response = await fetch(popularUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`QuantConnect API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Process each algorithm
      if (data.backtests && Array.isArray(data.backtests)) {
        for (const backtest of data.backtests) {
          try {
            await delay(2000) // Rate limiting
            
            const details = await this.getAlgorithmDetails(backtest.id, apiKey)
            if (details) {
              strategies.push({
                source: 'quantconnect',
                source_url: `${this.baseUrl}/backtests/${backtest.id}`,
                title: backtest.name || backtest.title || 'Unknown Strategy',
                author: backtest.author || null,
                raw_content: JSON.stringify(details),
                status: 'pending'
              })
            }
          } catch (error) {
            console.error('Error processing QuantConnect algorithm:', error)
          }
        }
      }
      
      log('QuantConnect scraping completed', { count: strategies.length })
      return strategies
      
    } catch (error) {
      log('QuantConnect scraping failed', { error: (error as Error).message })
      return []
    }
  }
  
  private async getAlgorithmDetails(backtestId: string, apiKey: string): Promise<any | null> {
    try {
      const url = `${this.baseUrl}/backtests/${backtestId}`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) return null
      
      const details = await response.json()
      
      // Extract relevant information
      return {
        backtestId,
        code: details.code || details.sourceCode || '',
        language: details.language || 'C#',
        parameters: details.parameters || {},
        statistics: details.statistics || {},
        createdAt: details.created || details.createdAt
      }
      
    } catch (error) {
      console.error('Error fetching algorithm details:', error)
      return null
    }
  }
}

// Main handler
serve(async (req) => {
  try {
    log('Strategy absorber started')
    
    const tvScraper = new TradingViewScraper()
    const qcClient = new QuantConnectClient()
    
    // Scrape from both sources
    const [tvStrategies, qcStrategies] = await Promise.all([
      tvScraper.scrapeStrategies(),
      qcClient.scrapeStrategies()
    ])
    
    const allStrategies = [...tvStrategies, ...qcStrategies]
    
    if (allStrategies.length === 0) {
      log('No strategies found')
      return new Response(
        JSON.stringify({ message: 'No strategies found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Insert strategies into database
    const { data, error } = await supabase
      .from('absorbed_strategies')
      .insert(allStrategies)
      .select()
    
    if (error) {
      log('Failed to insert strategies', { error: (error as Error).message })
      throw error
    }
    
    log('Successfully inserted strategies', { count: data.length })
    
    // Add strategies to parsing queue
    const queueEntries = data.map(strategy => ({
      strategy_id: strategy.id,
      priority: 1,
      status: 'pending'
    }))
    
    const { error: queueError } = await supabase
      .from('parsing_queue')
      .insert(queueEntries)
    
    if (queueError) {
      log('Failed to add strategies to parsing queue', { error: (queueError as Error).message })
    } else {
      log('Added strategies to parsing queue', { count: queueEntries.length })
    }
    
    return new Response(
      JSON.stringify({ 
        message: 'Strategy absorption completed',
        tvStrategies: tvStrategies.length,
        qcStrategies: qcStrategies.length,
        total: allStrategies.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    log('Strategy absorber failed', { error: (error as Error).message })
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
