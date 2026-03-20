#!/usr/bin/env python3
"""
Phoenix AI Trading System - Training Service

This service trains AI models using historical data from Supabase
and deploys them for live trading.
"""

import os
import sys
import asyncio
import logging
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import joblib
import onnx
import onnxruntime as ort
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import supabase
from supabase import create_client, Client
import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ModelTrainer:
    """Trains AI models using historical market data."""
    
    def __init__(self):
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        
        # Model storage
        self.models = {}
        self.scalers = {}
        
    async def get_historical_data(self, market: str, days: int = 90) -> pd.DataFrame:
        """Fetch historical data from Supabase."""
        
        end_time = datetime.now()
        start_time = end_time - timedelta(days=days)
        
        try:
            # Query historical_data table
            result = self.supabase.table('historical_data')\
                .select('*')\
                .eq('market', market)\
                .gte('timestamp', start_time.isoformat())\
                .lte('timestamp', end_time.isoformat())\
                .order('timestamp')\
                .execute()
            
            if not result.data:
                logger.warning(f"No historical data found for {market}")
                return pd.DataFrame()
            
            # Convert to DataFrame
            df = pd.DataFrame(result.data)
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df = df.sort_values('timestamp')
            
            logger.info(f"Loaded {len(df)} records for {market}")
            return df
            
        except Exception as e:
            logger.error(f"Error fetching historical data: {e}")
            return pd.DataFrame()
    
    def calculate_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate technical indicators for feature engineering."""
        
        if df.empty:
            return df
        
        # Price changes
        df['price_change'] = df['close_price'].pct_change()
        df['price_change_5'] = df['close_price'].pct_change(5)
        df['price_change_20'] = df['close_price'].pct_change(20)
        
        # Moving averages
        df['sma_10'] = df['close_price'].rolling(10).mean()
        df['sma_20'] = df['close_price'].rolling(20).mean()
        df['sma_50'] = df['close_price'].rolling(50).mean()
        
        # Exponential moving averages
        df['ema_10'] = df['close_price'].ewm(span=10).mean()
        df['ema_20'] = df['close_price'].ewm(span=20).mean()
        
        # RSI
        delta = df['close_price'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
        rs = gain / loss
        df['rsi'] = 100 - (100 / (1 + rs))
        
        # Bollinger Bands
        df['bb_middle'] = df['close_price'].rolling(20).mean()
        bb_std = df['close_price'].rolling(20).std()
        df['bb_upper'] = df['bb_middle'] + (bb_std * 2)
        df['bb_lower'] = df['bb_middle'] - (bb_std * 2)
        df['bb_width'] = (df['bb_upper'] - df['bb_lower']) / df['bb_middle']
        
        # Volume indicators
        df['volume_sma'] = df['volume'].rolling(20).mean()
        df['volume_ratio'] = df['volume'] / df['volume_sma']
        
        # Volatility
        df['volatility'] = df['price_change'].rolling(20).std()
        
        # Price position
        df['price_position'] = (df['close_price'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'])
        
        return df
    
    def create_labels(self, df: pd.DataFrame, lookahead: int = 5, threshold: float = 0.002) -> pd.Series:
        """Create trading labels based on future price movements."""
        
        if df.empty:
            return pd.Series()
        
        # Future returns
        df['future_return'] = df['close_price'].shift(-lookahead) / df['close_price'] - 1
        
        # Create labels: 1 (buy), 0 (hold), -1 (sell)
        labels = pd.Series(0, index=df.index)
        labels[df['future_return'] > threshold] = 1  # Buy signal
        labels[df['future_return'] < -threshold] = -1  # Sell signal
        
        return labels
    
    def get_alternative_features(self, market: str) -> List[float]:
        """Fetch alternative data features."""
        
        features = []
        
        try:
            # News sentiment
            result = self.supabase.table('news_sentiment_cache')\
                .select('*')\
                .eq('market', market)\
                .order('created_at', desc=True)\
                .limit(1)\
                .execute()
            
            if result.data:
                sentiment = result.data[0]
                features.extend([
                    sentiment.get('sentiment_score', 0),
                    sentiment.get('confidence', 0),
                    sentiment.get('article_count', 0)
                ])
            else:
                features.extend([0, 0, 0])
                
        except Exception as e:
            logger.warning(f"Error fetching news sentiment: {e}")
            features.extend([0, 0, 0])
        
        try:
            # Economic indicators
            result = self.supabase.table('economic_indicators_cache')\
                .select('*')\
                .order('created_at', desc=True)\
                .limit(5)\
                .execute()
            
            if result.data:
                # Take latest 5 indicators and average them
                latest_indicators = result.data[:5]
                features.extend([
                    np.mean([ind.get('interest_rate', 0) for ind in latest_indicators]),
                    np.mean([ind.get('inflation_rate', 0) for ind in latest_indicators]),
                    np.mean([ind.get('gdp_growth', 0) for ind in latest_indicators]),
                    np.mean([ind.get('unemployment_rate', 0) for ind in latest_indicators])
                ])
            else:
                features.extend([0, 0, 0, 0])
                
        except Exception as e:
            logger.warning(f"Error fetching economic indicators: {e}")
            features.extend([0, 0, 0, 0])
        
        try:
            # Social sentiment
            result = self.supabase.table('social_sentiment_cache')\
                .select('*')\
                .eq('market', market)\
                .order('created_at', desc=True)\
                .limit(1)\
                .execute()
            
            if result.data:
                social = result.data[0]
                features.extend([
                    social.get('sentiment_score', 0),
                    social.get('volume', 0),
                    social.get('engagement', 0)
                ])
            else:
                features.extend([0, 0, 0])
                
        except Exception as e:
            logger.warning(f"Error fetching social sentiment: {e}")
            features.extend([0, 0, 0])
        
        return features
    
    def prepare_features(self, df: pd.DataFrame, market: str) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare features and labels for training."""
        
        if df.empty:
            return np.array([]), np.array([])
        
        # Calculate technical indicators
        df = self.calculate_technical_indicators(df)
        
        # Create labels
        labels = self.create_labels(df)
        
        # Get alternative features
        alt_features = self.get_alternative_features(market)
        
        # Feature columns
        feature_cols = [
            'price_change', 'price_change_5', 'price_change_20',
            'sma_10', 'sma_20', 'sma_50',
            'ema_10', 'ema_20',
            'rsi',
            'bb_width', 'volume_ratio',
            'volatility', 'price_position'
        ]
        
        # Remove rows with NaN values
        valid_idx = ~(df[feature_cols].isnull().any(axis=1) | labels.isnull())
        df_clean = df[valid_idx]
        labels_clean = labels[valid_idx]
        
        if len(df_clean) < 100:
            logger.warning(f"Not enough data points: {len(df_clean)}")
            return np.array([]), np.array([])
        
        # Extract features
        X = df_clean[feature_cols].values
        
        # Add alternative features to each row
        if alt_features:
            alt_features_array = np.array(alt_features)
            X_alt = np.tile(alt_features_array, (len(X), 1))
            X = np.hstack([X, X_alt])
        
        y = labels_clean.values
        
        logger.info(f"Prepared features: X shape={X.shape}, y shape={y.shape}")
        return X, y
    
    def train_models(self, X: np.ndarray, y: np.ndarray, market: str) -> Dict:
        """Train multiple models and return the best one."""
        
        if len(X) < 100:
            logger.error("Not enough data for training")
            return {}
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Models to train
        models = {
            'random_forest': RandomForestClassifier(
                n_estimators=100, max_depth=10, random_state=42
            ),
            'gradient_boosting': GradientBoostingClassifier(
                n_estimators=100, max_depth=5, random_state=42
            ),
            'logistic_regression': LogisticRegression(
                random_state=42, max_iter=1000
            )
        }
        
        best_model = None
        best_score = 0
        best_name = ""
        results = {}
        
        for name, model in models.items():
            try:
                # Train model
                model.fit(X_train_scaled, y_train)
                
                # Predict
                y_pred = model.predict(X_test_scaled)
                
                # Evaluate
                accuracy = accuracy_score(y_test, y_pred)
                precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
                recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
                f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
                
                results[name] = {
                    'accuracy': accuracy,
                    'precision': precision,
                    'recall': recall,
                    'f1': f1
                }
                
                logger.info(f"{name}: accuracy={accuracy:.3f}, f1={f1:.3f}")
                
                # Track best model
                if f1 > best_score:
                    best_score = f1
                    best_model = model
                    best_name = name
                    
            except Exception as e:
                logger.error(f"Error training {name}: {e}")
        
        if best_model is None:
            logger.error("No models trained successfully")
            return {}
        
        # Store best model and scaler
        self.models[market] = best_model
        self.scalers[market] = scaler
        
        logger.info(f"Best model: {best_name} with F1 score: {best_score:.3f}")
        
        return {
            'best_model': best_name,
            'best_score': best_score,
            'all_results': results,
            'feature_count': X.shape[1]
        }
    
    def save_model_onnx(self, market: str, model_info: Dict) -> str:
        """Convert model to ONNX format and upload to Supabase Storage."""
        
        if market not in self.models:
            raise ValueError(f"No trained model for {market}")
        
        try:
            import skl2onnx
            from skl2onnx import convert_sklearn
            from skl2onnx.common.data_types import FloatTensorType
            
            model = self.models[market]
            scaler = self.scalers[market]
            
            # Get feature count
            X_sample = np.random.rand(1, model_info['feature_count']).astype(np.float32)
            X_sample_scaled = scaler.transform(X_sample)
            
            # Convert to ONNX
            initial_type = [('float_input', FloatTensorType([None, X_sample_scaled.shape[1]]))]
            onnx_model = convert_sklearn(model, initial_types=initial_type)
            
            # Save to file
            model_filename = f"{market}_model_{datetime.now().strftime('%Y%m%d_%H%M%S')}.onnx"
            temp_path = f"/tmp/{model_filename}"
            
            onnx.save_model(onnx_model, temp_path)
            
            # Upload to Supabase Storage
            with open(temp_path, 'rb') as f:
                file_data = f.read()
            
            storage_path = f"ai-models/{model_filename}"
            
            result = self.supabase.storage.from_('ai-models').upload(
                path=storage_path,
                file=file_data,
                file_options={'content-type': 'application/octet-stream'}
            )
            
            # Get public URL
            public_url = self.supabase.storage.from_('ai-models').get_public_url(storage_path)
            
            # Clean up temp file
            os.remove(temp_path)
            
            logger.info(f"Saved ONNX model to: {public_url}")
            
            # Store model metadata
            model_metadata = {
                'market': market,
                'model_name': model_info['best_model'],
                'model_url': public_url,
                'accuracy': model_info['all_results'][model_info['best_model']]['accuracy'],
                'precision': model_info['all_results'][model_info['best_model']]['precision'],
                'recall': model_info['all_results'][model_info['best_model']]['recall'],
                'f1_score': model_info['best_score'],
                'feature_count': model_info['feature_count'],
                'training_date': datetime.now().isoformat(),
                'status': 'active'
            }
            
            self.supabase.table('ai_models').insert(model_metadata).execute()
            
            return public_url
            
        except Exception as e:
            logger.error(f"Error saving ONNX model: {e}")
            raise
    
    async def train_market(self, market: str, days: int = 90) -> Dict:
        """Train model for a specific market."""
        
        try:
            logger.info(f"Starting training for {market}")
            
            # Get historical data
            df = await self.get_historical_data(market, days)
            
            if df.empty:
                return {'error': f'No historical data available for {market}'}
            
            # Prepare features
            X, y = self.prepare_features(df, market)
            
            if len(X) == 0:
                return {'error': 'Not enough valid data for training'}
            
            # Train models
            model_info = self.train_models(X, y, market)
            
            if not model_info:
                return {'error': 'Failed to train any models'}
            
            # Save model
            model_url = self.save_model_onnx(market, model_info)
            
            result = {
                'market': market,
                'success': True,
                'model_url': model_url,
                'training_samples': len(X),
                'best_model': model_info['best_model'],
                'best_score': model_info['best_score'],
                'feature_count': model_info['feature_count']
            }
            
            logger.info(f"Training completed for {market}: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error training {market}: {e}")
            return {'error': str(e)}
    
    async def train_all_markets(self, days: int = 90) -> List[Dict]:
        """Train models for all supported markets."""
        
        markets = ['BTC/USD', 'ETH/USD', 'EUR/USD', 'GBP/USD', 'SPY', 'QQQ']
        results = []
        
        for market in markets:
            result = await self.train_market(market, days)
            results.append(result)
            
            # Small delay between markets
            await asyncio.sleep(1)
        
        return results

async def main():
    """Main training function."""
    
    import argparse
    
    parser = argparse.ArgumentParser(description='Train AI models for trading')
    parser.add_argument('--market', help='Specific market to train (optional)')
    parser.add_argument('--days', type=int, default=90, help='Days of historical data (default: 90)')
    parser.add_argument('--server', action='store_true', help='Run as FastAPI server')
    
    args = parser.parse_args()
    
    if args.server:
        # Run as FastAPI server
        import uvicorn
        port = int(os.getenv("PORT", 8080))
        uvicorn.run("main:app", host="0.0.0.0", port=port)
        return
    
    trainer = ModelTrainer()
    
    if args.market:
        results = [await trainer.train_market(args.market, args.days)]
    else:
        results = await trainer.train_all_markets(args.days)
    
    # Log results
    logger.info("Training Results:")
    for result in results:
        if result.get('success'):
            logger.info(f"✅ {result.get('market')}: {result.get('best_model')} (F1: {result.get('best_score'):.3f})")
        else:
            logger.error(f"❌ {result.get('market', 'Unknown')}: {result.get('error', 'Unknown error')}")
    
    return results

# Make ModelTrainer class accessible for imports
__all__ = ['ModelTrainer', 'main']

if __name__ == "__main__":
    asyncio.run(main())
