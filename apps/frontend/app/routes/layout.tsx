import { HomeIcon, UserIcon } from "lucide-react";
import { Link, Outlet } from "react-router";

const nav = [
  { href: "/", icon: HomeIcon },
  { href: "/profiles", icon: UserIcon }
]

export default function Layout() {
  return (
    <div className="h-screen w-screen relative">
      {/* Added 'pointer-events-none' so clicks pass through the empty space */}
      <div className="absolute top-0 z-50 w-full flex justify-center p-2 pointer-events-none">
        
        {/* Added 'pointer-events-auto' so the buttons are still clickable */}
        <div className="bg-card-background-primary p-1 rounded-md shadow text-text-secondary flex flex-row gap-1 pointer-events-auto rounded">
          {nav.map(item => 
            <Link 
            key={item.href} 
            to={item.href} 
            className="p-2 rounded-sm transition-colors hover:bg-page-background-primary hover:inset-shadow-sm">
              <item.icon className="size-5" />
            </Link>
          )}
        </div>

      </div>
      <Outlet />
    </div>
  );
}