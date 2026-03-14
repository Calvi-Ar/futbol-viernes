export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    "/((?!api/auth|api/invite|_next/static|_next/image|favicon.ico|login|invite).*)",
  ],
};
