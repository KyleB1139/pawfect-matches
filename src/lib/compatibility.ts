interface CompatProfile {
  age?: number | null;
  gender?: string | null;
  interested_in?: string[] | null;
  min_age_preference?: number | null;
  max_age_preference?: number | null;
  looking_for?: string[] | null;
  lifestyle?: string[] | null;
  dog_friendly?: boolean | null;
  dog_friendly_with?: string[] | null;
  dog_breed?: string | null;
}

const overlapRatio = (a?: string[] | null, b?: string[] | null) => {
  if (!a?.length || !b?.length) return 0;
  const setB = new Set(b.map((x) => x.toLowerCase()));
  const matches = a.filter((x) => setB.has(x.toLowerCase())).length;
  const union = new Set([...a, ...b].map((x) => x.toLowerCase())).size;
  return union === 0 ? 0 : matches / union;
};

/**
 * Calculate compatibility percentage (0-100) between viewer and target profile.
 * Weighted: looking_for 30, lifestyle 25, dog_friendly_with 20, age preference 15, dog_friendly 10.
 */
export const calculateCompatibility = (
  viewer: CompatProfile | null | undefined,
  target: CompatProfile | null | undefined
): number => {
  if (!viewer || !target) return 0;

  let score = 0;
  let totalWeight = 0;

  // Looking for overlap (30)
  if (viewer.looking_for?.length || target.looking_for?.length) {
    score += overlapRatio(viewer.looking_for, target.looking_for) * 30;
    totalWeight += 30;
  }

  // Lifestyle overlap (25)
  if (viewer.lifestyle?.length || target.lifestyle?.length) {
    score += overlapRatio(viewer.lifestyle, target.lifestyle) * 25;
    totalWeight += 25;
  }

  // Dog friendly with overlap (20)
  if (viewer.dog_friendly_with?.length || target.dog_friendly_with?.length) {
    score += overlapRatio(viewer.dog_friendly_with, target.dog_friendly_with) * 20;
    totalWeight += 20;
  }

  // Age preference fit (15) — does target fall within viewer's preference and vice versa
  if (viewer.age != null && target.age != null) {
    let ageScore = 0;
    let ageChecks = 0;
    const viewerMin = viewer.min_age_preference ?? 18;
    const viewerMax = viewer.max_age_preference ?? 99;
    const targetMin = target.min_age_preference ?? 18;
    const targetMax = target.max_age_preference ?? 99;
    ageScore += target.age >= viewerMin && target.age <= viewerMax ? 1 : 0;
    ageChecks += 1;
    ageScore += viewer.age >= targetMin && viewer.age <= targetMax ? 1 : 0;
    ageChecks += 1;
    score += (ageScore / ageChecks) * 15;
    totalWeight += 15;
  }

  // Dog friendly match (10)
  if (viewer.dog_friendly != null && target.dog_friendly != null) {
    score += (viewer.dog_friendly === target.dog_friendly ? 1 : 0) * 10;
    totalWeight += 10;
  }

  if (totalWeight === 0) return 0;
  // Normalize to a 0-100 percentage
  return Math.round((score / totalWeight) * 100);
};
