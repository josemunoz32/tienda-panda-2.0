import socket
import ssl

hostname = 'lua.tools'
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

with socket.create_connection((hostname, 443)) as sock:
    with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
        # Get all certs in chain if available
        certs = ssock.get_verified_chain() if hasattr(ssock, 'get_verified_chain') else []
        print(f"Chain length: {len(certs)}")
        for i, c in enumerate(certs):
            print(f"Cert {i}: {c}")

        # Dump server raw DER
        der = ssock.getpeercert(binary_form=True)
        with open(r"c:\Users\Usuario\proyectopandastore20\scratch\lua_tools_full.crt", "wb") as f:
            f.write(der)
