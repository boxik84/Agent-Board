export const BOD_MEMBERS = [
  {
    id: 'bod-boxik',
    name: 'Boxik',
    title: 'Chairman',
    avatar: 'https://images-ext-1.discordapp.net/external/F7mpXm2Oq0I2hBoOqt00e-faF-xOZ7UYs37_J5DDzWg/%3Fsize%3D128/https/cdn.discordapp.com/avatars/1016759939642949732/544030b3980fb86da25da506541dee41.webp?format=webp',
  },
  {
    id: 'bod-angel',
    name: 'Ángel Muerto',
    title: 'Vice Chairman · Chief of Tech',
    avatar: 'https://images-ext-1.discordapp.net/external/UwCY9SBsYmdZypDQozXhZxkxVT4CFjhoOtJbZH9gZUY/%3Fsize%3D128/https/cdn.discordapp.com/avatars/583351009502298148/9ae3b20b7f1fbac367122203e7a02cdb.webp?format=webp',
  },
  {
    id: 'bod-torl',
    name: 'Torl_',
    title: 'Member · Chief of Admin',
    avatar: 'https://images-ext-1.discordapp.net/external/yLJt8WVhvKCddWbD3k7jTdHNmDt7GQv22oHgbT-nV_E/%3Fsize%3D128/https/cdn.discordapp.com/avatars/775708237391069216/1be99a1fad39ac464446a00b2c8ea2fe.webp?format=webp',
  },
]

export const BOD_BY_ID = Object.fromEntries(BOD_MEMBERS.map(m => [m.id, m]))

export function BodAvatar({ id, size = 20 }: { id: string; size?: number }) {
  const m = BOD_BY_ID[id]
  if (!m) return null
  return (
    <img
      src={m.avatar}
      alt={m.name}
      width={size}
      height={size}
      className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }}
    />
  )
}
