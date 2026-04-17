import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { writeFile, readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow();
  // Pre-warm cfengine binary so first user action is fast
  const cfenginePath = app.isPackaged
    ? path.join(process.resourcesPath, 'cfengine', 'cfengine')
    : 'cfengine';
  spawn(cfenginePath, ['--version']).on('error', (e: unknown) => console.error(e));
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

async function runCfengine(command: string, code: string): Promise<{ success: boolean; output: string }> {
  const tmpFile = path.join(tmpdir(), `cfconstructor-${Date.now()}.cf`);
  await writeFile(tmpFile, code, 'utf-8');

  return new Promise((resolve) => {
    const cfenginePath = app.isPackaged
      ? path.join(process.resourcesPath, 'cfengine', 'cfengine')
      : 'cfengine';
    const proc = spawn(cfenginePath, [command, tmpFile]);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    proc.on('close', (exitCode) => {
      if (command === 'format' && exitCode === 0) {
        readFile(tmpFile, 'utf-8')
          .then((formatted) => { unlink(tmpFile); resolve({ success: true, output: formatted }); })
          .catch(() => { unlink(tmpFile); resolve({ success: false, output: 'Failed to read formatted file' }); });
      } else {
        unlink(tmpFile).catch((e: unknown) => console.error(e));
        const output = (stdout + stderr).trim();
        resolve({ success: exitCode === 0, output });
      }
    });

    proc.on('error', (err) => {
      unlink(tmpFile).catch((e: unknown) => console.error(e));
      resolve({ success: false, output: `Failed to run cfengine: ${err.message}` });
    });
  });
}

ipcMain.handle('cfengine:lint', (_event, code: string) => runCfengine('lint', code));
ipcMain.handle('cfengine:format', (_event, code: string) => runCfengine('format', code));
