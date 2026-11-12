import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Image } from '../components/image'
import { InlineCitationCard, InlineCitationCardBody, InlineCitationCardTrigger, InlineCitationCarousel, InlineCitationCarouselContent, InlineCitationCarouselIndex, InlineCitationCarouselItem, InlineCitationCarouselNext, InlineCitationCarouselPrev, InlineCitationSource } from '../components/inline-citation'

afterEach(cleanup)
function pages(count = 2) {
  return <InlineCitationCarouselContent>{Array.from({ length: count }, (_, i) => <InlineCitationCarouselItem key={i}><button>Source {i + 1}</button></InlineCitationCarouselItem>)}</InlineCitationCarouselContent>
}
function controls() { return <><InlineCitationCarouselPrev /><InlineCitationCarouselIndex /><InlineCitationCarouselNext /></> }
describe('Image and InlineCitation', () => {
  it('uses the host src verbatim with required alternative text and native image handlers', () => {
    const loaded = vi.fn()
    render(<Image src="blob:https://example.test/host-image" alt="Host illustration" mediaType="image/png" width={320} onLoad={loaded} />)
    const image = screen.getByRole('img', { name: 'Host illustration' })
    expect(image.getAttribute('src')).toBe('blob:https://example.test/host-image')
    expect(image.getAttribute('data-media-type')).toBe('image/png')
    expect(image.getAttribute('width')).toBe('320')
    fireEvent.load(image)
    expect(loaded).toHaveBeenCalledOnce()
  })
  it('supports decorative images and lets the host handle loading errors', () => {
    const failed = vi.fn()
    render(<Image src="/missing.png" alt="" onError={failed} data-testid="image" />)
    expect(screen.queryByRole('img')).toBeNull()
    fireEvent.error(screen.getByTestId('image'))
    expect(failed).toHaveBeenCalledOnce()
  })
  it('wraps pager navigation and keeps inactive source buttons hidden', () => {
    render(<InlineCitationCarousel>{controls()}{pages()}</InlineCitationCarousel>)
    expect(screen.getByText('1 of 2')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Source 2' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Previous citation' }))
    expect(screen.getByText('2 of 2')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Source 2' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Source 1' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Next citation' }))
    expect(screen.getByText('1 of 2')).toBeTruthy()
  })
  it('keeps controlled selection until the host accepts the index', () => {
    const change = vi.fn()
    const fixture = (index: number) => <InlineCitationCarousel index={index} onIndexChange={change}>{controls()}{pages()}</InlineCitationCarousel>
    const view = render(fixture(0))
    fireEvent.click(screen.getByRole('button', { name: 'Next citation' }))
    expect(change).toHaveBeenCalledWith(1)
    expect(screen.getByText('1 of 2')).toBeTruthy()
    view.rerender(fixture(1))
    expect(screen.getByText('2 of 2')).toBeTruthy()
  })
  it('normalizes invalid indexes and shrinking pages, disabling navigation for one or no source', () => {
    const fixture = (index: number, count: number) => <InlineCitationCarousel index={index}>{controls()}{pages(count)}</InlineCitationCarousel>
    const view = render(fixture(100, 2))
    expect(screen.getByRole('button', { name: 'Source 2' })).toBeTruthy()
    view.rerender(fixture(100, 1))
    expect(screen.getByRole('button', { name: 'Source 1' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next citation' }).hasAttribute('disabled')).toBe(true)
    view.rerender(fixture(Number.NaN, 0))
    expect(screen.getByText('0 of 0')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Previous citation' }).hasAttribute('disabled')).toBe(true)
  })
  it('honors prevented and disabled navigation', () => {
    const change = vi.fn()
    render(<InlineCitationCarousel onIndexChange={change}><InlineCitationCarouselPrev disabled /><InlineCitationCarouselNext onClick={(event) => event.preventDefault()} />{pages()}</InlineCitationCarousel>)
    fireEvent.click(screen.getByRole('button', { name: 'Next citation' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous citation' }))
    expect(change).not.toHaveBeenCalled()
  })
  // HoverCard positioning/portal focus and aria-hidden are proven in Chromium,
  // where layout exists, following design-components' HoverCard test discipline.
  it('leaves hover visibility with the host and source URLs as host-supplied text', async () => {
    const changed = vi.fn()
    render(<><InlineCitationCard open={false} onOpenChange={changed}><InlineCitationCardTrigger>Host source label</InlineCitationCardTrigger><InlineCitationCardBody>Supplemental evidence</InlineCitationCardBody></InlineCitationCard><InlineCitationSource title="Local evidence" url="a non-URL host reference" /></>)
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Host source label' }))
    await waitFor(() => expect(changed).toHaveBeenCalled())
    expect(changed.mock.calls[0][0]).toBe(true)
    expect(screen.getByRole('button', { name: 'Host source label' }).tagName).toBe('BUTTON')
    expect(screen.queryByText('Supplemental evidence')).toBeNull()
    expect(screen.getByText('a non-URL host reference')).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
  })
  it('fails clearly for pager controls outside a carousel', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try { expect(() => render(<InlineCitationCarouselNext />)).toThrow('must be used within InlineCitationCarousel') }
    finally { consoleError.mockRestore() }
  })
})
