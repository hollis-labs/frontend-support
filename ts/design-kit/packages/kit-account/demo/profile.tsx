import { useState } from 'react'
import { Button, Input } from '@hollis-labs/design-components'
import { AccountPreferences, AccountProfile, WhoamiBadge } from '@hollis-labs/kit-account'

export function AccountProfileFixture() {
  const [profile, setProfile] = useState({ displayName: 'Local user', email: 'local@example.test' })
  const [preference, setPreference] = useState('Dark')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [fail, setFail] = useState(false)
  const save = () => {
    setSaving(true); setError(''); setNotice('')
    setTimeout(() => { setSaving(false); if (fail) setError('Unable to save; your draft remains.'); else setNotice('Saved by the host') }, 300)
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 bg-bg p-4 text-fg">
      <WhoamiBadge identity={{ state: 'identified', displayName: 'Local identity', source: 'Fixture app', assurance: 'local' }} />
      <Button onClick={() => setFail(!fail)} className="self-start">{fail ? 'Use successful saves' : 'Fail next saves'}</Button>
      <AccountProfile value={profile} onValueChange={setProfile} onSave={save} saving={saving} error={error} notice={notice} />
      <AccountPreferences onSave={save} saving={saving} error={error} notice={notice}>
        <label className="flex flex-col gap-1 text-label text-fg-secondary">Preferred theme
          <Input value={preference} onChange={(event) => setPreference(event.target.value)} className="text-control md:text-control text-fg" />
        </label>
      </AccountPreferences>
    </main>
  )
}
