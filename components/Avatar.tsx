// Structural shape shared by static Person and dynamic Member.
type AvatarPerson = {
  color: string;
  initials: string;
  photo?: string | null;
  textColor?: string | null;
};

// Pick a readable text colour for a given solid background (so pale avatars like
// Ninon's rose stay legible instead of white-on-pale).
function textColorFor(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return "#ffffff";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65 ? "#2B2A28" : "#ffffff";
}

// Avatar: a custom photo when set, otherwise a solid colour circle with initials.
export function Avatar({ person, size = 40 }: { person: AvatarPerson; size?: number }) {
  if (person.photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={person.photo}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        backgroundColor: person.color,
        color: person.textColor ?? textColorFor(person.color),
        fontSize: Math.round(size * (person.initials.length > 1 ? 0.38 : 0.46)),
      }}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold leading-none"
    >
      {person.initials}
    </span>
  );
}
