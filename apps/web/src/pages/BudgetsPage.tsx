import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { AlertTriangle, Euro, Edit2, Check, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

const EUR_PER_USD_CENT = 0.0092
const CZK_PER_EUR = 25.3

function fmtEur(cents: number) { return (cents * EUR_PER_USD_CENT).toFixed(2) }
function fmtCzk(cents: number) { return Math.round(cents * EUR_PER_USD_CENT * CZK_PER_EUR).toLocaleString('cs-CZ') }

export default function BudgetsPage() {
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [budgetInput, setBudgetInput] = useState('')

  const { data: company } = useQuery({ queryKey: ['company'], queryFn: api.company.get })
  const { data: agents = [] } = useQuery({
    queryKey: ['agents', company?.id],
    queryFn: () => api.agents.list(company?.id),
    enabled: !!company?.id,
  })
  const { data: costs = [] } = useQuery({
    queryKey: ['costs', company?.id],
    queryFn: () => api.costs.summary(company?.id),
    enabled: !!company?.id,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => api.agents.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }); setEditingId(null); toast.success('Rozpočet aktualizovaný') },
    onError: (e: any) => toast.error(e.message),
  })

  const activeAgents = (agents as any[]).filter((a: any) => a.status !== 'terminated')
  const totalSpent = (costs as any[]).reduce((s: number, c: any) => s + (c.totalCents ?? 0), 0)
  const totalBudget = activeAgents.reduce((s: number, a: any) => s + (a.budgetMonthlyCents ?? 0), 0)

  const agentCost = (agentId: string) => (costs as any[]).find((c: any) => c.agentId === agentId)?.totalCents ?? 0

  const startEdit = (agent: any) => {
    setEditingId(agent.id)
    setBudgetInput(String(agent.budgetMonthlyCents / 100))
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Rozpočty</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="py-4 gap-2">
          <CardContent className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-yellow-500/15 text-yellow-400 flex items-center justify-center">
              <Euro size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">€{fmtEur(totalSpent)}</div>
              <div className="text-xs text-muted-foreground">{fmtCzk(totalSpent)} Kč</div>
              <div className="text-sm text-muted-foreground">Celkové náklady</div>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4 gap-2">
          <CardContent className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <Euro size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {totalBudget > 0 ? `€${fmtEur(totalBudget)}` : '—'}
              </div>
              {totalBudget > 0 && <div className="text-xs text-muted-foreground">{fmtCzk(totalBudget)} Kč</div>}
              <div className="text-sm text-muted-foreground">Celkový rozpočet</div>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4 gap-2">
          <CardContent className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-green-500/15 text-green-400 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{activeAgents.length}</div>
              <div className="text-sm text-muted-foreground">Aktívni agenti</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-agent breakdown */}
      <Card className="py-4 gap-3">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <Euro size={14} className="text-primary" /> Náklady podľa agenta
          </CardTitle>
          <CardDescription className="text-xs">tento mesiac · kliknite na Edit pre zmenu rozpočtu</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeAgents.length === 0 && (
            <p className="text-muted-foreground text-sm">Žiadni agenti.</p>
          )}
          {activeAgents.map((agent: any) => {
            const cents = agentCost(agent.id)
            const budget = agent.budgetMonthlyCents
            const pct = budget > 0 ? Math.min(Math.round((cents / budget) * 100), 100) : 0
            const isWarn = pct >= 80
            const isOver = pct >= 100

            return (
              <div key={agent.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl">{agent.icon}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">{agent.name}</div>
                      <div className="text-xs text-muted-foreground">{agent.role}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {editingId === agent.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number" min={0}
                          value={budgetInput}
                          onChange={e => setBudgetInput(e.target.value)}
                          className="w-24 h-7 text-xs"
                        />
                        <Button size="icon-sm" variant="ghost" className="size-7"
                          onClick={() => updateMut.mutate({ id: agent.id, data: { budgetMonthlyCents: Math.round(Number(budgetInput) * 100) } })}>
                          <Check size={12} />
                        </Button>
                        <Button size="icon-sm" variant="ghost" className="size-7" onClick={() => setEditingId(null)}>
                          <X size={12} />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${isOver ? 'text-destructive' : isWarn ? 'text-yellow-400' : 'text-foreground'}`}>
                            €{fmtEur(cents)}
                          </div>
                          <div className="text-xs text-muted-foreground">{fmtCzk(cents)} Kč</div>
                          {budget > 0 && <div className="text-xs text-muted-foreground">/ €{fmtEur(budget)} · {pct}%</div>}
                        </div>
                        <Button size="icon-sm" variant="ghost" className="size-7" onClick={() => startEdit(agent)}>
                          <Edit2 size={12} />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {budget > 0 && (
                  <Progress
                    value={pct}
                    className={isOver ? '[&>div]:bg-destructive' : isWarn ? '[&>div]:bg-yellow-500' : ''}
                  />
                )}

                {(isOver || isWarn) && !editingId && (
                  <div className={`flex items-center gap-1 text-xs ${isOver ? 'text-destructive' : 'text-yellow-400'}`}>
                    <AlertTriangle size={11} />
                    {isOver ? 'Rozpočet vyčerpaný — agent pozastavený' : 'Blíži sa limit rozpočtu'}
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
