import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('cfengine', {
  lint: (code: string): Promise<{ success: boolean; output: string }> =>
    ipcRenderer.invoke('cfengine:lint', code),
  format: (code: string): Promise<{ success: boolean; output: string }> =>
    ipcRenderer.invoke('cfengine:format', code),
});
