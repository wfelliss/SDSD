import { HomeIcon, UserIcon } from "lucide-react";
import { Link, Outlet } from "react-router";

export default function Layout() {
  return (
    <div className="h-screen w-screen relative">
      {/* Added 'pointer-events-none' so clicks pass through the empty space */}
      <div className="absolute top-0 z-50 w-full flex justify-center p-4 pointer-events-none">
        
        {/* Added 'pointer-events-auto' so the buttons are still clickable */}
        <div className="bg-card-background-primary p-4 rounded shadow text-text-secondary flex flex-row gap-4 pointer-events-auto">
          <Link to="/">
            <HomeIcon className="size-5" />
          </Link>
          <Link to="/profiles">
            <UserIcon className="size-5" />
          </Link>
        </div>

      </div>
      <Outlet />
    </div>
  );
}