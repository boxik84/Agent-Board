import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { Brain, Search, User, Lightbulb, FolderOpen, BookMarked, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface Memory {
  filename: string
  name: string
  type: string
  description: string
  body: string
}

const TYPE_META: Record<string, { icon: any; color: string; label: string }> = {
  user:     { icon: User,      color: 'text-blue-400',   label: 'User' },
  feedback: { icon: Lightbulb, color: 'text-yellow-400', label: 'Feedback' },
  project:  { icon: FolderOpen,color: 'text-green-400',  label: 'Project' },
  reference:{ icon: BookMarked,color: 'text-purple-400', label: 'Reference' },
  unknown:  { icon: Brain,     color: 'text-muted-foreground', label: 'Memory' },
}

function MemoryCard({ memory, isSelected, onClick }: { memory: Memory; isSelected: boolean; onClick: () => void }) {
  const meta = TYPE_META[memory.type] ?? TYPE_META.unknown
  const Icon = meta.icon

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-xl border transition-all',
        isSelected
          ? 'bg-primary/10 border-primary/30 shadow-sm shadow-primary/10'
          : 'bg-card border-border hover:border-border/80 hover:bg-card/80'
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className={cn('mt-0.5 flex-shrink-0', meta.color)}>
          <Icon size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground truncate">{memory.name}</span>
            <Badge variant="secondary" className={cn('text-xs h-4 px-1.5', meta.color)}>{meta.label}</Badge>
          </div>
          {memory.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{memory.description}</p>
          )}
        </div>
      </div>
    </button>
  )
}

function MemoryDocument({ memory }: { memory: Memory }) {
  const meta = TYPE_META[memory.type] ?? TYPE_META.unknown
  const Icon = meta.icon

  // Split body into sections (bold headers followed by content)
  const sections = useMemo(() => {
    const lines = memory.body.split('\n')
    const result: { heading: string | null; lines: string[] }[] = [{ heading: null, lines: [] }]
    for (const line of lines) {
      if (line.startsWith('## ') || line.startsWith('### ')) {
        result.push({ heading: line.replace(/^#{2,3}\s+/, ''), lines: [] })
      } else {
        result[result.length - 1].lines.push(line)
      }
    }
    return result
  }, [memory.body])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Doc header */}
      <div className="flex-shrink-0 px-8 pt-8 pb-5 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          <div className={cn('flex items-center justify-center size-10 rounded-xl bg-card border border-border', meta.color)}>
            <Icon size={18} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{memory.name}</h2>
            <Badge variant="secondary" className={cn('text-xs mt-0.5', meta.color)}>{meta.label}</Badge>
          </div>
        </div>
        {memory.description && (
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">{memory.description}</p>
        )}
      </div>

      {/* Doc body */}
      <ScrollArea className="flex-1">
        <div className="px-8 py-6 max-w-2xl space-y-5">
          {sections.map((sec, i) => (
            <div key={i}>
              {sec.heading && (
                <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-2">{sec.heading}</h3>
              )}
              <div className="space-y-1">
                {sec.lines.map((line, j) => {
                  if (!line.trim()) return <div key={j} className="h-2" />
                  // Bold (**text**)
                  const rendered = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                  if (line.startsWith('- ') || line.startsWith('* ')) {
                    return (
                      <div key={j} className="flex items-start gap-2 text-sm text-foreground/90 leading-relaxed">
                        <span className="text-primary mt-1.5 flex-shrink-0">•</span>
                        <span dangerouslySetInnerHTML={{ __html: rendered.replace(/^[-*]\s+/, '') }} />
                      </div>
                    )
                  }
                  if (line.startsWith('**Why:**') || line.startsWith('**How to apply:**')) {
                    return (
                      <div key={j} className="text-sm leading-relaxed pl-3 border-l-2 border-primary/30 text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: rendered }} />
                    )
                  }
                  return (
                    <p key={j} className="text-sm text-foreground/90 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: rendered }} />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

export default function MemoryPage() {
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)

  const { data: memories = [], isLoading } = useQuery({
    queryKey: ['memory'],
    queryFn: () => api.memory.list(),
  })

  const filtered = useMemo(() => {
    return (memories as Memory[]).filter(m => {
      const matchesType = selectedType === 'all' || m.type === selectedType
      const q = search.toLowerCase()
      const matchesSearch = !q || m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) || m.body.toLowerCase().includes(q)
      return matchesType && matchesSearch
    })
  }, [memories, search, selectedType])

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: (memories as Memory[]).length }
    for (const m of memories as Memory[]) {
      counts[m.type] = (counts[m.type] ?? 0) + 1
    }
    return counts
  }, [memories])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Brain size={20} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">Memory</h1>
            <Badge variant="secondary" className="text-xs">{(memories as Memory[]).length} záznamov</Badge>
          </div>
          <div className="flex-1 max-w-sm relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Hľadať v pamäti..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          {/* Type filters */}
          <div className="flex items-center gap-1">
            {(['all', 'user', 'feedback', 'project', 'reference'] as const).map(type => {
              const count = typeCounts[type] ?? 0
              if (type !== 'all' && !count) return null
              const meta = type === 'all' ? null : TYPE_META[type]
              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                    selectedType === type ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent/50'
                  )}
                >
                  {meta && <meta.icon size={11} />}
                  {type === 'all' ? 'Všetko' : meta?.label}
                  <span className="opacity-60">{count}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 size={18} className="animate-spin" /> Načítavam pamäť...
        </div>
      ) : (memories as Memory[]).length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Brain size={48} className="opacity-20" />
          <p className="text-sm">Žiadne záznamy v pamäti</p>
          <p className="text-xs opacity-60">Pamäť sa vytvorí automaticky počas práce s Claude</p>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar list */}
          <div className="w-72 flex-shrink-0 border-r border-border flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-1.5">
                {filtered.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">Nič nenájdené</div>
                ) : filtered.map(m => (
                  <MemoryCard
                    key={m.filename}
                    memory={m}
                    isSelected={selectedMemory?.filename === m.filename}
                    onClick={() => setSelectedMemory(m)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Document viewer */}
          <div className="flex-1 overflow-hidden">
            {selectedMemory ? (
              <MemoryDocument memory={selectedMemory} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Brain size={48} className="opacity-20" />
                <p className="text-sm">Vyberte záznam zo zoznamu</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
