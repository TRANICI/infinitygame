"""Exercise the built site at a GitHub Pages-style /infinitygame/ subpath."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import subprocess
import sys
import threading

ROOT=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if not self.path.startswith('/infinitygame/'):
            self.send_error(404);return
        self.path=self.path.removeprefix('/infinitygame')
        super().do_GET()
    def log_message(self,*args):pass

server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
    env=dict(os.environ,WARD_TEST_URL=f'http://127.0.0.1:{server.server_port}/infinitygame/index.html')
    result=subprocess.run([sys.executable,str(ROOT/'tests/smoke.py')],env=env,cwd=ROOT)
finally:
    server.shutdown();server.server_close()
sys.exit(result.returncode)
