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

// Low-activity threshold fractions, expressed relative to the suspension's full travel.
export const MIN_VELOCITY_TRAVEL_FRACTION = 0.4 // 40% of full travel, used as mm/s
export const MIN_DISPLACEMENT_TRAVEL_FRACTION = 0.03 // 3% of full travel, in mm

interface VelocityDisplacement {
  velocity: number // mm/s
  displacement: number // mm of movement
}

// Removes statistical outliers (>5 std dev) and low-activity events (slow AND
// small relative to full travel) from velocity/displacement data.
export function filterLowActivityOutliers<T extends VelocityDisplacement>(
  items: T[],
  fullTravel: number,
): T[] {
  if (items.length === 0) return items

  const velocities = items.map((a) => a.velocity)
  const displacements = items.map((a) => a.displacement)

  const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length
  const std = (arr: number[], m: number) =>
    Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length)

  const vMean = mean(velocities)
  const vStd = std(velocities, vMean)
  const dMean = mean(displacements)
  const dStd = std(displacements, dMean)

  const minVelocity = MIN_VELOCITY_TRAVEL_FRACTION * fullTravel
  const minDisplacement = MIN_DISPLACEMENT_TRAVEL_FRACTION * fullTravel

  return items.filter((a) => {
    const passesStdDev =
      Math.abs(a.velocity - vMean) < 5 * vStd &&
      Math.abs(a.displacement - dMean) < 5 * dStd

    // Drop only low-activity points: slow AND small relative to full travel.
    const isLowActivity =
      Math.abs(a.velocity) < minVelocity &&
      Math.abs(a.displacement) < minDisplacement

    return passesStdDev && !isLowActivity
  })
}

function convertDisplacementToMm(reading: RawReading, suspensionLength: number, min: number, max: number): Reading {

  const displacementPercentage = (reading.displacement - min) / (max - min)
  const displacementInMilis = suspensionLength * displacementPercentage

  return { displacement: displacementInMilis, time: reading.time }
}

function displacementToVelocity(reading: Reading, nextReading: Reading): VelocityReading {

  const displacement = nextReading.displacement - reading.displacement
  const duration = nextReading.time - reading.time

  const velocity = duration === 0 ? 0 : displacement / duration

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

  const dataInMm: Reading[] = dataStandardized.map((rawReading) => convertDisplacementToMm(rawReading, length, min, max))

  const velocities = dataInMm.slice(0, -1).map((reading, i) => displacementToVelocity(reading, dataInMm[i + 1]!))

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
      velocity: totalDuration === 0 ? 0 : totalDisplacement / totalDuration,
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
