export interface StrategyGene {
  type: 'indicator' | 'entry' | 'exit' | 'risk'
  name: string
  parameters: Record<string, any>
  weight: number
}

export interface Strategy {
  id: string
  source: string
  title: string
  author: string | null
  raw_content: string
  parsed_content?: StrategyGene[]
  market?: string
  fitness?: number
  is_active?: boolean
  status: 'pending' | 'approved' | 'rejected' | 'processing'
}

export interface Population {
  individuals: Strategy[]
  generation: number
  bestFitness: number
  averageFitness: number
}

export interface GeneticConfig {
  populationSize: number
  generations: number
  mutationRate: number
  crossoverRate: number
  elitismCount: number
  tournamentSize: number
}

export class GeneticAlgorithm {
  private config: GeneticConfig
  private random: () => number

  constructor(config: GeneticConfig, randomFn?: () => number) {
    this.config = config
    this.random = randomFn || Math.random
  }

  /**
   * Evolve a population of strategies
   */
  async evolve(initialPopulation: Strategy[]): Promise<Population[]> {
    let population: Population = {
      individuals: this.initializePopulation(initialPopulation),
      generation: 0,
      bestFitness: 0,
      averageFitness: 0
    }

    const evolutionHistory: Population[] = []

    for (let generation = 0; generation < this.config.generations; generation++) {
      console.log(`Generation ${generation + 1}/${this.config.generations}`)
      
      // Evaluate fitness for all individuals
      population.individuals = await this.evaluatePopulation(population.individuals)
      
      // Calculate statistics
      const fitnesses = population.individuals.map(s => s.fitness || 0)
      population.bestFitness = Math.max(...fitnesses)
      population.averageFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length
      population.generation = generation

      evolutionHistory.push({ ...population })

      // Create next generation
      const nextGeneration = await this.createNextGeneration(population.individuals)
      population.individuals = nextGeneration
    }

    // Final evaluation
    population.individuals = await this.evaluatePopulation(population.individuals)
    population.generation = this.config.generations

    return evolutionHistory
  }

  /**
   * Initialize population from seed strategies
   */
  private initializePopulation(seedStrategies: Strategy[]): Strategy[] {
    const population: Strategy[] = []
    
    // Add seed strategies
    for (const strategy of seedStrategies) {
      population.push(this.cloneStrategy(strategy))
    }

    // Fill remaining population with random variations
    while (population.length < this.config.populationSize) {
      const randomParent = seedStrategies[Math.floor(this.random() * seedStrategies.length)]
      const mutated = this.mutate(this.cloneStrategy(randomParent))
      population.push(mutated)
    }

    return population
  }

  /**
   * Create next generation through selection, crossover, and mutation
   */
  private async createNextGeneration(currentPopulation: Strategy[]): Promise<Strategy[]> {
    const nextGeneration: Strategy[] = []
    const sortedPopulation = [...currentPopulation].sort((a, b) => (b.fitness || 0) - (a.fitness || 0))

    // Elitism: keep best individuals
    for (let i = 0; i < this.config.elitismCount && i < sortedPopulation.length; i++) {
      nextGeneration.push(this.cloneStrategy(sortedPopulation[i]))
    }

    // Fill rest of population
    while (nextGeneration.length < this.config.populationSize) {
      const parent1 = this.tournamentSelection(sortedPopulation)
      const parent2 = this.tournamentSelection(sortedPopulation)

      let offspring: Strategy
      if (this.random() < this.config.crossoverRate) {
        offspring = this.crossover(parent1, parent2)
      } else {
        offspring = this.cloneStrategy(this.random() < 0.5 ? parent1 : parent2)
      }

      if (this.random() < this.config.mutationRate) {
        offspring = this.mutate(offspring)
      }

      nextGeneration.push(offspring)
    }

    return nextGeneration
  }

  /**
   * Tournament selection
   */
  private tournamentSelection(population: Strategy[]): Strategy {
    const tournament: Strategy[] = []
    
    for (let i = 0; i < this.config.tournamentSize; i++) {
      const randomIndex = Math.floor(this.random() * population.length)
      tournament.push(population[randomIndex])
    }

    return tournament.reduce((best, current) => 
      (current.fitness || 0) > (best.fitness || 0) ? current : best
    )
  }

  /**
   * Crossover two parent strategies
   */
  private crossover(parent1: Strategy, parent2: Strategy): Strategy {
    const offspring = this.cloneStrategy(parent1)
    
    // Parse strategies if not already parsed
    if (!offspring.parsed_content && offspring.raw_content) {
      offspring.parsed_content = this.parseStrategyContent(offspring.raw_content)
    }

    const parsed1 = offspring.parsed_content || []
    const parsed2 = parent2.parsed_content || []

    // Crossover genes
    const offspringGenes: StrategyGene[] = []
    const maxGenes = Math.max(parsed1.length, parsed2.length)

    for (let i = 0; i < maxGenes; i++) {
      const gene1 = parsed1[i]
      const gene2 = parsed2[i]
      
      if (gene1 && gene2 && this.random() < 0.5) {
        // Mix parameters
        const mixedParams: Record<string, any> = {}
        const allKeys = new Set([...Object.keys(gene1.parameters), ...Object.keys(gene2.parameters)])
        
        for (const key of allKeys) {
          mixedParams[key] = this.random() < 0.5 ? gene1.parameters[key] : gene2.parameters[key]
        }

        offspringGenes.push({
          ...gene1,
          parameters: mixedParams
        })
      } else if (gene1) {
        offspringGenes.push({ ...gene1 })
      } else if (gene2) {
        offspringGenes.push({ ...gene2 })
      }
    }

    offspring.parsed_content = offspringGenes
    offspring.raw_content = this.serializeStrategy(offspringGenes)
    offspring.fitness = undefined // Reset fitness for re-evaluation

    return offspring
  }

  /**
   * Mutate a strategy
   */
  private mutate(strategy: Strategy): Strategy {
    const mutated = this.cloneStrategy(strategy)
    
    if (!mutated.parsed_content && mutated.raw_content) {
      mutated.parsed_content = this.parseStrategyContent(mutated.raw_content)
    }

    const genes = mutated.parsed_content || []
    
    for (const gene of genes) {
      // Mutate parameters
      for (const [key, value] of Object.entries(gene.parameters)) {
        if (this.random() < 0.1) { // 10% mutation chance per parameter
          gene.parameters[key] = this.mutateParameter(key, value)
        }
      }

      // Mutate weight
      if (this.random() < 0.2) { // 20% chance to mutate weight
        gene.weight = Math.max(0.1, gene.weight + (this.random() - 0.5) * 0.2)
      }
    }

    // Occasionally add/remove genes
    if (this.random() < 0.05 && genes.length > 1) {
      // Remove random gene
      const removeIndex = Math.floor(this.random() * genes.length)
      genes.splice(removeIndex, 1)
    } else if (this.random() < 0.05) {
      // Add random gene
      genes.push(this.generateRandomGene())
    }

    mutated.parsed_content = genes
    mutated.raw_content = this.serializeStrategy(genes)
    mutated.fitness = undefined // Reset fitness for re-evaluation

    return mutated
  }

  /**
   * Mutate a single parameter
   */
  private mutateParameter(key: string, value: any): any {
    if (typeof value === 'number') {
      // Numeric mutation
      const mutation = value * (1 + (this.random() - 0.5) * 0.2)
      return Math.max(0, mutation) // Keep positive
    } else if (typeof value === 'boolean') {
      // Boolean flip
      return this.random() < 0.5 ? !value : value
    } else if (typeof value === 'string') {
      // String mutation (for enum-like values)
      const options = this.getParameterOptions(key)
      if (options.length > 0) {
        return options[Math.floor(this.random() * options.length)]
      }
    }
    
    return value
  }

  /**
   * Get possible options for a parameter
   */
  private getParameterOptions(key: string): string[] {
    const options: Record<string, string[]> = {
      'indicator': ['RSI', 'MACD', 'BB', 'SMA', 'EMA', 'STOCH'],
      'timeframe': ['1m', '5m', '15m', '1h', '4h', '1d'],
      'operator': ['>', '<', '>=', '<=', '=='],
      'action': ['BUY', 'SELL', 'HOLD']
    }
    
    return options[key.toLowerCase()] || []
  }

  /**
   * Generate a random gene
   */
  private generateRandomGene(): StrategyGene {
    const types: StrategyGene['type'][] = ['indicator', 'entry', 'exit', 'risk']
    const type = types[Math.floor(this.random() * types.length)]
    
    return {
      type,
      name: this.generateRandomGeneName(type),
      parameters: this.generateRandomParameters(type),
      weight: 0.5 + this.random() * 0.5
    }
  }

  /**
   * Generate random gene name
   */
  private generateRandomGeneName(type: StrategyGene['type']): string {
    const names: Record<StrategyGene['type'], string[]> = {
      'indicator': ['RSI', 'MACD', 'BB', 'SMA', 'EMA', 'STOCH'],
      'entry': ['CrossOver', 'Breakout', 'Pullback', 'Momentum'],
      'exit': ['TakeProfit', 'StopLoss', 'TrailingStop', 'TimeExit'],
      'risk': ['FixedSize', 'PercentRisk', 'VolatilityBased', 'Kelly']
    }
    
    const typeNames = names[type]
    return typeNames[Math.floor(this.random() * typeNames.length)]
  }

  /**
   * Generate random parameters for a gene type
   */
  private generateRandomParameters(type: StrategyGene['type']): Record<string, any> {
    switch (type) {
      case 'indicator':
        return {
          indicator: this.getParameterOptions('indicator')[Math.floor(this.random() * 6)],
          timeframe: this.getParameterOptions('timeframe')[Math.floor(this.random() * 6)],
          period: Math.floor(5 + this.random() * 45), // 5-50
          overbought: 70 + Math.floor(this.random() * 10),
          oversold: 20 + Math.floor(this.random() * 10)
        }
      case 'entry':
        return {
          condition: this.getParameterOptions('operator')[Math.floor(this.random() * 4)],
          threshold: Math.random() * 100,
          action: this.getParameterOptions('action')[Math.floor(this.random() * 3)]
        }
      case 'exit':
        return {
          type: ['fixed', 'trailing', 'time'][Math.floor(this.random() * 3)],
          value: Math.random() * 10,
          timeframe: this.getParameterOptions('timeframe')[Math.floor(this.random() * 6)]
        }
      case 'risk':
        return {
          method: ['fixed', 'percent', 'volatility'][Math.floor(this.random() * 3)],
          value: 0.01 + this.random() * 0.05, // 1-6%
          maxDrawdown: 0.05 + this.random() * 0.15 // 5-20%
        }
      default:
        return {}
    }
  }

  /**
   * Parse strategy content into genes
   */
  private parseStrategyContent(content: string): StrategyGene[] {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(content)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      // Simple heuristic parsing for text-based strategies
      const genes: StrategyGene[] = []
      
      // Look for common indicators
      const indicators = ['RSI', 'MACD', 'BB', 'SMA', 'EMA', 'STOCH']
      for (const indicator of indicators) {
        if (content.includes(indicator)) {
          genes.push({
            type: 'indicator',
            name: indicator,
            parameters: { indicator, timeframe: '1h', period: 14 },
            weight: 1.0
          })
        }
      }
      
      return genes
    }
  }

  /**
   * Serialize genes to strategy content
   */
  private serializeStrategy(genes: StrategyGene[]): string {
    return JSON.stringify(genes, null, 2)
  }

  /**
   * Clone a strategy
   */
  private cloneStrategy(strategy: Strategy): Strategy {
    return {
      ...strategy,
      parsed_content: strategy.parsed_content ? [...strategy.parsed_content] : undefined,
      fitness: strategy.fitness ? strategy.fitness : undefined
    }
  }

  /**
   * Evaluate population fitness using simplified backtesting
   */
  private async evaluatePopulation(population: Strategy[]): Promise<Strategy[]> {
    console.log(`Evaluating ${population.length} strategies...`)
    
    for (const strategy of population) {
      if (strategy.fitness === undefined) {
        strategy.fitness = await this.evaluateStrategy(strategy)
      }
    }
    
    return population
  }

  /**
   * Evaluate single strategy fitness
   */
  private async evaluateStrategy(strategy: Strategy): Promise<number> {
    try {
      // Simplified backtesting - in production, this would use historical data
      const genes = strategy.parsed_content || []
      
      let baseScore = 50 // Base score
      
      // Score based on gene diversity and quality
      for (const gene of genes) {
        switch (gene.type) {
          case 'indicator':
            baseScore += 10 // Good to have indicators
            break
          case 'entry':
            baseScore += 15 // Entry rules are important
            break
          case 'exit':
            baseScore += 15 // Exit rules are important
            break
          case 'risk':
            baseScore += 20 // Risk management is critical
            break
        }
        
        // Parameter quality score
        baseScore += this.scoreParameters(gene.parameters) * 5
      }
      
      // Penalty for too many or too few genes
      const geneCount = genes.length
      if (geneCount < 2) baseScore -= 20
      if (geneCount > 10) baseScore -= 15
      
      // Add randomness to simulate market variation
      const marketNoise = (this.random() - 0.5) * 20
      baseScore += marketNoise
      
      return Math.max(0, Math.min(100, baseScore))
      
    } catch (error) {
      console.error('Strategy evaluation failed:', error)
      return 0 // Worst fitness
    }
  }

  /**
   * Score parameters based on reasonable values
   */
  private scoreParameters(parameters: Record<string, any>): number {
    let score = 0
    
    // Check common parameters
    if (parameters.period && parameters.period >= 5 && parameters.period <= 50) score += 0.2
    if (parameters.risk && parameters.risk >= 0.01 && parameters.risk <= 0.1) score += 0.3
    if (parameters.timeframe) score += 0.1
    if (parameters.indicator) score += 0.2
    
    return Math.min(1.0, score)
  }
}
