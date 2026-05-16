import { BOD_MEMBERS } from '@/lib/bod'

export default function BoardOfDirectorsPage() {
  const members = [
    {
      ...BOD_MEMBERS[0],
      description: 'Zakladateľ a predseda predstavenstva. Vízia, stratégia a celkový smer spoločnosti.',
      color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30',
    },
    {
      ...BOD_MEMBERS[1],
      description: 'Viceprezident a technický riaditeľ. Zodpovedný za technologickú infraštruktúru a AI agentov.',
      color: 'from-violet-500/20 to-purple-500/10 border-violet-500/30',
    },
    {
      ...BOD_MEMBERS[2],
      description: 'Člen predstavenstva a administratívny riaditeľ. Operácie, compliance a interné procesy.',
      color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30',
    },
  ]

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Board of Directors</h1>
        <p className="text-muted-foreground mt-1 text-sm">Predstavenstvo spoločnosti AgentBoard</p>
      </div>

      {/* Org chart style */}
      <div className="flex flex-col items-center gap-6">
        {/* Chairman at top */}
        <MemberCard member={members[0]} size="lg" />

        {/* Connector */}
        <div className="w-px h-8 bg-border" />

        {/* Two below */}
        <div className="relative flex gap-16 items-start">
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-border" style={{ top: '-1px' }} />
          <div className="flex flex-col items-center gap-2">
            <div className="w-px h-8 bg-border" />
            <MemberCard member={members[1]} size="md" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-px h-8 bg-border" />
            <MemberCard member={members[2]} size="md" />
          </div>
        </div>
      </div>

      {/* Table view below */}
      <div className="mt-12">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Detaily</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Člen</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Pozícia</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Popis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map(m => (
                <tr key={m.name} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img src={m.avatar} alt={m.name} className="size-7 rounded-full object-cover flex-shrink-0" />
                      <span className="font-medium">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function MemberCard({ member, size }: { member: any; size: 'lg' | 'md' }) {
  return (
    <div className={`rounded-xl border bg-gradient-to-br ${member.color} p-5 ${size === 'lg' ? 'w-72' : 'w-60'}`}>
      <div className="flex items-start gap-3">
        <img src={member.avatar} alt={member.name} className="size-12 rounded-full object-cover flex-shrink-0" />
        <div className="min-w-0">
          <div className="font-bold text-foreground">{member.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{member.title}</div>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{member.description}</p>
    </div>
  )
}
