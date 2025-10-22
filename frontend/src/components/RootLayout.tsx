import { faHome } from "@fortawesome/pro-solid-svg-icons";
import { Nav } from "@intility/bifrost-react";
import { Link, NavLink, Outlet } from "react-router";
import { ColorModePicker } from "./ColorMode";

/**
 * Root Layout component for the app.
 * Used in a react-router layout route
 */
export default function RootLayout() {
  return (
    <Nav
      logo={
        <Link className="bf-neutral-link" to="/">
          <Nav.Logo>MCP Go-Live</Nav.Logo>
        </Link>
      }
      side={
        <NavLink to="/">
          <Nav.Item icon={faHome}>Dashboard</Nav.Item>
        </NavLink>
      }
      top={<ColorModePicker />}
      theme="pink"
    >
      <main
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "var(--bf-page-padding)",
          width: "100%",
        }}
      >
        <Outlet />
      </main>
    </Nav>
  );
}
