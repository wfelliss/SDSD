import { HomeIcon, UserIcon } from "lucide-react";
import { Link, Outlet } from "react-router";

export default function Layout() {
  return (
    <div className="h-screen w-screen">
      <div className="absolute z-50 h-screen flex flex-col justify-center p-4">
        <div className="bg-card-background-primary p-4 rounded shadow text-text-secondary flex flex-col gap-4">
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
