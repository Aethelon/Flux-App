import { SearchBar } from "./SearchBar"
import { DarkModeToggle } from "./DarkModeToggle"
import { UserMenu } from "./UserMenu"

export function Header() {
  return (
    <header className="flex items-center justify-between h-18.5 px-10 bg-(--color-bg) shrink-0">
      <SearchBar />
      <div className="flex items-center gap-4 shrink-0">
        <DarkModeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
