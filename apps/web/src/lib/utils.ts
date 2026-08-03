import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Το tailwind-merge δεν ξέρει τα δικά μας shadows: το `shadow-card` το περνούσε
// για χρώμα σκιάς, οπότε δεν έσβηνε το `shadow-sm` της βασικής Card και η σκιά
// δεν φαινόταν ποτέ. Το δηλώνουμε ρητά στην ομάδα box-shadow.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { shadow: [{ shadow: ['card'] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}