import socket
import ssl

hostname = 'lua.tools'
ctx = ssl.create_default_context()
ctx.check_hostname = False

try:
    with socket.create_connection((hostname, 443)) as sock:
        with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
            cert = ssock.getpeercert()
            print("Not before:", cert.get('notBefore'))
            print("Not after:", cert.get('notAfter'))
except Exception as e:
    print("Error:", e)
