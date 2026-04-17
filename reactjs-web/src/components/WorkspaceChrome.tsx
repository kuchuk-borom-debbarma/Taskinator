export function WorkspaceChrome({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="app-shell">
      {sidebar}
      <section className="workspace">{children}</section>
    </main>
  );
}
