import type { Profile } from '@/types/database'

interface MatchResult {
  score: number
  reasons: string[]
}

export function calculateMatchScore(
  currentUser: Profile,
  otherUser: Profile
): MatchResult {
  let score = 0
  const reasons: string[] = []

  // Shared interests: +10 per match, cap at 50
  const sharedInterests = currentUser.interests.filter((i) =>
    otherUser.interests.includes(i)
  )
  if (sharedInterests.length > 0) {
    const interestScore = Math.min(sharedInterests.length * 10, 50)
    score += interestScore
    if (sharedInterests.length <= 3) {
      reasons.push(`Shared interests: ${sharedInterests.join(', ')}`)
    } else {
      reasons.push(
        `${sharedInterests.length} shared interests including ${sharedInterests.slice(0, 2).join(', ')}`
      )
    }
  }

  // Same major: +15
  if (
    currentUser.major &&
    otherUser.major &&
    currentUser.major.toLowerCase() === otherUser.major.toLowerCase()
  ) {
    score += 15
    reasons.push(`Same major: ${otherUser.major}`)
  }

  // Same year: +10
  if (currentUser.year && otherUser.year && currentUser.year === otherUser.year) {
    score += 10
    reasons.push(`Same year: ${otherUser.year}`)
  }

  // Shared "looking for": +10 per match, cap at 20
  const sharedLookingFor = currentUser.looking_for.filter((l) =>
    otherUser.looking_for.includes(l)
  )
  if (sharedLookingFor.length > 0) {
    const lookingForScore = Math.min(sharedLookingFor.length * 10, 20)
    score += lookingForScore
    reasons.push(`Both looking for: ${sharedLookingFor.join(', ')}`)
  }

  // Same campus area: +5
  if (
    currentUser.campus_area &&
    otherUser.campus_area &&
    currentUser.campus_area === otherUser.campus_area
  ) {
    score += 5
    reasons.push(`Same area: ${otherUser.campus_area}`)
  }

  // Normalize to percentage (max possible: 50 + 15 + 10 + 20 + 5 = 100)
  const normalizedScore = Math.min(score, 100)

  return {
    score: normalizedScore,
    reasons,
  }
}
