import { Box } from "@intility/bifrost-react";
import styles from "./PageHeader.module.css";

interface PageHeaderProps {
  title: string;
  description: string;
}

export default function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <Box padding={40} radius shadow background style={{ marginBottom: "2rem" }}>
      <div className={styles.content}>
        <h2 className={`bf-h2 ${styles.title}`}>{title}</h2>
        <p className={styles.description}>{description}</p>
      </div>
    </Box>
  );
}
