/** Schools available during user + organization signup (keep in sync everywhere). */
export const SIGNUP_UNIVERSITIES = [
  {
    id: 'rutgers',
    name: 'Rutgers University',
    campus: 'New Brunswick, NJ',
  },
  {
    id: 'northeastern',
    name: 'Northeastern University',
    campus: 'Boston, MA',
  },
  {
    id: 'usc',
    name: 'University of Southern California',
    campus: 'Los Angeles, CA',
  },
];

export const SIGNUP_UNIVERSITY_NAMES = SIGNUP_UNIVERSITIES.map((u) => u.name);

export function isSignupUniversity(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  return SIGNUP_UNIVERSITY_NAMES.includes(value.trim());
}
