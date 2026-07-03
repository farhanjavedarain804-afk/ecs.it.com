import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { WhyChoose } from "@/components/landing/WhyChoose";
import { Process } from "@/components/landing/Process";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="pt-32 pb-12 bg-gradient-hero text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold">About ECS</h1>
          <p className="mt-4 text-white/85 text-lg leading-relaxed">
            Electric Complaint Solutions is a modern service management platform serving residential,
            commercial and industrial clients with reliable maintenance and technical services
            nationwide — powered by a secure Digital Management System.
          </p>
        </div>
      </section>
      <WhyChoose />
      <Process />
      <Footer />
    </div>
  );
}