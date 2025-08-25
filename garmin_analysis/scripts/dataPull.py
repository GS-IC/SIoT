import pandas as pd
from openMeteo import getWeather

# login

from login import get_garmin_client
garmin = get_garmin_client()

# functions

def getRawStats(stat, sleepData):
  rawData = sleepData[stat]
  return pd.DataFrame(rawData)

def getDailyStats(day):
  sleepData = garmin.get_sleep_data(day) # get the full sleep data from garmin

  dfHeartRate = getRawStats("sleepHeartRate",sleepData) # get the raw HR stats, sampled every 2 mins
  dfHeartRate["startGMT"] = pd.to_datetime(dfHeartRate["startGMT"], unit="ms") # convert unix to datetime
  dfHeartRate.set_index("startGMT", inplace=True) # set time to index
  dfHeartRate.rename(columns={"value": "heartRateValue"}, inplace=True) # rename value column

  dfMovement = getRawStats("sleepMovement",sleepData) # get the raw movement data, sampled every minute
  dfMovement = dfMovement.drop("endGMT", axis='columns') # drop end of sample time
  dfMovement["startGMT"] = pd.to_datetime(dfMovement["startGMT"]) # convert to datetime
  dfMovement.set_index("startGMT",inplace=True) # set time to index
  dfMovement.rename(columns={"activityLevel": "movementValue"}, inplace=True) # rename column
  
  dfHRV = getRawStats("hrvData",sleepData) # get the raw heart rate variance, sampled every 5 mins
  dfHRV["startGMT"] = pd.to_datetime(dfHRV["startGMT"], unit="ms") # convert unix to datetime
  dfHRV["startGMT"] = dfHRV["startGMT"].dt.floor("min") # round start times
  dfHRV.set_index("startGMT",inplace=True) # set time to index
  dfHRV.rename(columns={"value":"hrvValue"}, inplace=True) # rename column
  
  dfRespiration = getRawStats("wellnessEpochRespirationDataDTOList",sleepData) # get raw breathing data, sampled every 2 mins
  dfRespiration.rename(columns={"startTimeGMT":"startGMT"},inplace=True) # rename time
  dfRespiration["startGMT"] = pd.to_datetime(dfRespiration["startGMT"],unit="ms") # convert unix to datetime
  dfRespiration.set_index("startGMT",inplace=True) # set time to index
  dfRespiration = dfRespiration.drop(dfRespiration.index[0]) # drop first row because of inconsistent sample interval

  dfSleepStage = getRawStats("sleepLevels",sleepData) # get raw sleep stage data
  dfSleepStage["startGMT"] = pd.to_datetime(dfSleepStage["startGMT"]) # convert to datetime
  dfSleepStage["startGMT"] = dfSleepStage["startGMT"].dt.floor("min") # round the start times to synchronise
  dfSleepStage.set_index("startGMT",inplace=True) # set time to index
  dfSleepStage.rename(columns={"activityLevel": "sleepStage"}, inplace=True) # rename values
  dfSleepStage = dfSleepStage.drop("endGMT",axis='columns') # drop the ending times
  
  start_time = max(dfHeartRate.index.min(), dfMovement.index.min(), dfHRV.index.min(), dfRespiration.index.min(), dfSleepStage.index.min()) # find the first point where all data types have values
  end_time = min(dfHeartRate.index.max(), dfMovement.index.max(), dfHRV.index.max(), dfRespiration.index.max()) # find the last point at which all data types have values, sleep stage excluded as it needs to be ff to the end
  print(f"Sleep time range: {start_time} to {end_time}")

  combined_df = dfMovement.copy() # combining the dataframes
  combined_df = combined_df.join(dfHeartRate[['heartRateValue']], how='outer')
  combined_df = combined_df.join(dfHRV[['hrvValue']], how='outer')
  combined_df = combined_df.join(dfRespiration[['respirationValue']], how='outer')
  combined_df = combined_df.join(dfSleepStage[['sleepStage']], how='outer')
  
  combined_df['sleepStage'] = combined_df['sleepStage'].ffill() # ff for the stages
  combined_df['sleepStage'] = combined_df['sleepStage'].fillna(1).ffill() # backfilling the first stage which is always 1
  numeric_cols = ['heartRateValue', 'movementValue', 'hrvValue', 'respirationValue'] # all the cols that need interp
  combined_df[numeric_cols] = combined_df[numeric_cols].interpolate(method='linear') # doing the interp

  combined_df = combined_df.loc[start_time:end_time] # trimming to the start and end times

  return combined_df


