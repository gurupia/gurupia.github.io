import http.server
import socketserver

PORT = 8080

class SecurityHeadersHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cross-Origin-Resource-Policy", "cross-origin")
        super().end_headers()

with socketserver.TCPServer(("", PORT), SecurityHeadersHandler) as httpd:
    print(f"Serving at http://localhost:{PORT} with COOP/COEP headers")
    httpd.serve_forever()
