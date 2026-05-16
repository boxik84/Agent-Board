import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { Plus, FileText, Trash2, Save, FileEdit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

const FILE_ICONS: Record<string, string> = {
  memory: '🧠',
  soul: '✨',
  readme: '📖',
  instruction: '📋',
  log: '📝',
  config: '⚙️',
  text: '📄',
}

const DEFAULT_FILES = ['Memory', 'Soul', 'README', 'Instructions']

function getFileIcon(name: string) {
  const lower = name.toLowerCase()
  for (const [key, icon] of Object.entries(FILE_ICONS)) {
    if (lower.includes(key)) return icon
  }
  return '📄'
}

export default function FilesPage() {
  const qc = useQueryClient()
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editName, setEditName] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [newFileContent, setNewFileContent] = useState('')

  const { data: company } = useQuery({ queryKey: ['company'], queryFn: api.company.get })
  const { data: agents = [] } = useQuery({
    queryKey: ['agents', company?.id],
    queryFn: () => api.agents.list(company?.id),
    enabled: !!company?.id,
  })
  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: ['files', selectedAgentId],
    queryFn: () => api.agents.files.list(selectedAgentId),
    enabled: !!selectedAgentId,
  })

  const activeAgents = (agents as any[]).filter((a: any) => a.status !== 'terminated')
  const selectedAgent = activeAgents.find((a: any) => a.id === selectedAgentId)
  const selectedFile = (files as any[]).find((f: any) => f.id === selectedFileId)

  const createMut = useMutation({
    mutationFn: (data: any) => api.agents.files.create(selectedAgentId, data),
    onSuccess: (f: any) => {
      qc.invalidateQueries({ queryKey: ['files', selectedAgentId] })
      setShowNew(false)
      setNewFileName('')
      setNewFileContent('')
      setSelectedFileId(f.id)
      setEditContent(f.content)
      setEditName(f.name)
      setIsEditing(false)
      toast.success('Súbor vytvorený')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: ({ fileId, data }: any) => api.agents.files.update(selectedAgentId, fileId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files', selectedAgentId] })
      setIsEditing(false)
      toast.success('Súbor uložený')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: (fileId: string) => api.agents.files.delete(selectedAgentId, fileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files', selectedAgentId] })
      setSelectedFileId(null)
      setIsEditing(false)
      toast.success('Súbor vymazaný')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const openFile = (file: any) => {
    setSelectedFileId(file.id)
    setEditContent(file.content)
    setEditName(file.name)
    setIsEditing(false)
  }

  const saveFile = () => {
    if (!selectedFileId) return
    updateMut.mutate({ fileId: selectedFileId, data: { content: editContent, name: editName } })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top bar with agent selector */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border flex-shrink-0">
        <h1 className="text-xl font-bold text-foreground flex-shrink-0">Súbory</h1>
        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <Select value={selectedAgentId} onValueChange={id => { setSelectedAgentId(id); setSelectedFileId(null); setIsEditing(false) }}>
            <SelectTrigger>
              <SelectValue placeholder="— Vybrať agenta —" />
            </SelectTrigger>
            <SelectContent>
              {activeAgents.map((a: any) => (
                <SelectItem key={a.id} value={a.id}>{a.icon} {a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedAgentId && (
          <Button size="sm" variant="outline" onClick={() => setShowNew(true)}>
            <Plus size={14} /> Nový súbor
          </Button>
        )}
      </div>

      {!selectedAgentId ? (
        <div className="flex-1 flex items-center justify-center flex-col gap-3 text-muted-foreground">
          <FileText size={40} className="opacity-30" />
          <p>Vyberte agenta vyššie pre zobrazenie jeho súborov</p>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* File list sidebar */}
          <div className="w-56 border-r border-border flex flex-col flex-shrink-0">
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {selectedAgent?.icon} {selectedAgent?.name}
              </span>
            </div>
            <Separator />

            {showNew && (
              <div className="p-2 border-b border-border space-y-2">
                <Input
                  placeholder="Názov súboru"
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  className="h-7 text-xs"
                  autoFocus
                />
                <div className="flex gap-1">
                  <Button size="sm" className="h-6 text-xs flex-1"
                    onClick={() => createMut.mutate({ name: newFileName, content: newFileContent })}
                    disabled={!newFileName.trim() || createMut.isPending}
                  >
                    Vytvoriť
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowNew(false)}>✕</Button>
                </div>
              </div>
            )}

            <ScrollArea className="flex-1">
              <div className="py-1">
                {filesLoading ? (
                  <div className="text-xs text-muted-foreground px-3 py-2">Načítavam...</div>
                ) : (files as any[]).length === 0 ? (
                  <div className="px-3 py-4 text-center">
                    <p className="text-xs text-muted-foreground mb-2">Žiadne súbory</p>
                    <p className="text-xs text-muted-foreground">Odporúčané:</p>
                    {DEFAULT_FILES.map(name => (
                      <button
                        key={name}
                        className="block w-full text-left text-xs text-primary hover:text-primary/80 px-1 py-0.5 transition-colors"
                        onClick={() => createMut.mutate({ name, content: '' })}
                      >
                        + {name}
                      </button>
                    ))}
                  </div>
                ) : (
                  (files as any[]).map((file: any) => (
                    <button
                      key={file.id}
                      onClick={() => openFile(file)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left ${
                        selectedFileId === file.id
                          ? 'bg-primary/15 text-primary'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                      }`}
                    >
                      <span className="text-base flex-shrink-0">{getFileIcon(file.name)}</span>
                      <span className="truncate">{file.name}</span>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* File editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedFile ? (
              <div className="flex-1 flex items-center justify-center flex-col gap-2 text-muted-foreground">
                <FileText size={32} className="opacity-20" />
                <p className="text-sm">Vyberte súbor zo zoznamu</p>
              </div>
            ) : (
              <>
                {/* File header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getFileIcon(selectedFile.name)}</span>
                    {isEditing ? (
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="h-7 text-sm w-48"
                      />
                    ) : (
                      <span className="font-medium text-foreground">{selectedFile.name}</span>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {new Date(selectedFile.updatedAt).toLocaleDateString()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <Button size="sm" onClick={saveFile} disabled={updateMut.isPending}>
                          <Save size={13} /> Uložiť
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setIsEditing(false); setEditContent(selectedFile.content); setEditName(selectedFile.name) }}>
                          Zrušiť
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                        <FileEdit size={13} /> Upraviť
                      </Button>
                    )}
                    <Button size="icon-sm" variant="ghost" className="hover:text-destructive"
                      onClick={() => deleteMut.mutate(selectedFile.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                  {isEditing ? (
                    <Textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      className="h-full w-full rounded-none border-0 focus-visible:ring-0 font-mono text-sm resize-none bg-transparent p-4"
                      placeholder="Obsah súboru..."
                    />
                  ) : (
                    <ScrollArea className="h-full">
                      <pre className="p-4 text-sm text-foreground font-mono whitespace-pre-wrap leading-relaxed">
                        {selectedFile.content || <span className="text-muted-foreground italic">Súbor je prázdny. Kliknite na Upraviť.</span>}
                      </pre>
                    </ScrollArea>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
