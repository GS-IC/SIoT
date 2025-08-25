from dataPull import getDailyStats
from datetime import date, timedelta
from openMeteo import getWeather
from plots import correlationPlot, timePlot

days = 1
yesterday = date.today() - timedelta(days=days) # when working on this around midnight sometimes yesterday is infact still today
yesterday = yesterday.isoformat()
today = date.today().isoformat()

sleep = getDailyStats(yesterday)
weather = getWeather(days)

print(sleep.head())
print(weather.head(days))

overlap_start = max(sleep.index.min(), weather.index.min())
overlap_end = min(sleep.index.max(), weather.index.max())
print(f"Overlap period: {overlap_start} to {overlap_end}")
print(f"Sleep timezone: {sleep.index.tz}")
print(f"Sleep timezone: {sleep.index.tz}")

combined = sleep.copy()
combined = combined.join(weather[["temperatureValue", "humidityValue", "pressureValue","precipitationValue"]], how="left")

print(combined.head())
correlationPlot(combined)
timePlot(combined,yesterday)

with open("output.json", "w") as f:  
    combined.to_json(f, orient='index', date_format='epoch', indent=2)
