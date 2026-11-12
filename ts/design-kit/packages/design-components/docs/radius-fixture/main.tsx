import { Matrix } from './matrix'
import { createRoot } from 'react-dom/client'
import { TooltipProvider } from '../../src/index.ts'
import { GalleryView } from '../../../kit-dashboard/demo/views/gallery.tsx'
import { AccountAccessFixture } from '../../../kit-account/demo/access.tsx'
import { HistoryBrowserFixture } from '../../../kit-chat/demo/history.tsx'
import { Demo as SettingsDemo } from '../../../kit-settings/demo/demo.tsx'
import { App as ObserveDemo } from '../../../kit-observe/demo/App.tsx'
import { ChatReview } from './chat-review'
const params = new URLSearchParams(location.search)
const mode = (params.get('surface') ?? 'matrix') as keyof typeof views
document.documentElement.dataset.theme = params.get('theme') ?? 'sysop-p4-white'
document.documentElement.dataset.mode = params.get('mode') ?? 'dark'
await import(['matrixDashboard','gallery'].includes(mode) || mode.startsWith('observe') ? './dashboard.css' : './contract.css')
const views = { matrix: <Matrix/>, matrixDashboard: <Matrix/>, gallery: <GalleryView/>, accountAccess: <AccountAccessFixture/>, chatHistory: <HistoryBrowserFixture/>, settings: <SettingsDemo/>, settingsWizard: <SettingsDemo/>, settingsConservative: <SettingsDemo/>, observe: <ObserveDemo/>, observeError: <ObserveDemo/>, observeTachyon: <ObserveDemo/>, observeTachyonError: <ObserveDemo/>, chatCards: <ChatReview state="cards"/>, chatCardsLocked: <ChatReview state="locked"/>, chatCardsError: <ChatReview state="error"/>, chatComposer: <ChatReview state="composer"/>, chatComposerBusy: <ChatReview state="busy"/>, chatComposerDisabled: <ChatReview state="disabled"/>, chatComposerSuggestions: <ChatReview state="suggestions"/>, chatStream: <ChatReview state="streaming"/>, chatStreamStalled: <ChatReview state="stalled"/>, chatStreamError: <ChatReview state="stream-error"/>, chatMarkdown: <ChatReview state="markdown"/> }
createRoot(document.getElementById('root')!).render(<TooltipProvider>{views[mode]}</TooltipProvider>)
