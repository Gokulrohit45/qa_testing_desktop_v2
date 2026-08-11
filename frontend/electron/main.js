const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn, exec } = require("child_process");
const http = require("http");

let mainWindow = null;
let pythonProcess = null;

function getPythonEnginePath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "python_engine", "app.exe");
  }
  return path.join(__dirname, "..", "..", "backend", "app.py");
}

function startPythonBackend() {
  const exePath = getPythonEnginePath();
  console.log("[Electron Main] Launching Python engine from:", exePath);

  if (app.isPackaged) {
    pythonProcess = spawn(exePath, [], {
      cwd: path.dirname(exePath),
      env: { ...process.env, PORT: "5000" }
    });
  } else {
    pythonProcess = spawn("python", [exePath], {
      cwd: path.dirname(exePath),
      env: { ...process.env, PORT: "5000" }
    });
  }

  pythonProcess.stdout?.on("data", (data) => console.log(`[Python Engine] ${data}`));
  pythonProcess.stderr?.on("data", (data) => console.error(`[Python Engine Error] ${data}`));
}

function waitForBackend(callback, retries = 50) {
  http.get("http://127.0.0.1:5000/api/health", (res) => {
    if (res.statusCode === 200) {
      console.log("[Electron Main] Python Backend is ONLINE!");
      callback();
    } else if (retries > 0) {
      setTimeout(() => waitForBackend(callback, retries - 1), 100);
    }
  }).on("error", () => {
    if (retries > 0) {
      setTimeout(() => waitForBackend(callback, retries - 1), 100);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: "QA-AI Autonomous Testing Platform",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

function forceKillBackend() {
  if (process.platform === "win32") {
    exec("taskkill /F /IM app.exe /T", () => {});
  }
  if (pythonProcess) {
    pythonProcess.kill();
  }
}

app.whenReady().then(() => {
  startPythonBackend();
  waitForBackend(() => {
    createWindow();
  });
});

app.on("window-all-closed", () => {
  forceKillBackend();
  if (process.platform !== "darwin") app.quit();
});
