# Sleep Analysis Dashboard

A comprehensive sleep tracking system that pulls data from Garmin Connect, combines it with weather data, stores it in Firebase and displays insights through a web dashboard.

## Features
- Daily and weekly sleep analysis
- Correlation analysis between sleep metrics and weather
- Interactive charts and visualizations

## Setup
1. Install dependencies: `pip install -r requirements.txt`
2. Add Firebase credientials as a json in the folder
3. Set up Garmin Connect credentials in `userDetails.py`
4. Test the webapp: `python -m http.server 8000`

## Files
- `webapp/` - Dashboard files
- `garmin_analysis/` - Data processing scripts