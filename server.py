#!/usr/bin/env python3
"""Локальный сервер. Не требует установки библиотек."""
import json
import os
from pathlib import Path
import subprocess
import sys
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
from levels import LEVELS
from engine import initial

ROOT = Path(__file__).resolve().parent
HOST, PORT = '127.0.0.1', int(os.environ.get('EDUCATION_PORT', '8765'))

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args): pass
    def send(self, status, data, mime='application/json; charset=utf-8'):
        body = data if isinstance(data, bytes) else json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(body)
    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/api/levels':
            return self.send(200, [dict(l, initial=initial(l)) for l in LEVELS])
        assets = {'/': ('index.html', 'text/html; charset=utf-8'), '/style.css': ('style.css', 'text/css; charset=utf-8'), '/app.js': ('app.js', 'text/javascript; charset=utf-8')}
        if path not in assets: return self.send(404, {'error': 'Не найдено'})
        file, mime = assets[path]
        self.send(200, (ROOT / file).read_bytes(), mime)
    def do_POST(self):
        if self.path != '/api/run': return self.send(404, {'error': 'Не найдено'})
        if self.headers.get('Origin') not in (None, f'http://{HOST}:{PORT}', f'http://localhost:{PORT}'):
            return self.send(403, {'error': 'Запрос разрешён только из локальной игры.'})
        try:
            size = int(self.headers.get('Content-Length', 0))
            if not 0 < size < 60000: return self.send(400, {'error': 'Недопустимый размер программы.'})
            data = json.loads(self.rfile.read(size))
            if type(data.get('level')) is not int or not 0 <= data['level'] < len(LEVELS) or not isinstance(data.get('code'), str):
                return self.send(400, {'error': 'Некорректный уровень или код.'})
            process = subprocess.run([sys.executable, '-B', str(ROOT / 'engine.py')], input=json.dumps(data), text=True, capture_output=True, timeout=4, cwd=ROOT)
            if process.returncode: return self.send(200, dict(ok=False, events=[], error='Программа превысила допустимые ресурсы. Уменьши числа или проверь цикл.'))
            self.send(200, json.loads(process.stdout))
        except subprocess.TimeoutExpired:
            self.send(200, dict(ok=False, events=[], error='Программа работает слишком долго. Проверь, заканчиваются ли циклы.'))
        except (ValueError, TypeError, json.JSONDecodeError): self.send(400, {'error':'Не удалось прочитать программу.'})

if __name__ == '__main__':
    try:
        server = ThreadingHTTPServer((HOST, PORT), Handler)
    except OSError as exc:
        print(f'Не удалось запустить локальный сервер: {exc}. Если порт занят, закрой другой запуск игры или задай EDUCATION_PORT=8766.'); sys.exit(1)
    print(f'Кодолесье открыто: http://{HOST}:{PORT}', flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: server.server_close()
