export function getAgentAvatarUrl(agentId: string, style: string = "bottts"): string {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(agentId)}`;
}

export function getUserAvatarUrl(seed: string = "user"): string {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;
}

export function isEmojiAvatar(avatar?: string): boolean {
  if (!avatar) return false;
  return !avatar.startsWith("data:") && !avatar.startsWith("http");
}
