import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Types
interface Strategy {
  source: 'tradingview' | 'quantconnect'
  source_url: string
  title: string
  author: string | null
  raw_content: string
  status: 'pending'
  created_at?: string
}

interface QuantConnectAlgorithm {
  id: string
  name: string
  description?: string
  code?: string
  author?: string
}

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

// TradingView scraper using deno-dom
class TradingViewScraper {
  private baseUrl = 'https://www.tradingview.com/scripts/'
  
  async scrapeStrategies(): Promise<Strategy[]> {
    const strategies: Strategy[] = []
    
    try {
      log('Starting TradingView scraping')
      
      // Get main scripts page
      const response = await fetch(this.baseUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch TradingView: ${response.status}`)
      }
      
      const html = await response.text()
      
      // Basic HTML parsing using regex and string methods
      const scriptLinks = this.extractScriptLinks(html)
      const processedUrls = new Set<string>()
      
      for (const fullUrl of scriptLinks) {
        // Skip duplicates
        if (processedUrls.has(fullUrl)) continue
        processedUrls.add(fullUrl)
        
        try {
          const scriptDetails = await this.getScriptDetails(fullUrl)
          if (scriptDetails) {
            strategies.push({
              source: 'tradingview',
              source_url: fullUrl,
              title: scriptDetails.title,
              author: scriptDetails.author,
              raw_content: scriptDetails.code,
              status: 'pending'
            })
          }
          
          // Rate limiting
          await delay(3000)
          
        } catch (error) {
          console.error('Error fetching script details:', error)
          await log('Script fetch failed', { url: fullUrl, error: (error as Error).message })
        }
        
        // Limit to 10 scripts per run to avoid rate limits
        if (strategies.length >= 10) break
      }
      
      log('TradingView scraping completed', { count: strategies.length })
      return strategies
      
    } catch (error) {
      log('TradingView scraping failed', { error: (error as Error).message })
      return []
    }
  }
  
  private extractScriptLinks(html: string): string[] {
    const links: string[] = []
    
    // Look for href attributes that contain /script/
    const hrefRegex = /href=["']([^"']+\/script\/[^"']+)["']/gi
    let match
    
    while ((match = hrefRegex.exec(html)) !== null) {
      const url = match[1]
      if (url && !links.includes(url)) {
        const fullUrl = url.startsWith('http') ? url : `https://www.tradingview.com${url}`
        links.push(fullUrl)
      }
    }
    
    return links
  }
  
  private async getScriptDetails(url: string): Promise<{ title: string; author: string | null; code: string } | null> {
    try {
      const response = await fetch(url)
      if (!response.ok) return null
      
      const html = await response.text()
      
      // Extract title using regex
      const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                        html.match(/<title[^>]*>([^<]+)<\/title>/i)
      const title = titleMatch ? titleMatch[1].trim() : 'Unknown Strategy'
      
      // Extract author using regex
      const authorMatch = html.match(/class="[^"]*author[^"]*"[^>]*>([^<]+)</i) ||
                         html.match(/class="[^"]*username[^"]*"[^>]*>([^<]+)</i)
      const author = authorMatch ? authorMatch[1].trim() : null
      
      // Find Pine Script code - look for pre tags
      const codeMatch = html.match(/<pre[^>]*><code[^>]*>([^<]+)<\/code><\/pre>/i) ||
                       html.match(/<pre[^>]*>([^<]+)<\/pre>/i)
      
      if (codeMatch) {
        const code = codeMatch[1].trim()
        
        // Basic validation for Pine Script
        if (code.includes('study(') || code.includes('strategy(') || code.includes('indicator(')) {
          return { title, author, code }
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
  
  async scrapeStrategies(): Promise<Strategy[]> {
    const strategies: Strategy[] = []
    
    try {
      log('Starting QuantConnect scraping')
      
      // Get API key from system config
      const { data: config } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'quantconnect_api_key')
        .single()
      
      const apiKey = config?.value
      if (!apiKey) {
        log('QuantConnect API key not found', { warning: 'Skipping QuantConnect scraping' })
        return []
      }
      
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
      const algorithms: QuantConnectAlgorithm[] = data.backtests || data.algorithms || []
      
      for (const algorithm of algorithms.slice(0, 10)) { // Limit to 10 per run
        try {
          strategies.push({
            source: 'quantconnect',
            source_url: `${this.baseUrl}/backtests/${algorithm.id}`,
            title: algorithm.name || 'Unknown Strategy',
            author: algorithm.author || 'Unknown Author',
            raw_content: algorithm.code || algorithm.description || JSON.stringify(algorithm),
            status: 'pending'
          })
          
          // Rate limiting
          await delay(2000)
          
        } catch (error) {
          console.error('Error processing QuantConnect algorithm:', error)
          await log('Algorithm processing failed', { 
            id: algorithm.id, 
            error: (error as Error).message 
          })
        }
      }
      
      log('QuantConnect scraping completed', { count: strategies.length })
      return strategies
      
    } catch (error) {
      log('QuantConnect scraping failed', { error: (error as Error).message })
      return []
    }
  }
}

// Main handler
async function handler(req: Request): Promise<Response> {
  try {
    const allStrategies: Strategy[] = []
    
    // Scrape TradingView
    const tvScraper = new TradingViewScraper()
    const tvStrategies = await tvScraper.scrapeStrategies()
    allStrategies.push(...tvStrategies)
    
    // Scrape QuantConnect
    const qcClient = new QuantConnectClient()
    const qcStrategies = await qcClient.scrapeStrategies()
    allStrategies.push(...qcStrategies)
    
    // Store in database using upsert to avoid duplicates
    if (allStrategies.length > 0) {
      for (const strategy of allStrategies) {
        await supabase
          .from('absorbed_strategies')
          .upsert({
            source: strategy.source,
            source_url: strategy.source_url,
            title: strategy.title,
            author: strategy.author,
            raw_content: strategy.raw_content,
            status: strategy.status,
            created_at: new Date().toISOString()
          }, {
            onConflict: 'source_url'
          })
      }
    }
    
    const response = {
      success: true,
      message: 'Strategy absorption completed',
      stats: {
        tradingview: tvStrategies.length,
        quantconnect: qcStrategies.length,
        total: allStrategies.length,
        stored: allStrategies.length
      }
    }
    
    await log('Strategy absorption completed', response.stats)
    
    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
    
  } catch (error) {
    log('Strategy absorber failed', { error: (error as Error).message })
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }
}

serve(handler)
