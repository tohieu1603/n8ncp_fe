import V2LayoutClient from './v2/v2-layout-client'
import V2Page from './v2/page'

export default function Home() {
  return (
    <V2LayoutClient>
      <V2Page />
    </V2LayoutClient>
  )
}
