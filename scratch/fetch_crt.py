import socket
import ssl
from ssl import _create_unverified_context

hostname = 'lua.tools'
ctx = _create_unverified_context()

with socket.create_connection((hostname, 443)) as sock:
    with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
        der = ssock.getpeercert(binary_form=True)
        # Parse DER cert using ssl
        # Save DER cert to disk to inspect
        with open(r"c:\Users\Usuario\proyectopandastore20\scratch\lua_tools.crt", "wb") as f:
            f.write(der)

print("Saved lua_tools.crt to scratch.")
