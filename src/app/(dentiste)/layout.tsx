import { DentisteSidebar } from "@/components/dentiste/DentisteSidebar"
import { DentisteTopHeader } from "@/components/dentiste/DentisteTopHeader"

export default function DentisteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dentiste-app min-h-screen">
      <DentisteSidebar />
      <div className="p-4 lg:ml-72 lg:p-8">
        <DentisteTopHeader />
        {children}
      </div>
    </div>
  )
}
