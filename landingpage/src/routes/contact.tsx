import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/ecs/Header";
import { Footer } from "@/components/ecs/Footer";
import { Contact } from "@/components/ecs/Contact";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact ECS — Request a Service" },
      { name: "description", content: "Get in touch with Electric Complaint Solutions to request a service or speak with our team." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-20"><Contact /></div>
      <Footer />
    </div>
  ),
});