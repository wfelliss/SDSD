export const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-bold text-foreground mb-6">{children}</h2>
);

export const SectionDivider = () => <div className="border-t border-border my-10" />;

export const EmptyState = () => (
  <div className="flex flex-col items-center justify-center mt-32 text-muted-foreground">
    <span className="font-medium text-lg">Select a run to start</span>
    <span className="text-sm opacity-70">Choose from the sidebar</span>
  </div>
);

export const LoadingState = () => (
  <div className="flex items-center justify-center mt-32 text-muted-foreground animate-pulse">
    Loading telemetry data...
  </div>
);