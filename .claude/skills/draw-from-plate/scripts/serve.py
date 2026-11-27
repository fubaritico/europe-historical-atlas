"""Serve a plan's folder to the Cartographer's page: its ops.json, and page-ops.js from this folder of scripts.

usage: python3 -I serve.py <plan folder> [--port 8765] [--origin http://127.0.0.1:5180]
Stop it with ‹ctrl+C› (or kill its process) at the end of the drawing: it serves nothing else.
"""
import functools
import http.server
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    """The plan's folder, plus page-ops.js; one origin allowed."""

    origin = 'http://127.0.0.1:5180'

    def translate_path(self, path):
        """page-ops.js comes from the scripts' folder, everything else from the plan's."""
        if path.split('?')[0].endswith('/page-ops.js'):
            return os.path.join(HERE, 'page-ops.js')
        return super().translate_path(path)

    def end_headers(self):
        """Let the Cartographer's page read the files."""
        self.send_header('Access-Control-Allow-Origin', self.origin)
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def guess_type(self, path):
        """A module must be served as JavaScript."""
        return 'text/javascript' if str(path).endswith('.js') else super().guess_type(path)


def main(argv):
    """Serve until stopped."""
    folder = argv[1]
    port = int(argv[argv.index('--port') + 1]) if '--port' in argv else 8765
    if '--origin' in argv:
        Handler.origin = argv[argv.index('--origin') + 1]
    server = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Handler, directory=folder))
    print(f'serving {folder} on 127.0.0.1:{port} to {Handler.origin}', flush=True)
    server.serve_forever()


if __name__ == '__main__':
    main(sys.argv)
