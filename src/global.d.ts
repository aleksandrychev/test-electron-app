interface Window {
  cfengine: {
    lint: (code: string) => Promise<{ success: boolean; output: string }>;
    format: (code: string) => Promise<{ success: boolean; output: string }>;
  };
}
