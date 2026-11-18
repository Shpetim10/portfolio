import { once } from "node:events";
import { createServer, request } from "node:http";
import { pipeline } from "node:stream";
import { constants, createBrotliCompress } from "node:zlib";

/** Serve the local build with Vercel-style Brotli so network throttling sees the compressed bytes. */
export async function startBrotliOrigin(baseURL: string) {
  const origin = new URL(baseURL);
  const server = createServer((incoming, outgoing) => {
    const acceptsBrotli = incoming.headers["accept-encoding"]?.split(/,\s*/).includes("br");
    const upstream = request(
      origin,
      {
        path: incoming.url,
        method: incoming.method,
        headers: { ...incoming.headers, host: origin.host, "accept-encoding": "identity" },
      },
      (response) => {
        if (outgoing.destroyed) {
          response.destroy();
          return;
        }
        const status = response.statusCode ?? 502;
        const headers = { ...response.headers };
        const compressible = /^(text\/|application\/(javascript|json)|image\/svg\+xml)/.test(
          headers["content-type"] ?? "",
        );
        if (acceptsBrotli && compressible && status === 200 && incoming.method === "GET") {
          delete headers["content-length"];
          headers["content-encoding"] = "br";
          headers.vary = [headers.vary, "Accept-Encoding"].filter(Boolean).join(", ");
          outgoing.writeHead(status, headers);
          const brotli = createBrotliCompress({ params: { [constants.BROTLI_PARAM_QUALITY]: 5 } });
          pipeline(response, brotli, outgoing, () => {});
        } else {
          outgoing.writeHead(status, headers);
          pipeline(response, outgoing, () => {});
        }
      },
    );
    upstream.on("error", () => {
      if (!outgoing.headersSent) outgoing.writeHead(502);
      outgoing.end();
    });
    outgoing.on("close", () => upstream.destroy());
    incoming.pipe(upstream);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Brotli origin has no TCP address");

  return {
    url: `http://127.0.0.1:${address.port}/`,
    close: () => {
      server.close();
      server.closeAllConnections();
    },
  };
}
