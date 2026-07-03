import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/ecs/Header";
import { Footer } from "@/components/ecs/Footer";
import { Verification } from "@/components/ecs/Verification";

export const Route = createFileRoute("/verification")({
  head: () => ({
    meta: [
      { title: "Verification Portal — ECS" },
      { name: "description", content: "Verify ECS employees, technicians, branches, invoices and complaints in seconds." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-20"><Verification /></div>
      <Footer />
    </div>
  ),
});