import socket
import ssl

hostname = 'lua.tools'

# Try fetching chain
try:
    context = ssl.create_default_context()
    with socket.create_connection((hostname, 443)) as sock:
        with context.wrap_socket(sock, server_hostname=hostname) as ssock:
            print("Successfully connected to lua.tools via SSL!")
except Exception as e:
    print("SSL Connection error:", e)
    import traceback
    traceback.print_exc()
