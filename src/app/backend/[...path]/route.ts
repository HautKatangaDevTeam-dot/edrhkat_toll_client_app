import { NextRequest, NextResponse } from "next/server";

const API_PROXY_TARGET = (
  process.env.API_PROXY_TARGET ?? "http://172.20.10.6:3001"
).replace(/\/$/, "");

function buildUpstreamUrl(path: string[], search: string) {
  const joinedPath = path.join("/");
  return `${API_PROXY_TARGET}/${joinedPath}${search}`;
}

function copyRequestHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);

  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");

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
  upstreamResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      responseHeaders.append(key, value);
      return;
    }

    responseHeaders.set(key, value);
  });

  return new NextResponse(upstreamResponse.body, {
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
