# =====================================================================
# abrir-constructor.ps1 — Levanta el Constructor de Planos 2.0 y lo abre
# en el navegador. Pensado para llamarse desde el acceso directo del
# escritorio, sin ventana de terminal.
#
# Sirve el build de produccion (dist/) con "vite preview". Si el servidor
# ya esta arriba, no lo levanta otra vez: solo abre la pestana.
#
# Para ver cambios de codigo hay que reconstruir antes:  npm run build
# =====================================================================
$ErrorActionPreference = "Stop"

$raiz   = Split-Path -Parent $MyInvocation.MyCommand.Path
$puerto = 4173
$url    = "http://localhost:$puerto/"
$log    = Join-Path $env:TEMP "constructor-planos-servidor.log"

# Se mira el puerto con Get-NetTCPConnection y no con un socket ni con
# Invoke-WebRequest. Un TcpClient recien creado sale en IPv4 y vite escucha
# solo en ::1, asi que daria por caido un servidor que si esta arriba; y
# Invoke-WebRequest se cuelga cuando la salida del proceso esta redirigida.
function Escuchando($p) {
  $x = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
  return [bool]$x
}

function Fallo($mensaje) {
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.MessageBox]::Show(
    $mensaje, "Constructor de Planos",
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Warning) | Out-Null
  exit 1
}

if (-not (Escuchando $puerto)) {

  # Se llama a node directo en vez de npm: npm.cmd necesita a node en el PATH
  # del proceso hijo, y desde un acceso directo eso no siempre se hereda.
  $node = $null
  $enPath = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($enPath) {
    $node = $enPath.Source
  } else {
    $paquetes = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages"
    if (Test-Path $paquetes) {
      $hallado = Get-ChildItem $paquetes -Filter "node.exe" -Recurse -Depth 3 -ErrorAction SilentlyContinue |
                 Select-Object -First 1
      if ($hallado) { $node = $hallado.FullName }
    }
  }
  if (-not $node) {
    Fallo "No encuentro node.exe. Hace falta Node.js instalado para levantar el Constructor."
  }

  if (-not (Test-Path (Join-Path $raiz "dist\index.html"))) {
    Fallo "Falta la carpeta dist. Corre primero:`n`n    npm run build"
  }

  $vite = Join-Path $raiz "node_modules\vite\bin\vite.js"
  if (-not (Test-Path $vite)) {
    Fallo "Faltan las dependencias. Corre primero:`n`n    npm install"
  }

  Start-Process -FilePath $node `
    -ArgumentList "`"$vite`"","preview","--port","$puerto","--strictPort" `
    -WorkingDirectory $raiz -WindowStyle Hidden `
    -RedirectStandardOutput $log -RedirectStandardError "$log.err"

  # el servidor tarda un par de segundos en atender
  $limite = 40
  for ($i = 0; $i -lt $limite; $i++) {
    if (Escuchando $puerto) { break }
    Start-Sleep -Milliseconds 500
  }
  if (-not (Escuchando $puerto)) {
    Fallo "El servidor no respondio en $([int]($limite/2)) segundos.`n`nRevisa el detalle en:`n$log"
  }
}

# Se abre en Chrome en modo aplicacion (--app): ventana propia, sin barra de
# direcciones ni pestanas, para que se vea como la app y no como una pagina.
# Si no hay Chrome, se cae al navegador por defecto del sistema.
$chrome = $null
foreach ($clave in @(
  "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe",
  "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe")) {
  $ruta = (Get-ItemProperty $clave -ErrorAction SilentlyContinue).'(default)'
  if ($ruta -and (Test-Path $ruta)) { $chrome = $ruta; break }
}

if ($chrome) {
  Start-Process $chrome -ArgumentList "--app=$url"
} else {
  Start-Process $url
}
