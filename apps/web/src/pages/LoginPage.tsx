import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { setToken } from '../api/auth'
import { Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const DEMO_EMAIL = 'admin@agentboard.ai'
  const DEMO_PASSWORD = 'admin123'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Demo / hardcoded admin login (no backend required)
      if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
        setToken('demo-token-admin')
        navigate('/')
        return
      }
      // Fallback to real API (local dev)
      const fn = mode === 'login' ? api.auth.login : api.auth.register
      const { token } = await fn(email, password)
      setToken(token)
      navigate('/')
    } catch (err: any) {
      toast.error(err.message ?? 'Prihlásenie zlyhalo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,oklch(0.585_0.233_277/0.08),transparent_60%),radial-gradient(ellipse_at_bottom_right,oklch(0.585_0.233_277/0.05),transparent_60%)] pointer-events-none" />

      <div className="relative w-full max-w-sm fade-in-up">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex items-center justify-center size-10 rounded-xl bg-primary/20 text-primary">
            <Bot size={20} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">AgentBoard</h1>
        </div>

        <div className="bg-card border rounded-2xl p-6 shadow-xl shadow-black/30">
          <h2 className="text-base font-semibold text-foreground mb-5">
            {mode === 'login' ? 'Prihlásenie' : 'Registrácia'}
          </h2>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vas@email.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Heslo</Label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? 'Načítavam...' : mode === 'login' ? 'Prihlásiť sa' : 'Registrovať'}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground/50">
            admin@agentboard.ai · admin123
          </p>
        </div>
      </div>
    </div>
  )
}
