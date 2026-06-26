import { SearchBar } from "./SearchBar"
import { DarkModeToggle } from "./DarkModeToggle"
import { UserMenu } from "./UserMenu"

export function Header() {
  return (
    <header className="flex items-center gap-4 h-[74px] px-10 border-b border-(--color-border) bg-(--color-bg) shrink-0">
      <SearchBar />
      <DarkModeToggle />
      <UserMenu />
    </header>
  )
}
