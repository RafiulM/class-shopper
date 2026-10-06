import { useState } from "react"
import { LoaderCircleIcon } from "lucide-react"

import type { StoreName, UnderstoodDesire } from "@/lib/types"
import { useActiveContext, useApiKeyMask, useHistory, useSession, useSettings } from "@/shared/hooks"
import { canonicalProductUrl } from "@/shared/stores"
import { ComposeFlow } from "@/sidepanel/compose/compose-flow"
import { DetailView } from "@/sidepanel/detail-view"
import { JevOffAlert, SidePanelHeader } from "@/sidepanel/header"
import { NoKeyView } from "@/sidepanel/no-key-view"
import { ResultsView } from "@/sidepanel/results-view"

type Compose = { initial?: { desire: UnderstoodDesire; store: StoreName } } | null

/**
 * The Jev side panel. It follows the active tab: compose a desire, then results
 * for the search tab, or the detail check when a product page is open.
 */
export function SidePanelApp() {
  const settings = useSettings()
  const keyMask = useApiKeyMask()
  const session = useSession()
  const context = useActiveContext()
  const [history] = useHistory()
  const [compose, setCompose] = useState<Compose>(null)

  if (settings === undefined || keyMask === undefined || session === undefined) {
    return (
      <div role="status" className="flex h-screen items-center justify-center text-muted-foreground">
        <LoaderCircleIcon aria-hidden className="mr-2 size-4 animate-spin" />
        Memuat Jev…
      </div>
    )
  }

  const defaultStore = context.store ?? settings.favoriteStores[0] ?? "Tokopedia"
  const onDetailPage =
    session?.detail &&
    context.kind === "detail" &&
    context.url !== undefined &&
    canonicalProductUrl(context.url) === session.detail.url

  let content: React.ReactNode
  if (!keyMask) content = <NoKeyView />
  else if (compose || !session) {
    content = (
      <ComposeFlow
        key={compose?.initial ? `edit-${session?.id}` : "new"}
        jevEnabled={settings.jevEnabled}
        defaultStore={defaultStore}
        recent={history ?? []}
        initial={compose?.initial}
        onSearched={() => setCompose(null)}
        onCancel={session ? () => setCompose(null) : undefined}
      />
    )
  } else if (onDetailPage) {
    content = <DetailView session={session} />
  } else {
    content = (
      <ResultsView
        session={session}
        jevEnabled={settings.jevEnabled}
        onEditCriteria={() => setCompose({ initial: { desire: session.desire, store: session.store } })}
        onNewDesire={() => setCompose({})}
      />
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <SidePanelHeader jevEnabled={settings.jevEnabled} />
      {!settings.jevEnabled && <JevOffAlert />}
      {content}
    </div>
  )
}
