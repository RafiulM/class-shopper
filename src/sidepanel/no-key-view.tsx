import { ApiKeyForm } from "@/components/jev/api-key-form"
import { View, ViewBody, ViewTitle } from "@/sidepanel/view-layout"

/** Pengaturan API Key, shown until a key is saved (fitur AI nonaktif tanpa key). */
export function NoKeyView() {
  return (
    <View label="Pasang API key">
      <ViewBody>
        <ViewTitle lead="Jev memakai API key OpenRouter milikmu untuk memahami keinginan dan menilai produk.">
          Pasang API key dulu
        </ViewTitle>
        <ApiKeyForm onSaved={() => {}} />
        <p className="text-xs/[18px] text-muted-foreground">Biaya pemakaian model ditagihkan ke akun OpenRouter-mu.</p>
      </ViewBody>
    </View>
  )
}
