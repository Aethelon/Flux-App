import { Sidebar } from "./Sidebar/Sidebar"
import { Header } from "./Header/Header"
import { ContentScaler } from "./ContentScaler"

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-(--color-bg)">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto scrollbar-none">
          <ContentScaler>{children}</ContentScaler>
        </main>
      </div>
    </div>
  )
}
