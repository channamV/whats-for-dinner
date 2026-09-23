import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="mb-1 text-center font-display text-4xl font-bold">What&apos;s for dinner</h1>
      <p className="mb-8 text-center text-muted">Recipes, meal plans and grocery lists for the whole family.</p>
      <LoginForm next={typeof next === "string" ? next : "/"} />
    </main>
  );
}
