import { Grid } from "@intility/bifrost-react";
import Docs from "~/components/Docs";
import PageHeader from "~/components/PageHeader";
import Setup from "~/components/Setup";
import styles from "./Home.module.css";

export default function Home() {
  return (
    <Grid className={styles.home} gap={32}>
      <PageHeader
        title="MCP Server Submissions"
        description="View all MCP server submissions, their approval status, and feedback"
      />
      <Setup />
      <h2 className="bf-h2">Read the docs</h2>
      <Docs />
    </Grid>
  );
}
