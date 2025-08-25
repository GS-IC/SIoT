import firebase_admin
from firebase_admin import credentials
from firebase_admin import db
import json


cred = credentials.Certificate("paste firebase credentials json name here")
firebase_admin.initialize_app(cred, {
    "databaseURL": "paste firebase url here"
})

def test_upload_json():
    
    # read the file
    with open("cache.json", "r") as f:
        data = json.load(f)
    
    # upload it
    ref = db.reference("data/combined_data_upload")
    old_data = ref.get()
    ref.update(data)
    print("Upload successful!")
    uploaded_data = ref.get()
    print(f"Database now has {len(uploaded_data)} data points, from {len(old_data)}")
