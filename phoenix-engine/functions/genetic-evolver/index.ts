import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Import genetic algorithm (assuming it's available in the project)
// For Edge Function, we'll implement a simplified version inline
interface Strategy {
  id: string
  source: string
  title: string
  author: string | null
  raw_content: string
  parsed_content?: any[]
  market?: string
  fitness?: number
  is_active?: boolean
  status: 'pending' | 'approved' | 'rejected' | 'processing'
}

interface EvolvedStrategy {
  parent_strategy_id?: string
  name: string
  description: string
  code: string
  parameters: Record<string, any>
  performance_metrics: Record<string, any>
  generation: number
  fitness_score: number
  status: 'created' | 'testing' | 'active' | 'inactive' | 'failed'
  is_active: boolean
}

interface GeneticConfig {
  populationSize: number
  generations: number
  mutationRate: number
  crossoverRate: number
  elitismCount: number
  tournamentSize: number
}

// Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Logging function
const log = async (message: string, details: any = {}) => {
  console.log(message, details)
  await supabase.from('system_logs').insert({
    log_type: 'genetic_evolver',
    message,
    details
  })
}

// Simplified genetic algorithm for Edge Function
class GeneticAlgorithm {
  private config: GeneticConfig

  constructor(config: GeneticConfig) {
    this.config = config
  }

  async evolve(strategies: Strategy[]): Promise<EvolvedStrategy[]> {
    console.log(`Starting evolution with ${strategies.length} seed strategies`)
    
    let population = this.initializePopulation(strategies)
    const evolutionHistory: EvolvedStrategy[] = []

    for (let generation = 0; generation < this.config.generations; generation++) {
      console.log(`Generation ${generation + 1}/${this.config.generations}`)
      
      // Evaluate fitness
      population = await this.evaluatePopulation(population)
      
      // Keep best individuals (elitism)
      const sorted = [...population].sort((a, b) => b.fitness_score - a.fitness_score)
      const elite = sorted.slice(0, this.config.elitismCount)
      
      // Create next generation
      const nextGeneration: EvolvedStrategy[] = []
      
      // Add elite individuals
      nextGeneration.push(...elite)
      
      // Fill rest with crossover and mutation
      while (nextGeneration.length < this.config.populationSize) {
        const parent1 = this.tournamentSelection(population)
        const parent2 = this.tournamentSelection(population)
        
        let offspring = this.crossover(parent1, parent2)
        offspring = this.mutate(offspring)
        
        nextGeneration.push(offspring)
      }
      
      population = nextGeneration
    }

    // Final evaluation and return best strategies
    population = await this.evaluatePopulation(population)
    return population.sort((a, b) => b.fitness_score - a.fitness_score)
  }

  private initializePopulation(seedStrategies: Strategy[]): EvolvedStrategy[] {
    const population: EvolvedStrategy[] = []
    
    // Convert seed strategies to evolved format
    for (const strategy of seedStrategies) {
      population.push({
        parent_strategy_id: strategy.id,
        name: `Evolved ${strategy.title}`,
        description: `Evolved from ${strategy.title}`,
        code: strategy.raw_content,
        parameters: this.parseParameters(strategy.raw_content),
        performance_metrics: {},
        generation: 0,
        fitness_score: 0,
        status: 'created',
        is_active: true
      })
    }

    // Fill with random variations
    while (population.length < this.config.populationSize) {
      const randomParent = seedStrategies[Math.floor(Math.random() * seedStrategies.length)]
      const mutated = this.mutate({
        parent_strategy_id: randomParent.id,
        name: `Variant ${randomParent.title}`,
        description: `Variant of ${randomParent.title}`,
        code: randomParent.raw_content,
        parameters: this.parseParameters(randomParent.raw_content),
        performance_metrics: {},
        generation: 0,
        fitness_score: 0,
        status: 'created',
        is_active: true
      })
      population.push(mutated)
    }

    return population
  }

  private async evaluatePopulation(population: EvolvedStrategy[]): Promise<EvolvedStrategy[]> {
    for (const individual of population) {
      if (individual.fitness_score === 0) {
        individual.fitness_score = await this.evaluateFitness(individual)
      }
    }
    return population
  }

  private async evaluateFitness(strategy: EvolvedStrategy): Promise<number> {
    try {
      // Simplified fitness evaluation - in production, use actual backtesting
      let score = 50 // Base score
      
      // Score based on parameters
      const params = strategy.parameters
      if (params.risk && params.risk <= 0.05) score += 20 // Low risk is good
      if (params.indicators && params.indicators.length > 0) score += 15 // Has indicators
      if (params.timeframe) score += 10 // Has timeframe
      if (params.stopLoss) score += 15 // Has stop loss
      if (params.takeProfit) score += 15 // Has take profit
      
      // Add randomness to simulate market conditions
      score += (Math.random() - 0.5) * 30
      
      return Math.max(0, Math.min(100, score))
    } catch (error) {
      console.error('Fitness evaluation failed:', error)
      return 0
    }
  }

  private tournamentSelection(population: EvolvedStrategy[]): EvolvedStrategy {
    const tournamentSize = Math.min(3, population.length)
    const tournament: EvolvedStrategy[] = []
    
    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * population.length)
      tournament.push(population[randomIndex])
    }
    
    return tournament.reduce((best, current) => 
      current.fitness_score > best.fitness_score ? current : best
    )
  }

  private crossover(parent1: EvolvedStrategy, parent2: EvolvedStrategy): EvolvedStrategy {
    const offspring: EvolvedStrategy = {
      parent_strategy_id: parent1.parent_strategy_id,
      name: `Cross ${parent1.name} × ${parent2.name}`,
      description: `Crossover of ${parent1.name} and ${parent2.name}`,
      code: parent1.code,
      parameters: {},
      performance_metrics: {},
      generation: Math.max(parent1.generation, parent2.generation) + 1,
      fitness_score: 0,
      status: 'created'
    }

    // Mix parameters
    const params1 = parent1.parameters
    const params2 = parent2.parameters
    
    for (const key of new Set([...Object.keys(params1), ...Object.keys(params2)])) {
      offspring.parameters[key] = Math.random() < 0.5 ? params1[key] : params2[key]
    }

    return offspring
  }

  private mutate(strategy: EvolvedStrategy): EvolvedStrategy {
    return {
      ...strategy,
      parameters: Object.fromEntries(
        Object.entries(strategy.parameters).map(([key, value]) => [
          key,
          this.mutateParameter(key, value)
        ])
      ),
      generation: strategy.generation + 1,
      status: 'created'
    }
  }

  private mutateParameter(key: string, value: any): any {
    if (typeof value === 'number') {
      return value * (1 + (Math.random() - 0.5) * 0.2)
    } else if (typeof value === 'boolean') {
      return Math.random() < 0.5 ? !value : value
    }
    return value
  }

  private parseParameters(rawContent: string): Record<string, any> {
    try {
      return JSON.parse(rawContent)
    } catch {
      // Simple parameter extraction
      return {
        risk: 0.02,
        indicators: ['RSI', 'MACD'],
        timeframe: '1h',
        stopLoss: true,
        takeProfit: true
      }
    }
  }
}

// Main handler
serve(async (req) => {
  // Only allow POST requests (cron trigger)
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    log('Genetic evolver started')
    
    // Get configuration from system_config
    const { data: configs } = await supabase
      .from('system_config')
      .select('key, value')
      .in('key', [
        'genetic_population_size',
        'genetic_generations',
        'genetic_mutation_rate',
        'genetic_crossover_rate',
        'genetic_elitism_count'
      ])

    const configMap = new Map(configs?.map(c => [c.key, parseFloat(c.value)]) || [])
    
    const config: GeneticConfig = {
      populationSize: configMap.get('genetic_population_size') || 50,
      generations: configMap.get('genetic_generations') || 20,
      mutationRate: configMap.get('genetic_mutation_rate') || 0.1,
      crossoverRate: configMap.get('genetic_crossover_rate') || 0.8,
      elitismCount: configMap.get('genetic_elitism_count') || 5,
      tournamentSize: 3
    }

    // Get approved strategies from absorbed_strategies
    const { data: approvedStrategies, error: strategiesError } = await supabase
      .from('absorbed_strategies')
      .select('*')
      .eq('status', 'approved')
      .limit(config.populationSize)

    if (strategiesError) {
      throw strategiesError
    }

    if (!approvedStrategies || approvedStrategies.length === 0) {
      log('No approved strategies found for evolution')
      return new Response(
        JSON.stringify({ message: 'No approved strategies found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Run genetic algorithm
    const ga = new GeneticAlgorithm(config)
    const evolvedStrategies = await ga.evolve(approvedStrategies)

    // Store results in database
    const resultsToInsert = evolvedStrategies.slice(0, 10) // Keep top 10
    
    for (const strategy of resultsToInsert) {
      strategy.status = 'created'
    }

    const { data: insertedStrategies, error: insertError } = await supabase
      .from('evolved_strategies')
      .insert(resultsToInsert)
      .select()

    if (insertError) {
      throw insertError
    }

    // Mark best strategy as active for each market
    const markets = [...new Set(resultsToInsert.map(s => s.parameters.market))]
    
    for (const market of markets) {
      const bestForMarket = resultsToInsert
        .filter(s => s.parameters.market === market)
        .sort((a, b) => b.fitness_score - a.fitness_score)[0]

      if (bestForMarket) {
        await supabase
          .from('evolved_strategies')
          .update({ 
            is_active: true,
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', bestForMarket.id)

        // Deactivate other strategies for this market
        await supabase
          .from('evolved_strategies')
          .update({ is_active: false, status: 'inactive' })
          .contains('parameters', `{"market":"${market}"}`)
          .neq('id', bestForMarket.id)
      }
    }

    // Update absorbed_strategies with last used timestamp
    const usedIds = [...new Set(approvedStrategies.map(s => s.id))]
    await supabase
      .from('absorbed_strategies')
      .update({ 
        updated_at: new Date().toISOString(),
        status: 'processed'
      })
      .in('id', usedIds)

    log('Genetic evolution completed', {
      strategiesProcessed: approvedStrategies.length,
      strategiesEvolved: evolvedStrategies.length,
      bestFitness: evolvedStrategies[0]?.fitness_score
    })

    return new Response(
      JSON.stringify({
        message: 'Genetic evolution completed',
        strategiesProcessed: approvedStrategies.length,
        strategiesEvolved: evolvedStrategies.length,
        bestFitness: evolvedStrategies[0]?.fitness_score,
        insertedStrategies: insertedStrategies?.length || 0
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    log('Genetic evolver failed', { error: (error as Error).message })
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
