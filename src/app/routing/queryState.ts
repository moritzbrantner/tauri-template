export type QueryPrimitive = string | number | boolean | null | undefined;

export type QueryStateCodec<T> = {
  read(params: URLSearchParams): T;
  write(params: URLSearchParams, value: T): void;
};

export type QueryWriteMode = "push" | "replace";

function resolveCurrentUrl(currentUrl?: string): URL {
  const base =
    typeof window === "undefined"
      ? "http://localhost/"
      : window.location.href;

  return new URL(currentUrl ?? base, base);
}

function formatUrlForApp(url: URL): string {
  return `${url.pathname}${url.search}${url.hash}`;
}

export function readQueryState<T>(
  codec: QueryStateCodec<T>,
  source?: string | URLSearchParams,
): T {
  if (source instanceof URLSearchParams) {
    return codec.read(new URLSearchParams(source));
  }

  const url = resolveCurrentUrl(source);
  return codec.read(url.searchParams);
}

export function writeQueryState<T>(
  codec: QueryStateCodec<T>,
  value: T,
  options?: {
    mode?: QueryWriteMode;
    currentUrl?: string;
  },
): string {
  const url = resolveCurrentUrl(options?.currentUrl);
  const params = new URLSearchParams(url.search);
  codec.write(params, value);
  url.search = params.toString();
  const nextUrl = formatUrlForApp(url);

  if (!options?.currentUrl && typeof window !== "undefined") {
    const mode = options?.mode ?? "replace";
    if (mode === "push") {
      window.history.pushState({}, "", nextUrl);
    } else {
      window.history.replaceState({}, "", nextUrl);
    }
  }

  return nextUrl;
}
