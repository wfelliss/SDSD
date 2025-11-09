# Used to migrate run csv files to json format
import os
import json
import re
import sys

def jsonFormat(axis1, axis2, axis3, axis4, axis5, axis6, rear_sus, front_sus, run_comment, run_time, rear_sus_frequency, front_sus_frequency):
    return {
        "axis": {
            "axis1": axis1,
            "axis2": axis2,
            "axis3": axis3,
            "axis4": axis4,
            "axis5": axis5,
            "axis6": axis6
        },
        "suspension": {
            "rear_sus": rear_sus,
            "front_sus": front_sus
        },
        "metadata": {
            "run_comment": run_comment,
            "run_time": run_time,
            "sample_frequency": {
                "rear_sus": rear_sus_frequency,
                "front_sus": front_sus_frequency
            }
        }
    }

def collapse_arrays_to_single_line(json_text):
    """
    Collapse array blocks for data visibility.
    """
    pattern = re.compile(r'\[\n\s*([^\[\]]*?)\n\s*\]', re.S)
    while True:
        m = pattern.search(json_text)
        if not m:
            break
        inner = m.group(1)
        # normalize whitespace and ensure comma+space separation
        inner = inner.replace('\n', ' ')
        inner = re.sub(r'\s+', ' ', inner).strip()
        inner = re.sub(r'\s*,\s*', ', ', inner)
        replacement = '[' + inner + ']'
        json_text = json_text[:m.start()] + replacement + json_text[m.end():]
    return json_text

def process_accelerometer_file(file):
    if not os.path.exists(file):
        print(f"File '{file}' not found")
        return None

    axis1, axis2, axis3, axis4, axis5, axis6 = [], [], [], [], [], []
    rear_sus, front_sus = [], []

    with open(file, "r") as f:
        lines = [ln.rstrip('\n') for ln in f]

    if len(lines) < 5:
        raise ValueError("File too short or wrong format")

    # comment
    run_comment = lines[0].strip()

    # frequencies
    freq_parts = lines[1].split(':')
    rear_sus_frequency = freq_parts[1].strip()
    front_sus_frequency = freq_parts[3].strip()

    # initial values
    initialValues = [v.strip() for v in lines[2].split(',')]
    if len(initialValues) >= 2:
        rear_sus.append(float(initialValues[0]))
        front_sus.append(float(initialValues[1]))

    # run_time
    run_time_line = lines[-2].strip()
    run_time = int(run_time_line)

    # data lines
    data_lines = lines[3:-2]
    dataOrder = [axis1, axis2, axis3, axis4, axis5, axis6, rear_sus, front_sus]

    for line in data_lines:
        line = line.strip()
        if not line:
            continue
        parts = [p.strip() for p in line.split(',')]
        if len(parts) >= len(dataOrder):
            for i in range(len(dataOrder)):
                dataOrder[i].append(float(parts[i]))


    return axis1, axis2, axis3, axis4, axis5, axis6, rear_sus, front_sus, run_comment, run_time, rear_sus_frequency, front_sus_frequency

def main():
    filename = "testrun2"
    input_file = f"{filename}.txt"
    output_file = f"{filename}.json"

    processed = process_accelerometer_file(input_file)
    if processed is None:
        sys.exit(1)

    json_data = jsonFormat(*processed)

    # dump then collapse only the arrays
    json_text = json.dumps(json_data, indent=2)
    json_text = collapse_arrays_to_single_line(json_text)

    with open(output_file, "w") as f:
        f.write(json_text + "\n")

    print(f"Saved converted data to {output_file}")

if __name__ == "__main__":
    main()
