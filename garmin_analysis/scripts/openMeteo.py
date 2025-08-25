import openmeteo_requests

import pandas as pd
import requests_cache
from retry_requests import retry

# Setup the Open-Meteo API client with cache and retry on error
cache_session = requests_cache.CachedSession('.cache', expire_after = 3600)
retry_session = retry(cache_session, retries = 5, backoff_factor = 0.2)
openmeteo = openmeteo_requests.Client(session = retry_session)



def getWeather(days):

  # Make sure all required weather variables are listed here
  # The order of variables in hourly or daily is important to assign them correctly below
  url = "https://api.open-meteo.com/v1/forecast"
  
  days -= 1 # midnight again lmao

  if days == 0:
    forecast = 1
  else:
    forecast = 0

  params = {
  	"latitude": 48.1067,
  	"longitude": 11.4248,
	"hourly": ["temperature_2m", "relative_humidity_2m", "surface_pressure", "precipitation"],
	"past_days": 1 + days,
	"forecast_days": forecast,
	"timeformat": "unixtime",
	"forecast_minutely_15": 4,
	"past_minutely_15": 96,
  }
  responses = openmeteo.weather_api(url, params=params)

  # Process first location. Add a for-loop for multiple locations or weather models
  response = responses[0]
  print(f"Coordinates: {response.Latitude()}°N {response.Longitude()}°E")
  print(f"Elevation: {response.Elevation()} m asl")
  print(f"Timezone difference to GMT+0: {response.UtcOffsetSeconds()}s")

  # Process hourly data. The order of variables needs to be the same as requested.
  hourly = response.Hourly()
  hourly_temperature_2m = hourly.Variables(0).ValuesAsNumpy()
  hourly_relative_humidity_2m = hourly.Variables(1).ValuesAsNumpy()
  hourly_surface_pressure = hourly.Variables(2).ValuesAsNumpy()
  hourly_precipitation = hourly.Variables(3).ValuesAsNumpy()

  hourly_data = {"startGMT": pd.date_range(
    start = pd.to_datetime(hourly.Time(), unit = "s", utc = True),
    end = pd.to_datetime(hourly.TimeEnd(), unit = "s", utc = True),
    freq = pd.Timedelta(seconds = hourly.Interval()),
    inclusive = "left"
  )}

  hourly_data["temperatureValue"] = hourly_temperature_2m
  hourly_data["humidityValue"] = hourly_relative_humidity_2m
  hourly_data["pressureValue"] = hourly_surface_pressure
  hourly_data["precipitationValue"] = hourly_precipitation

  hourly_dataframe = pd.DataFrame(data = hourly_data)
  dfWeather = hourly_dataframe.copy()
  dfWeather["startGMT"] = pd.to_datetime(dfWeather["startGMT"]).dt.tz_localize(None) # remove localisation so it doesnt nan on merge
  dfWeather.set_index("startGMT", inplace=True) # set time to index

  weather_start = dfWeather.index.min()
  weather_end = dfWeather.index.max()
  minute_index = pd.date_range(start=weather_start, end=weather_end, freq="1min")
  dfWeather = dfWeather.reindex(minute_index)
  dfWeather = dfWeather.interpolate(method="linear") # interpolate the weather to the minute

  return dfWeather

#print(getWeather().head())