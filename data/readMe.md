# Data Format:
Rider data and run data are stored as JSONS in data folder.

## Rider data:
Captures range of values the accelerometer can measure on bike setup.

### Rider data JSON structure:
```json
{
    "name": "rider profile name",
    "rear_sus_min": "telemetry reading at 0% shock travel",
    "rear_sus_max": "telemetry reading at 100% shock travel",
    "front_sus_min": "telemetry reading at 0% fork travel",
    "front_sus_max": "telemetry reading at 100% fork travel",
    "comments": "any relevant comments to do with the bike. Might want to include bike size and travel"
}
```
## Run data:
**Raw run data from the accelerometer:**
- Captures 6 axis of forces experienced by accelerometer. 
- Captures 2 displacement values, the front and rear suspension

**Metadata is included to provide information about the run:**
- Name and comments are strings given to identify the run and provide information
- Time is recorded as the length of the run by the microcontroller
- Sample frequency is given by the accelerometer


### Run data JSON structure:
```json
{
  "axis": {
    "axis1": ["list of axis-1 readings"],
    "axis2": ["list of axis-2 readings"],
    "axis3": ["list of axis-3 readings"],
    "axis4": ["list of axis-4 readings"],
    "axis5": ["list of axis-5 readings"],
    "axis6": ["list of axis-6 readings"]
  },
  "suspension": {
    "rear_sus": ["list of shock displacement readings"],
    "front_sus": ["list of fork displacement readings"]
  },
  "metadata": { 
    "run_comment": "comments made about the run",
    "run_time": "length of run in ms",
    "sample_frequency": {
      "rear_sus": "sample frequency of shock in hz",
      "front_sus": "sample frequency of fork in hz"
    }
  }
}
```
