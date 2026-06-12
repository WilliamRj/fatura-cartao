import type { Metadata } from "next";
import { LoginClient } from "@/components/pages/login-client";

export const metadata: Metadata = {
  title: "Entrar | Cartão Inteligente",
};

export default function LoginPage() {
  return <LoginClient />;
}
