#!/bin/zsh
cd "${0:A:h}"
export PYTHONDONTWRITEBYTECODE=1
PYTHON_BIN="$(command -v python3)"
if [[ -z "$PYTHON_BIN" ]]; then
  print 'Для запуска нужен Python 3. Установите Python и откройте этот файл снова.'
  read
  exit 1
fi
"$PYTHON_BIN" -B -c 'import webbrowser, threading; threading.Timer(1.2, lambda: webbrowser.open("http://127.0.0.1:8765")).start()' &
exec "$PYTHON_BIN" -B server.py
