import { NextRequest, NextResponse } from "next/server";

const API_PROXY_TARGET = (
  process.env.API_PROXY_TARGET ?? "http://172.20.10.6:3001"
).replace(/\/$/, "");

function extractSetCookies(headers: Headers) {
  if (typeof headers.getSetCookie === "function") {
    const cookies = headers.getSetCookie();
    if (cookies.length > 0) {
      return cookies;
    }
  }

  const rawSetCookie = headers.get("set-cookie");
  if (!rawSetCookie) {
    return [];
  }

  return rawSetCookie.split(/,(?=\s*[^;,\s]+=)/);
}

function buildUpstreamUrl(path: string[], search: string) {
  const joinedPath = path.join("/");
  return `${API_PROXY_TARGET}/${joinedPath}${search}`;
}

function copyRequestHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);

  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("accept-encoding");

  return headers;
}

async function proxy(request: NextRequest, path: string[]) {
  const upstreamResponse = await fetch(
    buildUpstreamUrl(path, request.nextUrl.search),
    {
      method: request.method,
      headers: copyRequestHeaders(request),
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.text(),
      redirect: "manual",
      cache: "no-store",
    }
  );

  const responseHeaders = new Headers();
  const upstreamSetCookies = extractSetCookies(upstreamResponse.headers);

  upstreamResponse.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey === "set-cookie" ||
      lowerKey === "content-length" ||
      lowerKey === "content-encoding" ||
      lowerKey === "transfer-encoding" ||
      lowerKey === "connection"
    ) {
      return;
    }

    responseHeaders.set(key, value);
  });

  upstreamSetCookies.forEach((cookie) => {
    responseHeaders.append("set-cookie", cookie);
  });

  const responseBody =
    request.method === "HEAD" ? null : await upstreamResponse.arrayBuffer();

  return new NextResponse(responseBody, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function HEAD(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}
