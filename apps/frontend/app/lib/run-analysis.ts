import { RawSuspensionData, standardizeData } from "./telemetryUtils";

interface RawReading {
  displacement: number
  time: number
}

interface Reading {
  displacement: number
  time: number
}

interface VelocityReading {
  displacement: number
  velocity: number
  time: {
    start: number
    end: number
    duration: number
  }
  travel: {
    start: number
    end: number
  }
}

export interface SuspensionActivity extends VelocityReading {
  type: "rebound" | "compression"
}

function convertToMillis(reading: RawReading, suspensionLength: number, min: number, max: number): Reading {

  const displacementPercentage = (reading.displacement - min) / (max - min)
  const displacementInMilis = suspensionLength * displacementPercentage

  return { displacement: displacementInMilis, time: reading.time }
}

function displacementToVelocity(reading: Reading, nextReading: Reading): VelocityReading {

  const displacement = nextReading.displacement - reading.displacement
  const duration = nextReading.time - reading.time

  const velocity = displacement / duration

  const time = { duration, start: reading.time, end: nextReading.time }
  const travel = { start: reading.displacement, end: nextReading.displacement }

  return { velocity, displacement, time, travel } as VelocityReading
}

export function processCompressions(
  data: RawSuspensionData[],
  freq: number,
  length: number,
  min: number,
  max: number
): SuspensionActivity[] {

  const dataStandardized: RawReading[] = standardizeData(data, freq).map(point => ({ displacement: point.val, time: point.time }))

  const dataInMillis: Reading[] = dataStandardized.map((rawReading) => convertToMillis(rawReading, length, min, max))

  const velocities = dataInMillis.slice(0, -1).map((reading, i) => displacementToVelocity(reading, dataInMillis[i + 1]!))

  const activity: SuspensionActivity[] = []

  let i = 0
  while (i < velocities.length) {
    const current = velocities[i]!
    if (current.velocity === 0) {
      i++
      continue
    }

    const isCompression = current.velocity > 0
    let totalDisplacement = current.displacement
    let totalDuration = current.time.duration
    const startTime = current.time.start
    const travelStart = current.travel.start
    let endTime = current.time.end
    let travelEnd = current.travel.end

    let j = i + 1
    while (j < velocities.length) {
      const next = velocities[j]!
      if ((isCompression && next.velocity > 0) || (!isCompression && next.velocity < 0)) {
        totalDisplacement += next.displacement
        totalDuration += next.time.duration
        endTime = next.time.end
        travelEnd = next.travel.end
        j++
      } else {
        break
      }
    }

    activity.push({
      type: isCompression ? "compression" : "rebound",
      displacement: totalDisplacement,
      velocity: totalDisplacement / totalDuration,
      time: {
        start: startTime,
        end: endTime,
        duration: totalDuration,
      },
      travel: {
        start: travelStart,
        end: travelEnd,
      },
    })

    i = j
  }

  return activity
}
