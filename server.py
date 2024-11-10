from http.server import HTTPServer, SimpleHTTPRequestHandler
import os
import subprocess
import sys

def validate_javascript():
    try:
        result = subprocess.run(['node', 'validate.js'], capture_output=True, text=True)
        if result.returncode != 0:
            print("JavaScript validation failed:")
            print(result.stderr)
            return False
        return True
    except FileNotFoundError:
        print("Node.js is required for JavaScript validation")
        return True  # Continue anyway if Node.js is not installed
    except Exception as e:
        print(f"Validation error: {e}")
        return True  # Continue anyway if validation fails

class CustomHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # If the path is just '/', serve index.html
        if self.path == '/':
            self.path = '/index.html'
        return SimpleHTTPRequestHandler.do_GET(self)

    def log_message(self, format, *args):
        # Override to provide more useful logging
        sys.stderr.write(f"{self.address_string()} - {format%args}\n")

PORT = 8099

if not validate_javascript():
    print("Fix the JavaScript errors before starting the server")
    sys.exit(1)

# Create server with custom handler
with HTTPServer(("", PORT), CustomHandler) as httpd:
    print(f"Server running at http://localhost:{PORT}/")
    print("Press Ctrl+C to stop the server")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()