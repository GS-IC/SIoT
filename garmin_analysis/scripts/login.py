import os
import garminconnect
from garminconnect import GarminConnectAuthenticationError
from userDetails import username, password

def get_garmin_client():
    GARTH_HOME = os.path.expanduser("~/.garth")
    
    # try and use what garth has saved
    try:
        print("Trying to login using existing tokens...")
        garmin = garminconnect.Garmin()
        garmin.login(GARTH_HOME)
        print("Using existing session")
        return garmin

    # if it throws an error use login    
    except (FileNotFoundError, GarminConnectAuthenticationError, Exception) as e:
        print(f"No valid session found: {e}")
        print("Logging in with credentials...")
        
        garmin = garminconnect.Garmin(username, password)
        garmin.login()
        garmin.garth.dump(GARTH_HOME)
        print("New session saved")
        return garmin

if __name__ == "__main__":
    garmin = get_garmin_client()
    print("Login successful!")