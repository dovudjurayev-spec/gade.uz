// Нормализация узбекского номера: +998 XX XXX XX XX
export function normalizePhoneUz(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  // На вход могут прийти: 998901234567, 901234567, +998901234567, 8 901 ...
  let n = digits;
  if (n.startsWith("998")) n = n.slice(3);
  if (n.length !== 9) return null;
  return `+998${n}`;
}

export function formatPhoneUz(phone: string): string {
  const m = phone.match(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/);
  if (!m) return phone;
  return `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
}
