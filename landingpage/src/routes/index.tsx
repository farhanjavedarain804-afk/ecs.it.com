import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/ecs/Header";
import { Hero } from "@/components/ecs/Hero";
import { Stats } from "@/components/ecs/Stats";
import { ServicesGrid } from "@/components/ecs/ServicesGrid";
import { WhyChoose } from "@/components/ecs/WhyChoose";
import { Verification } from "@/components/ecs/Verification";
import { Process } from "@/components/ecs/Process";
import { Testimonials } from "@/components/ecs/Testimonials";
import { Contact } from "@/components/ecs/Contact";
import { Footer } from "@/components/ecs/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ECS — One Solution For All Technical Services in Pakistan" },
      { name: "description", content: "Electric Complaint Solutions (ECS): verified electrical, HVAC, plumbing, solar, refrigeration, renovation and facility services nationwide." },
      { property: "og:title", content: "ECS — Electric Complaint Solutions" },
      { property: "og:description", content: "Professional maintenance & technical solutions across Pakistan — verified staff, fast response, one trusted platform." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <Stats />
        <ServicesGrid />
        <WhyChoose />
        <Verification />
        <Process />
        <Testimonials />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
