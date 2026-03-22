/**
 * Calculate profile completeness as a percentage (0-100).
 * Checks how many of the requiredFields are present and non-empty on the profile.
 */
export function calculateProfileCompleteness(
  profile: Record<string, unknown>,
  requiredFields: string[],
): number {
  if (requiredFields.length === 0) return 100;

  const filledCount = requiredFields.filter((field) => {
    const value = profile[field];
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }).length;

  return Math.round((filledCount / requiredFields.length) * 100);
}

/**
 * Get initials from a name string.
 * e.g. "Γιώργος Παπαδόπουλος" -> "ΓΠ"
 */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .slice(0, 2)
    .join('');
}

/**
 * Generate a UI Avatars URL for a given name.
 */
export function generateAvatarUrl(name: string): string {
  const encoded = encodeURIComponent(name);
  return `https://ui-avatars.com/api/?name=${encoded}&background=random&color=fff&size=128&bold=true`;
}
