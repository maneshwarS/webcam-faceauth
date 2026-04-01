const MATCH_THRESHOLD = 0.75;

/**
 * Euclidean distance between two 128-D descriptor arrays.
 */
function euclideanDistance(d1, d2) {
  let sum = 0;
  for (let i = 0; i < d1.length; i++) {
    sum += (d1[i] - d2[i]) ** 2;
  }
  return Math.sqrt(sum);
}

/**
 * Compare a live descriptor against a stored user's descriptor.
 * Returns { matched: bool, distance: number }
 */
function verifyDescriptor(liveDescriptor, storedDescriptor) {
  const distance = euclideanDistance(liveDescriptor, storedDescriptor);
  return { matched: distance < MATCH_THRESHOLD, distance };
}

/**
 * Find the best-matching user from a list of all users with face descriptors.
 * users: [{ id, email, name, face_descriptor: string }]
 * liveDescriptor: number[]
 * Returns { matched: bool, user: object|null, distance: number }
 */
function findBestMatch(liveDescriptor, users) {
  let bestDistance = Infinity;
  let bestUser = null;

  for (const user of users) {
    if (!user.face_descriptor) continue;
    let stored;
    try {
      stored = JSON.parse(user.face_descriptor);
    } catch {
      continue;
    }
    const distance = euclideanDistance(liveDescriptor, stored);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestUser = user;
    }
  }

  return {
    matched: bestDistance < MATCH_THRESHOLD,
    user: bestDistance < MATCH_THRESHOLD ? bestUser : null,
    distance: bestDistance,
  };
}

module.exports = { euclideanDistance, verifyDescriptor, findBestMatch, MATCH_THRESHOLD };
