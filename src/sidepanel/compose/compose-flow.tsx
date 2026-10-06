import { useRef, useState } from "react"

import type { DesireHistoryItem, StoreName, UnderstoodDesire } from "@/lib/types"
import { send } from "@/shared/messages"
import { CriteriaView } from "@/sidepanel/compose/criteria-view"
import { UnderstandingView } from "@/sidepanel/compose/understanding-view"
import { WriteView } from "@/sidepanel/compose/write-view"

interface ComposeFlowProps {
  jevEnabled: boolean
  defaultStore: StoreName
  recent: DesireHistoryItem[]
  /** Start at the criteria step with an existing desire ("Atur kriteria"). */
  initial?: { desire: UnderstoodDesire; store: StoreName }
  onSearched: () => void
  onCancel?: () => void
}

type Step = "tulis" | "memahami" | "kriteria"

/** Panel Keinginan → Pemahaman Keinginan → Pilih & Sesuaikan → Cari Otomatis. */
export function ComposeFlow({ jevEnabled, defaultStore, recent, initial, onSearched, onCancel }: ComposeFlowProps) {
  const [step, setStep] = useState<Step>(initial ? "kriteria" : "tulis")
  const [text, setText] = useState(initial?.desire.text ?? "")
  const [store, setStore] = useState<StoreName>(initial?.store ?? defaultStore)
  const [desire, setDesire] = useState<UnderstoodDesire | null>(initial?.desire ?? null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [searching, setSearching] = useState(false)
  // Ignore answers to requests the user already cancelled.
  const requestId = useRef(0)

  const understand = async (input: string, fromStep: Step) => {
    const id = ++requestId.current
    setError(null)
    try {
      const result = await send({ type: "understand", text: input })
      if (id !== requestId.current) return
      setDesire(result)
      setText(result.text)
      setStep("kriteria")
    } catch (err) {
      if (id !== requestId.current) return
      setError((err as Error).message)
      setStep(fromStep)
    } finally {
      if (id === requestId.current) setRefreshing(false)
    }
  }

  const search = async (next: UnderstoodDesire, nextStore: StoreName) => {
    setSearching(true)
    setError(null)
    try {
      await send({ type: "start-search", desire: next, store: nextStore })
      onSearched()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSearching(false)
    }
  }

  if (step === "memahami") {
    return (
      <UnderstandingView
        text={text}
        onCancel={() => {
          requestId.current++
          setStep("tulis")
        }}
      />
    )
  }

  if (step === "kriteria" && desire) {
    return (
      <CriteriaView
        desire={desire}
        onDesireChange={setDesire}
        store={store}
        jevEnabled={jevEnabled}
        error={error}
        refreshing={refreshing}
        searching={searching}
        onBack={() => {
          setError(null)
          setStep("tulis")
        }}
        onRefresh={(input) => {
          setRefreshing(true)
          void understand(input, "kriteria")
        }}
        onSearch={(next) => void search(next, store)}
      />
    )
  }

  return (
    <WriteView
      text={text}
      onTextChange={setText}
      store={store}
      onStoreChange={setStore}
      jevEnabled={jevEnabled}
      recent={recent.slice(0, 3)}
      error={error}
      onCancel={onCancel}
      onStart={() => {
        setStep("memahami")
        void understand(text.trim(), "tulis")
      }}
      onReuse={(item) =>
        void search({ text: item.text, keyword: item.keyword, criteria: item.criteria }, item.store)
      }
      onOpenHistory={() => void chrome.tabs.create({ url: chrome.runtime.getURL("src/options/index.html#/riwayat") })}
    />
  )
}
