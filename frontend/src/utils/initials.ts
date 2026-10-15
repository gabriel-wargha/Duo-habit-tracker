// "Ana Souza" → "AS", "gabriel" → "G", "Alex (demo)" → "A". Used for avatars.
// Only words that start with a letter count (\p{L} = any letter in any alphabet, thanks to the u flag),
// so brackets, emojis and numbers don't end up in an avatar.
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter((word) => /^\p{L}/u.test(word))
  if (words.length === 0) return '?'
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0][0]
  return letters.toUpperCase()
}
