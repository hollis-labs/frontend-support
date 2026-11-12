import { useState } from 'react'
import { Image, InlineCitation, InlineCitationText, InlineCitationCard, InlineCitationCardTrigger, InlineCitationCardBody, InlineCitationCarousel, InlineCitationCarouselHeader, InlineCitationCarouselPrev, InlineCitationCarouselIndex, InlineCitationCarouselNext, InlineCitationCarouselContent, InlineCitationCarouselItem, InlineCitationSource, InlineCitationQuote } from '@hollis-labs/kit-chat'

// Host-created SVG fixture; no network, generated-file types or bundled brand assets.
const illustration = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="240"><circle cx="160" cy="120" r="72" fill="currentColor" opacity="0.5"/><circle cx="320" cy="120" r="72" fill="currentColor" opacity="0.3"/><circle cx="480" cy="120" r="72" fill="currentColor" opacity="0.2"/></svg>')}`
export function ImageCitationDemo() {
  const [index, setIndex] = useState(0)
  return <main className="mx-auto max-w-3xl space-y-4 bg-bg p-4 text-fg">
    <h1 className="text-heading font-semibold">Image and inline citations</h1>
    <Image src={illustration} alt="Host illustration example" mediaType="image/svg+xml" className="dark:invert" />
    <p className="text-control"><InlineCitation><InlineCitationText>The host supplies the evidence.</InlineCitationText><InlineCitationCard><InlineCitationCardTrigger>2 sources</InlineCitationCardTrigger><InlineCitationCardBody>
      <InlineCitationCarousel index={index} onIndexChange={setIndex}>
        <InlineCitationCarouselHeader><InlineCitationCarouselPrev /><InlineCitationCarouselIndex /><InlineCitationCarouselNext /></InlineCitationCarouselHeader>
        <InlineCitationCarouselContent>
          <InlineCitationCarouselItem><InlineCitationSource title="Project guide" url="example.test/guide" description="Host-provided source description." /><InlineCitationQuote>Rendered evidence belongs to the host.</InlineCitationQuote></InlineCitationCarouselItem>
          <InlineCitationCarouselItem><InlineCitationSource title="Local tool evidence" description="References need no network destination." /><InlineCitationQuote>A second source, selected with the controlled pager.</InlineCitationQuote></InlineCitationCarouselItem>
        </InlineCitationCarouselContent>
      </InlineCitationCarousel>
    </InlineCitationCardBody></InlineCitationCard></InlineCitation></p>
    <button type="button" className="rounded-control border border-border px-3 py-2 text-control">Following host action</button>
  </main>
}
