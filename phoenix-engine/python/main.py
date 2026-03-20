"""
Phoenix AI Trading System - Python Training Service FastAPI Wrapper
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio
import os
import logging
from datetime import datetime
import json

# Import our modules
from train import ModelTrainer
from historical_data_fetcher import HistoricalDataFetcher

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Phoenix AI Trading Service",
    description="AI model training and historical data acquisition service",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request models
class TrainingRequest(BaseModel):
    task_type: str = "train"
    markets: Optional[List[str]] = None
    days: Optional[int] = 90
    timestamp: Optional[str] = None

class DataFetchRequest(BaseModel):
    task_type: str = "fetch_historical"
    markets: List[str]
    brokers: List[str]
    days: Optional[int] = 90
    timestamp: Optional[str] = None

class TrainingResponse(BaseModel):
    success: bool
    message: str
    results: Optional[List[Dict[str, Any]]] = None
    timestamp: str

class DataFetchResponse(BaseModel):
    success: bool
    message: str
    markets_fetched: int
    brokers_used: int
    timestamp: str

# Global instances (initialized when needed)
trainer = None
fetcher = None

def get_trainer():
    global trainer
    if not trainer:
        trainer = ModelTrainer()
    return trainer

def get_fetcher():
    global fetcher
    if not fetcher:
        fetcher = HistoricalDataFetcher()
    return fetcher

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Phoenix AI Trading Service",
        "status": "running",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/train", response_model=TrainingResponse)
async def train_models(request: TrainingRequest, background_tasks: BackgroundTasks):
    """Train AI models"""
    try:
        logger.info(f"Training request received: {request}")
        
        if request.task_type != "train":
            raise HTTPException(status_code=400, detail="Invalid task_type")
        
        # Run training in background
        background_tasks.add_task(run_training_task, request.markets, request.days)
        
        return TrainingResponse(
            success=True,
            message="Training started successfully",
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Training error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/fetch_historical", response_model=DataFetchResponse)
async def fetch_historical_data(request: DataFetchRequest, background_tasks: BackgroundTasks):
    """Fetch historical data"""
    try:
        logger.info(f"Data fetch request received: {request}")
        
        if request.task_type != "fetch_historical":
            raise HTTPException(status_code=400, detail="Invalid task_type")
        
        # Run data fetch in background
        background_tasks.add_task(run_data_fetch_task, request.markets, request.brokers, request.days)
        
        return DataFetchResponse(
            success=True,
            message="Historical data fetch started successfully",
            markets_fetched=len(request.markets),
            brokers_used=len(request.brokers),
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Data fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/status")
async def get_status():
    """Get service status"""
    try:
        trainer_instance = get_trainer()
        model_count = len(trainer_instance.models) if hasattr(trainer_instance, 'models') else 0
    except:
        model_count = 0
    
    return {
        "service": "Phoenix AI Trading Service",
        "status": "running",
        "models_loaded": model_count,
        "timestamp": datetime.now().isoformat()
    }

async def run_training_task(markets: Optional[List[str]], days: int):
    """Background task for training"""
    try:
        logger.info(f"Starting background training for markets: {markets}")
        
        trainer_instance = get_trainer()
        
        if markets:
            # Train specific markets
            results = []
            for market in markets:
                result = await trainer_instance.train_market(market, days)
                results.append(result)
                logger.info(f"Training completed for {market}: {result}")
        else:
            # Train all markets
            results = await trainer_instance.train_all_markets(days)
            logger.info(f"Training completed for all markets: {results}")
        
        logger.info("Background training task completed")
        
    except Exception as e:
        logger.error(f"Background training error: {e}")

async def run_data_fetch_task(markets: List[str], brokers: List[str], days: int):
    """Background task for data fetching"""
    try:
        logger.info(f"Starting background data fetch for markets: {markets}, brokers: {brokers}")
        
        fetcher_instance = get_fetcher()
        
        for market in markets:
            for broker in brokers:
                try:
                    await fetcher_instance.fetch_and_store_historical_data(market, broker, days)
                    logger.info(f"Data fetch completed for {broker}/{market}")
                except Exception as e:
                    logger.error(f"Data fetch error for {broker}/{market}: {e}")
        
        logger.info("Background data fetch task completed")
        
    except Exception as e:
        logger.error(f"Background data fetch error: {e}")

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
