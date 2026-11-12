import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  useVoiceSelector,
  VoiceSelector,
  VoiceSelectorAccent,
  VoiceSelectorAge,
  VoiceSelectorAttributes,
  VoiceSelectorBullet,
  VoiceSelectorContent,
  VoiceSelectorDescription,
  VoiceSelectorEmpty,
  VoiceSelectorGender,
  VoiceSelectorInput,
  VoiceSelectorItem,
  VoiceSelectorList,
  VoiceSelectorName,
  VoiceSelectorPreview,
  VoiceSelectorTrigger,
} from '../index'
import { installCmdkStubs } from './fakes'

beforeAll(installCmdkStubs)
afterEach(cleanup)

const VOICES = [
  { id: 'aria', name: 'Aria', gender: 'female', accent: 'american' },
  { id: 'oliver', name: 'Oliver', gender: 'male', accent: 'british' },
] as const

/** Rows wired the way the README shows: the item picks and closes through the context. */
function Rows() {
  const { setOpen, setValue } = useVoiceSelector()
  return (
    <>
      <VoiceSelectorInput placeholder="Search voices..." />
      <VoiceSelectorList>
        <VoiceSelectorEmpty>No voices.</VoiceSelectorEmpty>
        {VOICES.map((voice) => (
          <VoiceSelectorItem
            key={voice.id}
            keywords={[voice.name]}
            onSelect={() => {
              setValue(voice.id)
              setOpen(false)
            }}
            value={voice.id}
          >
            <VoiceSelectorName>{voice.name}</VoiceSelectorName>
          </VoiceSelectorItem>
        ))}
      </VoiceSelectorList>
    </>
  )
}

describe('VoiceSelector (real Dialog)', () => {
  it('opens from its trigger into a dialog named by `title`', async () => {
    render(
      <VoiceSelector>
        <VoiceSelectorTrigger>Choose voice</VoiceSelectorTrigger>
        <VoiceSelectorContent title="Pick a voice">
          <Rows />
        </VoiceSelectorContent>
      </VoiceSelector>
    )
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByText('Choose voice'))

    expect(await screen.findByRole('dialog', { name: 'Pick a voice' })).toBeTruthy()
    expect(screen.getByText('Aria')).toBeTruthy()
  })

  it('picks a voice and closes through the context, reporting both changes once', async () => {
    const onValueChange = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <VoiceSelector defaultOpen onOpenChange={onOpenChange} onValueChange={onValueChange}>
        <VoiceSelectorContent>
          <Rows />
        </VoiceSelectorContent>
      </VoiceSelector>
    )

    fireEvent.click(await screen.findByText('Oliver'))

    expect(onValueChange.mock.calls).toEqual([['oliver']])
    expect(onOpenChange.mock.calls).toEqual([[false]])
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('leaves closing to the host when open is controlled, and tells it', async () => {
    const onOpenChange = vi.fn()
    render(
      <VoiceSelector onOpenChange={onOpenChange} open>
        <VoiceSelectorContent>
          <Rows />
        </VoiceSelectorContent>
      </VoiceSelector>
    )

    fireEvent.click(await screen.findByText('Aria'))

    expect(onOpenChange.mock.calls).toEqual([[false]])
    expect(screen.getByRole('dialog')).toBeTruthy() // the host did not close it
  })

  it('closes a controlled selector when the host acts on onOpenChange', async () => {
    function Host() {
      const [open, setOpen] = useState(true)
      return (
        <VoiceSelector onOpenChange={setOpen} open={open}>
          <VoiceSelectorContent>
            <Rows />
          </VoiceSelectorContent>
        </VoiceSelector>
      )
    }
    render(<Host />)
    fireEvent.click(await screen.findByText('Aria'))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('calls onOpenChange with the open flag alone when Escape closes it', async () => {
    const onOpenChange = vi.fn()
    render(
      <VoiceSelector defaultOpen onOpenChange={onOpenChange}>
        <VoiceSelectorContent>
          <Rows />
        </VoiceSelectorContent>
      </VoiceSelector>
    )
    await screen.findByRole('dialog')

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    await waitFor(() => expect(onOpenChange).toHaveBeenCalled())
    expect(onOpenChange.mock.calls[0]).toEqual([false])
  })

  it('takes the controlled value over its own state', async () => {
    const onValueChange = vi.fn()
    function Selected() {
      const { value } = useVoiceSelector()
      return <output data-testid="value">{value ?? 'none'}</output>
    }
    render(
      <VoiceSelector defaultOpen onValueChange={onValueChange} value="aria">
        <Selected />
        <VoiceSelectorContent>
          <Rows />
        </VoiceSelectorContent>
      </VoiceSelector>
    )
    fireEvent.click(await screen.findByText('Oliver'))

    expect(onValueChange).toHaveBeenCalledWith('oliver')
    expect(screen.getByTestId('value').textContent).toBe('aria') // controlled: the host decides
  })

  it('filters by keywords and shows the empty state', async () => {
    render(
      <VoiceSelector defaultOpen>
        <VoiceSelectorContent>
          <Rows />
        </VoiceSelectorContent>
      </VoiceSelector>
    )
    const input = await screen.findByPlaceholderText('Search voices...')

    fireEvent.change(input, { target: { value: 'oli' } })
    await waitFor(() => expect(screen.queryByText('Aria')).toBeNull())
    expect(screen.getByText('Oliver')).toBeTruthy()

    fireEvent.change(input, { target: { value: 'zzz' } })
    await waitFor(() => expect(screen.getByText('No voices.')).toBeTruthy())
  })

  it('refuses the context outside a VoiceSelector', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    function Orphan() {
      useVoiceSelector()
      return null
    }
    expect(() => render(<Orphan />)).toThrow('VoiceSelector components must be used within VoiceSelector')
  })
})

describe('VoiceSelector parts', () => {
  it('names the gender icon by its value, and leaves the unspecified one decorative', () => {
    const { container } = render(
      <>
        <VoiceSelectorGender data-testid="f" value="female" />
        <VoiceSelectorGender data-testid="n" value="non-binary" />
        <VoiceSelectorGender data-testid="none" />
      </>
    )
    expect(screen.getByRole('img', { name: 'female' })).toBe(screen.getByTestId('f'))
    expect(screen.getByRole('img', { name: 'non-binary' })).toBe(screen.getByTestId('n'))
    expect(screen.getByTestId('none').getAttribute('role')).toBeNull()
    expect(container.querySelectorAll('svg')).toHaveLength(3)
    expect([...container.querySelectorAll('svg')].every((svg) => svg.getAttribute('aria-hidden') === 'true')).toBe(true)
  })

  it('shows its children in place of the gender icon or accent flag, unnamed', () => {
    render(
      <>
        <VoiceSelectorGender data-testid="g" value="male">M</VoiceSelectorGender>
        <VoiceSelectorAccent data-testid="a" value="british">UK</VoiceSelectorAccent>
      </>
    )
    expect(screen.getByTestId('g').textContent).toBe('M')
    expect(screen.getByTestId('g').getAttribute('role')).toBeNull()
    expect(screen.getByTestId('a').textContent).toBe('UK')
    expect(screen.getByTestId('a').getAttribute('role')).toBeNull()
  })

  it('renders upstream’s flag for a known accent, named, and nothing for an unknown one', () => {
    render(
      <>
        <VoiceSelectorAccent data-testid="us" value="american" />
        <VoiceSelectorAccent data-testid="sco" value="scottish" />
        <VoiceSelectorAccent data-testid="nz" value="new-zealand" />
        <VoiceSelectorAccent data-testid="unknown" value="martian" />
        <VoiceSelectorAccent data-testid="proto" value="constructor" />
        <VoiceSelectorAccent data-testid="none" />
      </>
    )
    expect(screen.getByTestId('us').textContent).toBe('\u{1F1FA}\u{1F1F8}')
    expect(screen.getByTestId('sco').textContent).toBe('\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}')
    expect(screen.getByTestId('nz').textContent).toBe('\u{1F1F3}\u{1F1FF}')
    expect(screen.getByRole('img', { name: 'american' })).toBe(screen.getByTestId('us'))
    for (const id of ['unknown', 'proto', 'none']) {
      expect(screen.getByTestId(id).textContent).toBe('')
      expect(screen.getByTestId(id).getAttribute('role')).toBeNull()
    }
  })

  it('renders the text parts, with the bullet hidden from assistive technology', () => {
    render(
      <VoiceSelectorAttributes data-testid="attrs">
        <VoiceSelectorName>Aria</VoiceSelectorName>
        <VoiceSelectorBullet data-testid="bullet" />
        <VoiceSelectorAge>32</VoiceSelectorAge>
        <VoiceSelectorDescription>Warm</VoiceSelectorDescription>
      </VoiceSelectorAttributes>
    )
    expect(screen.getByTestId('attrs').textContent).toBe('Aria•32Warm')
    expect(screen.getByTestId('bullet').getAttribute('aria-hidden')).toBe('true')
  })
})

describe('VoiceSelectorPreview', () => {
  it('labels itself by state', () => {
    const { rerender } = render(<VoiceSelectorPreview />)
    expect(screen.getByRole('button', { name: 'Play preview' })).toBeTruthy()
    rerender(<VoiceSelectorPreview playing />)
    expect(screen.getByRole('button', { name: 'Pause preview' })).toBeTruthy()
  })

  it('is disabled and busy while loading', () => {
    render(<VoiceSelectorPreview loading />)
    const button = screen.getByRole('button') as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect(button.querySelector('svg')?.getAttribute('class')).toContain('animate-spin')
  })

  it('plays without selecting the row it sits in', () => {
    const onPlay = vi.fn()
    const onClick = vi.fn()
    const onRowClick = vi.fn()
    render(
      <div onClick={onRowClick}>
        <VoiceSelectorPreview onClick={onClick} onPlay={onPlay} />
      </div>
    )
    act(() => {
      fireEvent.click(screen.getByRole('button'))
    })
    expect(onPlay).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onRowClick).not.toHaveBeenCalled()
  })
})
