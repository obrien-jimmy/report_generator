class RetryService {
  static async withRetry(operation, maxRetries = 3, baseDelay = 2000) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Check if it's a rate limit error
        const isRateLimit = error.response?.status === 429 || 
                           error.response?.status === 503 ||
                           error.message?.includes('rate limit') ||
                           error.response?.data?.detail?.includes('rate limit');
        
        if (!isRateLimit || attempt === maxRetries) {
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.log(`Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
  
  static async batchWithRetry(operations, batchSize = 3, delayBetweenBatches = 2000) {
    const results = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (operation, index) => {
        try {
          // Add small delay between items in batch
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          return await this.withRetry(operation);
        } catch (error) {
          console.error(`Batch operation failed:`, error);
          return null; // Return null for failed operations
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Delay between batches
      if (i + batchSize < operations.length) {
        console.log(`Completed batch ${Math.floor(i / batchSize) + 1}, waiting ${delayBetweenBatches}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    return results;
  }
}

export default RetryService;